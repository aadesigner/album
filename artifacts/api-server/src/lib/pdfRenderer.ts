import { createCanvas, GlobalFonts, loadImage, Path2D, type Canvas, type Image } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger";
import { getDesignsDir, uploadFilePathCandidates } from "./dataDir";
import { isStrokeOnlyShape, shapePathForElement } from "./shapes";

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
  if (f.includes("georgia") || f.includes("times") || f.includes("palatino")) return "Georgia";
  if (f.includes("arial") || f.includes("helvetica") || f.includes("verdana") || f.includes("trebuchet")) return "Arial";
  // Unregistered editor faces → closest metric bucket (avoids random system fallback).
  if (
    f.includes("garamond") || f.includes("baskerville") || f.includes("lora")
    || f.includes("spectral") || f.includes("fraunces") || f.includes("instrument")
    || f.includes("libre") || f.includes("crimson") || f.includes("cardo")
    || f.includes("newsreader") || f.includes("bodoni") || f.includes("cinzel")
    || f.includes("alegreya") || f.includes("noto serif") || f.includes("dm serif")
    || f.includes("source serif") || f.includes("eb garamond") || f.includes("caslon")
  ) {
    return "DejaVu Serif";
  }
  if (
    f.includes("script") || f.includes("vibes") || f.includes("allura")
    || f.includes("sacramento") || f.includes("satisfy") || f.includes("parisienne")
    || f.includes("italianno") || f.includes("yellowtail") || f.includes("cookie")
    || f.includes("caveat") || f.includes("tangerine") || f.includes("pinyon")
    || f.includes("alex brush") || f.includes("homemade") || f.includes("shadows")
    || f.includes("petit") || f.includes("qwigley")
  ) {
    return "Great Vibes";
  }
  if (f.includes("serif")) return "DejaVu Serif";
  return "DejaVu Sans";
}

// ── Must match the editor's design canvas exactly ───────────────────────────
const DESIGN_W = 600;
const DESIGN_H = 800;
/** Print paper — empty spacing around photos must stay pure white (not cream/tint). */
const PAPER_COLOR = "#FFFFFF";

function isCoverRole(role?: string): boolean {
  return role === "front_cover" || role === "back_cover";
}
const PRINT_DPI = 300;
const CM_TO_INCH = 1 / 2.54;
/** Print JPEG quality — 90 is visually fine at 300 DPI and cheaper on CPU/RAM/disk than 94+. */
const PRINT_JPEG_QUALITY = 90;

/** Mirrors designs.ts getCanvasHeight() — keep formula identical. */
export function getCanvasHeight(bookWidthCm: number, bookHeightCm: number): number {
  if (!bookWidthCm || !bookHeightCm) return DESIGN_H;
  return Math.round(DESIGN_W * (bookHeightCm / bookWidthCm));
}

/** Pixel size of the print raster at 300 DPI — matches the physical page, not a 3:4 fallback. */
export function printRasterSize(bookWidthCm: number, bookHeightCm: number, dpi = PRINT_DPI): {
  canvasH: number;
  outW: number;
  outH: number;
} {
  const canvasH = getCanvasHeight(bookWidthCm, bookHeightCm);
  const outW = Math.max(1, Math.round(bookWidthCm * CM_TO_INCH * dpi));
  const outH = Math.max(1, Math.round(bookHeightCm * CM_TO_INCH * dpi));
  return { canvasH, outW, outH };
}

