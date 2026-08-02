import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("user_role", ["user", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: roleEnum("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifyToken: text("email_verify_token"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires", {
    withTimezone: true,
  }),
  refreshToken: text("refresh_token"),
  phone: text("phone").unique(),
  isBanned: boolean("is_banned").notNull().default(false),
  isHidden: boolean("is_hidden").notNull().default(false),
  // Internal note admins leave for themselves/each other about this user (e.g. why
  // their name was changed, PDF issues, etc.) — never shown to the user themselves.
  adminNote: text("admin_note"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  // Per-account brute-force lockout — separate from the IP-based rate limiter.
  // failedLoginAttempts resets to 0 on success or once a lockout is applied.
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
  index("users_created_at_idx").on(t.createdAt),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
