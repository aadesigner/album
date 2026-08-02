---
name: Security & abuse hardening architecture
description: Durable decisions from adding JWT fail-fast, CORS allowlist, login lockout, IP blocklist, dynamic rate limits, and upload sniffing to the api-server.
---

# Security & Abuse Hardening Architecture

## `trust proxy` must be `true`, not a fixed hop count
Behind reverse proxies (Railway, Cloudflare, etc.) the number of internal hops
in `X-Forwarded-For` varies by access path. A fixed hop count like `1` can pick
up an internal hop's IP instead of the real client. Use `app.set("trust proxy", true)`
and take the left-most XFF entry when the app is only reachable through a trusted proxy.
**Why:** IP-based defenses (rate limiting, IP blocklist) are worthless if every
request resolves to the same internal IP.
**How to apply:** Prefer `trust proxy = true` when the app isn't publicly reachable
except through your edge proxy.

## CORS allowlist in non-production should include local origins
In development, tooling may load the app via `http://localhost` /
`http://127.0.0.1` (with or without `:80`/`:5173`/`:4173`), not only the public domain.
**Why:** Strict CORS limited to production domains breaks local/preview API calls
(`/api/analytics/track`, `/api/auth/refresh`, etc.).
**How to apply:** Add local origins when `NODE_ENV !== "production"`. Production
should stay strict (`CORS_ORIGINS` / public domain(s) only).

## Reuse `siteAnalyticsTable` for security events instead of a new table
Rate-limit (429) and blocked-IP hits are logged as new `event` values
(`"rate_limited"`, `"blocked_ip"`) into the existing analytics table rather than
a dedicated security-events table.
**Why:** avoids a parallel table + migration for what is structurally the same
shape (ip, path, event, timestamp) as existing analytics rows; keeps the admin
Security page's query a simple filter on `event`.

## In-memory settings cache pattern for live-editable thresholds
Rate-limit windows/maxes and abuse caps (max albums, max photos/album, max
orders/day, max concurrent PDFs, lockout threshold/duration, upload size/MIME
allowlist) live in the existing settings KV table, read through a short-TTL
(~15s) in-process cache (`getSecuritySettings()`/`invalidateSecuritySettingsCache()`),
with the admin PATCH handler explicitly invalidating the cache on save.
**Why:** avoids a restart to pick up admin changes while avoiding a DB round
trip on every request. The rate limiter itself is a hand-rolled sliding-window
`Map` (not `express-rate-limit`) for the same reason — it reads live settings
per request instead of being constructed once with fixed values at boot.
**How to apply:** any new admin-editable numeric/threshold setting should follow
this same cached-getter + invalidate-on-write pattern rather than reading the
DB on every request or hardcoding a constant.

## Upload content sniffing via `sharp.metadata()`, not a new `file-type` dependency
Real content-type validation (vs. trusting the client's MIME header) is done by
calling `sharp.metadata()` on the saved file and mapping the detected format to
an allowlist — `sharp` was already a dependency for image processing elsewhere.
**Why:** avoids adding a new package for something the existing dependency
already does; multer's `fileFilter` is kept only as a cheap first-pass check
(loose `image/*`), with the real validation (and admin-configurable max size)
enforced post-save, deleting+rejecting the file if it fails either check.

## `book_sizes` table's display column is `label`, not `name`
When joining book sizes into an admin listing (e.g. `/admin/projects`), the
column to select is `label` — using `name` compiles/runs but returns undefined
values silently in a loose join.
**Why:** tripped up the N+1 fix for `GET /admin/projects` on first attempt.

## Module-level "throw if secret missing" needs a re-bind for TS narrowing
A pattern like `if (!process.env.JWT_SECRET) throw ...; const SECRET = process.env.JWT_SECRET;`
needs the second line — referencing `process.env.JWT_SECRET` again later in the
file does not stay narrowed to `string`, TypeScript still sees `string | undefined`.
**Why:** hit this converting the JWT secrets from soft fallbacks to fail-fast
throws in `artifacts/api-server/src/lib/auth.ts`.
