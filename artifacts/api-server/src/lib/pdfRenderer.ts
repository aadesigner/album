import { createCanvas, GlobalFonts, loadImage, type Canvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { logger } from "./logger";

// ── Fonts ────────────────────────────────────────────────────────────────────
// The editor uses web fonts (Playfair Display, Inter) that aren't installed
// on the server. DejaVu ships with the OS and is close enough in metrics to
// avoid layout surprises without shipping font files.
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;
  const candidates: [string, string][] = [
    ["/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", "DejaVu Serif"],
    ["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", "DejaVu Serif"],
    ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVu Sans"],
    ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVu Sans"],
  ];
  for (const [file, family] of candidates) {
    try {
      if (fs.existsSync(file)) GlobalFonts.registerFromPath(file, family);
    } catch (err) {
      logger.warn({ err, file }, "Failed to register PDF render font");
    }
  }
}

function resolveFontFamily(family?: string): string {
  const f = (family || "").toLowerCase();
  if (f.includes("georgia") || f.includes("playfair") || f.includes("serif")) {
    return "DejaVu Serif";
  }
  return "DejaVu Sans";
}

// ── Must match the editor's design canvas exactly ───────────────────────────
// DESIGN_W is the fixed logical canvas width used by every book size; the
// canvas *height* varies per book aspect ratio (see getCanvasHeight below) so
// content is never stretched on non-3:4 books. DESIGN_H is only the 3:4
// reference height (kept for the common case / as a fallback).
const DESIGN_W = 600;
const DESIGN_H = 800;
const PAPER_COLOR = "#FEFDF9";

/** Mirrors designs.ts's getCanvasHeight() on the client — duplicated here
 *  because this is a separate package; keep the formula identical. */
function getCanvasHeight(bookWidthCm: number, bookHeightCm: number): number {
  if (!bookWidthCm || !bookHeightCm) return DESIGN_H;
  return Math.round(DESIGN_W * (bookHeightCm / bookWidthCm));
}

// Print resolution: 300 DPI is the standard for sharp photo-book output.
const PRINT_DPI = 300;
const CM_TO_INCH = 1 / 2.54;

export interface PdfRenderElement {
  id: string;
  type: "image" | "text" | "placeholder" | "background" | "shape";
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  opacity?: number;
  bgColor?: string;
  bgGradientFrom?: string;
  bgGradientTo?: string;
  bgGradientDir?: "tb" | "lr" | "diag";
  fill?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDash?: number[];
  cornerRadius?: number;
  shapeKind?: string;
  src?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
}

export interface PdfRenderPage {
  pageNumber?: number;
  role: string;
  elements: PdfRenderElement[];
}

