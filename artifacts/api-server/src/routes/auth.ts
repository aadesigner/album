import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  requireAuth,
  invalidateCachedUser,
} from "../lib/auth";
import { recaptchaConfig, verifyRecaptchaToken } from "../lib/recaptcha";
import { getSecuritySettings } from "../lib/securitySettings";

const router: IRouter = Router();

// In-memory dedup for concurrent refresh requests with the same token.
// Prevents race-condition storms where two 401-recovery retries both hit /refresh
// simultaneously, causing the first to rotate the token and the second to be rejected.
const refreshInFlight = new Set<string>();

// POST /auth/register  (phone-based, no email required)
router.post("/auth/register", async (req, res): Promise<void> => {
  const { phone, password, name, recaptchaToken } = req.body;
  if (!phone || !password) {
    res.status(400).json({ error: "Phone number and password are required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (!/^\+\d{6,15}$/.test(phone)) {
    res.status(400).json({ error: "Invalid phone number format" });
    return;
  }

  // reCAPTCHA is best-effort: verify only when a token is present
  if (recaptchaConfig.registerEnabled && recaptchaToken) {
    const ok = await verifyRecaptchaToken(recaptchaToken);
    if (!ok) {
      res.status(400).json({ error: "reCAPTCHA verification failed" });
      return;
    }
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Phone number already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  // Synthetic email keeps the email NOT NULL constraint happy and the JWT payload intact
  const syntheticEmail = `${phone.replace(/\D/g, "")}@ph.local`;

  let user: typeof usersTable.$inferSelect;
  try {
    [user] = await db
      .insert(usersTable)
      .values({
        email: syntheticEmail,
        phone,
        passwordHash,
        name: name || null,
        emailVerified: true, // no email verification needed for phone accounts
      })
      .returning();
  } catch (err: any) {
    // Two concurrent registrations for the same phone can both pass the
    // "existing" check above before either commits (classic check-then-act
    // race). The DB's unique constraint on `phone` (or the synthetic email
    // derived from it) is the real guard — catch its violation here and
    // turn it into the same friendly 409 instead of letting it fall through
    // as a generic 500. Drizzle wraps the raw pg error in `.cause`, so check
    // both spots for the Postgres unique-violation code.
    const code = err?.code ?? err?.cause?.code;
    if (code === "23505") {
      res.status(409).json({ error: "Phone number already registered" });
      return;
    }
    throw err;
  }

  req.log.info({ userId: user.id }, "User registered (phone)");

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await db
    .update(usersTable)
    .set({ refreshToken })
    .where(eq(usersTable.id, user.id));

  setRefreshTokenCookie(res, refreshToken);

  res.status(201).json({
    accessToken,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

// POST /auth/login  (phone-based for regular users; email-based for admin accounts
// created from the admin area, which have no phone number on file)
router.post("/auth/login", async (req, res): Promise<void> => {
  const { phone, email, password, recaptchaToken } = req.body;
  if ((!phone && !email) || !password) {
    res.status(400).json({ error: "Phone number (or email) and password are required" });
    return;
  }

  // reCAPTCHA is best-effort: verify only when a token is present
  if (recaptchaConfig.loginEnabled && recaptchaToken) {
    const ok = await verifyRecaptchaToken(recaptchaToken);
    if (!ok) {
      res.status(400).json({ error: "reCAPTCHA verification failed" });
      return;
    }
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(email ? eq(usersTable.email, email) : eq(usersTable.phone, phone))
    .limit(1);

  // Per-account brute-force lockout — independent of the IP-based rate
  // limiter, so switching IPs (or many attackers sharing one) doesn't help
  // against repeated guesses on a single account.
  if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    res.status(429).json({
      error: `Too many failed login attempts. Please try again in ${minutesLeft} minute(s).`,
    });
    return;
  }

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    if (user) {
      const settings = await getSecuritySettings();
      const attempts = user.failedLoginAttempts + 1;
      if (attempts >= settings.loginLockoutThreshold) {
        await db
          .update(usersTable)
          .set({
            failedLoginAttempts: 0,
            lockedUntil: new Date(Date.now() + settings.loginLockoutMinutes * 60 * 1000),
          })
          .where(eq(usersTable.id, user.id));
      } else {
        await db
          .update(usersTable)
          .set({ failedLoginAttempts: attempts })
          .where(eq(usersTable.id, user.id));
      }
    }
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "Your account has been suspended. Please contact support." });
    return;
  }

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const now = new Date();
  await db
    .update(usersTable)
    .set({ refreshToken, lastLoginAt: now, failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(usersTable.id, user.id));

  setRefreshTokenCookie(res, refreshToken);

  res.json({
    accessToken,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: now,
    },
  });
});

// POST /auth/logout
router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  if (req.user) {
    await db
      .update(usersTable)
      .set({ refreshToken: null })
      .where(eq(usersTable.id, req.user.id));
  }
  clearRefreshTokenCookie(res);
  res.json({ success: true });
});

// POST /auth/refresh
router.post("/auth/refresh", async (req, res): Promise<void> => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }

  // Reject a second concurrent refresh for the same token — prevents race storms
  if (refreshInFlight.has(token)) {
    res.status(429).json({ error: "Refresh already in progress, retry shortly." });
    return;
  }

  const payload = verifyRefreshToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid refresh token" });
    return;
  }

  refreshInFlight.add(token);
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .limit(1);

    if (!user || user.refreshToken !== token) {
      res.status(401).json({ error: "Refresh token revoked" });
      return;
    }

    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    await db
      .update(usersTable)
      .set({ refreshToken: newRefreshToken })
      .where(eq(usersTable.id, user.id));

    setRefreshTokenCookie(res, newRefreshToken);

    res.json({
      accessToken,
      user: {
        id: user.id,
        phone: (user as any).phone ?? null,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } finally {
    refreshInFlight.delete(token);
  }
});

// GET /auth/me
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  res.json({
    id: user.id,
    phone: (user as any).phone ?? null,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

// POST /auth/change-password  (logged-in user changes their own password)
router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new password are required" });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const user = req.user!;
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  // Rotate tokens on password change: invalidates any other logged-in sessions
  // (old refreshToken no longer matches) while keeping the current tab signed in.
  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await db
    .update(usersTable)
    .set({ passwordHash, refreshToken })
    .where(eq(usersTable.id, user.id));
  invalidateCachedUser(user.id);

  setRefreshTokenCookie(res, refreshToken);
  req.log.info({ userId: user.id }, "User changed password");
  res.json({ success: true, accessToken });
});

// POST /auth/forgot-password
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  // Always respond 200 to prevent enumeration
  if (user) {
    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db
      .update(usersTable)
      .set({ resetPasswordToken: token, resetPasswordExpires: expires })
      .where(eq(usersTable.id, user.id));
    req.log.info({ userId: user.id, token }, "Password reset token generated");
  }

  res.json({ success: true, message: "If that email exists, a reset link was sent" });
});

// POST /auth/reset-password
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: "Token and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.resetPasswordToken, token))
    .limit(1);

  if (
    !user ||
    !user.resetPasswordExpires ||
    user.resetPasswordExpires < new Date()
  ) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(usersTable)
    .set({ passwordHash, resetPasswordToken: null, resetPasswordExpires: null })
    .where(eq(usersTable.id, user.id));

  res.json({ success: true });
});

// POST /auth/verify-email
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: "Token is required" });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.emailVerifyToken, token))
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "Invalid verification token" });
    return;
  }

  await db
    .update(usersTable)
    .set({ emailVerified: true, emailVerifyToken: null })
    .where(eq(usersTable.id, user.id));

  res.json({ success: true });
});

export default router;
