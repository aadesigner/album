import { describe, it, expect } from "vitest";
import { generateAlbum } from "./albumGenerator";

const PHOTOS = Array.from({ length: 28 }, (_, i) => `https://cdn.example/p${i}.jpg`);

describe("generateAlbum", () => {
  it("always builds front and back covers for a category", () => {
    const album = generateAlbum("Wedding", PHOTOS, 8, "en", { widthCm: 21, heightCm: 28 });
    expect(album.frontCover.length).toBeGreaterThan(0);
    expect(album.backCover.length).toBeGreaterThan(0);
    expect(album.insideCover.some((e) => e.type === "background" && e.bgColor === "#FFFFFF")).toBe(true);
    expect(album.innerPages).toHaveLength(8);
    expect(album.meta.categoryKey).toBe("Wedding");
  });

  it("fills inner pages with user photos on white paper", () => {
    const album = generateAlbum("Travel", PHOTOS, 10, "sq", { widthCm: 21, heightCm: 28 });
    for (const page of album.innerPages) {
      const bg = page.find((e) => e.type === "background");
      expect(bg?.bgColor).toBe("#FFFFFF");
      const images = page.filter((e) => e.type === "image" && e.src?.startsWith("https://cdn.example"));
      expect(images.length).toBeGreaterThan(0);
    }
  });

  it("produces different layouts across runs", () => {
    const a = generateAlbum("Celebration", PHOTOS, 12, "en", { widthCm: 21, heightCm: 28 });
    const b = generateAlbum("Celebration", PHOTOS, 12, "en", { widthCm: 21, heightCm: 28 });
    const sig = (album: typeof a) =>
      album.innerPages
        .map((page) =>
          page
            .filter((e) => e.type === "image" || e.type === "placeholder")
            .map((e) => `${e.x},${e.y},${e.w},${e.h}`)
            .join("|"),
        )
        .join("::");
    // Extremely unlikely to be identical with weighted random layouts.
    expect(sig(a) === sig(b) && a.meta.frontDesignId === b.meta.frontDesignId).toBe(false);
  });
});
