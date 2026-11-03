import type { CSSProperties } from 'react';
import type { ShapeKind } from './shapes';

// ─────────────────────────────────────────────────────────────────────────────
// Shared design & layout data — single source of truth for Editor.tsx,
// Wizard.tsx (design picker), and any other design-preview surface.
// Do NOT duplicate this data elsewhere; import from here so previews always
// match what actually gets applied to a photobook.
// ─────────────────────────────────────────────────────────────────────────────

// Reference authoring canvas — every built-in DESIGNS/LAYOUTS entry below is
// hand-placed against this 600×800 (3:4) box. DESIGN_W never changes across
// book sizes (it's the fixed "logical" canvas width); DESIGN_H is the
// reference *height* for a 3:4 book specifically. For any other book aspect
// ratio, use `getCanvasHeight()` to get the correct per-project canvas
// height, and `scaleElementsToCanvas()` to re-project reference-authored
// elements (from DESIGNS/LAYOUTS) onto it without distortion.
export const DESIGN_W = 600;
export const DESIGN_H = 800;
export const PAPER_COLOR = '#FEFDF9';

/** Axis-aligned bounds of a rect rotated around its top-left (Konva default). */
export function rotatedRectAabb(
  x: number, y: number, w: number, h: number, rotationDeg = 0,
): { x: number; y: number; w: number; h: number } {
  const rad = ((rotationDeg || 0) * Math.PI) / 180;
  if (!rad) return { x, y, w, h };
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const xs = [0, w, w, 0].map((px, i) => x + px * cos - [0, 0, h, h][i] * sin);
  const ys = [0, w, w, 0].map((px, i) => y + px * sin + [0, 0, h, h][i] * cos);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Options for page clamping — overflow lets frames hang off / grow past the page. */
export type ClampPosOpts = {
  /** Allow the frame to extend past page edges (still keeps a sliver on-page). */
  allowOverflow?: boolean;
  /** Minimum on-page overlap in design px when allowOverflow is set (default 48). */
  minOverlap?: number;
};

/** Keep an element's frame on the album page (drag). */
export function clampElementPos(
  pos: { x: number; y: number },
  w: number,
  h: number,
  canvasH: number,
  rotation = 0,
  opts?: ClampPosOpts,
): { x: number; y: number } {
  const pageH = canvasH > 0 ? canvasH : DESIGN_H;

  // Soft clamp: frame may hang off / be larger than the page, but a strip stays
  // selectable on the artboard (album builder free photos & stickers).
  if (opts?.allowOverflow) {
    const aabb = rotation
      ? rotatedRectAabb(pos.x, pos.y, w, h, rotation)
      : { x: pos.x, y: pos.y, w, h };
    const minO = Math.max(8, opts.minOverlap ?? 48);
    const ox = Math.min(minO, aabb.w, DESIGN_W);
    const oy = Math.min(minO, aabb.h, pageH);
    let dx = 0;
    let dy = 0;
    const minX = ox - aabb.w;
    const maxX = DESIGN_W - ox;
    const minY = oy - aabb.h;
    const maxY = pageH - oy;
    if (aabb.x < minX) dx = minX - aabb.x;
    else if (aabb.x > maxX) dx = maxX - aabb.x;
    if (aabb.y < minY) dy = minY - aabb.y;
    else if (aabb.y > maxY) dy = maxY - aabb.y;
    return { x: pos.x + dx, y: pos.y + dy };
  }

  if (!rotation) {
    return {
      x: Math.min(Math.max(pos.x, 0), Math.max(0, DESIGN_W - w)),
      y: Math.min(Math.max(pos.y, 0), Math.max(0, pageH - h)),
    };
  }
  const aabb = rotatedRectAabb(pos.x, pos.y, w, h, rotation);
  let dx = 0;
  let dy = 0;
  if (aabb.w <= DESIGN_W) {
    if (aabb.x < 0) dx = -aabb.x;
    else if (aabb.x + aabb.w > DESIGN_W) dx = DESIGN_W - aabb.x - aabb.w;
  } else {
    dx = -aabb.x;
  }
  if (aabb.h <= pageH) {
    if (aabb.y < 0) dy = -aabb.y;
    else if (aabb.y + aabb.h > pageH) dy = pageH - aabb.y - aabb.h;
  } else {
    dy = -aabb.y;
  }
  return { x: pos.x + dx, y: pos.y + dy };
}

export type KonvaPoint = { x: number; y: number };

type KonvaAbsTransform = {
  copy: () => { invert: () => { point: (p: KonvaPoint) => KonvaPoint } };
  point: (p: KonvaPoint) => KonvaPoint;
};

type KonvaDragNode = {
  getParent?: () => { getAbsoluteTransform?: () => KonvaAbsTransform } | null | undefined;
  getStage?: () => { scaleX?: () => number; scaleY?: () => number } | null | undefined;
  getLayer?: () => { x?: () => number; y?: () => number } | null | undefined;
  getAbsolutePosition?: () => KonvaPoint;
};

function parentAbsTransform(node?: KonvaDragNode | null): KonvaAbsTransform | null {
  const tr = node?.getParent?.()?.getAbsoluteTransform?.();
  if (!tr?.copy || !tr.point) return null;
  return tr;
}

function finitePoint(p: KonvaPoint | null | undefined): p is KonvaPoint {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
}

/** Konva 10 `dragBoundFunc` positions are stage-absolute, not page-local. */
export function konvaAbsToLocal(node: KonvaDragNode | null | undefined, absPos: KonvaPoint): KonvaPoint {
  const stage = node?.getStage?.();
  const layer = node?.getLayer?.();
  if (stage?.scaleX && layer?.x) {
    const sx = stage.scaleX() || 1;
    const sy = (stage.scaleY?.() || sx) || 1;
    return {
      x: absPos.x / sx - (layer.x?.() || 0),
      y: absPos.y / sy - (layer.y?.() || 0),
    };
  }
  const tr = parentAbsTransform(node);
  return tr ? tr.copy().invert().point(absPos) : absPos;
}

export function konvaLocalToAbs(node: KonvaDragNode | null | undefined, local: KonvaPoint): KonvaPoint {
  const stage = node?.getStage?.();
  const layer = node?.getLayer?.();
  if (stage?.scaleX && layer?.x) {
    const sx = stage.scaleX() || 1;
    const sy = (stage.scaleY?.() || sx) || 1;
    return {
      x: (local.x + (layer.x?.() || 0)) * sx,
      y: (local.y + (layer.y?.() || 0)) * sy,
    };
  }
  const tr = parentAbsTransform(node);
  return tr ? tr.point(local) : local;
}

export function clampKonvaDragAbs(
  node: KonvaDragNode | null | undefined,
  absPos: KonvaPoint,
  w: number,
  h: number,
  canvasH: number,
  rotation = 0,
  opts?: ClampPosOpts,
): KonvaPoint {
  if (!finitePoint(absPos)) {
    const fallback = node?.getAbsolutePosition?.();
    return finitePoint(fallback) ? fallback : { x: 0, y: 0 };
  }
  const local = konvaAbsToLocal(node, absPos);
  if (!finitePoint(local)) {
    const fallback = node?.getAbsolutePosition?.();
    return finitePoint(fallback) ? fallback : absPos;
  }
  const clamped = clampElementPos(local, w, h, canvasH, rotation, opts);
  const abs = konvaLocalToAbs(node, clamped);
  return finitePoint(abs) ? abs : absPos;
}

/** Keep saved/editor positions finite and on-page after a gesture. */
export function sanitizeElementPos(
  pos: { x: number; y: number },
  w: number,
  h: number,
  canvasH: number,
  rotation = 0,
): { x: number; y: number } {
  const safe = {
    x: Number.isFinite(pos.x) ? pos.x : 0,
    y: Number.isFinite(pos.y) ? pos.y : 0,
  };
  return clampElementPos(safe, Math.max(1, w || 1), Math.max(1, h || 1), canvasH, rotation);
}

/** Transformer `boundBoxFunc` boxes are in stage pixels (scale + layer offset). */
export function pageBoxFromStageBox<T extends { x: number; y: number; width: number; height: number }>(
  box: T,
  scaleX: number,
  layerX: number,
  layerY: number,
  scaleY = scaleX,
): T {
  const sx = scaleX || 1;
  const sy = scaleY || 1;
  return {
    ...box,
    x: box.x / sx - layerX,
    y: box.y / sy - layerY,
    width: box.width / sx,
    height: box.height / sy,
  };
}

export function stageBoxFromPageBox<T extends { x: number; y: number; width: number; height: number }>(
  box: T,
  scaleX: number,
  layerX: number,
  layerY: number,
  scaleY = scaleX,
): T {
  const sx = scaleX || 1;
  const sy = scaleY || 1;
  return {
    ...box,
    x: (box.x + layerX) * sx,
    y: (box.y + layerY) * sy,
    width: box.width * sx,
    height: box.height * sy,
  };
}

export type PageBoundBox = {
  x: number; y: number; width: number; height: number; rotation?: number;
};

/** Keep a Konva transformer box on the album page (resize). */
export function boundBoxToPage(
  oldBox: PageBoundBox,
  newBox: PageBoundBox,
  canvasH: number,
  minW: number,
  minH: number,
  opts?: ClampPosOpts,
): PageBoundBox {
  if (newBox.width < minW || newBox.height < minH) return oldBox;
  const pageH = canvasH > 0 ? canvasH : DESIGN_H;
  const rot = newBox.rotation || 0;

  // Free photos / stickers: grow past the page and hang off edges.
  if (opts?.allowOverflow) {
    const maxEdge = Math.max(DESIGN_W, pageH) * 4;
    const width = Math.min(Math.max(newBox.width, minW), maxEdge);
    const height = Math.min(Math.max(newBox.height, minH), maxEdge);
    const pos = clampElementPos(
      { x: newBox.x, y: newBox.y },
      width,
      height,
      canvasH,
      rot,
      opts,
    );
    return { ...newBox, x: pos.x, y: pos.y, width, height };
  }

  if (rot) {
    const aabb = rotatedRectAabb(newBox.x, newBox.y, newBox.width, newBox.height, rot);
    const ok = aabb.x >= -0.5 && aabb.y >= -0.5
      && aabb.x + aabb.w <= DESIGN_W + 0.5
      && aabb.y + aabb.h <= pageH + 0.5;
    return ok ? newBox : oldBox;
  }
  let x = newBox.x;
  let y = newBox.y;
  let width = Math.min(Math.max(newBox.width, minW), DESIGN_W);
  let height = Math.min(Math.max(newBox.height, minH), pageH);
  if (x < 0) {
    width = Math.max(minW, Math.min(width + x, DESIGN_W));
    x = 0;
  }
  if (y < 0) {
    height = Math.max(minH, Math.min(height + y, pageH));
    y = 0;
  }
  if (x + width > DESIGN_W) width = Math.max(minW, DESIGN_W - x);
  if (y + height > pageH) height = Math.max(minH, pageH - y);
  if (x + width > DESIGN_W) x = Math.max(0, DESIGN_W - width);
  if (y + height > pageH) y = Math.max(0, pageH - height);
  return { ...newBox, x, y, width, height };
}

/** Matches KonvaText `padding={6}` in the album / studio editors. */
const ADDED_TEXT_PAD = 6;

/**
 * Default frame for a newly added text block: hug the glyphs with a small
 * slack so the transformer is usable, instead of a near-full-page rectangle.
 */
export function fitAddedTextFrame(opts: {
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontStyle?: string;
  letterSpacing?: number;
  lineHeight?: number;
  maxWidth?: number;
}): { w: number; h: number } {
  const fs = Math.max(8, Number(opts.fontSize) || 20);
  const lh = opts.lineHeight ?? 1.2;
  const family = opts.fontFamily || 'Georgia, serif';
  const style = opts.fontStyle || 'normal';
  const ls = opts.letterSpacing || 0;
  const text = opts.text || ' ';
  const lines = text.split('\n');
  let maxLine = fs * 0.58 * Math.max(...lines.map((l) => [...l].length), 1);
  if (typeof document !== 'undefined') {
    try {
      const ctx = document.createElement('canvas').getContext('2d');
      if (ctx) {
        ctx.font = `${style} ${fs}px ${family}`;
        maxLine = Math.max(
          ...lines.map((line) => {
            if (!line) return 0;
            if (!ls) return ctx.measureText(line).width;
            let w = 0;
            const chars = [...line];
            for (let i = 0; i < chars.length; i++) {
              w += ctx.measureText(chars[i]).width;
              if (i < chars.length - 1) w += ls;
            }
            return w;
          }),
          0,
        );
      }
    } catch {
      /* keep fallback */
    }
  }
  const pad = ADDED_TEXT_PAD * 2;
  const slackX = Math.max(8, Math.round(fs * 0.28));
  const slackY = Math.max(2, Math.round(fs * 0.12));
  const maxW = opts.maxWidth ?? DESIGN_W - 24;
  return {
    w: Math.min(maxW, Math.max(40, Math.ceil(maxLine + pad + slackX))),
    h: Math.max(24, Math.ceil(lines.length * fs * lh + pad + slackY)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-book canvas geometry — see file header. Elements are always authored/
// stored in absolute "canvas pixels" (x,y,w,h in canvas units, not 0-1
// fractions), exactly like before this feature existed. The one thing that
// changes per project is the canvas *height*: DESIGN_W(600) is pinned so
// widths/x-positions/font sizes never need rescaling, while the canvas
// height is derived from the book's real aspect ratio so content is never
// stretched. A 3:4 book (the original/only supported ratio) yields
// canvasH === DESIGN_H, so existing 3:4 projects are pixel-identical.
// ─────────────────────────────────────────────────────────────────────────────

/** Canvas height (in the same units as DESIGN_W/DESIGN_H) for a book of the
 *  given real-world dimensions. Falls back to the 3:4 reference height if
 *  dimensions are missing/invalid. */
export function getCanvasHeight(bookWidthCm?: number | null, bookHeightCm?: number | null): number {
  if (!bookWidthCm || !bookHeightCm) return DESIGN_H;
  return Math.round(DESIGN_W * (bookHeightCm / bookWidthCm));
}

/** Re-projects elements authored against the reference 3:4 canvas
 *  (DESIGN_W × DESIGN_H) onto a project's actual canvas height. Only y/h
 *  (and other height-relative measurements) change — x/w and all "size"
 *  scalars (fontSize, strokeWidth, cornerRadius, letterSpacing) are already
 *  relative to the invariant DESIGN_W, so they carry over unchanged. A
 *  canvasH equal to DESIGN_H (the common 3:4 case) is a no-op. */
export function scaleElementsToCanvas<T extends { y: number; h: number }>(
  elements: T[],
  canvasH: number,
): T[] {
  if (canvasH === DESIGN_H) return elements;
  const k = canvasH / DESIGN_H;
  return elements.map(el => ({ ...el, y: el.y * k, h: el.h * k }));
}

type FitDesignEl = {
  type?: string;
  x: number; y: number; w: number; h: number;
  fontSize?: number;
  strokeWidth?: number;
  letterSpacing?: number;
  cornerRadius?: number;
};

/**
 * Place a 3:4 admin design onto any book canvas without cropping or squash.
 * Backgrounds stay full-bleed. Everything else is uniformly contain-fitted
 * and centered (square 21×21 gets side margins instead of a clipped cover).
 */
export function fitDesignToCanvas<T extends FitDesignEl>(
  elements: T[],
  canvasH: number,
): T[] {
  const targetH = Math.max(1, canvasH);
  const k = Math.min(1, targetH / DESIGN_H);
  const ox = (DESIGN_W - DESIGN_W * k) / 2;
  const oy = (targetH - DESIGN_H * k) / 2;
  return elements.map((el) => {
    if (el.type === 'background') {
      return { ...el, x: 0, y: 0, w: DESIGN_W, h: targetH };
    }
    const next: T = {
      ...el,
      x: ox + el.x * k,
      y: oy + el.y * k,
      w: el.w * k,
      h: el.h * k,
    };
    if (el.fontSize != null) next.fontSize = el.fontSize * k;
    if (el.strokeWidth != null) next.strokeWidth = el.strokeWidth * k;
    if (el.letterSpacing != null) next.letterSpacing = el.letterSpacing * k;
    if (el.cornerRadius != null) next.cornerRadius = el.cornerRadius * k;
    return next;
  });
}

/** Inverse of fitDesignToCanvas — map a live book canvas back to 3:4. */
export function unfitDesignFromCanvas<T extends FitDesignEl>(
  elements: T[],
  canvasH: number,
): T[] {
  const fromH = Math.max(1, canvasH);
  if (fromH === DESIGN_H) {
    return elements.map((el) => (
      el.type === 'background' ? { ...el, x: 0, y: 0, w: DESIGN_W, h: DESIGN_H } : el
    ));
  }
  const k = Math.min(1, fromH / DESIGN_H) || 1;
  const ox = (DESIGN_W - DESIGN_W * k) / 2;
  const oy = (fromH - DESIGN_H * k) / 2;
  return elements.map((el) => {
    if (el.type === 'background') {
      return { ...el, x: 0, y: 0, w: DESIGN_W, h: DESIGN_H };
    }
    const next: T = {
      ...el,
      x: (el.x - ox) / k,
      y: (el.y - oy) / k,
      w: el.w / k,
      h: el.h / k,
    };
    if (el.fontSize != null) next.fontSize = el.fontSize / k;
    if (el.strokeWidth != null) next.strokeWidth = el.strokeWidth / k;
    if (el.letterSpacing != null) next.letterSpacing = el.letterSpacing / k;
    if (el.cornerRadius != null) next.cornerRadius = el.cornerRadius / k;
    return next;
  });
}

/** Re-project absolute canvas elements between two heights (same DESIGN_W). */
export function reprojectCanvasElements<T extends { y: number; h: number }>(
  elements: T[],
  fromH: number,
  toH: number,
): T[] {
  if (!fromH || !toH || fromH === toH) return elements;
  const k = toH / fromH;
  return elements.map(el => ({ ...el, y: el.y * k, h: el.h * k }));
}

// ─────────────────────────────────────────────────────────────────────────────

export interface EditorElement {
  id: string;
  type: 'image' | 'text' | 'placeholder' | 'background' | 'shape';
  x: number; y: number; w: number; h: number; rotation: number;
  opacity?: number;
  src?: string;
  /** Cover-crop focus 0–1 (0.5 = centered). Lets users pan a photo inside its frame. */
  cropFocusX?: number;
  cropFocusY?: number;
  /**
   * Zoom past exact cover-fit (≥1). 1 = fill the frame with no extra zoom.
   * Users can raise this in Adjust; we never force 120%.
   */
  cropZoom?: number;
  /**
   * Layout / structure photo slot. The frame stays put; the bitmap pans and
   * zooms only inside that box.
   */
  slotLocked?: boolean;
  /** How the bitmap fills its box — landmark cutouts use `contain`. */
  objectFit?: 'cover' | 'contain';
  /** Admin PNG/JPG decoration — move/scale only, never photo-crop. */
  sticker?: boolean;
  /**
   * CSS / canvas blend. Landmarks no longer use screen — black is knocked
   * out to alpha so the gold stays fully opaque.
   */
  mixBlendMode?: string;
  text?: string; fontSize?: number; fontFamily?: string;
  fill?: string; align?: 'left' | 'center' | 'right'; fontStyle?: string;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight?: number; letterSpacing?: number;
  bgColor?: string;
  bgGradientFrom?: string; bgGradientTo?: string; bgGradientDir?: 'tb' | 'lr' | 'diag';
  shapeKind?: ShapeKind;
  strokeColor?: string; strokeWidth?: number; strokeDash?: number[]; cornerRadius?: number;
}
export type DE = Omit<EditorElement, 'id'>;

/** object-fit: cover crop rect in source-image pixels, with optional focus (0–1) and zoom (≥1). */
export function coverCropRect(
  naturalW: number,
  naturalH: number,
  boxW: number,
  boxH: number,
  focusX = 0.5,
  focusY = 0.5,
  zoom = 1,
): { x: number; y: number; width: number; height: number; scale: number; maxX: number; maxY: number } {
  const z = Math.max(1, Number.isFinite(zoom) ? zoom : 1);
  const scale = Math.max(boxW / Math.max(1, naturalW), boxH / Math.max(1, naturalH)) * z;
  const width = boxW / scale;
  const height = boxH / scale;
  const maxX = Math.max(0, naturalW - width);
  const maxY = Math.max(0, naturalH - height);
  const fx = Math.min(1, Math.max(0, focusX));
  const fy = Math.min(1, Math.max(0, focusY));
  return {
    x: maxX * fx,
    y: maxY * fy,
    width,
    height,
    scale,
    maxX,
    maxY,
  };
}

/**
 * Cover-fit a photo into an editor image frame (display pixels).
 * Offsets are how far the image is shifted left/up so focus sits in-frame.
 * canPan is true when the photo overflows the frame on either axis.
 */
/** Minimum zoom so Adjust-photo can reach all four photo corners (2D pan). */
/** Optional extra zoom when the user wants 2D pan to every photo corner. */
export const PHOTO_CORNER_ZOOM = 1.2;

/**
 * Suggested zoom if the user asks for more pan travel. Floor is 1 (100% fit).
 * Never applied automatically on upload.
 */
export function minPhotoAdjustZoom(
  naturalW: number,
  naturalH: number,
  frameW: number,
  frameH: number,
): number {
  const nw = Math.max(1, naturalW);
  const nh = Math.max(1, naturalH);
  const fw = Math.max(1, frameW);
  const fh = Math.max(1, frameH);
  const coverScale = Math.max(fw / nw, fh / nh);
  const minOffX = Math.max(40, fw * 0.18);
  const minOffY = Math.max(40, fh * 0.18);
  const zX = (fw + minOffX) / (nw * coverScale);
  const zY = (fh + minOffY) / (nh * coverScale);
  return Math.max(1, zX, zY) * 1.0001;
}

/** Gold-on-black landmark cutouts only — other /designs PNGs stay fully opaque. */
export function isLandmarkPng(src?: string | null): boolean {
  return !!src && /\/designs\/(?:eiffel-tower|sagrada-familia)\.png(?:$|[?#])/i.test(src);
}

export function isLandmarkGraphic(el: { type?: string; src?: string; sticker?: boolean }): boolean {
  if (el.type !== 'image' || !el.src || el.sticker) return false;
  return isLandmarkPng(el.src);
}

/** Konva/CSS opacity. Omit 1 so clipped groups don't flatten through a buffer. */
export function konvaOpacity(opacity?: number): number | undefined {
  if (opacity == null || Number.isNaN(opacity)) return undefined;
  const n = opacity > 1 && opacity <= 100 ? opacity / 100 : opacity;
  if (n >= 0.999) return undefined;
  return Math.max(0, Math.min(1, n));
}

export function sanitizeImageBlend<T extends { src?: string; mixBlendMode?: string; objectFit?: string }>(el: T): T {
  if (el.mixBlendMode !== 'screen') return el;
  const next: T = { ...el, mixBlendMode: undefined };
  if (next.objectFit === 'contain' && !isLandmarkPng(el.src)) next.objectFit = 'cover';
  return next;
}

/** Screen-blend is no longer used on covers (it faded the gold). */
export function coverImageBlend(_el?: { src?: string; mixBlendMode?: string; sticker?: boolean }): 'screen' | undefined {
  return undefined;
}

export function coverImageLetterbox(el: { src?: string; objectFit?: string; mixBlendMode?: string }): boolean {
  return el.objectFit === 'contain' || isLandmarkPng(el.src);
}

/** Map near-black pixels to alpha so gold landmarks draw solid, not screened. */
export function applyBlackAsAlpha(data: Uint8ClampedArray | Uint8Array): void {
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.max(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = Math.round((data[i + 3] * lum) / 255);
  }
}

/**
 * Knock out near-black to alpha for landmark PNGs.
 * Caps working size so Design Studio does not allocate multi‑MB bitmaps.
 */
export function knockOutBlackToAlpha(
  img: HTMLImageElement,
  maxEdge = 1280,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  const c = document.createElement('canvas');
  c.width = dw;
  c.height = dh;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, dw, dh);
    const id = ctx.getImageData(0, 0, dw, dh);
    applyBlackAsAlpha(id.data);
    ctx.putImageData(id, 0, 0);
    return c;
  } catch {
    return null;
  }
}

/**
 * Builtin image srcs (landmarks, city photos, wallpapers) the admin removed.
 * Persisted so a redeploy cannot put them back.
 */
export function omittedLandmarkSrcs(
  saved: { type?: string; src?: string }[] | undefined,
  builtin: { type?: string; src?: string }[],
): string[] {
  const have = new Set((saved || []).map((e) => e.src).filter(Boolean) as string[]);
  return builtin
    .filter((e) => e.type === 'image' && e.src && !have.has(e.src))
    .map((e) => e.src as string);
}

export function restoreLandmarkGraphics<T extends { type?: string; src?: string; objectFit?: string; mixBlendMode?: string }>(
  saved: T[],
  builtin: T[],
  omitted: string[] = [],
): T[] {
  if (!Array.isArray(saved) || !saved.length) return saved;
  const skip = new Set(omitted.filter(Boolean));
  const bySrc = new Map(
    builtin.filter((e) => isLandmarkGraphic(e) && e.src).map((e) => [e.src as string, e]),
  );
  const withBlend = saved.map((el) => {
    const b = el.src ? bySrc.get(el.src) : undefined;
    if (!b) return sanitizeImageBlend(el);
    return sanitizeImageBlend({
      ...el,
      objectFit: el.objectFit || b.objectFit || 'contain',
    });
  });
  const srcs = new Set(withBlend.map((e) => e.src).filter(Boolean) as string[]);
  const extra = builtin.filter((e) => (
    isLandmarkGraphic(e) && e.src && !srcs.has(e.src) && !skip.has(e.src)
  ));
  if (!extra.length) return withBlend;
  const bg = withBlend.findIndex((e) => e.type === 'background');
  const at = bg >= 0 ? bg + 1 : 0;
  return [...withBlend.slice(0, at), ...extra, ...withBlend.slice(at)];
}

/**
 * Heal landmark PNGs that old saves dropped after a deploy — unless the admin
 * explicitly omitted them. Do NOT refill blank city-photo / wallpaper slots:
 * that undoes Design Studio deletes and custom wallpapers on every build.
 */
export function restoreCoverGraphics<T extends { type?: string; src?: string; objectFit?: string; mixBlendMode?: string }>(
  saved: T[],
  builtin: T[],
  omitted: string[] = [],
): T[] {
  return restoreLandmarkGraphics(saved, builtin, omitted);
}

export function imageFrameCoverFit(
  naturalW: number,
  naturalH: number,
  frameW: number,
  frameH: number,
  focusX = 0.5,
  focusY = 0.5,
  zoom = 1,
): {
  scale: number;
  iw: number;
  ih: number;
  maxOffX: number;
  maxOffY: number;
  offX: number;
  offY: number;
  canPan: boolean;
  focusX: number;
  focusY: number;
  zoom: number;
} {
  const z = Math.max(1, Number.isFinite(zoom) ? zoom : 1);
  const scale = Math.max(frameW / Math.max(1, naturalW), frameH / Math.max(1, naturalH)) * z;
  const iw = naturalW * scale;
  const ih = naturalH * scale;
  const maxOffX = Math.max(0, iw - frameW);
  const maxOffY = Math.max(0, ih - frameH);
  const fx = Math.min(1, Math.max(0, focusX));
  const fy = Math.min(1, Math.max(0, focusY));
  return {
    scale,
    iw,
    ih,
    maxOffX,
    maxOffY,
    offX: maxOffX * fx,
    offY: maxOffY * fy,
    canPan: maxOffX > 1 || maxOffY > 1,
    focusX: fx,
    focusY: fy,
    zoom: z,
  };
}

/** object-fit: contain — whole bitmap visible, letterboxed inside the frame. */
export function imageFrameContainFit(
  naturalW: number,
  naturalH: number,
  frameW: number,
  frameH: number,
): {
  scale: number;
  iw: number;
  ih: number;
  maxOffX: number;
  maxOffY: number;
  offX: number;
  offY: number;
  canPan: boolean;
  focusX: number;
  focusY: number;
} {
  const scale = Math.min(frameW / Math.max(1, naturalW), frameH / Math.max(1, naturalH));
  const iw = naturalW * scale;
  const ih = naturalH * scale;
  // Negative offs = inset from top-left (same sign convention as cover fit).
  const offX = -(frameW - iw) / 2;
  const offY = -(frameH - ih) / 2;
  return {
    scale,
    iw,
    ih,
    maxOffX: 0,
    maxOffY: 0,
    offX,
    offY,
    canPan: false,
    focusX: 0.5,
    focusY: 0.5,
  };
}

/** Clamp a dragged image offset back into cover-fit bounds and derive focus (0–1). */
export function imageFrameFocusFromOffset(
  offsetX: number,
  offsetY: number,
  maxOffX: number,
  maxOffY: number,
): { x: number; y: number; cropFocusX: number; cropFocusY: number } {
  const ox = Math.min(maxOffX, Math.max(0, -offsetX));
  const oy = Math.min(maxOffY, Math.max(0, -offsetY));
  return {
    x: ox ? -ox : 0,
    y: oy ? -oy : 0,
    cropFocusX: maxOffX <= 0 ? 0.5 : ox / maxOffX,
    cropFocusY: maxOffY <= 0 ? 0.5 : oy / maxOffY,
  };
}

export interface DesignDef {
  id: string; name: { sq: string; en: string }; category: string;
  thumb: CSSProperties;
  thumbAccents: CSSProperties[];
  /** Optional photo URL shown in the picker thumbnail only — doesn't affect what's applied to pages. */
  thumbPhoto?: string;
  /** Short label for lightweight picker thumbs (admin customs + metas). */
  thumbLabel?: string;
  /** Front cover elements (canonical). */
  elements: DE[];
  /** Back cover elements — when omitted, front `elements` are reused. */
  backElements?: DE[];
  /** Admin-created design (persisted in app settings). */
  isCustom?: boolean;
  /**
   * Builtin layout generation. Stored on Design Studio saves for history only —
   * a newer built-in rev must never discard a shop's saved covers.
   */
  layoutRev?: number;
  /**
   * Admin priority within its design category (lower = earlier / primary).
   * Persisted in app_settings.design_display — never wiped by seed/redeploy.
   */
  sortOrder?: number;
}

/** Admin-owned display meta (rename + order). Survives redeploys. */
export interface DesignDisplayEntry {
  name?: { sq: string; en: string };
  thumbLabel?: string;
  /** Lower = shows earlier in the category picker; 0 = primary. */
  sortOrder?: number;
}

export type DesignDisplayMap = Record<string, DesignDisplayEntry>;

export function parseDesignDisplay(raw: unknown): DesignDisplayMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: DesignDisplayMap = {};
  for (const [id, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!id || !entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    const meta: DesignDisplayEntry = {};
    if (e.name && typeof e.name === 'object' && !Array.isArray(e.name)) {
      const n = e.name as Record<string, unknown>;
      const en = String(n.en ?? '').trim();
      const sq = String(n.sq ?? '').trim();
      if (en || sq) meta.name = { en: en || sq, sq: sq || en };
    }
    if (typeof e.thumbLabel === 'string' && e.thumbLabel.trim()) {
      meta.thumbLabel = e.thumbLabel.trim();
    }
    if (typeof e.sortOrder === 'number' && Number.isFinite(e.sortOrder)) {
      meta.sortOrder = e.sortOrder;
    }
    if (meta.name || meta.thumbLabel != null || meta.sortOrder != null) {
      out[id] = meta;
    }
  }
  return out;
}

/** Apply rename / thumb / sortOrder onto catalog entries (does not reorder). */
export function applyDesignDisplay(
  designs: DesignDef[],
  display?: DesignDisplayMap | null,
): DesignDef[] {
  if (!display || !Object.keys(display).length) return designs;
  return designs.map((d) => {
    const meta = display[d.id];
    if (!meta) return d;
    return {
      ...d,
      name: meta.name ? { sq: meta.name.sq, en: meta.name.en } : d.name,
      thumbLabel: meta.thumbLabel != null ? meta.thumbLabel : d.thumbLabel,
      sortOrder: typeof meta.sortOrder === 'number' ? meta.sortOrder : d.sortOrder,
    };
  });
}

/**
 * Sort designs for a single category picker.
 * Explicit sortOrder first (ascending); ties keep stable catalog order.
 */
export function sortDesignsByPriority(designs: DesignDef[]): DesignDef[] {
  return designs
    .map((d, index) => ({ d, index }))
    .sort((a, b) => {
      const ao = typeof a.d.sortOrder === 'number' ? a.d.sortOrder : Number.POSITIVE_INFINITY;
      const bo = typeof b.d.sortOrder === 'number' ? b.d.sortOrder : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.index - b.index;
    })
    .map(({ d }) => d);
}

/** Rewrite sortOrder 0..n-1 for the given ordered ids (other ids untouched). */
export function withCategoryDesignOrder(
  display: DesignDisplayMap,
  orderedIds: string[],
): DesignDisplayMap {
  const next: DesignDisplayMap = { ...display };
  orderedIds.forEach((id, i) => {
    next[id] = { ...(next[id] || {}), sortOrder: i };
  });
  return next;
}

/** Patch name / thumbLabel for one design id. */
export function withDesignDisplayMeta(
  display: DesignDisplayMap,
  id: string,
  patch: Pick<DesignDisplayEntry, 'name' | 'thumbLabel'>,
): DesignDisplayMap {
  const prev = display[id] || {};
  const nextEntry: DesignDisplayEntry = { ...prev };
  if (patch.name) {
    const en = String(patch.name.en || '').trim();
    const sq = String(patch.name.sq || '').trim();
    if (en || sq) nextEntry.name = { en: en || sq, sq: sq || en };
  }
  if (patch.thumbLabel !== undefined) {
    const t = String(patch.thumbLabel || '').trim();
    if (t) nextEntry.thumbLabel = t;
    else delete nextEntry.thumbLabel;
  }
  return { ...display, [id]: nextEntry };
}

/** Shared rev for Travel builtins (Paris/Barcelona + city photo covers). */
export const TRAVEL_LAYOUT_REV = 11;
export interface LayoutZone { x:number; y:number; w:number; h:number; type:string; rotation?:number }
export interface LayoutDef { id:string; category:string; label:{sq:string;en:string}; zones:LayoutZone[] }

/**
 * Client screenshot (LAYOUT 1–4 FOTO): keep the unmarked thumbs + landscape
 * mockups. Red-X templates stay hidden even if they still exist in the DB.
 */
export const RETIRED_LAYOUT_IDS = new Set([
  // 1 foto — small letterbox / photo+text marked X
  'panoramic',
  'photo-cap',
  'cap-top',
  'photo-text-r',
  'quote',
  // 2 foto — inset / padded pairs marked X
  'two-h-pad',
  'two-v-pad',
  'two-h-inset',
  'two-portraits',
  'two-landscape',
  'two-v-7030',
  'two-v-3070',
  // 3 foto — mosaic / padded columns marked X
  'three-mid',
  'scatter-3',
  'asymm-3',
  'strips-3-uneven',
  'strips-3-focus',
  'land-2port-pad',
  'strips-3-pad',
  // 4 foto — 4 columns / 6-grid / padded grids marked X
  'cols-4',
  'grid4-topheavy',
  'grid4-pad',
  'strips-4-pad',
  'masonry-4',
  'gallery-5',
  'filmstrip-5',
  'grid-6',
  'mag',
  'text-2photos',
  'casual-toss-3',
  'casual-pile-4',
  'casual-strip-3',
  'casual-note-2',
]);

export const LAYOUTS: LayoutDef[] = [
  // LAYOUT 1 FOTO — large portraits (X = tiny landscape letterbox)
  { id:'full',           category:'1 Photo', label:{sq:'Foto e plotë',      en:'Full bleed'},        zones:[{x:0,y:0,w:1,h:1,type:'photo'}] },
  { id:'bordered-single',category:'1 Photo', label:{sq:'Me kufi',           en:'Bordered'},          zones:[{x:0.06,y:0.05,w:0.88,h:0.90,type:'photo'}] },
  { id:'portrait-center',category:'1 Photo', label:{sq:'Portret',           en:'Portrait'},          zones:[{x:0.12,y:0.08,w:0.76,h:0.84,type:'photo'}] },
  { id:'single-inset',   category:'1 Photo', label:{sq:'Kornizë',           en:'Framed'},            zones:[{x:0.16,y:0.12,w:0.68,h:0.76,type:'photo'}] },

  // LAYOUT 2 FOTO — full-bleed columns / stacked / 60-40 (X = padded inset)
  { id:'two-h',          category:'2 Photos', label:{sq:'2 Kolona',         en:'2 Columns'},         zones:[{x:0,y:0,w:0.487,h:1,type:'photo'},{x:0.513,y:0,w:0.487,h:1,type:'photo'}] },
  { id:'two-v',          category:'2 Photos', label:{sq:'2 Shtresa',        en:'2 Stacked'},         zones:[{x:0,y:0,w:1,h:0.487,type:'photo'},{x:0,y:0.513,w:1,h:0.487,type:'photo'}] },
  { id:'two-h-6040',     category:'2 Photos', label:{sq:'Gjerë + Ngushtë',  en:'Wide + Narrow'},     zones:[{x:0,y:0,w:0.60,h:1,type:'photo'},{x:0.62,y:0,w:0.38,h:1,type:'photo'}] },
  { id:'two-h-4060',     category:'2 Photos', label:{sq:'Ngushtë + Gjerë',  en:'Narrow + Wide'},     zones:[{x:0,y:0,w:0.38,h:1,type:'photo'},{x:0.40,y:0,w:0.60,h:1,type:'photo'}] },

  // LAYOUT 3 FOTO — 3 cols, 3 rows, 1+2, hero (X = mosaic)
  { id:'triptych',       category:'3 Photos', label:{sq:'3 Kolona',          en:'3 Columns'},         zones:[{x:0,y:0,w:0.316,h:1,type:'photo'},{x:0.342,y:0,w:0.316,h:1,type:'photo'},{x:0.684,y:0,w:0.316,h:1,type:'photo'}] },
  { id:'strips-3',       category:'3 Photos', label:{sq:'3 Shtresa',         en:'3 Strips'},          zones:[{x:0,y:0,w:1,h:0.316,type:'photo'},{x:0,y:0.342,w:1,h:0.316,type:'photo'},{x:0,y:0.684,w:1,h:0.316,type:'photo'}] },
  { id:'land-2port',     category:'3 Photos', label:{sq:'Sipër + 2',         en:'Top + 2 below'},     zones:[{x:0,y:0,w:1,h:0.487,type:'photo'},{x:0,y:0.513,w:0.487,h:0.487,type:'photo'},{x:0.513,y:0.513,w:0.487,h:0.487,type:'photo'}] },
  { id:'port-2land',     category:'3 Photos', label:{sq:'2 + Poshtë',        en:'2 top + Bottom'},    zones:[{x:0,y:0,w:0.487,h:0.487,type:'photo'},{x:0.513,y:0,w:0.487,h:0.487,type:'photo'},{x:0,y:0.513,w:1,h:0.487,type:'photo'}] },
  { id:'hero-l',         category:'3 Photos', label:{sq:'2 + Kryesore',      en:'2 left + Hero'},     zones:[{x:0,y:0,w:0.35,h:0.487,type:'photo'},{x:0,y:0.513,w:0.35,h:0.487,type:'photo'},{x:0.37,y:0,w:0.63,h:1,type:'photo'}] },
  { id:'hero-r',         category:'3 Photos', label:{sq:'Kryesore + 2',      en:'Hero + 2 right'},    zones:[{x:0,y:0,w:0.63,h:1,type:'photo'},{x:0.65,y:0,w:0.35,h:0.487,type:'photo'},{x:0.65,y:0.513,w:0.35,h:0.487,type:'photo'}] },
  { id:'tall-l-2r',      category:'3 Photos', label:{sq:'E gjatë + 2',       en:'Tall + 2 right'},    zones:[{x:0,y:0,w:0.55,h:1,type:'photo'},{x:0.57,y:0,w:0.43,h:0.487,type:'photo'},{x:0.57,y:0.513,w:0.43,h:0.487,type:'photo'}] },

  // LAYOUT 4 FOTO — 2×2, 4 strips, 1+3 (note: “shtoje te layout me 4 foto”)
  { id:'grid4',          category:'4 Photos', label:{sq:'Rrjetë 4',          en:'4 Grid'},            zones:[{x:0,y:0,w:0.487,h:0.487,type:'photo'},{x:0.513,y:0,w:0.487,h:0.487,type:'photo'},{x:0,y:0.513,w:0.487,h:0.487,type:'photo'},{x:0.513,y:0.513,w:0.487,h:0.487,type:'photo'}] },
  { id:'strips-4',       category:'4 Photos', label:{sq:'4 Shtresa',         en:'4 Strips'},          zones:[{x:0,y:0,w:1,h:0.235,type:'photo'},{x:0,y:0.255,w:1,h:0.235,type:'photo'},{x:0,y:0.510,w:1,h:0.235,type:'photo'},{x:0,y:0.765,w:1,h:0.235,type:'photo'}] },
  { id:'hero-3r',        category:'4 Photos', label:{sq:'Kryesore + 3',      en:'Hero + 3 right'},    zones:[{x:0,y:0,w:0.63,h:1,type:'photo'},{x:0.65,y:0,w:0.35,h:0.316,type:'photo'},{x:0.65,y:0.342,w:0.35,h:0.316,type:'photo'},{x:0.65,y:0.684,w:0.35,h:0.316,type:'photo'}] },
  { id:'hero-3l',        category:'4 Photos', label:{sq:'3 + Kryesore',      en:'3 left + Hero'},     zones:[{x:0,y:0,w:0.35,h:0.316,type:'photo'},{x:0,y:0.342,w:0.35,h:0.316,type:'photo'},{x:0,y:0.684,w:0.35,h:0.316,type:'photo'},{x:0.37,y:0,w:0.63,h:1,type:'photo'}] },
  { id:'top-3below',     category:'4 Photos', label:{sq:'Sipër + 3',         en:'Top + 3 below'},     zones:[{x:0,y:0,w:1,h:0.55,type:'photo'},{x:0,y:0.57,w:0.316,h:0.43,type:'photo'},{x:0.342,y:0.57,w:0.316,h:0.43,type:'photo'},{x:0.684,y:0.57,w:0.316,h:0.43,type:'photo'}] },
];

export const LAYOUT_CATEGORY_LABELS: Record<string, {sq: string; en: string}> = {
  '1 Photo':      { sq: '1 Foto',           en: '1 Photo'      },
  '2 Photos':     { sq: '2 Foto',            en: '2 Photos'     },
  '3 Photos':     { sq: '3 Foto',            en: '3 Photos'     },
  '4 Photos':     { sq: '4 Foto',            en: '4 Photos'     },
};

export const CATEGORY_LABELS: Record<string, {sq: string; en: string}> = {
  'Wedding':       { sq: 'Dasma',          en: 'Wedding'       },
  'Travel':        { sq: 'Udhëtime',       en: 'Travel'        },
  'Locations':     { sq: 'Vendndodhje',    en: 'Locations'     },
  'Baby & Family': { sq: 'Bebe & Familja', en: 'Baby & Family' },
  'Celebration':   { sq: 'Festime',        en: 'Celebration'   },
  'Friendship':    { sq: 'Miqësi',         en: 'Friendship'    },
  'Nature':        { sq: 'Natyrë',         en: 'Nature'        },
  'Modern':        { sq: 'Moderne',        en: 'Modern'        },
  'Portrait':      { sq: 'Portret',        en: 'Portrait'      },
};

// ─────────────────────────────────────────────────────────────────────────────
// Design helpers
// ─────────────────────────────────────────────────────────────────────────────

export const BG = (color: string, grad?: { from: string; to: string; dir: 'tb'|'lr'|'diag' }): DE =>
  ({ type:'background', x:0, y:0, w:DESIGN_W, h:DESIGN_H, rotation:0, bgColor:color,
     ...(grad ? { bgGradientFrom:grad.from, bgGradientTo:grad.to, bgGradientDir:grad.dir } : {}) });
export const SH = (k: ShapeKind, x:number, y:number, w:number, h:number, fill:string, o:Partial<DE>={}): DE =>
  ({ type:'shape', shapeKind:k, x, y, w, h, rotation:0, fill, opacity:0.4, strokeWidth:0, ...o });
export const PH = (x:number, y:number, w:number, h:number, rotation=0): DE => ({ type:'placeholder', x, y, w, h, rotation });
export const TX = (text:string, x:number, y:number, w:number, h:number, o:Partial<DE>={}): DE =>
  ({ type:'text', x, y, w, h, rotation:0, text, opacity: 1,
     fontSize:18, fill:'#333333', align:'center', fontFamily:'Georgia, serif', fontStyle:'normal', ...o });
/** Movable cover graphic (transparent PNG) — used by landmark travel templates. */
export const IMG = (src: string, x: number, y: number, w: number, h: number, o: Partial<DE> = {}): DE =>
  ({ type: 'image', src, x, y, w, h, rotation: 0, opacity: 1, ...o });


/** Bump Unsplash (etc.) picker thumbs (w=400) to a size usable on covers/PDF.
 *  Local /designs/* assets are returned unchanged. */
export function wallpaperSrc(thumbPhoto: string, width = 1600): string {
  if (thumbPhoto.startsWith('/') || thumbPhoto.startsWith('data:')) return thumbPhoto;
  try {
    const u = new URL(thumbPhoto);
    if (u.searchParams.has('w')) u.searchParams.set('w', String(width));
    else u.searchParams.set('w', String(width));
    return u.toString();
  } catch {
    return /([?&])w=\d+/.test(thumbPhoto)
      ? thumbPhoto.replace(/([?&])w=\d+/, `$1w=${width}`)
      : `${thumbPhoto}${thumbPhoto.includes('?') ? '&' : '?'}w=${width}`;
  }
}

/**
 * Bake a design wallpaper onto the cover background only.
 * Never fills photo placeholders with the wallpaper — that made the same
 * picture appear twice (full-bleed bg + framed slot).
 */
export function elementsWithCoverWallpaper(elements: DE[], thumbPhoto?: string): DE[] {
  if (!thumbPhoto) return elements;
  const src = wallpaperSrc(thumbPhoto);
  return elements.map((el) => {
    if (el.type === 'background') {
      return {
        ...el,
        src,
        bgGradientFrom: undefined,
        bgGradientTo: undefined,
      };
    }
    return el;
  });
}

/** Sentinel written by the wizard when the user skips premade styles / picks blank. */
export const BLANK_STARTER_ID = '__blank__';

/** Front-cover starter for blank albums — white paper + gentle guidance text. */
export function blankFrontCoverElements(lang: 'sq' | 'en' = 'sq'): DE[] {
  return [
    BG('#FFFFFF'),
    TX(
      lang === 'sq' ? 'Kopertina e albumit' : 'Your album cover',
      48, 300, DESIGN_W - 96, 70,
      {
        fontSize: 34,
        fill: '#2A2A2A',
        align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontStyle: 'italic',
      },
    ),
    TX(
      lang === 'sq'
        ? 'Shtoni titullin ose foton që e tregon historinë'
        : 'Add the title or photo that tells the story',
      60, 380, DESIGN_W - 120, 48,
      {
        fontSize: 14,
        fill: '#8A8A8A',
        align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
        letterSpacing: 0.5,
      },
    ),
  ];
}

/** Back-cover starter for blank albums. */
export function blankBackCoverElements(lang: 'sq' | 'en' = 'sq'): DE[] {
  return [
    BG('#FFFFFF'),
    TX(
      lang === 'sq' ? 'Kopertina e pasme' : 'Back cover',
      48, 300, DESIGN_W - 96, 70,
      {
        fontSize: 34,
        fill: '#2A2A2A',
        align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontStyle: 'italic',
      },
    ),
    TX(
      lang === 'sq'
        ? 'Një falënderim, një datë, ose një fjalë e ngrohtë'
        : 'A thank-you, a date, or a closing note',
      60, 380, DESIGN_W - 120, 48,
      {
        fontSize: 14,
        fill: '#8A8A8A',
        align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
        letterSpacing: 0.5,
      },
    ),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 20 Premade Designs — carefully crafted
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Editorial city cover — solid brand color + framed city photo + bold type
 * (same spirit as Paris/Barcelona landmark covers, with a place photograph).
 */
function CITY(
  id: string,
  name: { sq: string; en: string },
  label: string,
  thumbPhoto: string,
  paper: string,
  opts?: {
    year?: string;
    labelSize?: number;
    fill?: string;
    yearFill?: string;
    accent?: string;
    layout?: 'postcard' | 'split' | 'banner';
  },
): DesignDef {
  const year = opts?.year ?? String(new Date().getFullYear());
  const labelSize = opts?.labelSize ?? 72;
  const fill = opts?.fill ?? '#FFFFFF';
  const yearFill = opts?.yearFill ?? opts?.accent ?? fill;
  const accent = opts?.accent ?? 'rgba(255,255,255,0.35)';
  const layout = opts?.layout ?? 'postcard';

  if (layout === 'split') {
    return {
      id, name, category: 'Travel', thumbPhoto,
      layoutRev: TRAVEL_LAYOUT_REV,
      thumb: { background: paper },
      thumbAccents: [],
      elements: [
        BG(paper),
        TX(label, 20, 28, DESIGN_W - 40, 78, {
          fontSize: Math.min(labelSize, 78), fill, align: 'center',
          fontFamily: "'Londrina Solid', cursive", letterSpacing: 4, lineHeight: 0.95,
        }),
        TX(year, 20, 104, DESIGN_W - 40, 36, {
          fontSize: 26, fill: yearFill, align: 'center',
          fontFamily: "'Londrina Solid', cursive", letterSpacing: 6,
        }),
        SH('rect', 220, 148, 160, 3, accent, { opacity: 1, strokeWidth: 0 }),
        IMG(thumbPhoto, 24, 172, DESIGN_W - 48, DESIGN_H - 196),
      ],
    };
  }

  if (layout === 'banner') {
    return {
      id, name, category: 'Travel', thumbPhoto,
      layoutRev: TRAVEL_LAYOUT_REV,
      thumb: { background: paper },
      thumbAccents: [],
      elements: [
        BG(paper),
        IMG(thumbPhoto, 0, 148, DESIGN_W, DESIGN_H - 148),
        SH('rect', 0, 0, DESIGN_W, 156, paper, { opacity: 1, strokeWidth: 0 }),
        TX(label, 16, 28, DESIGN_W - 32, 72, {
          fontSize: Math.min(labelSize, 72), fill, align: 'center',
          fontFamily: "'Londrina Solid', cursive", letterSpacing: 4, lineHeight: 0.95,
        }),
        TX(year, 16, 100, DESIGN_W - 32, 34, {
          fontSize: 22, fill: yearFill, align: 'center',
          fontFamily: "'Londrina Solid', cursive", letterSpacing: 5,
        }),
      ],
    };
  }

  // postcard (default) — color field, full city photo, title then year
  return {
    id, name, category: 'Travel', thumbPhoto,
    layoutRev: TRAVEL_LAYOUT_REV,
    thumb: { background: paper },
    thumbAccents: [],
    elements: [
      BG(paper),
      TX(label, 16, 28, DESIGN_W - 32, 78, {
        fontSize: Math.min(labelSize, 76), fill, align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 5, lineHeight: 0.95,
      }),
      TX(year, 16, 104, DESIGN_W - 32, 34, {
        fontSize: 24, fill: yearFill, align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 6,
      }),
      SH('rect', 230, 146, 140, 3, accent, { opacity: 0.9, strokeWidth: 0 }),
      IMG(thumbPhoto, 32, 168, DESIGN_W - 64, 520),
      SH('rect', 32, 168, DESIGN_W - 64, 520, '#000000', { opacity: 0.06, strokeWidth: 0 }),
    ],
  };
}

// Premade covers: wedding + family + friendship + celebration + travel cities
export const DESIGNS: DesignDef[] = [

  // ── WEDDING ──────────────────────────────────────────────────────────────
  {
    id: 'cream-names',
    name: { sq: 'Emrat Tanë', en: 'Our Names' },
    category: 'Wedding',
    thumb: { background: '#F3EEE6' },
    thumbAccents: [],
    elements: [
      BG('#F3EEE6'),
      SH('rect', 36, 36, DESIGN_W - 72, DESIGN_H - 72, '#000000', {
        opacity: 0, strokeWidth: 1, strokeColor: '#C4B5A2',
      }),
      TX('EMRAT TANË', 80, 150, DESIGN_W - 160, 28, {
        fontSize: 12, fill: '#9A8B7A', align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 6,
      }),
      TX('Elira & Ardit', 40, 280, DESIGN_W - 80, 120, {
        fontSize: 56, fill: '#1A1612', align: 'center',
        fontFamily: "'Great Vibes', cursive", fontStyle: 'normal', lineHeight: 1.05,
      }),
      SH('rect', 250, 430, 100, 1, '#C4B5A2', { opacity: 1, strokeWidth: 0 }),
      TX('14 · 09 · 2024', 100, 460, DESIGN_W - 200, 36, {
        fontSize: 14, fill: '#6A5C4E', align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 4,
      }),
      TX('përgjithmonë', 120, 700, DESIGN_W - 240, 36, {
        fontSize: 16, fill: '#B8A898', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic',
      }),
    ],
  },
  {
    id: 'forever-vows',
    name: { sq: 'Përjetë', en: 'Forever' },
    category: 'Wedding',
    thumb: { background: '#1C1814' },
    thumbAccents: [],
    elements: [
      BG('#1C1814'),
      TX('THE', 40, 200, DESIGN_W - 80, 28, {
        fontSize: 13, fill: '#C9B59A', align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 8,
      }),
      TX('FOREVER', 20, 240, DESIGN_W - 40, 90, {
        fontSize: 68, fill: '#F5EDE3', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'bold', letterSpacing: 6,
      }),
      SH('rect', 240, 350, 120, 1.5, '#C9B59A', { opacity: 0.85, strokeWidth: 0 }),
      TX('Elira & Ardit', 40, 380, DESIGN_W - 80, 70, {
        fontSize: 36, fill: '#F5EDE3', align: 'center',
        fontFamily: "'Great Vibes', cursive",
      }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 40, {
        fontSize: 14, fill: '#8A7A68', align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 5,
      }),
    ],
  },
  {
    id: 'ivory-union',
    name: { sq: 'Bashkimi', en: 'Union' },
    category: 'Wedding',
    thumb: { background: '#FAF7F2' },
    thumbAccents: [],
    elements: [
      BG('#FAF7F2'),
      TX('&', 40, 220, DESIGN_W - 80, 100, {
        fontSize: 92, fill: '#D4C4B0', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif",
      }),
      TX('ELIRA', 40, 340, DESIGN_W - 80, 48, {
        fontSize: 28, fill: '#1A1612', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: 10,
      }),
      TX('ARDIT', 40, 400, DESIGN_W - 80, 48, {
        fontSize: 28, fill: '#1A1612', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: 10,
      }),
      SH('rect', 250, 480, 100, 1, '#C4B5A2', { opacity: 1, strokeWidth: 0 }),
      TX('DASMA JONË', 100, 510, DESIGN_W - 200, 32, {
        fontSize: 12, fill: '#9A8B7A', align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 5,
      }),
    ],
  },
  {
    id: 'rose-day',
    name: { sq: 'Dita Jonë', en: 'Our Day' },
    category: 'Wedding',
    thumb: { background: '#E8D5D0' },
    thumbAccents: [],
    elements: [
      BG('#E8D5D0', { from: '#E8D5D0', to: '#F5EBE6', dir: 'tb' }),
      TX('OUR DAY', 40, 240, DESIGN_W - 80, 36, {
        fontSize: 14, fill: '#8A6A62', align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 8,
      }),
      TX('Elira & Ardit', 32, 300, DESIGN_W - 64, 100, {
        fontSize: 48, fill: '#3A2420', align: 'center',
        fontFamily: "'Great Vibes', cursive",
      }),
      SH('rect', 255, 430, 90, 1, '#B89890', { opacity: 0.9, strokeWidth: 0 }),
      TX('with love', 140, 460, DESIGN_W - 280, 36, {
        fontSize: 16, fill: '#8A6A62', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic',
      }),
    ],
  },

  // ── TRAVEL — landmark icons (Paris/Barcelona) + city photo layouts ──
  {
    id: 'paris-pink',
    name: { sq: 'Paris', en: 'Paris' },
    category: 'Travel',
    layoutRev: TRAVEL_LAYOUT_REV,
    thumbPhoto: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=84&fit=crop',
    thumb: { background: '#FEC5D7' },
    thumbAccents: [],
    elements: [
      BG('#FEC5D7'),
      IMG('/designs/eiffel-tower.png', 36, 148, DESIGN_W - 72, 620, {
        objectFit: 'contain',
      }),
      TX('PARIS', 8, 22, DESIGN_W - 16, 78, {
        fontSize: 88, fill: '#FFFFFF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 10, lineHeight: 0.9,
      }),
      TX(String(new Date().getFullYear()), 8, 100, DESIGN_W - 16, 34, {
        fontSize: 26, fill: '#F06BAF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 8,
      }),
    ],
  },
  {
    id: 'barcelona-red',
    name: { sq: 'Barcelona', en: 'Barcelona' },
    category: 'Travel',
    layoutRev: TRAVEL_LAYOUT_REV,
    thumbPhoto: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=900&q=84&fit=crop',
    thumb: { background: '#A83442' },
    thumbAccents: [],
    elements: [
      BG('#A83442'),
      IMG('/designs/sagrada-familia.png', 36, 148, DESIGN_W - 72, 620, {
        objectFit: 'contain',
      }),
      TX('BARCELONA', 8, 22, DESIGN_W - 16, 78, {
        fontSize: 64, fill: '#FCB426', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 3, lineHeight: 0.9,
      }),
      TX(String(new Date().getFullYear()), 8, 100, DESIGN_W - 16, 34, {
        fontSize: 26, fill: '#FCB426', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 8,
      }),
    ],
  },

  CITY('rome',        { sq: 'Romë', en: 'Rome' },           'ROME',        '/designs/rome-cover-thumb.jpg',        '#C45C26', { labelSize: 88, accent: '#FFE0C2', layout: 'postcard' }),
  CITY('london',      { sq: 'Londër', en: 'London' },       'LONDON',      '/designs/london-cover-thumb.jpg',      '#1B2A4A', { labelSize: 78, accent: '#7EB6FF', layout: 'banner' }),
  CITY('venice',      { sq: 'Venecia', en: 'Venice' },      'VENICE',      '/designs/venice-cover-thumb.jpg',      '#0E5C6B', { labelSize: 82, accent: '#B8F0FF', layout: 'split' }),
  CITY('newyork',     { sq: 'New York', en: 'New York' },   'NEW YORK',    '/designs/newyork-cover-thumb.jpg',     '#111111', { labelSize: 58, fill: '#F5C518', yearFill: '#FFFFFF', accent: '#F5C518', layout: 'banner' }),
  CITY('istanbul',    { sq: 'Stamboll', en: 'Istanbul' },   'ISTANBUL',    '/designs/istanbul-cover-thumb.jpg',    '#6B2D1A', { labelSize: 64, accent: '#F0C987', layout: 'postcard' }),
  CITY('tokyo',       { sq: 'Tokio', en: 'Tokyo' },         'TOKYO',       '/designs/tokyo-cover-thumb.jpg',       '#1A0A18', { labelSize: 88, fill: '#FF4D6D', yearFill: '#FFFFFF', accent: '#FF4D6D', layout: 'split' }),
  CITY('amsterdam',   { sq: 'Amsterdam', en: 'Amsterdam' }, 'AMSTERDAM',   '/designs/amsterdam-cover-thumb.jpg',   '#F4A261', { labelSize: 52, fill: '#1A2A3A', yearFill: '#1A2A3A', accent: '#1A2A3A', layout: 'postcard' }),
  CITY('athens',      { sq: 'Athinë', en: 'Athens' },       'ATHENS',      '/designs/athens-cover-thumb.jpg',      '#E8D5A3', { labelSize: 82, fill: '#3A2A18', yearFill: '#3A2A18', accent: '#3A2A18', layout: 'split' }),
  CITY('prague',      { sq: 'Pragë', en: 'Prague' },        'PRAGUE',      '/designs/prague-cover-thumb.jpg',      '#4A1C2A', { labelSize: 82, accent: '#E8B4C0', layout: 'postcard' }),
  CITY('vienna',      { sq: 'Vjenë', en: 'Vienna' },        'VIENNA',      '/designs/vienna-cover-thumb.jpg',      '#2A2038', { labelSize: 82, accent: '#D4AF37', layout: 'banner' }),
  CITY('tirana',      { sq: 'Tiranë', en: 'Tirana' },       'TIRANA',      '/designs/tirana-cover-thumb.jpg',      '#E63946', { labelSize: 82, accent: '#FFFFFF', layout: 'postcard' }),
  CITY('dubrovnik',   { sq: 'Dubrovnik', en: 'Dubrovnik' }, 'DUBROVNIK',   '/designs/dubrovnik-cover-thumb.jpg',   '#0077B6', { labelSize: 52, accent: '#90E0EF', layout: 'split' }),
  CITY('santorini',   { sq: 'Santorini', en: 'Santorini' }, 'SANTORINI',   '/designs/santorini-cover-thumb.jpg',   '#48CAE4', { labelSize: 58, fill: '#023E8A', yearFill: '#023E8A', accent: '#023E8A', layout: 'postcard' }),
  CITY('amalfi',      { sq: 'Amalfi', en: 'Amalfi' },       'AMALFI',      '/designs/amalfi-cover-thumb.jpg',      '#2A9D8F', { labelSize: 82, accent: '#E9C46A', layout: 'banner' }),
  CITY('berlin',      { sq: 'Berlin', en: 'Berlin' },       'BERLIN',      '/designs/berlin-cover-thumb.jpg',      '#0D0D0D', { labelSize: 82, fill: '#E0E0E0', yearFill: '#FF3B30', accent: '#FF3B30', layout: 'split' }),
  CITY('lisbon',      { sq: 'Lisbonë', en: 'Lisbon' },      'LISBON',      '/designs/lisbon-cover-thumb.jpg',      '#E76F51', { labelSize: 82, accent: '#FFE8D6', layout: 'postcard' }),
  CITY('florence',    { sq: 'Firence', en: 'Florence' },    'FLORENCE',    '/designs/florence-cover-thumb.jpg',    '#BC6C25', { labelSize: 68, accent: '#FFE6C7', layout: 'banner' }),

  // ── FRIENDSHIP — clean typography covers (travel-style) ───────────────────
  {
    id: 'friends-forever',
    name: { sq: 'Miqësi', en: 'Friends' },
    category: 'Friendship',
    thumb: { background: '#1A3A42' },
    thumbAccents: [],
    elements: [
      BG('#1A3A42'),
      TX('FRIENDS', 16, 260, DESIGN_W - 32, 100, {
        fontSize: 72, fill: '#FFFFFF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
      TX(String(new Date().getFullYear()), 16, 370, DESIGN_W - 32, 40, {
        fontSize: 28, fill: '#7EC8C4', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 8,
      }),
      SH('rect', 240, 430, 120, 3, '#7EC8C4', { opacity: 0.7, strokeWidth: 0 }),
      TX('forever', 100, 460, DESIGN_W - 200, 44, {
        fontSize: 22, fill: '#C8E8E4', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic',
      }),
    ],
  },
  {
    id: 'us-together',
    name: { sq: 'Ne', en: 'Us' },
    category: 'Friendship',
    thumb: { background: '#F0E6D8' },
    thumbAccents: [],
    elements: [
      BG('#F0E6D8'),
      TX('US', 20, 250, DESIGN_W - 40, 140, {
        fontSize: 128, fill: '#1A1A1A', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 8,
      }),
      SH('rect', 240, 420, 120, 3, '#1A1A1A', { opacity: 0.35, strokeWidth: 0 }),
      TX('togetherness', 80, 450, DESIGN_W - 160, 40, {
        fontSize: 16, fill: '#6A5A4A', align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 5,
      }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 40, {
        fontSize: 20, fill: '#9A8A7A', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
    ],
  },
  {
    id: 'since-day-one',
    name: { sq: 'Nga fillimi', en: 'Day One' },
    category: 'Friendship',
    thumb: { background: '#2A1F3D' },
    thumbAccents: [],
    elements: [
      BG('#2A1F3D'),
      TX('SINCE', 40, 240, DESIGN_W - 80, 48, {
        fontSize: 28, fill: '#C4B5E0', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 10,
      }),
      TX('DAY ONE', 16, 300, DESIGN_W - 32, 100, {
        fontSize: 68, fill: '#FFFFFF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 3,
      }),
      SH('rect', 230, 430, 140, 3, '#A78BFA', { opacity: 0.75, strokeWidth: 0 }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 40, {
        fontSize: 22, fill: '#A78BFA', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
    ],
  },
  {
    id: 'always-crew',
    name: { sq: 'Ekipi', en: 'Crew' },
    category: 'Friendship',
    thumb: { background: '#E85D4C' },
    thumbAccents: [],
    elements: [
      BG('#E85D4C'),
      TX('CREW', 16, 270, DESIGN_W - 32, 110, {
        fontSize: 96, fill: '#FFFFFF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 6,
      }),
      TX(String(new Date().getFullYear()), 16, 390, DESIGN_W - 32, 40, {
        fontSize: 28, fill: '#FFE8A3', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 8,
      }),
      SH('rect', 240, 450, 120, 3, '#FFE8A3', { opacity: 0.8, strokeWidth: 0 }),
      TX('always', 140, 480, DESIGN_W - 280, 40, {
        fontSize: 20, fill: '#FFFFFF', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic',
      }),
    ],
  },
  {
    id: 'good-times',
    name: { sq: 'Kohë të mira', en: 'Good Times' },
    category: 'Friendship',
    thumb: { background: '#0F2A24' },
    thumbAccents: [],
    elements: [
      BG('#0F2A24'),
      TX('GOOD', 24, 250, DESIGN_W - 48, 70, {
        fontSize: 56, fill: '#A8E6CF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 10,
      }),
      TX('TIMES', 24, 330, DESIGN_W - 48, 90, {
        fontSize: 80, fill: '#FFFFFF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
      SH('rect', 240, 450, 120, 3, '#A8E6CF', { opacity: 0.7, strokeWidth: 0 }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 40, {
        fontSize: 22, fill: '#A8E6CF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
    ],
  },

  // ── CELEBRATION ───────────────────────────────────────────────────────────
  {
    id: 'birthday-bloom',
    name: { sq: 'Ditëlindje', en: 'Birthday' },
    category: 'Celebration',
    thumb: { background: '#FF6B8A' },
    thumbAccents: [],
    elements: [
      BG('#FF6B8A', { from: '#FF6B8A', to: '#FF8E53', dir: 'diag' }),
      TX('HAPPY', 32, 240, DESIGN_W - 64, 60, {
        fontSize: 40, fill: '#FFFFFF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 12,
      }),
      TX('BIRTHDAY', 16, 310, DESIGN_W - 32, 100, {
        fontSize: 72, fill: '#1A1A1A', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 2,
      }),
      SH('rect', 230, 440, 140, 3, '#FFFFFF', { opacity: 0.55, strokeWidth: 0 }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 48, {
        fontSize: 26, fill: '#FFFFFF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
    ],
  },
  {
    id: 'party-nights',
    name: { sq: 'Festë', en: 'Party Night' },
    category: 'Celebration',
    thumb: { background: '#1A0A2E' },
    thumbAccents: [],
    elements: [
      BG('#1A0A2E', { from: '#1A0A2E', to: '#4C1D95', dir: 'tb' }),
      TX("LET'S", 32, 230, DESIGN_W - 64, 48, {
        fontSize: 32, fill: '#E9D5FF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 14,
      }),
      TX('PARTY', 12, 290, DESIGN_W - 24, 120, {
        fontSize: 96, fill: '#F0ABFC', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
      SH('rect', 200, 440, 200, 3, '#F0ABFC', { opacity: 0.75, strokeWidth: 0 }),
      TX(String(new Date().getFullYear()), 180, 700, 240, 48, {
        fontSize: 24, fill: '#FFFFFF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
    ],
  },
  {
    id: 'cheers-gold',
    name: { sq: 'Gëzuar', en: 'Cheers' },
    category: 'Celebration',
    thumb: { background: '#1A120C' },
    thumbAccents: [],
    elements: [
      BG('#1A120C'),
      SH('rect', 48, 48, DESIGN_W - 96, DESIGN_H - 96, '#000000', {
        opacity: 0, strokeWidth: 1.5, strokeColor: '#C9A227',
      }),
      TX('CHEERS', 20, 300, DESIGN_W - 40, 100, {
        fontSize: 78, fill: '#C9A227', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 6,
      }),
      SH('rect', 180, 430, 240, 2, '#C9A227', { opacity: 1, strokeWidth: 0 }),
      TX('to us', 100, 460, DESIGN_W - 200, 48, {
        fontSize: 28, fill: '#F5E6C8', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic',
      }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 48, {
        fontSize: 22, fill: '#C9A227', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
    ],
  },
  {
    id: 'celebrate-confetti',
    name: { sq: 'Festojmë', en: 'Celebrate' },
    category: 'Celebration',
    thumb: { background: '#FF8A3D' },
    thumbAccents: [],
    elements: [
      BG('#FF8A3D'),
      TX('YAY!', 24, 280, DESIGN_W - 48, 130, {
        fontSize: 110, fill: '#1A1A1A', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 2,
      }),
      SH('rect', 230, 440, 140, 3, '#FFFFFF', { opacity: 0.65, strokeWidth: 0 }),
      TX('we celebrate', 80, 470, DESIGN_W - 160, 40, {
        fontSize: 16, fill: '#FFFFFF', align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 5,
      }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 48, {
        fontSize: 26, fill: '#1A1A1A', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
    ],
  },

  // ── BABY & FAMILY ─────────────────────────────────────────────────────────
  {
    id: 'baby-ador',
    name: { sq: 'ADOR', en: 'ADOR' },
    category: 'Baby & Family',
    thumb: { background: '#BCC9D1' },
    thumbAccents: [],
    elements: [
      { ...BG('#BCC9D1'), src: '/designs/baby-ador-cover.jpg' },
      TX('ADOR', 40, 200, DESIGN_W - 80, 80, {
        fontSize: 56,
        fill: '#4A7593',
        align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif",
        letterSpacing: 12,
      }),
    ],
  },
  {
    id: 'family-us',
    name: { sq: 'Familja', en: 'Family' },
    category: 'Baby & Family',
    thumb: { background: '#E8EEF2' },
    thumbAccents: [],
    elements: [
      BG('#E8EEF2'),
      TX('FAMILJA', 16, 270, DESIGN_W - 32, 100, {
        fontSize: 64, fill: '#2A3A48', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
      TX(String(new Date().getFullYear()), 16, 380, DESIGN_W - 32, 40, {
        fontSize: 28, fill: '#7A9AAC', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 8,
      }),
      SH('rect', 240, 440, 120, 3, '#7A9AAC', { opacity: 0.65, strokeWidth: 0 }),
      TX('our story', 140, 470, DESIGN_W - 280, 40, {
        fontSize: 16, fill: '#6A8496', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic',
      }),
    ],
  },
  {
    id: 'little-years',
    name: { sq: 'Vitet e vogla', en: 'Little Years' },
    category: 'Baby & Family',
    thumb: { background: '#F5EFE6' },
    thumbAccents: [],
    elements: [
      BG('#F5EFE6'),
      TX('LITTLE', 40, 250, DESIGN_W - 80, 56, {
        fontSize: 36, fill: '#8A7A6A', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 10,
      }),
      TX('YEARS', 20, 320, DESIGN_W - 40, 100, {
        fontSize: 78, fill: '#2A2218', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
      SH('rect', 240, 450, 120, 3, '#C4B5A2', { opacity: 0.8, strokeWidth: 0 }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 40, {
        fontSize: 20, fill: '#9A8A7A', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
    ],
  },
  {
    id: 'our-home',
    name: { sq: 'Shtëpia', en: 'Home' },
    category: 'Baby & Family',
    thumb: { background: '#3A2E28' },
    thumbAccents: [],
    elements: [
      BG('#3A2E28'),
      TX('HOME', 20, 280, DESIGN_W - 40, 110, {
        fontSize: 88, fill: '#F5EDE3', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 6,
      }),
      TX(String(new Date().getFullYear()), 16, 400, DESIGN_W - 32, 40, {
        fontSize: 26, fill: '#C9B59A', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 8,
      }),
      SH('rect', 240, 460, 120, 3, '#C9B59A', { opacity: 0.7, strokeWidth: 0 }),
      TX('where we belong', 80, 490, DESIGN_W - 160, 40, {
        fontSize: 15, fill: '#B8A898', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic',
      }),
    ],
  },
  {
    id: 'first-chapter',
    name: { sq: 'Kapitulli I', en: 'Chapter One' },
    category: 'Baby & Family',
    thumb: { background: '#D8E4EC' },
    thumbAccents: [],
    elements: [
      BG('#D8E4EC'),
      TX('CHAPTER', 40, 250, DESIGN_W - 80, 48, {
        fontSize: 24, fill: '#5A7A90', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 10,
      }),
      TX('ONE', 20, 310, DESIGN_W - 40, 110, {
        fontSize: 96, fill: '#1A2A38', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 6,
      }),
      SH('rect', 240, 450, 120, 3, '#5A7A90', { opacity: 0.6, strokeWidth: 0 }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 40, {
        fontSize: 22, fill: '#5A7A90', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
    ],
  },

];

/** Front cover elements for a design. */
export function designFrontElements(d: DesignDef): DE[] {
  return Array.isArray(d.elements) ? d.elements : [];
}

/**
 * Catalog / sidebar face. Always prefer the live cover layers so the wizard,
 * editor sidebar, and Design Studio show the same book. `thumbPhoto` is only
 * a last-resort fallback when a design has no elements yet.
 */
export function designCatalogFace(d: Pick<DesignDef, 'thumbPhoto' | 'elements'>):
  | { kind: 'photo'; src: string }
  | { kind: 'elements'; elements: DE[] } {
  const els = Array.isArray(d.elements) ? d.elements : [];
  if (els.length) return { kind: 'elements', elements: els };
  if (d.thumbPhoto) return { kind: 'photo', src: d.thumbPhoto };
  return { kind: 'elements', elements: [] };
}

/**
 * Back cover elements.
 * - Missing `backElements` → fall back to front (legacy designs).
 * - Explicit array (even empty / background-only) → trust it; Design Studio
 *   may intentionally clear the back without copying the front.
 */
export function designBackElements(d: DesignDef): DE[] {
  if (Array.isArray(d.backElements)) return d.backElements;
  return designFrontElements(d);
}

/** Per-design layout override: legacy DE[] = both sides, or explicit front/back. */
export type DesignSideOverride = {
  frontElements?: DE[];
  backElements?: DE[];
  /** Snapshot of the builtin rev at save time (not used to drop overrides). */
  layoutRev?: number;
  /** Landmark PNGs the admin deleted — do not re-inject on deploy. */
  omittedLandmarkSrcs?: string[];
};

export type DesignOverrides = Record<string, DE[] | DesignSideOverride>;

/** Admin-created cover designs persisted in app_settings.custom_designs. */
export interface CustomDesignRecord {
  id: string;
  name: { sq: string; en: string };
  category: string;
  thumbLabel?: string;
  thumbColor?: string;
  thumbPhoto?: string;
  frontElements: DE[];
  backElements: DE[];
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeOverride(raw: unknown): DesignSideOverride | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    if (!raw.length) return null;
    return { frontElements: raw as DE[], backElements: raw as DE[] };
  }
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const hasFrontKey = Array.isArray(o.frontElements) || Array.isArray(o.elements);
  const hasBackKey = Array.isArray(o.backElements);
  const front = Array.isArray(o.frontElements)
    ? (o.frontElements as DE[])
    : Array.isArray(o.elements)
      ? (o.elements as DE[])
      : undefined;
  const back = Array.isArray(o.backElements) ? (o.backElements as DE[]) : undefined;
  if (!hasFrontKey && !hasBackKey) return null;
  const omitted = Array.isArray(o.omittedLandmarkSrcs)
    ? (o.omittedLandmarkSrcs as unknown[]).filter((s): s is string => typeof s === 'string' && !!s)
    : undefined;
  return {
    // Only fill sides that were actually saved — never mirror front↔back.
    frontElements: hasFrontKey ? (front ?? []) : undefined,
    backElements: hasBackKey ? (back ?? []) : undefined,
    layoutRev: typeof o.layoutRev === 'number' ? o.layoutRev : undefined,
    omittedLandmarkSrcs: omitted?.length ? omitted : undefined,
  };
}

/** True when a cover has something besides a flat color plate. */
export function coverHasContent(els?: DE[] | null): boolean {
  if (!Array.isArray(els) || !els.length) return false;
  return els.some((e) => e.type === 'text' || e.type === 'image' || e.type === 'shape');
}

/** Merge persisted admin overrides onto a design list. */
export function applyDesignOverrides(
  designs: DesignDef[] = DESIGNS,
  overrides?: DesignOverrides | null,
): DesignDef[] {
  if (!overrides || typeof overrides !== 'object') return designs;
  return designs.map((d) => {
    const raw = overrides[d.id];
    const norm = normalizeOverride(raw);
    if (!norm) return d;

    const rawObj = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;
    const explicitBack = Array.isArray(rawObj?.backElements);
    const explicitFront = Array.isArray(rawObj?.frontElements) || Array.isArray(rawObj?.elements);
    // Studio always writes both sides together — trust minimal (bg-only) saves.
    // A partial front-only bg plate is treated as accidental and ignored.
    const bothSidesSaved = explicitFront && explicitBack;

    const frontOk = coverHasContent(norm.frontElements);
    const backOk = coverHasContent(norm.backElements);
    if (!frontOk && !backOk && !bothSidesSaved && !explicitBack) return d;

    // Design Studio is the source of truth. A new deploy must not throw away
    // a shop's saved covers just because built-in layoutRev was bumped.
    // Drop the baked catalog mockup so pickers show the saved layers.
    const omitted = norm.omittedLandmarkSrcs ?? [];
    const front = frontOk && norm.frontElements?.length
      ? restoreCoverGraphics(norm.frontElements, d.elements, omitted)
      : (bothSidesSaved && Array.isArray(norm.frontElements)
        ? norm.frontElements
        : d.elements);
    const builtinBack = d.backElements ?? d.elements;
    const back = explicitBack
      ? (backOk && norm.backElements?.length
        ? restoreCoverGraphics(norm.backElements, builtinBack, omitted)
        : (norm.backElements ?? []))
      : (backOk && norm.backElements?.length
        ? restoreCoverGraphics(norm.backElements, builtinBack, omitted)
        : builtinBack);
    return {
      ...d,
      thumbPhoto: undefined,
      elements: front,
      backElements: back,
    };
  });
}

export function getDesignWithOverrides(
  id: string,
  overrides?: DesignOverrides | null,
  customDesigns?: CustomDesignRecord[] | null,
  designDisplay?: DesignDisplayMap | null,
): DesignDef | undefined {
  return buildDesignCatalog(overrides, customDesigns, designDisplay).find((d) => d.id === id);
}

export function customDesignToDef(c: CustomDesignRecord): DesignDef {
  const color = c.thumbColor || '#2A2A2A';
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    thumb: { background: color },
    thumbAccents: [],
    thumbPhoto: c.thumbPhoto,
    thumbLabel: c.thumbLabel || c.name.en?.slice(0, 12).toUpperCase(),
    elements: Array.isArray(c.frontElements) ? c.frontElements : [],
    backElements: Array.isArray(c.backElements) ? c.backElements : [],
    isCustom: true,
  };
}

export function parseCustomDesigns(raw: unknown): CustomDesignRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomDesignRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Partial<CustomDesignRecord>;
    if (!c.id || typeof c.id !== 'string') continue;
    if (!c.name || typeof c.name !== 'object') continue;
    const nameEn = String((c.name as any).en || '').trim();
    const nameSq = String((c.name as any).sq || nameEn).trim();
    if (!nameEn && !nameSq) continue;
    const category = String(c.category || 'Travel').trim() || 'Travel';
    const frontElements = Array.isArray(c.frontElements) ? c.frontElements : [];
    const backElements = Array.isArray(c.backElements) ? c.backElements : frontElements;
    out.push({
      id: c.id,
      name: { en: nameEn || nameSq, sq: nameSq || nameEn },
      category,
      thumbLabel: c.thumbLabel ? String(c.thumbLabel) : undefined,
      thumbColor: c.thumbColor ? String(c.thumbColor) : undefined,
      thumbPhoto: c.thumbPhoto ? String(c.thumbPhoto) : undefined,
      frontElements,
      backElements,
      createdAt: c.createdAt ? String(c.createdAt) : undefined,
      updatedAt: c.updatedAt ? String(c.updatedAt) : undefined,
    });
  }
  return out;
}

/** Built-ins (with overrides) + admin custom designs + display rename/order. */
export function buildDesignCatalog(
  overrides?: DesignOverrides | null,
  customDesigns?: CustomDesignRecord[] | null,
  designDisplay?: DesignDisplayMap | null,
): DesignDef[] {
  const builtIn = applyDesignOverrides(DESIGNS, overrides);
  const customs = parseCustomDesigns(customDesigns).map(customDesignToDef);
  const customsApplied = applyDesignOverrides(customs, overrides);
  return applyDesignDisplay([...builtIn, ...customsApplied], designDisplay);
}

/** Starter canvas for a new admin cover. */
export function blankCoverElements(title: string, color = '#F7F5F2'): DE[] {
  return [
    BG(color),
    TX(title, 40, 300, DESIGN_W - 80, 90, {
      fontSize: 48,
      fill: '#1A1A1A',
      align: 'center',
      fontFamily: "'Londrina Solid', cursive",
      letterSpacing: 4,
    }),
    TX('Tap to edit', 80, 400, DESIGN_W - 160, 40, {
      fontSize: 14,
      fill: '#8A8A8A',
      align: 'center',
      fontFamily: "Arial, 'Helvetica Neue', sans-serif",
    }),
  ];
}

export function newCustomDesignId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Attach stable ids for Konva editing; strip them again before saving. */
export function designElementsWithIds(designId: string, elements: DE[]): EditorElement[] {
  return elements.map((el, i) => ({
    ...el,
    id: `${designId}__${i}`,
    rotation: el.rotation ?? 0,
  }));
}

export function designElementsWithoutIds(elements: EditorElement[]): DE[] {
  return elements.map(({ id: _id, ...rest }) => rest);
}

/**
 * Photoshop-style layer stack. Array index 0 paints at the back.
 * `visualFrom` / `visualTo` are 0 = front (top of the layers list).
 * Background plates stay at the back.
 */
export function reorderLayerByVisualIndex<T extends { type?: string }>(
  els: T[],
  visualFrom: number,
  visualTo: number,
): T[] {
  if (!Array.isArray(els) || els.length < 2) return els;
  if (visualFrom === visualTo) return els;
  const visual = [...els].reverse();
  if (visualFrom < 0 || visualFrom >= visual.length) return els;
  if (visual[visualFrom]?.type === 'background') return els;
  const moved = visual[visualFrom];
  const without = visual.filter((_, i) => i !== visualFrom);
  const insertAt = Math.max(0, Math.min(visualTo, without.length));
  without.splice(insertAt, 0, moved);
  const bgs = without.filter((e) => e.type === 'background');
  const rest = without.filter((e) => e.type !== 'background');
  return [...bgs, ...[...rest].reverse()];
}
