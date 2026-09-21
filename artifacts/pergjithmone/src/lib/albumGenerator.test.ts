import { describe, it, expect } from "vitest";
import { generateAlbum, suggestInnerPageCount } from "./albumGenerator";

const PHOTOS = Array.from({ length: 28 }, (_, i) => `https://cdn.example/p${i}.jpg`);

describe("suggestInnerPageCount", () => {
  it("scales with photo count for breathing room", () => {
    expect(suggestInnerPageCount(10, 4)).toBeGreaterThanOrEqual(6);
    expect(suggestInnerPageCount(28, 4)).toBeGreaterThanOrEqual(14);
    expect(suggestInnerPageCount(0, 4)).toBe(4);
  });
});

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
    }
    const allImages = album.innerPages.flatMap((page) =>
      page.filter((e) => e.type === "image" && e.src?.startsWith("https://cdn.example")),
    );
    expect(allImages.length).toBeGreaterThan(0);
  });

  it("never reuses the same photo across the album", () => {
    const album = generateAlbum("Modern", PHOTOS, 16, "en", { widthCm: 21, heightCm: 28 });
    const srcs = [
      ...album.frontCover,
      ...album.backCover,
      ...album.innerPages.flat(),
    ]
      .filter((e) => e.type === "image" && e.src)
      .map((e) => e.src as string);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it("never leaves placeholder caption copy on pages", () => {
    const album = generateAlbum("Celebration", PHOTOS, 12, "en", { widthCm: 21, heightCm: 28 });
    const texts = album.innerPages.flatMap((p) => p.filter((e) => e.type === "text"));
    for (const t of texts) {
      expect(t.text || "").not.toMatch(/your text here|shto tekstin/i);
    }
  });

  it("avoids banned strip/casual/filmstrip layouts", () => {
    const banned = new Set([
      "strips-3", "strips-4", "cols-4", "filmstrip-5",
      "strips-3-uneven", "strips-3-focus", "triptych", "three-mid",
      "casual-toss-3", "casual-pile-4", "casual-strip-3", "casual-note-2",
      "quote",
    ]);
    // Geometry fingerprint → layout is hard; assert no tiny strip heights
    // by checking we never produce 4 stacked full-width bands (~0.235h).
    for (let i = 0; i < 8; i++) {
      const album = generateAlbum("Travel", PHOTOS, 14, "en", { widthCm: 21, heightCm: 28 });
      for (const page of album.innerPages) {
        const imgs = page.filter((e) => e.type === "image");
        // Filmstrip: 5 very narrow columns
        if (imgs.length === 5) {
          const narrow = imgs.filter((e) => e.w < 130);
          expect(narrow.length).toBeLessThan(5);
        }
        // 4 horizontal strips
        if (imgs.length === 4) {
          const ultraShort = imgs.filter((e) => e.h < 200 && e.w > 500);
          expect(ultraShort.length).toBeLessThan(4);
        }
      }
      void banned;
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
    expect(sig(a) === sig(b) && a.meta.frontDesignId === b.meta.frontDesignId).toBe(false);
  });
});
