import { describe, it, expect, afterEach } from "vitest";
import os from "os";
import path from "path";
import fs from "fs";
import { PDFDocument } from "pdf-lib";
import { renderProjectPdf, parsePageElements, sortPrintPages, type PdfRenderPage } from "./pdfRenderer";

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

describe("parsePageElements", () => {
  it("treats the DB default {} as an empty page, not a failed parse", () => {
    expect(parsePageElements("{}")).toEqual([]);
    expect(parsePageElements(null)).toEqual([]);
  });

  it("reads a saved editor array and a wrapped { elements } payload", () => {
    const el = { id: "t", type: "text", x: 0, y: 0, w: 10, h: 10, text: "Hi" };
    expect(parsePageElements(JSON.stringify([el]))).toEqual([el]);
    expect(parsePageElements(JSON.stringify({ elements: [el] }))).toEqual([el]);
    expect(parsePageElements(JSON.stringify(JSON.stringify([el])))).toEqual([el]);
  });
});

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

  it("keeps inside covers so duplex order matches the bound book", async () => {
    const output = tmpPdf("multi");
    const pages: PdfRenderPage[] = [
      { role: "locked_left",  pageNumber: 1, elements: [] },
      { role: "inner",        pageNumber: 2, elements: [{ id: "bg", type: "background", x: 0, y: 0, w: 600, h: 800, rotation: 0, bgColor: "#FFF" }] },
      { role: "inner",        pageNumber: 3, elements: [{ id: "bg", type: "background", x: 0, y: 0, w: 600, h: 800, rotation: 0, bgColor: "#EEE" }] },
      { role: "locked_right", pageNumber: 4, elements: [] },
      { role: "front_cover",  pageNumber: 0, elements: [{ id: "bg", type: "background", x: 0, y: 0, w: 600, h: 800, rotation: 0, bgColor: "#111" }] },
      { role: "back_cover",   pageNumber: 5, elements: [{ id: "bg", type: "background", x: 0, y: 0, w: 600, h: 800, rotation: 0, bgColor: "#222" }] },
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
    expect(doc.getPages()).toHaveLength(6);
  }, 30_000);

  it("puts the back cover last even when its pageNumber collides with an inner page", async () => {
    const ordered = sortPrintPages([
      { role: "back_cover", pageNumber: 33 },
      { role: "inner", pageNumber: 33 },
      { role: "front_cover", pageNumber: 0 },
      { role: "locked_left", pageNumber: 1 },
      { role: "inner", pageNumber: 2 },
    ]);
    expect(ordered.map((p) => p.role)).toEqual([
      "front_cover", "locked_left", "inner", "inner", "back_cover",
    ]);
  });
});
