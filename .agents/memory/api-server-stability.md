---
name: API server crash/stability hardening
description: Pitfalls that cause the Express/Postgres api-server to crash or return raw 500s under concurrent load (multiple registrations/users), and the fixes applied.
---

## pg Pool needs an 'error' listener
`pool.on('error', ...)` must be attached wherever a `pg.Pool` is created. The pool is
an EventEmitter and emits a background `'error'` on an idle client (DB restart,
network blip) even when no query is in flight. With no listener, that event has
nowhere to go and crashes the entire Node process — this is one of the most common
causes of an otherwise-healthy Express app going down under load.

**Why:** Found this was missing in `lib/db/src/index.ts`; added the listener plus
sane pool bounds (`max`, `idleTimeoutMillis`, `connectionTimeoutMillis`) so a burst
of concurrent requests can't exhaust Postgres connections or hang forever.
**How to apply:** Any time a new `pg.Pool` (or similar DB pool) is introduced,
verify an error listener exists before considering the setup done.

## Check-then-insert races on unique columns need DB-level catch, not just a pre-check
A `SELECT ... WHERE phone = ?` followed by `INSERT` (classic in registration flows)
is a TOCTOU race: two concurrent requests for the same value can both pass the
pre-check before either commits, so the second INSERT throws a Postgres unique
violation instead of hitting the friendly "already exists" branch.

**Why:** `/api/auth/register` in `artifacts/api-server/src/routes/auth.ts` did
exactly this; a concurrency test with 5 simultaneous registrations for the same
phone produced four raw 500s until this was fixed.
**How to apply:** Wrap the insert in try/catch and check the Postgres error code
for `23505` (unique_violation), `23503` (foreign_key_violation), `23502`
(not_null_violation). Drizzle wraps the raw pg driver error in `err.cause`, not
`err`, so check **both** `err.code` and `err.cause?.code`. The global error
handler in `app.ts` now does this generically as defense-in-depth for any route
that forgets to catch locally — but don't rely on that alone for user-facing
copy (e.g. register still returns a specific "Phone number already registered"
message from its own catch block).

## Auth rate limiter is in-memory and shared across all testers/curl on this IP
`/api/auth/login`, `/register`, `/refresh` are capped at 20 req/15min per IP via
`express-rate-limit` with the default in-memory store. Manual curl QA and a
testing subagent's browser share the same dev-domain IP, so back-to-back manual
login checks plus a subagent test plan can exhaust the window and return 429
for everyone, blocking further QA.
**Why:** Hit this mid-QA — curl-based login checks plus a testing subagent's
login attempts combined to trip the limiter, and the subagent reported "unable"
with 429s until resolved.
**How to apply:** If QA needs many login calls in a short window, restart the
api-server workflow to clear the in-memory limiter (fast, safe in dev), or space
out requests/reuse tokens instead of re-logging-in repeatedly.

## Multi-step writes need transactions
Sequential `INSERT` + `INSERT`/`UPDATE` calls that aren't wrapped in a DB
transaction can leave partial state if the process or connection drops between
them (e.g. project created but its default pages never inserted; order created
but the project's status never flips to "ordered").
**Why:** `POST /projects` and `POST /orders` both had this shape.
**How to apply:** Use `db.transaction(async (tx) => { ... })` (drizzle-orm/node-postgres
supports this) for any handler that performs more than one related write that
should succeed or fail together.
