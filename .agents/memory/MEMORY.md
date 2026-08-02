# Memory Index

- [Përgjithmonë project overview](pergjithmone-overview.md) — stack, auth flow, seeded DB tables, frontend routes for the Albanian photobook SaaS.
- [Orval codegen quirks](orval-codegen-quirks.md) — OpenAPI spec constraints to avoid Orval 8.21 / Zod v3 collisions.
- [Editor architecture](editor-architecture.md) — Konva-based page editor patterns (scale, Transformer, uploads, autosave).
- [Admin controls architecture](admin-controls-architecture.md) — requireAdmin rule, settings KV pattern, DB build order after schema changes.
- [Phone-based authentication](phone-auth.md) — phone (not email) login/register, synthetic email, PhoneInput component.
- [API server crash/stability hardening](api-server-stability.md) — pg pool error listener, TOCTOU register race, Drizzle error.cause, transactions for multi-insert writes.
- [White-label & SEO conventions](white-label-and-seo.md) — SEOMeta/sitemap/robots.txt conventions for this project.
- [PDF generation & photo storage architecture](pdf-generation-architecture.md) — why photos stay server-side (compressed on upload), how the real print-PDF renderer works, event-loop yielding, esbuild native-module gotcha.
- [Inside back cover page](inside-back-cover-page.md) — added locked inside_back_cover page type; pageType-based lookup, not pageNumber, is the source of truth for spread placement.
- [Security & abuse hardening architecture](security-hardening-architecture.md) — trust proxy=true (not a hop count), CORS must allow internal preview origin, cached settings pattern for live thresholds, sharp-based upload sniffing, book_sizes.label gotcha.
