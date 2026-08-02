/**
 * PDF preview generator — renders each photobook page to an off-screen
 * Canvas 2D context (matching the Konva editor output), then assembles
 * all pages into a downloadable jsPDF document.
 */
// jsPDF is loaded dynamically so it never enters the initial editor bundle

// ── Must match Editor constants exactly ──────────────────────────────────────
const DESIGN_W   = 600;
const DESIGN_H   = 800; // 3:4 reference height — see getCanvasHeight()
const PAPER_COLOR = '#FEFDF9';

// Fallback PDF page size (3:4 ratio, 150×200mm) used only if no real book
// dimensions are supplied — callers should always pass the project's actual
// book size so the export matches its real physical dimensions/aspect ratio.
const FALLBACK_PDF_W_MM = 150;
const FALLBACK_PDF_H_MM = 200;

// Render scale — 2× gives ~1200px-wide output (good preview quality)
const SCALE = 2;

/** Mirrors designs.ts's getCanvasHeight() — kept local so this module has no
 *  dependency on the editor's design-data module. */
function getCanvasHeight(bookWidthCm?: number, bookHeightCm?: number): number {
  if (!bookWidthCm || !bookHeightCm) return DESIGN_H;
  return Math.round(DESIGN_W * (bookHeightCm / bookWidthCm));
}

// ── Types (subset of EditorElement) ─────────────────────────────────────────
export interface PdfElement {
  id: string;
  type: 'image' | 'text' | 'placeholder' | 'background' | 'shape';
  x: number; y: number; w: number; h: number;
  rotation?: number; opacity?: number;
  // background
  bgColor?: string;
  bgGradientFrom?: string; bgGradientTo?: string; bgGradientDir?: 'tb'|'lr'|'diag';
  // shape
  fill?: string; strokeColor?: string; strokeWidth?: number;
  strokeDash?: number[]; cornerRadius?: number; shapeKind?: string;
  // image
  src?: string;
  // text
  text?: string; fontSize?: number; fontFamily?: string; fontStyle?: string;
  align?: 'left'|'center'|'right'; lineHeight?: number; letterSpacing?: number;
}

export interface PdfPage {
  dbId: number;
  role: string;
  pageNumber?: number;
  elements: PdfElement[];
}

// ── Image loader (with crossOrigin) ─────────────────────────────────────────
const imgCache = new Map<string, HTMLImageElement>();

