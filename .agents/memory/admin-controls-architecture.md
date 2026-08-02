---
name: Admin controls architecture
description: Durable architectural decisions for admin controls — auth middleware rule, settings KV pattern, analytics access control, DB build order.
---

# Admin Controls Architecture

## Rule: all `/admin/*` routes must have `requireAdmin` middleware
**Why:** Forgetting it creates a broken-access-control vulnerability. The pattern is `router.verb("/admin/...", requireAdmin, async (req, res) => ...)`. Analytics chart data is no exception — even "read-only" admin endpoints expose sensitive operational data.
**How to apply:** Any time a new route is added under `/admin/`, verify `requireAdmin` is the second argument before the handler. Check `analytics.ts` in addition to `admin.ts` — admin sub-routes may be split across files.

## Settings KV pattern
All site-wide toggles are stored as string key-value pairs in `appSettingsTable`. Boolean flags use `"true"/"false"` strings. JSON arrays (e.g. `hidden_design_ids`) are stored as a JSON string and parsed at read-time with a try/catch fallback. New settings keys must be added to both the public `GET /settings` and admin `GET /admin/settings` + `PATCH /admin/settings` key maps.

## Analytics endpoint split
`POST /analytics/track` is intentionally public (no auth) — fire-and-forget event ingestion. `GET /admin/analytics/chart` is admin-only. Both live in `analytics.ts` alongside the admin router in `admin.ts`.

## useUpdateAdminCategory mutation signature
Must use: `useUpdateAdminCategory({ categoryId, data: { isActive } })` — flat params, not `pathParams.categoryId`.

## Hidden super-admin account
A bootstrap admin (armand9a@gmail.com) is auto-provisioned on every api-server startup via `seedSuperAdmin.ts`, gated on the `SUPER_ADMIN_PASSWORD` secret. It's marked `isHidden=true` on `usersTable` and every `GET /admin/users` query filters `isHidden=false`.
**Why:** the site owner needs a permanent admin account that isn't a manageable "member" and can't be banned/demoted/deleted by accident through the admin UI.
**How to apply:** any new user-listing/search query added under `/admin/*` must also filter out `isHidden` users, or the hidden account will leak into a list.

## Dual identifier auth (phone vs email)
Regular users register/login by phone (see phone-auth.md). Admin-created accounts (from the admin Users page) can instead use email — no phone required. `/auth/login` accepts either `{phone,password}` or `{email,password}`; the public `/hyr` page has a "sign in with email instead" toggle for this case.
**Why:** admin/staff accounts don't need or want a public phone number tied to them, but still need a real login path (they can't use the phone-only public form).
**How to apply:** admin's `POST /admin/users` accepts `phone` OR `email` (required: one of them + password); role="admin" in the CreateUserModal switches the identifier field to email.

## Testing subagents can't complete real UI login
The login form has live reCAPTCHA (`recaptchaConfig.loginEnabled`), so a Playwright tester submitting the actual `/hyr` form gets a 400 "reCAPTCHA verification failed" — this is expected, not a bug.
**Why:** headless test browsers can't solve/produce a valid reCAPTCHA token.
**How to apply:** for e2e admin/user-flow tests, have the tester log in via a direct API call (POST /auth/login without a recaptchaToken, which is best-effort/optional) and inject the returned token into localStorage, then navigate — don't rely on submitting the visible login form.

## Admin CRUD modal pattern (categories/templates/layouts)
Admin list pages (Categories, Templates, Layouts, Users) don't use `@/components/ui/dialog` — they use a hand-rolled `fixed inset-0 z-50` overlay + centered white card, with a local `useState` form and `mutateAsync` from the generated `@workspace/api-client-react` hooks. Delete confirmation is a small reusable overlay component per page, not a shared one.
**Why:** keeps consistency with the existing admin look; introducing shadcn Dialog would visually diverge from the rest of the panel.
**How to apply:** copy this structure for any new admin CRUD page rather than reaching for `Dialog`. Cover-image uploads use a shared `ImageUploadInput` (`artifacts/pergjithmone/src/components/admin/ImageUploadInput.tsx`) that POSTs raw `FormData` to `/api/uploads/image` with `Authorization: Bearer ${getToken()}` from `useAuth()` — do NOT use the generated `useUploadImage` hook, it base64-encodes into FormData incorrectly and doesn't match how the multer endpoint expects a real file part.
Templates link to a `subcategoryId`, not a top-level category — subcategories are managed inline inside the Categories page (expandable row per category) since there's no separate subcategories admin page; there's also no "list all subcategories" endpoint, so a subcategory picker must fetch per-category via `useQueries` + `getListSubcategoriesQueryOptions(categoryId)`.
After any category/subcategory/template/layout mutation, invalidate both the admin list query key AND the public one consumed by Wizard/AlbumAI/Editor (e.g. `getListAdminCategoriesQueryKey` + `getListCategoriesQueryKey`), or the public pickers go stale.

## DB build order after schema changes
1. Edit schema files in `lib/db`
2. `cd lib/db && pnpm run push-force`
3. `cd lib/db && pnpm exec tsc --build`
4. Restart api-server workflow
**Why:** api-server reads from `lib/db/dist/*.d.ts` (compiled declarations), not source directly.
