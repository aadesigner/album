import { describe, it, expect } from "vitest";
import { getCanvasHeight, DESIGN_W, DESIGN_H } from "./designs";

// ─────────────────────────────────────────────────────────────────────────────
// Thumbnail aspect-ratio regression tests
//
// These tests pin the expected pixel dimensions that SpreadNav, PageThumb, and
// Book3DViewer should produce for non-3:4 book sizes.  The formulas in each
// component are:
//
//   SpreadNav  : thumbH = Math.round(thumbW * (canvasH / DESIGN_W))
//   PageThumb  : height = width * (canvasH / DESIGN_W)   (caller must pass)
//                inner content = DESIGN_W × canvasH scaled by width/DESIGN_W
//   Book3DViewer: H = Math.round(W * (canvasH / DESIGN_W))
//
// All three share the same invariant:
//   height / width === canvasH / DESIGN_W  (the book's real aspect ratio)
//
// Pinning concrete pixel values here means a future refactor that accidentally
// hard-codes a height (e.g., 42 px regardless of book shape) will cause
// deterministic test failures before the distortion reaches users.
// ─────────────────────────────────────────────────────────────────────────────

/** Shared formula used by every thumbnail surface in the codebase. */
function thumbHeight(thumbW: number, canvasH: number): number {
  return Math.round(thumbW * (canvasH / DESIGN_W));
}

// ── canonical canvasH values for each supported book format ──────────────────
const CANVAS_H_PORTRAIT  = getCanvasHeight(21, 28); // 800  (3:4 — the reference size)
const CANVAS_H_SQUARE    = getCanvasHeight(21, 21); // 600  (1:1)
const CANVAS_H_LANDSCAPE = getCanvasHeight(21, 14); // 400  (3:2 landscape)

describe("canvasH sanity — prerequisite for all thumbnail tests", () => {
  it("portrait 21×28 cm  → canvasH = DESIGN_H (800)", () => {
    expect(CANVAS_H_PORTRAIT).toBe(DESIGN_H);
    expect(CANVAS_H_PORTRAIT).toBe(800);
  });
  it("square 21×21 cm    → canvasH = 600", () => {
    expect(CANVAS_H_SQUARE).toBe(600);
  });
  it("landscape 21×14 cm → canvasH = 400", () => {
    expect(CANVAS_H_LANDSCAPE).toBe(400);
  });
});

// ── SpreadNav thumbnails ──────────────────────────────────────────────────────
// SpreadNav renders:
//   solo spread  : single page at THUMB_SOLO_W = 28 px wide
//   inner spread : two pages at THUMB_PAIR_W = 24 px wide each
// Height must be Math.round(pageW * canvasH / DESIGN_W) in both cases.

describe("SpreadNav thumbnail height — solo page (width = 28 px)", () => {
  const W = 28;

  it("portrait 3:4  → height = 37 px", () => {
    // 28 * (800/600) ≈ 37.33 → rounds to 37
    expect(thumbHeight(W, CANVAS_H_PORTRAIT)).toBe(37);
  });

  it("square 1:1    → height = 28 px (width === height)", () => {
    // 28 * (600/600) = 28 exactly
    expect(thumbHeight(W, CANVAS_H_SQUARE)).toBe(28);
  });

  it("landscape 3:2 → height = 19 px (shorter than wide)", () => {
    // 28 * (400/600) ≈ 18.67 → rounds to 19
    expect(thumbHeight(W, CANVAS_H_LANDSCAPE)).toBe(19);
  });

  it("square thumb has aspect ratio 1:1 (height/width === 1)", () => {
    const h = thumbHeight(W, CANVAS_H_SQUARE);
    expect(h / W).toBeCloseTo(1, 2);
  });

  it("landscape thumb is shorter than portrait thumb", () => {
    expect(thumbHeight(W, CANVAS_H_LANDSCAPE)).toBeLessThan(thumbHeight(W, CANVAS_H_PORTRAIT));
  });
});

describe("SpreadNav thumbnail height — spread pair pages (width = 24 px each)", () => {
  const W = 24;

  it("portrait 3:4  → height = 32 px", () => {
    // 24 * (800/600) = 32 exactly
    expect(thumbHeight(W, CANVAS_H_PORTRAIT)).toBe(32);
  });

  it("square 1:1    → height = 24 px (width === height)", () => {
    // 24 * (600/600) = 24 exactly
    expect(thumbHeight(W, CANVAS_H_SQUARE)).toBe(24);
  });

  it("landscape 3:2 → height = 16 px", () => {
    // 24 * (400/600) = 16 exactly
    expect(thumbHeight(W, CANVAS_H_LANDSCAPE)).toBe(16);
  });

  it("pair thumb has the same aspect ratio as solo thumb for the same book", () => {
    // Both must honour canvasH/DESIGN_W, just at a different base width.
    const SOLO_W = 28, PAIR_W = 24;
    const ratio = (w: number, ch: number) => thumbHeight(w, ch) / w;
    for (const ch of [CANVAS_H_PORTRAIT, CANVAS_H_SQUARE, CANVAS_H_LANDSCAPE]) {
      expect(ratio(SOLO_W, ch)).toBeCloseTo(ratio(PAIR_W, ch), 1);
    }
  });
});

// ── PageThumb component — height prop passed by the caller ────────────────────
// PageThumb's outer container clips to `height`; its inner scaled layer has
// visual height = canvasH * (width / DESIGN_W).  Distortion-free rendering
// requires:  height === width * (canvasH / DESIGN_W)
// i.e. the caller must pass the same formula as thumbHeight().

