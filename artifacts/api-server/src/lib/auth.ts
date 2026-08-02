import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db-tsconfig";
import { usersTable } from "@workspace/db-tsconfig";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// Fail fast rather than silently signing tokens with a well-known default
// secret. This module is imported by routes/index.ts before the server binds
// its port, so a missing secret crashes startup instead of shipping an
// exploitable "...-change-in-production" fallback.
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error(
    "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must both be set in the environment. Refusing to start with an insecure default secret.",
  );
}
// Re-bind as plain `string` consts (not `string | undefined`) once verified above.
const ACCESS_TOKEN_SECRET: string = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET: string = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "365d";

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ── Per-request user cache ────────────────────────────────────────────────────
// Avoids a DB round-trip on every authenticated API call. Entries expire after
// 2 minutes; the access token itself expires after 15 minutes, so the worst-case
// staleness window for role/existence checks is 2 minutes — acceptable.
// Call invalidateCachedUser() whenever a user record changes.
const AUTH_CACHE_TTL_MS = 2 * 60 * 1000;
type CachedUser = typeof usersTable.$inferSelect;
const _userCache = new Map<number, { user: CachedUser; expiresAt: number }>();

function getCachedUser(userId: number): CachedUser | null {
  const entry = _userCache.get(userId);
  if (entry && entry.expiresAt > Date.now()) return entry.user;
  _userCache.delete(userId);
  return null;
}

function setCachedUser(userId: number, user: CachedUser): void {
  _userCache.set(userId, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
}

/** Evict a user from the auth cache — call after updating/deleting a user record. */
export function invalidateCachedUser(userId: number): void {
  _userCache.delete(userId);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    path: "/api/auth",
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie("refreshToken", { path: "/api/auth" });
}

// Middleware: require authenticated user
// Serves the user object from an in-memory cache (2 min TTL) to avoid a DB
// round-trip on every authenticated request. Automatically falls back to DB on
// cache miss and populates the cache for subsequent requests.
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Fast path: serve from cache
  const cached = getCachedUser(payload.userId);
  if (cached) {
    if (cached.isBanned) {
      res.status(403).json({ error: "Your account has been suspended." });
      return;
    }
    req.user = cached;
    next();
    return;
  }

  // Slow path: DB lookup + populate cache
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    // A banned/suspended user's existing access token must stop working
    // immediately (up to the cache TTL), not just at their next login.
    if (user.isBanned) {
      res.status(403).json({ error: "Your account has been suspended." });
      return;
    }
    setCachedUser(payload.userId, user);
    req.user = user;
    next();
  } catch (err) {
    logger.error({ err }, "requireAuth DB error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// Middleware: require admin role
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
}
