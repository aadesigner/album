import { db } from "@workspace/db-tsconfig";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * `last_login_at` was added after some accounts already had sessions.
 * Those rows stayed NULL even though refresh_token / projects prove activity.
 * Fill only the historical gaps — never overwrite a real last_login_at.
 */
export async function backfillLastLoginAt(): Promise<void> {
  try {
    const result = await db.execute(sql`
      UPDATE users
      SET last_login_at = COALESCE(updated_at, created_at)
      WHERE last_login_at IS NULL
        AND (
          refresh_token IS NOT NULL
          OR EXISTS (SELECT 1 FROM projects p WHERE p.user_id = users.id)
          OR EXISTS (SELECT 1 FROM orders o WHERE o.user_id = users.id)
        )
    `);
    const n = Number((result as { rowCount?: number }).rowCount ?? 0);
    if (n > 0) {
      logger.info({ count: n }, "Backfilled last_login_at for users with prior activity");
    }
  } catch (err) {
    logger.warn({ err }, "last_login_at backfill skipped");
  }
}
