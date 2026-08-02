---
name: Editor architecture decisions
description: Konva canvas setup, text toolbar, font loading, add-pages flow, 3D viewer patterns
---

## Konva Scale Pattern
All Konva Stage dimensions are in `DESIGN_W × DESIGN_H` (600×800). Display size driven by `pageW` state (ResizeObserver on canvasRef). Scale factors `scX = pageW / DESIGN_W`, `scY = pageH / DESIGN_H` applied to Stage. Transformer is per-page — reset via `trRef.current.nodes([])` on deselect.

## Text Toolbar
- Positioned absolutely above the editing element: `top = Math.max(4, tbTop - 88)`, `left = Math.max(4, Math.min(tbLeft, pageW - 308))`.
- Two-row layout: Row 1 = horizontal scrollable font picker (FONTS array), Row 2 = B / I / size / color / Done.
- **Color picker bug fix**: use `key={\`${editId}-${toolbarEl?.fill}\`}` + `defaultValue` so input re-mounts when element changes. `onChange` (not `onInput`) fires correctly.
- Font picker uses `onMouseDown` + `e.preventDefault()` to avoid blurring the textarea before the font applies.
- `onBlur={()=>setTimeout(commitEdit,150)}` on textarea gives 150ms grace for toolbar clicks.
- Background color removed from toolbar (always white paper).

## Font Loading
- `useEffect` in main Editor injects a `<link id="gfonts-editor">` to Google Fonts once on mount.
- FONTS array (8 entries): Georgia, Playfair Display, Cormorant Garamond, Raleway, Montserrat, Dancing Script, Great Vibes, Pacifico.

## Add Pages (Add Spread)
- `addSpread` callback: finds max `pageNumber` among inner pages, POSTs 2 new inner pages with `maxInner+1` and `maxInner+2`.
- Back cover always has higher pageNumber so sort keeps it last without re-numbering.
- After POST, calls `refetchProject()` then jumps spread index to `spreads.length - 2`.
- `addingSpread` boolean state disables the button and shows "…" during the async operation.
- `+` button rendered at end of SpreadNav with dashed border style.

## 3D Viewer
- Pure CSS 3D (not Three.js) — `transform-style: preserve-3d`, `perspective: 1100px`.
- **Thickness scaling**: `D = Math.max(18, Math.min(90, Math.round((project.pageCount || 20) * 1.8)))`.
- **Browse mode**: `browseMode` state toggles between 3D rotation and `SpreadBrowser` component.
- `SpreadBrowser`: filters to non-solo spreads, shows left+right `PageMiniRender` side by side with 4px spine strip, animated slide via `AnimatePresence`, dot pagination, responsive `pgW` via ResizeObserver.
- "Browse Pages" / "3D View" toggle button in header; reset button hidden in browse mode.

## Spread Build Logic
`buildSpreads(pages)` sorts by `pageNumber`. front_cover → solo spread, inside_cover pairs with inner[0], pairs remaining inners 2-by-2, back_cover appended to last spread or as new spread.

## Auto-Save
`triggerSave` debounces 1.8s. `dirtyPages` Set tracks which dbIds need PATCH. On refetch, dirty pages preserve in-memory content.

## Left-click / Transformer visibility fix
**Bug**: clicking an element on the non-active spread side called `onSelectId(id)` then the wrapper div's `onClick` fired `onActiveSide(side)` which called `setSelectedId(null)` — clearing the selection in the same React batch.
**Fix**: `onActiveSide` in Editor now calls `setActiveSide` only (no `setSelectedId(null)`). Clearing on stage background is handled inside PageCanvas's `onMouseDown` (fires when clicking the Konva stage, not an element). SpreadView's `renderSide` now passes `selectedId` to both sides (not just the active one) and wraps `onSelectId` to also call `onActiveSide(side)`, so clicking an element on the non-focused page switches focus and selects in the same React batch.

## addPhoto placeholder fallback
`addPhoto` now prefers the currently-selected placeholder, then falls back to `els.find(e=>e.type==='placeholder')` — so uploading via the picker always fills the first slot even if `selectedId` drifted. When no placeholder exists and the page has no images yet, defaults to a `DESIGN_W × DESIGN_H` full-page element.

**Why:** These patterns were hard to discover from first principles — especially the color picker re-mount fix and the back-cover pageNumber ordering strategy.

## Wizard design apply vs. dashboard thumbnail mismatch
The wizard's design picker (`designMeta.ts` `DESIGN_METAS`) and the actual template data applied in the editor (`Editor.tsx` `DESIGNS`) are two separate arrays keyed by the same id — always verify both when a chosen style "doesn't show up." The apply step itself (writing background/shape/text elements to `contentJson`) worked correctly; the real bug was that `Projects.tsx` (the "My projects" dashboard) rendered a hardcoded static white-book mockup for every project, never reading `contentJson` at all, so a correctly-applied design was invisible until the user opened the editor.
**Fix:** `GET /projects` now also returns `frontCoverJson` (front_cover page's `contentJson`) per project so list views can render a real thumbnail; added a `CoverThumb` component in `Projects.tsx` that renders background/shape/text elements proportionally, matching `Editor.tsx`'s own DOM-preview logic.
**How to apply:** when a design/content "isn't reflected," check every place the content is *displayed*, not just where it's *applied* — list/dashboard views are easy to miss since they're often built once early and never revisited.
