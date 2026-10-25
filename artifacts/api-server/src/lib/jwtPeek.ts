import jwt from "jsonwebtoken";
import type { Request } from "express";

export interface PeekedUser {
  userId: number;
  email?: string;
  role: string;
}

/**
 * Read the access token without importing auth.ts (that module crashes the
 * process when JWT secrets are missing — tests and the limiter must stay
 * loadable). Returns null when the token is absent or invalid.
 */
export function peekAccessToken(req: Request): PeekedUser | null {
  const header = req.headers?.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret) as PeekedUser;
    if (!payload || typeof payload.userId !== "number" || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}
