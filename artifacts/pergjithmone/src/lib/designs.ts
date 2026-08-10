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
  text?: string; fontSize?: number; fontFamily?: string;
  fill?: string; align?: 'left' | 'center' | 'right'; fontStyle?: string;
  lineHeight?: number; letterSpacing?: number;
  bgColor?: string;
  bgGradientFrom?: string; bgGradientTo?: string; bgGradientDir?: 'tb' | 'lr' | 'diag';
  shapeKind?: 'rect' | 'circle';
  strokeColor?: string; strokeWidth?: number; strokeDash?: number[]; cornerRadius?: number;
}
export type DE = Omit<EditorElement, 'id'>;

export interface DesignDef {
  id: string; name: { sq: string; en: string }; category: string;
  thumb: CSSProperties;
  thumbAccents: CSSProperties[];
  /** Optional photo URL shown in the picker thumbnail only — doesn't affect what's applied to pages. */
  thumbPhoto?: string;
  elements: DE[];
}
export interface LayoutZone { x:number; y:number; w:number; h:number; type:string; rotation?:number }
export interface LayoutDef { id:string; category:string; label:{sq:string;en:string}; zones:LayoutZone[] }

export const LAYOUTS: LayoutDef[] = [
  // ── 1-photo ───────────────────────────────────────────────────────────────
  { id:'full',           category:'1 Photo', label:{sq:'Foto e plotë',      en:'Full bleed'},        zones:[{x:0,y:0,w:1,h:1,type:'photo'}] },
  { id:'bordered-single',category:'1 Photo', label:{sq:'Me kufi',           en:'Bordered'},          zones:[{x:0.06,y:0.05,w:0.88,h:0.90,type:'photo'}] },
  { id:'portrait-center',category:'1 Photo', label:{sq:'Portret qendror',   en:'Portrait center'},   zones:[{x:0.12,y:0.08,w:0.76,h:0.84,type:'photo'}] },
  { id:'panoramic',      category:'1 Photo', label:{sq:'Panoramik',         en:'Panoramic strip'},   zones:[{x:0,y:0.22,w:1,h:0.56,type:'photo'}] },

  // ── 1-photo + text ────────────────────────────────────────────────────────
  { id:'photo-cap',      category:'Photo + Text', label:{sq:'Foto + Titull',     en:'Photo + Caption'},   zones:[{x:0,y:0,w:1,h:0.74,type:'photo'},{x:0.06,y:0.77,w:0.88,h:0.18,type:'text'}] },
  { id:'portrait-cap',   category:'Photo + Text', label:{sq:'Portret + tekst',   en:'Portrait + text'},   zones:[{x:0.08,y:0.05,w:0.84,h:0.72,type:'photo'},{x:0.08,y:0.79,w:0.84,h:0.16,type:'text'}] },
  { id:'cap-top',        category:'Photo + Text', label:{sq:'Titull + Foto',     en:'Title + Photo'},     zones:[{x:0.06,y:0.05,w:0.88,h:0.18,type:'text'},{x:0,y:0.26,w:1,h:0.74,type:'photo'}] },
  { id:'port-l-cap-r',   category:'Photo + Text', label:{sq:'Foto + Kolumnë',   en:'Photo + Column'},    zones:[{x:0,y:0,w:0.55,h:1,type:'photo'},{x:0.58,y:0.30,w:0.38,h:0.40,type:'text'}] },
  { id:'photo-text-r',   category:'Photo + Text', label:{sq:'Foto + Tekst →',   en:'Photo + Text →'},   zones:[{x:0,y:0,w:0.60,h:1,type:'photo'},{x:0.62,y:0.06,w:0.35,h:0.88,type:'text'}] },
  { id:'text-photo',     category:'Photo + Text', label:{sq:'Tekst + Foto',      en:'Text + Photo'},      zones:[{x:0.08,y:0.06,w:0.84,h:0.28,type:'photo'},{x:0.08,y:0.38,w:0.84,h:0.54,type:'text'}] },
  { id:'strip-text',     category:'Photo + Text', label:{sq:'Baner + Foto',      en:'Banner + Photo'},    zones:[{x:0.06,y:0.04,w:0.88,h:0.18,type:'text'},{x:0,y:0.24,w:1,h:0.76,type:'photo'}] },

  // ── text only ─────────────────────────────────────────────────────────────
  { id:'quote',          category:'Text', label:{sq:'Faqe citimi',       en:'Quote page'},        zones:[{x:0.08,y:0.10,w:0.84,h:0.80,type:'text'}] },
  { id:'quote-photo',    category:'Text', label:{sq:'Citat + Foto',      en:'Quote + Photo'},     zones:[{x:0.08,y:0.06,w:0.84,h:0.48,type:'text'},{x:0.15,y:0.58,w:0.70,h:0.36,type:'photo'}] },

  // ── 2-photo ───────────────────────────────────────────────────────────────
  { id:'two-v',          category:'2 Photos', label:{sq:'2 Horizontale',     en:'2 Stacked'},         zones:[{x:0,y:0,w:1,h:0.487,type:'photo'},{x:0,y:0.513,w:1,h:0.487,type:'photo'}] },
  { id:'two-h',          category:'2 Photos', label:{sq:'2 Vertikale',       en:'2 Columns'},         zones:[{x:0,y:0,w:0.487,h:1,type:'photo'},{x:0.513,y:0,w:0.487,h:1,type:'photo'}] },
  { id:'two-portraits',  category:'2 Photos', label:{sq:'2 Portrete',        en:'2 Portraits'},       zones:[{x:0.02,y:0.04,w:0.47,h:0.92,type:'photo'},{x:0.51,y:0.04,w:0.47,h:0.92,type:'photo'}] },
  { id:'two-landscape',  category:'2 Photos', label:{sq:'2 Peizazhe',        en:'2 Landscape'},       zones:[{x:0.04,y:0.04,w:0.92,h:0.44,type:'photo'},{x:0.04,y:0.52,w:0.92,h:0.44,type:'photo'}] },

  // ── 3-photo ───────────────────────────────────────────────────────────────
  { id:'triptych',       category:'3 Photos', label:{sq:'Triptik',           en:'Triptych'},          zones:[{x:0,y:0,w:0.316,h:1,type:'photo'},{x:0.342,y:0,w:0.316,h:1,type:'photo'},{x:0.684,y:0,w:0.316,h:1,type:'photo'}] },
  { id:'strips-3',       category:'3 Photos', label:{sq:'3 Shtresa',         en:'3 Strips'},          zones:[{x:0,y:0,w:1,h:0.316,type:'photo'},{x:0,y:0.342,w:1,h:0.316,type:'photo'},{x:0,y:0.684,w:1,h:0.316,type:'photo'}] },
  { id:'three-mid',      category:'3 Photos', label:{sq:'3 Qendrore',        en:'3 Centered'},        zones:[{x:0,y:0.13,w:0.316,h:0.74,type:'photo'},{x:0.342,y:0.13,w:0.316,h:0.74,type:'photo'},{x:0.684,y:0.13,w:0.316,h:0.74,type:'photo'}] },
  { id:'hero-r',         category:'3 Photos', label:{sq:'Kryesore + 2',      en:'Hero + 2 right'},    zones:[{x:0,y:0,w:0.63,h:1,type:'photo'},{x:0.65,y:0,w:0.35,h:0.487,type:'photo'},{x:0.65,y:0.513,w:0.35,h:0.487,type:'photo'}] },
  { id:'hero-l',         category:'3 Photos', label:{sq:'2 + Kryesore',      en:'2 left + Hero'},     zones:[{x:0,y:0,w:0.35,h:0.487,type:'photo'},{x:0,y:0.513,w:0.35,h:0.487,type:'photo'},{x:0.37,y:0,w:0.63,h:1,type:'photo'}] },
  { id:'tall-l-2r',      category:'3 Photos', label:{sq:'E gjatë + 2',       en:'Tall + 2 right'},    zones:[{x:0,y:0,w:0.55,h:1,type:'photo'},{x:0.57,y:0,w:0.43,h:0.487,type:'photo'},{x:0.57,y:0.513,w:0.43,h:0.487,type:'photo'}] },
  { id:'asymm-3',        category:'3 Photos', label:{sq:'Asimetrik 3',       en:'Asymmetric 3'},      zones:[{x:0,y:0,w:0.60,h:0.60,type:'photo'},{x:0.62,y:0,w:0.38,h:0.60,type:'photo'},{x:0,y:0.62,w:1,h:0.38,type:'photo'}] },
  { id:'land-2port',     category:'3 Photos', label:{sq:'Peizazh + 2',       en:'Landscape + 2'},     zones:[{x:0,y:0,w:1,h:0.42,type:'photo'},{x:0,y:0.44,w:0.487,h:0.56,type:'photo'},{x:0.513,y:0.44,w:0.487,h:0.56,type:'photo'}] },
  { id:'scatter-3',      category:'3 Photos', label:{sq:'Mozaik 3',          en:'Scatter 3'},         zones:[{x:0.02,y:0.02,w:0.58,h:0.50,type:'photo'},{x:0.42,y:0.54,w:0.56,h:0.44,type:'photo'},{x:0.02,y:0.55,w:0.38,h:0.43,type:'photo'}] },

  // ── 4-photo ───────────────────────────────────────────────────────────────
  { id:'grid4',          category:'4 Photos', label:{sq:'Rrjetë 4',          en:'4 Grid'},            zones:[{x:0,y:0,w:0.487,h:0.487,type:'photo'},{x:0.513,y:0,w:0.487,h:0.487,type:'photo'},{x:0,y:0.513,w:0.487,h:0.487,type:'photo'},{x:0.513,y:0.513,w:0.487,h:0.487,type:'photo'}] },
  { id:'masonry-4',      category:'4 Photos', label:{sq:'Guri 4',            en:'Masonry 4'},         zones:[{x:0,y:0,w:0.487,h:0.60,type:'photo'},{x:0.513,y:0,w:0.487,h:0.45,type:'photo'},{x:0,y:0.62,w:0.487,h:0.38,type:'photo'},{x:0.513,y:0.47,w:0.487,h:0.53,type:'photo'}] },
  { id:'hero-3r',        category:'4 Photos', label:{sq:'Kryesore + 3',      en:'Hero + 3 right'},    zones:[{x:0,y:0,w:0.63,h:1,type:'photo'},{x:0.65,y:0,w:0.35,h:0.316,type:'photo'},{x:0.65,y:0.342,w:0.35,h:0.316,type:'photo'},{x:0.65,y:0.684,w:0.35,h:0.316,type:'photo'}] },
  { id:'feature-2',      category:'4 Photos', label:{sq:'Kryesore + 2',      en:'Feature + 2 below'}, zones:[{x:0,y:0,w:1,h:0.62,type:'photo'},{x:0,y:0.64,w:0.487,h:0.36,type:'photo'},{x:0.513,y:0.64,w:0.487,h:0.36,type:'photo'}] },
  { id:'feature-2below', category:'4 Photos', label:{sq:'Seksion + 2',       en:'Framed + 2'},        zones:[{x:0.02,y:0.02,w:0.96,h:0.56,type:'photo'},{x:0.02,y:0.60,w:0.47,h:0.38,type:'photo'},{x:0.51,y:0.60,w:0.47,h:0.38,type:'photo'}] },

  // ── 5-6 photo ─────────────────────────────────────────────────────────────
  { id:'filmstrip-5',    category:'5-6 Photos', label:{sq:'Shirit 5',          en:'Filmstrip 5'},       zones:[{x:0,y:0,w:0.188,h:1,type:'photo'},{x:0.203,y:0,w:0.188,h:1,type:'photo'},{x:0.406,y:0,w:0.188,h:1,type:'photo'},{x:0.609,y:0,w:0.188,h:1,type:'photo'},{x:0.812,y:0,w:0.188,h:1,type:'photo'}] },
  { id:'gallery-5',      category:'5-6 Photos', label:{sq:'Galeri 5',          en:'Gallery 5'},         zones:[{x:0,y:0,w:0.487,h:0.45,type:'photo'},{x:0.513,y:0,w:0.487,h:0.45,type:'photo'},{x:0,y:0.47,w:0.316,h:0.53,type:'photo'},{x:0.342,y:0.47,w:0.316,h:0.53,type:'photo'},{x:0.684,y:0.47,w:0.316,h:0.53,type:'photo'}] },
  { id:'grid-6',         category:'5-6 Photos', label:{sq:'Rrjetë 6',          en:'6 Grid'},            zones:[{x:0,y:0,w:0.487,h:0.316,type:'photo'},{x:0.513,y:0,w:0.487,h:0.316,type:'photo'},{x:0,y:0.342,w:0.487,h:0.316,type:'photo'},{x:0.513,y:0.342,w:0.487,h:0.316,type:'photo'},{x:0,y:0.684,w:0.487,h:0.316,type:'photo'},{x:0.513,y:0.684,w:0.487,h:0.316,type:'photo'}] },

  // ── magazine / editorial ──────────────────────────────────────────────────
  { id:'mag',            category:'Magazine', label:{sq:'Revistë',           en:'Magazine'},          zones:[{x:0,y:0,w:0.55,h:0.62,type:'photo'},{x:0.57,y:0,w:0.43,h:1,type:'photo'},{x:0,y:0.64,w:0.55,h:0.36,type:'text'}] },
  { id:'text-2photos',   category:'Magazine', label:{sq:'Tekst + 2 Foto',    en:'Text + 2 Photos'},   zones:[{x:0.06,y:0.05,w:0.88,h:0.22,type:'text'},{x:0,y:0.30,w:0.487,h:0.70,type:'photo'},{x:0.513,y:0.30,w:0.487,h:0.70,type:'photo'}] },
  { id:'top-3below',     category:'Magazine', label:{sq:'Sip + 3 Poshtë',   en:'Top + 3 below'},     zones:[{x:0,y:0,w:1,h:0.55,type:'photo'},{x:0,y:0.57,w:0.316,h:0.43,type:'photo'},{x:0.342,y:0.57,w:0.316,h:0.43,type:'photo'},{x:0.684,y:0.57,w:0.316,h:0.43,type:'photo'}] },

  // ── casual / scattered — deliberately imperfect, tilted placements ────────
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


/** Bump Unsplash (etc.) picker thumbs (w=400) to a size usable on covers/PDF. */
export function wallpaperSrc(thumbPhoto: string, width = 1600): string {
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
 * Bake a design wallpaper into cover-ready elements so the builder matches the
 * picker: full-bleed image background + photo slots filled with the same image
 * (user can still replace those images later).
 */
export function elementsWithCoverWallpaper(elements: DE[], thumbPhoto?: string): DE[] {
  if (!thumbPhoto) return elements;
  const src = wallpaperSrc(thumbPhoto);
  return elements.map((el) => {
    if (el.type === 'background') {
      return {
        ...el,
        src,
        // Solid/gradient underneath as fallback while the image loads
        bgGradientFrom: undefined,
        bgGradientTo: undefined,
      };
    }
    if (el.type === 'placeholder') {
      return { ...el, type: 'image' as const, src };
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

export const DESIGNS: DesignDef[] = [

  // ── WEDDING ──────────────────────────────────────────────────────────────
  {
    id: 'cream-names',
    name: { sq: 'Emra në Krem', en: 'Cream Names' },
    category: 'Wedding',
    // No thumbPhoto here — solid cream + movable text (picker thumb lives in designMeta)
    thumb: { background: '#ECE7E1' },
    thumbAccents: [],
    elements: [
      BG('#ECE7E1'),
      TX('Emiljano & Artemisa', 40, 330, DESIGN_W - 80, 90, {
        fontSize: 42,
        fill: '#1A1A1A',
        fontStyle: 'italic',
        align: 'center',
        fontFamily: "'Great Vibes', 'Dancing Script', 'Segoe Script', Georgia, cursive",
      }),
      TX('13.09.2023', 150, 430, DESIGN_W - 300, 40, {
        fontSize: 16,
        fill: '#1A1A1A',
        align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
        letterSpacing: 2,
      }),
    ],
  },
  {
    id: 'the-wedding-of',
    name: { sq: 'Dasma e', en: 'The Wedding Of' },
    category: 'Wedding',
    thumbPhoto: '/designs/wedding-spin-thumb.jpg',
    thumb: { background: '#1A2A1A' },
    thumbAccents: [],
    elements: [
      BG('#1A2A1A'),
      // Full-bleed replaceable cover photo (movable/replaceable image layer)
      IMG('/designs/wedding-spin-cover.jpg', 0, 0, DESIGN_W, DESIGN_H),
      TX('THE', 48, 48, 80, 28, {
        fontSize: 13,
        fill: '#FFFFFF',
        align: 'left',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
        letterSpacing: 3,
      }),
      TX('WEDDING', 40, 70, DESIGN_W - 80, 88, {
        fontSize: 64,
        fill: '#FFFFFF',
        fontStyle: 'bold',
        align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif",
        letterSpacing: 4,
      }),
      TX('OF', 48, 150, 80, 28, {
        fontSize: 13,
        fill: '#FFFFFF',
        align: 'left',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
        letterSpacing: 3,
      }),
      TX('VIONTINA & MARIGLEN', 40, 200, DESIGN_W - 80, 48, {
        fontSize: 22,
        fill: '#FFFFFF',
        fontStyle: 'bold',
        align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif",
        letterSpacing: 3,
      }),
      TX('4 SEPTEMBER 2025', 100, 740, DESIGN_W - 200, 36, {
        fontSize: 13,
        fill: '#1A1A1A',
        align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
        letterSpacing: 2,
      }),
    ],
  },

  // ── TRAVEL — landmark covers (movable art + text; inners stay white) ─────
  {
    id: 'paris-pink',
    name: { sq: 'Paris Rozë', en: 'Paris Pink' },
    category: 'Travel',
    thumbPhoto: '/designs/paris-cover-thumb.jpg',
    thumb: { background: '#FEC5D6' },
    thumbAccents: [],
    elements: [
      BG('#FEC5D6'),
      // Layer order: title behind tower tip, year beside tower, tower on top
      TX('PARIS', 24, 36, DESIGN_W - 48, 110, {
        fontSize: 78,
        fill: '#FFFFFF',
        fontStyle: 'bold',
        align: 'center',
        fontFamily: "Impact, 'Arial Black', 'Helvetica Neue', sans-serif",
        letterSpacing: 4,
      }),
      TX('2022', 390, 150, 160, 48, {
        fontSize: 28,
        fill: '#E06A8A',
        fontStyle: 'bold',
        align: 'left',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
      }),
      IMG('/designs/eiffel-tower.png', 95, 120, 410, 640),
    ],
  },
  {
    id: 'barcelona-red',
    name: { sq: 'Barcelona', en: 'Barcelona' },
    category: 'Travel',
    thumbPhoto: '/designs/barcelona-cover-thumb.jpg',
    thumb: { background: '#A83441' },
    thumbAccents: [],
    elements: [
      BG('#A83441'),
      TX('BARCELONA', 16, 48, DESIGN_W - 32, 90, {
        fontSize: 52,
        fill: '#E8B84A',
        fontStyle: 'bold',
        align: 'center',
        fontFamily: "Impact, 'Arial Black', 'Helvetica Neue', sans-serif",
        letterSpacing: 2,
      }),
      IMG('/designs/sagrada-familia.png', 70, 160, 460, 520),
      TX('2026', 200, 720, 200, 48, {
        fontSize: 26,
        fill: '#E8B84A',
        fontStyle: 'bold',
        align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
      }),
    ],
  },

  // ── BABY & FAMILY ─────────────────────────────────────────────────────────
  {
    id: 'baby-ador',
    name: { sq: 'ADOR', en: 'ADOR' },
    category: 'Baby & Family',
    // No thumbPhoto — elephant+"1" are baked into background.src (not a movable image).
    // Picker thumb lives in designMeta. Only ADOR text is movable.
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

  {
    id:'champagne', name:{sq:'Shampanjë', en:'Champagne'}, category:'Celebration',
    thumb:{ background:'radial-gradient(ellipse at 40% 25%, #2C1E10 0%, #120C08 70%)' },
    thumbAccents:[
      { position:'absolute', top:4, left:4, right:4, bottom:4, border:'1px solid rgba(212,175,55,0.60)', borderRadius:2 },
      { position:'absolute', top:11, left:11, right:11, bottom:11, border:'0.5px solid rgba(196,160,48,0.38)', borderRadius:1 },
      { position:'absolute', top:18, left:18, right:18, height:30, background:'rgba(212,175,55,0.09)', borderRadius:1 },
      { position:'absolute', bottom:13, left:'28%', right:'28%', height:1, background:'rgba(212,175,55,0.65)' },
    ],
    elements:[
      BG('#120C08',{from:'#1C1408',to:'#2C1E10',dir:'diag'}),
      SH('rect',16,16,DESIGN_W-32,DESIGN_H-32,'transparent',{strokeColor:'#D4AF37',strokeWidth:1.2,opacity:0.65}),
      SH('rect',30,30,DESIGN_W-60,DESIGN_H-60,'transparent',{strokeColor:'#C4A030',strokeWidth:0.5,opacity:0.42}),
      SH('circle',DESIGN_W/2-90,-90,180,180,'#D4AF37',{opacity:0.06}),
      PH(56,68,DESIGN_W-112,458),
      SH('rect',56,540,DESIGN_W-112,0.8,'#D4AF37',{opacity:0.52}),
      TX('A Celebration',56,558,DESIGN_W-112,62,{fontSize:28,fill:'#D4AF37',fontStyle:'italic'}),
      TX("of Life's Golden Moments",56,634,DESIGN_W-112,52,{fontSize:14,fill:'#A88838'}),
      TX('★  ★  ★',DESIGN_W/2-55,702,110,40,{fontSize:16,fill:'#D4AF37'}),
    ],
  },

  {
    id:'confetti', name:{sq:'Konfeti', en:'Confetti'}, category:'Celebration',
    thumb:{ background:'#FFFCF5' },
    thumbAccents:[
      { position:'absolute', top:'-18px', left:'-18px', width:56, height:56, borderRadius:'50%', background:'#E63946' },
      { position:'absolute', top:'-18px', right:'-18px', width:56, height:56, borderRadius:'50%', background:'#457B9D' },
      { position:'absolute', bottom:'-18px', left:'-18px', width:56, height:56, borderRadius:'50%', background:'#2A9D8F' },
      { position:'absolute', bottom:'-18px', right:'-18px', width:56, height:56, borderRadius:'50%', background:'#F4A261' },
      { position:'absolute', inset:'16px', borderRadius:'50%', background:'#FFFFF5' },
    ],
    elements:[
      BG('#FFFCF5'),
      SH('circle',-130,-130,360,360,'#E63946',{opacity:0.92}),
      SH('circle',DESIGN_W-230,-130,360,360,'#457B9D',{opacity:0.92}),
      SH('circle',-130,DESIGN_H-230,360,360,'#2A9D8F',{opacity:0.92}),
      SH('circle',DESIGN_W-230,DESIGN_H-230,360,360,'#F4A261',{opacity:0.92}),
      SH('circle',50,140,500,500,'#FFFFF5',{opacity:0.96}),
      PH(84,84,DESIGN_W-168,DESIGN_H-252),
      SH('rect',84,DESIGN_H-160,DESIGN_W-168,1,'#ccc',{opacity:0.70}),
      TX("Let's Celebrate!",84,DESIGN_H-152,DESIGN_W-168,68,{fontSize:26,fill:'#1A1A1A',align:'center',fontFamily:"'Dancing Script', cursive"}),
      TX('every joyful moment',84,DESIGN_H-76,DESIGN_W-168,44,{fontSize:12,fill:'#888',align:'center'}),
    ],
  },

  {
    id:'ceremony', name:{sq:'Ceremoni', en:'Ceremony'}, category:'Celebration',
    thumb:{ background:'#0C1E3C' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, height:22, background:'#C8A83A', opacity:0.95 },
      { position:'absolute', top:5, left:5, right:5, height:12, background:'rgba(0,0,0,0.22)', borderRadius:1 },
      { position:'absolute', top:4, left:'30%', right:'30%', height:22, background:'rgba(12,30,60,0.88)' },
      { position:'absolute', inset:'22px 5px 5px 5px', border:'0.8px solid rgba(200,168,58,0.48)', borderRadius:1 },
      { position:'absolute', bottom:4, left:'35%', right:'35%', height:1, background:'rgba(200,168,58,0.60)' },
    ],
    elements:[
      BG('#0C1E3C'),
      SH('circle',DESIGN_W/2-200,-170,500,500,'#1A3060',{opacity:0.55}),
      SH('rect',0,0,DESIGN_W,76,'#C8A83A',{opacity:0.96}),
      SH('rect',0,76,DESIGN_W,4,'#C8A83A',{opacity:0.38}),
      TX('CLASS OF 2025',0,10,DESIGN_W,58,{fontSize:24,fill:'#0C1E3C',fontStyle:'bold',align:'center',fontFamily:'sans-serif'}),
      SH('rect',44,90,DESIGN_W-88,DESIGN_H-90,'transparent',{strokeColor:'#C8A83A',strokeWidth:1.2,opacity:0.60}),
      SH('rect',58,104,DESIGN_W-116,DESIGN_H-118,'transparent',{strokeColor:'#C8A83A',strokeWidth:0.5,opacity:0.32}),
      PH(70,116,DESIGN_W-140,452),
      SH('rect',70,582,DESIGN_W-140,1,'#C8A83A',{opacity:0.50}),
      TX('Congratulations',70,598,DESIGN_W-140,62,{fontSize:22,fill:'#FFFFFF',fontStyle:'italic',fontFamily:"'Playfair Display', serif"}),
      TX('Your future is bright',70,670,DESIGN_W-140,46,{fontSize:13,fill:'#C8A83A'}),
      SH('rect',DESIGN_W/2-55,726,110,1,'#C8A83A',{opacity:0.45}),
      TX('\u2605  \u2605  \u2605',DESIGN_W/2-60,738,120,40,{fontSize:13,fill:'#C8A83A',align:'center'}),
    ],
  },

  {
    id:'ruby', name:{sq:'Përvjetori Rubin', en:'Ruby Anniversary'}, category:'Celebration',
    thumb:{ background:'#2D0A18' },
    thumbAccents:[
      { position:'absolute', top:5, left:5, right:5, bottom:5, border:'1px solid rgba(200,168,64,0.62)', borderRadius:2 },
      { position:'absolute', top:13, left:13, right:13, bottom:13, border:'0.5px solid rgba(200,168,64,0.38)', borderRadius:1 },
      { position:'absolute', top:'-8px', right:'-8px', width:26, height:26, borderRadius:'50%', background:'rgba(200,32,72,0.45)' },
      { position:'absolute', bottom:12, left:'30%', right:'30%', height:1, background:'rgba(200,168,64,0.65)' },
    ],
    elements:[
      BG('#2D0A18'),
      SH('rect',18,18,DESIGN_W-36,DESIGN_H-36,'transparent',{strokeColor:'#C8A840',strokeWidth:1.2,opacity:0.65}),
      SH('rect',34,34,DESIGN_W-68,DESIGN_H-68,'transparent',{strokeColor:'#C0A038',strokeWidth:0.5,opacity:0.42}),
      SH('circle',DESIGN_W/2-90,-90,180,180,'#C82048',{opacity:0.08}),
      SH('circle',DESIGN_W-60,DESIGN_H-60,200,200,'#C82048',{opacity:0.07}),
      PH(54,68,DESIGN_W-108,452),
      SH('rect',54,534,DESIGN_W-108,0.8,'#C8A840',{opacity:0.52}),
      TX('With Love',54,552,DESIGN_W-108,64,{fontSize:30,fill:'#C8A840',fontStyle:'italic'}),
      TX('Always & Forever',54,628,DESIGN_W-108,50,{fontSize:15,fill:'#E08090'}),
      TX('❤',DESIGN_W/2-20,688,40,48,{fontSize:22,fill:'#C82048'}),
    ],
  },

  {
    id:'editorial', name:{sq:'Editorial', en:'Editorial'}, category:'Modern',
    thumb:{ background:'#F8F8F6' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, height:22, background:'#111111' },
      { position:'absolute', top:22, left:0, right:0, height:4, background:'#E63946' },
      { position:'absolute', top:7, left:7, width:30, height:3, background:'rgba(255,255,255,0.65)', borderRadius:1 },
      { position:'absolute', bottom:8, left:8, right:8, height:13, background:'rgba(17,17,17,0.80)', borderRadius:1 },
    ],
    elements:[
      BG('#F8F8F6'),
      SH('rect',0,0,DESIGN_W,72,'#111111',{opacity:1}),
      SH('rect',0,72,DESIGN_W,5,'#E63946',{opacity:1}),
      TX('EDITORIAL',38,18,300,48,{fontSize:14,fill:'#FFFFFF',fontStyle:'bold',align:'left',fontFamily:'sans-serif'}),
      TX('Vol. 01',DESIGN_W-140,18,102,48,{fontSize:11,fill:'rgba(255,255,255,0.55)',align:'right',fontFamily:'sans-serif'}),
      PH(0,77,DESIGN_W,505),
      SH('rect',0,582,DESIGN_W,DESIGN_H-582,'#111111',{opacity:0.92}),
      TX('A Story Worth Telling',38,600,DESIGN_W-76,72,{fontSize:28,fill:'#FFFFFF',align:'left'}),
      TX('— Issue One',38,688,DESIGN_W-76,44,{fontSize:13,fill:'#777777',align:'left'}),
    ],
  },

  {
    id:'nordic', name:{sq:'Minimaliste Nordike', en:'Nordic Minimal'}, category:'Modern',
    thumb:{ background:'#F2F0EC' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, bottom:0, width:'38%', background:'#E8E6E0' },
      { position:'absolute', top:0, left:'38%', bottom:0, width:1, background:'#B4B0AA', opacity:0.60 },
      { position:'absolute', top:8, left:8, width:'30%', height:12, background:'rgba(0,0,0,0.06)', borderRadius:1 },
      { position:'absolute', top:24, left:8, width:'26%', height:10, background:'rgba(0,0,0,0.04)', borderRadius:1 },
    ],
    elements:[
      BG('#F2F0EC'),
      SH('rect',0,0,220,DESIGN_H,'#E8E6E0',{opacity:1}),
      SH('rect',220,0,2,DESIGN_H,'#B4B0AA',{opacity:0.55}),
      TX('Minimal',26,56,180,60,{fontSize:26,fill:'#1A1A1A',fontStyle:'normal',align:'left',fontFamily:"'Cormorant Garamond', serif"}),
      TX('Memory',26,114,180,60,{fontSize:26,fill:'#1A1A1A',fontStyle:'italic',align:'left',fontFamily:"'Cormorant Garamond', serif"}),
      SH('rect',26,180,130,1.5,'#888',{opacity:0.45}),
      TX('A visual story of moments that stayed with us.',26,196,174,100,{fontSize:11,fill:'#777',align:'left',fontStyle:'italic'}),
      SH('rect',26,310,80,1,'#B4B0AA',{opacity:0.55}),
      TX('Vol. I',26,322,120,36,{fontSize:10,fill:'#999',align:'left',fontFamily:'sans-serif'}),
      SH('rect',26,DESIGN_H-60,130,1,'#B4B0AA',{opacity:0.50}),
      TX('2025',26,DESIGN_H-48,100,36,{fontSize:10,fill:'#AAA',align:'left',fontFamily:'sans-serif'}),
      PH(234,0,DESIGN_W-234,DESIGN_H),
    ],
  },

  {
    id:'blueprint', name:{sq:'Skicë', en:'Blueprint'}, category:'Modern',
    thumb:{ background:'#0A1929' },
    thumbAccents:[
      { position:'absolute', top:'33%', left:0, right:0, height:1, background:'rgba(0,180,216,0.30)' },
      { position:'absolute', top:'66%', left:0, right:0, height:1, background:'rgba(0,180,216,0.30)' },
      { position:'absolute', left:'45%', top:0, bottom:0, width:1, background:'rgba(0,180,216,0.30)' },
      { position:'absolute', top:6, left:6, right:6, bottom:6, border:'0.8px solid rgba(0,180,216,0.40)', borderRadius:1 },
      { position:'absolute', top:12, left:12, right:12, height:28, background:'rgba(0,0,0,0.18)', borderRadius:1 },
    ],
    elements:[
      BG('#0A1929'),
      SH('rect',0,200,DESIGN_W,0.5,'#00B4D8',{opacity:0.20}),
      SH('rect',0,400,DESIGN_W,0.5,'#00B4D8',{opacity:0.20}),
      SH('rect',0,600,DESIGN_W,0.5,'#00B4D8',{opacity:0.20}),
      SH('rect',150,0,0.5,DESIGN_H,'#00B4D8',{opacity:0.20}),
      SH('rect',300,0,0.5,DESIGN_H,'#00B4D8',{opacity:0.20}),
      SH('rect',450,0,0.5,DESIGN_H,'#00B4D8',{opacity:0.20}),
      SH('rect',16,16,DESIGN_W-32,DESIGN_H-32,'transparent',{strokeColor:'#00B4D8',strokeWidth:0.8,opacity:0.45}),
      PH(40,40,DESIGN_W-80,520),
      TX('Your Story',40,582,DESIGN_W-80,62,{fontSize:22,fill:'#00B4D8',align:'left',fontFamily:'monospace'}),
      TX('—  2025',40,656,DESIGN_W-80,42,{fontSize:13,fill:'rgba(0,180,216,0.55)',align:'left',fontFamily:'monospace'}),
    ],
  },

  {
    id:'birthday-bash', name:{sq:'Festë Ditëlindje', en:'Birthday Bash'}, category:'Celebration',
    thumb:{ background:'#FFF8F0' },
    thumbAccents:[
      { position:'absolute', top:'-16px', left:'50%', transform:'translateX(-50%)', width:40, height:40, borderRadius:'50%', background:'#E63946' },
      { position:'absolute', top:'-12px', left:'28%', width:26, height:26, borderRadius:'50%', background:'#FF9F43' },
      { position:'absolute', top:'-12px', right:'26%', width:26, height:26, borderRadius:'50%', background:'#FECA57' },
      { position:'absolute', top:12, left:8, right:8, height:26, background:'rgba(0,0,0,0.04)', borderRadius:2 },
      { position:'absolute', bottom:8, left:16, right:16, height:1, background:'rgba(230,57,70,0.30)' },
    ],
    elements:[
      BG('#FFF8F0'),
      SH('circle',DESIGN_W/2-180,-150,620,620,'#FFE0E0',{opacity:0.35}),
      SH('circle',DESIGN_W/2-110,18,220,220,'#E63946',{opacity:1}),
      SH('circle',DESIGN_W/2-96,32,192,192,'transparent',{strokeColor:'#FFFFFF',strokeWidth:2,opacity:0.45}),
      SH('circle',DESIGN_W/2-80,48,160,160,'transparent',{strokeColor:'rgba(255,255,255,0.30)',strokeWidth:1,opacity:1}),
      TX('Happy',DESIGN_W/2-110,44,220,48,{fontSize:20,fill:'#FFFFFF',fontStyle:'italic',fontFamily:"'Dancing Script', cursive",align:'center'}),
      TX('Birthday',DESIGN_W/2-110,94,220,36,{fontSize:12,fill:'rgba(255,255,255,0.90)',fontStyle:'bold',align:'center',fontFamily:'sans-serif'}),
      TX('🎉',DESIGN_W/2-110,132,220,44,{fontSize:18,fill:'#FECA57',align:'center'}),
      PH(36,252,DESIGN_W-72,420),
      SH('rect',36,688,DESIGN_W-72,1,'#ddd',{opacity:0.80}),
      TX('Celebrate every moment',36,700,DESIGN_W-72,48,{fontSize:15,fill:'#555',align:'center',fontStyle:'italic'}),
      TX('with joy & love',36,756,DESIGN_W-72,36,{fontSize:12,fill:'#E63946',align:'center'}),
    ],
  },

  {
    id:'silver-25', name:{sq:'Argjend 25', en:'Silver 25th'}, category:'Celebration',
    thumb:{ background:'#E8EAF0' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, height:5, background:'#9099B0', opacity:0.85 },
      { position:'absolute', bottom:0, left:0, right:0, height:5, background:'#9099B0', opacity:0.85 },
      { position:'absolute', top:5, left:0, right:0, height:'38%', background:'rgba(144,153,176,0.12)' },
      { position:'absolute', top:8, left:8, right:8, height:22, background:'rgba(0,0,0,0.04)', borderRadius:1 },
      { position:'absolute', bottom:14, left:'25%', right:'25%', height:1, background:'rgba(100,110,150,0.45)' },
    ],
    elements:[
      BG('#E8EAF0'),
      SH('rect',0,0,DESIGN_W,6,'#9099B0',{opacity:0.88}),
      SH('rect',0,DESIGN_H-6,DESIGN_W,6,'#9099B0',{opacity:0.88}),
      SH('rect',0,0,6,DESIGN_H,'#9099B0',{opacity:0.88}),
      SH('rect',DESIGN_W-6,0,6,DESIGN_H,'#9099B0',{opacity:0.88}),
      SH('circle',DESIGN_W/2-200,60,460,460,'#B0B8CC',{opacity:0.10}),
      TX('XXV',20,48,DESIGN_W-40,240,{fontSize:160,fill:'#8890A8',fontStyle:'bold',align:'center',fontFamily:"'Cormorant Garamond', serif",opacity:0.14}),
      SH('rect',36,278,DESIGN_W-72,1.5,'#9099B0',{opacity:0.60}),
      PH(54,296,DESIGN_W-108,366),
      SH('rect',54,676,DESIGN_W-108,1,'#A0A8C0',{opacity:0.55}),
      TX('Silver Anniversary',54,692,DESIGN_W-108,60,{fontSize:20,fill:'#4858A0',fontStyle:'italic',fontFamily:"'Cormorant Garamond', serif"}),
      TX('twenty-five years of love',54,762,DESIGN_W-108,38,{fontSize:12,fill:'#7888B0'}),
    ],
  },

  {
    id:'new-chapter', name:{sq:'Kapitull i Ri', en:'New Chapter'}, category:'Celebration',
    thumb:{ background:'#F8F6F0' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, height:'26%', background:'#1A2840' },
      { position:'absolute', top:'26%', left:0, right:0, height:3, background:'rgba(100,130,200,0.40)' },
      { position:'absolute', top:6, right:6, width:24, height:28, background:'rgba(255,255,255,0.10)', borderRadius:1 },
      { position:'absolute', bottom:8, left:10, right:10, height:18, background:'rgba(44,62,96,0.06)', borderRadius:1 },
    ],
    elements:[
      BG('#F8F6F0'),
      SH('rect',0,0,DESIGN_W,196,'#1A2840',{opacity:1}),
      SH('circle',DESIGN_W-220,-110,480,480,'#2C3E60',{opacity:0.32}),
      TX('\u201C',DESIGN_W-110,0,100,180,{fontSize:150,fill:'rgba(255,255,255,0.10)',align:'right',fontFamily:"'Playfair Display', serif"}),
      TX('Next',36,24,DESIGN_W-76,100,{fontSize:60,fill:'#FFFFFF',fontStyle:'bold',align:'left',fontFamily:"'Playfair Display', serif"}),
      TX('Chapter',36,112,DESIGN_W-76,72,{fontSize:22,fill:'rgba(255,255,255,0.65)',align:'left'}),
      PH(36,212,DESIGN_W-72,380),
      SH('rect',36,608,DESIGN_W-72,1,'#2C3E60',{opacity:0.22}),
      TX('The best is yet to come',36,622,DESIGN_W-72,56,{fontSize:16,fill:'#2C3E60',fontStyle:'italic',fontFamily:"'Cormorant Garamond', serif"}),
      TX('— a new beginning',36,686,DESIGN_W-72,44,{fontSize:12,fill:'#7080A0'}),
    ],
  },

  {
    id:'milestone', name:{sq:'Pikë Kthese', en:'Milestone'}, category:'Celebration',
    thumb:{ background:'#FBF8F2' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, bottom:0, width:5, background:'#D4AF37' },
      { position:'absolute', top:8, left:10, width:32, height:44, background:'rgba(212,175,55,0.12)', borderRadius:1 },
      { position:'absolute', top:8, left:10, width:22, height:1, background:'rgba(212,175,55,0.70)' },
      { position:'absolute', top:8, right:8, width:40, height:52, background:'rgba(0,0,0,0.05)', borderRadius:1 },
    ],
    elements:[
      BG('#FBF8F2'),
      SH('rect',0,0,6,DESIGN_H,'#D4AF37',{opacity:0.90}),
      SH('rect',0,0,260,DESIGN_H,'#F5EDD8',{opacity:0.55}),
      SH('rect',260,0,1,DESIGN_H,'#D4AF37',{opacity:0.25}),
      TX('A',28,40,208,44,{fontSize:11,fill:'#999',fontStyle:'normal',align:'left',fontFamily:'sans-serif'}),
      TX('Mile-',20,78,226,100,{fontSize:56,fill:'#1A1A1A',fontStyle:'bold',align:'left',fontFamily:"'Playfair Display', serif"}),
      TX('stone',20,168,226,100,{fontSize:56,fill:'#D4AF37',fontStyle:'bold',align:'left',fontFamily:"'Playfair Display', serif"}),
      SH('rect',20,272,176,2,'#D4AF37',{opacity:0.65}),
      TX('worth celebrating',20,284,224,56,{fontSize:13,fill:'#7A6A40',align:'left',fontStyle:'italic'}),
      TX('2025',20,DESIGN_H-52,150,38,{fontSize:14,fill:'#C0A040',align:'left'}),
      PH(274,28,DESIGN_W-292,DESIGN_H-56),
    ],
  },

  {
    id:'darkroom', name:{sq:'Dhoma e Errët', en:'Darkroom'}, category:'Modern',
    thumb:{ background:'#080808' },
    thumbAccents:[
      { position:'absolute', top:10, left:10, right:10, bottom:10, border:'1px solid rgba(255,255,255,0.08)', borderRadius:1 },
      { position:'absolute', top:18, left:18, right:18, height:32, background:'rgba(255,255,255,0.04)', borderRadius:1 },
      { position:'absolute', bottom:10, left:16, right:16, height:1, background:'rgba(255,255,255,0.16)' },
    ],
    elements:[
      BG('#080808'),
      SH('rect',0,0,DESIGN_W,DESIGN_H,'#FFFFFF',{opacity:0.015}),
      PH(0,0,DESIGN_W,DESIGN_H-170),
      SH('rect',0,DESIGN_H-170,DESIGN_W,170,'#040404',{opacity:0.96}),
      SH('rect',40,DESIGN_H-162,50,3,'#FFFFFF',{opacity:0.55}),
      TX('Darkroom',40,DESIGN_H-148,DESIGN_W-80,58,{fontSize:28,fill:'#FFFFFF',align:'left'}),
      TX('print No. 01',40,DESIGN_H-82,DESIGN_W-80,40,{fontSize:12,fill:'rgba(255,255,255,0.35)',align:'left',fontFamily:'monospace'}),
    ],
  },

  {
    id:'cinematic', name:{sq:'Kinematografik', en:'Cinematic'}, category:'Modern',
    thumb:{ background:'#111' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, height:16, background:'#000' },
      { position:'absolute', bottom:0, left:0, right:0, height:16, background:'#000' },
      { position:'absolute', top:16, left:0, right:0, bottom:16, background:'rgba(30,24,18,0.80)' },
      { position:'absolute', bottom:20, left:8, width:28, height:2, background:'rgba(255,255,255,0.45)', borderRadius:1 },
    ],
    elements:[
      BG('#111111'),
      SH('rect',0,0,DESIGN_W,60,'#000000',{opacity:1}),
      SH('rect',0,DESIGN_H-60,DESIGN_W,60,'#000000',{opacity:1}),
      PH(0,60,DESIGN_W,DESIGN_H-120),
      SH('rect',0,DESIGN_H-58,DESIGN_W,58,'#0A0A0A',{opacity:0.96}),
      TX('CINÉMA',38,DESIGN_H-52,DESIGN_W-76,40,{fontSize:13,fill:'rgba(255,255,255,0.65)',fontStyle:'bold',align:'left',fontFamily:'sans-serif'}),
    ],
  },

  {
    id:'photo-essay', name:{sq:'Ese Foto', en:'Photo Essay'}, category:'Modern',
    thumb:{ background:'#F6F4F0' },
    thumbAccents:[
      { position:'absolute', top:6, left:6, right:6, height:18, background:'#1A1A1A' },
      { position:'absolute', top:28, left:6, right:6, height:2, background:'#E63946' },
      { position:'absolute', top:36, left:6, right:6, height:30, background:'rgba(0,0,0,0.05)', borderRadius:1 },
      { position:'absolute', bottom:8, left:6, right:6, height:16, background:'rgba(0,0,0,0.04)', borderRadius:1 },
    ],
    elements:[
      BG('#F6F4F0'),
      SH('rect',0,0,DESIGN_W,56,'#1A1A1A',{opacity:1}),
      SH('rect',0,56,DESIGN_W,4,'#E63946',{opacity:1}),
      TX('PHOTO ESSAY',36,14,DESIGN_W-72,36,{fontSize:12,fill:'#FFFFFF',fontStyle:'bold',align:'left',fontFamily:'sans-serif'}),
      PH(0,60,DESIGN_W,390),
      TX('Across the distance, light still finds its way to the places that matter most.',36,468,DESIGN_W-72,100,{fontSize:14,fill:'#2A2A2A',fontStyle:'italic',align:'left'}),
      SH('rect',36,578,DESIGN_W-72,0.8,'#CCCCCC',{opacity:1}),
      TX('— 2025',36,594,DESIGN_W-72,44,{fontSize:12,fill:'#999999',align:'left'}),
    ],
  },

  {
    id:'swiss-type', name:{sq:'Tipografi Zvicerane', en:'Swiss Type'}, category:'Modern',
    thumb:{ background:'#FFFFFF', border:'1px solid #E0E0E0' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, bottom:0, width:3, background:'#E63946' },
      { position:'absolute', top:8, left:8, right:8, height:16, background:'rgba(0,0,0,0.06)', borderRadius:1 },
      { position:'absolute', top:28, left:8, right:8, height:28, background:'rgba(0,0,0,0.04)', borderRadius:1 },
      { position:'absolute', bottom:8, left:8, right:30, height:12, background:'rgba(0,0,0,0.04)', borderRadius:1 },
    ],
    elements:[
      BG('#FFFFFF'),
      SH('rect',0,0,12,DESIGN_H,'#E63946',{opacity:1}),
      TX('MEMORIES',28,36,DESIGN_W-56,88,{fontSize:48,fill:'#111111',fontStyle:'bold',align:'left',fontFamily:'sans-serif'}),
      SH('rect',28,132,DESIGN_W-56,1,'#111111',{opacity:0.80}),
      PH(28,146,DESIGN_W-56,440),
      SH('rect',28,600,DESIGN_W-56,1,'#CCCCCC',{opacity:0.80}),
      TX('Vol. I',28,616,140,44,{fontSize:13,fill:'#E63946',align:'left',fontFamily:'sans-serif',fontStyle:'bold'}),
      TX('2025',DESIGN_W-120,616,92,44,{fontSize:13,fill:'#111111',align:'right',fontFamily:'sans-serif'}),
    ],
  },

  {
    id:'polaroid-wall', name:{sq:'Muri Polaroid', en:'Polaroid Wall'}, category:'Modern',
    thumb:{ background:'#E0D8C8' },
    thumbAccents:[
      { position:'absolute', inset:0, background:'rgba(192,176,144,0.18)' },
      { position:'absolute', top:4, left:6, width:34, height:42, background:'white', boxShadow:'2px 3px 8px rgba(0,0,0,0.24)', borderRadius:1, transform:'rotate(-7deg)' },
      { position:'absolute', top:14, right:4, width:26, height:34, background:'white', boxShadow:'2px 3px 8px rgba(0,0,0,0.18)', borderRadius:1, transform:'rotate(6deg)' },
      { position:'absolute', bottom:4, left:2, width:30, height:38, background:'white', boxShadow:'2px 3px 8px rgba(0,0,0,0.20)', borderRadius:1, transform:'rotate(5deg)' },
      { position:'absolute', bottom:8, right:8, width:24, height:30, background:'white', boxShadow:'2px 3px 8px rgba(0,0,0,0.18)', borderRadius:1, transform:'rotate(-8deg)' },
    ],
    // Casual, hand-placed feel: each photo sits at a different size, order and
    // tilt (not a tidy grid) — the offset grey rect behind each white frame
    // stands in for a soft box-shadow since Konva shapes don't support CSS shadows.
    elements:[
      BG('#E0D8C8'),
      SH('rect',0,0,DESIGN_W,DESIGN_H,'#C8B890',{opacity:0.18}),
      // top-left, biggest, tilted left
      SH('rect',34,44,236,300,'#8A7F68',{opacity:0.28,rotation:-7}),
      SH('rect',28,38,236,300,'#FFFFFF',{opacity:1,rotation:-7}),
      PH(42,52,208,220,-7),
      TX('moment',42,286,208,34,{fontSize:11,fill:'#888',align:'center',fontStyle:'italic',rotation:-7}),
      // right side, smaller, tilted right, sits lower than the left one
      SH('rect',356,138,206,268,'#8A7F68',{opacity:0.26,rotation:6}),
      SH('rect',350,132,206,268,'#FFFFFF',{opacity:1,rotation:6}),
      PH(364,146,178,192,6),
      TX('always',364,354,178,32,{fontSize:11,fill:'#888',align:'center',fontStyle:'italic',rotation:6}),
      // lower-left, medium, tilted slightly right — overlaps the first photo's corner
      SH('rect',66,414,224,286,'#8A7F68',{opacity:0.26,rotation:4}),
      SH('rect',60,408,224,286,'#FFFFFF',{opacity:1,rotation:4}),
      PH(74,422,196,208,4),
      TX('forever',74,644,196,34,{fontSize:11,fill:'#888',align:'center',fontStyle:'italic',rotation:4}),
      // bottom-right, smallest, most tilted — last in the "pile"
      SH('rect',326,470,196,254,'#8A7F68',{opacity:0.24,rotation:-9}),
      SH('rect',320,464,196,254,'#FFFFFF',{opacity:1,rotation:-9}),
      PH(334,478,168,178,-9),
      TX('together',334,668,168,30,{fontSize:11,fill:'#888',align:'center',fontStyle:'italic',rotation:-9}),
    ],
  },

  {
    id:'polaroid-scatter', name:{sq:'Polaroid të Shpërndara', en:'Polaroid Scatter'}, category:'Modern',
    thumb:{ background:'#EFE7D8' },
    thumbAccents:[
      { position:'absolute', inset:0, background:'rgba(180,160,120,0.14)' },
      { position:'absolute', top:2, left:14, width:30, height:38, background:'white', boxShadow:'2px 3px 7px rgba(0,0,0,0.22)', borderRadius:1, transform:'rotate(8deg)' },
      { position:'absolute', top:16, left:-2, width:26, height:32, background:'white', boxShadow:'2px 3px 7px rgba(0,0,0,0.18)', borderRadius:1, transform:'rotate(-10deg)' },
      { position:'absolute', bottom:10, right:2, width:32, height:40, background:'white', boxShadow:'2px 3px 7px rgba(0,0,0,0.22)', borderRadius:1, transform:'rotate(-4deg)' },
      { position:'absolute', bottom:-2, left:16, width:22, height:28, background:'white', boxShadow:'2px 3px 7px rgba(0,0,0,0.16)', borderRadius:1, transform:'rotate(9deg)' },
    ],
    // A looser, overlapping "spilled on the table" arrangement — five photos of
    // uneven size stacked in a non-obvious reading order with varied rotation.
    elements:[
      BG('#EFE7D8'),
      SH('rect',0,0,DESIGN_W,DESIGN_H,'#B9A57A',{opacity:0.12}),
      SH('rect',238,58,214,258,'#8A7F68',{opacity:0.22,rotation:9}),
      SH('rect',232,52,214,258,'#FFFFFF',{opacity:1,rotation:9}),
      PH(246,66,186,182,9),
      TX('#3',246,258,186,28,{fontSize:10,fill:'#999',align:'center',fontStyle:'italic',rotation:9}),
      SH('rect',30,96,240,286,'#8A7F68',{opacity:0.24,rotation:-11}),
      SH('rect',24,90,240,286,'#FFFFFF',{opacity:1,rotation:-11}),
      PH(38,104,212,220,-11),
      TX('#1',38,332,212,30,{fontSize:10,fill:'#999',align:'center',fontStyle:'italic',rotation:-11}),
      SH('rect',330,392,196,244,'#8A7F68',{opacity:0.24,rotation:-3}),
      SH('rect',324,386,196,244,'#FFFFFF',{opacity:1,rotation:-3}),
      PH(338,400,168,168,-3),
      TX('#4',338,576,168,28,{fontSize:10,fill:'#999',align:'center',fontStyle:'italic',rotation:-3}),
      SH('rect',70,406,180,222,'#8A7F68',{opacity:0.22,rotation:12}),
      SH('rect',64,400,180,222,'#FFFFFF',{opacity:1,rotation:12}),
      PH(78,414,152,150,12),
      TX('#2',78,570,152,26,{fontSize:10,fill:'#999',align:'center',fontStyle:'italic',rotation:12}),
      SH('rect',176,566,168,204,'#8A7F68',{opacity:0.20,rotation:-6}),
      SH('rect',170,560,168,204,'#FFFFFF',{opacity:1,rotation:-6}),
      PH(184,574,140,132,-6),
      TX('#5',184,712,140,24,{fontSize:10,fill:'#999',align:'center',fontStyle:'italic',rotation:-6}),
    ],
  },

  {
    id:'polaroid-clothesline', name:{sq:'Litar Polaroid', en:'Polaroid Clothesline'}, category:'Modern',
    thumb:{ background:'#F4EFE6' },
    thumbAccents:[
      { position:'absolute', top:14, left:2, right:2, height:1, background:'#A8967A' },
      { position:'absolute', top:6, left:6, width:26, height:32, background:'white', boxShadow:'1px 3px 6px rgba(0,0,0,0.20)', borderRadius:1, transform:'rotate(-5deg)' },
      { position:'absolute', top:8, left:36, width:24, height:30, background:'white', boxShadow:'1px 3px 6px rgba(0,0,0,0.18)', borderRadius:1, transform:'rotate(4deg)' },
      { position:'absolute', top:5, right:2, width:22, height:28, background:'white', boxShadow:'1px 3px 6px rgba(0,0,0,0.18)', borderRadius:1, transform:'rotate(-3deg)' },
    ],
    // Photos "pegged" to a hand-drawn line — same casual, unevenly spaced,
    // independently tilted idea, but read as a single row instead of a pile.
    elements:[
      BG('#F4EFE6'),
      SH('rect',30,168,DESIGN_W-60,2.5,'#A8967A',{opacity:0.9}),
      SH('circle',94,161,14,14,'#7A6B52',{opacity:0.85}),
      SH('circle',292,161,14,14,'#7A6B52',{opacity:0.85}),
      SH('circle',466,161,14,14,'#7A6B52',{opacity:0.85}),
      SH('rect',44,178,176,224,'#8A7F68',{opacity:0.22,rotation:-6}),
      SH('rect',38,172,176,224,'#FFFFFF',{opacity:1,rotation:-6}),
      PH(50,184,152,164,-6),
      TX('one',50,354,152,26,{fontSize:10,fill:'#999',align:'center',fontStyle:'italic',rotation:-6}),
      SH('rect',248,190,182,230,'#8A7F68',{opacity:0.24,rotation:5}),
      SH('rect',242,184,182,230,'#FFFFFF',{opacity:1,rotation:5}),
      PH(254,196,158,168,5),
      TX('two',254,370,158,26,{fontSize:10,fill:'#999',align:'center',fontStyle:'italic',rotation:5}),
      SH('rect',424,182,180,226,'#8A7F68',{opacity:0.22,rotation:-3}),
      SH('rect',418,176,180,226,'#FFFFFF',{opacity:1,rotation:-3}),
      PH(430,188,156,164,-3),
      TX('three',430,358,156,26,{fontSize:10,fill:'#999',align:'center',fontStyle:'italic',rotation:-3}),
      TX('little moments, strung together',60,660,DESIGN_W-120,60,{fontSize:15,fill:'#5A4E3C',align:'center',fontStyle:'italic'}),
    ],
  },

  {
    id:'minimalist-b', name:{sq:'Minimale e Zezë', en:'Black Minimal'}, category:'Modern',
    thumb:{ background:'#111' },
    thumbAccents:[
      { position:'absolute', inset:'10px', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:1 },
      { position:'absolute', top:18, left:18, right:18, height:28, background:'rgba(255,255,255,0.03)', borderRadius:1 },
      { position:'absolute', bottom:12, left:'30%', right:'30%', height:1, background:'rgba(255,255,255,0.22)' },
    ],
    elements:[
      BG('#111111'),
      SH('rect',22,22,DESIGN_W-44,DESIGN_H-44,'transparent',{strokeColor:'rgba(255,255,255,0.14)',strokeWidth:0.8,opacity:1}),
      PH(48,48,DESIGN_W-96,490),
      SH('rect',48,556,DESIGN_W-96,0.6,'rgba(255,255,255,0.28)',{opacity:1}),
      TX('Silence',48,572,DESIGN_W-96,66,{fontSize:32,fill:'#FFFFFF',fontStyle:'italic'}),
      TX('speaks volumes',48,650,DESIGN_W-96,44,{fontSize:13,fill:'rgba(255,255,255,0.40)'}),
    ],
  },

  {
    id:'bauhaus', name:{sq:'Bauhaus', en:'Bauhaus'}, category:'Modern',
    thumb:{ background:'#F0EEE8' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, height:10, background:'#222' },
      { position:'absolute', top:0, left:0, bottom:0, width:10, background:'#E63946' },
      { position:'absolute', bottom:0, left:0, right:0, height:10, background:'#222' },
      { position:'absolute', top:'-6px', right:'-6px', width:28, height:28, borderRadius:'50%', background:'#FECA57', opacity:0.85 },
    ],
    elements:[
      BG('#F0EEE8'),
      SH('rect',0,0,DESIGN_W,20,'#222222',{opacity:1}),
      SH('rect',0,DESIGN_H-20,DESIGN_W,20,'#222222',{opacity:1}),
      SH('rect',0,0,20,DESIGN_H,'#E63946',{opacity:1}),
      SH('circle',DESIGN_W-80,-80,160,160,'#FECA57',{opacity:0.88}),
      PH(36,36,DESIGN_W-116,DESIGN_H-128),
      SH('rect',36,DESIGN_H-88,DESIGN_W-60,0.8,'#222222',{opacity:0.80}),
      TX('BAUHAUS',36,DESIGN_H-78,DESIGN_W-60,54,{fontSize:24,fill:'#222222',fontStyle:'bold',fontFamily:'sans-serif',align:'left'}),
    ],
  },

  {
    id:'classic-portrait', name:{sq:'Portret Klasik', en:'Classic Portrait'}, category:'Portrait',
    thumb:{ background:'#F8F4EE', border:'1px solid #E0D8CE' },
    thumbAccents:[
      { position:'absolute', inset:'6px', border:'1px solid #D0C8BC', borderRadius:1 },
      { position:'absolute', top:12, left:12, right:12, height:36, background:'rgba(0,0,0,0.05)', borderRadius:1 },
      { position:'absolute', bottom:10, left:16, right:16, height:1, background:'#C8C0B4' },
    ],
    elements:[
      BG('#F8F4EE'),
      SH('rect',18,18,DESIGN_W-36,DESIGN_H-36,'transparent',{strokeColor:'#C8C0B4',strokeWidth:1,opacity:0.80}),
      SH('rect',32,32,DESIGN_W-64,DESIGN_H-64,'transparent',{strokeColor:'#E0D8CE',strokeWidth:0.5,opacity:0.60}),
      PH(52,56,DESIGN_W-104,494),
      SH('rect',52,564,DESIGN_W-104,0.8,'#B8B0A4',{opacity:0.70}),
      TX('Portrait',52,580,DESIGN_W-104,58,{fontSize:24,fill:'#5A504A',fontStyle:'italic'}),
      TX('Name  ·  Year',52,650,DESIGN_W-104,44,{fontSize:12,fill:'#9A908A'}),
    ],
  },

  {
    id:'studio-noir', name:{sq:'Studio Noir', en:'Studio Noir'}, category:'Portrait',
    thumb:{ background:'#0C0C0C' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, height:22, background:'rgba(255,255,255,0.06)' },
      { position:'absolute', top:8, left:8, width:24, height:2, background:'rgba(255,255,255,0.40)', borderRadius:1 },
      { position:'absolute', bottom:10, left:8, right:8, height:12, background:'rgba(255,255,255,0.04)', borderRadius:1 },
    ],
    elements:[
      BG('#0C0C0C'),
      SH('rect',0,0,DESIGN_W,46,'#181818',{opacity:1}),
      TX('STUDIO',36,10,200,34,{fontSize:12,fill:'rgba(255,255,255,0.60)',fontStyle:'bold',align:'left',fontFamily:'sans-serif'}),
      PH(0,46,DESIGN_W,DESIGN_H-160),
      SH('rect',0,DESIGN_H-160,DESIGN_W,160,'#0A0A0A',{opacity:0.95}),
      SH('rect',36,DESIGN_H-150,48,3,'rgba(255,255,255,0.55)',{opacity:1}),
      TX('Subject',36,DESIGN_H-136,DESIGN_W-72,62,{fontSize:30,fill:'#FFFFFF',align:'left'}),
      TX('Session  ·  2025',36,DESIGN_H-66,DESIGN_W-72,44,{fontSize:12,fill:'rgba(255,255,255,0.35)',align:'left',fontFamily:'monospace'}),
    ],
  },

  {
    id:'ethereal', name:{sq:'Eterik', en:'Ethereal'}, category:'Portrait',
    thumb:{ background:'linear-gradient(160deg, #F5EEFE 0%, #FEF5F8 100%)' },
    thumbAccents:[
      { position:'absolute', top:'-12px', left:'50%', transform:'translateX(-50%)', width:44, height:44, borderRadius:'50%', background:'rgba(220,190,255,0.40)' },
      { position:'absolute', top:'-4px', right:'-4px', width:22, height:22, borderRadius:'50%', background:'rgba(255,180,200,0.35)' },
      { position:'absolute', top:10, left:10, right:10, height:28, background:'rgba(255,255,255,0.55)', borderRadius:5 },
    ],
    elements:[
      BG('#F5EEFE',{from:'#F5EEFE',to:'#FEF5F8',dir:'diag'}),
      SH('circle',DESIGN_W-60,-60,240,240,'#DCC0FF',{opacity:0.22}),
      SH('circle',-60,DESIGN_H-80,220,220,'#FFBCD4',{opacity:0.18}),
      SH('circle',60,40,100,100,'#FFFFFF',{opacity:0.50}),
      SH('circle',DESIGN_W-80,200,80,80,'#EFC8FF',{opacity:0.22}),
      PH(50,70,DESIGN_W-100,480),
      TX('Ethereal',50,608,DESIGN_W-100,62,{fontSize:28,fill:'#7040A0',fontStyle:'italic'}),
      TX('light beyond the veil',50,682,DESIGN_W-100,44,{fontSize:13,fill:'#A080C8'}),
    ],
  },

  {
    id:'golden-portrait', name:{sq:'Portret i Artë', en:'Golden Portrait'}, category:'Portrait',
    thumb:{ background:'#2A1A08' },
    thumbAccents:[
      { position:'absolute', top:4, left:4, right:4, bottom:4, border:'1px solid rgba(212,175,55,0.55)', borderRadius:1 },
      { position:'absolute', top:12, left:12, right:12, height:32, background:'rgba(212,175,55,0.06)', borderRadius:1 },
      { position:'absolute', bottom:10, left:'28%', right:'28%', height:1, background:'rgba(212,175,55,0.55)' },
    ],
    elements:[
      BG('#2A1A08'),
      SH('rect',18,18,DESIGN_W-36,DESIGN_H-36,'transparent',{strokeColor:'#D4AF37',strokeWidth:1,opacity:0.60}),
      SH('circle',DESIGN_W/2-80,-80,160,160,'#D4AF37',{opacity:0.07}),
      PH(48,50,DESIGN_W-96,468),
      SH('rect',48,534,DESIGN_W-96,0.8,'#D4AF37',{opacity:0.55}),
      TX('Golden Light',48,552,DESIGN_W-96,62,{fontSize:24,fill:'#D4AF37',fontStyle:'italic'}),
      TX('In the glow of grace',48,628,DESIGN_W-96,44,{fontSize:13,fill:'#A88828'}),
      TX('✦',DESIGN_W/2-14,686,28,38,{fontSize:14,fill:'#D4AF37'}),
    ],
  },

  {
    id:'forest-path', name:{sq:'Shtigjet e Pyllit', en:'Forest Path'}, category:'Nature',
    thumb:{ background:'#1C2E1A' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, bottom:'30%', background:'rgba(0,0,0,0.20)' },
      { position:'absolute', bottom:0, left:0, right:0, height:'30%', background:'#1A2C18' },
      { position:'absolute', bottom:16, left:10, width:28, height:3, background:'#70B050', borderRadius:1 },
      { position:'absolute', bottom:8, left:10, width:44, height:1, background:'rgba(255,255,255,0.20)', borderRadius:1 },
    ],
    elements:[
      BG('#1C2E1A'),
      PH(0,0,DESIGN_W,DESIGN_H-220),
      SH('rect',0,DESIGN_H-220,DESIGN_W,220,'#141E12',{opacity:0.92}),
      SH('rect',40,DESIGN_H-204,64,5,'#70B050',{opacity:1}),
      TX('Into the Forest',40,DESIGN_H-188,DESIGN_W-80,76,{fontSize:38,fill:'#FFFFFF',fontStyle:'italic',align:'left'}),
      TX('Where the light falls softly',40,DESIGN_H-104,DESIGN_W-80,44,{fontSize:14,fill:'#90C070',align:'left'}),
    ],
  },

  {
    id:'ocean-calm', name:{sq:'Qetësia e Oqeanit', en:'Ocean Calm'}, category:'Nature',
    thumb:{ background:'linear-gradient(to bottom, #0D4F6C 0%, #1A7A9E 100%)' },
    thumbAccents:[
      { position:'absolute', bottom:0, left:0, right:0, height:'28%', background:'rgba(10,50,80,0.75)' },
      { position:'absolute', bottom:'28%', left:0, right:0, height:1, background:'rgba(100,200,240,0.35)' },
      { position:'absolute', top:10, left:10, width:32, height:2, background:'rgba(255,255,255,0.45)', borderRadius:1 },
    ],
    elements:[
      BG('#0D4F6C',{from:'#0D4F6C',to:'#1A7A9E',dir:'tb'}),
      SH('circle',DESIGN_W/2-120,-80,240,240,'#64C8E8',{opacity:0.08}),
      PH(0,0,DESIGN_W,DESIGN_H-210),
      SH('rect',0,DESIGN_H-210,DESIGN_W,210,'#08202C',{opacity:0.88}),
      SH('rect',40,DESIGN_H-196,52,4,'#64C8E8',{opacity:0.88}),
      TX('Ocean Calm',40,DESIGN_H-182,DESIGN_W-80,72,{fontSize:36,fill:'#FFFFFF',fontStyle:'italic',align:'left'}),
      TX('still waters, deep peace',40,DESIGN_H-102,DESIGN_W-80,46,{fontSize:14,fill:'#64B8D8',align:'left'}),
    ],
  },

  {
    id:'wildflower', name:{sq:'Lulet e Egra', en:'Wildflower'}, category:'Nature',
    thumb:{ background:'#FBF5E8' },
    thumbAccents:[
      { position:'absolute', top:'-14px', left:'8%', width:20, height:20, borderRadius:'50%', background:'#E8C040', opacity:0.75 },
      { position:'absolute', top:'-10px', left:'35%', width:16, height:16, borderRadius:'50%', background:'#D4A030', opacity:0.65 },
      { position:'absolute', top:'-14px', right:'20%', width:20, height:20, borderRadius:'50%', background:'#F0CC50', opacity:0.70 },
      { position:'absolute', bottom:'-12px', left:'20%', width:18, height:18, borderRadius:'50%', background:'#D8A838', opacity:0.65 },
      { position:'absolute', bottom:'-10px', right:'30%', width:16, height:16, borderRadius:'50%', background:'#E4B840', opacity:0.65 },
    ],
    elements:[
      BG('#FBF5E8'),
      SH('circle',14,18,56,56,'#E8C040',{opacity:0.70}),
      SH('circle',86,4,42,42,'#D4A030',{opacity:0.60}),
      SH('circle',168,14,48,48,'#F0CC50',{opacity:0.65}),
      SH('circle',256,2,40,40,'#C89028',{opacity:0.55}),
      SH('circle',346,12,46,46,'#E4B840',{opacity:0.62}),
      SH('circle',440,4,44,44,'#D8A838',{opacity:0.58}),
      SH('circle',526,16,50,50,'#E8C040',{opacity:0.65}),
      SH('circle',DESIGN_W-24,140,46,46,'#D4A030',{opacity:0.52}),
      SH('circle',DESIGN_W-18,290,38,38,'#E8C040',{opacity:0.48}),
      SH('circle',DESIGN_W-28,430,42,42,'#C89028',{opacity:0.50}),
      SH('circle',6,190,40,40,'#E0B840',{opacity:0.48}),
      SH('circle',10,360,44,44,'#D4A030',{opacity:0.50}),
      SH('circle',28,DESIGN_H-36,50,50,'#E8C040',{opacity:0.60}),
      SH('circle',140,DESIGN_H-24,42,42,'#D8A838',{opacity:0.55}),
      SH('circle',258,DESIGN_H-30,46,46,'#F0CC50',{opacity:0.60}),
      SH('circle',376,DESIGN_H-22,42,42,'#D4A030',{opacity:0.54}),
      SH('circle',490,DESIGN_H-28,48,48,'#E4B840',{opacity:0.58}),
      PH(60,58,DESIGN_W-120,502),
      TX('Wild & Free',60,574,DESIGN_W-120,62,{fontSize:28,fill:'#7A5010',fontStyle:'italic',fontFamily:"'Dancing Script', cursive"}),
      TX('in the meadow light',60,648,DESIGN_W-120,44,{fontSize:14,fill:'#C09030'}),
    ],
  },

  {
    id:'tuscan-hills', name:{sq:'Kodrat Toskane', en:'Tuscan Hills'}, category:'Locations',
    thumbPhoto:'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=400&q=85&fit=crop',
    thumb:{ background:'#4A3018' }, thumbAccents:[],
    elements:[
      BG('#F4ECD8'),
      SH('circle',-60,DESIGN_H-60,260,260,'#C8A860',{opacity:0.10}),
      PH(30,30,DESIGN_W-60,510),
      SH('rect',30,552,DESIGN_W-60,1,'#A07838',{opacity:0.4}),
      TX('La Toscana',30,568,DESIGN_W-60,64,{fontSize:30,fill:'#4A3018',fontStyle:'italic'}),
      TX('Italy  ·  Year',30,644,DESIGN_W-60,40,{fontSize:12,fill:'#A07838'}),
    ],
  },

  {
    id:'santorini-blue', name:{sq:'Blu Santorini', en:'Santorini Blue'}, category:'Locations',
    thumbPhoto:'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&q=85&fit=crop',
    thumb:{ background:'#1A4070' }, thumbAccents:[],
    elements:[
      BG('#FFFFFF'),
      SH('rect',0,0,DESIGN_W,DESIGN_H,'#E0EEFF',{opacity:0.40}),
      PH(24,24,DESIGN_W-48,510),
      SH('rect',24,546,DESIGN_W-48,2,'#2060B0',{opacity:0.30}),
      TX('Santorini',24,562,DESIGN_W-48,64,{fontSize:32,fill:'#1A4070',fontStyle:'italic'}),
      TX('Greece  ·  Year',24,638,DESIGN_W-48,40,{fontSize:12,fill:'#4080C0'}),
    ],
  },

  {
    id:'paris-moments', name:{sq:'Momente Pariziane', en:'Paris Moments'}, category:'Locations',
    thumbPhoto:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=85&fit=crop',
    thumb:{ background:'#2A2018' }, thumbAccents:[],
    elements:[
      BG('#FAF7F2'),
      SH('rect',16,16,DESIGN_W-32,DESIGN_H-32,'transparent',{strokeColor:'#C0A878',strokeWidth:1,opacity:0.55}),
      PH(36,36,DESIGN_W-72,490),
      TX('Paris',36,544,DESIGN_W-72,70,{fontSize:36,fill:'#2A2018',fontStyle:'italic'}),
      TX('France  ·  Year',36,626,DESIGN_W-72,40,{fontSize:12,fill:'#8A7050'}),
    ],
  },

  {
    id:'japan-sakura', name:{sq:'Japoni & Lule', en:'Japan & Blossom'}, category:'Locations',
    thumbPhoto:'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=85&fit=crop',
    thumb:{ background:'#2C1828' }, thumbAccents:[],
    elements:[
      BG('#FDF5F7'),
      SH('circle',DESIGN_W+50,-50,300,300,'#F0B8C8',{opacity:0.12}),
      PH(24,24,DESIGN_W-48,510),
      SH('rect',24,546,DESIGN_W-48,1,'#D090A8',{opacity:0.5}),
      TX('Japan',24,562,DESIGN_W-48,64,{fontSize:34,fill:'#2C1828',fontStyle:'italic'}),
      TX('日本  ·  Year',24,638,DESIGN_W-48,40,{fontSize:14,fill:'#C07090'}),
    ],
  },

  {
    id:'new-york-city', name:{sq:'Qyteti i Madh', en:'New York City'}, category:'Locations',
    thumbPhoto:'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&q=85&fit=crop',
    thumb:{ background:'#101418' }, thumbAccents:[],
    elements:[
      BG('#101418'),
      SH('rect',0,0,DESIGN_W,DESIGN_H,'#1A2028',{opacity:0.40}),
      PH(0,0,DESIGN_W,555),
      SH('rect',0,522,DESIGN_W,DESIGN_H-522,'#101418',{opacity:0.93}),
      SH('rect',40,568,52,3,'#E8C840',{opacity:1}),
      TX('New York',40,580,DESIGN_W-80,72,{fontSize:34,fill:'#FFFFFF',fontStyle:'bold',align:'left'}),
      TX('NYC  ·  Year',40,664,220,40,{fontSize:12,fill:'#E8C840',align:'left'}),
    ],
  },

  {
    id:'lavender-fields', name:{sq:'Fusha Lavande', en:'Lavender Fields'}, category:'Nature',
    thumbPhoto:'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=400&q=85&fit=crop',
    thumb:{ background:'#3A2850' }, thumbAccents:[],
    elements:[
      BG('#F5F0FA'),
      SH('rect',0,0,DESIGN_W,DESIGN_H,'#D8C0F0',{opacity:0.20}),
      PH(24,24,DESIGN_W-48,510),
      SH('rect',24,546,DESIGN_W-48,1,'#9070B0',{opacity:0.40}),
      TX('Lavender',24,562,DESIGN_W-48,64,{fontSize:30,fill:'#3A2850',fontStyle:'italic'}),
      TX('Provence  ·  Year',24,638,DESIGN_W-48,40,{fontSize:12,fill:'#9070B0'}),
    ],
  },

  {
    id:'cherry-blossom-walk', name:{sq:'Shëtitje Lulesh', en:'Cherry Blossom Walk'}, category:'Nature',
    thumbPhoto:'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&q=85&fit=crop',
    thumb:{ background:'#3A1828' }, thumbAccents:[],
    elements:[
      BG('#FDF5F8'),
      SH('circle',DESIGN_W+40,-40,280,280,'#F0C0D8',{opacity:0.14}),
      PH(24,24,DESIGN_W-48,510),
      SH('rect',24,546,DESIGN_W-48,1,'#D09090',{opacity:0.40}),
      TX('In Bloom',24,562,DESIGN_W-48,64,{fontSize:30,fill:'#3A1828',fontStyle:'italic'}),
      TX('Spring  ·  Year',24,638,DESIGN_W-48,40,{fontSize:12,fill:'#D09090'}),
    ],
  },

  {
    id:'misty-mountains', name:{sq:'Malet me Mjegull', en:'Misty Mountains'}, category:'Nature',
    thumbPhoto:'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=85&fit=crop',
    thumb:{ background:'#1A2028' }, thumbAccents:[],
    elements:[
      BG('#F0F4F8'),
      SH('rect',0,0,DESIGN_W,DESIGN_H,'#C0D0E0',{opacity:0.20}),
      PH(24,24,DESIGN_W-48,510),
      SH('rect',24,546,DESIGN_W-48,1,'#708090',{opacity:0.40}),
      TX('Above the Clouds',24,562,DESIGN_W-48,64,{fontSize:22,fill:'#1A2028',fontStyle:'italic'}),
      TX('Highlands  ·  Year',24,638,DESIGN_W-48,40,{fontSize:12,fill:'#708090'}),
    ],
  },

  {
    id:'golden-meadow-photo', name:{sq:'Livadhi i Artë', en:'Golden Meadow'}, category:'Nature',
    thumbPhoto:'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&q=85&fit=crop',
    thumb:{ background:'#2C2008' }, thumbAccents:[],
    elements:[
      BG('#FBF5E0'),
      SH('circle',DESIGN_W/2-120,DESIGN_H-80,280,280,'#E8C050',{opacity:0.09}),
      PH(24,24,DESIGN_W-48,510),
      SH('rect',24,546,DESIGN_W-48,1,'#B09040',{opacity:0.40}),
      TX('Open Fields',24,562,DESIGN_W-48,64,{fontSize:28,fill:'#2C2008',fontStyle:'italic'}),
      TX('Nature  ·  Year',24,638,DESIGN_W-48,40,{fontSize:12,fill:'#B09040'}),
    ],
  },
];