function isLandmarkPng(src?: string | null): boolean {
  return !!src && /\/designs\/(?:eiffel-tower|sagrada-familia)\.png(?:$|[?#])/i.test(src);
}

function coverImageLetterbox(el: { src?: string; objectFit?: string; mixBlendMode?: string }): boolean {
  return el.objectFit === "contain" || isLandmarkPng(el.src);
}

function knockOutBlack(img: Image): Canvas | Image {
  try {
    const c = createCanvas(img.width, img.height);
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const id = g.getImageData(0, 0, img.width, img.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = Math.max(d[i], d[i + 1], d[i + 2]);
      d[i + 3] = Math.round((d[i + 3] * lum) / 255);
    }
    g.putImageData(id, 0, 0);
    return c;
  } catch {
    return img;
  }
}

/**
 * Physical photobook order. Never sort by pageNumber alone — extra spreads
 * reuse numbers that already belong to inside/back covers, which used to
 * shove the back cover into the middle and leave white sheets everywhere.
 */
const PRINT_ROLE_RANK: Record<string, number> = {
  front_cover: 0,
  locked_left: 1,
  inside_cover: 1,
  inner: 2,
  content: 2,
  locked_right: 3,
  inside_back_cover: 3,
  back_cover: 4,
};

export function sortPrintPages<T extends { role: string; pageNumber?: number }>(pages: T[]): T[] {
  return [...pages].sort((a, b) => {
    const ra = PRINT_ROLE_RANK[a.role] ?? 2;
    const rb = PRINT_ROLE_RANK[b.role] ?? 2;
    if (ra !== rb) return ra - rb;
    return (a.pageNumber ?? 0) - (b.pageNumber ?? 0);
  });
}

/** DB default is "{}", older clients double-encoded, some wrapped `{ elements }`. */
export function parsePageElements(raw: unknown): PdfRenderElement[] {
  let parsed: unknown = raw;
  if (parsed == null || parsed === "") return [];
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed || trimmed === "{}" || trimmed === "null") return [];
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed as PdfRenderElement[];
  if (parsed && typeof parsed === "object") {
    const els = (parsed as { elements?: unknown }).elements;
    if (Array.isArray(els)) return els as PdfRenderElement[];
  }
  return [];
}

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
  verticalAlign?: "top" | "middle" | "bottom";
  cropFocusX?: number;
  cropFocusY?: number;
  cropZoom?: number;
  objectFit?: "cover" | "contain";
  mixBlendMode?: string;
  sticker?: boolean;
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
  zoom = 1,
): { x: number; y: number; width: number; height: number } {
  const z = Math.max(1, Number.isFinite(zoom) ? zoom : 1);
  const scale = Math.max(boxW / Math.max(1, naturalW), boxH / Math.max(1, naturalH)) * z;
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

export function designAssetDirs(): string[] {
  return [
    getDesignsDir(),
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

/** Built-in cover art (`rome-cover-thumb.jpg`, Eiffel PNG, …) for HTTP + PDF. */
export function findDesignAssetFile(filename: string): string | null {
  const file = String(filename || "").split(/[/\\]/).pop() || "";
  if (!/^[\w.-]+\.(jpe?g|png|webp|gif)$/i.test(file)) return null;
  for (const dir of designAssetDirs()) {
    const candidate = path.join(dir, file);
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
}

/**
 * Resolve an image src from page contentJson to a local file path, or return
 * a fetchable absolute URL. Handles absolute site URLs, query strings, and
 * built-in /designs/* cover art.
 */
function resolveUploadFile(filename: string, uploadsDir: string): string | null {
  for (const filePath of uploadFilePathCandidates(filename, uploadsDir)) {
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost"
    || h === "127.0.0.1"
    || h === "0.0.0.0"
    || h === "::1"
    || h.endsWith(".local")
  );
}

function publicApiOrigin(): string | null {
  const raw = (
    process.env.PUBLIC_API_URL
    || process.env.API_PUBLIC_URL
    || process.env.APP_URL
    || process.env.VITE_API_URL
    || ""
  ).trim().replace(/\/$/, "");
  if (raw) {
    try {
      const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
      // Never use a private host as the "public" fallback — PDF fetch would loop
      // to an unreachable browser-only address from inside the container.
      if (!isPrivateHost(u.hostname)) return u.origin;
    } catch {
      /* fall through to loopback */
    }
  }
  // Same-process serve: relative uploads can still be fetched over loopback.
  const port = String(process.env.PORT || "").trim();
  if (/^\d+$/.test(port)) return `http://127.0.0.1:${port}`;
  return null;
}

function uploadUrlFallback(filename: string, preferredUrl?: string): { kind: "url"; url: string } | null {
  const origin = publicApiOrigin();
  if (origin) {
    return { kind: "url", url: `${origin}/api/uploads/files/${encodeURIComponent(filename)}` };
  }
  if (preferredUrl && /^https?:\/\//i.test(preferredUrl)) {
    try {
      const u = new URL(preferredUrl);
      if (!isPrivateHost(u.hostname)) return { kind: "url", url: preferredUrl };
    } catch {
      /* ignore */
    }
  }
  return null;
}

function resolveImageSource(
  src: string,
  uploadsDir: string,
): { kind: "file"; path: string } | { kind: "url"; url: string } | null {
  if (!src) return null;
  // Device-only refs must be uploaded before print — never fetchable on the server.
  if (/^local-photo:/i.test(src) || /^blob:/i.test(src)) {
    logger.warn({ src: src.slice(0, 48) }, "PDF render: unresolved device-local photo src");
    return null;
  }
  if (src.startsWith("data:")) return { kind: "url", url: src };

  let pathname = src;
  try {
    if (/^https?:\/\//i.test(src)) {
      const u = new URL(src);
      pathname = u.pathname;
      const uploadInUrl = pathname.match(/\/api\/uploads\/files\/([^/?#]+)/i);
      if (uploadInUrl) {
        const filename = decodeURIComponent(uploadInUrl[1]);
        const filePath = resolveUploadFile(filename, uploadsDir);
        if (filePath) return { kind: "file", path: filePath };
        // Prefer a reachable origin over raw localhost / ephemeral browser hosts.
        const fallback = uploadUrlFallback(filename, isPrivateHost(u.hostname) ? undefined : src);
        if (fallback) {
          logger.warn({ src, filename, via: fallback.url }, "PDF render: upload missing on disk — trying HTTP");
          return fallback;
        }
        logger.warn({ src, filename }, "PDF render: upload missing on disk (no reachable origin)");
        return null;
      }
      const designInUrl = pathname.match(/\/designs\/([^/?#]+)/i);
      if (designInUrl) {
        const found = findDesignAssetFile(decodeURIComponent(designInUrl[1]));
        if (found) return { kind: "file", path: found };
      }
      // External wallpaper (Unsplash, etc.)
      return { kind: "url", url: src };
    }
  } catch {
    // fall through
  }

  pathname = pathname.split("?")[0].split("#")[0];

  const uploadMatch = pathname.match(/\/api\/uploads\/files\/([^/]+)$/i)
    || pathname.match(/^\/?uploads\/files\/([^/]+)$/i)
    || pathname.match(/(?:^|\/)api\/uploads\/files\/([^/]+)$/i);
  if (uploadMatch) {
    const filename = decodeURIComponent(uploadMatch[1]);
    const filePath = resolveUploadFile(filename, uploadsDir);
    if (filePath) return { kind: "file", path: filePath };
    const fallback = uploadUrlFallback(filename);
    if (fallback) {
      logger.warn({ src, filename, via: fallback.url }, "PDF render: upload missing on disk — trying HTTP");
      return fallback;
    }
    logger.warn({ src, filename }, "PDF render: upload file missing on disk");
    return null;
  }

  const designMatch = pathname.match(/\/designs\/([^/]+)$/i);
  if (designMatch) {
    const file = decodeURIComponent(designMatch[1]);
    const found = findDesignAssetFile(file);
    if (found) return { kind: "file", path: found };
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
): Promise<Map<string, Image | Canvas>> {
  const cache = new Map<string, Image | Canvas>();
  const jobs = elements
    .filter((e) => (e.type === "image" || e.type === "background") && e.src)
    .map(async (e) => {
      const src = e.src!;
      if (cache.has(src)) return;
      try {
        const resolved = resolveImageSource(src, uploadsDir);
        if (!resolved) return;
        let img: Image | Canvas = resolved.kind === "file"
          ? await loadImage(resolved.path)
          : await loadImage(resolved.url);
        if (isLandmarkPng(src)) img = knockOutBlack(img as Image);
        cache.set(src, img);
      } catch (err) {
        logger.warn({ err, src }, "PDF render: failed to load page image");
      }
    });
  await Promise.all(jobs);
  return cache;
}

/** Locked endpapers — grey hatch + bilingual label (no user content). */
function paintLockedLiningPage(
  ctx: ReturnType<Canvas["getContext"]>,
  canvasH: number,
  role: string,
): void {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, DESIGN_W, canvasH);

  ctx.save();
  ctx.strokeStyle = "rgba(120,120,120,0.14)";
  ctx.lineWidth = 1;
  const step = 14;
  // 45° hatch across the page
  for (let x = -canvasH; x < DESIGN_W + canvasH; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + canvasH, canvasH);
    ctx.stroke();
  }
  ctx.restore();

  const isBack = role === "locked_right" || role === "inside_back_cover";
  // Print both languages so SQ/EN orders share one plate.
  const titleSq = isBack ? "Kopertina e pasme e brendshme" : "Kopertina e brendshme";
  const titleEn = isBack ? "Inside back cover" : "Inside cover";

  ctx.fillStyle = "rgba(90,90,90,0.55)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(DESIGN_W * 0.035)}px "DejaVu Serif", Georgia, serif`;
  ctx.fillText(titleSq, DESIGN_W / 2, canvasH / 2 - DESIGN_W * 0.03);
  ctx.font = `${Math.round(DESIGN_W * 0.028)}px "DejaVu Sans", Arial, sans-serif`;
  ctx.fillStyle = "rgba(120,120,120,0.45)";
  ctx.fillText(titleEn, DESIGN_W / 2, canvasH / 2 + DESIGN_W * 0.02);
  ctx.font = `${Math.round(DESIGN_W * 0.022)}px "DejaVu Sans", Arial, sans-serif`;
  ctx.fillStyle = "rgba(140,140,140,0.4)";
  ctx.fillText("E bllokuar  ·  Not editable", DESIGN_W / 2, canvasH / 2 + DESIGN_W * 0.065);
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
  // Map the editor canvas (DESIGN_W × canvasH) onto the physical page pixels.
  ctx.scale(outW / DESIGN_W, outH / Math.max(1, canvasH));

  ctx.fillStyle = PAPER_COLOR;
  ctx.fillRect(0, 0, DESIGN_W, canvasH);

  if (
    page.role === "locked_left"
    || page.role === "locked_right"
    || page.role === "inside_cover"
    || page.role === "inside_back_cover"
  ) {
    paintLockedLiningPage(ctx, canvasH, page.role);
    return canvas;
  }

  const images = await loadPageImages(page.elements, uploadsDir);

  // Backgrounds first so a misplaced full-page fill never covers photos/text.
  const paintOrder = [...page.elements].sort((a, b) => {
    const rank = (t?: string) => (t === "background" ? 0 : t === "placeholder" ? 1 : 2);
    return rank(a.type) - rank(b.type);
  });

  for (const el of paintOrder) {
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
          el.cropZoom ?? 1,
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
        // Inner / content pages: empty margins are always white (never category cream).
        // Covers keep their intentional solid plate color.
        ctx.fillStyle = isCoverRole(page.role) ? (el.bgColor || PAPER_COLOR) : PAPER_COLOR;
        ctx.fillRect(0, 0, DESIGN_W, canvasH);
      }
    } else if (el.type === "shape") {
      const d = shapePathForElement(el.shapeKind, el.w, el.h, el.cornerRadius);
      const strokeOnly = isStrokeOnlyShape(el.shapeKind);
      ctx.save();
      ctx.translate(el.x, el.y);
      try {
        const path = new Path2D(d);
        if (!strokeOnly && el.fill && el.fill !== "transparent") {
          ctx.fillStyle = el.fill;
          ctx.fill(path, "evenodd");
        }
        if (el.strokeColor && (el.strokeWidth ?? 0) > 0) {
          ctx.strokeStyle = el.strokeColor;
          ctx.lineWidth = el.strokeWidth!;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          if (el.strokeDash?.length) ctx.setLineDash(el.strokeDash);
          ctx.stroke(path);
          ctx.setLineDash([]);
        } else if (strokeOnly) {
          ctx.strokeStyle = el.strokeColor || el.fill || "#1A1A1A";
          ctx.lineWidth = Math.max(2, el.strokeWidth ?? 3);
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.stroke(path);
        }
      } catch {
        // Fallback for odd paths — keep print from dying on a decoration.
        if (el.fill && el.fill !== "transparent") {
          ctx.fillStyle = el.fill;
          ctx.fillRect(0, 0, el.w, el.h);
        }
      }
      ctx.restore();
    } else if (el.type === "image" && el.src) {
      const img = images.get(el.src);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(el.x, el.y, el.w, el.h);
        ctx.clip();
        if (coverImageLetterbox(el)) {
          // Letterbox gaps inside the frame stay white.
          ctx.fillStyle = PAPER_COLOR;
          ctx.fillRect(el.x, el.y, el.w, el.h);
          const fit = Math.min(
            el.w / Math.max(1, img.width),
            el.h / Math.max(1, img.height),
          );
          const dw = img.width * fit;
          const dh = img.height * fit;
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
            el.cropZoom ?? 1,
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
        // Missing upload/icon — leave paper showing. The old beige #D8D0C4 plate
        // looked like a broken cover when a large photo/icon frame failed to load.
        logger.warn(
          { src: el.src, sticker: !!el.sticker, objectFit: el.objectFit },
          "PDF render: image missing — skipping frame (no grey plate)",
        );
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
      const vAlign = el.verticalAlign || "top";
      const letterSpacing = el.letterSpacing ?? 0;

      const isBold = style.includes("bold");
      const isItalic = style.includes("italic");
      ctx.font = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}${fontSize}px "${family}"`;
      ctx.fillStyle = color;
      ctx.textBaseline = "top";

      // Slightly tighter max width than the editor can produce more wraps when
      // the print face is a fallback (DejaVu vs Google). Prefer showing every
      // line over chopping the last ones.
      const maxW = Math.max(1, el.w - pad * 2);
      const innerH = Math.max(0, el.h - pad * 2);
      const lines = wrapLines(ctx, el.text, maxW, letterSpacing);
      const lineH = fontSize * lh;
      const textH = lines.length * lineH;
      // Descenders / italic overhang / metric mismatch vs Konva.
      const bleedX = Math.max(4, Math.ceil(fontSize * 0.2));
      const bleedY = Math.max(4, Math.ceil(fontSize * 0.4));
      const neededH = Math.max(el.h, Math.ceil(textH + pad * 2 + bleedY));

      let startY = el.y + pad;
      if (vAlign === "middle") startY = el.y + pad + Math.max(0, (innerH - textH) / 2);
      if (vAlign === "bottom") startY = el.y + el.h - pad - textH;
      // When wrapped text is taller than the saved box, keep top alignment so
      // the start of the copy isn't pushed above the clip.
      if (textH > innerH && vAlign !== "top") startY = el.y + pad;

      ctx.save();
      ctx.beginPath();
      ctx.rect(el.x - bleedX, Math.min(el.y, startY) - 2, el.w + bleedX * 2, neededH + bleedY + 4);
      ctx.clip();

      for (const line of lines) {
        const lineW = measureLineWidth(ctx, line, letterSpacing);
        let x = el.x + pad;
        if (alignment === "center") x = el.x + (el.w - lineW) / 2;
        if (alignment === "right") x = el.x + el.w - pad - lineW;

        drawSpacedText(ctx, line, x, startY, letterSpacing);
        startY += lineH;
      }
      ctx.restore();
    } else if (el.type === "placeholder") {
      // Empty photo slots — white plate (matches print paper)
      ctx.fillStyle = PAPER_COLOR;
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

  // Raster pixels follow the physical book (cm × 300 DPI) so the JPEG and the
  // PDF page share the same aspect — no squash from a 3:4 canvas onto a square page.
  const { canvasH, outW, outH } = printRasterSize(bookWidthCm, bookHeightCm);

  // Keep inside covers in the file so duplex imposition matches the bound book
  // (front | lining | inners… | lining | back). Skipping them used to shift
  // every spread by one and print designed pages onto the wrong sheet.
  const toRender = sortPrintPages(pages);

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
    // One page at a time: a 21×28 cm @ 300 DPI RGBA canvas is ~33 MB native
    // memory (outside V8 heap / NODE_OPTIONS). Drop refs ASAP so GC can reclaim
    // before the next page — concurrent albums are capped separately.
    let canvas: Canvas | null = await renderPageToCanvas(page, outW, outH, canvasH, uploadsDir);
    const jpegBuffer = canvas.toBuffer("image/jpeg", { quality: PRINT_JPEG_QUALITY });
    canvas = null;
    const jpegImage = await pdf.embedJpg(jpegBuffer);
    const pdfPage = pdf.addPage([pageWidthPt, pageHeightPt]);
    pdfPage.drawImage(jpegImage, { x: 0, y: 0, width: pageWidthPt, height: pageHeightPt });

    await new Promise((r) => setImmediate(r));
  }

  const bytes = await pdf.save();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes);
}