function roundRectPath(
  ctx: import("@napi-rs/canvas").SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapLines(
  ctx: import("@napi-rs/canvas").SKRSContext2D,
  text: string,
  maxW: number,
): string[] {
  const paragraphs = text.split("\n");
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW) {
        line = test;
      } else {
        if (line) out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

// Resolve an uploaded-photo URL (e.g. "/api/uploads/files/xyz.jpg") to the
// local file on disk, avoiding a network round-trip through our own server.
function resolveLocalImagePath(src: string, uploadsDir: string): string | null {
  const match = src.match(/\/api\/uploads\/files\/([\w.\-]+)$/);
  if (!match) return null;
  return path.join(uploadsDir, match[1]);
}

async function loadPageImages(
  elements: PdfRenderElement[],
  uploadsDir: string,
): Promise<Map<string, import("@napi-rs/canvas").Image>> {
  const cache = new Map<string, import("@napi-rs/canvas").Image>();
  await Promise.all(
    elements
      .filter((e) => e.type === "image" && e.src)
      .map(async (e) => {
        const src = e.src!;
        if (cache.has(src)) return;
        try {
          const localPath = resolveLocalImagePath(src, uploadsDir);
          if (localPath && fs.existsSync(localPath)) {
            cache.set(src, await loadImage(localPath));
          } else {
            // Fallback for any non-local src (shouldn't normally happen).
            cache.set(src, await loadImage(src));
          }
        } catch (err) {
          logger.warn({ err, src }, "PDF render: failed to load page image");
        }
      }),
  );
  return cache;
}

async function renderPageToCanvas(
  page: PdfRenderPage,
  outW: number,
  outH: number,
  canvasH: number,
  uploadsDir: string,
): Promise<Canvas> {
  ensureFonts();
  const canvas = createCanvas(outW, outH);
  const ctx = canvas.getContext("2d");
  // Elements are authored in DESIGN_W × canvasH logical pixels. Scale each
  // axis independently onto the real output size — for a well-formed
  // canvasH (derived from the same aspect ratio as outW/outH) these two
  // factors come out equal, so this never distorts content.
  const scaleX = outW / DESIGN_W;
  const scaleY = outH / canvasH;
  ctx.scale(scaleX, scaleY);

  ctx.fillStyle = PAPER_COLOR;
  ctx.fillRect(0, 0, DESIGN_W, canvasH);

  const images = await loadPageImages(page.elements, uploadsDir);

  for (const el of page.elements) {
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;

    if (el.rotation) {
      ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-(el.x + el.w / 2), -(el.y + el.h / 2));
    }

    if (el.type === "background") {
      if (el.bgGradientFrom) {
        const ex = el.bgGradientDir === "lr" ? DESIGN_W : el.bgGradientDir === "diag" ? DESIGN_W : 0;
        const ey = el.bgGradientDir === "lr" ? 0 : el.bgGradientDir === "diag" ? canvasH : canvasH;
        const grad = ctx.createLinearGradient(0, 0, ex, ey);
        grad.addColorStop(0, el.bgGradientFrom);
        grad.addColorStop(1, el.bgGradientTo || "#fff");
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = el.bgColor || PAPER_COLOR;
      }
      ctx.fillRect(0, 0, DESIGN_W, canvasH);
    } else if (el.type === "shape") {
      const cr = el.shapeKind === "circle" ? Math.min(el.w, el.h) / 2 : (el.cornerRadius ?? 0);
      if (cr > 0) {
        roundRectPath(ctx, el.x, el.y, el.w, el.h, cr);
      } else {
        ctx.beginPath();
        ctx.rect(el.x, el.y, el.w, el.h);
      }
      if (el.fill && el.fill !== "transparent") {
        ctx.fillStyle = el.fill;
        ctx.fill();
      }
      if (el.strokeColor && (el.strokeWidth ?? 0) > 0) {
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth!;
        if (el.strokeDash?.length) ctx.setLineDash(el.strokeDash);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (el.type === "image" && el.src) {
      const img = images.get(el.src);
      if (img) {
        const sx = el.w / img.width;
        const sy = el.h / img.height;
        const s = Math.max(sx, sy);
        const cw = el.w / s;
        const ch = el.h / s;
        const cx = (img.width - cw) / 2;
        const cy = (img.height - ch) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(el.x, el.y, el.w, el.h);
        ctx.clip();
        ctx.drawImage(img, cx, cy, cw, ch, el.x, el.y, el.w, el.h);
        ctx.restore();
      } else {
        ctx.fillStyle = "#D8D0C4";
        ctx.fillRect(el.x, el.y, el.w, el.h);
      }
    } else if (el.type === "text" && el.text) {
      const pad = 6;
      const fontSize = el.fontSize ?? 20;
      const lh = el.lineHeight ?? 1.2;
      const family = resolveFontFamily(el.fontFamily);
      const style = el.fontStyle ?? "normal";
      const color = el.fill ?? "#1a1a1a";
      const alignment = el.align ?? "center";

      const isBold = style.includes("bold");
      const isItalic = style.includes("italic");
      ctx.font = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}${fontSize}px "${family}"`;
      ctx.fillStyle = color;
      ctx.textBaseline = "top";

      const maxW = el.w - pad * 2;
      const lines = wrapLines(ctx, el.text, maxW);
      const lineH = fontSize * lh;

      ctx.save();
      ctx.beginPath();
      ctx.rect(el.x, el.y, el.w, el.h);
      ctx.clip();

      let startY = el.y + pad;
      for (const line of lines) {
        let x = el.x + pad;
        if (alignment === "center") x = el.x + el.w / 2 - ctx.measureText(line).width / 2;
        if (alignment === "right") x = el.x + el.w - pad - ctx.measureText(line).width;
        ctx.fillText(line, x, startY);
        startY += lineH;
        if (startY > el.y + el.h) break;
      }
      ctx.restore();
    } else if (el.type === "placeholder") {
      ctx.fillStyle = "#EDE8E0";
      ctx.fillRect(el.x, el.y, el.w, el.h);
    }

    ctx.restore();
  }

  return canvas;
}

/**
 * Renders a photobook's pages into a single print-ready PDF at the physical
 * dimensions of the selected book size (300 DPI), and writes it to disk.
 */
export async function renderProjectPdf(params: {
  pages: PdfRenderPage[];
  bookWidthCm: number;
  bookHeightCm: number;
  uploadsDir: string;
  outputPath: string;
}): Promise<void> {
  const { pages, bookWidthCm, bookHeightCm, uploadsDir, outputPath } = params;

  const outW = Math.round(bookWidthCm * CM_TO_INCH * PRINT_DPI);
  const outH = Math.round(bookHeightCm * CM_TO_INCH * PRINT_DPI);
  const canvasH = getCanvasHeight(bookWidthCm, bookHeightCm);

  const ordered = [...pages].sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
  const toRender = ordered.filter((p) => p.role !== "locked_left" && p.role !== "locked_right");

  const pdf = await PDFDocument.create();
  const pointsPerCm = 72 / 2.54;
  const pageWidthPt = bookWidthCm * pointsPerCm;
  const pageHeightPt = bookHeightCm * pointsPerCm;

  for (const page of toRender) {
    const canvas = await renderPageToCanvas(page, outW, outH, canvasH, uploadsDir);
    const jpegBuffer = canvas.toBuffer("image/jpeg", 92);
    const jpegImage = await pdf.embedJpg(jpegBuffer);
    const pdfPage = pdf.addPage([pageWidthPt, pageHeightPt]);
    pdfPage.drawImage(jpegImage, { x: 0, y: 0, width: pageWidthPt, height: pageHeightPt });

    // Rendering + JPEG-encoding a page is CPU-bound and synchronous; yield
    // to the event loop between pages so a 30+ page book doesn't starve the
    // HTTP server (health checks, other requests) for several seconds straight.
    await new Promise((r) => setImmediate(r));
  }

  const bytes = await pdf.save();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes);
}
