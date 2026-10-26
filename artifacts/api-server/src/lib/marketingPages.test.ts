import { describe, it, expect } from "vitest";
import {
  isPageSlug, pageSettingKey, sanitizePageContent,
  parseStoredPageContent, stringifyPageContent,
} from "./marketingPages";

describe("marketingPages", () => {
  it("maps slugs to setting keys", () => {
    expect(isPageSlug("home")).toBe(true);
    expect(isPageSlug("editor")).toBe(false);
    expect(pageSettingKey("how-it-works")).toBe("page_content_how_it_works");
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
});
