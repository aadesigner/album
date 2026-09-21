/**
 * Admin dashboard stats — period ranges + a tiny in-process TTL cache.
 * Cap is one entry per range (~7), each payload is a few KB of aggregates.
 * Never grows with traffic; no Redis required.
 */

export const ADMIN_STATS_RANGES = [
  "today",
  "yesterday",
  "week",
  "month",
  "last_month",
  "last_3_months",
  "year",
] as const;

export type AdminStatsRange = (typeof ADMIN_STATS_RANGES)[number];

export function isAdminStatsRange(v: unknown): v is AdminStatsRange {
  return typeof v === "string" && (ADMIN_STATS_RANGES as readonly string[]).includes(v);
}

export type RangeBounds = {
  /** Inclusive start */
  start: Date;
  /** Exclusive end */
  end: Date;
  /** Human label */
  label: string;
  /** Chart grain */
  grain: "hour" | "day";
  /** Approx points expected (for filling) */
  expectedPoints: number;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Monday-start calendar week containing `d`. */
function startOfWeekMon(d: Date): Date {
  const day = startOfDay(d);
  const dow = day.getDay(); // 0 Sun … 6 Sat
  const offset = dow === 0 ? 6 : dow - 1;
  return addDays(day, -offset);
}

export function resolveStatsRange(range: AdminStatsRange, now = new Date()): RangeBounds {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);

  switch (range) {
    case "today":
      return {
        start: today,
        end: tomorrow,
        label: "Today",
        grain: "hour",
        expectedPoints: 24,
      };
    case "yesterday":
      return {
        start: addDays(today, -1),
        end: today,
        label: "Yesterday",
        grain: "hour",
        expectedPoints: 24,
      };
    case "week":
      return {
        start: startOfWeekMon(now),
        end: tomorrow,
        label: "This week",
        grain: "day",
        expectedPoints: 7,
      };
    case "month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: tomorrow,
        label: "This month",
        grain: "day",
        expectedPoints: 31,
      };
    case "last_month": {
      const start = addMonths(today, -1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start,
        end,
        label: "Last month",
        grain: "day",
        expectedPoints: 31,
      };
    }
    case "last_3_months":
      return {
        start: addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -2),
        end: tomorrow,
        label: "Last 3 months",
        grain: "day",
        expectedPoints: 92,
      };
    case "year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: tomorrow,
        label: "This year",
        grain: "day",
        expectedPoints: 366,
      };
  }
}

const STATS_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { expires: number; payload: unknown }>();

export function getCachedAdminStats(range: AdminStatsRange): unknown | null {
  const hit = cache.get(range);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(range);
    return null;
  }
  return hit.payload;
}

export function setCachedAdminStats(range: AdminStatsRange, payload: unknown): void {
  // Hard cap: never more than one entry per known range.
  cache.set(range, { expires: Date.now() + STATS_TTL_MS, payload });
}

/** Drop all period caches (e.g. after an order status change). */
export function invalidateAdminStatsCache(): void {
  cache.clear();
}

export function adminStatsCacheMeta(range: AdminStatsRange): { cached: boolean; ttlSec: number } {
  const hit = cache.get(range);
  if (!hit || Date.now() > hit.expires) return { cached: false, ttlSec: 0 };
  return { cached: true, ttlSec: Math.max(0, Math.round((hit.expires - Date.now()) / 1000)) };
}
