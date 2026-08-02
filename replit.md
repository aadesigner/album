# Përgjithmonë

Albanian-language photobook SaaS — customers pick a category/style/size, design a photo album in a drag-and-drop editor, and order a printed hard-copy book via WhatsApp checkout.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, previewPath `/api`)
- `pnpm --filter @workspace/pergjithmone run dev` — run the web frontend (previewPath `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec-tsconfig run codegen` — regenerate API hooks and Zod schemas from `lib/api-spec/openapi.yaml` (never hand-edit generated files in `lib/api-client-react` / `lib/api-zod`)
- `pnpm --filter @workspace/db-tsconfig run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` (PostgreSQL connection string). Recommended: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (falls back to insecure dev defaults if unset — set real values before going to production). Optional: `RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` (auth forms degrade gracefully without them). In production set `CORS_ORIGINS` to a comma-separated list of your allowed `https://` origins.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter (routing), shadcn/radix UI, framer-motion, react-konva/konva (page editor canvas), jsPDF (export)
- API: Express 5, pino logging, custom JWT auth (access token in memory, refresh token in httpOnly cookie)
- DB: PostgreSQL + Drizzle ORM, schema in `lib/db/src/schema/`
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval, from `lib/api-spec/openapi.yaml`
- Build: esbuild (backend), Vite (frontend)

## Where things live

- `artifacts/pergjithmone` — customer-facing web app (marketing pages, wizard, Konva editor, admin panel under `/heyadmin`)
- `artifacts/api-server` — Express API (routes in `src/routes/`, auth/logging in `src/lib/`)
- `lib/db` — Drizzle schema (source of truth for DB tables)
- `lib/api-spec/openapi.yaml` — API contract (source of truth for request/response shapes)
- `lib/api-client-react`, `lib/api-zod` — generated from the OpenAPI spec via Orval; regenerate, don't hand-edit
- `attached_assets/` — brand imagery (logo variants, category/hero photos)

## Architecture decisions

- Auth is phone-number based, not email: users register/login with a phone number; a synthetic `${phone}@ph.local` email is stored internally so JWT/session code didn't need to change. See `.agents/memory/phone-auth.md`.
- The Konva page editor's design themes (`DESIGN_METAS` in `src/lib/designMeta.ts`) are hardcoded in the frontend, not driven by the `templates` DB table — the `templates`/`layouts`/`subcategories` tables exist for admin CRUD/future use but aren't queried by the customer-facing wizard today (only `categories`, `book_sizes`, and `app_settings` are).
- File uploads (`artifacts/api-server/src/routes/uploads.ts`) are stored on local disk (`./uploads`), not object storage — carried over from the original implementation. This won't survive redeploys on ephemeral hosts; mount a persistent volume at `./uploads` or migrate to an object storage service (S3, R2, etc.) if persistence across deploys is required.
- Ordering has no online payment — checkout hands off to a pre-filled WhatsApp message (`+355688755833`) for manual order confirmation.

## Product

- Public marketing site (hero, categories, pricing, examples) at `/`
- Signup/login by phone number, then a 3-step wizard (category → style → book size) at `/krijo`
- Konva-based drag-and-drop photo book editor at `/editor/:id` with autosave, add-spread, and 3D book preview
- Order review + WhatsApp checkout handoff
- Admin panel at `/heyadmin` for managing categories, templates, orders, users, and site settings

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, always regenerate with `pnpm --filter @workspace/api-spec-tsconfig run codegen` — never hand-edit generated files. See `.agents/memory/orval-codegen-quirks.md` for OpenAPI constraints (Orval 8.21 / Zod v3 collisions).
- After editing DB schema in `lib/db`, run `pnpm --filter @workspace/db-tsconfig run push`, then restart the API server workflow.
- All `/admin/*` API routes must use the `requireAdmin` middleware — see `.agents/memory/admin-controls-architecture.md`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.agents/memory/` for detailed architecture notes on the editor, admin controls, and auth
