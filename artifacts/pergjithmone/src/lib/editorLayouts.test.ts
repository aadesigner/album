import { describe, it, expect } from "vitest";
import { DESIGN_W } from "./designs";
import {
  mergeEditorLayouts,
  parseAdminLayoutZones,
  layoutZoneCanvasRect,
  layoutZoneToElement,
  layoutTextFontSize,
} from "./editorLayouts";

const twoUp = JSON.stringify({
  category: "2 Photos",
  cells: [
    { x: 0, y: 0, w: 0.48, h: 1, type: "photo" },
    { x: 0.52, y: 0, w: 0.48, h: 1, type: "photo" },
  ],
});

describe("mergeEditorLayouts", () => {
  it("shows a new active custom layout in the customer picker", () => {
    const merged = mergeEditorLayouts([
      {
        slug: "my-two-up",
        nameAl: "Dy foto të mia",
        nameEn: "My two-up",
        gridDefinitionJson: twoUp,
        isActive: true,
      },
    ]);
    const custom = merged.find((l) => l.id === "my-two-up");
    expect(custom).toBeTruthy();
    expect(custom?.category).toBe("2 Photos");
    expect(custom?.zones).toHaveLength(2);
    expect(custom?.label.en).toBe("My two-up");
  });

  it("still shows a layout that mixes a photo slot with a caption", () => {
    const merged = mergeEditorLayouts([
      {
        slug: "photo-caption",
        nameAl: "Foto me tekst",
        nameEn: "Photo with caption",
        gridDefinitionJson: JSON.stringify({
          cells: [
            { x: 0.08, y: 0.06, w: 0.84, h: 0.72, type: "photo" },
            { x: 0.08, y: 0.82, w: 0.84, h: 0.12, type: "text" },
          ],
        }),
        isActive: true,
      },
    ]);
    const custom = merged.find((l) => l.id === "photo-caption");
    expect(custom).toBeTruthy();
    expect(custom?.zones.map((z) => z.type)).toEqual(["photo", "text"]);
  });

  it("hides inactive layouts", () => {
    const merged = mergeEditorLayouts([
      {
        slug: "hidden-grid",
        nameAl: "Fshehur",
        nameEn: "Hidden",
        gridDefinitionJson: twoUp,
        isActive: false,
      },
    ]);
    expect(merged.some((l) => l.id === "hidden-grid")).toBe(false);
  });
});

describe("parseAdminLayoutZones", () => {
  it("keeps rotation on photo cells", () => {
    const zones = parseAdminLayoutZones(JSON.stringify({
      cells: [{ x: 0.1, y: 0.1, w: 0.4, h: 0.4, type: "photo", rotation: 12 }],
    }));
    expect(zones[0].rotation).toBe(12);
  });

  it("keeps text cells as text, including string rotation", () => {
    const zones = parseAdminLayoutZones(JSON.stringify({
      cells: [
        { x: 0.08, y: 0.06, w: 0.84, h: 0.72, type: "photo" },
        { x: 0.08, y: 0.82, w: 0.84, h: 0.12, type: "Text", rotation: "8" },
      ],
    }));
    expect(zones.map((z) => z.type)).toEqual(["photo", "text"]);
    expect(zones[1].rotation).toBe(8);
  });
});

describe("layoutZoneToElement", () => {
  const canvasH = 800;

  it("turns a photo cell into a placeholder at canvas coordinates", () => {
    const el = layoutZoneToElement(
      { x: 0.1, y: 0.2, w: 0.5, h: 0.4, type: "photo" },
      canvasH,
      { id: "p1" },
    );
    expect(el).toMatchObject({
      id: "p1",
      type: "placeholder",
      x: 0.1 * DESIGN_W,
      y: 0.2 * canvasH,
      w: 0.5 * DESIGN_W,
      h: 0.4 * canvasH,
      rotation: 0,
    });
  });

  it("turns a text cell into editable centered copy that fits the box", () => {
    const z = { x: 0.08, y: 0.82, w: 0.84, h: 0.12, type: "text" };
    const el = layoutZoneToElement(z, canvasH, { id: "t1", lang: "en" });
    expect(el.type).toBe("text");
    expect(el.text).toBe("Your text here...");
    expect(el.align).toBe("center");
    expect(el.verticalAlign).toBe("middle");
    expect(el.fontSize).toBe(layoutTextFontSize(z.h * canvasH));
    expect(el.fontSize).toBeGreaterThanOrEqual(14);
    expect((el.fontSize || 0) * 1.2 + 12).toBeLessThanOrEqual(z.h * canvasH + 0.5);
  });

  it("uses Albanian placeholder copy", () => {
    const el = layoutZoneToElement(
      { x: 0, y: 0, w: 1, h: 0.2, type: "text" },
      canvasH,
      { id: "t2", lang: "sq" },
    );
    expect(el.text).toBe("Shto tekstin tënd...");
  });

  it("converts builder center-rotation to Konva top-left origin", () => {
    const z = { x: 0.1, y: 0.1, w: 0.4, h: 0.4, type: "photo", rotation: 90 };
    const rect = layoutZoneCanvasRect(z, canvasH);
    const w = 0.4 * DESIGN_W;
    const h = 0.4 * canvasH;
    const x0 = 0.1 * DESIGN_W;
    const y0 = 0.1 * canvasH;
    expect(rect.rotation).toBe(90);
    expect(rect.x).toBeCloseTo(x0 + w / 2 + h / 2, 5);
    expect(rect.y).toBeCloseTo(y0 + h / 2 - w / 2, 5);
    expect(rect.w).toBe(w);
    expect(rect.h).toBe(h);
  });
});
