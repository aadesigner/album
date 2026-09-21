import { describe, it, expect } from "vitest";
import {
  getCanvasHeight,
  scaleElementsToCanvas,
  elementsWithCoverWallpaper,
  wallpaperSrc,
  DESIGN_H,
  DESIGN_W,
  normalizeOverride,
  designFrontElements,
  designBackElements,
  buildDesignCatalog,
  parseCustomDesigns,
  applyDesignOverrides,
  blankCoverElements,
  DESIGNS,
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

describe("elementsWithCoverWallpaper", () => {
  it("is a no-op without thumbPhoto", () => {
    const els = [{ type: "background" as const, x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, rotation: 0, bgColor: "#111" }];
    expect(elementsWithCoverWallpaper(els)).toBe(els);
  });

  it("bakes wallpaper into background only — never duplicates into placeholders", () => {
    const thumb = "https://images.unsplash.com/photo-x?w=400&q=85&fit=crop";
    const els = [
      { type: "background" as const, x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, rotation: 0, bgColor: "#111", bgGradientFrom: "#000", bgGradientTo: "#fff" },
      { type: "placeholder" as const, x: 10, y: 10, w: 100, h: 100, rotation: 0 },
      { type: "text" as const, x: 0, y: 0, w: 100, h: 40, rotation: 0, text: "Hi" },
    ];
    const out = elementsWithCoverWallpaper(els, thumb);
    expect(out[0].type).toBe("background");
    expect(out[0].src).toBe(wallpaperSrc(thumb));
    expect(out[0].bgGradientFrom).toBeUndefined();
    expect(out[1].type).toBe("placeholder");
    expect(out[1].src).toBeUndefined();
    expect(out[2].type).toBe("text");
  });
});

describe("front/back design helpers", () => {
  it("normalizes legacy DE[] overrides to both sides", () => {
    const els = blankCoverElements("A");
    const norm = normalizeOverride(els);
    expect(norm?.frontElements).toEqual(els);
    expect(norm?.backElements).toEqual(els);
  });

  it("normalizes explicit front/back override objects", () => {
    const front = blankCoverElements("F");
    const back = blankCoverElements("B");
    const norm = normalizeOverride({ frontElements: front, backElements: back });
    expect(norm?.frontElements).toEqual(front);
    expect(norm?.backElements).toEqual(back);
  });

  it("falls back backElements to front when unset", () => {
    const d = DESIGNS[0];
    expect(designBackElements(d)).toEqual(designFrontElements(d));
  });

  it("merges custom designs into catalog", () => {
    const customs = parseCustomDesigns([
      {
        id: "custom-test-1",
        name: { en: "Test", sq: "Test" },
        category: "Celebration",
        frontElements: blankCoverElements("FRONT"),
        backElements: blankCoverElements("BACK"),
      },
    ]);
    const catalog = buildDesignCatalog({}, customs);
    expect(catalog.some((d) => d.id === "custom-test-1")).toBe(true);
    const custom = catalog.find((d) => d.id === "custom-test-1")!;
    expect(custom.isCustom).toBe(true);
    expect(designFrontElements(custom)[1].text).toBe("FRONT");
    expect(designBackElements(custom)[1].text).toBe("BACK");
  });

  it("applies side overrides onto built-ins", () => {
    const id = DESIGNS[0].id;
    const front = blankCoverElements("OV-F");
    const back = blankCoverElements("OV-B");
    const [patched] = applyDesignOverrides(
      [DESIGNS[0]],
      { [id]: { frontElements: front, backElements: back } },
    );
    expect(designFrontElements(patched)[1].text).toBe("OV-F");
    expect(designBackElements(patched)[1].text).toBe("OV-B");
  });

  it("keeps city photo layouts on built-in travel covers", () => {
    const rome = DESIGNS.find((d) => d.id === "rome");
    expect(rome).toBeTruthy();
    expect(rome!.thumbPhoto).toBe("/designs/rome-cover-thumb.jpg");
    expect(designFrontElements(rome!).some((e) => e.type === "image" && e.src?.includes("rome-cover-thumb"))).toBe(true);
  });

  it("applies admin overrides that include city photos", () => {
    const rome = DESIGNS.find((d) => d.id === "rome")!;
    const withPhoto = [
      { type: "background" as const, x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, rotation: 0, bgColor: "#000" },
      { type: "image" as const, x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, rotation: 0, src: "/designs/rome-cover-thumb.jpg" },
      { type: "text" as const, x: 0, y: 0, w: 100, h: 40, rotation: 0, text: "ROME" },
    ];
    const [patched] = applyDesignOverrides(
      [rome],
      { rome: { frontElements: withPhoto, backElements: withPhoto } },
    );
    expect(designFrontElements(patched).some((e) => e.src?.includes("cover-thumb"))).toBe(true);
  });

  it("rejects malformed custom designs", () => {
    expect(parseCustomDesigns([{ id: "nope" }])).toEqual([]);
    expect(parseCustomDesigns("x")).toEqual([]);
  });
});