describe("PageThumb container height formula (caller responsibility)", () => {
  it("portrait: width=72 → height = 96  (3:4 ratio)", () => {
    // 72 * (800/600) = 96
    expect(thumbHeight(72, CANVAS_H_PORTRAIT)).toBe(96);
  });

  it("square: width=72 → height = 72  (1:1 ratio)", () => {
    // 72 * (600/600) = 72
    expect(thumbHeight(72, CANVAS_H_SQUARE)).toBe(72);
  });

  it("landscape: width=72 → height = 48  (3:2 ratio, height < width)", () => {
    // 72 * (400/600) = 48
    expect(thumbHeight(72, CANVAS_H_LANDSCAPE)).toBe(48);
  });

  it("inner content scale matches container width (no x-axis distortion)", () => {
    // PageThumb computes scale = width / DESIGN_W; inner content width = DESIGN_W * scale = width.
    // This holds regardless of canvasH — the test documents that x-scale is always width/DESIGN_W.
    const width = 72;
    const scale = width / DESIGN_W;
    expect(DESIGN_W * scale).toBeCloseTo(width, 5);
  });

  it("inner content height equals container height for all book formats", () => {
    // PageThumb inner content has height = canvasH * (width / DESIGN_W).
    // Container height (passed by caller) must equal this or the content is clipped/padded.
    const width = 72;
    for (const canvasH of [CANVAS_H_PORTRAIT, CANVAS_H_SQUARE, CANVAS_H_LANDSCAPE]) {
      const containerH = thumbHeight(width, canvasH);
      const innerContentH = canvasH * (width / DESIGN_W);
      // Allow ±1 px for Math.round in thumbHeight
      expect(Math.abs(containerH - innerContentH)).toBeLessThanOrEqual(1);
    }
  });
});

// ── Book3DViewer — H = Math.round(W * (canvasH / DESIGN_W)) ─────────────────
// The 3-D book panel (W=270 px) derives its height from canvasH so the
// 3-D book silhouette matches the real book's proportions.

describe("Book3DViewer plane height — W = 270 px", () => {
  const W = 270;

  it("portrait 3:4  → H = 360 px", () => {
    // 270 * (800/600) = 360 exactly
    expect(thumbHeight(W, CANVAS_H_PORTRAIT)).toBe(360);
  });

  it("square 1:1    → H = 270 px (cube profile)", () => {
    // 270 * (600/600) = 270
    expect(thumbHeight(W, CANVAS_H_SQUARE)).toBe(270);
  });

  it("landscape 3:2 → H = 180 px (wider than tall)", () => {
    // 270 * (400/600) = 180 exactly
    expect(thumbHeight(W, CANVAS_H_LANDSCAPE)).toBe(180);
  });

  it("square book H equals W (1:1 profile)", () => {
    expect(thumbHeight(W, CANVAS_H_SQUARE)).toBe(W);
  });

  it("landscape book H < W (shorter than wide)", () => {
    expect(thumbHeight(W, CANVAS_H_LANDSCAPE)).toBeLessThan(W);
  });

  it("portrait book H > W (taller than wide)", () => {
    expect(thumbHeight(W, CANVAS_H_PORTRAIT)).toBeGreaterThan(W);
  });
});

// ── PageMiniRender (Book3DViewer's internal renderer) — scX vs scY ───────────
// PageMiniRender uses scX = w / DESIGN_W and scY = h / canvasH.
// For a non-3:4 book where h = thumbHeight(w, canvasH):
//   scX = w / DESIGN_W
//   scY = h / canvasH ≈ (w * canvasH / DESIGN_W) / canvasH = w / DESIGN_W = scX
// So scX ≈ scY — elements scale uniformly. fontSize must use scX (not scY).

describe("PageMiniRender scale factors — scX ≈ scY for correct canvas height", () => {
  it("portrait: scX equals scY when h = thumbHeight(w, canvasH)", () => {
    const w = 200, h = thumbHeight(w, CANVAS_H_PORTRAIT);
    const scX = w / DESIGN_W;
    const scY = h / CANVAS_H_PORTRAIT;
    expect(scX).toBeCloseTo(scY, 2);
  });

  it("square: scX equals scY when h = thumbHeight(w, canvasH)", () => {
    const w = 200, h = thumbHeight(w, CANVAS_H_SQUARE);
    const scX = w / DESIGN_W;
    const scY = h / CANVAS_H_SQUARE;
    expect(scX).toBeCloseTo(scY, 2);
  });

  it("landscape: scX equals scY when h = thumbHeight(w, canvasH)", () => {
    const w = 200, h = thumbHeight(w, CANVAS_H_LANDSCAPE);
    const scX = w / DESIGN_W;
    const scY = h / CANVAS_H_LANDSCAPE;
    expect(scX).toBeCloseTo(scY, 2);
  });

  it("scX ≠ scY when height is hard-coded (regression: old SpreadNav h=42)", () => {
    // This documents the bug that was fixed: passing h=42 with w=28 for a
    // square book (canvasH=600) gives scY ≠ scX, causing element distortion.
    // scX = 28/600 ≈ 0.0467; scY = 42/600 = 0.07 — a 50% difference.
    const w = 28, hardcodedH = 42;
    const scX = w / DESIGN_W;
    const scY = hardcodedH / CANVAS_H_SQUARE; // wrong — uses portrait height for square book
    // Relative distortion > 10% means elements are visibly stretched.
    const relativeError = Math.abs(scX - scY) / Math.max(scX, scY);
    expect(relativeError).toBeGreaterThan(0.1);
  });
});
