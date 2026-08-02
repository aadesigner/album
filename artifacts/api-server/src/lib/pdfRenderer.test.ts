import { describe, it, expect, afterEach } from "vitest";
import os from "os";
import path from "path";
import fs from "fs";
import { PDFDocument } from "pdf-lib";
import { renderProjectPdf, type PdfRenderPage } from "./pdfRenderer";

// ── helpers ───────────────────────────────────────────────────────────────────

const POINTS_PER_CM = 72 / 2.54; // ≈ 28.346

/** A single blank page with only a background element — enough for a render. */
function blankPage(): PdfRenderPage {
  return {
    role: "content",
    pageNumber: 1,
    elements: [
      { id: "bg", type: "background", x: 0, y: 0, w: 600, h: 800, rotation: 0, bgColor: "#FFFFFF" },
    ],
  };
}

const TMP_DIR = os.tmpdir();
const outputFiles: string[] = [];

function tmpPdf(label: string): string {
  const p = path.join(TMP_DIR, `test-pdf-${label}-${Date.now()}.pdf`);
  outputFiles.push(p);
  return p;
}

afterEach(() => {
  for (const f of outputFiles.splice(0)) {
    try { fs.unlinkSync(f); } catch { /* best-effort */ }
  }
});

// ── PDF page dimension assertions ─────────────────────────────────────────────

describe("renderProjectPdf – page dimensions", () => {
  it("produces 595×595 pt pages for a square book (21×21 cm)", async () => {
    const output = tmpPdf("square");
    await renderProjectPdf({
      pages: [blankPage()],
      bookWidthCm: 21,
      bookHeightCm: 21,
      uploadsDir: TMP_DIR,
      outputPath: output,
    });

    const bytes = fs.readFileSync(output);
    const doc = await PDFDocument.load(bytes);
    const pages = doc.getPages();
    expect(pages).toHaveLength(1);

    const { width, height } = pages[0].getSize();
    const expectedPts = Math.round(21 * POINTS_PER_CM * 100) / 100;

    // Allow ±1 pt rounding tolerance
    expect(width).toBeCloseTo(expectedPts, 0);
    expect(height).toBeCloseTo(expectedPts, 0);

    // Assert the ratio is truly square (1:1) regardless of rounding
    expect(width / height).toBeCloseTo(1, 3);
  }, 30_000);

  it("produces ~595×794 pt pages for a portrait book (21×28 cm)", async () => {
    const output = tmpPdf("portrait");
    await renderProjectPdf({
      pages: [blankPage()],
      bookWidthCm: 21,
      bookHeightCm: 28,
      uploadsDir: TMP_DIR,
      outputPath: output,
    });

    const bytes = fs.readFileSync(output);
    const doc = await PDFDocument.load(bytes);
    const pages = doc.getPages();
    expect(pages).toHaveLength(1);

    const { width, height } = pages[0].getSize();
    const expectedW = 21 * POINTS_PER_CM;
    const expectedH = 28 * POINTS_PER_CM;

    expect(width).toBeCloseTo(expectedW, 0);
    expect(height).toBeCloseTo(expectedH, 0);

    // Ratio must be 3:4
    expect(width / height).toBeCloseTo(21 / 28, 3);
  }, 30_000);

  it("renders all non-locked pages and skips locked_left/locked_right roles", async () => {
    const output = tmpPdf("multi");
    const pages: PdfRenderPage[] = [
      { role: "locked_left",  pageNumber: 0, elements: [] },
      { role: "content",      pageNumber: 1, elements: [{ id: "bg", type: "background", x: 0, y: 0, w: 600, h: 800, rotation: 0, bgColor: "#FFF" }] },
      { role: "content",      pageNumber: 2, elements: [{ id: "bg", type: "background", x: 0, y: 0, w: 600, h: 800, rotation: 0, bgColor: "#EEE" }] },
      { role: "locked_right", pageNumber: 3, elements: [] },
    ];

    await renderProjectPdf({
      pages,
      bookWidthCm: 21,
      bookHeightCm: 28,
      uploadsDir: TMP_DIR,
      outputPath: output,
    });

    const bytes = fs.readFileSync(output);
    const doc = await PDFDocument.load(bytes);
    // Only the 2 content pages should appear in the PDF
    expect(doc.getPages()).toHaveLength(2);
  }, 30_000);
});
