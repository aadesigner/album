import type { Request, Response, NextFunction } from "express";
import { getSecuritySettings, type SecuritySettings } from "./securitySettings";
import { logSecurityEvent } from "./securityEvents";

type NumericKey = {
  [K in keyof SecuritySettings]: SecuritySettings[K] extends number ? K : never;
}[keyof SecuritySettings];

interface DynamicLimiterOptions {
  /** Settings key holding the window size in ms. */
  windowMsKey: NumericKey;
  /** Settings key holding the max requests per window. */
  maxKey: NumericKey;
  message: string;
}

/**
 * A per-IP sliding-window rate limiter whose window/max are read from
 * admin-editable settings on every request (via a cached loader — see
 * securitySettings.ts), so changes apply without an API restart.
 *
 * Counters live in an in-memory Map keyed by IP. This is fine at current
 * scale (single API process) but is intentionally isolated behind this one
 * function so it can be swapped for a shared Redis counter later without
 * touching call sites.
 */
export function createDynamicLimiter({ windowMsKey, maxKey, message }: DynamicLimiterOptions) {
  const hits = new Map<string, number[]>();

  // Periodic sweep so the Map doesn't grow unbounded from one-off visitors.
  const sweep = setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [ip, timestamps] of hits) {
      const kept = timestamps.filter((t) => t > cutoff);
      if (kept.length === 0) hits.delete(ip);
      else hits.set(ip, kept);
    }
  }, 5 * 60 * 1000);
  sweep.unref?.();

  return async function dynamicLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.method === "OPTIONS") {
      next();
      return;
    }
    const settings = await getSecuritySettings();
    const windowMs = settings[windowMsKey];
    const max = settings[maxKey];
    const ip = (req.ip || "unknown").replace(/^::ffff:/, "");
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      logSecurityEvent("rate_limited", ip, req.path);
      res.setHeader("Retry-After", Math.ceil(windowMs / 1000).toString());
      res.status(429).json({ error: message });
      return;
    }

    recent.push(now);
    hits.set(ip, recent);
    next();
  };
}
