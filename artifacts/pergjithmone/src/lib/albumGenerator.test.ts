import { describe, it, expect } from "vitest";
import { generateAlbum, suggestInnerPageCount, planNarrativeSlots } from "./albumGenerator";
import { narrativesFor } from "./albumNarratives";

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

  it("prefers unique photos when the page budget fits", () => {
    const album = generateAlbum("Modern", PHOTOS, 12, "en", { widthCm: 21, heightCm: 28 });
    const srcs = [
      ...album.frontCover,
      ...album.backCover,
      ...album.innerPages.flat(),
    ]
      .filter((e) => e.type === "image" && e.src)
      .map((e) => e.src as string);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it("fills photo pages with images and inserts category dedication pages", () => {
    const album = generateAlbum("Wedding", PHOTOS, 30, "en", { widthCm: 21, heightCm: 28 });
    expect(album.innerPages).toHaveLength(30);
    let photoPages = 0;
    let storyPages = 0;
    for (const page of album.innerPages) {
      const imgs = page.filter((e) => e.type === "image" && e.src);
      const texts = page.filter((e) => e.type === "text" && (e.text || "").trim());
      if (imgs.length >= 1) {
        photoPages += 1;
      } else if (texts.length >= 2) {
        storyPages += 1;
      } else {
        expect(imgs.length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(photoPages).toBeGreaterThan(10);
    expect(storyPages).toBeGreaterThanOrEqual(2);
    expect(album.meta.frontDesignId).not.toBe("photo-front");
    expect(album.meta.backDesignId).toBe(album.meta.frontDesignId);
  });

  it("uses authentic Albanian headlines on dedication pages", () => {
    const album = generateAlbum("Wedding", PHOTOS, 16, "sq", { widthCm: 21, heightCm: 28 });
    const headlines = album.innerPages
      .filter((page) => !page.some((e) => e.type === "image" && e.src))
      .flatMap((page) => page.filter((e) => e.type === "text"))
      .map((e) => (e.text || "").trim());
    expect(headlines.some((t) => /dashuria|ne dy|përjetë|perjete/i.test(t))).toBe(true);
    expect(headlines.join(" ")).not.toMatch(/as an ai|delve|tapestry|in today's fast/i);
  });

  it("planNarrativeSlots skips opener and closer", () => {
    const slots = planNarrativeSlots(12);
    expect(slots.has(0)).toBe(false);
    expect(slots.has(11)).toBe(false);
    expect(slots.size).toBeGreaterThanOrEqual(1);
  });

  it("ships category narrative copy for Wedding and Travel", () => {
    expect(narrativesFor("Wedding", "sq").length).toBeGreaterThan(0);
    expect(narrativesFor("Travel", "sq")[0].headline.length).toBeGreaterThan(3);
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
      "strips-3-uneven", "strips-3-focus", "three-mid",
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

  it("keeps upload order and uses first photo on the front cover", () => {
    const ordered = Array.from({ length: 12 }, (_, i) => `https://cdn.example/seq-${i}.jpg`);
    const album = generateAlbum("Wedding", ordered, 8, "en", { widthCm: 21, heightCm: 28 });

    const coverSrcs = (page: typeof album.frontCover) =>
      page.filter((e) => (e.type === "image" || e.type === "background") && e.src).map((e) => e.src as string);

    expect(coverSrcs(album.frontCover).some((src) => src.includes("seq-0.jpg"))).toBe(true);
    // Photo/city backs are a static full-color plate; text-only wedding backs may
    // still bake the last upload as wallpaper — either way the first photo is front.
    const backHasLast = coverSrcs(album.backCover).some((src) => src.includes("seq-11.jpg"));
    const backIsSolid = album.backCover.every((e) => e.type === "background" && !e.src);
    expect(backHasLast || backIsSolid).toBe(true);

    const innerSrcs = album.innerPages.flatMap((page) =>
      page.filter((e) => e.type === "image" && e.src).map((e) => e.src as string),
    );
    const indexes = innerSrcs.map((src) => ordered.indexOf(src));
    expect(indexes.every((i) => i > 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });

  it("keeps travel/city backs as a static full-color plate on square albums", () => {
    const album = generateAlbum("Travel", PHOTOS, 8, "en", { widthCm: 21, heightCm: 21 });
    const bg = album.backCover.find((e) => e.type === "background");
    expect(bg?.bgColor).toBeTruthy();
    expect(album.backCover.some((e) => e.type === "image" || e.type === "shape")).toBe(false);
    expect(bg?.w).toBe(600);
    expect(bg?.h).toBe(600);
  });

  it("opens on a single-photo page when photos remain", () => {
    const album = generateAlbum("Wedding", PHOTOS, 10, "en", { widthCm: 21, heightCm: 28 });
    const firstImages = album.innerPages[0].filter((e) => e.type === "image");
    expect(firstImages).toHaveLength(1);
  });
});
