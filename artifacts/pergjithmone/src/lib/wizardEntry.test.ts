import { describe, it, expect } from "vitest";
import { wizardEntryFromSearch } from "./wizardEntry";

const CATS = [
  { id: 1, slug: "dasme", nameAl: "Dasmë", nameEn: "Wedding" },
  { id: 2, slug: "udhetime", nameAl: "Udhëtime", nameEn: "Travel" },
];

const DESIGNS = [
  { id: "cream-names", category: "Wedding" },
  { id: "paris-pink", category: "Travel" },
];

describe("wizardEntryFromSearch", () => {
  it("starts on categories with no query", () => {
    expect(wizardEntryFromSearch({ categories: CATS, designs: DESIGNS })).toEqual({
      step: 1,
      categoryId: null,
      designId: null,
    });
  });

  it("opens the style step from a homepage category card", () => {
    expect(wizardEntryFromSearch({
      categorySlug: "dasme",
      categories: CATS,
      designs: DESIGNS,
    })).toEqual({
      step: 2,
      categoryId: 1,
      designId: null,
    });
  });

  it("skips to size when the album starter already picked a cover", () => {
    expect(wizardEntryFromSearch({
      categorySlug: "dasme",
      designId: "cream-names",
      categories: CATS,
      designs: DESIGNS,
    })).toEqual({
      step: 3,
      categoryId: 1,
      designId: "cream-names",
    });
  });

  it("still opens size if only the design id is present", () => {
    expect(wizardEntryFromSearch({
      designId: "paris-pink",
      categories: CATS,
      designs: DESIGNS,
    })).toEqual({
      step: 3,
      categoryId: 2,
      designId: "paris-pink",
    });
  });

  it("ignores unknown design ids and stays on categories", () => {
    expect(wizardEntryFromSearch({
      designId: "not-a-real-cover",
      categories: CATS,
      designs: DESIGNS,
    }).step).toBe(1);
  });
});
