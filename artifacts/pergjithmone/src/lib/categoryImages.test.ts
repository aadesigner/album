import { describe, it, expect } from "vitest";
import { getCategoryImage, resolvePublicImageSrc, CAT_IMG_BY_SLUG } from "./categoryImages";

describe("resolvePublicImageSrc", () => {
  it("turns localhost upload URLs into same-origin paths for phones", () => {
    expect(resolvePublicImageSrc("http://localhost:8787/api/uploads/files/a.jpg")).toBe(
      "/api/uploads/files/a.jpg",
    );
    expect(resolvePublicImageSrc("http://127.0.0.1:4173/api/uploads/files/a.jpg")).toBe(
      "/api/uploads/files/a.jpg",
    );
  });

  it("prefixes legacy /uploads paths with /api", () => {
    expect(resolvePublicImageSrc("/uploads/files/a.jpg")).toBe("/api/uploads/files/a.jpg");
  });

  it("keeps Unsplash and relative API urls", () => {
    expect(resolvePublicImageSrc("/api/uploads/files/a.jpg")).toBe("/api/uploads/files/a.jpg");
    expect(resolvePublicImageSrc("https://images.unsplash.com/photo-x")).toBe(
      "https://images.unsplash.com/photo-x",
    );
  });
});

describe("getCategoryImage", () => {
  it("prefers a stored cover, then slug, then name", () => {
    expect(getCategoryImage("Dasmë", "/api/uploads/files/x.jpg", "dasme")).toBe(
      "/api/uploads/files/x.jpg",
    );
    expect(getCategoryImage("Dasmë", null, "dasme")).toBe(CAT_IMG_BY_SLUG.dasme);
  });
});
