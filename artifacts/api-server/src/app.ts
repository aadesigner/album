import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import compression from "compression";
import helmet from "helmet";
// Importing routes (which imports lib/auth) executes auth.ts's module-level
// JWT secret check below — if the secrets are missing, that import throws
// and the process crashes at startup instead of ever binding a port.
import router from "./routes";
import { logger } from "./lib/logger";
import { isIpBlocked } from "./lib/ipBlocklist";
import { logSecurityEvent } from "./lib/securityEvents";
import { createDynamicLimiter } from "./lib/dynamicRateLimit";

const app: Express = express();

// Trust the reverse proxy so express-rate-limit reads the real client IP
// from X-Forwarded-For instead of the proxy's IP. Set to `true` when the
// app sits behind a load-balancer/CDN that you fully control; set to a hop
// count (e.g. 1) if you only trust a fixed number of proxy hops.
app.set("trust proxy", true);

// ── Security headers (CSP disabled — handled by frontend CDN) ──────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// ── Response compression ───────────────────────────────────────────────────
app.use(compression());

// ── Logging ────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── CORS ───────────────────────────────────────────────────────────────────
// Only the app's own known origins are allowed — no wildcard reflection.
// Set CORS_ORIGINS to a comma-separated list of https:// origins in
// production (e.g. "https://app.example.com,https://www.example.com").
// REPLIT_DOMAINS / REPLIT_DEV_DOMAIN are read automatically when running
// on Replit. Requests with no Origin header (curl, server-to-server,
// same-origin) are always allowed since browsers only send Origin for
// cross-origin requests.
function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  // Generic: explicit list supplied by the host environment.
  (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .forEach((o) => origins.add(o));

  // Replit: automatically-injected domain env vars.
  [
    ...(process.env.REPLIT_DOMAINS?.split(",") ?? []),
    process.env.REPLIT_DEV_DOMAIN,
  ]
    .map((d) => d?.trim())
    .filter((d): d is string => Boolean(d))
    .forEach((d) => origins.add(`https://${d}`));

  if (process.env.NODE_ENV !== "production") {
    for (const host of ["localhost", "127.0.0.1"]) {
      // Vite default + this project's frontend port (see artifacts/pergjithmone)
      origins.add(`http://${host}:5173`);
      origins.add(`http://${host}:19324`);
      origins.add(`http://${host}:80`);
      origins.add(`http://${host}`);
    }
  }
  return origins;
}
const allowedOrigins = buildAllowedOrigins();

function isDevLocalOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || isDevLocalOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(cookieParser());

// ── IP blocklist ─────────────────────────────────────────────────────────
// Enforced before any route (including auth/login) so a blocked IP can't
// reach anything, not even endpoints that would otherwise be public.
app.use(async (req, res, next) => {
  const ip = (req.ip || "unknown").replace(/^::ffff:/, "");
  if (await isIpBlocked(ip)) {
    logSecurityEvent("blocked_ip", ip, req.path);
    res.status(403).json({ error: "Access denied." });
    return;
  }
  next();
});

// ── Body limits (uploads go through multer with its own cap) ───────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Rate limiting ──────────────────────────────────────────────────────────
// Thresholds are admin-editable (Settings → Security & Limits) and read live
// from a short-TTL cache — see lib/dynamicRateLimit.ts and securitySettings.ts.
const generalLimiter = createDynamicLimiter({
  windowMsKey: "rateLimitGeneralWindowMs",
  maxKey: "rateLimitGeneralMax",
  message: "Too many requests, please try again later.",
});
const authLimiter = createDynamicLimiter({
  windowMsKey: "rateLimitAuthWindowMs",
  maxKey: "rateLimitAuthMax",
  message: "Too many auth requests, please try again later.",
});
const analyticsLimiter = createDynamicLimiter({
  windowMsKey: "rateLimitAnalyticsWindowMs",
  maxKey: "rateLimitAnalyticsMax",
  message: "Too many requests.",
});
const uploadsLimiter = createDynamicLimiter({
  windowMsKey: "rateLimitUploadsWindowMs",
  maxKey: "rateLimitUploadsMax",
  message: "Too many uploads, please slow down.",
});

app.use("/api", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/refresh", authLimiter);
app.use("/api/analytics", analyticsLimiter);
app.use("/api/uploads", uploadsLimiter);

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Global error handler ────────────────────────────────────────────────────
// Catches any error thrown (or passed to next()) in async route handlers.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // Defense-in-depth: any route that inserts/updates a unique or
  // foreign-keyed column (admin category/template/layout slugs, concurrent
  // double-submits, etc.) can hit a Postgres constraint violation. Turn the
  // common ones into clean 4xx responses here so a stray race anywhere in
  // the app degrades gracefully instead of surfacing a raw 500.
  // Drizzle wraps the raw pg driver error in `.cause` — check both spots.
  const pgCode = err?.code ?? err?.cause?.code;
  if (pgCode === "23505") {
    res.status(409).json({ error: "That value already exists — please use a different one." });
    return;
  }
  if (pgCode === "23503") {
    res.status(400).json({ error: "Referenced record does not exist." });
    return;
  }
  if (pgCode === "23502") {
    res.status(400).json({ error: "A required field is missing." });
    return;
  }

  const status = err.status ?? err.statusCode ?? 500;
  const message = status < 500 ? err.message : "Internal server error";
  if (status >= 500) logger.error({ err }, "Unhandled route error");
  res.status(status).json({ error: message });
});

export default app;
