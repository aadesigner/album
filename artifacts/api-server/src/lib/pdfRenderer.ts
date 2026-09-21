import { createCanvas, GlobalFonts, loadImage, type Canvas, type Image } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

// ── Fonts ────────────────────────────────────────────────────────────────────
// Same faces as the Konva editor so wrap width / glyph metrics match.
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;

  const fontDirs = [
    path.join(MODULE_DIR, "assets", "fonts"),
    path.join(MODULE_DIR, "..", "assets", "fonts"),
    path.join(process.cwd(), "assets", "fonts"),
    path.join(process.cwd(), "artifacts", "api-server", "assets", "fonts"),
  ];

  const faces: [string, string][] = [
    ["GreatVibes-Regular.ttf", "Great Vibes"],
    ["LondrinaSolid-Regular.ttf", "Londrina Solid"],
    ["Pacifico-Regular.ttf", "Pacifico"],
    ["DancingScript-Regular.ttf", "Dancing Script"],
    ["PlayfairDisplay-Regular.ttf", "Playfair Display"],
    ["PlayfairDisplay-Italic.ttf", "Playfair Display"],
    ["CormorantGaramond-Regular.ttf", "Cormorant Garamond"],
    ["CormorantGaramond-Italic.ttf", "Cormorant Garamond"],
    ["Raleway-Regular.ttf", "Raleway"],
    ["Montserrat-Regular.ttf", "Montserrat"],
    ["DejaVuSerif.ttf", "DejaVu Serif"],
    ["DejaVuSerif-Bold.ttf", "DejaVu Serif"],
    ["DejaVuSans.ttf", "DejaVu Sans"],
    ["DejaVuSans-Bold.ttf", "DejaVu Sans"],
    ["DejaVuSerif.ttf", "Georgia"],
    ["DejaVuSans.ttf", "Arial"],
  ];

  for (const dir of fontDirs) {
    for (const [file, family] of faces) {
      const full = path.join(dir, file);
      try {
        if (fs.existsSync(full)) GlobalFonts.registerFromPath(full, family);
      } catch (err) {
        logger.warn({ err, file: full }, "Failed to register PDF render font");
      }
    }
  }

  const system: [string, string][] = [
    ["/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", "DejaVu Serif"],
    ["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", "DejaVu Serif"],
    ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVu Sans"],
    ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVu Sans"],
    ["C:/Windows/Fonts/georgia.ttf", "Georgia"],
    ["C:/Windows/Fonts/arial.ttf", "Arial"],
  ];
  for (const [file, family] of system) {
    try {
      if (fs.existsSync(file)) GlobalFonts.registerFromPath(file, family);
    } catch {
      // ignore
    }
  }
}

