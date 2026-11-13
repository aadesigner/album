import { describe, it, expect } from "vitest";
import {
  generateAlbum,
  suggestInnerPageCount,
  planNarrativeSlots,
  buildNarrativePage,
} from "./albumGenerator";
import { CATEGORY_NARRATIVES, narrativesFor, captionsFor } from "./albumNarratives";

const CATS = Object.keys(CATEGORY_NARRATIVES);
const SIZES = [
  { widthCm: 21, heightCm: 28 },
  { widthCm: 21, heightCm: 21 },
  { widthCm: 30, heightCm: 30 },
];

describe("generateAlbum stress / QA", () => {
  it("never throws across categories, langs, photo counts, and sizes", () => {
    const counts = [0, 1, 2, 3, 5, 8, 12, 20, 32, 48, 64];
    let maxMs = 0;
    for (const cat of [...CATS, "UnknownCat", ""]) {
      for (const lang of ["sq", "en"] as const) {
        for (const n of counts) {
          for (const sz of SIZES) {
            const photos = Array.from({ length: n }, (_, i) => `https://cdn.example/p${i}.jpg`);
            const pages = suggestInnerPageCount(n, 4);
            const t0 = performance.now();
            const album = generateAlbum(cat || "Modern", photos, pages, lang, sz);
            maxMs = Math.max(maxMs, performance.now() - t0);
            expect(album.innerPages).toHaveLength(pages);
            expect(album.frontCover.length).toBeGreaterThan(0);
            expect(album.backCover.length).toBeGreaterThan(0);
            for (const page of album.innerPages) {
              expect(page.some((e) => e.type === "background")).toBe(true);
              for (const e of page) {
                for (const k of ["x", "y", "w", "h"] as const) {
                  if (e[k] != null) expect(Number.isFinite(e[k])).toBe(true);
                }
              }
            }
          }
        }
      }
    }
    // Pure layout planning should stay snappy even for large grids.
    expect(maxMs).toBeLessThan(250);
  });

  it("keeps narrative slots off opener/closer for many page counts", () => {
    for (let p = 0; p < 48; p++) {
      for (let t = 0; t < 12; t++) {
        const slots = planNarrativeSlots(p);
        expect(slots.has(0)).toBe(false);
        if (p > 0) expect(slots.has(p - 1)).toBe(false);
        for (const i of slots) {
          expect(i).toBeGreaterThan(0);
          expect(i).toBeLessThan(p - 1);
        }
      }
    }
  });

  it("has narrative + caption copy for every shipped category", () => {
    for (const cat of CATS) {
      expect(narrativesFor(cat, "sq").length).toBeGreaterThan(0);
      expect(narrativesFor(cat, "en").length).toBeGreaterThan(0);
      expect(captionsFor(cat, "sq").length).toBeGreaterThan(0);
      for (const piece of narrativesFor(cat, "sq")) {
        expect(piece.headline.trim().length).toBeGreaterThan(2);
        expect(piece.body.trim().length).toBeGreaterThan(20);
        expect(piece.body).not.toMatch(/as an AI|delve|tapestry|in today's fast-paced/i);
      }
    }
  });

  it("builds all narrative styles without empty/invalid geometry", () => {
    const piece = narrativesFor("Wedding", "sq")[0];
    for (const style of [0, 1, 2] as const) {
      for (const h of [600, 800, 900]) {
        const els = buildNarrativePage(piece, h, "#FFFFFF", "Wedding", style);
        expect(els[0]?.type).toBe("background");
        expect(els.some((e) => e.type === "text" && e.text === piece.headline)).toBe(true);
        expect(els.every((e) => e.w > 0 && e.h > 0)).toBe(true);
      }
    }
  });

  it("does not create blank paper-only pages when photos exist", () => {
    const photos = Array.from({ length: 24 }, (_, i) => `https://cdn.example/q${i}.jpg`);
    for (const cat of ["Wedding", "Travel", "Friendship"]) {
      const pages = suggestInnerPageCount(24, 10);
      const album = generateAlbum(cat, photos, pages, "sq", { widthCm: 21, heightCm: 28 });
      for (const page of album.innerPages) {
        const imgs = page.filter((e) => e.type === "image" && e.src);
        const texts = page.filter((e) => e.type === "text" && (e.text || "").trim());
        expect(imgs.length + texts.length).toBeGreaterThan(0);
      }
    }
  });

  it("handles tiny albums without crashing", () => {
    const album = generateAlbum("Wedding", ["https://cdn.example/a.jpg"], 4, "sq", {
      widthCm: 21,
      heightCm: 28,
    });
    expect(album.innerPages).toHaveLength(4);
    expect(planNarrativeSlots(4).size).toBe(0);
  });
});
