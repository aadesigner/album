---
name: Përgjithmonë project overview
description: Architecture, auth, routes, and seeded data for the Albanian photobook SaaS platform
---

## Stack
- Frontend: artifacts/pergjithmone (React+Vite, wouter, shadcn, react-konva, framer-motion)
- Backend: artifacts/api-server (Express 5, pino logging)
- DB: PostgreSQL + Drizzle ORM, schema in lib/db/src/schema/
- API spec: lib/api-spec/openapi.yaml → codegen via orval into lib/api-client-react + lib/api-zod
- Auth: Custom JWT (access token in memory via setAuthTokenGetter, refresh token in httpOnly cookie)

## Auth flow
- AuthContext stores access token in useRef, calls setAuthTokenGetter(() => accessTokenRef.current)
- Login/register mutations return { accessToken, user } — store token in ref, invalidate getGetMeQueryKey
- requireAuth middleware reads Bearer token from Authorization header
- requireAdmin checks role === 'admin'

## Key DB tables seeded
- categories: 6 (udhetimet, dasme, ditelindje, familje, miqesi, festash)
- subcategories: 14 (paris, rom, londres, tokio, plazh, klasik, romantik, floral, femije, i-rritur, verore, dimrore, aventure, krishtlindje)
- book_sizes: 2 (21x21cm 3100 LEK, 21x28cm 3500 LEK)
- layouts: 9 (single, two-col, three-col, four-grid, split-70-30, split-30-70, top-banner, bottom-banner, magazine)
- templates: 5 sample templates with Unsplash cover images
- app_settings: whatsapp_number=+355688755833, base_price_lek=3100, etc.

## Frontend routes
- Public: /, /si-funksionon, /shembuj, /cmime, /faq, /rreth-nesh, /kontakt, /hyr, /regjistrohu, /fjalekale-harruar
- Protected: /krijo (wizard), /editor/:id (konva editor), /projektet, /porositë
- Admin: /heyadmin, /heyadmin/porosi, /heyadmin/perdorues, /heyadmin/kategori, /heyadmin/template, /heyadmin/cilesimet

## WhatsApp ordering
After PDF generation: open wa.me/+355688755833 with pre-filled Albanian or English message
Admin route: GET /api/orders/:orderId/whatsapp

## Vite proxy
vite.config.ts proxies /api → localhost:8080 (API server dev port)
**Why:** Without proxy, browser /api calls hit the Replit shared proxy → frontend, not API server.
