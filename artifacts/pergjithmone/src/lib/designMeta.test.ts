import { describe, it, expect } from "vitest";
import {
  resolveDesignCategory,
  resolveDesignCategoryFromQuery,
  matchDbCategory,
} from "./designMeta";

const CATS = [
  { id: 1, slug: "dasme", nameAl: "Dasmë", nameEn: "Wedding" },
  { id: 2, slug: "udhetime", nameAl: "Udhëtime", nameEn: "Travel" },
];

const DESIGNS = [
  { id: "cream-names", category: "Wedding" },
  { id: "paris-pink", category: "Travel" },
];

describe("resolveDesignCategoryFromQuery", () => {
  it("maps homepage Dasmë slug dasme → Wedding", () => {
    expect(resolveDesignCategoryFromQuery("dasme", null, DESIGNS)).toBe("Wedding");
  });

  it("maps dasma / Dasmë aliases → Wedding", () => {
    expect(resolveDesignCategoryFromQuery("dasma", null, DESIGNS)).toBe("Wedding");
    expect(resolveDesignCategoryFromQuery("Dasmë", null, DESIGNS)).toBe("Wedding");
  });

  it("uses the design id when the DB slug is missing", () => {
    expect(resolveDesignCategoryFromQuery("", "cream-names", DESIGNS)).toBe("Wedding");
  });
});

describe("matchDbCategory", () => {
  it("matches dasme even when comparing against Dasmë", () => {
    expect(matchDbCategory(CATS, "dasme")?.id).toBe(1);
    expect(matchDbCategory(CATS, "dasma")?.id).toBe(1);
  });

  it("matches from a design catalog key when the slug is unknown", () => {
    expect(matchDbCategory(CATS, "nope", "Wedding")?.id).toBe(1);
  });
});

describe("resolveDesignCategory", () => {
  it("reads slug, Albanian, or English", () => {
    expect(resolveDesignCategory(CATS[0])).toBe("Wedding");
    expect(resolveDesignCategory({ nameAl: "Dasmë" })).toBe("Wedding");
    expect(resolveDesignCategory({ nameEn: "Wedding" })).toBe("Wedding");
  });
});
