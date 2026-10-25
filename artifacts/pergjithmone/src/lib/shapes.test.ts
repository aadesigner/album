import { describe, it, expect } from "vitest";
import { SHAPE_KINDS, shapeSvgPath, shapePathForElement, newShapeElement, isStrokeOnlyShape } from "./shapes";

describe("shapeSvgPath", () => {
  it("emits a path for every catalog kind", () => {
    for (const kind of SHAPE_KINDS) {
      const d = shapeSvgPath(kind, 200, 160);
      expect(d.startsWith("M ")).toBe(true);
      expect(d.length).toBeGreaterThan(8);
    }
  });

  it("uses evenodd inner cutout for ring", () => {
    const d = shapeSvgPath("ring", 100, 100);
    expect(d.split("M ").length - 1).toBe(2);
  });

  it("rounded rect overrides the default rectangle", () => {
    const sharp = shapePathForElement("rect", 80, 40, 0);
    const round = shapePathForElement("rect", 80, 40, 12);
    expect(round).not.toBe(sharp);
    expect(round).toContain("Q");
  });
});

describe("newShapeElement", () => {
  it("centers the preset on the page", () => {
    const el = newShapeElement("heart", 800);
    expect(el.type).toBe("shape");
    expect(el.shapeKind).toBe("heart");
    expect(el.x + el.w / 2).toBeCloseTo(300);
    expect(el.y + el.h / 2).toBeCloseTo(400);
  });

  it("treats line as stroke-only", () => {
    expect(isStrokeOnlyShape("line")).toBe(true);
    expect(isStrokeOnlyShape("rect")).toBe(false);
    expect(newShapeElement("line", 800).fill).toBe("transparent");
  });
});
