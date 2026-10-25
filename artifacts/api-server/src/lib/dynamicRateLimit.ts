import type { Request, Response, NextFunction } from "express";
import type { SecuritySettings } from "./securitySettingsShared";
import { getClientIp } from "./clientIp";
import { peekAccessToken, type PeekedUser } from "./jwtPeek";

type NumericKey = {
  [K in keyof SecuritySettings]: SecuritySettings[K] extends number ? K : never;
}[keyof SecuritySettings];

export interface DynamicLimiterOptions {
  windowMsKey: NumericKey;
  maxKey: NumericKey;
  message: string;
  /**
   * Skip GET/HEAD — catalog/settings polling must never burn the write bucket.
   * Default true. Auth/login keep this false.
   */
  skipSafeMethods?: boolean;
  /** Logged-in users get their own bucket so office/CGNAT IPs don't share a cap. */
  keyByUser?: boolean;
}

export interface DynamicLimiterDeps {
  getSettings?: () => Promise<Pick<SecuritySettings, NumericKey>> | Pick<SecuritySettings, NumericKey>;
  peekUser?: (req: Request) => PeekedUser | null;
  clientIp?: (req: Request) => string | null;
  now?: () => number;
  logEvent?: (type: "rate_limited", key: string, path: string) => void;
}

function defaultPeek(req: Request): PeekedUser | null {
  return peekAccessToken(req);
}

/**
 * Per-client sliding window. Fail-open when the client IP is unknown or the
 * configured max is unusable — a broken proxy header must not 429 everyone.
 */
export function createDynamicLimiter(
  { windowMsKey, maxKey, message, skipSafeMethods = true, keyByUser = true }: DynamicLimiterOptions,
  deps: DynamicLimiterDeps = {},
) {
  const hits = new Map<string, number[]>();
  const getSettings = deps.getSettings ?? (async () => {
    const { getSecuritySettings } = await import("./securitySettings");
    return getSecuritySettings();
  });
  const peekUser = deps.peekUser ?? defaultPeek;
  const clientIp = deps.clientIp ?? getClientIp;
  const nowFn = deps.now ?? Date.now;
  const logEvent = deps.logEvent ?? ((type, key, path) => {
    void import("./securityEvents").then((m) => m.logSecurityEvent(type, key, path)).catch(() => {});
  });

  const sweep = setInterval(() => {
    const cutoff = nowFn() - 60 * 60 * 1000;
    for (const [key, timestamps] of hits) {
      const kept = timestamps.filter((t) => t > cutoff);
      if (kept.length === 0) hits.delete(key);
      else hits.set(key, kept);
    }
  }, 5 * 60 * 1000);
  sweep.unref?.();

  return async function dynamicLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const method = (req.method || "GET").toUpperCase();
      if (method === "OPTIONS" || (skipSafeMethods && (method === "GET" || method === "HEAD"))) {
        next();
        return;
      }

      const user = peekUser(req);
      if (user?.role === "admin") {
        next();
        return;
      }

      const settings = await getSettings();
      const windowMs = Number(settings[windowMsKey]);
      const max = Number(settings[maxKey]);
      // 0 / NaN / negative would 429 every request (length >= 0). Treat as off.
      if (!Number.isFinite(windowMs) || windowMs <= 0 || !Number.isFinite(max) || max < 1) {
        next();
        return;
      }

      let key: string | null = null;
      if (keyByUser && user?.userId) {
        key = `user:${user.userId}`;
      } else {
        const ip = clientIp(req);
        if (!ip) {
          next();
          return;
        }
        key = `ip:${ip}`;
      }

      const now = nowFn();
      const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);

      if (recent.length >= max) {
        const oldest = recent[0] ?? now;
        const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
        logEvent("rate_limited", key, req.path);
        res.setHeader("Retry-After", String(retryAfter));
        res.status(429).json({ error: message, retryAfterSeconds: retryAfter });
        return;
      }

      recent.push(now);
      hits.set(key, recent);
      next();
    } catch {
      // Settings/DB/IP bugs must not take the shop offline.
      next();
    }
  };
}

export function isAdminBearerRequest(req: Request): boolean {
  return peekAccessToken(req)?.role === "admin";
}
