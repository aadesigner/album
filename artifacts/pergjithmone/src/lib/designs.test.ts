import { describe, it, expect } from "vitest";
import {
  getCanvasHeight,
  scaleElementsToCanvas,
  DESIGN_H,
  DESIGN_W,
} from "./designs";

// ── getCanvasHeight ────────────────────────────────────────────────────────────

describe("getCanvasHeight", () => {
  it("returns 600 for a square book (21×21 cm)", () => {
    // DESIGN_W=600, 600 * (21/21) = 600
    expect(getCanvasHeight(21, 21)).toBe(600);
  });

  it("returns 800 for the standard 3:4 portrait book (21×28 cm)", () => {
    // 600 * (28/21) = 800
    expect(getCanvasHeight(21, 28)).toBe(800);
  });

  it("returns 400 for a landscape book (21×14 cm)", () => {
    // 600 * (14/21) = 400
    expect(getCanvasHeight(21, 14)).toBe(400);
  });

  it("returns DESIGN_H when width is zero (guard)", () => {
    expect(getCanvasHeight(0, 28)).toBe(DESIGN_H);
  });

  it("returns DESIGN_H when height is zero (guard)", () => {
    expect(getCanvasHeight(21, 0)).toBe(DESIGN_H);
  });

  it("returns DESIGN_H when dimensions are null/undefined (guard)", () => {
    expect(getCanvasHeight(null, null)).toBe(DESIGN_H);
    expect(getCanvasHeight(undefined, undefined)).toBe(DESIGN_H);
  });
});

// ── scaleElementsToCanvas ─────────────────────────────────────────────────────

describe("scaleElementsToCanvas", () => {
  it("is a no-op (same reference) when canvasH equals DESIGN_H", () => {
    const els = [{ y: 100, h: 200 }];
    const result = scaleElementsToCanvas(els, DESIGN_H);
    expect(result).toBe(els);
  });

  it("scales y and h proportionally when projecting 800→600", () => {
    // Elements authored at the reference DESIGN_H (800) for a square book canvasH (600)
    const k = 600 / 800; // 0.75
    const els = [{ y: 400, h: 200 }];
    const [out] = scaleElementsToCanvas(els, 600);
    expect(out.y).toBeCloseTo(400 * k);
    expect(out.h).toBeCloseTo(200 * k);
  });

  it("leaves x, w, and width-relative props untouched", () => {
    type El = { y: number; h: number; x: number; w: number; fontSize: number };
    const els: El[] = [{ y: 200, h: 300, x: 50, w: 400, fontSize: 24 }];
    const [out] = scaleElementsToCanvas(els, 600);
    expect(out.x).toBe(50);
    expect(out.w).toBe(400);
    expect(out.fontSize).toBe(24);
  });

  it("scales elements correctly for a tall book (21×42 cm → canvasH=1200)", () => {
    // 600 * (42/21) = 1200
    const canvasH = getCanvasHeight(21, 42);
    expect(canvasH).toBe(1200);
    const k = 1200 / DESIGN_H; // 1.5
    const els = [{ y: 100, h: 100 }];
    const [out] = scaleElementsToCanvas(els, canvasH);
    expect(out.y).toBeCloseTo(100 * k);
    expect(out.h).toBeCloseTo(100 * k);
  });

  it("does not mutate the original elements", () => {
    const original = { y: 200, h: 100 };
    const els = [original];
    scaleElementsToCanvas(els, 600);
    // Original object must be unchanged
    expect(original.y).toBe(200);
    expect(original.h).toBe(100);
  });
});
