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

// ─────────────────────────────────────────────────────────────────────────────
// 20 Premade Designs — carefully crafted
// ─────────────────────────────────────────────────────────────────────────────

export const DESIGNS: DesignDef[] = [
  // ── WEDDING ──────────────────────────────────────────────────────────────
  {
    id:'blush-garden', name:{sq:'Kopshti Rozë', en:'Blush Garden'}, category:'Wedding',
    thumb:{ background:'#FBF5EE' },
    thumbAccents:[
      { position:'absolute', top:'-10px', right:'-10px', width:44, height:44, borderRadius:'50%', background:'#F4BEBA', opacity:0.55 },
      { position:'absolute', bottom:'-8px', left:'-8px', width:38, height:38, borderRadius:'50%', background:'#EEB0AC', opacity:0.48 },
      { position:'absolute', top:8, left:8, right:8, height:42, background:'rgba(0,0,0,0.05)', borderRadius:2 },
      { position:'absolute', bottom:12, left:16, right:16, height:1, background:'#DBABAA', opacity:0.6 },
      { position:'absolute', bottom:18, left:22, right:22, height:1, background:'rgba(219,171,170,0.4)' },
    ],
    elements:[
      BG('#FBF5EE'),
      SH('circle',460,-65,215,215,'#F4BEB8',{opacity:0.24}),
      SH('circle',-70,595,230,230,'#F0B4AE',{opacity:0.20}),
      SH('circle',490,630,155,155,'#ECA8A4',{opacity:0.15}),
      SH('rect',22,22,DESIGN_W-44,DESIGN_H-44,'transparent',{strokeColor:'#DAA8A4',strokeWidth:1,opacity:0.65}),
      PH(54,60,DESIGN_W-108,512),
      TX('Our Story',54,622,DESIGN_W-108,64,{fontSize:30,fill:'#8B4255',fontStyle:'italic'}),
      TX('Date  ·  Venue',54,703,DESIGN_W-108,40,{fontSize:11,fill:'#BA8898'}),
    ],
  },
  {
    id:'midnight-vows', name:{sq:'Betimi i Natës', en:'Midnight Vows'}, category:'Wedding',
    thumb:{ background:'#1A2040' },
    thumbAccents:[
      { position:'absolute', top:5, left:5, right:5, bottom:5, border:'1px solid rgba(200,168,75,0.60)', borderRadius:2 },
      { position:'absolute', top:13, left:13, right:13, bottom:13, border:'0.5px solid rgba(200,168,75,0.35)', borderRadius:1 },
      { position:'absolute', top:20, left:20, right:20, height:30, background:'rgba(200,168,75,0.10)', borderRadius:1 },
      { position:'absolute', bottom:14, left:'30%', right:'30%', height:1, background:'rgba(200,168,75,0.65)' },
    ],
    elements:[
      BG('#1A2040'),
      SH('rect',18,18,DESIGN_W-36,DESIGN_H-36,'transparent',{strokeColor:'#C8A84B',strokeWidth:1.2,opacity:0.68}),
      SH('rect',34,34,DESIGN_W-68,DESIGN_H-68,'transparent',{strokeColor:'#C0A040',strokeWidth:0.5,opacity:0.42}),
      SH('circle',DESIGN_W/2-85,-85,170,170,'#C8A84B',{opacity:0.06}),
      PH(58,65,DESIGN_W-116,485),
      SH('rect',58,564,DESIGN_W-116,0.8,'#C8A84B',{opacity:0.5}),
      TX('Forever & Always',58,580,DESIGN_W-116,64,{fontSize:24,fill:'#C8A84B',fontStyle:'italic'}),
      TX('✦  ✦  ✦',DESIGN_W/2-50,658,100,36,{fontSize:13,fill:'#C8A84B'}),
      TX('Date  ·  Place',58,706,DESIGN_W-116,40,{fontSize:11,fill:'#7A95BE'}),
    ],
  },
  {
    id:'pure-vows', name:{sq:'Betim i Pastër', en:'Pure Vows'}, category:'Wedding',
    thumb:{ background:'#FFFFFF', border:'1px solid #E2DED8' },
    thumbAccents:[
      { position:'absolute', inset:'5px', border:'1px solid #D0CCC6', borderRadius:1 },
      { position:'absolute', inset:'11px', border:'0.5px solid #E2DED8', borderRadius:1 },
      { position:'absolute', top:18, left:18, right:18, height:32, background:'#F6F3EF', borderRadius:1 },
      { position:'absolute', bottom:14, left:20, right:20, height:1, background:'#C8C4BE' },
    ],
    elements:[
      BG('#FFFFFF'),
      SH('rect',16,16,DESIGN_W-32,DESIGN_H-32,'transparent',{strokeColor:'#C6C2BC',strokeWidth:1,opacity:0.85}),
      SH('rect',30,30,DESIGN_W-60,DESIGN_H-60,'transparent',{strokeColor:'#DEDBD6',strokeWidth:0.6,opacity:0.65}),
      PH(55,68,DESIGN_W-110,482),
      SH('rect',55,566,DESIGN_W-110,0.8,'#C6C2BC',{opacity:0.7}),
      TX('Our Wedding Day',55,584,DESIGN_W-110,54,{fontSize:18,fill:'#665A50',fontStyle:'italic'}),
      TX('Date  ·  Location',55,650,DESIGN_W-110,40,{fontSize:11,fill:'#9A948E'}),
    ],
  },
  {
    id:'boho-warmth', name:{sq:'Ngrohtësi Boho', en:'Boho Warmth'}, category:'Wedding',
    thumb:{ background:'#F2E8DA' },
    thumbAccents:[
      { position:'absolute', top:'-10px', right:'-10px', width:42, height:42, borderRadius:'50%', border:'2px solid rgba(196,144,88,0.65)', background:'transparent' },
      { position:'absolute', bottom:'-8px', left:'-8px', width:34, height:34, borderRadius:'50%', border:'1.5px solid rgba(196,144,88,0.55)', background:'transparent' },
      { position:'absolute', top:8, left:8, right:8, height:40, background:'rgba(0,0,0,0.055)', borderRadius:2 },
      { position:'absolute', inset:'6px', border:'1px dashed rgba(180,120,60,0.32)', borderRadius:1 },
    ],
    elements:[
      BG('#F2E8DA'),
      SH('circle',DESIGN_W-100,-100,255,255,'transparent',{strokeColor:'#C49060',strokeWidth:1.5,opacity:0.42}),
      SH('circle',-100,DESIGN_H-80,245,245,'transparent',{strokeColor:'#C49060',strokeWidth:1,opacity:0.36}),
      SH('circle',DESIGN_W-55,85,105,105,'#D4A878',{opacity:0.16}),
      SH('rect',24,24,DESIGN_W-48,DESIGN_H-48,'transparent',{strokeColor:'#B07840',strokeWidth:1,strokeDash:[8,5],opacity:0.48}),
      PH(54,56,DESIGN_W-108,522),
      TX('Bohemian Love',54,620,DESIGN_W-108,60,{fontSize:26,fill:'#8B5830',fontStyle:'italic'}),
      TX('forever & always',54,695,DESIGN_W-108,40,{fontSize:12,fill:'#C49060'}),
    ],
  },
  {
    id:'garden-vows', name:{sq:'Dasma në Kopsht', en:'Garden Vows'}, category:'Wedding',
    thumb:{ background:'#E4EBE0' },
    thumbAccents:[
      { position:'absolute', left:0, top:0, width:14, bottom:0, background:'rgba(74,122,84,0.16)' },
      { position:'absolute', top:8, left:20, right:8, height:36, background:'rgba(0,0,0,0.05)', borderRadius:2 },
      { position:'absolute', bottom:10, left:20, right:8, height:1, background:'rgba(74,122,84,0.55)' },
      { position:'absolute', bottom:16, left:20, right:8, height:1, background:'rgba(74,122,84,0.25)' },
    ],
    elements:[
      BG('#E4EBE0'),
      SH('rect',0,0,44,DESIGN_H,'#4A7A54',{opacity:0.12}),
      SH('rect',44,34,DESIGN_W-44,1,'#4A7A54',{opacity:0.45}),
      SH('rect',44,DESIGN_H-34,DESIGN_W-44,1,'#4A7A54',{opacity:0.45}),
      PH(66,52,DESIGN_W-82,448),
      SH('rect',66,514,DESIGN_W-130,1,'#4A7A54',{opacity:0.32}),
      TX('Garden Ceremony',66,530,DESIGN_W-130,58,{fontSize:22,fill:'#2E5A3A',fontStyle:'italic'}),
      TX('Celebrate love in bloom',66,602,DESIGN_W-130,40,{fontSize:12,fill:'#6A9070'}),
    ],
  },
  // ── TRAVEL ───────────────────────────────────────────────────────────────
  {
    id:'explorer', name:{sq:'Eksplorues', en:'Explorer'}, category:'Travel',
    thumb:{ background:'#1B3020' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, bottom:'32%', background:'rgba(0,0,0,0.22)' },
      { position:'absolute', bottom:0, left:0, right:0, height:'32%', background:'#1B3020' },
      { position:'absolute', bottom:18, left:10, width:26, height:4, background:'#7AAA5A', borderRadius:2 },
      { position:'absolute', bottom:10, left:10, width:42, height:2, background:'rgba(255,255,255,0.25)', borderRadius:1 },
    ],
    elements:[
      BG('#1B3020'),
      SH('rect',0,200,DESIGN_W,0.5,'#4A7A40',{opacity:0.18}),
      SH('rect',0,400,DESIGN_W,0.5,'#4A7A40',{opacity:0.18}),
      SH('rect',200,0,0.5,DESIGN_H,'#4A7A40',{opacity:0.18}),
      SH('rect',400,0,0.5,DESIGN_H,'#4A7A40',{opacity:0.18}),
      PH(0,0,DESIGN_W,538),
      SH('rect',0,504,DESIGN_W,296,'#1B3020',{opacity:0.90}),
      SH('rect',38,552,72,4,'#7AAA5A',{opacity:1}),
      TX('Adventure Awaits',38,565,DESIGN_W-76,74,{fontSize:34,fill:'#FFFFFF',fontStyle:'bold',align:'left'}),
      TX('Location  ·  Year',38,658,280,42,{fontSize:12,fill:'#7AAA5A',align:'left'}),
    ],
  },
  {
    id:'golden-hour', name:{sq:'Ora e Artë', en:'Golden Hour'}, category:'Travel',
    thumb:{ background:'linear-gradient(to bottom, #E8841C 0%, #A84408 100%)' },
    thumbAccents:[
      { position:'absolute', top:'-12px', left:'50%', transform:'translateX(-50%)', width:52, height:52, borderRadius:'50%', background:'rgba(255,210,70,0.22)' },
      { position:'absolute', bottom:0, left:0, right:0, height:'30%', background:'rgba(168,68,8,0.88)' },
      { position:'absolute', bottom:12, left:10, width:36, height:2, background:'rgba(255,255,255,0.6)', borderRadius:1 },
    ],
    elements:[
      BG('#C8600A',{from:'#E8841C',to:'#A84808',dir:'tb'}),
      SH('circle',DESIGN_W/2-130,-130,260,260,'#FFD54F',{opacity:0.11}),
      PH(0,0,DESIGN_W,DESIGN_H),
      SH('rect',0,DESIGN_H-228,DESIGN_W,228,'#9C3C04',{opacity:0.84}),
      TX('Golden Hours',38,DESIGN_H-200,DESIGN_W-76,80,{fontSize:38,fill:'#FFFFFF',fontStyle:'italic',align:'left'}),
      TX('Memories that glow',38,DESIGN_H-114,DESIGN_W-76,46,{fontSize:14,fill:'rgba(255,255,255,0.75)',align:'left'}),
    ],
  },
  {
    id:'film-diary', name:{sq:'Ditari i Filmit', en:'Film Diary'}, category:'Travel',
    thumb:{ background:'#E6DFC8' },
    thumbAccents:[
      { position:'absolute', top:6, left:8, width:36, height:46, background:'white', boxShadow:'0 2px 8px rgba(0,0,0,0.20)', borderRadius:1 },
      { position:'absolute', top:6, right:6, width:24, height:30, background:'white', boxShadow:'0 2px 8px rgba(0,0,0,0.18)', borderRadius:1 },
      { position:'absolute', bottom:6, left:6, right:6, height:22, background:'white', boxShadow:'0 2px 8px rgba(0,0,0,0.18)', borderRadius:1 },
    ],
    elements:[
      BG('#E6DFC8'),
      SH('rect',22,14,370,476,'#FFFFFF',{opacity:1}),
      PH(42,34,330,380),
      TX('a moment captured',42,426,330,46,{fontSize:12,fill:'#666',align:'center',fontStyle:'italic'}),
      SH('rect',418,14,164,220,'#FFFFFF',{opacity:1}),
      PH(432,30,136,168),
      SH('rect',22,518,560,252,'#FFFFFF',{opacity:1}),
      PH(42,534,520,198),
    ],
  },
  {
    id:'city-noir', name:{sq:'Qyteti Noir', en:'City Noir'}, category:'Travel',
    thumb:{ background:'#080808' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, height:24, background:'#161616', borderBottom:'1px solid rgba(240,192,48,0.5)' },
      { position:'absolute', top:7, left:7, width:32, height:4, background:'#F0C030', borderRadius:1 },
      { position:'absolute', bottom:10, left:8, width:36, height:3, background:'rgba(255,255,255,0.22)', borderRadius:1 },
      { position:'absolute', bottom:16, left:8, width:22, height:2, background:'rgba(240,192,48,0.7)', borderRadius:1 },
    ],
    elements:[
      BG('#080808'),
      SH('rect',0,0,DESIGN_W,88,'#161616',{opacity:1}),
      SH('rect',38,80,78,4,'#F0C030',{opacity:1}),
      TX('CITY NOIR',38,18,DESIGN_W-76,52,{fontSize:14,fill:'rgba(255,255,255,0.65)',fontStyle:'bold',align:'left',fontFamily:'sans-serif'}),
      PH(0,88,DESIGN_W,540),
      SH('rect',0,600,DESIGN_W,DESIGN_H-600,'#060606',{opacity:0.92}),
      TX('After Dark',38,618,380,80,{fontSize:44,fill:'#FFFFFF',fontStyle:'bold',align:'left'}),
      TX('Urban Stories',38,716,280,44,{fontSize:14,fill:'#F0C030',align:'left'}),
    ],
  },
  // ── BABY & FAMILY ─────────────────────────────────────────────────────────
  {
    id:'cloud-nine', name:{sq:'Re e Nëntë', en:'Cloud Nine'}, category:'Baby & Family',
    thumb:{ background:'linear-gradient(160deg, #C8E8F8 0%, #EDF8FF 100%)' },
    thumbAccents:[
      { position:'absolute', top:'-10px', left:'-10px', width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,0.65)' },
      { position:'absolute', top:'-6px', left:'20%', width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.50)' },
      { position:'absolute', top:8, left:8, right:8, height:36, background:'rgba(255,255,255,0.45)', borderRadius:6 },
      { position:'absolute', bottom:'-6px', right:'-6px', width:32, height:32, borderRadius:'50%', background:'rgba(184,216,240,0.55)' },
    ],
    elements:[
      BG('#C8E8F8',{from:'#C8E8F8',to:'#EDF8FF',dir:'tb'}),
      SH('circle',-60,-60,200,200,'#FFFFFF',{opacity:0.55}),
      SH('circle',DESIGN_W-80,-50,185,185,'#FFFFFF',{opacity:0.45}),
      SH('circle',80,20,135,135,'#FFFFFF',{opacity:0.38}),
      SH('circle',DESIGN_W-100,DESIGN_H-80,245,245,'#B8D8F0',{opacity:0.30}),
      PH(52,90,DESIGN_W-104,470),
      TX('Little One',52,604,DESIGN_W-104,66,{fontSize:30,fill:'#3A78A8',fontStyle:'italic'}),
      TX('born with love',52,682,DESIGN_W-104,44,{fontSize:13,fill:'#6AAACE'}),
      TX('✦  ✦  ✦',52,738,DESIGN_W-104,38,{fontSize:12,fill:'#8AC4E0'}),
    ],
  },
  {
    id:'cherry-blossom', name:{sq:'Lulëzimi i Qershisë', en:'Cherry Blossom'}, category:'Baby & Family',
    thumb:{ background:'linear-gradient(135deg, #FBE8F0 0%, #FFF6F9 100%)' },
    thumbAccents:[
      { position:'absolute', top:'-10px', right:'-10px', width:40, height:40, borderRadius:'50%', background:'#F4BCCC', opacity:0.68 },
      { position:'absolute', bottom:'-8px', left:'-8px', width:32, height:32, borderRadius:'50%', background:'#F0B0C4', opacity:0.60 },
      { position:'absolute', top:8, left:8, right:8, height:36, background:'rgba(255,255,255,0.52)', borderRadius:6 },
      { position:'absolute', top:12, left:'60%', width:18, height:18, borderRadius:'50%', background:'rgba(244,188,204,0.50)' },
    ],
    elements:[
      BG('#FBE8F0',{from:'#FBE8F0',to:'#FFF6F9',dir:'tb'}),
      SH('circle',DESIGN_W-80,-80,245,245,'#F4BCCC',{opacity:0.28}),
      SH('circle',-60,DESIGN_H-90,225,225,'#F0B0C4',{opacity:0.22}),
      SH('circle',40,50,115,115,'#F8D0DC',{opacity:0.28}),
      SH('circle',DESIGN_W-120,165,75,75,'#F4BCCC',{opacity:0.22}),
      PH(50,72,DESIGN_W-100,492),
      TX('Little Blossom',50,608,DESIGN_W-100,64,{fontSize:28,fill:'#C05880',fontStyle:'italic'}),
      TX('precious moments',50,685,DESIGN_W-100,44,{fontSize:13,fill:'#D494B0'}),
    ],
  },
  {
    id:'family-portrait', name:{sq:'Portret Familjar', en:'Family Portrait'}, category:'Baby & Family',
    thumb:{ background:'#FBF4EC' },
    thumbAccents:[
      { position:'absolute', left:0, top:0, bottom:0, width:4, background:'rgba(212,168,112,0.60)' },
      { position:'absolute', top:6, left:10, width:28, height:52, background:'rgba(0,0,0,0.07)', borderRadius:2 },
      { position:'absolute', top:6, right:6, left:'54%', height:28, background:'rgba(0,0,0,0.07)', borderRadius:2 },
      { position:'absolute', bottom:8, right:6, left:'54%', height:26, background:'rgba(212,168,112,0.22)', borderRadius:2 },
    ],
    elements:[
      BG('#FBF4EC'),
      SH('rect',0,0,8,DESIGN_H,'#D4A870',{opacity:0.50}),
      PH(28,28,266,DESIGN_H-56),
      SH('rect',314,44,0.8,DESIGN_H-88,'#D4C4B0',{opacity:0.40}),
      PH(326,44,250,310),
      TX('Family',326,374,250,70,{fontSize:32,fill:'#A86030',fontStyle:'italic'}),
      TX('Together always',326,458,250,46,{fontSize:14,fill:'#C08050'}),
      TX('2025',326,516,250,44,{fontSize:12,fill:'#C0A880'}),
      TX('✦',326,668,250,38,{fontSize:18,fill:'#D4A870'}),
    ],
  },
  {
    id:'honey', name:{sq:'Mjaltë', en:'Honey'}, category:'Baby & Family',
    thumb:{ background:'linear-gradient(160deg, #FFF8E0 0%, #FFFDF5 100%)' },
    thumbAccents:[
      { position:'absolute', top:'-10px', right:'-10px', width:40, height:40, borderRadius:'50%', background:'#F0C840', opacity:0.28 },
      { position:'absolute', bottom:'-6px', left:'-6px', width:30, height:30, borderRadius:'50%', background:'#F0C840', opacity:0.22 },
      { position:'absolute', top:5, left:5, right:5, bottom:5, border:'1px solid rgba(224,184,64,0.45)', borderRadius:2 },
      { position:'absolute', top:12, left:12, right:12, height:34, background:'rgba(0,0,0,0.04)', borderRadius:2 },
    ],
    elements:[
      BG('#FFF8E0',{from:'#FFF8E0',to:'#FFFDF5',dir:'tb'}),
      SH('circle',DESIGN_W-70,-70,225,225,'#F0C840',{opacity:0.14}),
      SH('circle',-60,DESIGN_H-70,205,205,'#F0C840',{opacity:0.11}),
      SH('circle',40,585,95,95,'#F8D840',{opacity:0.15}),
      SH('rect',20,20,DESIGN_W-40,DESIGN_H-40,'transparent',{strokeColor:'#E0B840',strokeWidth:1,opacity:0.55}),
      PH(55,55,DESIGN_W-110,502),
      TX('Sweet Memories',55,598,DESIGN_W-110,62,{fontSize:26,fill:'#906820',fontStyle:'italic'}),
      TX('made with love',55,674,DESIGN_W-110,42,{fontSize:12,fill:'#C09030'}),
    ],
  },
  // ── CELEBRATION ───────────────────────────────────────────────────────────
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
  // ── MODERN ────────────────────────────────────────────────────────────────
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

  // ── MORE WEDDING ─────────────────────────────────────────────────────────
  {
    id:'venetian-lace', name:{sq:'Dantelë Veneciane', en:'Venetian Lace'}, category:'Wedding',
    thumb:{ background:'#FAF7F2', border:'1px solid #E0D8CE' },
    thumbAccents:[
      { position:'absolute', top:4, left:4, right:4, bottom:4, border:'1px solid #D6CCBE', borderRadius:1 },
      { position:'absolute', top:10, left:10, right:10, bottom:10, border:'0.5px solid #EAE4DA', borderRadius:1 },
      { position:'absolute', top:'-6px', left:'50%', transform:'translateX(-50%)', width:16, height:16, borderRadius:'50%', background:'#D6CCBE' },
      { position:'absolute', bottom:10, left:16, right:16, height:1, background:'#C8BEB0' },
    ],
    elements:[
      BG('#FAF7F2'),
      SH('rect',12,12,DESIGN_W-24,DESIGN_H-24,'transparent',{strokeColor:'#C8BEB0',strokeWidth:1,opacity:0.80}),
      SH('rect',24,24,DESIGN_W-48,DESIGN_H-48,'transparent',{strokeColor:'#DDD6CC',strokeWidth:0.5,opacity:0.65}),
      SH('rect',36,36,DESIGN_W-72,DESIGN_H-72,'transparent',{strokeColor:'#EAE4DA',strokeWidth:0.5,opacity:0.50}),
      SH('circle',DESIGN_W/2-10,-10,24,24,'#C8BEB0',{opacity:0.70}),
      PH(52,60,DESIGN_W-104,490),
      SH('rect',52,564,DESIGN_W-104,0.8,'#C0B8AA',{opacity:0.65}),
      TX('With This Ring',52,582,DESIGN_W-104,56,{fontSize:22,fill:'#7A6E60',fontStyle:'italic',fontFamily:"'Cormorant Garamond', serif"}),
      TX('I Thee Wed',52,648,DESIGN_W-104,44,{fontSize:14,fill:'#A89E90',fontStyle:'italic'}),
      TX('✦',DESIGN_W/2-12,706,24,36,{fontSize:14,fill:'#C0B0A0'}),
    ],
  },
  {
    id:'dusty-rose', name:{sq:'Trëndafil i Thatë', en:'Dusty Rose'}, category:'Wedding',
    thumb:{ background:'#F0E0DA' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, bottom:0, width:10, background:'#C8908A' },
      { position:'absolute', top:8, left:14, right:8, height:36, background:'rgba(255,255,255,0.40)', borderRadius:2 },
      { position:'absolute', bottom:12, left:14, right:12, height:1, background:'rgba(180,100,90,0.45)' },
      { position:'absolute', bottom:6, left:14, right:16, height:1, background:'rgba(180,100,90,0.22)' },
    ],
    elements:[
      BG('#F0E0DA'),
      SH('rect',0,0,18,DESIGN_H,'#C8908A',{opacity:0.60}),
      SH('circle',-40,DESIGN_H-100,200,200,'#E0A8A0',{opacity:0.18}),
      SH('circle',DESIGN_W-20,-40,160,160,'#EAB8B2',{opacity:0.16}),
      PH(36,30,DESIGN_W-50,500),
      SH('rect',36,544,DESIGN_W-72,1,'#C08880',{opacity:0.45}),
      TX('Always & Forever',36,560,DESIGN_W-72,62,{fontSize:24,fill:'#7A3A34',fontStyle:'italic'}),
      TX('from this day forward',36,636,DESIGN_W-72,44,{fontSize:13,fill:'#B07870'}),
    ],
  },
  {
    id:'sage-vows', name:{sq:'Betimi i Sherebelës', en:'Sage Vows'}, category:'Wedding',
    thumb:{ background:'#EBF0E6' },
    thumbAccents:[
      { position:'absolute', top:'-16px', right:'-16px', width:52, height:52, borderRadius:'50%', background:'rgba(90,130,80,0.22)' },
      { position:'absolute', top:'-10px', right:'14px', width:34, height:34, borderRadius:'50%', background:'rgba(122,168,112,0.18)' },
      { position:'absolute', bottom:'-16px', left:'-16px', width:48, height:48, borderRadius:'50%', background:'rgba(74,114,64,0.20)' },
      { position:'absolute', top:6, left:6, right:6, bottom:6, border:'1px solid rgba(90,130,80,0.42)', borderRadius:1 },
      { position:'absolute', bottom:10, left:12, right:12, height:1, background:'rgba(90,130,80,0.35)' },
    ],
    elements:[
      BG('#EBF0E6'),
      SH('circle',DESIGN_W-140,-140,360,360,'#5A8250',{opacity:0.20}),
      SH('circle',DESIGN_W-100,-100,280,280,'#8AB878',{opacity:0.16}),
      SH('circle',-100,DESIGN_H-100,320,320,'#4A7240',{opacity:0.18}),
      SH('circle',-60,DESIGN_H-60,220,220,'#7AA870',{opacity:0.14}),
      SH('circle',DESIGN_W-30,240,90,90,'#5A8250',{opacity:0.14}),
      SH('circle',14,240,68,68,'#6A9860',{opacity:0.12}),
      SH('rect',32,32,DESIGN_W-64,DESIGN_H-64,'transparent',{strokeColor:'#6A9860',strokeWidth:1,opacity:0.55}),
      SH('rect',46,46,DESIGN_W-92,DESIGN_H-92,'transparent',{strokeColor:'#A0C890',strokeWidth:0.5,opacity:0.35}),
      PH(62,62,DESIGN_W-124,476),
      SH('rect',62,552,DESIGN_W-124,1,'#6A9860',{opacity:0.45}),
      TX('Garden Vows',62,568,DESIGN_W-124,62,{fontSize:26,fill:'#2E5A28',fontStyle:'italic',fontFamily:"'Cormorant Garamond', serif"}),
      TX('rooted in love, growing forever',62,642,DESIGN_W-124,44,{fontSize:13,fill:'#5A8A50'}),
      TX('\u2767  \u2767  \u2767',62,696,DESIGN_W-124,46,{fontSize:14,fill:'#7AA870',align:'center'}),
    ],
  },
  {
    id:'noir-romance', name:{sq:'Romancë Noir', en:'Noir Romance'}, category:'Wedding',
    thumb:{ background:'#0E0E0E' },
    thumbAccents:[
      { position:'absolute', top:6, left:6, right:6, bottom:6, border:'1px solid rgba(255,255,255,0.14)', borderRadius:1 },
      { position:'absolute', top:12, left:12, right:12, height:32, background:'rgba(255,255,255,0.05)', borderRadius:1 },
      { position:'absolute', bottom:8, left:16, right:16, height:1, background:'rgba(255,255,255,0.22)' },
      { position:'absolute', bottom:3, left:24, right:24, height:1, background:'rgba(255,255,255,0.10)' },
    ],
    elements:[
      BG('#0E0E0E'),
      SH('rect',0,0,DESIGN_W,DESIGN_H,'#FFFFFF',{opacity:0.02}),
      SH('rect',20,20,DESIGN_W-40,DESIGN_H-40,'transparent',{strokeColor:'rgba(255,255,255,0.18)',strokeWidth:1,opacity:1}),
      SH('rect',36,36,DESIGN_W-72,DESIGN_H-72,'transparent',{strokeColor:'rgba(255,255,255,0.08)',strokeWidth:0.5,opacity:1}),
      PH(54,58,DESIGN_W-108,476),
      SH('rect',54,548,DESIGN_W-108,0.8,'rgba(255,255,255,0.25)',{opacity:1}),
      TX('À Jamais',54,566,DESIGN_W-108,62,{fontSize:28,fill:'#FFFFFF',fontStyle:'italic'}),
      TX('forever in shadow and light',54,644,DESIGN_W-108,44,{fontSize:11,fill:'rgba(255,255,255,0.45)'}),
    ],
  },
  {
    id:'rustic-barn', name:{sq:'Fshatar Rustik', en:'Rustic Barn'}, category:'Wedding',
    thumb:{ background:'#F5EBD8' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, height:18, background:'#8B5A2B', opacity:0.85 },
      { position:'absolute', bottom:0, left:0, right:0, height:18, background:'#8B5A2B', opacity:0.85 },
      { position:'absolute', top:8, left:8, right:8, height:38, background:'rgba(0,0,0,0.07)', borderRadius:1 },
      { position:'absolute', top:20, left:6, right:6, bottom:20, border:'1px dashed rgba(139,90,43,0.30)', borderRadius:1 },
    ],
    elements:[
      BG('#F5EBD8'),
      SH('rect',0,0,DESIGN_W,28,'#8B5A2B',{opacity:0.80}),
      SH('rect',0,DESIGN_H-28,DESIGN_W,28,'#8B5A2B',{opacity:0.80}),
      SH('rect',24,36,DESIGN_W-48,DESIGN_H-72,'transparent',{strokeColor:'#9B6833',strokeWidth:1,strokeDash:[10,6],opacity:0.42}),
      SH('circle',DESIGN_W/2-15,-6,30,30,'#F5EBD8',{opacity:1}),
      TX('♥',DESIGN_W/2-16,8,32,28,{fontSize:13,fill:'#8B5A2B'}),
      PH(46,58,DESIGN_W-92,472),
      TX('Love Story',46,552,DESIGN_W-92,62,{fontSize:28,fill:'#5C3618',fontStyle:'italic'}),
      TX('written in wildflowers',46,628,DESIGN_W-92,44,{fontSize:13,fill:'#A07040'}),
    ],
  },
  {
    id:'art-deco-wedding', name:{sq:'Dasmë Art Deco', en:'Art Deco'}, category:'Wedding',
    thumb:{ background:'#1A1408' },
    thumbAccents:[
      { position:'absolute', top:0, left:'35%', right:'35%', height:8, background:'rgba(212,175,55,0.80)' },
      { position:'absolute', bottom:0, left:'35%', right:'35%', height:8, background:'rgba(212,175,55,0.80)' },
      { position:'absolute', top:8, left:6, right:6, bottom:8, border:'0.8px solid rgba(212,175,55,0.45)', borderRadius:0 },
      { position:'absolute', top:14, left:'30%', right:'30%', height:1, background:'rgba(212,175,55,0.55)' },
      { position:'absolute', bottom:14, left:'30%', right:'30%', height:1, background:'rgba(212,175,55,0.55)' },
    ],
    elements:[
      BG('#1A1408'),
      SH('rect',0,0,DESIGN_W,16,'#D4AF37',{opacity:0.85}),
      SH('rect',0,DESIGN_H-16,DESIGN_W,16,'#D4AF37',{opacity:0.85}),
      SH('rect',20,24,DESIGN_W-40,DESIGN_H-48,'transparent',{strokeColor:'#D4AF37',strokeWidth:0.8,opacity:0.55}),
      SH('rect',32,36,DESIGN_W-64,DESIGN_H-72,'transparent',{strokeColor:'#C4A028',strokeWidth:0.4,opacity:0.38}),
      SH('rect',DESIGN_W/2-60,24,120,12,'#D4AF37',{opacity:0.22}),
      SH('rect',DESIGN_W/2-60,DESIGN_H-36,120,12,'#D4AF37',{opacity:0.22}),
      PH(52,60,DESIGN_W-104,460),
      SH('rect',52,534,DESIGN_W-104,1,'#D4AF37',{opacity:0.55}),
      TX('FOREVER',52,550,DESIGN_W-104,62,{fontSize:28,fill:'#D4AF37',align:'center',fontFamily:"'Cormorant Garamond', serif"}),
      TX('✦  2025  ✦',52,626,DESIGN_W-104,44,{fontSize:14,fill:'#A88828',align:'center'}),
    ],
  },
  {
    id:'silver-bride', name:{sq:'Nusja e Argjendtë', en:'Silver Bride'}, category:'Wedding',
    thumb:{ background:'#F0F0F4' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, bottom:0, width:4, background:'#8090A8', opacity:0.90 },
      { position:'absolute', top:0, right:0, bottom:0, width:4, background:'#8090A8', opacity:0.90 },
      { position:'absolute', top:6, left:8, right:8, height:'52%', background:'rgba(0,0,0,0.05)', borderRadius:1 },
      { position:'absolute', bottom:10, left:10, width:32, height:12, background:'rgba(80,96,160,0.25)', borderRadius:1 },
      { position:'absolute', bottom:18, left:10, width:22, height:1, background:'rgba(130,144,170,0.50)' },
    ],
    elements:[
      BG('#F0F0F4'),
      SH('rect',0,0,8,DESIGN_H,'#8090A8',{opacity:0.92}),
      SH('rect',DESIGN_W-8,0,8,DESIGN_H,'#8090A8',{opacity:0.92}),
      PH(28,28,DESIGN_W-56,398),
      SH('rect',28,434,DESIGN_W-56,2,'#7888A0',{opacity:0.62}),
      TX('Our',28,448,DESIGN_W-56,84,{fontSize:50,fill:'#1A1A2A',fontStyle:'italic',align:'left',fontFamily:"'Cormorant Garamond', serif"}),
      TX('Beginning',28,534,DESIGN_W-56,84,{fontSize:50,fill:'#4858A0',fontStyle:'italic',align:'left',fontFamily:"'Cormorant Garamond', serif"}),
      SH('rect',28,626,100,2,'#7888A0',{opacity:0.50}),
      TX('written in silver',28,640,DESIGN_W-56,48,{fontSize:14,fill:'#6878A0',align:'left',fontStyle:'italic'}),
      TX('\u2014 forever',28,698,DESIGN_W-56,42,{fontSize:12,fill:'#9AA0B4',align:'left'}),
    ],
  },

  // ── MORE TRAVEL ───────────────────────────────────────────────────────────
  {
    id:'passport-stamp', name:{sq:'Pullë Pasaporte', en:'Passport Stamp'}, category:'Travel',
    thumb:{ background:'#EDE4D0' },
    thumbAccents:[
      { position:'absolute', top:4, left:4, right:4, bottom:4, border:'2px solid rgba(139,90,43,0.45)', borderRadius:2 },
      { position:'absolute', top:6, left:6, right:6, bottom:6, border:'1px solid rgba(139,90,43,0.22)', borderRadius:2 },
      { position:'absolute', top:14, left:14, right:14, height:28, background:'rgba(0,0,0,0.08)', borderRadius:2 },
      { position:'absolute', bottom:8, left:8, right:8, height:14, background:'rgba(139,90,43,0.14)', borderRadius:1 },
    ],
    elements:[
      BG('#EDE4D0'),
      SH('rect',20,20,DESIGN_W-40,DESIGN_H-40,'transparent',{strokeColor:'#8B5A2B',strokeWidth:3,opacity:0.45}),
      SH('rect',30,30,DESIGN_W-60,DESIGN_H-60,'transparent',{strokeColor:'#8B5A2B',strokeWidth:1,opacity:0.28}),
      TX('PASSPORT',DESIGN_W/2-80,44,160,42,{fontSize:13,fill:'#5C3618',fontStyle:'bold',align:'center',fontFamily:'sans-serif'}),
      SH('rect',DESIGN_W/2-55,82,110,1,'#8B5A2B',{opacity:0.42}),
      PH(44,96,DESIGN_W-88,460),
      TX('DESTINATION',44,576,240,36,{fontSize:10,fill:'#8B5A2B',align:'left',fontFamily:'sans-serif'}),
      TX('City, Country',44,608,240,44,{fontSize:20,fill:'#3C2010',align:'left',fontStyle:'italic'}),
      TX('DATE OF ENTRY',326,576,180,36,{fontSize:10,fill:'#8B5A2B',align:'right',fontFamily:'sans-serif'}),
      TX('2025',326,608,180,44,{fontSize:20,fill:'#3C2010',align:'right'}),
    ],
  },
  {
    id:'desert-dunes', name:{sq:'Dunjet e Shkretëtirës', en:'Desert Dunes'}, category:'Travel',
    thumb:{ background:'linear-gradient(to bottom, #E8B870 0%, #C47A30 100%)' },
    thumbAccents:[
      { position:'absolute', bottom:0, left:0, right:0, height:'38%', background:'rgba(164,80,20,0.80)' },
      { position:'absolute', bottom:'38%', left:0, right:0, height:2, background:'rgba(255,200,100,0.45)' },
      { position:'absolute', top:8, left:8, width:26, height:2, background:'rgba(255,255,255,0.50)', borderRadius:1 },
    ],
    elements:[
      BG('#C47A30',{from:'#E8B870',to:'#C47A30',dir:'tb'}),
      SH('circle',DESIGN_W/2-100,-80,200,200,'#FFD080',{opacity:0.14}),
      PH(0,0,DESIGN_W,DESIGN_H),
      SH('rect',0,DESIGN_H-240,DESIGN_W,240,'#7A3A08',{opacity:0.82}),
      TX('Desert Light',40,DESIGN_H-214,DESIGN_W-80,72,{fontSize:40,fill:'#FFFFFF',fontStyle:'italic',align:'left'}),
      TX('Where the sun meets the sand',40,DESIGN_H-136,DESIGN_W-80,52,{fontSize:14,fill:'rgba(255,220,140,0.80)',align:'left'}),
    ],
  },
  {
    id:'ocean-atlas', name:{sq:'Atlasi i Detit', en:'Ocean Atlas'}, category:'Travel',
    thumb:{ background:'#0D3B5C' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, right:0, height:20, background:'rgba(0,180,216,0.22)' },
      { position:'absolute', top:6, left:6, right:6, height:8, background:'rgba(255,255,255,0.10)', borderRadius:1 },
      { position:'absolute', bottom:10, left:8, width:32, height:2, background:'rgba(0,200,255,0.60)', borderRadius:1 },
      { position:'absolute', bottom:16, left:8, width:48, height:1, background:'rgba(255,255,255,0.25)', borderRadius:1 },
    ],
    elements:[
      BG('#0D3B5C'),
      SH('rect',0,0,DESIGN_W,72,'#0A2C44',{opacity:1}),
      SH('rect',0,72,DESIGN_W,3,'#00B4D8',{opacity:0.70}),
      SH('circle',DESIGN_W-80,-60,200,200,'#00A8D0',{opacity:0.07}),
      TX('OCEAN ATLAS',38,18,DESIGN_W-76,46,{fontSize:13,fill:'rgba(255,255,255,0.70)',fontStyle:'bold',align:'left',fontFamily:'sans-serif'}),
      PH(0,75,DESIGN_W,500),
      SH('rect',0,575,DESIGN_W,DESIGN_H-575,'#071A2C',{opacity:0.90}),
      TX('Into the Blue',38,594,DESIGN_W-76,70,{fontSize:36,fill:'#FFFFFF',fontStyle:'italic',align:'left'}),
      TX('Stories from the sea',38,682,DESIGN_W-76,44,{fontSize:14,fill:'#00B4D8',align:'left'}),
    ],
  },
  {
    id:'mountain-peak', name:{sq:'Maja e Malit', en:'Mountain Peak'}, category:'Travel',
    thumb:{ background:'linear-gradient(to bottom, #1A2840 0%, #2E4860 100%)' },
    thumbAccents:[
      { position:'absolute', bottom:0, left:0, right:0, height:'40%', background:'rgba(10,18,30,0.82)' },
      { position:'absolute', top:0, left:0, right:0, height:'40%', background:'rgba(100,140,200,0.12)' },
      { position:'absolute', bottom:14, left:8, width:36, height:2, background:'rgba(255,255,255,0.55)', borderRadius:1 },
    ],
    elements:[
      BG('#1A2840',{from:'#1A2840',to:'#2E4860',dir:'tb'}),
      PH(0,0,DESIGN_W,DESIGN_H),
      SH('rect',0,DESIGN_H-232,DESIGN_W,232,'#0A1220',{opacity:0.86}),
      SH('rect',38,DESIGN_H-226,64,4,'#90B8E0',{opacity:0.90}),
      TX('Summit',38,DESIGN_H-214,DESIGN_W-76,80,{fontSize:44,fill:'#FFFFFF',fontStyle:'bold',align:'left'}),
      TX('Above the clouds',38,DESIGN_H-128,DESIGN_W-76,48,{fontSize:15,fill:'rgba(144,184,224,0.82)',align:'left'}),
    ],
  },
  {
    id:'vintage-postcard', name:{sq:'Kartë Postale Vintage', en:'Vintage Postcard'}, category:'Travel',
    thumb:{ background:'#F0E8D0' },
    thumbAccents:[
      { position:'absolute', top:4, left:4, right:4, bottom:4, border:'1px solid #C0A868', borderRadius:1 },
      { position:'absolute', top:0, right:0, width:20, height:26, background:'rgba(192,168,104,0.35)', borderRadius:'0 0 0 3px' },
      { position:'absolute', bottom:6, left:10, right:10, height:1, background:'rgba(160,120,60,0.45)' },
      { position:'absolute', top:8, left:8, width:28, height:22, background:'rgba(0,0,0,0.08)', borderRadius:1 },
    ],
    elements:[
      BG('#F0E8D0'),
      SH('rect',16,16,DESIGN_W-32,DESIGN_H-32,'transparent',{strokeColor:'#C0A868',strokeWidth:1,opacity:0.70}),
      SH('rect',DESIGN_W-52,10,48,60,'#C8B070',{opacity:0.28}),
      SH('rect',DESIGN_W-50,12,44,56,'transparent',{strokeColor:'#A08038',strokeWidth:0.8,opacity:0.50}),
      TX('GREETINGS FROM',30,30,DESIGN_W-100,36,{fontSize:10,fill:'#7A5820',fontFamily:'sans-serif'}),
      PH(30,62,DESIGN_W-80,400),
      SH('rect',30,476,DESIGN_W-60,1,'#C0A868',{opacity:0.55}),
      TX('A Place to Remember',30,492,DESIGN_W-60,62,{fontSize:22,fill:'#4A3010',fontStyle:'italic'}),
      TX('With love from afar',30,566,DESIGN_W-60,44,{fontSize:13,fill:'#8A6830'}),
    ],
  },
  {
    id:'jungle-journal', name:{sq:'Ditar i Xhunglës', en:'Jungle Journal'}, category:'Travel',
    thumb:{ background:'#1A2E18' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, bottom:0, width:14, background:'rgba(80,140,60,0.32)' },
      { position:'absolute', top:8, left:18, right:8, height:36, background:'rgba(0,0,0,0.25)', borderRadius:1 },
      { position:'absolute', bottom:8, left:18, right:8, height:16, background:'rgba(80,160,60,0.22)', borderRadius:1 },
    ],
    elements:[
      BG('#1A2E18'),
      SH('rect',0,0,52,DESIGN_H,'#2A5020',{opacity:0.45}),
      SH('rect',52,0,DESIGN_W-52,DESIGN_H,'#0A1808',{opacity:0.30}),
      SH('rect',66,28,DESIGN_W-80,1,'#50A040',{opacity:0.30}),
      SH('rect',66,DESIGN_H-28,DESIGN_W-80,1,'#50A040',{opacity:0.30}),
      PH(68,44,DESIGN_W-82,500),
      TX('Into the Wild',68,564,DESIGN_W-82,70,{fontSize:36,fill:'#FFFFFF',fontStyle:'italic',align:'left'}),
      TX('Nature Journal · 2025',68,648,DESIGN_W-82,44,{fontSize:12,fill:'#70C050',align:'left'}),
    ],
  },

  // ── MORE BABY & FAMILY ────────────────────────────────────────────────────
  {
    id:'mint-nursery', name:{sq:'Çerdhe Balsami', en:'Mint Nursery'}, category:'Baby & Family',
    thumb:{ background:'linear-gradient(160deg, #D4EDE6 0%, #EEF8F4 100%)' },
    thumbAccents:[
      { position:'absolute', inset:'3px', border:'2px solid rgba(80,180,140,0.50)', borderRadius:2 },
      { position:'absolute', inset:'9px', border:'1.5px solid rgba(120,200,170,0.35)', borderRadius:1 },
      { position:'absolute', inset:'15px', border:'1px solid rgba(160,220,196,0.28)', borderRadius:1 },
      { position:'absolute', top:20, left:20, right:20, height:22, background:'rgba(255,255,255,0.40)', borderRadius:1 },
    ],
    elements:[
      BG('#D4EDE6',{from:'#D4EDE6',to:'#EEF8F4',dir:'tb'}),
      SH('rect',10,10,DESIGN_W-20,DESIGN_H-20,'transparent',{strokeColor:'#60B898',strokeWidth:3,opacity:0.55}),
      SH('rect',24,24,DESIGN_W-48,DESIGN_H-48,'transparent',{strokeColor:'#88C8B0',strokeWidth:2,opacity:0.38}),
      SH('rect',38,38,DESIGN_W-76,DESIGN_H-76,'transparent',{strokeColor:'#A8D8C0',strokeWidth:1,opacity:0.28}),
      SH('circle',DESIGN_W/2-110,-90,280,280,'#FFFFFF',{opacity:0.35}),
      SH('circle',-60,DESIGN_H-90,220,220,'#A8DCC8',{opacity:0.18}),
      PH(58,66,DESIGN_W-116,458),
      SH('rect',58,538,DESIGN_W-116,2,'#70B898',{opacity:0.50}),
      TX('Sweet Little One',58,552,DESIGN_W-116,62,{fontSize:26,fill:'#2A7060',fontStyle:'italic',fontFamily:"'Cormorant Garamond', serif"}),
      TX('growing every day',58,626,DESIGN_W-116,44,{fontSize:13,fill:'#4A9A80'}),
      TX('\u2767  \u2767  \u2767',58,680,DESIGN_W-116,44,{fontSize:14,fill:'#70C0A0',align:'center'}),
    ],
  },
  {
    id:'rainbow-kids', name:{sq:'Ylberi i Fëmijëve', en:'Rainbow Kids'}, category:'Baby & Family',
    thumb:{ background:'#FFFDF8' },
    thumbAccents:[
      { position:'absolute', top:'-14px', left:'10%', width:22, height:22, borderRadius:'50%', background:'#FF6B6B' },
      { position:'absolute', top:'-10px', left:'30%', width:18, height:18, borderRadius:'50%', background:'#FF9F43' },
      { position:'absolute', top:'-16px', left:'55%', width:24, height:24, borderRadius:'50%', background:'#FECA57' },
      { position:'absolute', top:'-10px', right:'12%', width:18, height:18, borderRadius:'50%', background:'#48DBFB' },
      { position:'absolute', bottom:8, left:8, right:8, height:18, background:'rgba(0,0,0,0.04)', borderRadius:2 },
    ],
    elements:[
      BG('#FFFDF8'),
      SH('circle',15,20,62,62,'#FF6B6B',{opacity:0.90}),
      SH('circle',100,6,50,50,'#FF9F43',{opacity:0.88}),
      SH('circle',186,16,56,56,'#FECA57',{opacity:0.90}),
      SH('circle',278,4,48,48,'#48DBFB',{opacity:0.88}),
      SH('circle',366,14,54,54,'#FF9FF3',{opacity:0.90}),
      SH('circle',456,6,58,58,'#FF6B6B',{opacity:0.85}),
      SH('circle',524,20,52,52,'#FECA57',{opacity:0.82}),
      SH('circle',30,DESIGN_H-62,52,52,'#FECA57',{opacity:0.88}),
      SH('circle',128,DESIGN_H-52,44,44,'#2A9D8F',{opacity:0.88}),
      SH('circle',224,DESIGN_H-58,50,50,'#FF9F43',{opacity:0.90}),
      SH('circle',326,DESIGN_H-50,46,46,'#FF6B6B',{opacity:0.88}),
      SH('circle',424,DESIGN_H-60,50,50,'#48DBFB',{opacity:0.88}),
      SH('circle',512,DESIGN_H-54,52,52,'#FF9FF3',{opacity:0.85}),
      PH(32,96,DESIGN_W-64,468),
      TX('Growing Up',32,584,DESIGN_W-64,68,{fontSize:32,fill:'#2C2C2C',align:'center',fontFamily:"'Pacifico', cursive"}),
      TX('every colour of childhood',32,662,DESIGN_W-64,44,{fontSize:13,fill:'#888',align:'center'}),
    ],
  },
  {
    id:'lavender-lullaby', name:{sq:'Ninull Lavande', en:'Lavender Lullaby'}, category:'Baby & Family',
    thumb:{ background:'linear-gradient(160deg, #E8E0F5 0%, #F8F4FF 100%)' },
    thumbAccents:[
      { position:'absolute', top:'-20px', right:'-20px', width:58, height:58, borderRadius:'50%', background:'rgba(200,168,224,0.35)' },
      { position:'absolute', top:'-14px', right:'14px', width:38, height:38, borderRadius:'50%', background:'#E8E0F5' },
      { position:'absolute', top:8, left:8, width:12, height:12, borderRadius:'50%', background:'rgba(192,160,220,0.55)' },
      { position:'absolute', top:18, right:12, width:8, height:8, borderRadius:'50%', background:'rgba(200,168,224,0.50)' },
      { position:'absolute', bottom:10, left:8, right:8, height:18, background:'rgba(255,255,255,0.40)', borderRadius:2 },
    ],
    elements:[
      BG('#E8E0F5',{from:'#E8E0F5',to:'#F8F4FF',dir:'tb'}),
      SH('circle',DESIGN_W-240,-180,480,480,'#C8A8E0',{opacity:0.32}),
      SH('circle',DESIGN_W-80,-80,380,380,'#E8E0F5',{opacity:0.85}),
      SH('circle',60,26,22,22,'#C8A8E0',{opacity:0.55}),
      SH('circle',28,88,14,14,'#D4B8EC',{opacity:0.48}),
      SH('circle',DESIGN_W-46,110,18,18,'#C0A0D8',{opacity:0.50}),
      SH('circle',DESIGN_W-28,220,12,12,'#D0B8E8',{opacity:0.45}),
      SH('circle',40,360,10,10,'#C8A8E0',{opacity:0.42}),
      SH('circle',22,480,14,14,'#D4B8EC',{opacity:0.38}),
      SH('circle',DESIGN_W-38,350,16,16,'#C0A0D8',{opacity:0.40}),
      SH('circle',80,DESIGN_H-80,18,18,'#D0B8E8',{opacity:0.42}),
      SH('circle',DESIGN_W-70,DESIGN_H-90,14,14,'#C8A8E0',{opacity:0.38}),
      PH(50,70,DESIGN_W-100,480),
      SH('rect',50,564,DESIGN_W-100,1,'#C0A8DC',{opacity:0.45}),
      TX('Dreamland',50,580,DESIGN_W-100,62,{fontSize:30,fill:'#6040A0',fontStyle:'italic',fontFamily:"'Dancing Script', cursive"}),
      TX('lullabies & starlight',50,654,DESIGN_W-100,44,{fontSize:13,fill:'#9070C0'}),
      TX('\u2736  \u2736  \u2736',50,706,DESIGN_W-100,44,{fontSize:13,fill:'#C0A8DC',align:'center'}),
    ],
  },
  {
    id:'storybook', name:{sq:'Libri i Tregimeve', en:'Storybook'}, category:'Baby & Family',
    thumb:{ background:'#FBF5E8' },
    thumbAccents:[
      { position:'absolute', top:0, left:0, bottom:0, width:4, background:'#D4A840', opacity:0.70 },
      { position:'absolute', top:0, left:'42%', bottom:0, width:3, background:'#C09030', opacity:0.55 },
      { position:'absolute', top:0, left:'44%', right:0, bottom:0, background:'rgba(0,0,0,0.04)' },
      { position:'absolute', top:6, left:8, width:'34%', height:24, background:'rgba(0,0,0,0.06)', borderRadius:1 },
      { position:'absolute', bottom:8, left:8, width:'34%', height:1, background:'rgba(184,120,40,0.40)' },
    ],
    elements:[
      BG('#FBF5E8'),
      SH('rect',0,0,268,DESIGN_H,'#FFF8F0',{opacity:1}),
      SH('rect',0,0,14,DESIGN_H,'#E8C070',{opacity:0.68}),
      SH('rect',268,0,10,DESIGN_H,'#C49030',{opacity:0.50}),
      SH('rect',268,0,1,DESIGN_H,'#A87020',{opacity:0.70}),
      SH('circle',50,60,110,110,'#F0D890',{opacity:0.18}),
      TX('\u201C',18,54,228,170,{fontSize:140,fill:'#D4A840',align:'left',opacity:0.14,fontFamily:"'Georgia', serif"}),
      TX('Chapter',20,186,230,50,{fontSize:20,fill:'#7A4A10',fontStyle:'italic'}),
      TX('One',20,234,230,72,{fontSize:46,fill:'#5C3818',fontStyle:'bold',fontFamily:"'Playfair Display', serif"}),
      SH('rect',20,314,172,1.5,'#D4A840',{opacity:0.45}),
      TX('Once upon\na time\u2026',20,330,230,96,{fontSize:14,fill:'#A07030',fontStyle:'italic',align:'left'}),
      TX('2025',20,DESIGN_H-46,100,32,{fontSize:11,fill:'#C0A060',align:'left',fontFamily:'sans-serif'}),
      PH(284,24,DESIGN_W-306,DESIGN_H-48),
    ],
  },

  // ── MORE CELEBRATION ──────────────────────────────────────────────────────
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

  // ── MORE MODERN ───────────────────────────────────────────────────────────
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

  // ── PORTRAIT ─────────────────────────────────────────────────────────────
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

  // ── NATURE ───────────────────────────────────────────────────────────────
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

  // ── TRAVEL — photo wallpapers ────────────────────────────────────────────
  {
    id:'mountain-escape', name:{sq:'Arratisja në Male', en:'Mountain Escape'}, category:'Travel',
    thumbPhoto:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=85&fit=crop',
    thumb:{ background:'#1C2B3A' }, thumbAccents:[],
    elements:[
      BG('#1C2B3A'),
      SH('rect',0,0,DESIGN_W,DESIGN_H,'#0A1828',{opacity:0.30}),
      PH(0,0,DESIGN_W,560),
      SH('rect',0,526,DESIGN_W,DESIGN_H-526,'#1C2B3A',{opacity:0.92}),
      SH('rect',40,574,64,3,'#7BA7C2',{opacity:1}),
      TX('Peak Memories',40,586,DESIGN_W-80,70,{fontSize:30,fill:'#FFFFFF',fontStyle:'bold',align:'left'}),
      TX('Location  ·  Year',40,672,260,40,{fontSize:12,fill:'#7BA7C2',align:'left'}),
    ],
  },
  {
    id:'coastal-breeze', name:{sq:'Brizë Bregdetare', en:'Coastal Breeze'}, category:'Travel',
    thumbPhoto:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=85&fit=crop',
    thumb:{ background:'#1A4A5C' }, thumbAccents:[],
    elements:[
      BG('#EFF7FA'),
      SH('rect',0,0,DESIGN_W,DESIGN_H,'#B8D8E8',{opacity:0.18}),
      PH(30,30,DESIGN_W-60,520),
      SH('rect',30,562,DESIGN_W-60,1,'#5BA3C0',{opacity:0.45}),
      TX('By the Sea',30,578,DESIGN_W-60,64,{fontSize:28,fill:'#1A4A5C',fontStyle:'italic'}),
      TX('Sun  ·  Salt  ·  Memories',30,654,DESIGN_W-60,40,{fontSize:12,fill:'#5BA3C0'}),
    ],
  },
  {
    id:'desert-journey', name:{sq:'Udhëtim Shkretëtire', en:'Desert Journey'}, category:'Travel',
    thumbPhoto:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=85&fit=crop&crop=center',
    thumb:{ background:'#3D2510' }, thumbAccents:[],
    elements:[
      BG('#F5E6C8',{from:'#F5E6C8',to:'#D4A870',dir:'tb'}),
      SH('circle',DESIGN_W/2-130,-130,260,260,'#E8C080',{opacity:0.12}),
      PH(0,0,DESIGN_W,545),
      SH('rect',0,512,DESIGN_W,DESIGN_H-512,'#3D2510',{opacity:0.88}),
      SH('rect',40,560,56,3,'#E8B860',{opacity:1}),
      TX('Endless Horizons',40,572,DESIGN_W-80,72,{fontSize:28,fill:'#FFFFFF',fontStyle:'italic',align:'left'}),
      TX('Sahara  ·  Year',40,658,240,40,{fontSize:12,fill:'#E8B860',align:'left'}),
    ],
  },
  {
    id:'northern-lights', name:{sq:'Drita Veriore', en:'Northern Lights'}, category:'Travel',
    thumbPhoto:'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&q=85&fit=crop',
    thumb:{ background:'#0B1628' }, thumbAccents:[],
    elements:[
      BG('#0B1628'),
      SH('rect',0,0,DESIGN_W,DESIGN_H/2,'#0D2A3A',{opacity:0.55}),
      PH(0,0,DESIGN_W,560),
      SH('rect',0,526,DESIGN_W,DESIGN_H-526,'#0B1628',{opacity:0.94}),
      SH('rect',40,574,48,3,'#48C8A8',{opacity:1}),
      TX('Aurora',40,585,DESIGN_W-80,76,{fontSize:40,fill:'#FFFFFF',fontStyle:'bold',align:'left'}),
      TX('Arctic  ·  Year',40,675,240,40,{fontSize:12,fill:'#48C8A8',align:'left'}),
    ],
  },
  {
    id:'forest-path', name:{sq:'Shtegu i Pyllit', en:'Forest Path'}, category:'Travel',
    thumbPhoto:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=85&fit=crop',
    thumb:{ background:'#1A3020' }, thumbAccents:[],
    elements:[
      BG('#1A3020'),
      SH('rect',0,0,16,DESIGN_H,'#2A4A2A',{opacity:0.60}),
      SH('rect',DESIGN_W-16,0,16,DESIGN_H,'#2A4A2A',{opacity:0.60}),
      PH(24,24,DESIGN_W-48,530),
      SH('rect',0,554,DESIGN_W,DESIGN_H-554,'#0E2016',{opacity:0.92}),
      TX('Into the Wild',40,580,DESIGN_W-80,66,{fontSize:28,fill:'#A8D898',fontStyle:'italic',align:'left'}),
      TX('Forest  ·  Year',40,660,220,40,{fontSize:12,fill:'rgba(168,216,152,0.7)',align:'left'}),
    ],
  },

  // ── LOCATIONS ────────────────────────────────────────────────────────────
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

  // ── BABY & FAMILY — photo wallpapers ─────────────────────────────────────
  {
    id:'golden-family', name:{sq:'Familja Artë', en:'Golden Family'}, category:'Baby & Family',
    thumbPhoto:'https://images.unsplash.com/photo-1511895426328-dc8714191011?w=400&q=85&fit=crop&crop=top',
    thumb:{ background:'#3A2810' }, thumbAccents:[],
    elements:[
      BG('#FDF5E8'),
      SH('circle',DESIGN_W-80,-80,240,240,'#F0C878',{opacity:0.10}),
      PH(30,30,DESIGN_W-60,510),
      SH('rect',30,552,DESIGN_W-60,1,'#C09050',{opacity:0.35}),
      TX('Our Family',30,568,DESIGN_W-60,64,{fontSize:28,fill:'#3A2810',fontStyle:'italic'}),
      TX('Together  ·  Always',30,644,DESIGN_W-60,40,{fontSize:12,fill:'#C09050'}),
    ],
  },
  {
    id:'autumn-family', name:{sq:'Familja në Vjeshtë', en:'Autumn Family'}, category:'Baby & Family',
    thumbPhoto:'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=400&q=85&fit=crop',
    thumb:{ background:'#3A1C08' }, thumbAccents:[],
    elements:[
      BG('#FBF0E0'),
      SH('circle',-60,DESIGN_H-80,280,280,'#D4782A',{opacity:0.08}),
      PH(24,24,DESIGN_W-48,510),
      SH('rect',24,546,DESIGN_W-48,1,'#C07030',{opacity:0.40}),
      TX('Fall Together',24,562,DESIGN_W-48,64,{fontSize:26,fill:'#3A1C08',fontStyle:'italic'}),
      TX('Autumn  ·  Year',24,638,DESIGN_W-48,40,{fontSize:12,fill:'#C07030'}),
    ],
  },
  {
    id:'little-joy', name:{sq:'Gëzime të Vogla', en:'Little Joy'}, category:'Baby & Family',
    thumbPhoto:'https://images.unsplash.com/photo-1533483595632-c5f0e57a1936?w=400&q=85&fit=crop',
    thumb:{ background:'#283A50' }, thumbAccents:[],
    elements:[
      BG('#F8FBFF'),
      SH('circle',DESIGN_W/2-80,-80,200,200,'#A8C8F0',{opacity:0.15}),
      PH(24,24,DESIGN_W-48,510),
      SH('rect',24,546,DESIGN_W-48,1,'#6090C0',{opacity:0.30}),
      TX('Childhood',24,562,DESIGN_W-48,64,{fontSize:28,fill:'#283A50',fontStyle:'italic'}),
      TX('Growing up fast  ·  Year',24,638,DESIGN_W-48,40,{fontSize:12,fill:'#6090C0'}),
    ],
  },

  // ── NATURE — photo wallpapers ─────────────────────────────────────────────
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
