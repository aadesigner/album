import { describe, it, expect, afterEach } from "vitest";
import os from "os";
import path from "path";
import fs from "fs";
import { PDFDocument } from "pdf-lib";
import { renderProjectPdf, type PdfRenderPage } from "./pdfRenderer";

const outputFiles: string[] = [];
afterEach(() => {
  for (const f of outputFiles.splice(0)) {
    try { fs.unlinkSync(f); } catch { /* ignore */ }
  }
});

describe("text letterSpacing wrap", () => {
  it("renders tracked title without throwing", async () => {
    const output = path.join(os.tmpdir(), `pdf-text-${Date.now()}.pdf`);
    outputFiles.push(output);
    const pages: PdfRenderPage[] = [{
      role: "front_cover",
      pageNumber: 0,
      elements: [
        { id: "bg", type: "background", x: 0, y: 0, w: 600, h: 800, rotation: 0, bgColor: "#1a1a1a" },
        {
          id: "t",
          type: "text",
          x: 40,
          y: 300,
          w: 520,
          h: 120,
          rotation: 0,
          text: "NEW YORK",
          fontSize: 72,
          fontFamily: "'Londrina Solid', cursive",
          letterSpacing: 10,
          align: "center",
          fill: "#ffffff",
        },
      ],
    }];
    await renderProjectPdf({
      pages,
      bookWidthCm: 21,
      bookHeightCm: 28,
      uploadsDir: os.tmpdir(),
      outputPath: output,
    });
    const doc = await PDFDocument.load(fs.readFileSync(output));
    expect(doc.getPages()).toHaveLength(1);
    expect(fs.statSync(output).size).toBeGreaterThan(5000);
  }, 30_000);

  it("keeps multi-line body copy when the saved box is shorter than the wrap", async () => {
    const output = path.join(os.tmpdir(), `pdf-text-overflow-${Date.now()}.pdf`);
    outputFiles.push(output);
    const long =
      "Kujtimet tona nga udhëtimi — dielli, deti, dhe të gjitha momentet që "
      + "nuk duam t'i harrojmë kurrë. Faqja e albumit duhet t'i mbajë të plota.";
    const pages: PdfRenderPage[] = [{
      role: "inner",
      pageNumber: 1,
      elements: [
        { id: "bg", type: "background", x: 0, y: 0, w: 600, h: 800, rotation: 0, bgColor: "#FEFDF9" },
        {
          id: "t",
          type: "text",
          x: 40,
          y: 100,
          w: 520,
          // Intentionally short — older PDFs clipped the last lines here.
          h: 48,
          rotation: 0,
          text: long,
          fontSize: 22,
          fontFamily: "'Lora', serif",
          lineHeight: 1.25,
          align: "left",
          fill: "#1a1a1a",
        },
      ],
    }];
    await renderProjectPdf({
      pages,
      bookWidthCm: 21,
      bookHeightCm: 28,
      uploadsDir: os.tmpdir(),
      outputPath: output,
    });
    expect(fs.statSync(output).size).toBeGreaterThan(4000);
  }, 30_000);
});
