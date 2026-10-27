import { describe, it, expect } from "vitest";
import { mergeEditorLayouts, parseAdminLayoutZones } from "./editorLayouts";

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
    expect(merged.some((l) => l.id === "photo-caption")).toBe(true);
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
});
