import type { CSSProperties } from 'react';

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
  text?: string; fontSize?: number; fontFamily?: string;
  fill?: string; align?: 'left' | 'center' | 'right'; fontStyle?: string;
  lineHeight?: number; letterSpacing?: number;
  bgColor?: string;
  bgGradientFrom?: string; bgGradientTo?: string; bgGradientDir?: 'tb' | 'lr' | 'diag';
  shapeKind?: 'rect' | 'circle';
  strokeColor?: string; strokeWidth?: number; strokeDash?: number[]; cornerRadius?: number;
}
export type DE = Omit<EditorElement, 'id'>;

/** object-fit: cover crop rect in source-image pixels, with optional focus (0–1). */
export function coverCropRect(
  naturalW: number,
  naturalH: number,
  boxW: number,
  boxH: number,
  focusX = 0.5,
  focusY = 0.5,
): { x: number; y: number; width: number; height: number; scale: number; maxX: number; maxY: number } {
  const scale = Math.max(boxW / Math.max(1, naturalW), boxH / Math.max(1, naturalH));
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
export function imageFrameCoverFit(
  naturalW: number,
  naturalH: number,
  frameW: number,
  frameH: number,
  focusX = 0.5,
  focusY = 0.5,
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
  const scale = Math.max(frameW / Math.max(1, naturalW), frameH / Math.max(1, naturalH));
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
}
export interface LayoutZone { x:number; y:number; w:number; h:number; type:string; rotation?:number }
export interface LayoutDef { id:string; category:string; label:{sq:string;en:string}; zones:LayoutZone[] }

export const LAYOUTS: LayoutDef[] = [
  // ── 1-photo ───────────────────────────────────────────────────────────────
  { id:'full',           category:'1 Photo', label:{sq:'Foto e plotë',      en:'Full bleed'},        zones:[{x:0,y:0,w:1,h:1,type:'photo'}] },
  { id:'bordered-single',category:'1 Photo', label:{sq:'Me kufi',           en:'Bordered'},          zones:[{x:0.06,y:0.05,w:0.88,h:0.90,type:'photo'}] },
  { id:'portrait-center',category:'1 Photo', label:{sq:'Portret qendror',   en:'Portrait center'},   zones:[{x:0.12,y:0.08,w:0.76,h:0.84,type:'photo'}] },

  // ── Photo + text ──────────────────────────────────────────────────────────
  { id:'photo-cap',      category:'Photo + Text', label:{sq:'Foto + Titull',     en:'Photo + Caption'},   zones:[{x:0,y:0,w:1,h:0.74,type:'photo'},{x:0.06,y:0.77,w:0.88,h:0.18,type:'text'}] },
  { id:'cap-top',        category:'Photo + Text', label:{sq:'Titull + Foto',     en:'Title + Photo'},     zones:[{x:0.06,y:0.05,w:0.88,h:0.18,type:'text'},{x:0,y:0.26,w:1,h:0.74,type:'photo'}] },
  { id:'photo-text-r',   category:'Photo + Text', label:{sq:'Foto + Tekst →',   en:'Photo + Text →'},   zones:[{x:0,y:0,w:0.60,h:1,type:'photo'},{x:0.62,y:0.06,w:0.35,h:0.88,type:'text'}] },

  // ── text only ─────────────────────────────────────────────────────────────
  { id:'quote',          category:'Text', label:{sq:'Faqe citimi',       en:'Quote page'},        zones:[{x:0.08,y:0.10,w:0.84,h:0.80,type:'text'}] },

  // ── 2-photo ───────────────────────────────────────────────────────────────
  { id:'two-h',          category:'2 Photos', label:{sq:'2 Kolona',         en:'2 Columns'},         zones:[{x:0,y:0,w:0.487,h:1,type:'photo'},{x:0.513,y:0,w:0.487,h:1,type:'photo'}] },
  { id:'two-v',          category:'2 Photos', label:{sq:'2 Shtresa',        en:'2 Stacked'},         zones:[{x:0,y:0,w:1,h:0.487,type:'photo'},{x:0,y:0.513,w:1,h:0.487,type:'photo'}] },
  { id:'two-h-6040',     category:'2 Photos', label:{sq:'Gjerë + Ngushtë',  en:'Wide + Narrow'},     zones:[{x:0,y:0,w:0.60,h:1,type:'photo'},{x:0.62,y:0,w:0.38,h:1,type:'photo'}] },
  { id:'two-h-4060',     category:'2 Photos', label:{sq:'Ngushtë + Gjerë',  en:'Narrow + Wide'},     zones:[{x:0,y:0,w:0.38,h:1,type:'photo'},{x:0.40,y:0,w:0.60,h:1,type:'photo'}] },
  { id:'two-v-7030',     category:'2 Photos', label:{sq:'Madhe + Holle',    en:'Tall + Thin'},       zones:[{x:0,y:0,w:1,h:0.68,type:'photo'},{x:0,y:0.70,w:1,h:0.30,type:'photo'}] },
  { id:'two-v-3070',     category:'2 Photos', label:{sq:'Holle + Madhe',    en:'Thin + Tall'},       zones:[{x:0,y:0,w:1,h:0.30,type:'photo'},{x:0,y:0.32,w:1,h:0.68,type:'photo'}] },

  // ── 3-photo ───────────────────────────────────────────────────────────────
  { id:'strips-3',       category:'3 Photos', label:{sq:'3 Shtresa',         en:'3 Strips'},          zones:[{x:0,y:0,w:1,h:0.316,type:'photo'},{x:0,y:0.342,w:1,h:0.316,type:'photo'},{x:0,y:0.684,w:1,h:0.316,type:'photo'}] },
  { id:'land-2port',     category:'3 Photos', label:{sq:'Sipër + 2',         en:'Top + 2 below'},     zones:[{x:0,y:0,w:1,h:0.487,type:'photo'},{x:0,y:0.513,w:0.487,h:0.487,type:'photo'},{x:0.513,y:0.513,w:0.487,h:0.487,type:'photo'}] },
  { id:'port-2land',     category:'3 Photos', label:{sq:'2 + Poshtë',        en:'2 top + Bottom'},    zones:[{x:0,y:0,w:0.487,h:0.487,type:'photo'},{x:0.513,y:0,w:0.487,h:0.487,type:'photo'},{x:0,y:0.513,w:1,h:0.487,type:'photo'}] },
  { id:'hero-l',         category:'3 Photos', label:{sq:'2 + Kryesore',      en:'2 left + Hero'},     zones:[{x:0,y:0,w:0.35,h:0.487,type:'photo'},{x:0,y:0.513,w:0.35,h:0.487,type:'photo'},{x:0.37,y:0,w:0.63,h:1,type:'photo'}] },
  { id:'hero-r',         category:'3 Photos', label:{sq:'Kryesore + 2',      en:'Hero + 2 right'},    zones:[{x:0,y:0,w:0.63,h:1,type:'photo'},{x:0.65,y:0,w:0.35,h:0.487,type:'photo'},{x:0.65,y:0.513,w:0.35,h:0.487,type:'photo'}] },
  { id:'tall-l-2r',      category:'3 Photos', label:{sq:'E gjatë + 2',       en:'Tall + 2 right'},    zones:[{x:0,y:0,w:0.55,h:1,type:'photo'},{x:0.57,y:0,w:0.43,h:0.487,type:'photo'},{x:0.57,y:0.513,w:0.43,h:0.487,type:'photo'}] },
  { id:'triptych',       category:'3 Photos', label:{sq:'Triptik',           en:'Triptych'},          zones:[{x:0,y:0,w:0.316,h:1,type:'photo'},{x:0.342,y:0,w:0.316,h:1,type:'photo'},{x:0.684,y:0,w:0.316,h:1,type:'photo'}] },
  { id:'strips-3-uneven',category:'3 Photos', label:{sq:'3 Shtresa ≠',       en:'3 Uneven strips'},   zones:[{x:0,y:0,w:1,h:0.38,type:'photo'},{x:0,y:0.40,w:1,h:0.20,type:'photo'},{x:0,y:0.62,w:1,h:0.38,type:'photo'}] },
  { id:'strips-3-focus', category:'3 Photos', label:{sq:'3 Fokus mes',       en:'3 Mid focus'},       zones:[{x:0,y:0,w:1,h:0.22,type:'photo'},{x:0,y:0.24,w:1,h:0.52,type:'photo'},{x:0,y:0.78,w:1,h:0.22,type:'photo'}] },
  { id:'three-mid',      category:'3 Photos', label:{sq:'3 Qendrore',        en:'3 Centered'},        zones:[{x:0,y:0.13,w:0.316,h:0.74,type:'photo'},{x:0.342,y:0.13,w:0.316,h:0.74,type:'photo'},{x:0.684,y:0.13,w:0.316,h:0.74,type:'photo'}] },

  // ── 4-photo ───────────────────────────────────────────────────────────────
  { id:'strips-4',       category:'4 Photos', label:{sq:'4 Shtresa',         en:'4 Strips'},          zones:[{x:0,y:0,w:1,h:0.235,type:'photo'},{x:0,y:0.255,w:1,h:0.235,type:'photo'},{x:0,y:0.510,w:1,h:0.235,type:'photo'},{x:0,y:0.765,w:1,h:0.235,type:'photo'}] },
  { id:'grid4-topheavy', category:'4 Photos', label:{sq:'2 Madhe + 2',       en:'2 Large + 2'},       zones:[{x:0,y:0,w:0.487,h:0.55,type:'photo'},{x:0.513,y:0,w:0.487,h:0.55,type:'photo'},{x:0,y:0.57,w:0.487,h:0.43,type:'photo'},{x:0.513,y:0.57,w:0.487,h:0.43,type:'photo'}] },
  { id:'grid4',          category:'4 Photos', label:{sq:'Rrjetë 4',          en:'4 Grid'},            zones:[{x:0,y:0,w:0.487,h:0.487,type:'photo'},{x:0.513,y:0,w:0.487,h:0.487,type:'photo'},{x:0,y:0.513,w:0.487,h:0.487,type:'photo'},{x:0.513,y:0.513,w:0.487,h:0.487,type:'photo'}] },
  { id:'top-3below',     category:'4 Photos', label:{sq:'Sipër + 3',         en:'Top + 3 below'},     zones:[{x:0,y:0,w:1,h:0.55,type:'photo'},{x:0,y:0.57,w:0.316,h:0.43,type:'photo'},{x:0.342,y:0.57,w:0.316,h:0.43,type:'photo'},{x:0.684,y:0.57,w:0.316,h:0.43,type:'photo'}] },
  { id:'hero-3r',        category:'4 Photos', label:{sq:'Kryesore + 3',      en:'Hero + 3 right'},    zones:[{x:0,y:0,w:0.63,h:1,type:'photo'},{x:0.65,y:0,w:0.35,h:0.316,type:'photo'},{x:0.65,y:0.342,w:0.35,h:0.316,type:'photo'},{x:0.65,y:0.684,w:0.35,h:0.316,type:'photo'}] },
  { id:'hero-3l',        category:'4 Photos', label:{sq:'3 + Kryesore',      en:'3 left + Hero'},     zones:[{x:0,y:0,w:0.35,h:0.316,type:'photo'},{x:0,y:0.342,w:0.35,h:0.316,type:'photo'},{x:0,y:0.684,w:0.35,h:0.316,type:'photo'},{x:0.37,y:0,w:0.63,h:1,type:'photo'}] },

  // ── 5-6 photo ─────────────────────────────────────────────────────────────
  { id:'filmstrip-5',    category:'5-6 Photos', label:{sq:'Shirit 5',          en:'Filmstrip 5'},       zones:[{x:0,y:0,w:0.188,h:1,type:'photo'},{x:0.203,y:0,w:0.188,h:1,type:'photo'},{x:0.406,y:0,w:0.188,h:1,type:'photo'},{x:0.609,y:0,w:0.188,h:1,type:'photo'},{x:0.812,y:0,w:0.188,h:1,type:'photo'}] },
  { id:'gallery-5',      category:'5-6 Photos', label:{sq:'Galeri 5',          en:'Gallery 5'},         zones:[{x:0,y:0,w:0.487,h:0.45,type:'photo'},{x:0.513,y:0,w:0.487,h:0.45,type:'photo'},{x:0,y:0.47,w:0.316,h:0.53,type:'photo'},{x:0.342,y:0.47,w:0.316,h:0.53,type:'photo'},{x:0.684,y:0.47,w:0.316,h:0.53,type:'photo'}] },
  { id:'grid-6',         category:'5-6 Photos', label:{sq:'Rrjetë 6',          en:'6 Grid'},            zones:[{x:0,y:0,w:0.487,h:0.316,type:'photo'},{x:0.513,y:0,w:0.487,h:0.316,type:'photo'},{x:0,y:0.342,w:0.487,h:0.316,type:'photo'},{x:0.513,y:0.342,w:0.487,h:0.316,type:'photo'},{x:0,y:0.684,w:0.487,h:0.316,type:'photo'},{x:0.513,y:0.684,w:0.487,h:0.316,type:'photo'}] },

  // ── magazine / editorial ──────────────────────────────────────────────────
  { id:'mag',            category:'Magazine', label:{sq:'Revistë',           en:'Magazine'},          zones:[{x:0,y:0,w:0.55,h:0.62,type:'photo'},{x:0.57,y:0,w:0.43,h:1,type:'photo'},{x:0,y:0.64,w:0.55,h:0.36,type:'text'}] },
  { id:'text-2photos',   category:'Magazine', label:{sq:'Tekst + 2 Foto',    en:'Text + 2 Photos'},   zones:[{x:0.06,y:0.05,w:0.88,h:0.22,type:'text'},{x:0,y:0.30,w:0.487,h:0.70,type:'photo'},{x:0.513,y:0.30,w:0.487,h:0.70,type:'photo'}] },

  // ── casual / scattered ────────────────────────────────────────────────────
  { id:'casual-toss-3',  category:'Casual', label:{sq:'Të hedhura 3',      en:'Tossed 3'},          zones:[
    {x:0.06,y:0.05,w:0.52,h:0.42,type:'photo',rotation:-6},
    {x:0.40,y:0.46,w:0.54,h:0.42,type:'photo',rotation:4},
    {x:0.04,y:0.55,w:0.40,h:0.34,type:'photo',rotation:-3},
  ]},
  { id:'casual-pile-4',  category:'Casual', label:{sq:'Grumbull 4',        en:'Photo pile 4'},      zones:[
    {x:0.10,y:0.06,w:0.46,h:0.40,type:'photo',rotation:5},
    {x:0.42,y:0.10,w:0.48,h:0.40,type:'photo',rotation:-4},
    {x:0.06,y:0.50,w:0.46,h:0.40,type:'photo',rotation:-6},
    {x:0.44,y:0.54,w:0.46,h:0.38,type:'photo',rotation:3},
  ]},
  { id:'casual-strip-3', category:'Casual', label:{sq:'Shirit i lirë 3',   en:'Loose strip 3'},     zones:[
    {x:0.02,y:0.10,w:0.32,h:0.66,type:'photo',rotation:-5},
    {x:0.35,y:0.02,w:0.32,h:0.66,type:'photo',rotation:3},
    {x:0.67,y:0.14,w:0.31,h:0.66,type:'photo',rotation:-2},
  ]},
  { id:'casual-note-2',  category:'Casual', label:{sq:'Shënim + 2',        en:'Note + 2 tossed'},   zones:[
    {x:0.08,y:0.06,w:0.46,h:0.38,type:'photo',rotation:-5},
    {x:0.44,y:0.14,w:0.44,h:0.34,type:'photo',rotation:6},
    {x:0.14,y:0.56,w:0.72,h:0.30,type:'text',rotation:-1},
  ]},
];

export const LAYOUT_CATEGORY_LABELS: Record<string, {sq: string; en: string}> = {
  '1 Photo':      { sq: '1 Foto',           en: '1 Photo'      },
  'Photo + Text': { sq: 'Foto + Tekst',      en: 'Photo + Text' },
  'Text':         { sq: 'Tekst',             en: 'Text'         },
  '2 Photos':     { sq: '2 Foto',            en: '2 Photos'     },
  '3 Photos':     { sq: '3 Foto',            en: '3 Photos'     },
  '4 Photos':     { sq: '4 Foto',            en: '4 Photos'     },
  '5-6 Photos':   { sq: '5-6 Foto',          en: '5-6 Photos'   },
  'Magazine':     { sq: 'Revistë',           en: 'Magazine'     },
  'Casual':       { sq: 'Rastësor',          en: 'Casual'       },
};

export const CATEGORY_LABELS: Record<string, {sq: string; en: string}> = {
  'Wedding':       { sq: 'Dasma',          en: 'Wedding'       },
  'Travel':        { sq: 'Udhëtime',       en: 'Travel'        },
  'Locations':     { sq: 'Vendndodhje',    en: 'Locations'     },
  'Baby & Family': { sq: 'Bebe & Familja', en: 'Baby & Family' },
  'Celebration':   { sq: 'Festime',        en: 'Celebration'   },
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
export const SH = (k: 'rect'|'circle', x:number, y:number, w:number, h:number, fill:string, o:Partial<DE>={}): DE =>
  ({ type:'shape', shapeKind:k, x, y, w, h, rotation:0, fill, opacity:0.4, strokeWidth:0, ...o });
export const PH = (x:number, y:number, w:number, h:number, rotation=0): DE => ({ type:'placeholder', x, y, w, h, rotation });
export const TX = (text:string, x:number, y:number, w:number, h:number, o:Partial<DE>={}): DE =>
  ({ type:'text', x, y, w, h, rotation:0, text,
     fontSize:18, fill:'#333333', align:'center', fontFamily:'Georgia, serif', fontStyle:'normal', ...o });
/** Movable cover graphic (transparent PNG) — used by landmark travel templates. */
export const IMG = (src: string, x: number, y: number, w: number, h: number, o: Partial<DE> = {}): DE =>
  ({ type: 'image', src, x, y, w, h, rotation: 0, ...o });


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

/** Editorial city cover — solid brand color + framed photo + bold type
 *  (same spirit as Paris/Barcelona landmark covers, without needing a PNG icon). */
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
      thumb: { background: paper },
      thumbAccents: [],
      elements: [
        BG(paper),
        TX(label, 24, 48, DESIGN_W - 48, 100, {
          fontSize: labelSize, fill, align: 'center',
          fontFamily: "'Londrina Solid', cursive", letterSpacing: 5,
        }),
        TX(year, 180, 150, 240, 40, {
          fontSize: 26, fill: yearFill, align: 'center',
          fontFamily: "'Londrina Solid', cursive", letterSpacing: 3,
        }),
        SH('rect', 28, 210, DESIGN_W - 56, 4, accent, { opacity: 1, strokeWidth: 0 }),
        IMG(thumbPhoto, 28, 230, DESIGN_W - 56, DESIGN_H - 258),
      ],
    };
  }

  if (layout === 'banner') {
    return {
      id, name, category: 'Travel', thumbPhoto,
      thumb: { background: paper },
      thumbAccents: [],
      elements: [
        BG(paper),
        IMG(thumbPhoto, 0, 160, DESIGN_W, DESIGN_H - 160),
        SH('rect', 0, 0, DESIGN_W, 168, paper, { opacity: 1, strokeWidth: 0 }),
        TX(label, 20, 36, DESIGN_W - 40, 90, {
          fontSize: labelSize, fill, align: 'center',
          fontFamily: "'Londrina Solid', cursive", letterSpacing: 5,
        }),
        TX(year, 200, 118, 200, 36, {
          fontSize: 22, fill: yearFill, align: 'center',
          fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
        }),
      ],
    };
  }

  // postcard (default) — color field, floating photo card, title/year
  return {
    id, name, category: 'Travel', thumbPhoto,
    thumb: { background: paper },
    thumbAccents: [],
    elements: [
      BG(paper),
      TX(label, 20, 36, DESIGN_W - 40, 100, {
        fontSize: labelSize, fill, align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 6,
      }),
      SH('circle', 48, 150, 18, 18, accent, { opacity: 0.9, strokeWidth: 0 }),
      SH('circle', DESIGN_W - 66, 160, 12, 12, fill, { opacity: 0.35, strokeWidth: 0 }),
      IMG(thumbPhoto, 40, 180, DESIGN_W - 80, 460),
      SH('rect', 40, 180, DESIGN_W - 80, 460, '#000000', { opacity: 0.08, strokeWidth: 0 }),
      TX(year, 180, 680, 240, 52, {
        fontSize: 30, fill: yearFill, align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
      SH('rect', 220, 740, 160, 3, accent, { opacity: 1, strokeWidth: 0 }),
    ],
  };
}

// Premade covers: wedding + ADOR + Paris/Barcelona landmarks + real city photos
export const DESIGNS: DesignDef[] = [

  // ── WEDDING ──────────────────────────────────────────────────────────────
  {
    id: 'cream-names',
    name: { sq: 'Emrat Tanë', en: 'Our Names' },
    category: 'Wedding',
    thumb: { background: '#ECE7E1' },
    thumbAccents: [],
    elements: [
      BG('#ECE7E1'),
      TX('Elira & Ardit', 40, 330, DESIGN_W - 80, 90, {
        fontSize: 42,
        fill: '#1A1A1A',
        fontStyle: 'normal',
        align: 'center',
        fontFamily: "'Great Vibes', cursive",
      }),
      TX('14.09.2024', 150, 430, DESIGN_W - 300, 40, {
        fontSize: 16,
        fill: '#1A1A1A',
        align: 'center',
        fontFamily: 'Arial, Helvetica, sans-serif',
        letterSpacing: 2,
      }),
    ],
  },
  {
    id: 'the-wedding-of',
    name: { sq: 'Dasma', en: 'The Wedding' },
    category: 'Wedding',
    thumbPhoto: '/designs/wedding-spin-thumb.jpg',
    thumb: { background: '#1A2A1A' },
    thumbAccents: [],
    elements: [
      BG('#1A2A1A'),
      IMG('/designs/wedding-spin-cover.jpg', 0, 0, DESIGN_W, DESIGN_H),
      TX('THE', 48, 48, 80, 28, {
        fontSize: 13, fill: '#FFFFFF', align: 'left',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 3,
      }),
      TX('WEDDING', 40, 70, DESIGN_W - 80, 88, {
        fontSize: 64, fill: '#FFFFFF', fontStyle: 'bold', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: 4,
      }),
      TX('OF', 48, 150, 80, 28, {
        fontSize: 13, fill: '#FFFFFF', align: 'left',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 3,
      }),
      TX('ANISA & ENDRIT', 40, 200, DESIGN_W - 80, 48, {
        fontSize: 22, fill: '#FFFFFF', fontStyle: 'bold', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: 3,
      }),
      TX('14 JUNE 2025', 100, 740, DESIGN_W - 200, 36, {
        fontSize: 13, fill: '#1A1A1A', align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 2,
      }),
    ],
  },

  // ── TRAVEL — landmark icons + real city photographs ─────────────────────
  {
    id: 'paris-pink',
    name: { sq: 'Paris', en: 'Paris' },
    category: 'Travel',
    thumbPhoto: '/designs/paris-cover-thumb.jpg',
    thumb: { background: '#FEC5D7' },
    thumbAccents: [],
    elements: [
      BG('#FEC5D7'),
      TX('PARIS', 20, 28, DESIGN_W - 40, 120, {
        fontSize: 92, fill: '#FFFFFF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 8,
      }),
      TX('2022', 388, 148, 170, 52, {
        fontSize: 34, fill: '#F878C3', align: 'left',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 2,
      }),
      IMG('/designs/eiffel-tower.png', 95, 120, 410, 640),
    ],
  },
  {
    id: 'barcelona-red',
    name: { sq: 'Barcelona', en: 'Barcelona' },
    category: 'Travel',
    thumbPhoto: '/designs/barcelona-cover-thumb.jpg',
    thumb: { background: '#A83442' },
    thumbAccents: [],
    elements: [
      BG('#A83442'),
      TX('BARCELONA', 12, 42, DESIGN_W - 24, 100, {
        fontSize: 58, fill: '#FCB426', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
      IMG('/designs/sagrada-familia.png', 70, 160, 460, 520),
      TX('2026', 180, 718, 240, 52, {
        fontSize: 32, fill: '#FCB426', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 3,
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

  // ── CELEBRATION ───────────────────────────────────────────────────────────
  {
    id: 'birthday-bloom',
    name: { sq: 'Ditëlindje', en: 'Birthday' },
    category: 'Celebration',
    thumb: { background: '#FF6B8A' },
    thumbAccents: [],
    elements: [
      BG('#FF6B8A', { from: '#FF6B8A', to: '#FF8E53', dir: 'diag' }),
      SH('circle', 40, 80, 70, 70, '#FFE08A', { opacity: 0.95, strokeWidth: 0 }),
      SH('circle', 480, 140, 40, 40, '#FFFFFF', { opacity: 0.55, strokeWidth: 0 }),
      SH('circle', 90, 620, 55, 55, '#7C5CFF', { opacity: 0.85, strokeWidth: 0 }),
      SH('circle', 460, 560, 28, 28, '#FFE08A', { opacity: 0.9, strokeWidth: 0 }),
      SH('circle', 300, 700, 22, 22, '#FFFFFF', { opacity: 0.4, strokeWidth: 0 }),
      TX('HAPPY', 40, 240, DESIGN_W - 80, 70, {
        fontSize: 48, fill: '#FFFFFF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 10,
      }),
      TX('BIRTHDAY', 24, 310, DESIGN_W - 48, 100, {
        fontSize: 72, fill: '#1A1A1A', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
      SH('circle', 270, 450, 50, 50, '#FFFFFF', { opacity: 0.35, strokeWidth: 0 }),
      SH('circle', 285, 465, 20, 20, '#7C5CFF', { opacity: 1, strokeWidth: 0 }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 48, {
        fontSize: 28, fill: '#FFFFFF', align: 'center',
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
      SH('circle', -20, -20, 160, 160, '#7C3AED', { opacity: 0.35, strokeWidth: 0 }),
      SH('circle', 420, 600, 200, 200, '#EC4899', { opacity: 0.25, strokeWidth: 0 }),
      TX("LET'S", 40, 220, DESIGN_W - 80, 60, {
        fontSize: 36, fill: '#E9D5FF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 12,
      }),
      TX('PARTY', 20, 290, DESIGN_W - 40, 120, {
        fontSize: 96, fill: '#F0ABFC', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 6,
      }),
      SH('rect', 180, 430, 240, 4, '#F0ABFC', { opacity: 0.8, strokeWidth: 0 }),
      TX('ALL NIGHT', 100, 460, DESIGN_W - 200, 40, {
        fontSize: 18, fill: '#C4B5FD', align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 6,
      }),
      TX(String(new Date().getFullYear()), 180, 700, 240, 48, {
        fontSize: 26, fill: '#FFFFFF', align: 'center',
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
        opacity: 0, strokeWidth: 2, strokeColor: '#C9A227',
      }),
      TX('CHEERS', 24, 300, DESIGN_W - 48, 110, {
        fontSize: 78, fill: '#C9A227', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 8,
      }),
      SH('rect', 160, 430, 280, 2, '#C9A227', { opacity: 1, strokeWidth: 0 }),
      TX('to us', 100, 460, DESIGN_W - 200, 48, {
        fontSize: 28, fill: '#F5E6C8', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic',
      }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 48, {
        fontSize: 24, fill: '#C9A227', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
    ],
  },
  {
    id: 'friends-forever',
    name: { sq: 'Miqësi', en: 'Friends' },
    category: 'Celebration',
    thumb: { background: '#0E4D5C' },
    thumbAccents: [],
    elements: [
      BG('#0E4D5C', { from: '#0E4D5C', to: '#14919B', dir: 'diag' }),
      TX('FRIENDS', 20, 260, DESIGN_W - 40, 100, {
        fontSize: 68, fill: '#FFFFFF', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
      TX('forever', 100, 370, DESIGN_W - 200, 50, {
        fontSize: 32, fill: '#A8E6E1', align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic',
      }),
      SH('circle', 270, 460, 60, 60, '#FFFFFF', { opacity: 0.15, strokeWidth: 0 }),
      SH('circle', 250, 480, 40, 40, '#FF6B6B', { opacity: 0.9, strokeWidth: 0 }),
      TX(String(new Date().getFullYear()), 180, 680, 240, 48, {
        fontSize: 26, fill: '#FFFFFF', align: 'center',
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
      SH('circle', 30, 60, 24, 24, '#FFF', { opacity: 0.85, strokeWidth: 0 }),
      SH('circle', 520, 100, 16, 16, '#FFE08A', { opacity: 1, strokeWidth: 0 }),
      SH('circle', 80, 200, 12, 12, '#FF4D6D', { opacity: 1, strokeWidth: 0 }),
      SH('circle', 480, 240, 20, 20, '#7C5CFF', { opacity: 0.85, strokeWidth: 0 }),
      SH('circle', 60, 520, 18, 18, '#FFE08A', { opacity: 1, strokeWidth: 0 }),
      SH('circle', 500, 560, 14, 14, '#FFF', { opacity: 0.7, strokeWidth: 0 }),
      SH('circle', 200, 700, 10, 10, '#FF4D6D', { opacity: 1, strokeWidth: 0 }),
      TX('YAY!', 40, 280, DESIGN_W - 80, 140, {
        fontSize: 120, fill: '#1A1A1A', align: 'center',
        fontFamily: "'Londrina Solid', cursive", letterSpacing: 4,
      }),
      TX('we celebrate', 80, 440, DESIGN_W - 160, 40, {
        fontSize: 20, fill: '#FFFFFF', align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif", letterSpacing: 4,
      }),
      TX(String(new Date().getFullYear()), 180, 660, 240, 48, {
        fontSize: 28, fill: '#1A1A1A', align: 'center',
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
      TX('ADOR', 40, 210, DESIGN_W - 80, 72, {
        fontSize: 48,
        fill: '#4A7593',
        align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif",
        letterSpacing: 10,
      }),
    ],
  },

];

/** Front cover elements for a design. */
export function designFrontElements(d: DesignDef): DE[] {
  return Array.isArray(d.elements) ? d.elements : [];
}

/** Back cover elements — falls back to front when unset/empty. */
export function designBackElements(d: DesignDef): DE[] {
  if (Array.isArray(d.backElements) && d.backElements.length) return d.backElements;
  return designFrontElements(d);
}

/** Per-design layout override: legacy DE[] = both sides, or explicit front/back. */
export type DesignSideOverride = {
  frontElements?: DE[];
  backElements?: DE[];
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
  const front = Array.isArray(o.frontElements)
    ? (o.frontElements as DE[])
    : Array.isArray(o.elements)
      ? (o.elements as DE[])
      : undefined;
  const back = Array.isArray(o.backElements) ? (o.backElements as DE[]) : undefined;
  if ((!front || !front.length) && (!back || !back.length)) return null;
  return {
    frontElements: front?.length ? front : back,
    backElements: back?.length ? back : front,
  };
}

/** Merge persisted admin overrides onto a design list. */
export function applyDesignOverrides(
  designs: DesignDef[] = DESIGNS,
  overrides?: DesignOverrides | null,
): DesignDef[] {
  if (!overrides || typeof overrides !== 'object') return designs;
  return designs.map((d) => {
    const norm = normalizeOverride(overrides[d.id]);
    if (!norm) return d;
    return {
      ...d,
      elements: norm.frontElements?.length ? norm.frontElements : d.elements,
      backElements: norm.backElements?.length
        ? norm.backElements
        : (d.backElements ?? d.elements),
    };
  });
}

export function getDesignWithOverrides(
  id: string,
  overrides?: DesignOverrides | null,
  customDesigns?: CustomDesignRecord[] | null,
): DesignDef | undefined {
  return buildDesignCatalog(overrides, customDesigns).find((d) => d.id === id);
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

/** Built-ins (with overrides) + admin custom designs. */
export function buildDesignCatalog(
  overrides?: DesignOverrides | null,
  customDesigns?: CustomDesignRecord[] | null,
): DesignDef[] {
  const builtIn = applyDesignOverrides(DESIGNS, overrides);
  const customs = parseCustomDesigns(customDesigns).map(customDesignToDef);
  const customsApplied = applyDesignOverrides(customs, overrides);
  return [...builtIn, ...customsApplied];
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