function loadImg(src: string): Promise<HTMLImageElement> {
  if (imgCache.has(src)) return Promise.resolve(imgCache.get(src)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgCache.set(src, img); resolve(img); };
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

// ── Rounded-rect path helper ─────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
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

// ── Simple word-wrap ─────────────────────────────────────────────────────────
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const paragraphs = text.split('\n');
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(' ');
    let line = '';
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

// ── Render one page to a JPEG data-URL ──────────────────────────────────────
async function renderPage(elements: PdfElement[], canvasH: number): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width  = DESIGN_W * SCALE;
  canvas.height = canvasH * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // Paper base
  ctx.fillStyle = PAPER_COLOR;
  ctx.fillRect(0, 0, DESIGN_W, canvasH);

  // Pre-load all images on this page in parallel
  await Promise.allSettled(
    elements.filter(e => e.type === 'image' && e.src).map(e => loadImg(e.src!))
  );

  for (const el of elements) {
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;

    // Rotate around element centre
    if (el.rotation) {
      ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-(el.x + el.w / 2), -(el.y + el.h / 2));
    }

    // ── Background ─────────────────────────────────────────────────────────
    if (el.type === 'background') {
      if (el.bgGradientFrom) {
        const ex = el.bgGradientDir === 'lr'   ? DESIGN_W :
                   el.bgGradientDir === 'diag'  ? DESIGN_W : 0;
        const ey = el.bgGradientDir === 'lr'   ? 0 :
                   el.bgGradientDir === 'diag'  ? canvasH : canvasH;
        const grad = ctx.createLinearGradient(0, 0, ex, ey);
        grad.addColorStop(0, el.bgGradientFrom);
        grad.addColorStop(1, el.bgGradientTo || '#fff');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = el.bgColor || PAPER_COLOR;
      }
      ctx.fillRect(0, 0, DESIGN_W, canvasH);
    }

    // ── Shape ──────────────────────────────────────────────────────────────
    else if (el.type === 'shape') {
      const cr = el.shapeKind === 'circle'
        ? Math.min(el.w, el.h) / 2
        : (el.cornerRadius ?? 0);

      if (cr > 0) {
        roundRect(ctx, el.x, el.y, el.w, el.h, cr);
      } else {
        ctx.beginPath();
        ctx.rect(el.x, el.y, el.w, el.h);
      }

      if (el.fill && el.fill !== 'transparent') {
        ctx.fillStyle = el.fill;
        ctx.fill();
      }
      if (el.strokeColor && (el.strokeWidth ?? 0) > 0) {
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth   = el.strokeWidth!;
        if (el.strokeDash?.length) ctx.setLineDash(el.strokeDash);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ── Image ──────────────────────────────────────────────────────────────
    else if (el.type === 'image' && el.src) {
      const img = imgCache.get(el.src);
      if (img) {
        // object-fit: cover crop
        const sx = el.w / img.naturalWidth;
        const sy = el.h / img.naturalHeight;
        const s  = Math.max(sx, sy);
        const cw = el.w / s;
        const ch = el.h / s;
        const cx = (img.naturalWidth  - cw) / 2;
        const cy = (img.naturalHeight - ch) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(el.x, el.y, el.w, el.h);
        ctx.clip();
        ctx.drawImage(img, cx, cy, cw, ch, el.x, el.y, el.w, el.h);
        ctx.restore();
      } else {
        // Fallback: warm placeholder
        ctx.fillStyle = '#D8D0C4';
        ctx.fillRect(el.x, el.y, el.w, el.h);
      }
    }

    // ── Text ───────────────────────────────────────────────────────────────
    else if (el.type === 'text' && el.text) {
      const pad       = 6;
      const fontSize  = el.fontSize  ?? 20;
      const lh        = el.lineHeight ?? 1.2;
      const family    = el.fontFamily ?? 'Georgia, serif';
      const style     = el.fontStyle  ?? 'normal';
      const color     = el.fill       ?? '#1a1a1a';
      const alignment = el.align      ?? 'center';

      // Build Canvas font string
      const isBold   = style.includes('bold');
      const isItalic = style.includes('italic');
      const fontStr  = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px ${family}`;
      ctx.font         = fontStr;
      ctx.fillStyle    = color;
      ctx.textBaseline = 'top';

      if (el.letterSpacing) ctx.letterSpacing = `${el.letterSpacing}px`;

      const maxW = el.w - pad * 2;
      const lines = wrapLines(ctx, el.text, maxW);
      const lineH = fontSize * lh;

      // Clip to element bounds
      ctx.save();
      ctx.beginPath();
      ctx.rect(el.x, el.y, el.w, el.h);
      ctx.clip();

      let startY = el.y + pad;
      for (const line of lines) {
        let x = el.x + pad;
        if (alignment === 'center') x = el.x + el.w / 2 - ctx.measureText(line).width / 2;
        if (alignment === 'right')  x = el.x + el.w - pad - ctx.measureText(line).width;
        ctx.fillText(line, x, startY);
        startY += lineH;
        if (startY > el.y + el.h) break;
      }
      ctx.restore();
      ctx.letterSpacing = '0px';
    }

    // Placeholders: render as empty warm box so PDF looks intentional
    else if (el.type === 'placeholder') {
      ctx.fillStyle = '#EDE8E0';
      ctx.fillRect(el.x, el.y, el.w, el.h);
    }

    ctx.restore();
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function generatePDF(
  pages: PdfPage[],
  title: string,
  onProgress?: (current: number, total: number) => void,
  bookSize?: { widthCm?: number; heightCm?: number },
): Promise<void> {
  // Include all pages except the locked inside cover
  const ordered = [...pages].sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
  const toRender = ordered.filter(p => p.role !== 'locked_left' && p.role !== 'locked_right');

  // Physical PDF page size follows the project's real book dimensions
  // (cm → mm) instead of a fixed 3:4 fallback, so square/other-ratio books
  // export at their correct, undistorted size.
  const pdfWMm = bookSize?.widthCm ? bookSize.widthCm * 10 : FALLBACK_PDF_W_MM;
  const pdfHMm = bookSize?.heightCm ? bookSize.heightCm * 10 : FALLBACK_PDF_H_MM;
  const canvasH = getCanvasHeight(bookSize?.widthCm, bookSize?.heightCm);

  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWMm, pdfHMm],
  });

  for (let i = 0; i < toRender.length; i++) {
    onProgress?.(i + 1, toRender.length);

    const dataURL = await renderPage(toRender[i].elements, canvasH);

    if (i > 0) pdf.addPage([pdfWMm, pdfHMm], 'portrait');
    pdf.addImage(dataURL, 'JPEG', 0, 0, pdfWMm, pdfHMm);
  }

  const filename = `${(title || 'album').replace(/[^a-z0-9_\-]/gi, '_')}.pdf`;
  pdf.save(filename);
}
