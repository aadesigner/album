import { db } from "@workspace/db-tsconfig";
import { ipBlocklistTable } from "@workspace/db-tsconfig";

// Short-TTL in-memory cache of blocked IPs so the early-middleware check in
// app.ts doesn't hit the DB on every single request. Structured as a plain
// Map/Set so it can be swapped for a shared Redis set later without touching
// call sites.
const TTL_MS = 20 * 1000;
let _cache: { ips: Set<string>; expiresAt: number } | null = null;

export function invalidateIpBlocklistCache(): void {
  _cache = null;
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  if (!_cache || _cache.expiresAt <= Date.now()) {
    const rows = await db.select({ ip: ipBlocklistTable.ip }).from(ipBlocklistTable);
    _cache = { ips: new Set(rows.map((r) => r.ip)), expiresAt: Date.now() + TTL_MS };
  }
  return _cache.ips.has(ip);
}