function resolveFontFamily(family?: string): string {
  const f = (family || "").toLowerCase();
  if (f.includes("great vibes") || f.includes("greatvibes")) return "Great Vibes";
  if (f.includes("londrina")) return "Londrina Solid";
  if (f.includes("pacifico")) return "Pacifico";
  if (f.includes("dancing")) return "Dancing Script";
  if (f.includes("playfair")) return "Playfair Display";
  if (f.includes("cormorant")) return "Cormorant Garamond";
  if (f.includes("raleway")) return "Raleway";
  if (f.includes("montserrat")) return "Montserrat";
  if (f.includes("georgia") || f.includes("times")) return "Georgia";
  if (f.includes("arial") || f.includes("helvetica")) return "Arial";
  if (f.includes("serif") || f.includes("script") || f.includes("vibes")) return "DejaVu Serif";
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
  objectFit?: "cover" | "contain";
  mixBlendMode?: string;
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

/** Width of a string including letterSpacing (Konva-compatible). */
function measureLineWidth(
  ctx: import("@napi-rs/canvas").SKRSContext2D,
  text: string,
  letterSpacing: number,
): number {
  if (!text) return 0;
  if (!letterSpacing) return ctx.measureText(text).width;
  const chars = [...text];
  let w = 0;
  for (let i = 0; i < chars.length; i++) {
    w += ctx.measureText(chars[i]).width;
    if (i < chars.length - 1) w += letterSpacing;
  }
  return w;
}

/**
 * Word-wrap matching Konva Text (wrap="word", padding inset).
 * MUST honour letterSpacing — cover titles use 4–12px tracking; ignoring it
 * packs too many glyphs per line and the clip rect crops them.
 */
function wrapLines(
  ctx: import("@napi-rs/canvas").SKRSContext2D,
  text: string,
  maxW: number,
  letterSpacing = 0,
): string[] {
  const paragraphs = text.split("\n");
  const out: string[] = [];
  for (const para of paragraphs) {
    if (!para) {
      out.push("");
      continue;
    }
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (measureLineWidth(ctx, test, letterSpacing) <= maxW || !line) {
        line = test;
        // Break a single overlong token so the rest of the paragraph can wrap.
        if (measureLineWidth(ctx, line, letterSpacing) > maxW && [...line].length > 1) {
          let chunk = "";
          for (const ch of [...line]) {
            const next = chunk + ch;
            if (chunk && measureLineWidth(ctx, next, letterSpacing) > maxW) {
              out.push(chunk);
              chunk = ch;
            } else {
              chunk = next;
            }
          }
          line = chunk;
        }
      } else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

function drawSpacedText(
  ctx: import("@napi-rs/canvas").SKRSContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
) {
  if (!letterSpacing) {
    ctx.fillText(text, x, y);
    return;
  }
  let cursor = x;
  for (const ch of [...text]) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + letterSpacing;
  }
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
        if (el.mixBlendMode === "screen") ctx.globalCompositeOperation = "screen";
        ctx.save();
        ctx.beginPath();
        ctx.rect(el.x, el.y, el.w, el.h);
        ctx.clip();
        if (el.objectFit === "contain") {
          const scale = Math.min(
            el.w / Math.max(1, img.width),
            el.h / Math.max(1, img.height),
          );
          const dw = img.width * scale;
          const dh = img.height * scale;
          const dx = el.x + (el.w - dw) / 2;
          const dy = el.y + (el.h - dh) / 2;
          ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
        } else {
          const crop = coverCropRect(
            img.width,
            img.height,
            el.w,
            el.h,
            el.cropFocusX ?? 0.5,
            el.cropFocusY ?? 0.5,
          );
          ctx.drawImage(
            img,
            crop.x, crop.y, crop.width, crop.height,
            el.x, el.y, el.w, el.h,
          );
        }
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
      } else {
        ctx.fillStyle = "#D8D0C4";
        ctx.fillRect(el.x, el.y, el.w, el.h);
        ctx.strokeStyle = "#B8AFA3";
        ctx.lineWidth = 2;
        ctx.strokeRect(el.x + 1, el.y + 1, el.w - 2, el.h - 2);
      }
    } else if (el.type === "text" && el.text) {
      // Match KonvaText: padding=6, verticalAlign=top, wrap=word, letterSpacing.
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

      const maxW = Math.max(1, el.w - pad * 2);
      const lines = wrapLines(ctx, el.text, maxW, letterSpacing);
      const lineH = fontSize * lh;

      ctx.save();
      // Clip to the text box like Konva — but leave a tiny bleed so antialiased
      // edges / italic overhang aren't shaved off.
      ctx.beginPath();
      ctx.rect(el.x - 1, el.y - 1, el.w + 2, el.h + 2);
      ctx.clip();

      let startY = el.y + pad;
      for (const line of lines) {
        // Draw any line that still intersects the box (Konva shows partial last lines).
        if (startY >= el.y + el.h) break;

        const lineW = measureLineWidth(ctx, line, letterSpacing);
        let x = el.x + pad;
        if (alignment === "center") x = el.x + (el.w - lineW) / 2;
        if (alignment === "right") x = el.x + el.w - pad - lineW;

        drawSpacedText(ctx, line, x, startY, letterSpacing);
        startY += lineH;
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
