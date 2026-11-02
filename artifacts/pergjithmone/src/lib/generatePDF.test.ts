import { describe, it, expect } from "vitest";
import { pdfPageLayout } from "./generatePDF";

describe("pdfPageLayout", () => {
  it("exports a square page for a 21×21 cm book", () => {
    const l = pdfPageLayout({ widthCm: 21, heightCm: 21 });
    expect(l.pdfWMm).toBe(210);
    expect(l.pdfHMm).toBe(210);
    expect(l.canvasH).toBe(600);
    expect(l.outW).toBe(l.outH);
    expect(l.orientation).toBe("portrait");
  });

  it("exports 210×280 mm for a 21×28 cm book without stretching the raster", () => {
    const l = pdfPageLayout({ widthCm: 21, heightCm: 28 });
    expect(l.pdfWMm).toBe(210);
    expect(l.pdfHMm).toBe(280);
    expect(l.canvasH).toBe(800);
    expect(l.outH / l.outW).toBeCloseTo(280 / 210, 5);
    expect(l.orientation).toBe("portrait");
  });

  it("exports landscape pages for a 21×14 cm book", () => {
    const l = pdfPageLayout({ widthCm: 21, heightCm: 14 });
    expect(l.pdfWMm).toBe(210);
    expect(l.pdfHMm).toBe(140);
    expect(l.canvasH).toBe(400);
    expect(l.outW).toBeGreaterThan(l.outH);
    expect(l.orientation).toBe("landscape");
  });
});
