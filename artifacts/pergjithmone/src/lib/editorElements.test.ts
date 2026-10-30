import { describe, it, expect } from "vitest";
import { parseEditorElements, makeStickerElement, EDITOR_ELEMENTS_MAX, STICKER_SIZE } from "./editorElements";
import { DESIGN_W } from "./designs";

describe("parseEditorElements", () => {
  it("keeps png/jpg catalog entries", () => {
    expect(parseEditorElements([
      { id: "a", src: "/uploads/heart.png", name: "Heart" },
      { id: "b", src: "https://cdn.example/leaf.jpg" },
    ])).toEqual([
      { id: "a", src: "/uploads/heart.png", name: "Heart" },
      { id: "b", src: "https://cdn.example/leaf.jpg", name: "" },
    ]);
  });

  it("drops javascript and data URLs", () => {
    expect(parseEditorElements([
      { src: "javascript:alert(1)" },
      { src: "data:image/png;base64,abc" },
    ])).toEqual([]);
  });

  it("caps the catalog", () => {
    const raw = Array.from({ length: EDITOR_ELEMENTS_MAX + 20 }, (_, i) => ({
      id: `el-${i}`,
      src: `/uploads/${i}.png`,
    }));
    expect(parseEditorElements(raw)).toHaveLength(EDITOR_ELEMENTS_MAX);
  });
});

describe("makeStickerElement", () => {
  it("places a contain-fit sticker near canvas center", () => {
    const el = makeStickerElement("/uploads/bow.png", 800);
    expect(el.type).toBe("image");
    expect(el.sticker).toBe(true);
    expect(el.objectFit).toBe("contain");
    expect(el.w).toBe(STICKER_SIZE);
    expect(el.h).toBe(STICKER_SIZE);
    expect(el.x).toBe(Math.round((DESIGN_W - STICKER_SIZE) / 2));
  });
});
