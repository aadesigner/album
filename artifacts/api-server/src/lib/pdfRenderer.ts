import { createCanvas, GlobalFonts, loadImage, type Canvas, type Image } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

// ── Fonts ────────────────────────────────────────────────────────────────────
// Prefer bundled fonts next to the API package; fall back to common OS paths.
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;

  const bundled = [
    [path.join(MODULE_DIR, "..", "assets", "fonts", "DejaVuSerif.ttf"), "DejaVu Serif"],
    [path.join(MODULE_DIR, "..", "assets", "fonts", "DejaVuSerif-Bold.ttf"), "DejaVu Serif"],
    [path.join(MODULE_DIR, "..", "assets", "fonts", "DejaVuSans.ttf"), "DejaVu Sans"],
    [path.join(MODULE_DIR, "..", "assets", "fonts", "DejaVuSans-Bold.ttf"), "DejaVu Sans"],
    [path.join(process.cwd(), "assets", "fonts", "DejaVuSerif.ttf"), "DejaVu Serif"],
    [path.join(process.cwd(), "assets", "fonts", "DejaVuSans.ttf"), "DejaVu Sans"],
  ] as const;

  const system: [string, string][] = [
    ["/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", "DejaVu Serif"],
    ["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", "DejaVu Serif"],
    ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVu Sans"],
    ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVu Sans"],
    ["C:/Windows/Fonts/georgia.ttf", "DejaVu Serif"],
    ["C:/Windows/Fonts/arial.ttf", "DejaVu Sans"],
  ];

  for (const [file, family] of [...bundled, ...system]) {
    try {
      if (fs.existsSync(file)) GlobalFonts.registerFromPath(file, family);
    } catch (err) {
      logger.warn({ err, file }, "Failed to register PDF render font");
    }
  }
}

function resolveFontFamily(family?: string): string {
  const f = (family || "").toLowerCase();
  if (
    f.includes("georgia") ||
    f.includes("playfair") ||
    f.includes("cormorant") ||
    f.includes("times") ||
    f.includes("serif") ||
    f.includes("vibes") ||
    f.includes("script") ||
    f.includes("pacifico") ||
    f.includes("dancing")
  ) {
    return "DejaVu Serif";
  }
  return "DejaVu Sans";
}

// ── Must match the editor's design canvas exactly ───────────────────────────
const DESIGN_W = 600;
const DESIGN_H = 800;
const PAPER_COLOR = "#FEFDF9";

/** Mirrors designs.ts getCanvasHeight() — keep formula identical. */
function getCanvasHeight(bookWidthCm: number, bookHeightCm: number): number {
  if (!bookWidthCm || !bookHeightCm) return DESIGN_H;
  return Math.round(DESIGN_W * (bookHeightCm / bookWidthCm));
}

// Print resolution: 300 DPI — standard for photo-book print output.
const PRINT_DPI = 300;
const CM_TO_INCH = 1 / 2.54;
/** High JPEG quality for print (balance size vs sharpness). */
const PRINT_JPEG_QUALITY = 94;

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
  cropFocusX?: number;
  cropFocusY?: number;
}

export interface PdfRenderPage {
  pageNumber?: number;
  role: string;
  elements: PdfRenderElement[];
}

