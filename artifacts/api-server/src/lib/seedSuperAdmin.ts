import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { logger } from "./logger";

// The site owner gets one always-present admin account, provisioned automatically
// on server startup rather than through the public (phone-based) registration form.
// It is marked `isHidden` so it never shows up in the admin Users list/search — it's
// an operator account, not a member to manage.
const SUPER_ADMIN_EMAIL = "armand9a@gmail.com";

export async function seedSuperAdmin(): Promise<void> {
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!password) {
    logger.warn(
      "SUPER_ADMIN_PASSWORD is not set — skipping automatic super-admin provisioning",
    );
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id, role: usersTable.role, isHidden: (usersTable as any).isHidden })
    .from(usersTable)
    .where(eq(usersTable.email, SUPER_ADMIN_EMAIL))
    .limit(1);

  if (existing) {
    // Keep it locked to full admin + hidden even if it was ever edited by hand.
    if (existing.role !== "admin" || !existing.isHidden) {
      await db
        .update(usersTable)
        .set({ role: "admin", isHidden: true } as any)
        .where(eq(usersTable.id, existing.id));
      logger.info("Re-asserted admin role/hidden flag on super-admin account");
    }
    return;
  }

  const passwordHash = await hashPassword(password);
  await db.insert(usersTable).values({
    email: SUPER_ADMIN_EMAIL,
    passwordHash,
    name: "Super Admin",
    role: "admin",
    emailVerified: true,
    isHidden: true,
  } as any);

  logger.info({ email: SUPER_ADMIN_EMAIL }, "Provisioned hidden super-admin account");
}
