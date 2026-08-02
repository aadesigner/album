---
name: Inside back cover page
description: How the locked "inside back cover" lining page was added, distinct from the outer back_cover, and where its role has to be threaded through.
---

Përgjithmonë's page model already had four page types (front_cover, inside_cover, inner,
back_cover). Added a fifth, `inside_back_cover` — a locked lining page mirroring
`inside_cover`, distinct from the outer `back_cover`.

**Why:** the outer back cover is a single "closed book" surface (rendered solo with a
spine), but real photobooks also have an inside-back lining page the customer never
edits, just like the inside front cover. Product wanted that pair to be symmetric.

**How it's wired (don't rediscover from scratch):**
- DB enum `page_type` gained `inside_back_cover` (`lib/db/src/schema/projects.ts`). After
  editing a pgEnum, run `npx tsc -b lib/db --force` — the api-server's tsc project
  reference uses `lib/db/dist/*.d.ts`, which does NOT auto-refresh from source changes
  alone, and stays stale until rebuilt (causes confusing "no overlap" enum errors).
- Frontend `PageRole` type already had an unused `'locked_right'` value sitting in
  `Editor.tsx` before this — it was pre-existing scaffolding for exactly this feature,
  not dead code to remove. `inside_cover` maps to role `'locked_left'`, `inside_back_cover`
  maps to role `'locked_right'`, everywhere a role mapping happens (buildSpreads,
  handleDownloadPDF, generateProjectPdf.ts).
- `buildSpreads` (Editor.tsx) places `inside_back_cover` into the trailing empty right
  slot naturally left over by the inner-page pairing loop (this slot exists whenever the
  inner-page count is even, which it is by default) — falls back to its own spread if not.
- Page ordering (`pageNumber`) is NOT a strict continuous sequence the app relies on for
  correctness — `buildSpreads` finds front/inside/insideBack/back by `pageType` via
  `.find()` independently of their numeric position, so numeric gaps/collisions between
  cover-type pages and inner pages are harmless. Don't over-engineer numbering fixes here.
- Existing DB rows lacking the new page type need a one-time backfill (insert
  `inside_back_cover` at the old `back_cover` pageNumber, bump `back_cover` by 1) — pure
  dev-DB data fix via `executeSql`, not a schema migration script (production schema
  changes go through the normal DB push / migration flow).
