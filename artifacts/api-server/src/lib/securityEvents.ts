import { db } from "@workspace/db";
import { siteAnalyticsTable } from "@workspace/db";
import { logger } from "./logger";

export type SecurityEventType = "rate_limited" | "blocked_ip";

/**
 * Fire-and-forget log of an abuse-relevant hit (429 or blocked-IP rejection),
 * reusing site_analytics so the admin Security page can show recent activity
 * without a dedicated table. Never awaited by callers — logging must not add
 * latency or failure modes to the request it's describing.
 */
export function logSecurityEvent(type: SecurityEventType, ip: string, path: string): void {
  db.insert(siteAnalyticsTable)
    .values({ ip: ip || "unknown", path: String(path || "/").slice(0, 255), event: type })
    .catch((err) => logger.error({ err, type, ip, path }, "Failed to log security event"));
}
