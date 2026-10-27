import { describe, it, expect } from "vitest";
import {
  getCategoryImage,
  getCatalogCover,
  resolvePublicImageSrc,
  isUnusableCoverSrc,
  CAT_IMG_BY_SLUG,
} from "./categoryImages";

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

  it("keeps relative API urls and upgrades http remotes", () => {
    expect(resolvePublicImageSrc("/api/uploads/files/a.jpg")).toBe("/api/uploads/files/a.jpg");
    expect(resolvePublicImageSrc("http://cdn.example.com/a.jpg")).toBe(
      "https://cdn.example.com/a.jpg",
    );
  });

  it("adds a jpeg hint to Unsplash urls", () => {
    const out = resolvePublicImageSrc("https://images.unsplash.com/photo-x?w=700");
    expect(out).toContain("fm=jpg");
    expect(out).toContain("images.unsplash.com");
  });
});

describe("isUnusableCoverSrc", () => {
  it("rejects localhost and blob urls that phones cannot load", () => {
    expect(isUnusableCoverSrc("http://localhost:8787/api/uploads/files/a.jpg")).toBe(true);
    expect(isUnusableCoverSrc("blob:https://x/1")).toBe(true);
    expect(isUnusableCoverSrc("/api/uploads/files/a.jpg")).toBe(false);
  });
});

describe("getCategoryImage", () => {
  it("prefers a stored cover, then slug, then name", () => {
    expect(getCategoryImage("Dasmë", "/api/uploads/files/x.jpg", "dasme")).toBe(
      "/api/uploads/files/x.jpg",
    );
    expect(getCategoryImage("Dasmë", "http://localhost:8787/api/uploads/x.jpg", "dasme")).toBe(
      getCatalogCover("Dasmë", "dasme"),
    );
    expect(getCategoryImage("Dasmë", null, "dasme")).toBe(getCatalogCover("Dasmë", "dasme"));
    expect(getCatalogCover("Dasmë", "dasme")).toContain("fm=jpg");
    expect(CAT_IMG_BY_SLUG.dasme).toContain("photo-1519225421980");
  });
});