/** object-fit: cover crop in source pixels — matches client generatePDF / designs.ts */
function coverCropRect(
  naturalW: number,
  naturalH: number,
  boxW: number,
  boxH: number,
  focusX = 0.5,
  focusY = 0.5,
): { x: number; y: number; width: number; height: number } {
  const scale = Math.max(boxW / Math.max(1, naturalW), boxH / Math.max(1, naturalH));
  const width = boxW / scale;
  const height = boxH / scale;
  const maxX = Math.max(0, naturalW - width);
  const maxY = Math.max(0, naturalH - height);
  const fx = Math.min(1, Math.max(0, focusX));
  const fy = Math.min(1, Math.max(0, focusY));
  return { x: maxX * fx, y: maxY * fy, width, height };
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

function designAssetDirs(): string[] {
  return [
    // Copied next to the bundled dist/ by build.mjs
    path.join(MODULE_DIR, "assets", "designs"),
    path.join(process.cwd(), "assets", "designs"),
    path.join(MODULE_DIR, "..", "assets", "designs"),
    path.join(MODULE_DIR, "..", "..", "assets", "designs"),
    path.join(process.cwd(), "public", "designs"),
    path.join(process.cwd(), "artifacts", "api-server", "assets", "designs"),
    path.join(process.cwd(), "artifacts", "api-server", "dist", "assets", "designs"),
    path.join(process.cwd(), "artifacts", "pergjithmone", "public", "designs"),
    path.join(MODULE_DIR, "..", "..", "pergjithmone", "public", "designs"),
  ];
}

/**
 * Resolve an image src from page contentJson to a local file path, or return
 * a fetchable absolute URL. Handles absolute site URLs, query strings, and
 * built-in /designs/* cover art.
 */
function resolveUploadFile(filename: string, uploadsDir: string): string | null {
  const candidates = [
    path.join(uploadsDir, filename),
    path.join(process.cwd(), "uploads", filename),
  ];
  if (process.env.DATA_DIR) {
    candidates.push(path.join(process.env.DATA_DIR, "uploads", filename));
  }
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function resolveImageSource(
  src: string,
  uploadsDir: string,
): { kind: "file"; path: string } | { kind: "url"; url: string } | null {
  if (!src) return null;
  if (src.startsWith("data:")) return { kind: "url", url: src };

  let pathname = src;
  try {
    if (/^https?:\/\//i.test(src)) {
      const u = new URL(src);
      pathname = u.pathname;
      const uploadInUrl = pathname.match(/\/api\/uploads\/files\/([^/?#]+)/i);
      if (uploadInUrl) {
        const filePath = resolveUploadFile(decodeURIComponent(uploadInUrl[1]), uploadsDir);
        if (filePath) return { kind: "file", path: filePath };
      }
      const designInUrl = pathname.match(/\/designs\/([^/?#]+)/i);
      if (designInUrl) {
        const file = decodeURIComponent(designInUrl[1]);
        for (const dir of designAssetDirs()) {
          const candidate = path.join(dir, file);
          if (fs.existsSync(candidate)) return { kind: "file", path: candidate };
        }
      }
      // External wallpaper (Unsplash, etc.)
      return { kind: "url", url: src };
    }
  } catch {
    // fall through
  }

  pathname = pathname.split("?")[0].split("#")[0];

  const uploadMatch = pathname.match(/\/api\/uploads\/files\/([^/]+)$/i)
    || pathname.match(/^\/?uploads\/files\/([^/]+)$/i);
  if (uploadMatch) {
    const filePath = resolveUploadFile(decodeURIComponent(uploadMatch[1]), uploadsDir);
    if (filePath) return { kind: "file", path: filePath };
    logger.warn({ src }, "PDF render: upload file missing on disk");
    return null;
  }

  const designMatch = pathname.match(/\/designs\/([^/]+)$/i);
  if (designMatch) {
    const file = decodeURIComponent(designMatch[1]);
    for (const dir of designAssetDirs()) {
      const candidate = path.join(dir, file);
      if (fs.existsSync(candidate)) return { kind: "file", path: candidate };
    }
    logger.warn({ src, file }, "PDF render: design asset not found");
    return null;
  }

  if (path.isAbsolute(pathname) && fs.existsSync(pathname)) {
    return { kind: "file", path: pathname };
  }

  return null;
}

async function loadPageImages(
  elements: PdfRenderElement[],
  uploadsDir: string,
): Promise<Map<string, Image>> {
  const cache = new Map<string, Image>();
  const jobs = elements
    .filter((e) => (e.type === "image" || e.type === "background") && e.src)
    .map(async (e) => {
      const src = e.src!;
      if (cache.has(src)) return;
      try {
        const resolved = resolveImageSource(src, uploadsDir);
        if (!resolved) return;
        if (resolved.kind === "file") {
          cache.set(src, await loadImage(resolved.path));
        } else {
          cache.set(src, await loadImage(resolved.url));
        }
      } catch (err) {
        logger.warn({ err, src }, "PDF render: failed to load page image");
      }
    });
  await Promise.all(jobs);
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
      const wallpaper = el.src ? images.get(el.src) : undefined;
      if (wallpaper) {
        const crop = coverCropRect(
          wallpaper.width,
          wallpaper.height,
          DESIGN_W,
          canvasH,
          el.cropFocusX ?? 0.5,
          el.cropFocusY ?? 0.5,
        );
        ctx.drawImage(
          wallpaper,
          crop.x, crop.y, crop.width, crop.height,
          0, 0, DESIGN_W, canvasH,
        );
      } else if (el.bgGradientFrom) {
        const ex = el.bgGradientDir === "lr" ? DESIGN_W : el.bgGradientDir === "diag" ? DESIGN_W : 0;
        const ey = el.bgGradientDir === "lr" ? 0 : canvasH;
        const grad = ctx.createLinearGradient(0, 0, ex, ey);
        grad.addColorStop(0, el.bgGradientFrom);
        grad.addColorStop(1, el.bgGradientTo || "#fff");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, DESIGN_W, canvasH);
      } else {
        ctx.fillStyle = el.bgColor || PAPER_COLOR;
        ctx.fillRect(0, 0, DESIGN_W, canvasH);
      }
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
        const crop = coverCropRect(
          img.width,
          img.height,
          el.w,
          el.h,
          el.cropFocusX ?? 0.5,
          el.cropFocusY ?? 0.5,
        );
        ctx.save();
        ctx.beginPath();
        ctx.rect(el.x, el.y, el.w, el.h);
        ctx.clip();
        ctx.drawImage(
          img,
          crop.x, crop.y, crop.width, crop.height,
          el.x, el.y, el.w, el.h,
        );
        ctx.restore();
      } else {
        ctx.fillStyle = "#D8D0C4";
        ctx.fillRect(el.x, el.y, el.w, el.h);
        ctx.strokeStyle = "#B8AFA3";
        ctx.lineWidth = 2;
        ctx.strokeRect(el.x + 1, el.y + 1, el.w - 2, el.h - 2);
      }
    } else if (el.type === "text" && el.text) {
      const pad = 6;
      const fontSize = el.fontSize ?? 20;
      const lh = el.lineHeight ?? 1.2;
      const family = resolveFontFamily(el.fontFamily);
      const style = el.fontStyle ?? "normal";
      const color = el.fill ?? "#1a1a1a";
      const alignment = el.align ?? "center";
      const letterSpacing = el.letterSpacing ?? 0;

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
        if (letterSpacing) {
          const chars = [...line];
          let totalW = 0;
          for (const ch of chars) totalW += ctx.measureText(ch).width + letterSpacing;
          totalW -= letterSpacing;
          let x = el.x + pad;
          if (alignment === "center") x = el.x + (el.w - totalW) / 2;
          if (alignment === "right") x = el.x + el.w - pad - totalW;
          for (const ch of chars) {
            ctx.fillText(ch, x, startY);
            x += ctx.measureText(ch).width + letterSpacing;
          }
        } else {
          let x = el.x + pad;
          if (alignment === "center") x = el.x + el.w / 2 - ctx.measureText(line).width / 2;
          if (alignment === "right") x = el.x + el.w - pad - ctx.measureText(line).width;
          ctx.fillText(line, x, startY);
        }
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

  if (!bookWidthCm || !bookHeightCm || bookWidthCm <= 0 || bookHeightCm <= 0) {
    throw new Error(`Invalid book size for PDF: ${bookWidthCm}×${bookHeightCm} cm`);
  }

  const outW = Math.round(bookWidthCm * CM_TO_INCH * PRINT_DPI);
  const outH = Math.round(bookHeightCm * CM_TO_INCH * PRINT_DPI);
  const canvasH = getCanvasHeight(bookWidthCm, bookHeightCm);

  const ordered = [...pages].sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
  const toRender = ordered.filter((p) => p.role !== "locked_left" && p.role !== "locked_right");

  if (toRender.length === 0) {
    throw new Error("No printable pages found for PDF");
  }

  logger.info(
    {
      pages: toRender.length,
      bookWidthCm,
      bookHeightCm,
      outW,
      outH,
      canvasH,
      dpi: PRINT_DPI,
    },
    "Rendering print PDF",
  );

  const pdf = await PDFDocument.create();
  const pointsPerCm = 72 / 2.54;
  const pageWidthPt = bookWidthCm * pointsPerCm;
  const pageHeightPt = bookHeightCm * pointsPerCm;

  for (const page of toRender) {
    const canvas = await renderPageToCanvas(page, outW, outH, canvasH, uploadsDir);
    const jpegBuffer = canvas.toBuffer("image/jpeg", PRINT_JPEG_QUALITY);
    const jpegImage = await pdf.embedJpg(jpegBuffer);
    const pdfPage = pdf.addPage([pageWidthPt, pageHeightPt]);
    pdfPage.drawImage(jpegImage, { x: 0, y: 0, width: pageWidthPt, height: pageHeightPt });

    await new Promise((r) => setImmediate(r));
  }

  const bytes = await pdf.save();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes);
}
