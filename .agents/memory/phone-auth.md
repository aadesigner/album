---
name: Phone-based authentication
description: Registration and login use phone number, not email. Synthetic email stored internally so JWT/session code is untouched.
---

# Phone-based Authentication

## Strategy: synthetic email
- `email` column stays NOT NULL — keeps JWT payload and all middleware untouched.
- On register: synthetic email generated as `${phone.replace(/\D/g,'')}@ph.local` stored in `email`.
- `phone` column added to usersTable as nullable TEXT with a partial unique index (`WHERE phone IS NOT NULL`).
- DB migration done via raw SQL (drizzle-kit push prompts interactively and fails in CI):
  ```sql
  ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users(phone) WHERE phone IS NOT NULL;
  ```
- After schema edit, always run: `cd lib/db && pnpm exec tsc --build`.

## Auth routes
- `POST /auth/register` — accepts `{ phone, password, name?, recaptchaToken? }`.
- `POST /auth/login` — accepts `{ phone, password, recaptchaToken? }`. Looks up user by `phone` column.
- `GET /auth/me` — returns `{ id, phone, name, role, createdAt, updatedAt }` (no email exposed).
- `POST /auth/refresh` — same response shape as /auth/me.

## reCAPTCHA — soft verification
- Backend no longer blocks when token is absent. Only verifies if BOTH enabled AND token present.
- Frontend: `executeRecaptcha()` wrapped in inner try/catch so network/ad-blocker failures never prevent form submission.

## Frontend phone input
- Shared component: `src/components/ui/PhoneInput.tsx`
- Country codes: Albania (+355) and Kosovo (+383) first, then alphabetical list.
- Combines a `<select>` (country code) + `<input type="tel">` into one visually unified field.
- Emits full E.164-style string: `+35568123456`.

## Admin create-user
- `POST /admin/users` also accepts `{ phone, password, name?, role? }` (same pattern).
- Admin Users.tsx create modal uses PhoneInput.

## Drizzle type access for new `phone` column
- Because `phone` was added via raw SQL (not drizzle schema push), cast where needed: `(usersTable as any).phone` or `sql\`${(usersTable as any).phone}\``.
- After the next full drizzle push the cast can be removed.

## Admin UI
- User rows show `phone` instead of `email`.
- Orders rows show `userPhone` instead of `userEmail` (field renamed in JOIN select).
- AdminLayout sidebar shows `phone` as the subtitle for logged-in user.
