import { describe, it, expect } from "vitest";
import {
  isEmptyPageContent,
  isPageContentSettingKey,
  isPageSlug,
  overlayStoredPageContent,
  pageSettingKey,
  parseStoredPageContent,
  sanitizePageContent,
  stringifyPageContent,
} from "./marketingPages";

describe("marketingPages", () => {
  it("maps slugs to setting keys", () => {
    expect(isPageSlug("home")).toBe(true);
    expect(isPageSlug("album-ai")).toBe(true);
    expect(isPageSlug("editor")).toBe(false);
    expect(pageSettingKey("how-it-works")).toBe("page_content_how_it_works");
    expect(pageSettingKey("album-ai")).toBe("page_content_album_ai");
  });

  it("sanitizes and parses stored JSON", () => {
    expect(parseStoredPageContent("not-json")).toEqual({});
    const stored = stringifyPageContent({ hero: { headline: { sq: "A", en: "B" } } });
    expect(parseStoredPageContent(stored)).toEqual({
      hero: { headline: { sq: "A", en: "B" } },
    });
  });

  it("drops prototype pollution keys", () => {
    const dirty = JSON.parse('{"ok":1,"__proto__":{"x":1}}');
    const clean = sanitizePageContent(dirty) as Record<string, unknown>;
    expect(clean.ok).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(clean, "__proto__")).toBe(false);
  });

  it("rejects oversized stringify", () => {
    expect(() => stringifyPageContent("x".repeat(500_000))).toThrow(/too large/i);
  });

  it("identifies page_content setting keys", () => {
    expect(isPageContentSettingKey("page_content_home")).toBe(true);
    expect(isPageContentSettingKey("whatsapp_number")).toBe(false);
    expect(isEmptyPageContent({})).toBe(true);
    expect(isEmptyPageContent({ hero: { headline: { sq: "A", en: "B" } } })).toBe(false);
  });

  it("overlays a save without wiping earlier branches or blank bilingual copy", () => {
    const previous = {
      hero: { headline: { sq: "Saved SQ", en: "Saved EN" }, cta: { sq: "Fillo", en: "Start" } },
      photo: { src: "/api/uploads/files/keep.jpg" },
      steps: [{ title: { sq: "1", en: "one" } }],
    };
    const incoming = {
      hero: { headline: { sq: "New SQ", en: "New EN" } },
      photo: { src: "   " },
      steps: [],
    };
    const merged = overlayStoredPageContent(previous, incoming);
    expect((merged.hero as any).headline).toEqual({ sq: "New SQ", en: "New EN" });
    expect((merged.hero as any).cta).toEqual({ sq: "Fillo", en: "Start" });
    expect((merged.photo as any).src).toBe("/api/uploads/files/keep.jpg");
    expect(merged.steps).toEqual([{ title: { sq: "1", en: "one" } }]);
  });

  it("keeps previous bilingual text when the incoming pair is blank", () => {
    const merged = overlayStoredPageContent(
      { title: { sq: "Keep", en: "Keep EN" } },
      { title: { sq: "", en: "  " } },
    );
    expect(merged.title).toEqual({ sq: "Keep", en: "Keep EN" });
  });
});
