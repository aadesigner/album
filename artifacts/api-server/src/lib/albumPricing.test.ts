import { describe, it, expect } from "vitest";
import { albumPriceBreakdown, calcAlbumPriceLek } from "./albumPricing";

describe("calcAlbumPriceLek", () => {
  it("charges base only within included pages", () => {
    expect(calcAlbumPriceLek(30, 3000, 30, 50)).toBe(3000);
    expect(calcAlbumPriceLek(24, 3000, 30, 50)).toBe(3000);
  });

  it("adds per extra page (not per spread)", () => {
    // 6 extra pages × 50 = 300
    expect(calcAlbumPriceLek(36, 3000, 30, 50)).toBe(3300);
    // portrait: 4 extra × 75 = 300
    expect(calcAlbumPriceLek(34, 3500, 30, 75)).toBe(3800);
  });
});

describe("albumPriceBreakdown", () => {
  it("exposes a clear COD total", () => {
    const b = albumPriceBreakdown(36, 3000, 30, 50);
    expect(b.extraPages).toBe(6);
    expect(b.extraTotalLek).toBe(300);
    expect(b.totalPriceLek).toBe(3300);
  });
});
