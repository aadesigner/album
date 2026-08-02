---
name: PDF generation & photo storage architecture (Përgjithmonë)
description: Why photos stay server-side, how uploads are compressed, and how the real print PDF is rendered — read before touching uploads.ts, generateProjectPdf.ts, or pdfRenderer.ts.
---

## Storage decision: server-side, not client/localStorage
User initially asked for browser-only photo storage (compress only at PDF time) to lighten the server. Rejected after clarifying questions because two other hard requirements need the server to have the photos:
- Drafts must survive device/browser switches (not just tab close).
- Admins must be able to preview in-progress (pre-checkout) drafts.

**Resolution actually built:** keep uploading to the server immediately (unchanged), but compress every upload (`artifacts/api-server/src/routes/uploads.ts`): auto-orient via EXIF, cap the longest edge (~2600px), re-encode as JPEG (mozjpeg, q85) unless the source has an alpha channel (kept as PNG). This keeps disk usage sane without losing the durability/admin-visibility properties.

**Why:** don't re-litigate "let's move photos to the browser" without re-solving cross-device drafts + admin draft visibility first — both were explicit, non-negotiable answers from the user.

## Real PDF generation replaced a stub
`POST /projects/:id/generate-pdf` used to fake a 2s delay and a dummy link — the actual print-ready PDF didn't exist. It's now real, in `artifacts/api-server/src/lib/pdfRenderer.ts` (+ `generateProjectPdf.ts` for the shared DB/orchestration bits), and is triggered both from that route and automatically from `POST /orders` (order placement), since the admin panel reads the same `project.pdfUrl`.

Key implementation notes for future changes:
- The renderer is a server-side port of the client's canvas-based renderer (`artifacts/pergjithmone/src/lib/generatePDF.ts`) using `@napi-rs/canvas` + `pdf-lib`. Keep the two in sync if the `EditorElement` shape changes — the server one doesn't share the file directly.
- Canvas rendering + JPEG encoding is synchronous/CPU-bound. A 30+ page book blocks Node's event loop long enough to look like a dead server (health checks/other requests stall) — must `await new Promise(r => setImmediate(r))` between pages to yield. Learned this by watching the dev server get killed/restarted mid-render before adding the yield.
- `@napi-rs/canvas` ships a native `.node` binary; esbuild must externalize `@napi-rs/canvas` and `@napi-rs/canvas-*` (not just `*.node`) in `build.mjs` or the build fails with "No loader configured for .node files".
- No web fonts (Playfair Display/Inter) are installed server-side; text is rendered with the OS's DejaVu Serif/Sans as a stand-in (registered via `GlobalFonts.registerFromPath`), matched by keyword-sniffing the requested `fontFamily`. Visually close but not pixel-identical to the editor.
- Output PDF page size is the actual book size in cm (from `book_sizes`) at 300 DPI — not the old hardcoded 150×200mm.
