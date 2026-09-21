/**
 * Admin dashboard stats — period ranges + a tiny in-process TTL cache.
 *
 * Goals:
 * - Keep Albania-local day/week boundaries correct (Europe/Tirane)
 * - Short TTL so numbers stay fresh without hammering Postgres
 * - Cap at one entry per range; coalesce concurrent misses (no stampede)
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

/** Shop timezone — ranges and chart buckets follow this, not Railway UTC. */
export const ADMIN_STATS_TZ = "Europe/Tirane";

/** ~90s is enough to blunt refresh spam; short enough to feel live. */
export const STATS_TTL_MS = 90_000;

export type RangeBounds = {
  /** Inclusive start (UTC instant of local midnight) */
  start: Date;
  /** Exclusive end */
  end: Date;
  label: string;
  grain: "hour" | "day";
  expectedPoints: number;
};

type CalParts = { year: number; month: number; day: number };

function calendarPartsInTz(date: Date, timeZone: string): CalParts & { hour: number } {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const p of f.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
  };
}

/** UTC instant for local midnight of the calendar day containing `date` in `timeZone`. */
export function startOfZonedDay(date: Date, timeZone: string = ADMIN_STATS_TZ): Date {
  const { year, month, day } = calendarPartsInTz(date, timeZone);
  let guess = Date.UTC(year, month - 1, day, 12, 0, 0);
  for (let i = 0; i < 4; i++) {
    const p = calendarPartsInTz(new Date(guess), timeZone);
    const asLocal = Date.UTC(p.year, p.month - 1, p.day, p.hour, 0, 0);
    const wantLocal = Date.UTC(year, month - 1, day, 0, 0, 0);
    guess += wantLocal - asLocal;
  }
  return new Date(guess);
}

function addZonedDays(date: Date, n: number, timeZone: string = ADMIN_STATS_TZ): Date {
  const { year, month, day } = calendarPartsInTz(date, timeZone);
  const noonUtc = new Date(Date.UTC(year, month - 1, day + n, 12, 0, 0));
  return startOfZonedDay(noonUtc, timeZone);
}

function startOfZonedMonth(date: Date, timeZone: string = ADMIN_STATS_TZ): Date {
  const { year, month } = calendarPartsInTz(date, timeZone);
  const noonUtc = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  return startOfZonedDay(noonUtc, timeZone);
}

function addZonedMonths(date: Date, n: number, timeZone: string = ADMIN_STATS_TZ): Date {
  const { year, month } = calendarPartsInTz(date, timeZone);
  const noonUtc = new Date(Date.UTC(year, month - 1 + n, 1, 12, 0, 0));
  return startOfZonedDay(noonUtc, timeZone);
}

/** Monday-start week in Tirane. */
function startOfZonedWeekMon(date: Date, timeZone: string = ADMIN_STATS_TZ): Date {
  const dayStart = startOfZonedDay(date, timeZone);
  // weekday in that zone: 0 Sun … 6 Sat via UTC noon probe
  const { year, month, day } = calendarPartsInTz(dayStart, timeZone);
  const dow = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  const offset = dow === 0 ? 6 : dow - 1;
  return addZonedDays(dayStart, -offset, timeZone);
}

export function resolveStatsRange(range: AdminStatsRange, now = new Date()): RangeBounds {
  const today = startOfZonedDay(now);
  const tomorrow = addZonedDays(today, 1);

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
        start: addZonedDays(today, -1),
        end: today,
        label: "Yesterday",
        grain: "hour",
        expectedPoints: 24,
      };
    case "week":
      return {
        start: startOfZonedWeekMon(now),
        end: tomorrow,
        label: "This week",
        grain: "day",
        expectedPoints: 7,
      };
    case "month":
      return {
        start: startOfZonedMonth(now),
        end: tomorrow,
        label: "This month",
        grain: "day",
        expectedPoints: 31,
      };
    case "last_month": {
      const start = addZonedMonths(today, -1);
      const end = startOfZonedMonth(now);
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
        start: addZonedMonths(startOfZonedMonth(now), -2),
        end: tomorrow,
        label: "Last 3 months",
        grain: "day",
        expectedPoints: 92,
      };
    case "year": {
      const { year } = calendarPartsInTz(now, ADMIN_STATS_TZ);
      const start = startOfZonedDay(new Date(Date.UTC(year, 0, 1, 12, 0, 0)));
      return {
        start,
        end: tomorrow,
        label: "This year",
        grain: "day",
        expectedPoints: 366,
      };
    }
  }
}

type CacheEntry = { expires: number; payload: unknown };

const cache = new Map<AdminStatsRange, CacheEntry>();
const inflight = new Map<AdminStatsRange, Promise<unknown>>();

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
  cache.set(range, { expires: Date.now() + STATS_TTL_MS, payload });
}

/** Drop all period caches after order/user mutations. */
export function invalidateAdminStatsCache(): void {
  cache.clear();
}

export function adminStatsCacheMeta(range: AdminStatsRange): {
  cached: boolean;
  ttlSec: number;
  ttlMs: number;
} {
  const hit = cache.get(range);
  if (!hit || Date.now() > hit.expires) {
    return { cached: false, ttlSec: 0, ttlMs: STATS_TTL_MS };
  }
  const ttlSec = Math.max(0, Math.round((hit.expires - Date.now()) / 1000));
  return { cached: true, ttlSec, ttlMs: STATS_TTL_MS };
}

/**
 * Serve from cache, or run `compute` once per range while others await
 * (prevents N concurrent heavy stats queries when TTL expires).
 */
export async function getOrComputeAdminStats(
  range: AdminStatsRange,
  compute: () => Promise<unknown>,
  opts?: { refresh?: boolean },
): Promise<{ payload: unknown; hit: boolean }> {
  if (opts?.refresh) {
    cache.delete(range);
  } else {
    const cached = getCachedAdminStats(range);
    if (cached) return { payload: cached, hit: true };
  }

  let pending = inflight.get(range);
  if (!pending) {
    pending = (async () => {
      const payload = await compute();
      setCachedAdminStats(range, payload);
      return payload;
    })().finally(() => {
      inflight.delete(range);
    });
    inflight.set(range, pending);
  }

  return { payload: await pending, hit: false };
}
