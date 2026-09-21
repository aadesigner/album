import React, { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue, startTransition } from 'react';
import { Stage, Layer, Rect, Text as KonvaText, Image as KonvaImage, Transformer, Line, Group } from 'react-konva';
import { useGetProject, useCreateOrder, useListBookSizes, useGetAppSettings, useListLayouts, getGetProjectQueryKey, getListProjectsQueryKey } from '@workspace/api-client-react-tsconfig';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ShoppingBag, LayoutTemplate, Image as ImageIcon, Type,
  Trash2, Check, X, Plus, Camera, Lock, Loader2, Wand2, Box, Undo2, FileDown,
  Palette, Droplets,
} from 'lucide-react';
import { generatePDF } from '@/lib/generatePDF';
import { Link, useRoute } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
const Book3DViewer = React.lazy(() =>
  import('./Book3DViewer').then(m => ({ default: m.Book3DViewer }))
);

// ─────────────────────────────────────────────────────────────────────────────
// Shared design/layout data — moved to @/lib/designs so it can also be
// imported by the Wizard's design picker (and any other preview surface)
// without pulling in this whole (heavy) Editor module. This is the single
// source of truth: never re-derive design visuals elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

export {
  DESIGN_W, DESIGN_H, LAYOUTS, DESIGNS, CATEGORY_LABELS, LAYOUT_CATEGORY_LABELS,
  getCanvasHeight, scaleElementsToCanvas, elementsWithCoverWallpaper,
  BLANK_STARTER_ID, blankFrontCoverElements, blankBackCoverElements,
  coverCropRect,
  type EditorElement, type DE, type DesignDef, type LayoutZone, type LayoutDef,
} from '@/lib/designs';
import {
  DESIGN_W, DESIGN_H, LAYOUTS, DESIGNS, CATEGORY_LABELS, LAYOUT_CATEGORY_LABELS,
  getCanvasHeight, scaleElementsToCanvas, elementsWithCoverWallpaper,
  BLANK_STARTER_ID, blankFrontCoverElements, blankBackCoverElements,
  coverCropRect, imageFrameCoverFit, imageFrameContainFit, imageFrameFocusFromOffset, PHOTO_CORNER_ZOOM,
  designFrontElements, designBackElements, buildDesignCatalog, parseCustomDesigns,
  type EditorElement, type DE, type DesignDef, type LayoutZone, type LayoutDef, type DesignOverrides,
} from '@/lib/designs';
import { getEmptyInnerPageNumbers } from '@/lib/pageContent';
import { PageThumb } from '@/components/PageThumb';
import { compressImageFile, ImageTooLargeError } from '@/lib/imageCompression';
import { applyCoverBackground, coverBgMode, type CoverBgMode } from '@/lib/coverBackground';
import { useEditorFontsReady, ensureEditorFonts } from '@/lib/editorFonts';

const PAPER_COLOR = '#FEFDF9';
const SPINE_W = 1;
const PAPER_TEXTURE = `url("data:image/svg+xml,<svg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>")`;

/** Survives React Strict Mode remount so wizard design isn't applied twice / lost. */
const consumedWizardDesignKeys = new Set<string>();

/** Parse admin layout grid JSON into editor LayoutDef zones. */
function parseAdminLayoutZones(json: string): LayoutZone[] {
  try {
    const parsed = JSON.parse(json);
    const raw = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.cells)
        ? parsed.cells
        : Array.isArray(parsed?.zones)
          ? parsed.zones
          : [];
    return raw
      .map((c: any) => ({
        x: Number(c.x) || 0,
        y: Number(c.y) || 0,
        w: Math.max(0.05, Number(c.w) || 0.2),
        h: Math.max(0.05, Number(c.h) || 0.2),
        type: c.type === 'text' ? 'text' : 'photo',
        ...(typeof c.rotation === 'number' ? { rotation: c.rotation } : {}),
      }))
      .filter((c: LayoutZone) => c.w > 0 && c.h > 0);
  } catch {
    return [];
  }
}

function mergeEditorLayouts(dbLayouts: { slug: string; nameAl: string; nameEn: string; gridDefinitionJson: string; isActive: boolean }[] | undefined): LayoutDef[] {
  const byId = new Map<string, LayoutDef>(LAYOUTS.map(l => [l.id, l]));
  for (const row of dbLayouts || []) {
    if (!row.isActive) continue;
    const zones = parseAdminLayoutZones(row.gridDefinitionJson);
    if (!zones.length) continue;
    const photoCount = zones.filter(z => z.type === 'photo').length;
    const hasText = zones.some(z => z.type === 'text');
    let category = 'Custom';
    if (photoCount <= 1 && !hasText) category = '1 Photo';
    else if (photoCount <= 1 && hasText) category = 'Photo + Text';
    else if (photoCount === 2) category = '2 Photos';
    else if (photoCount === 3) category = '3 Photos';
    else if (photoCount === 4) category = '4 Photos';
    else if (photoCount >= 5) category = '5-6 Photos';
    byId.set(row.slug, {
      id: row.slug,
      category,
      label: { sq: row.nameAl, en: row.nameEn },
      zones,
    });
  }
  return [...byId.values()];
}

/** Live clamp while dragging so elements don't jump on release. */
function dragBoundBox(pos: { x: number; y: number }, w: number, h: number, canvasH: number) {
  const maxX = Math.max(0, DESIGN_W - w);
  const maxY = Math.max(0, canvasH - h);
  return {
    x: Math.min(Math.max(pos.x, 0), maxX),
    y: Math.min(Math.max(pos.y, 0), maxY),
  };
}

const GUIDE_SNAP_PX = 5;

/** Clamp + snap element center to page midlines; returns guide flags for UI. */
function dragBoundWithGuides(
  pos: { x: number; y: number },
  w: number, h: number, canvasH: number,
): { x: number; y: number; guideV: boolean; guideH: boolean } {
  let { x, y } = dragBoundBox(pos, w, h, canvasH);
  const midX = DESIGN_W / 2;
  const midY = canvasH / 2;
  let guideV = false;
  let guideH = false;
  if (Math.abs(x + w / 2 - midX) <= GUIDE_SNAP_PX) {
    x = midX - w / 2;
    guideV = true;
  }
  if (Math.abs(y + h / 2 - midY) <= GUIDE_SNAP_PX) {
    y = midY - h / 2;
    guideH = true;
  }
  // Re-clamp after snap (edge cases when w/h > canvas)
  const clamped = dragBoundBox({ x, y }, w, h, canvasH);
  return { ...clamped, guideV, guideH };
}

type GuideState = { v: boolean; h: boolean } | null;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PageRole = 'front_cover' | 'back_cover' | 'locked_left' | 'inner' | 'locked_right';
// 'locked_left' = inside-front-cover lining, 'locked_right' = inside-back-cover lining.
export interface PageDef { dbId: number; role: PageRole; pageNumber?: number; contentJson?: string | null }
interface SpreadDef { id: string; navLabel: string; left: PageDef | null; right: PageDef | null; isSolo: boolean }
type SideTab = 'designs' | 'layouts' | 'photos' | 'text';

// ─────────────────────────────────────────────────────────────────────────────
// (Layouts/Designs data now lives in @/lib/designs — imported above)
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// Fonts
// ─────────────────────────────────────────────────────────────────────────────

const FONTS = [
  { label: 'Georgia',    value: 'Georgia, serif' },
  { label: 'Playfair',   value: "'Playfair Display', serif" },
  { label: 'Cormorant',  value: "'Cormorant Garamond', serif" },
  { label: 'Raleway',    value: "'Raleway', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
  { label: 'Arial',      value: 'Arial, Helvetica, sans-serif' },
  { label: 'Londrina',   value: "'Londrina Solid', cursive" },
  { label: 'Dancing',    value: "'Dancing Script', cursive" },
  { label: 'Vibes',      value: "'Great Vibes', cursive" },
  { label: 'Pacifico',   value: "'Pacifico', cursive" },
];

/** Map design font stacks onto FONTS option values so the toolbar <select>
 *  always has a matching option (mismatched values made the browser jump to Georgia). */
function normalizeFontFamily(ff?: string | null): string {
  const raw = (ff || 'Georgia, serif').trim();
  if (FONTS.some(f => f.value === raw)) return raw;
  const lower = raw.toLowerCase();
  const byPrimary = FONTS.find(f => {
    const primary = f.value.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
    return primary.length > 0 && lower.includes(primary);
  });
  if (byPrimary) return byPrimary.value;
  if (lower.includes('great vibes') || lower.includes('segoescript') || lower.includes('segoe script')) {
    return "'Great Vibes', cursive";
  }
  if (lower.includes('londrina')) return "'Londrina Solid', cursive";
  if (lower.includes('dancing')) return "'Dancing Script', cursive";
  if (lower.includes('pacifico')) return "'Pacifico', cursive";
  if (lower.includes('playfair')) return "'Playfair Display', serif";
  if (lower.includes('cormorant')) return "'Cormorant Garamond', serif";
  if (lower.includes('raleway')) return "'Raleway', sans-serif";
  if (lower.includes('montserrat')) return "'Montserrat', sans-serif";
  if (lower.includes('arial') || lower.includes('helvetica') || lower.includes('impact') || lower === 'sans-serif') {
    return 'Arial, Helvetica, sans-serif';
  }
  if (lower.includes('georgia') || lower.includes('times')) return 'Georgia, serif';
  if (lower.includes('mono')) return "'Montserrat', sans-serif";
  return 'Georgia, serif';
}

/** Script faces ship as a single cut — Konva "italic" looks for a missing
 *  italic file and silently falls back (often to Georgia), so the text jumps
 *  when the HTML editor overlay (which synthesizes oblique) appears. */
function canvasFontStyle(ff?: string | null, fs?: string | null): string {
  const family = normalizeFontFamily(ff).toLowerCase();
  const isScript =
    family.includes('great vibes') ||
    family.includes('dancing script') ||
    family.includes('pacifico');
  const bold = !!fs?.includes('bold');
  if (isScript) return bold ? 'bold' : 'normal';
  return fs || 'normal';
}

// Preset text colours shown in the inline toolbar
const TEXT_COLORS = [
  '#FFFFFF','#1A1A1A','#555555','#AAAAAA',
  '#D4AF37','#FCB426','#E63946','#F878C3','#457B9D','#2A9D8F','#F4A261',
];

// ─────────────────────────────────────────────────────────────────────────────
// Build spreads
// ─────────────────────────────────────────────────────────────────────────────

function buildSpreads(pages: any[], lang: 'sq'|'en' = 'sq'): SpreadDef[] {
  if (!pages?.length) return [];
  const s = [...pages].sort((a,b) => a.pageNumber - b.pageNumber);
  const front  = s.find(p => p.pageType==='front_cover');
  const inside = s.find(p => p.pageType==='inside_cover');
  const insideBack = s.find(p => p.pageType==='inside_back_cover');
  const back   = s.find(p => p.pageType==='back_cover');
  const inner  = s.filter(p => p.pageType==='inner');
  const spreads: SpreadDef[] = [];

  if (front) spreads.push({id:'cover',navLabel:lang==='sq'?'Para':'Cover',isSolo:true,left:null,
    right:{dbId:front.id,role:'front_cover',contentJson:front.contentJson}});

  spreads.push({id:'sp1',navLabel:'1',isSolo:false,
    left: inside?{dbId:inside.id,role:'locked_left',contentJson:inside.contentJson}:null,
    right: inner[0]?{dbId:inner[0].id,role:'inner',pageNumber:1,contentJson:inner[0].contentJson}:null});

  for (let i=1; i<inner.length; i+=2) {
    const L=inner[i], R=inner[i+1];
    spreads.push({id:`sp${i+1}`,navLabel:`${i+1}${R?`–${i+2}`:''}`,isSolo:false,
      left:  L?{dbId:L.id,role:'inner',pageNumber:i+1,contentJson:L.contentJson}:null,
      right: R?{dbId:R.id,role:'inner',pageNumber:i+2,contentJson:R.contentJson}:null});
  }

  // Inside back cover: a locked lining page, distinct from the outer back
  // cover, mirroring how the inside front cover pairs with the first inner
  // page. With an even inner-page count it naturally lands in the trailing
  // empty right slot left over from the pairing loop above; otherwise it
  // gets its own trailing spread as a fallback.
  if (insideBack) {
    const insideBackPage = {dbId:insideBack.id,role:'locked_right' as PageRole,contentJson:insideBack.contentJson};
    const lastSpread = spreads[spreads.length-1];
    if (lastSpread && !lastSpread.isSolo && lastSpread.right===null) {
      lastSpread.right = insideBackPage;
    } else {
      spreads.push({id:'inside-back-cover',navLabel:lang==='sq'?'Pas e brendshme':'Inside back',isSolo:false,
        left:null,right:insideBackPage});
    }
  }

  // Back cover: always its own solo spread at the end — page on left, spine on right
  if (back) spreads.push({id:'back-cover',navLabel:lang==='sq'?'Pas':'Back',isSolo:true,
    left:{dbId:back.id,role:'back_cover',contentJson:back.contentJson},right:null});

  return spreads;
}

// ─────────────────────────────────────────────────────────────────────────────
// Konva element renderers
// ─────────────────────────────────────────────────────────────────────────────

function KBgEl({el,canvasH,interactive,isSelected,onChange,onGestureStart}: {
  el: EditorElement; canvasH:number;
  interactive?: boolean; isSelected?: boolean;
  onChange?: (c: Partial<EditorElement>) => void;
  onGestureStart?: () => void;
}) {
  const [img,setImg]=useState<HTMLImageElement>();
  const panStartRef=useRef<{focusX:number;focusY:number;px:number;py:number}|null>(null);
  useEffect(()=>{
    if (!el.src) { setImg(undefined); return; }
    const i=new window.Image(); i.crossOrigin='anonymous';
    i.onload=()=>setImg(i); i.onerror=()=>setImg(undefined); i.src=el.src;
  },[el.src]);

  const focusX = el.cropFocusX ?? 0.5;
  const focusY = el.cropFocusY ?? 0.5;
  const cover = (el.src && img)
    ? coverCropRect(img.naturalWidth, img.naturalHeight, DESIGN_W, canvasH, focusX, focusY)
    : null;
  // Only listen when already selected (for photo pan). Never steal clicks from
  // text/shapes/images — cover bg is selected via the Background chip only.
  const canPan = !!(interactive && isSelected && cover && onChange && (cover.maxX > 1 || cover.maxY > 1));
  const listen = canPan;

  let fillNode: React.ReactNode;
  if (el.src && img && cover) {
    fillNode = <KonvaImage image={img} x={0} y={0} width={DESIGN_W} height={canvasH}
      crop={{ x: cover.x, y: cover.y, width: cover.width, height: cover.height }}
      listening={listen}
      draggable={listen}
      dragDistance={3}
      dragBoundFunc={() => ({ x: 0, y: 0 })}
      onDragStart={(e: any) => {
        if (!canPan || !cover) return;
        onGestureStart?.();
        const p = e.target.getStage()?.getRelativePointerPosition() ?? e.target.getStage()?.getPointerPosition();
        panStartRef.current = {
          focusX: el.cropFocusX ?? 0.5,
          focusY: el.cropFocusY ?? 0.5,
          px: p?.x ?? 0,
          py: p?.y ?? 0,
        };
      }}
      onDragMove={(e: any) => {
        if (!canPan || !cover || !panStartRef.current) return;
        e.target.position({ x: 0, y: 0 });
        const p = e.target.getStage()?.getRelativePointerPosition() ?? e.target.getStage()?.getPointerPosition();
        if (!p) return;
        const dx = p.x - panStartRef.current.px;
        const dy = p.y - panStartRef.current.py;
        const startCropX = panStartRef.current.focusX * cover.maxX;
        const startCropY = panStartRef.current.focusY * cover.maxY;
        const newCropX = Math.min(cover.maxX, Math.max(0, startCropX - dx / cover.scale));
        const newCropY = Math.min(cover.maxY, Math.max(0, startCropY - dy / cover.scale));
        e.target.crop({ x: newCropX, y: newCropY, width: cover.width, height: cover.height });
        e.target.getLayer()?.batchDraw();
      }}
      onDragEnd={(e: any) => {
        e.target.position({ x: 0, y: 0 });
        if (!canPan || !cover || !panStartRef.current) return;
        const p = e.target.getStage()?.getRelativePointerPosition() ?? e.target.getStage()?.getPointerPosition();
        let fx = el.cropFocusX ?? 0.5;
        let fy = el.cropFocusY ?? 0.5;
        if (p) {
          const dx = p.x - panStartRef.current.px;
          const dy = p.y - panStartRef.current.py;
          const startCropX = panStartRef.current.focusX * cover.maxX;
          const startCropY = panStartRef.current.focusY * cover.maxY;
          const newCropX = Math.min(cover.maxX, Math.max(0, startCropX - dx / cover.scale));
          const newCropY = Math.min(cover.maxY, Math.max(0, startCropY - dy / cover.scale));
          fx = cover.maxX <= 0 ? 0.5 : newCropX / cover.maxX;
          fy = cover.maxY <= 0 ? 0.5 : newCropY / cover.maxY;
        }
        onChange?.({ cropFocusX: fx, cropFocusY: fy });
        panStartRef.current = null;
      }}
    />;
  } else if (el.bgGradientFrom) {
    const ep = el.bgGradientDir==='lr' ? {x:DESIGN_W,y:0}
             : el.bgGradientDir==='diag' ? {x:DESIGN_W,y:canvasH}
             : {x:0,y:canvasH};
    fillNode = <Rect x={0} y={0} width={DESIGN_W} height={canvasH}
      fillLinearGradientStartPoint={{x:0,y:0}} fillLinearGradientEndPoint={ep}
      fillLinearGradientColorStops={[0,el.bgGradientFrom,1,el.bgGradientTo||'#fff']}
      listening={false}/>;
  } else {
    fillNode = <Rect x={0} y={0} width={DESIGN_W} height={canvasH}
      fill={el.bgColor||PAPER_COLOR}
      listening={false}/>;
  }

  return <>
    {fillNode}
    {isSelected && interactive && (
      <Rect x={0} y={0} width={DESIGN_W} height={canvasH}
        stroke="#2563EB" strokeWidth={3} dash={[10, 6]} listening={false}/>
    )}
  </>;
}

function KShapeEl({el,isSelected,onSelect,onChange,onGestureStart,onDragActive,onGuides,shapeRefs,canvasH}: {
  el: EditorElement; isSelected: boolean; onSelect:()=>void;
  onChange:(c:Partial<EditorElement>)=>void; onGestureStart?:()=>void;
  onDragActive?:(active:boolean, opts?: { keepTransformer?: boolean })=>void; onGuides?:(g:GuideState)=>void;
  shapeRefs:React.MutableRefObject<Record<string,any>>; canvasH:number;
}) {
  const cr = el.shapeKind==='circle' ? Math.min(el.w,el.h)/2 : (el.cornerRadius??0);
  const transformStartRef = useRef({ w: el.w, h: el.h });
  // Soft scrims / overlays (city cover vignettes) — visible but not selectable.
  const decorative = (el.opacity ?? 1) < 0.5 && !(el.strokeWidth);
  // Transparent fills must still hit-test — otherwise clicks fall through to the cover bg.
  const visualFill = el.fill && el.fill !== 'transparent' ? el.fill : undefined;
  const hitFill = visualFill || 'rgba(0,0,0,0.001)';
  return <Rect ref={(n:any)=>{if(n && !decorative) shapeRefs.current[el.id]=n;}}
    x={el.x} y={el.y} width={el.w} height={el.h} fill={hitFill}
    stroke={el.strokeColor} strokeWidth={el.strokeWidth||0} dash={el.strokeDash}
    cornerRadius={cr} rotation={el.rotation} opacity={el.opacity??1}
    perfectDrawEnabled={false}
    listening={!decorative}
    onMouseDown={(e:any)=>{ if (decorative) return; e.cancelBubble=true; onSelect(); }}
    onTouchStart={(e:any)=>{ if (decorative) return; e.cancelBubble=true; onSelect(); }}
    onClick={(e:any)=>{ if (decorative) return; e.cancelBubble=true; onSelect(); }}
    onTap={(e:any)=>{ if (decorative) return; e.cancelBubble=true; onSelect(); }}
    draggable={isSelected && !decorative}
    dragDistance={4}
    dragBoundFunc={(pos:any)=>{
      const b=dragBoundWithGuides(pos,el.w,el.h,canvasH);
      onGuides?.({v:b.guideV,h:b.guideH});
      return {x:b.x,y:b.y};
    }}
    onDragStart={()=>{onGestureStart?.();onDragActive?.(true,{keepTransformer:true});}}
    onDragEnd={(e:any)=>{
      const b=dragBoundWithGuides({x:e.target.x(),y:e.target.y()},el.w,el.h,canvasH);
      e.target.position({x:b.x,y:b.y}); onChange({x:b.x,y:b.y}); onDragActive?.(false); onGuides?.(null);
    }}
    onTransformStart={()=>{
      transformStartRef.current={w:el.w,h:el.h};
      onGestureStart?.();onDragActive?.(true,{keepTransformer:true});
    }}
    onTransform={(e:any)=>{
      const n=e.target;
      const nw=Math.max(10, transformStartRef.current.w * n.scaleX());
      const nh=Math.max(10, transformStartRef.current.h * n.scaleY());
      n.scaleX(1); n.scaleY(1);
      n.width(nw); n.height(nh);
    }}
    onTransformEnd={(e:any)=>{
      const n=e.target;
      n.scaleX(1); n.scaleY(1);
      const nw=Math.max(10,n.width()||transformStartRef.current.w);
      const nh=Math.max(10,n.height()||transformStartRef.current.h);
      const b=dragBoundBox({x:n.x(),y:n.y()},nw,nh,canvasH);
      n.position(b); n.width(nw); n.height(nh);
      onChange({...b,w:nw,h:nh,rotation:n.rotation()});
      onDragActive?.(false); onGuides?.(null);
    }}/>;
}

function KImgEl({el,isSelected,onSelect,onChange,onGestureStart,onDragActive,onGuides,shapeRefs,canvasH,photoAdjust,onTogglePhotoAdjust,onExitPhotoAdjust,onCanPanChange}: {
  el: EditorElement; isSelected:boolean; onSelect:()=>void;
  onChange:(c:Partial<EditorElement>)=>void; onGestureStart?:()=>void;
  onDragActive?:(active:boolean, opts?: { keepTransformer?: boolean })=>void; onGuides?:(g:GuideState)=>void;
  shapeRefs:React.MutableRefObject<Record<string,any>>; canvasH:number;
  /** When true, drag pans the photo inside the frame; when false, drag moves the frame. */
  photoAdjust?: boolean;
  onTogglePhotoAdjust?: () => void;
  onExitPhotoAdjust?: () => void;
  onCanPanChange?: (canPan: boolean) => void;
}) {
  const [img,setImg]=useState<HTMLImageElement>();
  const transformStartRef = useRef({ w: el.w, h: el.h });
  useEffect(()=>{
    if (!el.src) { setImg(undefined); return; }
    const i=new window.Image(); i.crossOrigin='anonymous';
    i.onload=()=>setImg(i);
    i.onerror=()=>setImg(undefined);
    i.src=el.src;
  },[el.src]);

  // Sticky focus while / right after pan — avoids snap-back when React commits lag behind Konva.
  const [liveFocus, setLiveFocus] = useState<{ x: number; y: number } | null>(null);
  const focusX = liveFocus?.x ?? el.cropFocusX ?? 0.5;
  const focusY = liveFocus?.y ?? el.cropFocusY ?? 0.5;
  const cropZoom = Math.max(1, el.cropZoom ?? 1);

  useEffect(() => {
    setLiveFocus(null);
  }, [el.cropFocusX, el.cropFocusY, el.cropZoom, el.src]);

  const fit = img
    ? (el.objectFit === 'contain'
        ? imageFrameContainFit(img.naturalWidth, img.naturalHeight, el.w, el.h)
        : imageFrameCoverFit(img.naturalWidth, img.naturalHeight, el.w, el.h, focusX, focusY, cropZoom))
    : null;
  // Cover photos can always enter Adjust (we bump cropZoom to unlock corners).
  const canPan = el.objectFit === 'contain' ? false : (img ? true : !!fit?.canPan);

  const onCanPanChangeRef = useRef(onCanPanChange);
  onCanPanChangeRef.current = onCanPanChange;
  useEffect(() => {
    if (!img) return;
    onCanPanChangeRef.current?.(canPan);
  }, [img, canPan]);

  const onExitPhotoAdjustRef = useRef(onExitPhotoAdjust);
  onExitPhotoAdjustRef.current = onExitPhotoAdjust;
  useEffect(() => {
    if (photoAdjust && img && el.objectFit === 'contain') onExitPhotoAdjustRef.current?.();
  }, [photoAdjust, img, el.objectFit]);

  const panInside = isSelected && !!photoAdjust && canPan;
  const moveFrame = isSelected && !panInside;
  const adjustingVisual = panInside;
  // While panning, omit x/y props so React re-renders (autosave, chrome, etc.)
  // don't fight Konva and snap the photo back to the last committed focus.
  const [panning, setPanning] = useState(false);
  const panMaxRef = useRef({ maxOffX: 0, maxOffY: 0 });

  const setStageCursor = (cursor: string) => {
    const stage = shapeRefs.current[el.id]?.getStage?.();
    const container = stage?.container?.() as HTMLElement | undefined;
    if (container) container.style.cursor = cursor;
  };

  const bakeImageFrame = (n: any, sx: number, sy: number) => {
    const nw = Math.max(20, transformStartRef.current.w * sx);
    const nh = Math.max(20, transformStartRef.current.h * sy);
    n.scaleX(1);
    n.scaleY(1);
    n.width(nw);
    n.height(nh);
    n.clip({ x: 0, y: 0, width: nw, height: nh });
    // Keep the photo cover-fit in sync while resizing — otherwise the KonvaImage
    // stays at the old iw/ih until transformEnd and the crop snaps.
    const live = img
      ? (el.objectFit === 'contain'
          ? imageFrameContainFit(img.naturalWidth, img.naturalHeight, nw, nh)
          : imageFrameCoverFit(
              img.naturalWidth, img.naturalHeight, nw, nh,
              focusX, focusY, cropZoom,
            ))
      : null;
    n.getChildren().forEach((c: any) => {
      const name = typeof c.getClassName === 'function' ? c.getClassName() : '';
      if (name === 'Rect') {
        c.width(nw);
        c.height(nh);
      } else if (name === 'Image' && live) {
        c.width(live.iw);
        c.height(live.ih);
        c.x(-live.offX);
        c.y(-live.offY);
      }
    });
    return { nw, nh };
  };

  // If adjust mode ends mid-pan, release the uncontrolled lock.
  useEffect(() => {
    if (!panInside && panning) setPanning(false);
  }, [panInside, panning]);

  if (!img || !fit) return (
    <Group
      ref={(n: any) => { if (n) shapeRefs.current[el.id] = n; }}
      x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation}
      draggable={isSelected}
      dragDistance={3}
      dragBoundFunc={(pos: any) => {
        const b = dragBoundWithGuides(pos, el.w, el.h, canvasH);
        onGuides?.({ v: b.guideV, h: b.guideH });
        return { x: b.x, y: b.y };
      }}
      onMouseDown={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTouchStart={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onClick={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTap={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onDragStart={() => { onGestureStart?.(); onDragActive?.(true, { keepTransformer: true }); }}
      onDragEnd={(e: any) => {
        const b = dragBoundWithGuides({ x: e.target.x(), y: e.target.y() }, el.w, el.h, canvasH);
        e.target.position({ x: b.x, y: b.y });
        onChange({ x: b.x, y: b.y });
        onDragActive?.(false);
        onGuides?.(null);
      }}
    >
      <Rect width={el.w} height={el.h} fill="#D0C8BC" cornerRadius={2} />
      {isSelected && (
        <Rect width={el.w} height={el.h} stroke="#2563EB" strokeWidth={2.5} listening={false} cornerRadius={2} />
      )}
    </Group>
  );

  const { iw, ih, maxOffX, maxOffY, offX, offY } = fit;
  panMaxRef.current = { maxOffX, maxOffY };

  return (
    <Group
      ref={(n: any) => { if (n) shapeRefs.current[el.id] = n; }}
      x={el.x}
      y={el.y}
      width={el.w}
      height={el.h}
      rotation={el.rotation}
      clipX={0}
      clipY={0}
      clipWidth={el.w}
      clipHeight={el.h}
      onMouseDown={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTouchStart={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onClick={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTap={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onDblClick={(e: any) => {
        e.cancelBubble = true;
        if (canPan) onTogglePhotoAdjust?.();
      }}
      onDblTap={(e: any) => {
        e.cancelBubble = true;
        if (canPan) onTogglePhotoAdjust?.();
      }}
      onMouseEnter={() => { if (moveFrame) setStageCursor('move'); }}
      onMouseLeave={() => setStageCursor('default')}
      draggable={moveFrame}
      dragDistance={3}
      dragBoundFunc={(pos: any) => {
        const b = dragBoundWithGuides(pos, el.w, el.h, canvasH);
        onGuides?.({ v: b.guideV, h: b.guideH });
        return { x: b.x, y: b.y };
      }}
      onDragStart={() => {
        setStageCursor('move');
        onGestureStart?.();
        onDragActive?.(true, { keepTransformer: true });
      }}
      onDragEnd={(e: any) => {
        const b = dragBoundWithGuides({ x: e.target.x(), y: e.target.y() }, el.w, el.h, canvasH);
        e.target.position({ x: b.x, y: b.y });
        onChange({ x: b.x, y: b.y });
        onDragActive?.(false);
        onGuides?.(null);
        setStageCursor(moveFrame ? 'move' : 'default');
      }}
      onTransformStart={() => {
        transformStartRef.current = { w: el.w, h: el.h };
        onGestureStart?.();
        onDragActive?.(true, { keepTransformer: true });
      }}
      onTransform={(e: any) => {
        bakeImageFrame(e.target, e.target.scaleX(), e.target.scaleY());
      }}
      onTransformEnd={(e: any) => {
        const n = e.target;
        n.scaleX(1);
        n.scaleY(1);
        const nw = Math.max(20, n.width() || transformStartRef.current.w);
        const nh = Math.max(20, n.height() || transformStartRef.current.h);
        const b = dragBoundBox({ x: n.x(), y: n.y() }, nw, nh, canvasH);
        n.position(b);
        n.width(nw);
        n.height(nh);
        n.clip({ x: 0, y: 0, width: nw, height: nh });
        onChange({ ...b, w: nw, h: nh, rotation: n.rotation() });
        onDragActive?.(false);
        onGuides?.(null);
      }}
    >
      <Rect width={el.w} height={el.h} fill="rgba(0,0,0,0.001)" listening={!panInside} />
      <KonvaImage
        image={img}
        {...(!panning ? { x: -offX, y: -offY } : {})}
        width={iw}
        height={ih}
        perfectDrawEnabled={false}
        listening={panInside}
        draggable={panInside}
        globalCompositeOperation={(el.mixBlendMode as GlobalCompositeOperation | undefined) || undefined}
        dragDistance={2}
        dragBoundFunc={(pos: any) => {
          const { maxOffX: mx, maxOffY: my } = panMaxRef.current;
          return {
            x: Math.min(0, Math.max(-mx, pos.x)),
            y: Math.min(0, Math.max(-my, pos.y)),
          };
        }}
        onMouseEnter={() => { if (panInside) setStageCursor('grab'); }}
        onMouseLeave={() => setStageCursor(moveFrame ? 'move' : 'default')}
        onDragStart={(e: any) => {
          e.cancelBubble = true;
          setPanning(true);
          setStageCursor('grabbing');
          onGestureStart?.();
          onDragActive?.(true, { keepTransformer: true });
        }}
        onDragMove={(e: any) => { e.cancelBubble = true; }}
        onDragEnd={(e: any) => {
          e.cancelBubble = true;
          const { maxOffX: mx, maxOffY: my } = panMaxRef.current;
          const next = imageFrameFocusFromOffset(e.target.x(), e.target.y(), mx, my);
          e.target.position({ x: next.x, y: next.y });
          setLiveFocus({ x: next.cropFocusX, y: next.cropFocusY });
          onChange({
            cropFocusX: next.cropFocusX,
            cropFocusY: next.cropFocusY,
            cropZoom: Math.max(cropZoom, PHOTO_CORNER_ZOOM),
          });
          setPanning(false);
          onDragActive?.(false);
          onGuides?.(null);
          setStageCursor(panInside ? 'grab' : 'default');
        }}
        onMouseDown={(e: any) => { e.cancelBubble = true; onSelect(); }}
        onTouchStart={(e: any) => { e.cancelBubble = true; onSelect(); }}
        onClick={(e: any) => { e.cancelBubble = true; onSelect(); }}
        onTap={(e: any) => { e.cancelBubble = true; onSelect(); }}
        onDblClick={(e: any) => {
          e.cancelBubble = true;
          if (canPan) onTogglePhotoAdjust?.();
        }}
        onDblTap={(e: any) => {
          e.cancelBubble = true;
          if (canPan) onTogglePhotoAdjust?.();
        }}
      />
      {/* Stroke inside the group so it tracks during drag/resize */}
      {isSelected && (
        <Rect
          width={el.w}
          height={el.h}
          stroke={adjustingVisual ? '#0D9488' : '#2563EB'}
          strokeWidth={2.5}
          listening={false}
          cornerRadius={2}
          dash={adjustingVisual ? [8, 5] : undefined}
        />
      )}
    </Group>
  );
}

function KTxtEl({el,onSelect,onChange,onStartEdit,onGestureStart,onDragActive,onGuides,isEditing,isSelected,shapeRefs,canvasH,fontEpoch}: {
  el: EditorElement; onSelect:()=>void; onChange:(c:Partial<EditorElement>)=>void;
  onStartEdit:()=>void; onGestureStart?:()=>void;
  onDragActive?:(active:boolean, opts?: { keepTransformer?: boolean })=>void;
  onGuides?:(g:GuideState)=>void;
  isEditing:boolean; isSelected:boolean;
  shapeRefs:React.MutableRefObject<Record<string,any>>; canvasH:number;
  /** Bumps when webfonts finish loading so Konva remounts text with the real face. */
  fontEpoch?: number;
}) {
  const family = normalizeFontFamily(el.fontFamily);
  const style = canvasFontStyle(el.fontFamily, el.fontStyle);
  const minH = Math.max(24, (el.fontSize || 20) * (el.lineHeight ?? 1.2) + 12);
  // Snapshot size at transform start — Konva scale is always relative to that.
  const transformStartRef = useRef({ w: el.w, h: el.h });

  const bakeTextFrame = (n: any, sx: number, sy: number) => {
    const nw = Math.max(40, transformStartRef.current.w * sx);
    const nh = Math.max(minH, transformStartRef.current.h * sy);
    n.scaleX(1);
    n.scaleY(1);
    n.width(nw);
    n.height(nh);
    n.getChildren().forEach((c: any) => {
      if (typeof c.width === 'function') {
        c.width(nw);
        c.height(nh);
      }
    });
    return { nw, nh };
  };

  // Group + invisible hit rect: whole box is clickable (not just glyph pixels).
  // Live-bake width/height during transform so the typeface never scales/jumps.
  return (
    <Group
      ref={(n: any) => { if (n) shapeRefs.current[el.id] = n; }}
      x={el.x}
      y={el.y}
      width={el.w}
      height={el.h}
      rotation={el.rotation}
      draggable={isSelected && !isEditing}
      dragDistance={3}
      onMouseDown={(e: any) => { e.cancelBubble = true; if (!isEditing) onSelect(); }}
      onTouchStart={(e: any) => { e.cancelBubble = true; if (!isEditing) onSelect(); }}
      onClick={(e: any) => { e.cancelBubble = true; if (!isEditing) onSelect(); }}
      onTap={(e: any) => { e.cancelBubble = true; if (!isEditing) onSelect(); }}
      onDblClick={(e: any) => { e.cancelBubble = true; onStartEdit(); }}
      onDblTap={(e: any) => { e.cancelBubble = true; onStartEdit(); }}
      dragBoundFunc={(pos: any) => {
        const b = dragBoundWithGuides(pos, el.w, el.h, canvasH);
        onGuides?.({ v: b.guideV, h: b.guideH });
        return { x: b.x, y: b.y };
      }}
      onDragStart={() => { onGestureStart?.(); onDragActive?.(true, { keepTransformer: true }); }}
      onDragEnd={(e: any) => {
        const b = dragBoundWithGuides({ x: e.target.x(), y: e.target.y() }, el.w, el.h, canvasH);
        e.target.position({ x: b.x, y: b.y });
        onChange({ x: b.x, y: b.y });
        onDragActive?.(false);
        onGuides?.(null);
      }}
      onTransformStart={() => {
        transformStartRef.current = { w: el.w, h: el.h };
        onGestureStart?.();
        onDragActive?.(true, { keepTransformer: true });
      }}
      onTransform={(e: any) => {
        bakeTextFrame(e.target, e.target.scaleX(), e.target.scaleY());
      }}
      onTransformEnd={(e: any) => {
        const n = e.target;
        // Size was already baked in onTransform; don't multiply by scale again.
        n.scaleX(1);
        n.scaleY(1);
        const nw = Math.max(40, n.width() || transformStartRef.current.w);
        const nh = Math.max(minH, n.height() || transformStartRef.current.h);
        n.width(nw);
        n.height(nh);
        n.getChildren().forEach((c: any) => {
          if (typeof c.width === 'function') {
            c.width(nw);
            c.height(nh);
          }
        });
        const b = dragBoundBox({ x: n.x(), y: n.y() }, nw, nh, canvasH);
        n.position(b);
        onChange({ ...b, w: nw, h: nh, rotation: n.rotation() });
        onDragActive?.(false);
        onGuides?.(null);
      }}
    >
      <Rect width={el.w} height={el.h} fill="rgba(0,0,0,0.001)" />
      <KonvaText
        key={`txt-${el.id}-f${fontEpoch ?? 0}`}
        text={el.text || 'Double-tap to edit'}
        x={0}
        y={0}
        width={el.w}
        height={el.h}
        fontSize={el.fontSize || 20}
        fontFamily={family}
        fill={el.fill || '#1a1a1a'}
        align={el.align || 'center'}
        verticalAlign="top"
        fontStyle={style}
        lineHeight={el.lineHeight ?? 1.2}
        letterSpacing={el.letterSpacing ?? 0}
        padding={6}
        opacity={isEditing ? 0 : (el.opacity ?? 1)}
        wrap="word"
        ellipsis={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
        listening={false}
      />
    </Group>
  );
}

function KPlaceholderEl({el,isSelected,onSelect,onOpenPhotos,shapeRefs}: {
  el: EditorElement; isSelected:boolean; onSelect:()=>void; onOpenPhotos?:()=>void;
  shapeRefs:React.MutableRefObject<Record<string,any>>;
}) {
  const handleTap=(e?: any)=>{ if (e) e.cancelBubble = true; onSelect(); onOpenPhotos?.(); };
  return <>
    <Rect ref={(n:any)=>{if(n) shapeRefs.current[el.id]=n;}}
      x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation}
      fill={isSelected?'#E8E0D5':'#EDE8E0'} stroke={isSelected?'#8B7355':'#C8BDA8'}
      strokeWidth={isSelected?2:1.5} dash={[10,6]} cornerRadius={3}
      onMouseDown={(e:any)=>{ e.cancelBubble=true; onSelect(); }}
      onTouchStart={(e:any)=>{ e.cancelBubble=true; onSelect(); }}
      onClick={handleTap} onTap={handleTap}/>
    <KonvaText x={el.x} y={el.y+el.h/2-16} width={el.w}
      text="📷  tap to place photo" fontSize={12} fill="#A09080" align="center" listening={false}/>
  </>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Canvas
// ─────────────────────────────────────────────────────────────────────────────

function PageCanvas({page,elements,selectedId,onSelectId,onChangeEl,onOpenPhotos,onDelete,onGestureStart,onElementDragActive,onPageSwipe,editRequestId,onEditRequestHandled,isActive,pageW,pageH,canvasH,shapeRefs,side,isMobile}: {
  page:PageDef; elements:EditorElement[]; selectedId:string|null;
  onSelectId:(id:string|null)=>void; onChangeEl:(id:string,c:Partial<EditorElement>)=>void;
  onOpenPhotos?:()=>void; onDelete?:()=>void; onGestureStart?:()=>void;
  onElementDragActive?:(active:boolean)=>void;
  onPageSwipe?:(dir:1|-1)=>void;
  editRequestId?:string|null; onEditRequestHandled?:()=>void;
  isActive:boolean; pageW:number; pageH:number; canvasH:number;
  shapeRefs:React.MutableRefObject<Record<string,any>>; side:'left'|'right'|'solo'; isMobile?:boolean;
}) {
  const trRef = useRef<any>(null);
  const stageRef = useRef<any>(null);
  const scX = pageW/DESIGN_W, scY = pageH/canvasH;
  const {lang: chipLang} = useLanguage();

  const [editId,setEditId]=useState<string|null>(null);
  const [editText,setEditText]=useState('');
  // Image dual-mode: null = move/resize frame; id = pan photo inside that frame.
  const [photoAdjustId,setPhotoAdjustId]=useState<string|null>(null);
  const [imgCanPan,setImgCanPan]=useState<Record<string,boolean>>({});
  const reportImgCanPan=useCallback((id:string, can:boolean)=>{
    setImgCanPan(prev => prev[id] === can ? prev : { ...prev, [id]: can });
  },[]);
  // Konva paints with fallback faces until webfonts are ready — remount text when loaded.
  const fontsReady = useEditorFontsReady();
  const fontEpoch = fontsReady ? 1 : 0;
  const guidesRef=useRef<GuideState>(null);
  const guideVRef=useRef<any>(null);
  const guideHRef=useRef<any>(null);
  // Imperative guides — never setState mid-drag (that re-renders Konva from stale
  // React x/y and causes the scratched/ghosted text while moving).
  const reportGuides=useCallback((g:GuideState)=>{
    const prev=guidesRef.current;
    if ((!prev && !g) || (prev && g && prev.v===g.v && prev.h===g.h)) return;
    guidesRef.current=g;
    if (guideVRef.current) guideVRef.current.visible(!!g?.v);
    if (guideHRef.current) guideHRef.current.visible(!!g?.h);
    (guideVRef.current || guideHRef.current)?.getLayer()?.batchDraw();
  },[]);
  const textareaRef=useRef<HTMLTextAreaElement>(null);
  const deleteBtnRef=useRef<HTMLDivElement>(null);
  const draggingRef=useRef(false);
  const onPageSwipeRef=useRef(onPageSwipe);
  onPageSwipeRef.current=onPageSwipe;
  // The box never shrinks below whatever height it started editing at
  // (the template's design height), but grows to fit longer text.
  const editMinHRef=useRef(0);

  // Hide delete chip without detaching the Transformer mid-gesture — detaching
  // during drag was aborting transforms and leaving a scratched preview.
  const setDragActive=useCallback((active:boolean, _opts?: { keepTransformer?: boolean })=>{
    draggingRef.current=active;
    onElementDragActive?.(active);
    if (deleteBtnRef.current) deleteBtnRef.current.style.visibility=active?'hidden':'visible';
    if (!active) {
      guidesRef.current=null;
      if (guideVRef.current) guideVRef.current.visible(false);
      if (guideHRef.current) guideHRef.current.visible(false);
      (guideVRef.current || guideHRef.current)?.getLayer()?.batchDraw();
    }
  },[onElementDragActive]);

  const startEdit=useCallback((el:EditorElement)=>{
    // Persist a Konva/toolbar-safe font stack so canvas + HTML editor match
    // (legacy designs used long stacks + italic on script fonts → visible jump).
    const family = normalizeFontFamily(el.fontFamily);
    const style = canvasFontStyle(el.fontFamily, el.fontStyle);
    const patch: Partial<EditorElement> = {};
    if (family !== el.fontFamily) patch.fontFamily = family;
    if (style !== (el.fontStyle || 'normal')) patch.fontStyle = style;
    if (Object.keys(patch).length) onChangeEl(el.id, patch);
    setEditId(el.id); setEditText(el.text||''); editMinHRef.current=el.h; onSelectId(el.id);
  },[onSelectId,onChangeEl]);

  const commitEdit=useCallback(()=>{
    setEditId(prev=>{
      if(prev) onChangeEl(prev,{text:editText});
      return null;
    });
  },[editText,onChangeEl]);

  useEffect(()=>{ if(editId) setTimeout(()=>textareaRef.current?.focus(),30); },[editId]);

  // Leaving an image clears photo-adjust mode.
  useEffect(()=>{
    if (photoAdjustId && photoAdjustId !== selectedId) setPhotoAdjustId(null);
  },[selectedId,photoAdjustId]);

  // Esc exits Adjust → back to Move (frame stays selected).
  useEffect(()=>{
    if (!photoAdjustId || !isActive) return;
    const onKey=(e:KeyboardEvent)=>{
      if (e.key === 'Escape') {
        e.preventDefault();
        setPhotoAdjustId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  },[photoAdjustId,isActive]);

  // Newly added text opens the editor immediately (desktop + mobile).
  useEffect(()=>{
    if(!editRequestId||!isActive) return;
    const el=elements.find(e=>e.id===editRequestId&&e.type==='text');
    if(!el) return;
    startEdit(el);
    onEditRequestHandled?.();
  },[editRequestId,elements,isActive,startEdit,onEditRequestHandled]);

  // Page swipe on Konva's own container — attaches after the stage paints.
  useEffect(()=>{
    if(!isMobile||!onPageSwipe) return;
    let cancelled=false;
    let el:HTMLElement|null=null;
    let start:{x:number;y:number;t:number}|null=null;

    const onStart=(e:TouchEvent)=>{
      // Don't steal swipes while editing text, dragging, or panning a photo inside a frame.
      if(e.touches.length!==1||draggingRef.current||editId||photoAdjustId){ start=null; return; }
      start={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()};
    };
    const onEnd=(e:TouchEvent)=>{
      if(!start||draggingRef.current||photoAdjustId){ start=null; return; }
      const dx=e.changedTouches[0].clientX-start.x;
      const dy=e.changedTouches[0].clientY-start.y;
      const dt=Math.max(1,Date.now()-start.t);
      start=null;
      if(Math.abs(dx)<=Math.abs(dy)) return;
      const vel=Math.abs(dx)/dt;
      if(Math.abs(dx)<24 && vel<0.2) return;
      onPageSwipeRef.current?.(dx<0 ? 1 : -1);
    };
    const onCancel=()=>{ start=null; };

    const attach=()=>{
      if(cancelled) return;
      const stage=stageRef.current;
      el=(stage?.container?.() as HTMLElement|undefined)??null;
      if(!el){ requestAnimationFrame(attach); return; }
      el.style.touchAction='pan-y';
      el.addEventListener('touchstart',onStart,{passive:true});
      el.addEventListener('touchend',onEnd,{passive:true});
      el.addEventListener('touchcancel',onCancel,{passive:true});
    };
    attach();
    return ()=>{
      cancelled=true;
      if(!el) return;
      el.removeEventListener('touchstart',onStart);
      el.removeEventListener('touchend',onEnd);
      el.removeEventListener('touchcancel',onCancel);
    };
  },[isMobile,onPageSwipe,editId,photoAdjustId,pageW,pageH]);

  useEffect(()=>{
    if (!fontsReady || !stageRef.current) return;
    stageRef.current.getLayers?.().forEach((layer: any) => layer.batchDraw?.());
  }, [fontsReady]);

  useEffect(()=>{
    if (!trRef.current) return;
    const sel = selectedId ? elements.find(e => e.id === selectedId) : null;
    // Backgrounds use their own dock panel — never attach the Transformer.
    // While Adjust-photo is active, detach too: Transformer would still move the
    // frame even though Group.draggable is false (classic builder crop mode).
    const adjusting = !!(photoAdjustId && photoAdjustId === selectedId);
    const node = (isActive && selectedId && selectedId !== editId && sel && sel.type !== 'background' && !adjusting)
      ? shapeRefs.current[selectedId]
      : null;
    trRef.current.nodes(node ? [node] : []);
    trRef.current.getLayer()?.batchDraw();
  },[isActive,selectedId,editId,shapeRefs,elements,photoAdjustId,imgCanPan]);

  const editEl=editId?elements.find(e=>e.id===editId):null;

  const toolbarEl=editEl?elements.find(e=>e.id===editId):null;
  const toolbarStyle=canvasFontStyle(toolbarEl?.fontFamily, toolbarEl?.fontStyle);
  const isBold=toolbarStyle.includes('bold');
  const isItalic=toolbarStyle.includes('italic');
  // Smart panel placement: below the text if room, otherwise above
  const PANEL_W=366; const PANEL_H=90;
  const elBottom=toolbarEl?(toolbarEl.y+toolbarEl.h)*scY:0;
  const elTop=toolbarEl?toolbarEl.y*scY:0;
  const panelShowBelow=toolbarEl&&(elBottom+PANEL_H+10<=pageH);
  const panelTop=toolbarEl?(panelShowBelow?elBottom+8:Math.max(4,elTop-PANEL_H-8)):0;
  const panelLeft=toolbarEl?Math.max(4,Math.min(toolbarEl.x*scX,pageW-PANEL_W-4)):4;
  const coverInteractive = page.role === 'front_cover' || page.role === 'back_cover';

  return (
    <div style={{position:'relative',width:pageW,height:pageH,flexShrink:0}}>
      <Stage ref={stageRef} width={pageW} height={pageH} scaleX={scX} scaleY={scY}
        pixelRatio={isMobile ? Math.min(window.devicePixelRatio ?? 1, 1.5) : window.devicePixelRatio ?? 1}
        onMouseDown={(e:any)=>{if(e.target===e.target.getStage()){if(editId)commitEdit();onSelectId(null);}}}
        onTouchStart={(e:any)=>{if(e.target===e.target.getStage()){if(editId)commitEdit();onSelectId(null);}}}>
        <Layer>
          <Rect x={0} y={0} width={DESIGN_W} height={canvasH} fill={PAPER_COLOR} listening={false}/>
          {elements.map(el => {
            if (el.type === 'background') {
              return (
                <KBgEl key={el.id} el={el} canvasH={canvasH}
                  interactive={coverInteractive}
                  isSelected={selectedId === el.id}
                  onChange={coverInteractive ? (c => onChangeEl(el.id, c)) : undefined}
                  onGestureStart={onGestureStart}
                />
              );
            }
            if (el.type === 'shape') {
              return (
                <KShapeEl key={el.id} el={el} isSelected={selectedId===el.id}
                  onSelect={()=>{if(editId)commitEdit();onSelectId(el.id);}}
                  onChange={c=>onChangeEl(el.id,c)} onGestureStart={onGestureStart} onDragActive={setDragActive}
                  onGuides={reportGuides}
                  shapeRefs={shapeRefs} canvasH={canvasH}/>
              );
            }
            if (el.type === 'placeholder') {
              return (
                <KPlaceholderEl key={el.id} el={el} isSelected={selectedId===el.id}
                  onSelect={()=>{if(editId)commitEdit();onSelectId(el.id);}} onOpenPhotos={onOpenPhotos} shapeRefs={shapeRefs}/>
              );
            }
            if (el.type === 'image') {
              return (
                <KImgEl key={el.id} el={el} isSelected={selectedId===el.id}
                  onSelect={()=>{if(editId)commitEdit();onSelectId(el.id);}}
                  onChange={c=>onChangeEl(el.id,c)} onGestureStart={onGestureStart} onDragActive={setDragActive}
                  onGuides={reportGuides}
                  shapeRefs={shapeRefs} canvasH={canvasH}
                  photoAdjust={photoAdjustId===el.id}
                  onTogglePhotoAdjust={()=>{
                    if (el.objectFit === 'contain') return;
                    const entering = photoAdjustId !== el.id;
                    if (entering && (el.cropZoom ?? 1) < PHOTO_CORNER_ZOOM) {
                      onChangeEl(el.id, { cropZoom: PHOTO_CORNER_ZOOM });
                    }
                    setPhotoAdjustId(cur => cur===el.id ? null : el.id);
                    onSelectId(el.id);
                  }}
                  onExitPhotoAdjust={()=>setPhotoAdjustId(cur => cur===el.id ? null : cur)}
                  onCanPanChange={(can)=>reportImgCanPan(el.id, can)}
                />
              );
            }
            if (el.type === 'text') {
              return (
                <KTxtEl key={el.id} el={el} isEditing={editId===el.id}
                  isSelected={selectedId===el.id}
                  onSelect={()=>{if(editId&&editId!==el.id)commitEdit();onSelectId(el.id);}}
                  onChange={c=>onChangeEl(el.id,c)} onGestureStart={onGestureStart} onDragActive={setDragActive}
                  onGuides={reportGuides}
                  onStartEdit={()=>startEdit(el)} shapeRefs={shapeRefs} canvasH={canvasH}
                  fontEpoch={fontEpoch}
                />
              );
            }
            return null;
          })}
          {page.pageNumber!==undefined && (
            <KonvaText x={0} y={canvasH-26} width={DESIGN_W} text={String(page.pageNumber)}
              align="center" fontSize={9} fill="#C0B8B0" fontFamily="Georgia, serif" listening={false}/>
          )}
          {/* Center alignment guides while dragging (visibility toggled imperatively) */}
          <Line ref={guideVRef} points={[DESIGN_W/2, 0, DESIGN_W/2, canvasH]} stroke="#C09A55" strokeWidth={1}
            dash={[6,5]} listening={false} opacity={0.9} visible={false}/>
          <Line ref={guideHRef} points={[0, canvasH/2, DESIGN_W, canvasH/2]} stroke="#C09A55" strokeWidth={1}
            dash={[6,5]} listening={false} opacity={0.9} visible={false}/>
          <Transformer ref={trRef} rotateEnabled resizeEnabled
            rotationSnaps={[0,45,90,135,180,225,270,315]}
            enabledAnchors={
              (selectedId && elements.find(e => e.id === selectedId)?.type === 'text')
                // Text: width/height box only — corners scale the typeface and jump the box.
                ? ['middle-left', 'middle-right', 'top-center', 'bottom-center']
                : ['top-left','top-center','top-right','middle-left','middle-right','bottom-left','bottom-center','bottom-right']
            }
            boundBoxFunc={(old:any,nw:any)=>{
              const isText = selectedId && elements.find(e => e.id === selectedId)?.type === 'text';
              const minW = isText ? 40 : 10;
              const minH = isText ? 24 : 10;
              return (nw.width < minW || nw.height < minH) ? old : nw;
            }}
            padding={4}
            borderStroke="#2563EB" borderStrokeWidth={2.5} borderDash={undefined}
            anchorFill="#FFFFFF" anchorStroke="#2563EB" anchorStrokeWidth={2.5}
            anchorSize={14} anchorCornerRadius={7}
            rotateAnchorOffset={28} rotationSnapTolerance={6}
            ignoreStroke
            anchorStyleFunc={(anchor:any)=>{
              // Soft drop-shadow so handles read clearly on any page background.
              anchor.shadowColor('rgba(15,23,42,0.35)'); anchor.shadowBlur(4);
              anchor.shadowOffsetY(1); anchor.shadowOpacity(1);
              if (anchor.hasName('rotater')) {
                anchor.fill('#2563EB'); anchor.stroke('#FFFFFF'); anchor.strokeWidth(2);
                anchor.width(18); anchor.height(18); anchor.cornerRadius(9); anchor.offsetX(9); anchor.offsetY(9);
              }
            }}/>
        </Layer>
      </Stage>

      {/* ── Inline text editor ── */}
      {editEl && editId && (
        /* Composite container — onBlur only fires when focus truly leaves */
        <div
          onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setTimeout(commitEdit,10);}}
          style={{position:'absolute',inset:0,zIndex:28,pointerEvents:'none'}}
        >
          {/* Nearly-transparent textarea — design shows through */}
          <textarea ref={textareaRef} value={editText}
            onChange={e=>{
              setEditText(e.target.value);
              const ta=e.target; ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px';
              // Grow (or shrink back toward the template size) the actual
              // design element to fit the content — otherwise text typed
              // past the original box height overflows invisibly once you
              // commit, instead of the box expanding to show it.
              const newH=Math.max(editMinHRef.current,ta.scrollHeight/scY);
              if (Math.abs(newH-editEl!.h)>0.5) onChangeEl(editId!,{h:newH});
              // The box can grow past the visible canvas area — scroll it
              // into view so newly typed lines don't disappear below the fold.
              ta.scrollIntoView({block:'nearest'});
            }}
            onKeyDown={e=>{
              if(e.key==='Escape'){e.preventDefault();setEditId(null);}
              if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();commitEdit();}
            }}
            style={{
              position:'absolute', pointerEvents:'all',
              left:editEl.x*scX, top:editEl.y*scY,
              width:editEl.w*scX, minHeight:Math.max(editEl.h*scY,32),
              fontSize:(editEl.fontSize||20)*scX,
              fontFamily:normalizeFontFamily(editEl.fontFamily),
              fontStyle:canvasFontStyle(editEl.fontFamily, editEl.fontStyle).includes('italic')?'italic':'normal',
              fontWeight:canvasFontStyle(editEl.fontFamily, editEl.fontStyle).includes('bold')?'bold':'normal',
              color:editEl.fill||'#1a1a1a',
              textAlign:(editEl.align||'center') as any,
              lineHeight:editEl.lineHeight??1.2,
              letterSpacing:`${editEl.letterSpacing??0}px`,
              background:'rgba(255,255,255,0.06)',
              border:'2px solid rgba(59,130,246,0.88)',
              borderRadius:4, padding:Math.round(6*scX),
              resize:'none', outline:'none',
              boxSizing:'border-box', overflow:'hidden',
            }}
          />

          {/* ── Floating formatting panel ── */}
          <div style={{
            position:'absolute', pointerEvents:'all',
            left:panelLeft, top:panelTop, width:PANEL_W,
            background:'#ffffff',
            borderRadius:14, border:'1px solid rgba(0,0,0,0.09)',
            boxShadow:'0 16px 48px rgba(0,0,0,0.16),0 2px 8px rgba(0,0,0,0.07)',
            padding:'9px 11px', display:'flex', flexDirection:'column', gap:7,
          }}>
            {/* Row 1 — Font · B/I · Align · Size */}
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              {/* Font family */}
              <select
                value={normalizeFontFamily(toolbarEl?.fontFamily)}
                onChange={e=>{onChangeEl(editId,{fontFamily:e.target.value});setTimeout(()=>textareaRef.current?.focus(),20);}}
                style={{flex:1,minWidth:0,fontSize:11,fontFamily:normalizeFontFamily(toolbarEl?.fontFamily),
                  border:'1px solid #e8e8e8',borderRadius:7,padding:'4px 7px',
                  background:'#fafafa',cursor:'pointer',outline:'none',color:'#1a1a1a'}}
              >
                {FONTS.map(f=><option key={f.value} value={f.value} style={{fontFamily:f.value}}>{f.label}</option>)}
              </select>
              <span style={{width:1,height:20,background:'#e8e8e8',flexShrink:0}}/>
              {/* Bold */}
              <button onMouseDown={e=>{e.preventDefault();
                const fam=normalizeFontFamily(toolbarEl?.fontFamily);
                const script=/great vibes|dancing script|pacifico/i.test(fam);
                const nextItalic=script?false:isItalic;
                const fs=[(!isBold?'bold':''),(nextItalic?'italic':'')].filter(Boolean).join(' ')||'normal';
                onChangeEl(editId,{fontStyle:fs});}}
                style={{width:28,height:28,borderRadius:7,border:'none',cursor:'pointer',fontWeight:'bold',
                  fontSize:13,flexShrink:0,transition:'all 0.12s',
                  background:isBold?'#1a1a1a':'#f0f0f0',color:isBold?'#fff':'#555'}}>B</button>
              {/* Italic — disabled for script fonts (no italic cut; Konva falls back) */}
              <button onMouseDown={e=>{e.preventDefault();
                const fam=normalizeFontFamily(toolbarEl?.fontFamily);
                if(/great vibes|dancing script|pacifico/i.test(fam)) return;
                const fs=[(isBold?'bold':''),(!isItalic?'italic':'')].filter(Boolean).join(' ')||'normal';
                onChangeEl(editId,{fontStyle:fs});}}
                style={{width:28,height:28,borderRadius:7,border:'none',
                  cursor:/great vibes|dancing script|pacifico/i.test(normalizeFontFamily(toolbarEl?.fontFamily))?'default':'pointer',
                  fontStyle:'italic', fontSize:14,flexShrink:0,transition:'all 0.12s',
                  background:isItalic?'#1a1a1a':'#f0f0f0',color:isItalic?'#fff':'#666',
                  opacity:/great vibes|dancing script|pacifico/i.test(normalizeFontFamily(toolbarEl?.fontFamily))?0.4:1}}>I</button>
              <span style={{width:1,height:20,background:'#e8e8e8',flexShrink:0}}/>
              {/* Alignment — L / C / R */}
              {(['left','center','right'] as const).map(al=>(
                <button key={al} onMouseDown={e=>{e.preventDefault();onChangeEl(editId,{align:al});}}
                  title={al} style={{width:28,height:28,borderRadius:7,border:'none',cursor:'pointer',
                    flexShrink:0,transition:'all 0.12s',display:'flex',alignItems:'center',justifyContent:'center',
                    background:(toolbarEl?.align||'center')===al?'#1a1a1a':'#f0f0f0',
                    color:(toolbarEl?.align||'center')===al?'#fff':'#777'}}>
                  <svg width="13" height="11" viewBox="0 0 13 11" fill="currentColor">
                    {al==='left'  && <><rect x="0" y="0" width="13" height="2" rx="1"/><rect x="0" y="4.5" width="9" height="2" rx="1"/><rect x="0" y="9" width="11" height="2" rx="1"/></>}
                    {al==='center'&& <><rect x="0" y="0" width="13" height="2" rx="1"/><rect x="2" y="4.5" width="9" height="2" rx="1"/><rect x="1" y="9" width="11" height="2" rx="1"/></>}
                    {al==='right' && <><rect x="0" y="0" width="13" height="2" rx="1"/><rect x="4" y="4.5" width="9" height="2" rx="1"/><rect x="2" y="9" width="11" height="2" rx="1"/></>}
                  </svg>
                </button>
              ))}
              <span style={{width:1,height:20,background:'#e8e8e8',flexShrink:0}}/>
              {/* Font size */}
              <button onMouseDown={e=>{e.preventDefault();onChangeEl(editId,{fontSize:Math.max(6,(toolbarEl?.fontSize||20)-1)});}}
                style={{width:24,height:24,borderRadius:6,border:'1px solid #e8e8e8',background:'#fafafa',
                  cursor:'pointer',fontSize:15,color:'#555',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>−</button>
              <input type="number" min={6} max={200} step={1} value={toolbarEl?.fontSize||20}
                onChange={e=>{const v=parseInt(e.target.value);if(!isNaN(v)&&v>=6&&v<=200)onChangeEl(editId,{fontSize:v});}}
                onBlur={()=>setTimeout(()=>textareaRef.current?.focus(),15)}
                style={{width:40,textAlign:'center',fontSize:11,border:'1px solid #e8e8e8',borderRadius:6,
                  padding:'3px 0',outline:'none',background:'#fafafa',flexShrink:0}}/>
              <button onMouseDown={e=>{e.preventDefault();onChangeEl(editId,{fontSize:Math.min(200,(toolbarEl?.fontSize||20)+1)});}}
                style={{width:24,height:24,borderRadius:6,border:'1px solid #e8e8e8',background:'#fafafa',
                  cursor:'pointer',fontSize:15,color:'#555',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>
            </div>

            {/* Row 2 — Colors · Line height · Opacity · Done */}
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              {/* Preset swatches */}
              {TEXT_COLORS.map(c=>(
                <button key={c} onMouseDown={e=>{e.preventDefault();onChangeEl(editId,{fill:c});}}
                  title={c} style={{
                    width:18,height:18,borderRadius:'50%',cursor:'pointer',flexShrink:0,
                    background:c,boxSizing:'border-box',
                    border:(toolbarEl?.fill||'#1a1a1a')===c?'2.5px solid #3B82F6':c==='#FFFFFF'?'1.5px solid #ddd':'1.5px solid transparent',
                  }}/>
              ))}
              {/* Rainbow custom-color trigger */}
              <div style={{position:'relative',width:18,height:18,flexShrink:0}}>
                <div style={{position:'absolute',inset:0,borderRadius:'50%',
                  background:'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
                  border:'1.5px solid #ddd',pointerEvents:'none'}}/>
                <input type="color" key={`col-${editId}-${toolbarEl?.fill}`}
                  defaultValue={toolbarEl?.fill||'#1a1a1a'}
                  onChange={e=>onChangeEl(editId,{fill:e.target.value})}
                  onBlur={()=>setTimeout(()=>textareaRef.current?.focus(),15)}
                  style={{opacity:0,position:'absolute',inset:0,width:'100%',height:'100%',cursor:'pointer',padding:0,border:'none'}}/>
              </div>
              <span style={{width:1,height:18,background:'#e8e8e8',flexShrink:0}}/>
              {/* Line height */}
              <span style={{fontSize:9,color:'#999',flexShrink:0}}>↕</span>
              <button onMouseDown={e=>{e.preventDefault();onChangeEl(editId,{lineHeight:Math.max(0.8,parseFloat(((toolbarEl?.lineHeight??1.2)-0.1).toFixed(1)))});}}
                style={{width:20,height:20,borderRadius:5,border:'1px solid #e8e8e8',background:'#fafafa',cursor:'pointer',fontSize:12,color:'#555',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>−</button>
              <span style={{fontSize:10,color:'#444',minWidth:22,textAlign:'center',flexShrink:0}}>{(toolbarEl?.lineHeight??1.2).toFixed(1)}</span>
              <button onMouseDown={e=>{e.preventDefault();onChangeEl(editId,{lineHeight:Math.min(3.0,parseFloat(((toolbarEl?.lineHeight??1.2)+0.1).toFixed(1)))});}}
                style={{width:20,height:20,borderRadius:5,border:'1px solid #e8e8e8',background:'#fafafa',cursor:'pointer',fontSize:12,color:'#555',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>
              <span style={{width:1,height:18,background:'#e8e8e8',flexShrink:0}}/>
              {/* Opacity */}
              <span style={{fontSize:9,color:'#999',whiteSpace:'nowrap',flexShrink:0}}>{Math.round((toolbarEl?.opacity??1)*100)}%</span>
              <input type="range" min={10} max={100} step={5}
                value={Math.round((toolbarEl?.opacity??1)*100)}
                onChange={e=>onChangeEl(editId,{opacity:parseInt(e.target.value)/100})}
                onBlur={()=>setTimeout(()=>textareaRef.current?.focus(),15)}
                style={{width:52,accentColor:'#1a1a1a',flexShrink:0}}/>
              <span style={{flex:1}}/>
              {/* Done */}
              <button onMouseDown={e=>{e.preventDefault();commitEdit();}}
                style={{height:28,padding:'0 14px',borderRadius:8,background:'#1a1a1a',color:'#fff',
                  border:'none',cursor:'pointer',fontSize:11,fontWeight:700,flexShrink:0,letterSpacing:'0.01em'}}>
                Done ↵
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image / text chrome — delete + Move / Adjust-photo modes ── */}
      {isActive && selectedId && !editId && (()=>{
        const sel=elements.find(e=>e.id===selectedId&&(e.type==='image'||e.type==='text'||e.type==='placeholder'));
        if (!sel) return null;
        const bx=Math.min(Math.max((sel.x+sel.w)*scX, 28), pageW-4);
        const by=Math.max(sel.y*scY-14, 4);
        const isImg = sel.type === 'image' && !!sel.src;
        const adjusting = photoAdjustId === sel.id;
        // Landmark/contain cutouts can't pan; everything else can (cropZoom unlocks corners).
        const adjustDisabled = !isImg || sel.objectFit === 'contain';
        const barLeft = Math.max(4, Math.min(sel.x * scX, pageW - 200));
        const barTop = Math.min(pageH - 40, (sel.y + sel.h) * scY + 8);
        return (
          <div ref={deleteBtnRef} style={{position:'absolute',inset:0,zIndex:45,pointerEvents:'none'}}>
            <div style={{position:'absolute',left:bx-14,top:by-14,pointerEvents:'all',display:'flex',gap:5}}>
              <button
                onMouseDown={e=>{e.stopPropagation();e.preventDefault();onDelete?.();}}
                title={chipLang==='sq'?'Fshi':'Delete'}
                style={{
                  width:28,height:28,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.9)',
                  background:'rgba(220,38,38,0.88)',color:'white',
                  fontSize:13,lineHeight:1,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  boxShadow:'0 2px 10px rgba(0,0,0,0.32)',
                }}
              >✕</button>
            </div>
            {isImg && (
              <div
                style={{
                  position:'absolute', left: barLeft, top: barTop,
                  pointerEvents:'all', display:'flex', gap:4, alignItems:'center',
                  padding:3, borderRadius:999,
                  background:'rgba(255,255,255,0.96)',
                  border:'1px solid rgba(0,0,0,0.08)',
                  boxShadow:'0 4px 16px rgba(0,0,0,0.14)',
                }}
                onMouseDown={e=>e.stopPropagation()}
                onPointerDown={e=>e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={()=>setPhotoAdjustId(null)}
                  title={chipLang==='sq'?'Lëviz kornizën në faqe':'Move the frame on the page'}
                  style={{
                    padding:'5px 10px', borderRadius:999, border:'none', cursor:'pointer',
                    fontSize:11, fontWeight:600,
                    background: !adjusting ? '#1a1a1a' : 'transparent',
                    color: !adjusting ? '#fff' : '#555',
                  }}
                >
                  {chipLang==='sq'?'Lëviz':'Move'}
                </button>
                <button
                  type="button"
                  disabled={adjustDisabled}
                  onClick={()=>{
                    if (adjustDisabled) return;
                    if ((sel.cropZoom ?? 1) < PHOTO_CORNER_ZOOM) {
                      onChangeEl(sel.id, { cropZoom: PHOTO_CORNER_ZOOM });
                    }
                    setPhotoAdjustId(sel.id);
                  }}
                  title={
                    adjustDisabled
                      ? (chipLang==='sq'?'Kjo grafikë nuk rregullohet brenda kornizës':'This graphic can’t be adjusted inside the frame')
                      : (chipLang==='sq'?'Tërhiq foton brenda kornizës (dyklik / Esc)':'Drag photo inside the frame (double-click / Esc)')
                  }
                  style={{
                    padding:'5px 10px', borderRadius:999, border:'none',
                    cursor: adjustDisabled ? 'not-allowed' : 'pointer',
                    fontSize:11, fontWeight:600,
                    opacity: adjustDisabled ? 0.45 : 1,
                    background: adjusting ? '#0D9488' : 'transparent',
                    color: adjusting ? '#fff' : '#555',
                  }}
                >
                  {chipLang==='sq'?'Rregullo foton':'Adjust photo'}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Cover: quick entry to edit background (when nothing else is selected) */}
      {isActive && (page.role === 'front_cover' || page.role === 'back_cover') && (() => {
        const bg = elements.find(e => e.type === 'background');
        if (!bg) return null;
        // Hide whenever anything is selected — the chip sits bottom-left and was
        // stealing taps meant for text, shapes, or transform handles.
        if (selectedId) return null;
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (editId) commitEdit(); onSelectId(bg.id); }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: 10,
              bottom: 10,
              zIndex: 40,
              pointerEvents: 'all',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 999,
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(255,255,255,0.94)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              fontSize: 11,
              fontWeight: 600,
              color: '#333',
              letterSpacing: '0.02em',
            }}
          >
            <span style={{
              width: 14, height: 14, borderRadius: 4, flexShrink: 0,
              background: bg.src
                ? `url(${bg.src}) center/cover`
                : bg.bgGradientFrom
                  ? `linear-gradient(135deg, ${bg.bgGradientFrom}, ${bg.bgGradientTo || '#fff'})`
                  : (bg.bgColor || '#EEE'),
              border: '1px solid rgba(0,0,0,0.12)',
            }} />
            {chipLang === 'sq' ? 'Sfondi' : 'Background'}
          </button>
        );
      })()}

      {isActive && <div style={{position:'absolute',inset:0,pointerEvents:'none',
        outline:'2.5px solid rgba(59,130,246,0.65)',outlineOffset:'-1px'}}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Locked page
// ─────────────────────────────────────────────────────────────────────────────

function LockedPageView({pageW,pageH,role,side}: {pageW:number;pageH:number;role:string;side:'left'|'right'}) {
  const label = role==='locked_left' ? 'Inside Cover'
    : role==='locked_right' ? 'Inside Back Cover'
    : role==='back_cover' ? 'Outside Cover' : 'Back Cover';
  // Unique pattern id so left+right locked pages on the same spread don't collide.
  const patternId = `locked-hatch-${side}-${role}`;
  return (
    <div style={{
      position:'relative', width:pageW, height:pageH, flexShrink:0,
      background:'#FFFFFF', overflow:'hidden',
    }}>
      {/* Soft paper grain */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:PAPER_TEXTURE, backgroundSize:'256px 256px',
        opacity:0.04, mixBlendMode:'multiply' as any,
      }}/>
      {/* Full-area uneditable hatch */}
      <svg style={{position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none'}} aria-hidden>
        <defs>
          <pattern id={patternId} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="14" stroke="rgba(120,120,120,0.14)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`}/>
      </svg>
      {/* Soft veil so the hatch reads as "locked", not dirty paper */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(248,248,248,0.15) 50%, rgba(255,255,255,0.40) 100%)',
      }}/>
      <div style={{
        position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:10, pointerEvents:'none',
      }}>
        <div style={{
          width:44, height:44, borderRadius:'50%',
          background:'rgba(255,255,255,0.92)',
          border:'1px solid rgba(0,0,0,0.08)',
          boxShadow:'0 4px 14px rgba(0,0,0,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Lock size={16} color="#9A9A9A"/>
        </div>
        <p style={{
          fontSize:10, color:'#8A8A8A', textTransform:'uppercase',
          letterSpacing:'0.16em', fontWeight:500, margin:0,
        }}>
          {label}
        </p>
        <p style={{
          fontSize:9, color:'#B0B0B0', letterSpacing:'0.04em', margin:0,
        }}>
          Not editable
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Spread View — realistic book
// ─────────────────────────────────────────────────────────────────────────────

const SpreadView = React.memo(function SpreadView({spread,spreadContent,selectedId,activeSide,onActiveSide,onSelectId,onChangeEl,onOpenPhotos,onDelete,onGestureStart,onElementDragActive,onPageSwipe,editRequestId,onEditRequestHandled,pageW,pageH,canvasH,shapeRefs,isMobile,readOnly}: {
  spread:SpreadDef; spreadContent:Record<number,EditorElement[]>;
  selectedId:string|null; activeSide:'left'|'right'; onActiveSide:(s:'left'|'right')=>void;
  onSelectId:(id:string|null)=>void; onChangeEl:(pid:number,eid:string,c:Partial<EditorElement>)=>void;
  onOpenPhotos?:()=>void; onDelete?:()=>void; onGestureStart?:()=>void;
  onElementDragActive?:(active:boolean)=>void;
  onPageSwipe?:(dir:1|-1)=>void;
  editRequestId?:string|null; onEditRequestHandled?:()=>void;
  pageW:number; pageH:number; canvasH:number;
  shapeRefs:React.MutableRefObject<Record<string,any>>; isMobile?:boolean;
  readOnly?:boolean;
}) {
  const effectiveSpineW = SPINE_W;
  // DOM swipe for locked/empty pages (no Konva stage). Editable pages swipe via PageCanvas.
  const swipeStartRef=useRef<{x:number;y:number;t:number}|null>(null);
  const onDomSwipeStart=(e:React.TouchEvent)=>{
    if(!onPageSwipe) return;
    swipeStartRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()};
  };
  const onDomSwipeEnd=(e:React.TouchEvent)=>{
    if(!onPageSwipe||!swipeStartRef.current) return;
    const dx=e.changedTouches[0].clientX-swipeStartRef.current.x;
    const dy=e.changedTouches[0].clientY-swipeStartRef.current.y;
    const dt=Math.max(1,Date.now()-swipeStartRef.current.t);
    swipeStartRef.current=null;
    if(Math.abs(dx)<=Math.abs(dy)) return;
    const vel=Math.abs(dx)/dt;
    if(Math.abs(dx)<24 && vel<0.2) return;
    onPageSwipe(dx<0 ? 1 : -1);
  };

  const renderSide=(page:PageDef|null,side:'left'|'right')=>{
    if (!page) return <div style={{width:pageW,height:pageH,flexShrink:0,background:'#EAE5DC'}}/>;
    const locked=page.role==='locked_left'||page.role==='locked_right';
    if (locked) return <LockedPageView pageW={pageW} pageH={pageH} role={page.role} side={side}/>;
    return <div style={{cursor:'default'}} onClick={()=>onActiveSide(side)}>
      <PageCanvas page={page} elements={spreadContent[page.dbId]??[]}
        selectedId={readOnly ? null : selectedId}
        onSelectId={readOnly ? ()=>{} : (id)=>{ onActiveSide(side); onSelectId(id); }}
        onChangeEl={readOnly ? ()=>{} : (eid,c)=>onChangeEl(page.dbId,eid,c)}
        onOpenPhotos={readOnly ? undefined : onOpenPhotos}
        onDelete={readOnly ? undefined : onDelete}
        onGestureStart={readOnly ? undefined : onGestureStart}
        onElementDragActive={readOnly ? undefined : onElementDragActive}
        onPageSwipe={onPageSwipe}
        editRequestId={readOnly ? null : editRequestId}
        onEditRequestHandled={onEditRequestHandled}
        isActive={activeSide===side} pageW={pageW} pageH={pageH} canvasH={canvasH} shapeRefs={shapeRefs} side={side} isMobile={isMobile}/>
    </div>;
  };

  if (spread.isSolo) {
    const isBackCover = spread.id === 'back-cover';
    const soloPage = isBackCover ? spread.left! : spread.right!;

    return (
      <div className="flex items-center justify-center">
        <div style={{
          boxShadow: '0 12px 40px rgba(40,32,20,0.12), 0 2px 8px rgba(40,32,20,0.06)',
          outline: '1px solid rgba(0,0,0,0.08)',
          outlineOffset: 0,
        }}>
          <div style={{cursor:'default'}} onClick={()=>onActiveSide(isBackCover ? 'left' : 'right')}>
            <PageCanvas page={soloPage} elements={spreadContent[soloPage.dbId]??[]}
              selectedId={readOnly ? null : selectedId}
              onSelectId={readOnly ? ()=>{} : onSelectId}
              onChangeEl={readOnly ? ()=>{} : (eid,c)=>onChangeEl(soloPage.dbId,eid,c)}
              onOpenPhotos={readOnly ? undefined : onOpenPhotos}
              onDelete={readOnly ? undefined : onDelete}
              onGestureStart={readOnly ? undefined : onGestureStart}
              onElementDragActive={readOnly ? undefined : onElementDragActive}
              onPageSwipe={onPageSwipe}
              editRequestId={readOnly ? null : editRequestId}
              onEditRequestHandled={onEditRequestHandled}
              isActive={true} pageW={pageW} pageH={pageH} canvasH={canvasH} shapeRefs={shapeRefs} side="solo" isMobile={isMobile}/>
          </div>
        </div>
      </div>
    );
  }

  // Mobile: show one page at a time using activeSide as the selector
  if (isMobile) {
    const page = activeSide === 'left' ? spread.left : spread.right;
    if (!page) {
      return (
        <div style={{width:pageW,height:pageH,background:'#EAE5DC',touchAction:'pan-y'}}
          onTouchStart={onDomSwipeStart} onTouchEnd={onDomSwipeEnd}/>
      );
    }
    const locked = page.role === 'locked_left' || page.role === 'locked_right';
    return (
      <div className="flex items-center justify-center"
        {...(locked ? {onTouchStart:onDomSwipeStart,onTouchEnd:onDomSwipeEnd,style:{touchAction:'pan-y' as const}} : {})}>
        <div style={{
          boxShadow: '0 12px 40px rgba(40,32,20,0.12), 0 2px 8px rgba(40,32,20,0.06)',
          outline: '1px solid rgba(0,0,0,0.08)',
          outlineOffset: 0,
        }}>
          {locked
            ? <LockedPageView pageW={pageW} pageH={pageH} role={page.role} side={activeSide}/>
            : <PageCanvas page={page} elements={spreadContent[page.dbId]??[]}
                selectedId={readOnly ? null : selectedId}
                onSelectId={readOnly ? ()=>{} : id=>{ onActiveSide(activeSide); onSelectId(id); }}
                onChangeEl={readOnly ? ()=>{} : (eid,c)=>onChangeEl(page.dbId,eid,c)}
                onOpenPhotos={readOnly ? undefined : onOpenPhotos}
                onDelete={readOnly ? undefined : onDelete}
                onGestureStart={readOnly ? undefined : onGestureStart}
                onElementDragActive={readOnly ? undefined : onElementDragActive}
                onPageSwipe={onPageSwipe}
                editRequestId={readOnly ? null : editRequestId}
                onEditRequestHandled={onEditRequestHandled}
                isActive={true} pageW={pageW} pageH={pageH} canvasH={canvasH} shapeRefs={shapeRefs} side="solo" isMobile={true}/>
          }
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div style={{
        boxShadow: '0 12px 40px rgba(40,32,20,0.12), 0 2px 8px rgba(40,32,20,0.06)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          outline: '1px solid rgba(0,0,0,0.08)',
          outlineOffset: 0,
        }}>
          {renderSide(spread.left,'left')}
          {/* Centre page divider — hairline only */}
          <div style={{width:effectiveSpineW,flexShrink:0,background:'#E8E4DC'}}/>
          {renderSide(spread.right,'right')}
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Mobile page view
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Inline Photo Picker — floating overlay triggered by tapping a placeholder
// ─────────────────────────────────────────────────────────────────────────────
function InlinePhotoPicker({photos,onSelect,onUploadAndPlace,uploading,onClose,lang}: {
  photos: string[];
  onSelect: (url: string) => void;
  onUploadAndPlace: (file: File) => void;
  uploading: boolean;
  onClose: () => void;
  lang: 'sq'|'en';
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.38)',backdropFilter:'blur(3px)'}}/>

      {/* Card */}
      <div style={{
        position:'relative',zIndex:1,
        width:'min(440px, calc(100vw - 28px))',
        maxHeight:'min(540px, calc(100dvh - 130px))',
        background:'#fff',borderRadius:18,
        boxShadow:'0 16px 56px rgba(0,0,0,0.24)',
        display:'flex',flexDirection:'column',overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'14px 16px 12px',borderBottom:'1px solid #F0ECE6',flexShrink:0,
        }}>
          <span style={{fontSize:13,fontWeight:700,color:'#1a1a1a',letterSpacing:'-0.01em'}}>
            {lang==='sq'?'Zgjidh ose ngarko foto':'Choose or upload a photo'}
          </span>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button
              onClick={()=>fileRef.current?.click()}
              disabled={uploading}
              style={{
                padding:'7px 15px',borderRadius:20,border:'none',
                background:uploading?'#C8C0B8':'#1a1a1a',color:'white',
                fontSize:12,fontWeight:600,cursor:uploading?'default':'pointer',
                display:'flex',alignItems:'center',gap:5,transition:'background 0.15s',
              }}
            >
              {uploading
                ? <><Loader2 size={11} className="animate-spin"/>{lang==='sq'?'Duke ngarkuar…':'Uploading…'}</>
                : <span>{lang==='sq'?'+ Ngarko':'+ Upload'}</span>
              }
            </button>
            <button onClick={onClose} style={{
              width:30,height:30,borderRadius:'50%',border:'none',
              background:'#F0EDE8',color:'#666',fontSize:15,lineHeight:1,
              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            }}>✕</button>
          </div>
        </div>

        {/* Photo grid */}
        <div style={{overflowY:'auto',padding:12,flex:1}}>
          {photos.length===0 ? (
            <div style={{textAlign:'center',padding:'44px 20px',color:'#B0A898'}}>
              <div style={{fontSize:34,marginBottom:12}}>📷</div>
              <p style={{fontSize:13,lineHeight:1.6,whiteSpace:'pre-line'}}>
                {lang==='sq'
                  ? 'Nuk ka foto të ngarkuara.\nKliko "+ Ngarko" për të shtuar.'
                  : 'No photos yet.\nClick "+ Upload" to add one.'}
              </p>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {photos.map((url,i)=>(
                <button key={i} onClick={()=>{onSelect(url);onClose();}} style={{
                  aspectRatio:'3/4',border:'2.5px solid transparent',borderRadius:8,
                  overflow:'hidden',cursor:'pointer',padding:0,background:'#F4F0EB',
                  transition:'border-color 0.12s,transform 0.12s',
                }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor='#1a1a1a';(e.currentTarget as HTMLButtonElement).style.transform='scale(1.05)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor='transparent';(e.currentTarget as HTMLButtonElement).style.transform='scale(1)';}}
                >
                  <img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block',pointerEvents:'none'}}/>
                </button>
              ))}
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
          onChange={e=>{if(e.target.files?.[0]){onUploadAndPlace(e.target.files[0]);e.target.value='';}}}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scaled page thumbnail — renders actual page content at thumb size.
// Moved to @/components/PageThumb so it can be shared with the Wizard's
// design picker without pulling in this whole (heavy) Editor module.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Spread Navigator
// ─────────────────────────────────────────────────────────────────────────────

const SpreadNav = React.memo(function SpreadNav({spreads,current,onChange,onAddSpread,addingSpread,onReorder,onDeleteSpread,deletingSpread,pagesContent,canvasH,lang,readOnly}: {
  spreads:SpreadDef[];current:number;onChange:(i:number)=>void;
  onAddSpread:()=>void;addingSpread:boolean;
  onReorder:(from:number,to:number)=>Promise<void>;
  onDeleteSpread?:(i:number)=>void;deletingSpread?:boolean;
  pagesContent:Record<number,EditorElement[]>;
  canvasH:number;
  lang:'sq'|'en';
  readOnly?:boolean;
}) {
  const scrollRef=useRef<HTMLDivElement>(null);
  const [dragIdx,setDragIdx]=useState<number|null>(null);
  const [overIdx,setOverIdx]=useState<number|null>(null);
  const [reordering,setReordering]=useState(false);
  // HTML5 drag breaks overflow-x scroll on iOS — only enable for mouse pointers
  const [allowMouseDrag,setAllowMouseDrag]=useState(false);
  // Refs for touch drag (need stable values in passive-false listener)
  const dragIdxRef=useRef<number|null>(null);
  const overIdxRef=useRef<number|null>(null);
  // Long-press to reorder — immediate drag was blocking horizontal scroll
  const longPressTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const pendingDragIdx=useRef<number|null>(null);
  const touchOrigin=useRef<{x:number;y:number}|null>(null);
  // Refs for swipe-to-navigate gesture (only when the strip itself didn't scroll)
  const swipeRef=useRef<{x:number;y:number;t:number;scrollLeft:number}|null>(null);

  useEffect(()=>{
    const mq=window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync=()=>setAllowMouseDrag(mq.matches);
    sync();
    mq.addEventListener?.('change',sync);
    return ()=>mq.removeEventListener?.('change',sync);
  },[]);

  useEffect(()=>{
    const el=scrollRef.current?.querySelector('[data-cur="true"]') as HTMLElement|null;
    if(!el||!scrollRef.current) return;
    // Prefer manual scroll so we don't get clipped by justify/center quirks
    const parent=scrollRef.current;
    const target=el.offsetLeft - (parent.clientWidth - el.offsetWidth) / 2;
    parent.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  },[current]);

  // A spread is draggable if it's an inner spread (not solo, not sp1 which has the locked inside-cover)
  const canMove=(i:number)=>!readOnly && !spreads[i].isSolo && i>=2;
  // Extra spreads the client added can be deleted (both sides must be editable inners)
  const canDelete=(i:number)=>{
    if (readOnly) return false;
    const sp=spreads[i];
    if(!sp||sp.isSolo||i<2) return false;
    const leftOk=!sp.left||sp.left.role==='inner';
    const rightOk=!sp.right||sp.right.role==='inner';
    return leftOk&&rightOk&&(!!sp.left||!!sp.right);
  };

  const clearLongPress=()=>{
    if(longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current=null;
    pendingDragIdx.current=null;
    touchOrigin.current=null;
  };

  const doReorder=async(from:number,to:number)=>{
    if (from===to||!canMove(from)||!canMove(to)||reordering) return;
    setReordering(true);
    try { await onReorder(from,to); } finally { setReordering(false); }
  };

  // Touch drag — only preventDefault once a long-press reorder is active
  useEffect(()=>{
    const el=scrollRef.current; if(!el) return;
    const onTouchMove=(e:TouchEvent)=>{
      const touch=e.touches[0];
      // Cancel pending long-press if the finger moved (user is scrolling)
      if(pendingDragIdx.current!==null&&touchOrigin.current){
        const dx=touch.clientX-touchOrigin.current.x;
        const dy=touch.clientY-touchOrigin.current.y;
        if(Math.abs(dx)>10||Math.abs(dy)>10) clearLongPress();
      }
      if(dragIdxRef.current===null) return;
      e.preventDefault();
      const hit=document.elementFromPoint(touch.clientX,touch.clientY);
      const node=hit?.closest('[data-si]');
      if(node){
        const idx=Number((node as HTMLElement).dataset.si);
        if(!isNaN(idx)&&canMove(idx)&&idx!==dragIdxRef.current){
          overIdxRef.current=idx;
          setOverIdx(idx);
        }
      }
    };
    el.addEventListener('touchmove',onTouchMove,{passive:false});
    return ()=>el.removeEventListener('touchmove',onTouchMove);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[spreads]);

  useEffect(()=>()=>clearLongPress(),[]);

  const handleItemTouchStart=(i:number,e:React.TouchEvent)=>{
    if(!canMove(i)) return;
    const t=e.touches[0];
    touchOrigin.current={x:t.clientX,y:t.clientY};
    pendingDragIdx.current=i;
    if(longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current=setTimeout(()=>{
      if(pendingDragIdx.current!==i) return;
      dragIdxRef.current=i; overIdxRef.current=null;
      setDragIdx(i); setOverIdx(null);
      pendingDragIdx.current=null;
      try { navigator.vibrate?.(10); } catch { /* ignore */ }
    }, 450);
  };
  const handleItemTouchEnd=()=>{
    const wasDragging=dragIdxRef.current!==null;
    const from=dragIdxRef.current; const to=overIdxRef.current;
    clearLongPress();
    if(wasDragging){
      if(from!==null&&to!==null&&from!==to) doReorder(from,to);
      dragIdxRef.current=null; overIdxRef.current=null;
      setDragIdx(null); setOverIdx(null);
    }
  };

  const onNavTouchStart=(e:React.TouchEvent)=>{
    if(dragIdxRef.current!==null) return;
    swipeRef.current={
      x:e.touches[0].clientX,
      y:e.touches[0].clientY,
      t:Date.now(),
      scrollLeft:scrollRef.current?.scrollLeft ?? 0,
    };
  };

  const onNavTouchEnd=(e:React.TouchEvent)=>{
    if(!swipeRef.current||dragIdxRef.current!==null){swipeRef.current=null;return;}
    const start=swipeRef.current;
    swipeRef.current=null;
    // If the strip scrolled, this was a scroll — don't also change page
    const scrolled=Math.abs((scrollRef.current?.scrollLeft ?? 0) - start.scrollLeft);
    if(scrolled>6) return;
    const dx=e.changedTouches[0].clientX-start.x;
    const dy=e.changedTouches[0].clientY-start.y;
    const dt=Math.max(1,Date.now()-start.t);
    if(Math.abs(dx)<=Math.abs(dy)) return;
    const velocity=Math.abs(dx)/dt;
    if(Math.abs(dx)<36&&velocity<0.28) return;
    if(dx<0&&current<spreads.length-1) onChange(current+1);
    else if(dx>0&&current>0)           onChange(current-1);
  };

  return (
    <div ref={scrollRef}
      className="spread-nav-scroll flex items-center gap-2 overflow-x-auto px-3 py-2.5 border-t border-neutral-200 flex-shrink-0"
      style={{
        minHeight:68,
        background:'#F5F2EE',
        scrollbarWidth:'none',
        // Critical: allow native horizontal pan. justify-center was removed —
        // ::before/::after below center content when it fits, without clipping scroll.
        touchAction:'pan-x',
        WebkitOverflowScrolling:'touch',
        overscrollBehaviorX:'contain',
      }}
      onTouchStart={onNavTouchStart}
      onTouchEnd={onNavTouchEnd}
      onTouchCancel={()=>{ clearLongPress(); swipeRef.current=null; }}
    >
      {/* Flex spacers: center when content is short; collapse when overflowing so ends are reachable */}
      <style>{`
        .spread-nav-scroll::-webkit-scrollbar { display: none; }
        /* margin:auto spacers center when content fits; collapse to 0 when overflowing so first/last thumbs are fully reachable */
        .spread-nav-scroll::before,
        .spread-nav-scroll::after { content: ''; margin: auto; }
      `}</style>
      {spreads.map((sp,i)=>{
        const movable=canMove(i);
        const isCurrent=i===current;
        const isDragging=dragIdx===i;
        const isOver=overIdx===i&&dragIdx!==null&&dragIdx!==i&&movable;
        const insertAfter=isOver&&dragIdx!==null&&dragIdx<i;
        const insertBefore=isOver&&dragIdx!==null&&dragIdx>i;

        const renderPageThumb=(page:PageDef|null,w:number,h:number)=>{
          if(!page) return <div style={{width:w,height:h,background:'#EAE5DC',flexShrink:0}}/>;
          const locked=page.role==='locked_left'||page.role==='locked_right';
          if(locked) return <div style={{
            width:w, height:h, flexShrink:0, background:'#FFFFFF',
            backgroundImage:'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)',
          }}/>;
          return <PageThumb elements={pagesContent[page.dbId]??[]} width={w} height={h} canvasH={canvasH}/>;
        };

        const ring=insertBefore
          ? 'inset 3px 0 0 0 #3b82f6, 0 1px 3px rgba(0,0,0,0.12)'
          : insertAfter
          ? 'inset -3px 0 0 0 #3b82f6, 0 1px 3px rgba(0,0,0,0.12)'
          : isCurrent
          ? '0 0 0 2px #C09A55, 0 4px 14px rgba(192,154,85,0.32)'
          : '0 1px 3px rgba(0,0,0,0.12)';

        const scale=isCurrent?'scale(1.08)':'scale(1)';

        const THUMB_SOLO_W=28, THUMB_PAIR_W=24;
        const thumbH=Math.round((sp.isSolo?THUMB_SOLO_W:THUMB_PAIR_W)*(canvasH/DESIGN_W));
        const thumbContainerW=sp.isSolo?THUMB_SOLO_W:THUMB_SOLO_W+2+THUMB_PAIR_W;

        return (
          <div
            key={sp.id}
            data-si={i}
            className="flex-shrink-0 flex flex-col items-center gap-0.5 select-none"
            style={{opacity:isDragging?0.18:1,transition:'opacity 0.15s'}}
            draggable={movable && allowMouseDrag}
            onDragStart={movable && allowMouseDrag ? e=>{e.dataTransfer.effectAllowed='move';setDragIdx(i);dragIdxRef.current=i;} : undefined}
            onDragOver={movable && allowMouseDrag ? e=>{if(dragIdxRef.current!==null&&dragIdxRef.current!==i){e.preventDefault();e.dataTransfer.dropEffect='move';setOverIdx(i);}} : undefined}
            onDragLeave={movable && allowMouseDrag ? ()=>setOverIdx(o=>o===i?null:o) : undefined}
            onDrop={movable && allowMouseDrag ? e=>{e.preventDefault();if(dragIdxRef.current!==null&&dragIdxRef.current!==i)doReorder(dragIdxRef.current,i);setDragIdx(null);setOverIdx(null);dragIdxRef.current=null;} : undefined}
            onDragEnd={allowMouseDrag ? ()=>{setDragIdx(null);setOverIdx(null);dragIdxRef.current=null;} : undefined}
            onTouchStart={movable ? (e)=>handleItemTouchStart(i,e) : undefined}
            onTouchEnd={movable ? handleItemTouchEnd : undefined}
            onTouchCancel={movable ? handleItemTouchEnd : undefined}
          >
            <button
              data-cur={String(isCurrent)}
              onClick={()=>onChange(i)}
              style={{
                background:'none',border:'none',padding:0,
                cursor:movable?(isDragging?'grabbing':'grab'):'pointer',
                opacity:isCurrent?1:0.40,
                transition:'opacity 0.20s ease',
                WebkitTapHighlightColor:'transparent',
              }}
              onMouseEnter={e=>{if(!isCurrent)(e.currentTarget as HTMLButtonElement).style.opacity='0.70';}}
              onMouseLeave={e=>{if(!isCurrent)(e.currentTarget as HTMLButtonElement).style.opacity='0.40';}}
            >
              <div style={{
                width:thumbContainerW,height:thumbH,borderRadius:3,
                overflow:'hidden',
                boxShadow:ring,
                transform:scale,
                transition:'transform 0.24s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease',
                transformOrigin:'center bottom',
                position:'relative',
                display:'flex',flexShrink:0,
              }}>
                {sp.isSolo
                  ? renderPageThumb(sp.right??sp.left,THUMB_SOLO_W,thumbH)
                  : <>{renderPageThumb(sp.left,THUMB_PAIR_W,thumbH)}<div style={{width:2,flexShrink:0,background:'rgba(0,0,0,0.22)'}}/>{renderPageThumb(sp.right,THUMB_PAIR_W,thumbH)}</>
                }
                {movable && (
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.15)',pointerEvents:'none'}}>
                    <span style={{fontSize:9,color:'rgba(255,255,255,0.9)',letterSpacing:'0.04em',lineHeight:1}}>⠿</span>
                  </div>
                )}
              </div>
            </button>

            <span style={{
              fontSize:7,letterSpacing:'0.09em',textTransform:'uppercase',
              color:isCurrent?'#B8904A':'#B0A898',
              fontWeight:isCurrent?700:400,
              transition:'color 0.20s ease',
            }}>{sp.navLabel}</span>

            {canDelete(i) && onDeleteSpread && (
              <button
                type="button"
                title={lang==='sq'?'Fshi këto faqe':'Delete these pages'}
                disabled={deletingSpread}
                onClick={(e)=>{ e.stopPropagation(); onDeleteSpread(i); }}
                style={{
                  marginTop:2, width:18, height:18, borderRadius:9,
                  border:'none', padding:0, cursor:deletingSpread?'wait':'pointer',
                  background:isCurrent?'rgba(220,38,38,0.12)':'rgba(0,0,0,0.06)',
                  color:isCurrent?'#DC2626':'#A39A8E',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  WebkitTapHighlightColor:'transparent',
                }}
              >
                <Trash2 size={10} strokeWidth={2}/>
              </button>
            )}

            <div style={{
              width:isCurrent?14:0,height:2,borderRadius:1,
              background:'linear-gradient(90deg,#C09A55,#E0BB7A)',
              transition:'width 0.28s cubic-bezier(0.34,1.56,0.64,1)',
              overflow:'hidden',flexShrink:0,
            }}/>
          </div>
        );
      })}

      {!readOnly && (
      <button onClick={onAddSpread} disabled={addingSpread}
        title="Add 2 pages (1 spread)"
        className={`flex-shrink-0 flex flex-col items-center gap-0.5 transition-opacity ${addingSpread?'opacity-30':'opacity-50 hover:opacity-100'}`}>
        <div style={{
          width:50,height:42,borderRadius:3,
          border:'1.5px dashed #AAA098',background:'transparent',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}>
          {addingSpread
            ? <span style={{fontSize:11,color:'#888'}}>…</span>
            : <span style={{fontSize:20,color:'#888',lineHeight:1,fontWeight:300}}>+</span>}
        </div>
        <span style={{fontSize:7,color:'#999',textTransform:'uppercase',letterSpacing:'0.09em'}}>
          {addingSpread?'…':'Add'}
        </span>
      </button>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Design thumbnail
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Layout thumbnail — auto-generated from zones
// ─────────────────────────────────────────────────────────────────────────────

function LayoutThumb({ zones }: { zones: LayoutZone[] }) {
  const W = 48, H = 64;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block',flexShrink:0}}>
      <rect width={W} height={H} fill="#F2EFE9" rx={2}/>
      {zones.map((z, i) => {
        const rx=z.x*W+1.5, ry=z.y*H+1.5, rw=Math.max(1,z.w*W-3), rh=Math.max(1,z.h*H-3);
        const cx=rx+rw/2, cy=ry+rh/2;
        return (
          <rect key={i}
            x={rx} y={ry} width={rw} height={rh}
            fill={z.type === 'photo' ? '#C8C0B8' : '#E2DDD6'}
            rx={1}
            transform={z.rotation ? `rotate(${z.rotation} ${cx} ${cy})` : undefined}
          />
        );
      })}
    </svg>
  );
}

function DesignThumb({design,lang,onApply}: {design:DesignDef;lang:'sq'|'en';onApply:()=>void}) {
  const previewEls = designFrontElements(design);
  return (
    <button onClick={onApply}
      className="flex flex-col items-center gap-1.5 group transition-transform hover:scale-105 active:scale-95 outline-none">
      <div
        className="relative overflow-hidden rounded-md border border-neutral-200 group-hover:border-neutral-700 shadow-sm transition-all group-hover:shadow-md bg-[#FEFDF9]"
        style={{ width: 72, height: 96 }}
      >
        {previewEls.length > 0 ? (
          <div className="absolute inset-0">
            <PageThumb elements={previewEls} width={72} height={96} />
          </div>
        ) : (
          <div className="absolute inset-0" style={{ background: (design.thumb?.background as string) || '#ECE7E1' }} />
        )}
      </div>
      <span className="text-[9px] text-neutral-500 group-hover:text-neutral-800 transition-colors text-center leading-tight w-full truncate px-1">
        {design.name[lang]}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cover background (front / back outside covers)
// ─────────────────────────────────────────────────────────────────────────────

const COVER_SWATCHES = [
  '#FFFFFF', '#FEFDF9', '#F8F6F0', '#ECE7E1', '#E0D8C8',
  '#BCC9D1', '#FEC5D7', '#A83442', '#2D0A18', '#1A2A1A',
  '#1C2E1A', '#0D4F6C', '#0C1E3C', '#2A1A08', '#111111', '#080808',
];

const COVER_GRADIENT_PRESETS: { from: string; to: string; dir: 'tb' | 'lr' | 'diag' }[] = [
  { from: '#1C1408', to: '#2C1E10', dir: 'diag' },
  { from: '#0D4F6C', to: '#1A7A9E', dir: 'tb' },
  { from: '#F5EEFE', to: '#FEF5F8', dir: 'diag' },
  { from: '#2A1A08', to: '#5C3A18', dir: 'tb' },
  { from: '#0A1929', to: '#1A3A5C', dir: 'lr' },
  { from: '#FBF5E8', to: '#E8D5B5', dir: 'tb' },
  { from: '#2D0A18', to: '#5A1A30', dir: 'tb' },
  { from: '#1A2A1A', to: '#3A4A3A', dir: 'lr' },
];

function CoverBackgroundPanel({
  bg, photos, uploading, lang, compact,
  onSetColor, onSetGradient, onSetPhoto, onUploadPhoto,
}: {
  bg?: EditorElement | null;
  photos: string[];
  uploading: boolean;
  lang: 'sq' | 'en';
  compact?: boolean;
  onSetColor: (color: string, opts?: { live?: boolean }) => void;
  onSetGradient: (from: string, to: string, dir: 'tb' | 'lr' | 'diag', opts?: { live?: boolean }) => void;
  onSetPhoto: (url: string | null) => void;
  onUploadPhoto: (file: File) => void;
}) {
  const mode = coverBgMode(bg);
  const [uiMode, setUiMode] = useState<CoverBgMode>(mode);
  const fileRef = useRef<HTMLInputElement>(null);
  const from = bg?.bgGradientFrom || bg?.bgColor || '#1A1A1A';
  const to = bg?.bgGradientTo || '#555555';
  const dir = bg?.bgGradientDir || 'tb';

  useEffect(() => { setUiMode(mode); }, [mode]);

  const modes: { id: CoverBgMode; label: string; Icon: typeof Palette }[] = [
    { id: 'color', label: lang === 'sq' ? 'Ngjyrë' : 'Color', Icon: Palette },
    { id: 'gradient', label: lang === 'sq' ? 'Gradient' : 'Gradient', Icon: Droplets },
    { id: 'photo', label: lang === 'sq' ? 'Foto' : 'Photo', Icon: ImageIcon },
  ];

  return (
    <div className={compact ? 'space-y-3' : 'space-y-3 px-3 pt-3 pb-2 border-b border-neutral-100'}>
      {!compact && (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">
            {lang === 'sq' ? 'Sfondi i kopertinës' : 'Cover background'}
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
            {lang === 'sq'
              ? 'Ngjyrë, gradient ose foto juaj — vetëm për këtë kopertinë'
              : 'Color, gradient, or your photo — this cover only'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-neutral-100">
        {modes.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => setUiMode(id)}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-[10px] text-[10px] font-semibold transition-all ${
              uiMode === id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {uiMode === 'color' && (
        <div className="space-y-2">
          <div className="grid grid-cols-8 gap-1.5">
            {COVER_SWATCHES.map(c => {
              const active = mode === 'color' && !bg?.src && (bg?.bgColor || '').toLowerCase() === c.toLowerCase();
              return (
                <button key={c} type="button" onClick={() => onSetColor(c)} title={c}
                  className={`aspect-square rounded-md border transition-transform hover:scale-110 ${
                    active ? 'border-neutral-900 ring-1 ring-neutral-900 scale-105' : 'border-neutral-200'
                  }`}
                  style={{ background: c }} />
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-neutral-500">
            <span className="flex-shrink-0">{lang === 'sq' ? 'Tjetër' : 'Custom'}</span>
            <input type="color" value={bg?.bgColor || '#FFFFFF'}
              onInput={e => onSetColor((e.target as HTMLInputElement).value, { live: true })}
              onChange={e => onSetColor(e.target.value)}
              className="h-7 w-full cursor-pointer rounded-md border border-neutral-200 bg-white p-0.5" />
          </label>
        </div>
      )}

      {uiMode === 'gradient' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-4 gap-1.5">
            {COVER_GRADIENT_PRESETS.map((g, i) => {
              const cssDir = g.dir === 'lr' ? 'to right' : g.dir === 'diag' ? '135deg' : 'to bottom';
              const active = mode === 'gradient' && bg?.bgGradientFrom === g.from && bg?.bgGradientTo === g.to;
              return (
                <button key={i} type="button" onClick={() => onSetGradient(g.from, g.to, g.dir)}
                  className={`aspect-[3/4] rounded-lg border transition-transform hover:scale-105 ${
                    active ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'
                  }`}
                  style={{ background: `linear-gradient(${cssDir}, ${g.from}, ${g.to})` }} />
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex-1 flex flex-col gap-1 text-[9px] uppercase tracking-wider text-neutral-400">
              {lang === 'sq' ? 'Nga' : 'From'}
              <input type="color" value={from}
                onInput={e => onSetGradient((e.target as HTMLInputElement).value, to, dir, { live: true })}
                onChange={e => onSetGradient(e.target.value, to, dir)}
                className="h-8 w-full cursor-pointer rounded-md border border-neutral-200 p-0.5" />
            </label>
            <label className="flex-1 flex flex-col gap-1 text-[9px] uppercase tracking-wider text-neutral-400">
              {lang === 'sq' ? 'Te' : 'To'}
              <input type="color" value={to}
                onInput={e => onSetGradient(from, (e.target as HTMLInputElement).value, dir, { live: true })}
                onChange={e => onSetGradient(from, e.target.value, dir)}
                className="h-8 w-full cursor-pointer rounded-md border border-neutral-200 p-0.5" />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {([
              { id: 'tb' as const, label: lang === 'sq' ? 'Lart↓' : 'Vertical' },
              { id: 'lr' as const, label: lang === 'sq' ? 'Anash' : 'Horizontal' },
              { id: 'diag' as const, label: lang === 'sq' ? 'Diag.' : 'Diagonal' },
            ]).map(d => (
              <button key={d.id} type="button" onClick={() => onSetGradient(from, to, d.id)}
                className={`py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                  dir === d.id && mode === 'gradient'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {uiMode === 'photo' && (
        <div className="space-y-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onUploadPhoto(f);
              e.target.value = '';
            }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full py-2 border-2 border-dashed border-neutral-300 rounded-xl text-[11px] text-neutral-500 hover:border-neutral-600 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {lang === 'sq' ? 'Ngarko sfond' : 'Upload background'}
          </button>
          {bg?.src && (
            <button type="button" onClick={() => onSetPhoto(null)}
              className="w-full py-1.5 text-[10px] text-neutral-500 hover:text-neutral-800 rounded-lg hover:bg-neutral-50 transition-colors">
              {lang === 'sq' ? 'Hiq foton e sfondit' : 'Remove background photo'}
            </button>
          )}
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
              {photos.map((url, i) => {
                const active = mode === 'photo' && bg?.src === url;
                return (
                  <button key={i} type="button" onClick={() => onSetPhoto(url)}
                    className={`aspect-square rounded-lg overflow-hidden border transition-all ${
                      active ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200 hover:border-neutral-600'
                    }`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-neutral-400 text-center py-2">
              {lang === 'sq' ? 'Ngarkoni një foto për sfond' : 'Upload a photo for the background'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const CoverBackgroundDock = React.forwardRef<HTMLElement, {
  side: 'left' | 'right';
  bg?: EditorElement | null;
  photos: string[];
  uploading: boolean;
  lang: 'sq' | 'en';
  onClose: () => void;
  onSetColor: (color: string, opts?: { live?: boolean }) => void;
  onSetGradient: (from: string, to: string, dir: 'tb' | 'lr' | 'diag', opts?: { live?: boolean }) => void;
  onSetPhoto: (url: string | null) => void;
  onUploadPhoto: (file: File) => void;
}>(function CoverBackgroundDock({
  side, bg, photos, uploading, lang, onClose,
  onSetColor, onSetGradient, onSetPhoto, onUploadPhoto,
}, ref) {
  return (
    <motion.aside
      ref={ref as any}
      initial={{ opacity: 0, x: side === 'left' ? -16 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: side === 'left' ? -16 : 16 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className={`w-[248px] flex-shrink-0 bg-white flex flex-col min-h-0 ${
        side === 'left' ? 'border-r border-neutral-200' : 'border-l border-neutral-200'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-100 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-neutral-800 truncate">
            {lang === 'sq' ? 'Sfondi i kopertinës' : 'Cover background'}
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
            {side === 'left'
              ? (lang === 'sq' ? 'Faqja majtas' : 'Left page')
              : (lang === 'sq' ? 'Faqja djathtas' : 'Right page')}
          </p>
        </div>
        <button type="button" onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors flex-shrink-0" aria-label="Close">
          <X size={15} className="text-neutral-400" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 min-h-0 p-3">
        <CoverBackgroundPanel
          bg={bg}
          photos={photos}
          uploading={uploading}
          lang={lang}
          compact
          onSetColor={onSetColor}
          onSetGradient={onSetGradient}
          onSetPhoto={onSetPhoto}
          onUploadPhoto={onUploadPhoto}
        />
      </div>
    </motion.aside>
  );
});

function CoverBgMobileSheet({
  show, onClose, bg, photos, uploading, lang,
  onSetColor, onSetGradient, onSetPhoto, onUploadPhoto,
}: {
  show: boolean;
  onClose: () => void;
  bg?: EditorElement | null;
  photos: string[];
  uploading: boolean;
  lang: 'sq' | 'en';
  onSetColor: (color: string, opts?: { live?: boolean }) => void;
  onSetGradient: (from: string, to: string, dir: 'tb' | 'lr' | 'diag', opts?: { live?: boolean }) => void;
  onSetPhoto: (url: string | null) => void;
  onUploadPhoto: (file: File) => void;
}) {
  return (
    <AnimatePresence>
      {show && <>
        <motion.div key="cover-bg-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.42)' }} onClick={onClose} />
        <motion.div key="cover-bg-sheet"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 34, stiffness: 400 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl flex flex-col"
          style={{ maxHeight: '72vh' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 flex-shrink-0">
            <span className="text-sm font-semibold text-neutral-900">
              {lang === 'sq' ? 'Sfondi i kopertinës' : 'Cover background'}
            </span>
            <button type="button" onClick={onClose} aria-label="Close">
              <X size={18} className="text-neutral-400" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-4">
            <CoverBackgroundPanel
              bg={bg}
              photos={photos}
              uploading={uploading}
              lang={lang}
              compact
              onSetColor={onSetColor}
              onSetGradient={onSetGradient}
              onSetPhoto={onSetPhoto}
              onUploadPhoto={onUploadPhoto}
            />
          </div>
        </motion.div>
      </>}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Designs Panel
// ─────────────────────────────────────────────────────────────────────────────

function DesignsPanel({onApply, lang, designs}: {
  onApply: (d: DesignDef) => void;
  lang: 'sq' | 'en';
  designs: DesignDef[];
}) {
  const categories = useMemo(() => [...new Set(designs.map(d => d.category))], [designs]);
  return (
    <div className="overflow-y-auto flex-1 flex flex-col min-h-0">
      <p className="text-[9px] uppercase tracking-widest text-neutral-400 px-3 pt-2 pb-1">
        {lang === 'sq'
          ? 'Kliko një stil — ndryshon vetëm pjesët e jashtme'
          : 'Click a style — changes outer covers only'}
      </p>
      {categories.map(cat => (
        <div key={cat} className="px-3 pb-4">
          <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold mb-2.5 mt-2">
            {(CATEGORY_LABELS[cat]?.[lang]) ?? cat}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {designs.filter(d => d.category === cat).map(d => (
              <DesignThumb key={d.id} design={d} lang={lang} onApply={() => onApply(d)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop Sidebar
// ─────────────────────────────────────────────────────────────────────────────

function Sidebar({tab,onTab,photos,onUpload,uploading,onAddPhoto,onAddText,onLayout,onApplyDesign,selectedId,onDelete,lang,designs,layouts}: {
  tab:SideTab; onTab:(t:SideTab)=>void; photos:string[]; onUpload:(f:File)=>void; uploading:boolean;
  onAddPhoto:(url:string)=>void; onAddText:(s?:{fontSize?:number;fontStyle?:string;align?:'left'|'center'|'right'})=>void; onLayout:(id:string)=>void;
  onApplyDesign:(d:DesignDef)=>void; selectedId:string|null; onDelete:()=>void; lang:'sq'|'en';
  designs: DesignDef[];
  layouts: LayoutDef[];
}) {
  const fileRef=useRef<HTMLInputElement>(null);
  return (
    <div className="w-64 flex-shrink-0 bg-white border-r border-neutral-200 flex flex-col h-full">
      <div className="grid grid-cols-4 border-b border-neutral-100 flex-shrink-0">
        {([
          {id:'designs',Icon:Wand2,      label:lang==='sq'?'Dizajne':'Designs'},
          {id:'layouts',Icon:LayoutTemplate,label:lang==='sq'?'Paraqitje':'Layout'},
          {id:'photos', Icon:ImageIcon,     label:lang==='sq'?'Foto':'Photos'},
          {id:'text',   Icon:Type,          label:lang==='sq'?'Tekst':'Text'},
        ] as const).map(({id,Icon,label})=>(
          <button key={id} onClick={()=>onTab(id)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[9px] font-semibold transition-colors border-b-2 ${tab===id?'text-neutral-900 border-neutral-900':'text-neutral-400 border-transparent hover:text-neutral-600'}`}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        {tab==='designs' && <DesignsPanel onApply={onApplyDesign} lang={lang} designs={designs}/>}
        {tab==='layouts' && (
          <div className="overflow-y-auto flex-1 p-3">
            <p className="text-[9px] uppercase tracking-widest text-neutral-400 mb-3">
              {lang==='sq'?'Apliko në faqen aktive':'Apply to active page'}
            </p>
            {[...new Set(layouts.map(l=>l.category))].map(cat=>(
              <div key={cat} className="pb-4">
                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold mb-2.5">
                  {(LAYOUT_CATEGORY_LABELS[cat]?.[lang]) ?? cat}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {layouts.filter(l=>l.category===cat).map(l=>(
                    <button key={l.id} onClick={()=>onLayout(l.id)}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-neutral-200 hover:border-neutral-700 hover:bg-neutral-50 transition-all group outline-none">
                      <LayoutThumb zones={l.zones}/>
                      <span className="text-[9px] text-neutral-400 group-hover:text-neutral-700 text-center leading-tight w-full">{l.label[lang]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab==='photos' && (
          <div className="overflow-y-auto flex-1 p-3 space-y-3">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={e=>{Array.from(e.target.files||[]).forEach(f=>onUpload(f));e.target.value='';}}/>
            <button onClick={()=>fileRef.current?.click()} disabled={uploading}
              className="w-full py-2.5 border-2 border-dashed border-neutral-300 rounded-xl text-xs text-neutral-500 hover:border-neutral-600 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60">
              {uploading?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}
              {lang==='sq'?'Ngarko foto':'Upload photos'}
            </button>
            {photos.length===0 ? (
              <div className="text-center py-8 text-neutral-300">
                <Camera size={26} className="mx-auto mb-1.5"/><p className="text-[11px]">{lang==='sq'?'Ende pa foto':'No photos yet'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {photos.map((url,i)=>(
                  <button key={i} onClick={()=>onAddPhoto(url)}
                    className="aspect-square rounded-lg overflow-hidden border border-neutral-200 hover:border-neutral-700 hover:scale-105 transition-all">
                    <img src={url} alt="" className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {tab==='text' && (
          <div className="overflow-y-auto flex-1 p-3 space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-neutral-400 mb-2.5">{lang==='sq'?'Shto tekst':'Add text block'}</p>
            {([
              {lbl:lang==='sq'?'Titull':'Title',      size:36, fs:'bold',   al:'center' as const, desc:lang==='sq'?'36px · trashë':'36px · bold'},
              {lbl:lang==='sq'?'Nëntitull':'Subtitle', size:22, fs:'italic', al:'center' as const, desc:lang==='sq'?'22px · kursiv':'22px · italic'},
              {lbl:lang==='sq'?'Paragraf':'Body',      size:16, fs:'normal', al:'left'   as const, desc:lang==='sq'?'16px · normal':'16px · normal'},
              {lbl:lang==='sq'?'Titull i vogël':'Caption',size:11,fs:'normal',al:'center' as const, desc:lang==='sq'?'11px · i vogël':'11px · small'},
            ]).map(t=>(
              <button key={t.lbl} onClick={()=>onAddText({fontSize:t.size,fontStyle:t.fs,align:t.al})}
                className="w-full flex items-center gap-3 px-3 py-2.5 border border-neutral-200 rounded-xl hover:border-neutral-800 hover:bg-neutral-50 transition-all group">
                <span className="text-neutral-800 w-10 text-center leading-none flex-shrink-0"
                  style={{fontSize:Math.min(t.size,26),fontStyle:t.fs==='italic'?'italic':'normal',fontWeight:t.fs==='bold'?'bold':'normal',fontFamily:'Georgia, serif'}}>
                  Aa
                </span>
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-semibold text-neutral-700 group-hover:text-neutral-900">{t.lbl}</p>
                  <p className="text-[9px] text-neutral-400 mt-0.5">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedId && (
        <div className="px-3 py-2.5 border-t border-neutral-100 flex-shrink-0">
          <button onClick={onDelete}
            className="w-full py-2 flex items-center justify-center gap-1.5 text-red-500 hover:bg-red-50 rounded-xl text-xs font-medium transition-colors">
            <Trash2 size={13}/>{lang==='sq'?'Fshi elementin':'Delete element'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Bottom Sheet
// ─────────────────────────────────────────────────────────────────────────────

function MobileSheet({tab,show,onClose,photos,onUpload,uploading,onAddPhoto,onLayout,onAddText,onApplyDesign,lang,designs,layouts}: {
  tab:SideTab; show:boolean; onClose:()=>void; photos:string[]; onUpload:(f:File)=>void; uploading:boolean;
  onAddPhoto:(url:string)=>void; onLayout:(id:string)=>void; onAddText:(s?:{fontSize?:number;fontStyle?:string;align?:'left'|'center'|'right'})=>void;
  onApplyDesign:(d:DesignDef)=>void; lang:'sq'|'en';
  designs: DesignDef[];
  layouts: LayoutDef[];
}) {
  const fileRef=useRef<HTMLInputElement>(null);
  return (
    <AnimatePresence>
      {show && <>
        <div className="fixed inset-0 z-40" style={{background:'rgba(0,0,0,0.42)'}} onClick={onClose}/>
        <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
          transition={{type:'spring',damping:34,stiffness:400}}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl flex flex-col" style={{maxHeight:'72vh'}}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 flex-shrink-0">
            <span className="text-sm font-semibold capitalize">{
              tab==='designs'  ? (lang==='sq'?'Dizajne':'Designs')   :
              tab==='layouts'  ? (lang==='sq'?'Paraqitje':'Layouts') :
              tab==='photos'   ? (lang==='sq'?'Foto':'Photos')       :
              (lang==='sq'?'Tekst':'Text')
            }</span>
            <button onClick={onClose}><X size={18} className="text-neutral-400"/></button>
          </div>
          <div className="overflow-y-auto flex-1 p-4">
            {tab==='designs' && (
              <div className="space-y-4">
                <p className="text-[10px] text-neutral-400 leading-snug">
                  {lang === 'sq'
                    ? 'Kliko një stil — ndryshon vetëm pjesët e jashtme. Faqet e brendshme mbeten siç janë.'
                    : 'Click a style — changes outer covers only. Inside pages stay the same.'}
                </p>
                {[...new Set(designs.map(d=>d.category))].map(cat=>(
                  <div key={cat}>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-semibold mb-2">{cat}</p>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {designs.filter(d=>d.category===cat).map(d=>(
                        <div key={d.id} className="flex-shrink-0">
                          <DesignThumb design={d} lang={lang} onApply={()=>onApplyDesign(d)}/>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab==='layouts' && (
              <div className="space-y-4">
                {[...new Set(layouts.map(l=>l.category))].map(cat=>(
                  <div key={cat}>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-semibold mb-2">
                      {(LAYOUT_CATEGORY_LABELS[cat]?.[lang]) ?? cat}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {layouts.filter(l=>l.category===cat).map(l=>(
                        <button key={l.id} onClick={()=>{onLayout(l.id);onClose();}}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-neutral-200 hover:border-neutral-700 hover:bg-neutral-50 transition-all outline-none">
                          <LayoutThumb zones={l.zones}/>
                          <span className="text-[9px] text-neutral-500 text-center leading-tight w-full">{l.label[lang]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab==='photos' && (
              <div className="space-y-3">
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e=>{Array.from(e.target.files||[]).forEach(f=>onUpload(f));e.target.value='';}}/>
                <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                  className="w-full py-3 border-2 border-dashed border-neutral-300 rounded-xl text-sm flex items-center justify-center gap-2 text-neutral-500 disabled:opacity-60">
                  {uploading?<Loader2 size={15} className="animate-spin"/>:<Plus size={15}/>}
                  {lang==='sq'?'Ngarko foto':'Upload photos'}
                </button>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((url,i)=>(
                    <button key={i} onClick={()=>{onAddPhoto(url);onClose();}}
                      className="aspect-square rounded-xl overflow-hidden border border-neutral-200">
                      <img src={url} alt="" className="w-full h-full object-cover"/>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tab==='text' && (
              <div className="grid grid-cols-2 gap-2">
                {([
                  {lbl:lang==='sq'?'Titull':'Title',       size:36, fs:'bold',   al:'center' as const},
                  {lbl:lang==='sq'?'Nëntitull':'Subtitle', size:22, fs:'italic', al:'center' as const},
                  {lbl:lang==='sq'?'Paragraf':'Body',      size:16, fs:'normal', al:'left'   as const},
                  {lbl:lang==='sq'?'Epigraf':'Caption',    size:11, fs:'normal', al:'center' as const},
                ]).map(t=>(
                  <button key={t.lbl} onClick={()=>{onAddText({fontSize:t.size,fontStyle:t.fs,align:t.al});onClose();}}
                    className="flex flex-col items-center gap-1.5 px-2 py-3 border border-neutral-200 rounded-xl active:bg-neutral-50 transition-all">
                    <span className="text-neutral-800"
                      style={{fontSize:Math.min(t.size,28),fontStyle:t.fs==='italic'?'italic':'normal',fontWeight:t.fs==='bold'?'bold':'normal',fontFamily:'Georgia, serif',lineHeight:1}}>Aa</span>
                    <span className="text-[10px] text-neutral-500 font-medium">{t.lbl}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </>}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Modal
// ─────────────────────────────────────────────────────────────────────────────

function OrderModal({project,onClose,lang,flushSave}: {
  project:any; onClose:()=>void; lang:'sq'|'en'; flushSave?:()=>Promise<void>;
}) {
  const createOrder=useCreateOrder();
  const queryClient=useQueryClient();
  const {getToken}=useAuth();
  const [st,setSt]=useState<'idle'|'loading'|'done'|'error'>('idle');
  const [errMsg,setErrMsg]=useState<string>('');

  const go=async()=>{
    if (st==='loading') return;
    setSt('loading');
    setErrMsg('');
    // Open the tab synchronously inside the click gesture so popup blockers
    // don't swallow WhatsApp after the async create-order round-trip.
    const waTab=window.open('about:blank','_blank');
    try{
      // Persist the latest canvas BEFORE the order PDF kicks off — otherwise
      // the print file can be built from stale/empty contentJson.
      if (flushSave) await flushSave();

      const o=await createOrder.mutateAsync({data:{projectId:project.id}});
      const id=(o as any)?.id;
      if (!id) throw new Error('Order created but no id returned');

      const token=getToken();
      const headers:Record<string,string>={};
      if (token) headers['Authorization']=`Bearer ${token}`;
      const waRes=await fetch(`/api/orders/${id}/whatsapp?lang=${lang}`,{
        headers,
        credentials:'include',
      });
      if (!waRes.ok){
        const body=await waRes.json().catch(()=>({}));
        throw new Error((body as any)?.error || `WhatsApp link failed (${waRes.status})`);
      }
      const {url}=await waRes.json() as {url:string};
      if (waTab && !waTab.closed) waTab.location.href=url;
      else window.open(url,'_blank');

      // Keep project lists / album status in sync for this client immediately.
      void queryClient.invalidateQueries({queryKey:getGetProjectQueryKey(project.id)});
      void queryClient.invalidateQueries({queryKey:getListProjectsQueryKey()});
      void queryClient.invalidateQueries({queryKey:['/api/orders']});
      void fetch('/api/analytics/track',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({event:'wp_click',path:`/orders/${id}`}),
      }).catch(()=>{});

      setSt('done');
    }catch(e:any){
      try{waTab?.close();}catch{/* ignore */}
      const status=e?.status;
      const apiErr=typeof e?.data?.error==='string'?e.data.error:null;
      const msg=apiErr
        || (typeof e?.message==='string'?e.message:null)
        || (lang==='sq'?'Ndodhi një gabim.':'An error occurred.');
      // Surface rate-limit / cap errors clearly — silent failures were why
      // WhatsApp could open (or look like it did) without an admin order.
      setErrMsg(status===429
        ? (lang==='sq'?'Shumë kërkesa — provo përsëri pas pak.':'Too many requests — try again shortly.')
        : msg);
      setSt('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{background:'rgba(0,0,0,0.55)'}}>
      <motion.div initial={{y:60,opacity:0}} animate={{y:0,opacity:1}} exit={{y:60,opacity:0}}
        className="bg-white w-full md:max-w-sm md:rounded-2xl rounded-t-2xl p-6 shadow-2xl">
        <div className="flex justify-between mb-5">
          <h3 className="font-serif text-lg font-medium">{lang==='sq'?'Konfirmo Porosinë':'Confirm Order'}</h3>
          <button onClick={onClose}><X size={18} className="text-neutral-400"/></button>
        </div>
        <div className="bg-neutral-50 rounded-xl p-4 mb-5 space-y-2.5 text-sm">
          {([['Album',project.title||'My Album'],[lang==='sq'?'Faqe':'Pages',`${project.pageCount??30}`],
             [lang==='sq'?'Çmimi total':'Total price',`${(project.totalPriceLek||3100).toLocaleString()} LEK`],
             [lang==='sq'?'Dërgesa':'Delivery',lang==='sq'?'10–16 ditë pune':'10–16 working days'],
          ] as [string,string][]).map(([k,v])=>(
            <div key={k} className="flex justify-between">
              <span className="text-neutral-400">{k}</span><span className="font-medium text-neutral-800">{v}</span>
            </div>
          ))}
        </div>
        {st==='done'?(
          <div className="text-center py-3">
            <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2"><Check size={22} className="text-green-600"/></div>
            <p className="font-medium text-green-700 text-sm">{lang==='sq'?'Porosia u dërgua!':'Order sent via WhatsApp!'}</p>
            <p className="text-xs text-neutral-400 mt-1">{lang==='sq'?'Porosia u regjistrua në sistem.':'Your order is registered in the system.'}</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-neutral-900 text-white rounded-full text-sm">{lang==='sq'?'Mbyll':'Close'}</button>
          </div>
        ):st==='error'?(
          <div className="text-center py-2 space-y-3">
            <p className="text-red-500 text-sm">{errMsg||(lang==='sq'?'Ndodhi një gabim.':'An error occurred.')}</p>
            <button onClick={go} className="px-5 py-2 rounded-full text-sm bg-neutral-900 text-white">
              {lang==='sq'?'Provo përsëri':'Try again'}
            </button>
          </div>
        ):(
          <>
            <button onClick={go} disabled={st==='loading'}
              className="w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 text-white disabled:opacity-60"
              style={{background:'#25D366'}}>
              {st==='loading'?<Loader2 size={18} className="animate-spin"/>:<span>📱</span>}
              <span>{lang==='sq'?'Porosit via WhatsApp':'Order via WhatsApp'}</span>
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Editor
// ─────────────────────────────────────────────────────────────────────────────

export default function Editor() {
  const [,params]=useRoute('/editor/:id');
  const projectId=Number(params?.id);
  const {lang,t}=useLanguage();
  const {getToken,isLoading:authLoading,isAuthenticated}=useAuth();
  const queryClient=useQueryClient();

  // Wait for the access-token refresh (or login) before fetching — otherwise the
  // first /projects/:id call goes out without a Bearer header, 401s, and the
  // editor sticks on a dead error state until a full page reload.
  const projectQueryEnabled=!!projectId&&!isNaN(projectId)&&!authLoading&&isAuthenticated;
  const {data:project,isLoading,isError,refetch:refetchProject}=useGetProject(projectId,{query:{queryKey:getGetProjectQueryKey(projectId),enabled:projectQueryEnabled}});
  const {data:bookSizes}=useListBookSizes();
  const {data:dbLayouts}=useListLayouts();
  const editorLayouts=useMemo(()=>mergeEditorLayouts(dbLayouts as any),[dbLayouts]);
  // The project's real book size determines the logical canvas height
  // (DESIGN_W stays fixed across all book sizes — see getCanvasHeight).
  // Falls back to the 3:4 reference height until book sizes/project load.
  const bookSize=useMemo(()=>(bookSizes as any[]|undefined)?.find(s=>s.id===project?.bookSizeId),[bookSizes,project?.bookSizeId]);
  const canvasH=useMemo(()=>getCanvasHeight(
    bookSize?.widthCm!==undefined?Number(bookSize.widthCm):undefined,
    bookSize?.heightCm!==undefined?Number(bookSize.heightCm):undefined,
  ),[bookSize]);

  // Flush pending cover/page edits before the list refetches — otherwise
  // leaving right after applying a design can show a blank/stale cover on
  // "Projektet e mia" while the editor still looks correct.
  const flushSaveRef=useRef<()=>Promise<void>>(async()=>{});
  useEffect(()=>{
    return ()=>{
      void (async()=>{
        try { await flushSaveRef.current(); } catch { /* leave-path best effort */ }
        queryClient.invalidateQueries({queryKey:getListProjectsQueryKey()});
      })();
    };
  },[queryClient]);
  const spreads=useMemo(()=>buildSpreads(project?.pages||[],lang),[project?.pages,lang]);
  const isOrdered = project?.status === 'ordered';

  const [spreadIdx,setSpreadIdx]=useState(0);
  const currentSpread=spreads[spreadIdx];

  const [pagesContent,setPagesContent]=useState<Record<number,EditorElement[]>>({});
  const emptyInnerPages = useMemo(
    () => (isOrdered ? [] : getEmptyInnerPageNumbers(project?.pages as any, pagesContent)),
    [isOrdered, project?.pages, pagesContent],
  );
  // Filmstrip thumbs can lag a frame behind — keeps drag/edit on the canvas snappy.
  const deferredPagesContent=useDeferredValue(pagesContent);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [activeSide,setActiveSide]=useState<'left'|'right'>('right');
  const [tab,setTab]=useState<SideTab>('designs');
  const [photos,setPhotos]=useState<string[]>([]);
  const [uploading,setUploading]=useState(false);
  const [showOrder,setShowOrder]=useState(false);
  const [emptyPagesWarn,setEmptyPagesWarn]=useState<number[]>([]);
  const [show3D,setShow3D]=useState(false);
  const [pdfProgress,setPdfProgress]=useState<{current:number;total:number}|null>(null);
  const [showSheet,setShowSheet]=useState(false);
  const [addingSpread,setAddingSpread]=useState(false);
  const [pickerOpen,setPickerOpen]=useState(false);
  const [saveStatus,setSaveStatus]=useState<'saved'|'saving'|'unsaved'>('saved');
  const [designToast,setDesignToast]=useState<string|null>(null);
  const [pendingDesign,setPendingDesign]=useState<DesignDef|null>(null);

  // Webfonts start in main.tsx; keep a subscribe here so first paint after
  // navigation still remounts Konva text once faces are ready.
  useEditorFontsReady();
  useEffect(() => { void ensureEditorFonts(); }, []);

  const shapeRefs=useRef<Record<string,any>>({});
  const canvasRef=useRef<HTMLDivElement>(null);
  const headerSwipeRef=useRef<{y:number}|null>(null);
  const [headerCollapsed,setHeaderCollapsed]=useState(false);
  const saveTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const dirtyPages=useRef(new Set<number>());
  // Stable ref so the keyboard handler can call undo without it being in deps
  // (undo is defined later in the file, after triggerSave).
  const undoRef=useRef<()=>void>(()=>{});
  const autoAppliedRef=useRef(false);

  // ── Undo history ────────────────────────────────────────────────────────────
  const MAX_HISTORY=5;
  const historyKey=`editor_undo_${projectId}`;
  const redoKey=`editor_redo_${projectId}`;
  const historyRef=useRef<Record<number,EditorElement[]>[]>([]);
  const [historyLen,setHistoryLen]=useState(0);
  // Redo stack: states popped off by undo land here so the user can step
  // forward again — cleared the moment a fresh edit is made, since that
  // invalidates the "future" the redo stack was pointing to.
  const redoRef=useRef<Record<number,EditorElement[]>[]>([]);
  const [redoLen,setRedoLen]=useState(0);
  // Mirror of pagesContent for synchronous snapshot capture (avoids reading
  // stale closure state at the time updatePage/changeEl is called).
  const liveContent=useRef<Record<number,EditorElement[]>>({});

  // Load persisted history from localStorage on first mount.
  useEffect(()=>{
    try {
      const raw=localStorage.getItem(historyKey);
      if (raw) {
        const parsed=JSON.parse(raw);
        if (Array.isArray(parsed)) { historyRef.current=parsed; setHistoryLen(parsed.length); }
      }
      const rawRedo=localStorage.getItem(redoKey);
      if (rawRedo) {
        const parsedRedo=JSON.parse(rawRedo);
        if (Array.isArray(parsedRedo)) { redoRef.current=parsedRedo; setRedoLen(parsedRedo.length); }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[historyKey,redoKey]);

  const persistHistory=useCallback((stack: Record<number,EditorElement[]>[])=>{
    // Defer the JSON.stringify + localStorage write off the main thread so it
    // never blocks a keystroke or drag interaction.
    setTimeout(()=>{ try { localStorage.setItem(historyKey,JSON.stringify(stack)); } catch {} },0);
  },[historyKey]);

  const persistRedo=useCallback((stack: Record<number,EditorElement[]>[])=>{
    setTimeout(()=>{ try { localStorage.setItem(redoKey,JSON.stringify(stack)); } catch {} },0);
  },[redoKey]);

  const clearRedo=useCallback(()=>{
    if (!redoRef.current.length) return;
    redoRef.current=[]; setRedoLen(0);
    try { localStorage.removeItem(redoKey); } catch {}
  },[redoKey]);

  const pushHistory=useCallback((opts?:{silent?:boolean})=>{
    // Clone page arrays (element objects are replaced immutably on edit, never mutated).
    const cur=liveContent.current;
    const snap:Record<number,EditorElement[]>={};
    for (const key of Object.keys(cur)) {
      const pid=Number(key);
      snap[pid]=cur[pid].slice();
    }
    const stack=[...historyRef.current,snap].slice(-MAX_HISTORY);
    historyRef.current=stack;
    persistHistory(stack);
    // Clear redo stack in refs; UI update can wait until after the gesture.
    if (redoRef.current.length) {
      redoRef.current=[];
      try { localStorage.removeItem(redoKey); } catch {}
      if (!opts?.silent) setRedoLen(0);
    }
    // Silent mode (drag start): skip setState so Konva isn't interrupted mid-gesture.
    // UI counters are synced when the gesture commits in changeEl.
    if (!opts?.silent) setHistoryLen(stack.length);
  },[persistHistory,redoKey]);

  // Drag/transform: snapshot undo once at gesture start without a React re-render.
  const gestureHistoryRef=useRef(false);
  const beginHistoryGesture=useCallback(()=>{
    if (gestureHistoryRef.current) return;
    gestureHistoryRef.current=true;
    pushHistory({silent:true});
  },[pushHistory]);


  const [isMobile,setIsMobile]=useState(false);
  const [pageW,setPageW]=useState(460);
  const pageH=Math.round(pageW*(canvasH/DESIGN_W));

  useEffect(()=>{
    const measure=()=>{
      const mob=window.innerWidth<768; setIsMobile(mob);
      const area=canvasRef.current; if(!area) return;
      const avail=area.clientWidth;
      if (mob) {
        // Single-page view on mobile — maximise the canvas so edits are easy.
        // Constrain by both available width and height to always fit on screen.
        const areaH = area.clientHeight;
        const byH = Math.floor((areaH - 24) * (DESIGN_W / canvasH));
        const byW = Math.floor(avail - 24); // 12px padding each side
        setPageW(Math.max(160, Math.min(byH, byW, 520)));
      }
      else { const half=Math.floor((avail-SPINE_W-64)/2); setPageW(Math.max(Math.min(half,580),260)); }
    };
    measure();
    let rafId=0;
    const ro=new ResizeObserver(()=>{ cancelAnimationFrame(rafId); rafId=requestAnimationFrame(measure); });
    if (canvasRef.current) ro.observe(canvasRef.current);
    return ()=>{ ro.disconnect(); cancelAnimationFrame(rafId); };
    // Re-run after project load so we observe the real canvas (not the skeleton).
  },[canvasH, isLoading, project?.id]);

  useEffect(()=>{
    if (!project?.pages) return;
    // Rebuild from server data. Only preserve pages that have unsaved in-memory
    // edits (dirty). All other pages — including any from a previous project —
    // are replaced with the server copy so there is zero cross-project bleed.
    setPagesContent(prev=>{
      const next: Record<number,EditorElement[]>={};
      for (const p of project.pages) {
        if (dirtyPages.current.has(p.id) && p.id in prev) {
          next[p.id]=prev[p.id]; // keep unsaved edits
        } else {
          try { const parsed=p.contentJson?JSON.parse(p.contentJson):[];
            next[p.id]=Array.isArray(parsed)?parsed:[];
          } catch { next[p.id]=[]; }
        }
      }
      liveContent.current=next;
      return next;
    });
  },[project?.pages]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if (e.key==='Escape') setSelectedId(null);
      if ((e.key==='Delete'||e.key==='Backspace')&&selectedId&&
        !(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)) deleteSelected();
      if (e.key==='z'&&(e.ctrlKey||e.metaKey)&&!e.shiftKey) { e.preventDefault(); undoRef.current(); }
      if ((e.key==='y'&&(e.ctrlKey||e.metaKey))||(e.key==='z'&&(e.ctrlKey||e.metaKey)&&e.shiftKey)) { e.preventDefault(); redoRefFn.current(); }
    };
    window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h);
  },[selectedId]); // eslint-disable-line

  const activePageId=useMemo(()=>{
    if (!currentSpread) return null;
    if (currentSpread.isSolo) return (currentSpread.right??currentSpread.left)?.dbId??null;
    const p=activeSide==='left'?currentSpread.left:currentSpread.right;
    if (!p||p.role==='locked_left'||p.role==='locked_right') {
      const other=activeSide==='left'?currentSpread.right:currentSpread.left;
      if (other&&other.role!=='locked_left'&&other.role!=='locked_right') return other.dbId;
      return null;
    }
    return p.dbId;
  },[currentSpread,activeSide]);

  const activePageRole=useMemo((): PageRole | null => {
    if (!currentSpread) return null;
    if (currentSpread.isSolo) return (currentSpread.right??currentSpread.left)?.role??null;
    const p=activeSide==='left'?currentSpread.left:currentSpread.right;
    if (!p||p.role==='locked_left'||p.role==='locked_right') {
      const other=activeSide==='left'?currentSpread.right:currentSpread.left;
      if (other&&other.role!=='locked_left'&&other.role!=='locked_right') return other.role;
      return null;
    }
    return p.role;
  },[currentSpread,activeSide]);

  const isCoverPage = activePageRole === 'front_cover' || activePageRole === 'back_cover';

  const activeCoverBg = useMemo(() => {
    if (!isCoverPage || !activePageId) return null;
    return (pagesContent[activePageId] ?? []).find(e => e.type === 'background') ?? null;
  }, [isCoverPage, activePageId, pagesContent]);

  const selectedIsBackground = !!(activeCoverBg && selectedId === activeCoverBg.id);

  // Dock beside the page that owns the cover: back/left → left, front/right → right.
  const coverBgDockSide: 'left' | 'right' =
    activePageRole === 'back_cover' || activeSide === 'left' ? 'left' : 'right';

  // Don't stack the tools sheet over the cover-background sheet on mobile.
  useEffect(() => {
    if (selectedIsBackground) setShowSheet(false);
  }, [selectedIsBackground]);

  // Only pass the 2 pages of the current spread to SpreadView so React.memo
  // can short-circuit re-renders caused by edits on other spreads.
  const spreadContent=useMemo(()=>{
    if (!currentSpread) return {};
    const out: Record<number,EditorElement[]>={};
    const add=(p:PageDef|null)=>{ if(p) out[p.dbId]=pagesContent[p.dbId]??[]; };
    add(currentSpread.left); add(currentSpread.right);
    return out;
  },[currentSpread,pagesContent]);

  const onSpreadChange=useCallback((i:number)=>{
    setSpreadIdx(i); setSelectedId(null); setActiveSide('right');
  },[]);

  const onElementDragActive=useCallback((_active:boolean)=>{
    // Page swipe yields via PageCanvas draggingRef while transforming.
  },[]);

  // Flat page steps so mobile swipe walks cover → every page → back cover.
  const pageSteps=useMemo(()=>{
    const steps:{spreadIdx:number;side:'left'|'right'}[]=[];
    spreads.forEach((sp,i)=>{
      if(sp.isSolo){
        steps.push({spreadIdx:i,side:sp.left?'left':'right'});
      } else {
        if(sp.left) steps.push({spreadIdx:i,side:'left'});
        if(sp.right) steps.push({spreadIdx:i,side:'right'});
      }
    });
    return steps;
  },[spreads]);

  const pageNavRef=useRef({pageSteps,spreadIdx,activeSide});
  pageNavRef.current={pageSteps,spreadIdx,activeSide};

  const onPageSwipe=useCallback((dir:1|-1)=>{
    const {pageSteps:steps,spreadIdx:si,activeSide:side}=pageNavRef.current;
    if(!steps.length) return;
    const cur=steps.findIndex(s=>s.spreadIdx===si && s.side===side);
    const from=cur>=0 ? cur : steps.findIndex(s=>s.spreadIdx===si);
    if(from<0) return;
    const next=from+dir;
    if(next<0||next>=steps.length) return;
    const step=steps[next];
    setSpreadIdx(step.spreadIdx);
    setActiveSide(step.side);
    setSelectedId(null);
  },[]);

  // The actual network save, shared by the debounced auto-save and by
  // flushSave (used to force-persist pending edits — e.g. a just-applied
  // design — before anything reads contentJson from the DB, like placing
  // an order that triggers server-side PDF generation).
  const performSave=useCallback(async()=>{
    if (isOrdered) { dirtyPages.current.clear(); setSaveStatus('saved'); return; }
    setSaveStatus('saving');
    const token=getToken();
    const toSave=Array.from(dirtyPages.current); dirtyPages.current.clear();
    if (!toSave.length) { setSaveStatus('saved'); return; }
    const cur=liveContent.current;
    const pagesPayload=toSave.map(pid=>({id:pid,contentJson:JSON.stringify(cur[pid]||[])}));
    try {
      const r=await fetch(`/api/projects/${projectId}/auto-save`,{
        method:'POST',
        headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify({pagesJson:JSON.stringify(pagesPayload)}),
        keepalive:true,
      });
      if (!r.ok) {
        const body=await r.json().catch(()=>({}));
        throw new Error((body as any)?.error || `Save failed (${r.status})`);
      }
      setSaveStatus('saved');
    } catch(e){
      console.error('auto-save failed',e);
      // Put the pages back so the next save attempt (debounced or flushed)
      // retries them instead of silently dropping the edit.
      toSave.forEach(pid=>dirtyPages.current.add(pid));
      setSaveStatus('unsaved');
      throw e;
    }
  },[projectId,getToken,isOrdered]);

  const triggerSave=useCallback(()=>{
    if (isOrdered) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('unsaved');
    saveTimer.current=setTimeout(()=>{ performSave(); },1500);
  },[performSave,isOrdered]);

  // Cancels any pending debounce and saves immediately, awaited. Call this
  // before any action whose result depends on the DB's contentJson being
  // current — most importantly placing an order, since that triggers
  // server-side PDF rendering straight from the database.
  const flushSave=useCallback(async()=>{
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current=undefined; }
    if (!dirtyPages.current.size) return;
    await performSave();
  },[performSave]);
  flushSaveRef.current=flushSave;

  const undo=useCallback(()=>{
    if (isOrdered) return;
    if (!historyRef.current.length) return;
    const stack=[...historyRef.current];
    const restored=stack.pop()!;
    historyRef.current=stack; setHistoryLen(stack.length); persistHistory(stack);
    // Stash what's currently on the canvas so redo can bring it back.
    const redoStack=[...redoRef.current,liveContent.current].slice(-MAX_HISTORY);
    redoRef.current=redoStack; setRedoLen(redoStack.length); persistRedo(redoStack);
    liveContent.current=restored;
    setPagesContent(restored);
    // Mark all restored pages dirty so they get saved to the server.
    Object.keys(restored).forEach(pid=>dirtyPages.current.add(Number(pid)));
    triggerSave();
  },[persistHistory,persistRedo,triggerSave,isOrdered]);
  // Keep the stable keyboard-handler ref in sync every render.
  undoRef.current=undo;

  // Stable ref so the keyboard handler can call redo without it being in deps.
  const redoRefFn=useRef<()=>void>(()=>{});

  const redo=useCallback(()=>{
    if (isOrdered) return;
    if (!redoRef.current.length) return;
    const stack=[...redoRef.current];
    const restored=stack.pop()!;
    redoRef.current=stack; setRedoLen(stack.length); persistRedo(stack);
    // Put the state we're leaving back onto the undo stack, so undo can
    // reverse this redo too.
    const undoStack=[...historyRef.current,liveContent.current].slice(-MAX_HISTORY);
    historyRef.current=undoStack; setHistoryLen(undoStack.length); persistHistory(undoStack);
    liveContent.current=restored;
    setPagesContent(restored);
    Object.keys(restored).forEach(pid=>dirtyPages.current.add(Number(pid)));
    triggerSave();
  },[persistHistory,persistRedo,triggerSave,isOrdered]);
  redoRefFn.current=redo;

  const updatePage=useCallback((pid:number,els:EditorElement[])=>{
    if (isOrdered) return;
    pushHistory();
    const next={...liveContent.current,[pid]:els};
    liveContent.current=next;
    setPagesContent(next); dirtyPages.current.add(pid); triggerSave();
  },[triggerSave,pushHistory,isOrdered]);

  // Batch-update multiple pages in one history entry + one save tick.
  const batchUpdatePages=useCallback((updates:Record<number,EditorElement[]>)=>{
    if (isOrdered) return;
    pushHistory();
    const next={...liveContent.current,...updates};
    liveContent.current=next;
    setPagesContent(next);
    Object.keys(updates).forEach(pid=>dirtyPages.current.add(Number(pid)));
    triggerSave();
  },[triggerSave,pushHistory,isOrdered]);

  const changeEl=useCallback((pid:number,eid:string,changes:Partial<EditorElement>)=>{
    if (isOrdered) return;
    const wasGesture=gestureHistoryRef.current;
    if (wasGesture) gestureHistoryRef.current=false;
    else pushHistory();
    const prev=liveContent.current;
    const els=prev[pid]??[];
    const next={...prev,[pid]:els.map(e=>e.id===eid?{...e,...changes}:e)};
    liveContent.current=next;
    dirtyPages.current.add(pid);
    // Position/size commits after drag: sync update (node already at final place).
    // Toolbar text tweaks can be deferred.
    const isGeom='x' in changes||'y' in changes||'w' in changes||'h' in changes||'rotation' in changes
      ||'cropFocusX' in changes||'cropFocusY' in changes||'cropZoom' in changes;
    if (isGeom||wasGesture) setPagesContent(next);
    else startTransition(()=>setPagesContent(next));
    // Sync undo/redo button counts deferred from silent drag-start snapshot.
    if (wasGesture) {
      setHistoryLen(historyRef.current.length);
      setRedoLen(redoRef.current.length);
    }
    triggerSave();
  },[triggerSave,pushHistory,isOrdered]);

  const deleteSelected=useCallback(()=>{
    if (isOrdered || !selectedId||!activePageId) return;
    // Read from the live ref so pagesContent is not in the dep array — otherwise
    // this callback would be recreated on every element edit, breaking memo.
    const els = liveContent.current[activePageId]??[];
    const target = els.find(e => e.id === selectedId);
    if (!target || target.type === 'background') return;
    updatePage(activePageId, els.filter(e=>e.id!==selectedId));
    setSelectedId(null);
  },[selectedId,activePageId,updatePage,isOrdered]);

  const upload=useCallback(async(file:File)=>{
    if (isOrdered) return;
    setUploading(true);
    try {
      const compressed=await compressImageFile(file);
      const token=getToken(); const fd=new FormData(); fd.append('file',compressed);
      const r=await fetch('/api/uploads/image',{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body:fd});
      if (!r.ok) throw new Error(await r.text());
      const data=await r.json(); if (data.url) setPhotos(prev=>[data.url,...prev]);
    } catch(e){
      console.error('Upload failed',e);
      alert(e instanceof ImageTooLargeError?e.message:(lang==='sq'?'Ngarkimi dështoi.':'Upload failed.'));
    } finally{setUploading(false);}
  },[getToken,lang,isOrdered]);

  const addPhoto=useCallback((url:string)=>{
    if (isOrdered || !activePageId) return;
    // Read from the live ref to avoid pagesContent in deps (which would cause
    // this callback to be recreated on every element edit, breaking memo).
    const els=liveContent.current[activePageId]??[];
    // Replace selected image (reset crop focus for the new asset).
    const selImg=els.find(e=>e.id===selectedId&&e.type==='image'&&!!e.src);
    if (selImg){
      updatePage(activePageId,els.map(e=>e.id===selImg.id
        ?{...e,src:url,cropFocusX:0.5,cropFocusY:0.5}
        :e));
      return;
    }
    const ph=els.find(e=>e.id===selectedId&&e.type==='placeholder')
           ??els.find(e=>e.type==='placeholder');
    if (ph){
      updatePage(activePageId,els.map(e=>e.id===ph.id
        ?{...e,type:'image' as const,src:url,cropFocusX:0.5,cropFocusY:0.5}
        :e));
      setSelectedId(null);
      return;
    }
    const hasImages=els.some(e=>e.type==='image');
    const el:EditorElement=hasImages
      ?{id:`img-${Date.now()}`,type:'image',src:url,x:50,y:Math.round(60*canvasH/DESIGN_H),w:500,h:Math.round(340*canvasH/DESIGN_H),rotation:0,cropFocusX:0.5,cropFocusY:0.5}
      :{id:`img-${Date.now()}`,type:'image',src:url,x:0,y:0,w:DESIGN_W,h:canvasH,rotation:0,cropFocusX:0.5,cropFocusY:0.5};
    updatePage(activePageId,[...els,el]); setSelectedId(el.id);
  },[activePageId,selectedId,updatePage,canvasH,isOrdered]);

  const applyCoverPatch = useCallback((
    patch: Parameters<typeof applyCoverBackground>[2],
    opts?: { live?: boolean },
  ) => {
    if (isOrdered || !activePageId) return;
    if (opts?.live) {
      beginHistoryGesture();
    } else {
      if (gestureHistoryRef.current) {
        gestureHistoryRef.current = false;
        setHistoryLen(historyRef.current.length);
        setRedoLen(redoRef.current.length);
      } else {
        pushHistory();
      }
    }
    const els = liveContent.current[activePageId] ?? [];
    const nextEls = applyCoverBackground(els, canvasH, patch);
    const next = { ...liveContent.current, [activePageId]: nextEls };
    liveContent.current = next;
    dirtyPages.current.add(activePageId);
    setPagesContent(next);
    triggerSave();
  }, [activePageId, canvasH, beginHistoryGesture, pushHistory, triggerSave, isOrdered]);

  const setCoverColor = useCallback((color: string, opts?: { live?: boolean }) => {
    applyCoverPatch({ mode: 'color', bgColor: color }, opts);
  }, [applyCoverPatch]);

  const setCoverGradient = useCallback((
    from: string, to: string, dir: 'tb' | 'lr' | 'diag', opts?: { live?: boolean },
  ) => {
    applyCoverPatch({
      mode: 'gradient', bgGradientFrom: from, bgGradientTo: to, bgGradientDir: dir,
    }, opts);
  }, [applyCoverPatch]);

  const setCoverPhoto = useCallback((url: string | null) => {
    if (!activePageId) return;
    const els = liveContent.current[activePageId] ?? [];
    if (url === null) {
      const bg = els.find(e => e.type === 'background');
      applyCoverPatch({ mode: 'color', bgColor: bg?.bgColor || '#FFFFFF' });
      return;
    }
    applyCoverPatch({ mode: 'photo', src: url });
  }, [activePageId, applyCoverPatch]);

  const uploadCoverPhoto = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const compressed = await compressImageFile(file);
      const token = getToken();
      const fd = new FormData();
      fd.append('file', compressed);
      const r = await fetch('/api/uploads/image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      if (data.url) {
        setPhotos(prev => [data.url, ...prev]);
        setCoverPhoto(data.url);
      }
    } catch (e) {
      console.error('Cover bg upload failed', e);
      alert(e instanceof ImageTooLargeError ? e.message : (lang === 'sq' ? 'Ngarkimi dështoi.' : 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  }, [getToken, setCoverPhoto, lang]);

  // Upload a file and immediately place it on the active page (used by InlinePhotoPicker)
  const uploadAndPlace=useCallback(async(file:File)=>{
    if (isOrdered) return;
    setUploading(true);
    try {
      const compressed=await compressImageFile(file);
      const token=getToken(); const fd=new FormData(); fd.append('file',compressed);
      const r=await fetch('/api/uploads/image',{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body:fd});
      if (!r.ok) throw new Error(await r.text());
      const data=await r.json();
      if (data.url) {
        setPhotos(prev=>[data.url,...prev]);
        addPhoto(data.url);
        setPickerOpen(false);
      }
    } catch(e){
      console.error('Upload failed',e);
      alert(e instanceof ImageTooLargeError?e.message:(lang==='sq'?'Ngarkimi dështoi.':'Upload failed.'));
    } finally{setUploading(false);}
  },[getToken,addPhoto,lang,isOrdered]);

  const reorderSpreads=useCallback(async(fromIdx:number,toIdx:number)=>{
    if (isOrdered || fromIdx===toIdx||!project?.pages) return;
    // Only inner spreads at index>=2 are reorderable
    if (fromIdx<2||toIdx<2) return;

    // Draggable spreads: all non-solo spreads starting at index 2
    const draggable=spreads.filter((_,i)=>!spreads[i].isSolo&&i>=2);
    const fromDrag=fromIdx-2;
    const toDrag=toIdx-2;
    if (fromDrag<0||fromDrag>=draggable.length||toDrag<0||toDrag>=draggable.length) return;

    // Reorder the draggable array
    const newOrder=[...draggable];
    const [moved]=newOrder.splice(fromDrag,1);
    newOrder.splice(toDrag,0,moved);

    // Assign new pageNumbers starting from 2 (sp1's inner page keeps pageNumber=1)
    const patches:{dbId:number;pageNumber:number}[]=[];
    let pNum=2;
    for (const sp of newOrder) {
      for (const page of [sp.left,sp.right]) {
        if (page?.role==='inner') patches.push({dbId:page.dbId,pageNumber:pNum++});
      }
    }

    // Skip pages that don't change
    const currentNums=Object.fromEntries(
      project.pages.filter((p:any)=>p.pageType==='inner').map((p:any)=>[p.id,p.pageNumber])
    );
    const changed=patches.filter(p=>currentNums[p.dbId]!==p.pageNumber);
    if (!changed.length) return;

    const token=getToken();
    const headers:Record<string,string>={'Content-Type':'application/json'};
    if (token) headers['Authorization']=`Bearer ${token}`;

    await Promise.all(changed.map(p=>
      fetch(`/api/projects/${projectId}/pages/${p.dbId}`,{
        method:'PATCH',headers,body:JSON.stringify({pageNumber:p.pageNumber}),
      })
    ));

    // Keep the viewport following the moved spread
    setSpreadIdx(si=>{
      if (si===fromIdx) return toIdx;
      if (fromIdx<toIdx&&si>fromIdx&&si<=toIdx) return si-1;
      if (fromIdx>toIdx&&si>=toIdx&&si<fromIdx) return si+1;
      return si;
    });

    await refetchProject();
  },[project,spreads,projectId,getToken,refetchProject,isOrdered]);

  const addSpread=useCallback(async()=>{
    if (isOrdered || !project?.pages||addingSpread) return;
    setAddingSpread(true);
    try {
      const token=getToken();
      const headers:Record<string,string>={'Content-Type':'application/json'};
      if (token) headers['Authorization']=`Bearer ${token}`;
      const innerPages=project.pages.filter((p:any)=>p.pageType==='inner');
      const maxInner=innerPages.reduce((m:number,p:any)=>Math.max(m,p.pageNumber),0);
      await Promise.all([
        fetch(`/api/projects/${projectId}/pages`,{method:'POST',headers,body:JSON.stringify({pageNumber:maxInner+1,pageType:'inner'})}),
        fetch(`/api/projects/${projectId}/pages`,{method:'POST',headers,body:JSON.stringify({pageNumber:maxInner+2,pageType:'inner'})}),
      ]);
      const result = await refetchProject();
      // Build spreads from freshly fetched data so we jump to the correct index
      // without relying on a setTimeout racing against React's state update.
      const freshPages = (result.data as any)?.pages ?? [];
      const freshSpreads = buildSpreads(freshPages, lang);
      setSpreadIdx(Math.max(0, freshSpreads.length - 2));
    } catch(e){console.error('Add spread failed',e);}
    finally{setAddingSpread(false);}
  },[project,addingSpread,getToken,projectId,lang,refetchProject,isOrdered]);

  const [deletingSpread,setDeletingSpread]=useState(false);
  const {data:appSettings}=useGetAppSettings();
  const designOverrides = ((appSettings as any)?.designOverrides || {}) as DesignOverrides;
  const customDesigns = parseCustomDesigns((appSettings as any)?.customDesigns);
  const hiddenDesignIds: string[] = (appSettings as any)?.hiddenDesignIds || [];
  const designsCatalog = useMemo(() => {
    const all = buildDesignCatalog(designOverrides, customDesigns);
    if (!hiddenDesignIds.length) return all;
    return all.filter(d => !hiddenDesignIds.includes(d.id));
  }, [designOverrides, customDesigns, hiddenDesignIds]);
  const minInnerPages=Number(bookSize?.minPages)
    || Number((appSettings as any)?.minPages)
    || 30;

  const deleteSpread=useCallback(async(spreadIdx:number)=>{
    if(isOrdered || !project?.pages||deletingSpread) return;
    const sp=spreads[spreadIdx];
    if(!sp||sp.isSolo||spreadIdx<2) return;
    const ids=[sp.left,sp.right].filter((p):p is PageDef=>!!p&&p.role==='inner').map(p=>p.dbId);
    if(!ids.length) return;
    const innerCount=project.pages.filter((p:any)=>p.pageType==='inner').length;
    if(innerCount-ids.length<minInnerPages){
      window.alert(lang==='sq'
        ?`Nuk mund të fshini më shumë — minimumi është ${minInnerPages} faqe.`
        :`Can't delete more — minimum is ${minInnerPages} pages.`);
      return;
    }
    const ok=window.confirm(lang==='sq'
      ?'Fshi këto faqe ekstra?'
      :'Delete these extra pages?');
    if(!ok) return;
    setDeletingSpread(true);
    try{
      const token=getToken();
      const headers:Record<string,string>={};
      if(token) headers['Authorization']=`Bearer ${token}`;
      for(const pageId of ids){
        const r=await fetch(`/api/projects/${projectId}/pages/${pageId}`,{method:'DELETE',headers});
        if(!r.ok) throw new Error(`delete page ${pageId} failed`);
      }
      // Renumber remaining inners so page numbers stay contiguous
      const remaining=project.pages
        .filter((p:any)=>p.pageType==='inner'&&!ids.includes(p.id))
        .sort((a:any,b:any)=>a.pageNumber-b.pageNumber);
      await Promise.all(remaining.map((p:any,i:number)=>
        fetch(`/api/projects/${projectId}/pages/${p.id}`,{
          method:'PATCH',headers:{...headers,'Content-Type':'application/json'},
          body:JSON.stringify({pageNumber:i+1}),
        })
      ));
      const result=await refetchProject();
      const freshPages=(result.data as any)?.pages??[];
      const freshSpreads=buildSpreads(freshPages,lang);
      setSpreadIdx(si=>Math.min(si,Math.max(0,freshSpreads.length-1)));
      setSelectedId(null);
    }catch(e){
      console.error('Delete spread failed',e);
      window.alert(lang==='sq'?'Fshirja e faqeve dështoi.':'Failed to delete pages.');
    }finally{
      setDeletingSpread(false);
    }
  },[project,spreads,deletingSpread,minInnerPages,getToken,projectId,lang,refetchProject,isOrdered]);

  const [editRequestId,setEditRequestId]=useState<string|null>(null);
  const clearEditRequest=useCallback(()=>setEditRequestId(null),[]);

  const addText=useCallback((style?:{fontSize?:number;fontStyle?:string;align?:'left'|'center'|'right'})=>{
    if (isOrdered || !activePageId) return;
    const el:EditorElement={id:`txt-${Date.now()}`,type:'text',
      text:lang==='sq'?'Shto tekstin tënd...':'Your text here...',
      x:60,y:canvasH/2-40,w:DESIGN_W-120,h:100,rotation:0,
      fontSize:style?.fontSize??22,fontFamily:'Georgia, serif',fill:'#1a1a1a',
      align:style?.align??'center',fontStyle:style?.fontStyle??'normal'};
    const els=liveContent.current[activePageId]??[];
    updatePage(activePageId,[...els,el]);
    setSelectedId(el.id);
    setEditRequestId(el.id);
  },[activePageId,lang,updatePage,canvasH,isOrdered]);

  const applyLayout=useCallback((layoutId:string)=>{
    if (isOrdered || !activePageId) return;
    const layout=editorLayouts.find(l=>l.id===layoutId); if(!layout) return;
    const newEls:EditorElement[]=layout.zones.map((z,i)=>({
      id:`${layoutId}-${i}-${Date.now()}`,rotation:z.rotation??0,
      x:z.x*DESIGN_W,y:z.y*canvasH,w:z.w*DESIGN_W,h:z.h*canvasH,
      ...(z.type==='photo'
        ?{type:'placeholder' as const}
        :{type:'text' as const,text:lang==='sq'?'Shto tekstin tënd...':'Your text here...',fontSize:18,fill:'#333',align:'center' as const,fontFamily:'Georgia, serif'}),
    }));
    updatePage(activePageId,newEls); setSelectedId(null);
  },[activePageId,lang,updatePage,canvasH,editorLayouts,isOrdered]);

  const applyDesign=useCallback((design:DesignDef)=>{
    if (isOrdered) return;
    // Collect all page defs from spreads
    const allPages=(spreads.flatMap(s=>[s.left,s.right]).filter(Boolean) as PageDef[]);
    const ts=Date.now();
    const updates:Record<number,EditorElement[]>={};

    const projectSide = (sideEls: typeof design.elements) => {
      const hasCoverArt = sideEls.some((e) => e.type === "image" && !!e.src);
      const coverSource =
        !hasCoverArt && design.thumbPhoto
          ? elementsWithCoverWallpaper(sideEls, design.thumbPhoto)
          : sideEls;
      return scaleElementsToCanvas(coverSource, canvasH);
    };

    const frontProjected = projectSide(designFrontElements(design));
    const backProjected = projectSide(designBackElements(design));

    // Inner pages (and inside linings) are ALWAYS white — never inherit the
    // cover color. Covers keep the design palette; everything else is paper.
    const whiteBg: DE = {
      type: "background",
      x: 0,
      y: 0,
      w: DESIGN_W,
      h: canvasH,
      rotation: 0,
      bgColor: "#FFFFFF",
    };

    for (const page of allPages) {
      if (page.role === "front_cover") {
        updates[page.dbId] = frontProjected.map((el, i) => ({
          ...el,
          id: `${design.id}-front-${page.dbId}-${i}-${ts}`,
        }));
      } else if (page.role === "back_cover") {
        updates[page.dbId] = backProjected.map((el, i) => ({
          ...el,
          id: `${design.id}-back-${page.dbId}-${i}-${ts}`,
        }));
      } else if (page.role === "locked_left" || page.role === "locked_right") {
        updates[page.dbId] = [
          { ...whiteBg, id: `${design.id}-${page.dbId}-bg-${ts}` },
        ];
      } else {
        const current = liveContent.current[page.dbId] ?? [];
        const withoutBg = current.filter((e) => e.type !== "background");
        updates[page.dbId] = [
          { ...whiteBg, id: `${design.id}-${page.dbId}-bg-${ts}` },
          ...withoutBg,
        ];
      }
    }

    batchUpdatePages(updates);
    setSelectedId(null);
    // Persist immediately — don't wait for the 1.5s debounce (user often
    // leaves right after picking a cover like Santorini).
    void flushSave();

    // Brief toast
    const name=design.name[lang]??design.id;
    setDesignToast(name);
    setTimeout(()=>setDesignToast(null),2800);
  },[spreads,batchUpdatePages,lang,canvasH,flushSave,isOrdered]);

  /** Blank-canvas starter: white pages everywhere; gentle cover prompts only. */
  const applyBlankStarter=useCallback(()=>{
    if (isOrdered) return;
    const allPages=(spreads.flatMap(s=>[s.left,s.right]).filter(Boolean) as PageDef[]);
    const ts=Date.now();
    const updates:Record<number,EditorElement[]>={};
    const whiteBg: DE = {
      type: "background", x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0, bgColor: "#FFFFFF",
    };
    const front = scaleElementsToCanvas(blankFrontCoverElements(lang as 'sq'|'en'), canvasH);
    const back = scaleElementsToCanvas(blankBackCoverElements(lang as 'sq'|'en'), canvasH);

    for (const page of allPages) {
      if (page.role === "front_cover") {
        updates[page.dbId] = front.map((el, i) => ({ ...el, id: `blank-front-${page.dbId}-${i}-${ts}` }));
      } else if (page.role === "back_cover") {
        updates[page.dbId] = back.map((el, i) => ({ ...el, id: `blank-back-${page.dbId}-${i}-${ts}` }));
      } else {
        updates[page.dbId] = [
          { ...whiteBg, id: `blank-${page.dbId}-bg-${ts}` },
        ];
      }
    }

    batchUpdatePages(updates);
    setSelectedId(null);
    void flushSave();
  },[spreads,batchUpdatePages,lang,canvasH,flushSave,isOrdered]);

  // Auto-apply a design chosen in the Wizard (first open of a fresh project).
  const pagesLoadedOnce=useRef(false);
  useEffect(()=>{
    if (isOrdered) return;
    if (pagesLoadedOnce.current||autoAppliedRef.current) return;
    if (Object.keys(pagesContent).length===0) return;
    pagesLoadedOnce.current=true;
    const designId=sessionStorage.getItem('wizard_initial_design');
    const consumeKey=`${projectId}:${designId||'none'}`;
    if (consumedWizardDesignKeys.has(consumeKey)) {
      autoAppliedRef.current=true;
      return;
    }
    consumedWizardDesignKeys.add(consumeKey);
    sessionStorage.removeItem('wizard_initial_design');
    autoAppliedRef.current=true;
    const allEmpty=Object.values(pagesContent).every(els=>!els?.length);
    if (!allEmpty) return;
    if (!designId || designId === BLANK_STARTER_ID) {
      applyBlankStarter();
      return;
    }
    const design=designsCatalog.find(d=>d.id===designId);
    if (design) applyDesign(design);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[Object.keys(pagesContent).length,projectId]);

  // Stable callback for MobileSheet — avoids an inline arrow in JSX that would
  // defeat React.memo on MobileSheet and recreate it on every render.
  const requestApplyDesign=useCallback((d:DesignDef)=>{
    if (isOrdered) return;
    setPendingDesign(d);
  },[isOrdered]);

  const confirmApplyDesign=useCallback(()=>{
    if (isOrdered || !pendingDesign) return;
    applyDesign(pendingDesign);
    setPendingDesign(null);
    setShowSheet(false);
  },[pendingDesign,applyDesign,isOrdered]);

  const openPhotos=useCallback(()=>{
    setPickerOpen(true);
  },[]);

  const handleDownloadPDF=useCallback(async()=>{
    if (isOrdered || !project?.pages) return;
    const pages=(project.pages as any[]).map(p=>({
      dbId:p.id as number,
      role:(p.pageType==='inside_cover'?'locked_left':p.pageType==='inside_back_cover'?'locked_right':p.pageType) as string,
      pageNumber:(p.pageNumber??0) as number,
      elements:pagesContent[p.id as number]??(p.contentJson?JSON.parse(p.contentJson):[]),
    }));
    const total=pages.filter(p=>p.role!=='locked_left'&&p.role!=='locked_right').length;
    setPdfProgress({current:0,total});
    try {
      await generatePDF(pages,project.title||'album',(current,t)=>setPdfProgress({current,total:t}),
        bookSize?{widthCm:Number(bookSize.widthCm),heightCm:Number(bookSize.heightCm)}:undefined);
    } finally {
      setPdfProgress(null);
    }
  },[project,pagesContent,bookSize,isOrdered]);

  if (authLoading || isLoading || (projectQueryEnabled && !project && !isError)) return (
    <div className="flex flex-col" style={{height:'100dvh',overflow:'hidden',background:'#F4F1EC'}}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-3 md:px-5 bg-white border-b border-neutral-200 flex-shrink-0" style={{height:64}}>
        <div className="flex items-center gap-2.5">
          <div style={{width:32,height:32,borderRadius:8,background:'#E8E5E0'}}/>
          <div style={{width:110,height:13,borderRadius:6,background:'#E8E5E0'}}/>
        </div>
        <div className="flex items-center gap-2">
          {[72,56,56].map((w,i)=><div key={i} style={{width:w,height:32,borderRadius:999,background:'#E8E5E0'}}/>)}
        </div>
      </div>
      {/* Canvas skeleton */}
      <div className="flex-1 flex items-center justify-center" style={{padding:'24px 16px'}}>
        <div style={{
          width:'min(340px,90vw)',aspectRatio:'3/4',borderRadius:4,
          background:'linear-gradient(135deg,#E8E5E0 0%,#EDE9E3 50%,#E8E5E0 100%)',
          boxShadow:'0 20px 60px rgba(0,0,0,0.18)',
          animation:'skelPulse 1.6s ease-in-out infinite',
        }}/>
      </div>
      {/* Bottom nav skeleton */}
      <div className="flex items-center gap-2 border-t border-neutral-200 flex-shrink-0" style={{height:68,background:'#F5F2EE',padding:'0 12px'}}>
        {[28,...Array(5).fill(50),28].map((w,i)=><div key={i} style={{width:w,height:42,borderRadius:3,background:'#E4E0D8',flexShrink:0}}/>)}
      </div>
      <style>{`@keyframes skelPulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>
    </div>
  );
  if (!isAuthenticated || isError||!project) return (
    <div className="h-screen flex items-center justify-center" style={{background:'#F4F1EC'}}>
      <div className="text-center">
        <p className="text-neutral-500 mb-4">{lang==='sq'?'Albumi nuk u gjet.':'Project not found.'}</p>
        <Link href="/projektet"><button className="px-4 py-2 bg-neutral-900 text-white rounded-full text-sm">← {lang==='sq'?'Mbrapa':'Back'}</button></Link>
      </div>
    </div>
  );

  const saveLabel=saveStatus==='saving'?'⏳ Saving…':saveStatus==='unsaved'?'● Unsaved':'✓ Saved';

  return (
    <div className="flex flex-col" style={{height:'100dvh',overflow:'hidden',background:'#F4F1EC'}}>
      {/* Design-applied toast */}
      {designToast && (
        <div style={{
          position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',
          background:'rgba(20,18,14,0.92)',color:'rgba(255,255,255,0.90)',
          padding:'9px 20px',borderRadius:40,fontSize:12,letterSpacing:'0.04em',
          pointerEvents:'none',zIndex:9999,whiteSpace:'nowrap',
          boxShadow:'0 4px 24px rgba(0,0,0,0.28)',backdropFilter:'blur(8px)',
        }}>
          ✓&ensp;{lang==='sq'?`"${designToast}" u aplikua`:`"${designToast}" applied`}
        </div>
      )}

      <AlertDialog open={!!pendingDesign} onOpenChange={(open)=>{ if (!open) setPendingDesign(null); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('editor.designConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">{t('editor.designConfirm.body')}</span>
              {pendingDesign && (
                <span className="block text-neutral-700 font-medium">
                  {pendingDesign.name[lang] ?? pendingDesign.id}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('editor.designConfirm.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyDesign}>
              {t('editor.designConfirm.apply')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ── Collapsible header wrapper (mobile: 64 px; desktop: 54 px) ── */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{
          height: isMobile ? (headerCollapsed ? 0 : 64) : 54,
          transition: 'height 0.22s cubic-bezier(0.4,0,0.2,1)',
          background: '#fff',
        }}
      >
      <div className="flex items-center justify-between px-3 md:px-5 bg-white border-b border-neutral-200"
        style={{height: isMobile ? 64 : 54}}
        onTouchStart={isMobile ? e=>{headerSwipeRef.current={y:e.touches[0].clientY};} : undefined}
        onTouchEnd={isMobile ? e=>{
          if(!headerSwipeRef.current) return;
          const dy=e.changedTouches[0].clientY-headerSwipeRef.current.y;
          headerSwipeRef.current=null;
          if(dy<-28) setHeaderCollapsed(true);
        } : undefined}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/projektet">
            <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 flex-shrink-0"><ArrowLeft size={18}/></button>
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 truncate leading-tight">{project.title||'My Album'}</p>
            <p className="text-[10px] text-neutral-400 leading-tight">{saveLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={isOrdered || historyLen===0}
            title={lang==='sq'?`Zhbëj (${historyLen} hapa)`:`Undo (${historyLen} steps)`}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-full text-xs font-medium border transition-all ${
              historyLen>0
                ? 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                : 'bg-white text-neutral-300 border-neutral-100 cursor-not-allowed'
            }`}>
            <Undo2 size={13}/>
            {historyLen>0 && <span className="hidden md:inline tabular-nums">{historyLen}</span>}
          </button>
          <button
            onClick={redo}
            disabled={isOrdered || redoLen===0}
            title={lang==='sq'?`Ribëj (${redoLen} hapa)`:`Redo (${redoLen} steps)`}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-full text-xs font-medium border transition-all ${
              redoLen>0
                ? 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                : 'bg-white text-neutral-300 border-neutral-100 cursor-not-allowed'
            }`}>
            <Undo2 size={13} className="scale-x-[-1]"/>
            {redoLen>0 && <span className="hidden md:inline tabular-nums">{redoLen}</span>}
          </button>
          {!isOrdered && (
          <button
            onClick={handleDownloadPDF}
            disabled={!!pdfProgress}
            title={lang==='sq'?'Shkarko PDF':'Download PDF'}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed">
            {pdfProgress ? <Loader2 size={13} className="animate-spin"/> : <FileDown size={13}/>}
            <span>PDF</span>
          </button>
          )}
          <button
            onClick={()=>setShow3D(v=>!v)}
            title={lang==='sq'?'Pamje 3D':'3D View'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all ${
              show3D
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
            }`}>
            <Box size={13}/><span>3D</span>
          </button>
          {isOrdered ? (
            <div
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
              title={lang==='sq'?'Ky album është porositur — vetëm pamje':'This album is ordered — view only'}
            >
              <Lock size={13}/>
              <span>{lang==='sq'?'Porositur':'Ordered'}</span>
            </div>
          ) : (
          <button
            onClick={async()=>{
              if (emptyInnerPages.length>0){setEmptyPagesWarn(emptyInnerPages);return;}
              await flushSave();
              setShowOrder(true);
            }}
            disabled={emptyInnerPages.length>0}
            title={
              emptyInnerPages.length>0
                ? (lang==='sq'
                    ? `Mbush faqet bosh (${emptyInnerPages.map(n=>`F${n}`).join(', ')}) përpara se të porosisësh`
                    : `Fill empty pages (${emptyInnerPages.map(n=>`P${n}`).join(', ')}) before ordering`)
                : (lang==='sq'?'Porosit':'Order')
            }
            className={`flex items-center gap-2 px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium transition-colors shadow-sm ${
              emptyInnerPages.length>0
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'bg-neutral-900 text-white hover:bg-neutral-700'
            }`}>
            <ShoppingBag size={14}/><span>{lang==='sq'?'Porosit':'Order'}</span>
          </button>
          )}
        </div>
      </div>
      </div>{/* end collapsible header wrapper */}

      {isOrdered && (
        <div className="flex-shrink-0 px-3 md:px-5 py-2 text-center text-[11px] md:text-xs bg-amber-50 text-amber-900 border-b border-amber-100">
          {lang==='sq'
            ? 'Ky album është porositur. Ndryshimet nuk lejohen — mund ta shikoni vetëm.'
            : 'This album has been ordered. Editing is locked — view only.'}
        </div>
      )}

      {/* Pull-down handle — slides in when header is hidden on mobile */}
      {isMobile && (
        <div
          className="flex-shrink-0 flex items-center justify-center bg-white cursor-pointer overflow-hidden"
          style={{
            height: headerCollapsed ? 20 : 0,
            borderBottom: headerCollapsed ? '1px solid #EEEBE6' : 'none',
            transition: 'height 0.22s cubic-bezier(0.4,0,0.2,1)',
          }}
          onClick={()=>setHeaderCollapsed(false)}
          onTouchStart={e=>{headerSwipeRef.current={y:e.touches[0].clientY};}}
          onTouchEnd={e=>{
            if(!headerSwipeRef.current) return;
            const dy=e.changedTouches[0].clientY-headerSwipeRef.current.y;
            headerSwipeRef.current=null;
            if(dy>18) setHeaderCollapsed(false);
          }}
        >
          <div style={{width:34,height:3,borderRadius:2,background:'#C8C4BB'}}/>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {!isMobile && !isOrdered && (
          <Sidebar tab={tab} onTab={setTab} photos={photos} onUpload={upload} uploading={uploading}
            onAddPhoto={addPhoto} onAddText={addText} onLayout={applyLayout} onApplyDesign={requestApplyDesign}
            selectedId={selectedIsBackground ? null : selectedId} onDelete={deleteSelected} lang={lang}
            designs={designsCatalog} layouts={editorLayouts}/>
        )}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Mobile mini spread — open-book preview; tap a side to edit it */}
          {isMobile && currentSpread && !currentSpread.isSolo && (
            <div
              className="flex-shrink-0 flex items-center justify-center border-b border-neutral-100"
              style={{
                padding: '6px 12px 8px',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F7F4EF 100%)',
              }}
            >
              {(() => {
                const thumbH = 44;
                const thumbW = Math.round(thumbH * (DESIGN_W / canvasH));
                const sides = (['left', 'right'] as const).map((side) => {
                  const page = side === 'left' ? currentSpread.left : currentSpread.right;
                  const locked = page?.role === 'locked_left' || page?.role === 'locked_right';
                  // Numbers only under the art — no "Left/Right" overlay on the thumb
                  const label = locked
                    ? ''
                    : page?.pageNumber != null
                      ? String(page.pageNumber)
                      : '·';
                  return { side, page, locked, label, active: activeSide === side };
                });
                return (
                  <div
                    role="tablist"
                    aria-label={lang === 'sq' ? 'Faqet e hapura' : 'Open spread'}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      borderRadius: 6,
                      boxShadow: '0 1px 2px rgba(40,32,20,0.06), 0 6px 16px rgba(40,32,20,0.08)',
                      background: '#EDE8E0',
                      padding: 3,
                    }}
                  >
                    {sides.map(({ side, page, locked, label, active }, i) => (
                      <button
                        key={side}
                        type="button"
                        role="tab"
                        disabled={!page}
                        aria-selected={active}
                        aria-label={
                          locked
                            ? (side === 'left'
                              ? (lang === 'sq' ? 'Kopertina e brendshme' : 'Inside cover')
                              : (lang === 'sq' ? 'Pas e brendshme' : 'Inside back'))
                            : page?.pageNumber != null
                              ? (lang === 'sq' ? `Faqja ${page.pageNumber}` : `Page ${page.pageNumber}`)
                              : side === 'left'
                                ? (lang === 'sq' ? 'Faqja majtas' : 'Left page')
                                : (lang === 'sq' ? 'Faqja djathtas' : 'Right page')
                        }
                        onClick={() => {
                          if (!page) return;
                          setActiveSide(side);
                          setSelectedId(null);
                        }}
                        className="flex flex-col items-center disabled:opacity-40 active:opacity-90"
                        style={{
                          width: thumbW + 6,
                          padding: '2px 3px 4px',
                          border: 'none',
                          background: active ? '#FFFFFF' : 'transparent',
                          borderRadius: i === 0 ? '4px 1px 1px 4px' : '1px 4px 4px 1px',
                          boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          transition: 'background 0.18s ease, box-shadow 0.18s ease',
                          WebkitTapHighlightColor: 'transparent',
                          cursor: page ? 'pointer' : 'default',
                        }}
                      >
                        <div
                          style={{
                            width: thumbW,
                            height: thumbH,
                            borderRadius: side === 'left' ? '2px 0 0 2px' : '0 2px 2px 0',
                            overflow: 'hidden',
                            position: 'relative',
                            opacity: active ? 1 : 0.55,
                            outline: active ? '1.5px solid #C09A55' : '1px solid rgba(0,0,0,0.08)',
                            outlineOffset: -1,
                            transition: 'opacity 0.18s ease',
                            background: '#F3EEE6',
                          }}
                        >
                          {!page ? null : locked ? (
                            <div style={{
                              width: '100%', height: '100%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: '#FAFAF8',
                              backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.05) 3px,rgba(0,0,0,0.05) 4px)',
                            }}>
                              <Lock size={11} strokeWidth={1.75} color="#A89F92" />
                            </div>
                          ) : (
                            <PageThumb
                              elements={spreadContent[page.dbId] ?? []}
                              width={thumbW}
                              height={thumbH}
                              canvasH={canvasH}
                            />
                          )}
                        </div>
                        <span
                          style={{
                            marginTop: 4,
                            minHeight: 9,
                            fontSize: 9,
                            lineHeight: 1,
                            fontWeight: active ? 700 : 500,
                            letterSpacing: '0.02em',
                            color: active ? '#9A7A3E' : '#A39A8E',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {label || '\u00A0'}
                        </span>
                        <span
                          aria-hidden
                          style={{
                            marginTop: 3,
                            width: active ? 12 : 0,
                            height: 2,
                            borderRadius: 1,
                            background: 'linear-gradient(90deg,#C09A55,#E0BB7A)',
                            transition: 'width 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                          }}
                        />
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Canvas area — page swipe handled on Konva stage (PageCanvas) */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <AnimatePresence initial={false}>
              {!isMobile && !isOrdered && selectedIsBackground && coverBgDockSide === 'left' && (
                <CoverBackgroundDock
                  key="cover-bg-dock-left"
                  side="left"
                  bg={activeCoverBg}
                  photos={photos}
                  uploading={uploading}
                  lang={lang}
                  onClose={() => setSelectedId(null)}
                  onSetColor={setCoverColor}
                  onSetGradient={setCoverGradient}
                  onSetPhoto={setCoverPhoto}
                  onUploadPhoto={uploadCoverPhoto}
                />
              )}
            </AnimatePresence>
            <div ref={canvasRef}
              className="flex-1 min-h-0 flex items-center justify-center min-w-0"
              style={isMobile
                ? {overflow:'hidden',padding:'12px',touchAction:'pan-y'}
                : {padding:'32px 40px',overflowY:'auto',display:'flex',alignItems:'center',justifyContent:'center',touchAction:'pan-y'}}>
              {currentSpread ? (
                <SpreadView spread={currentSpread} spreadContent={spreadContent}
                  selectedId={selectedId} activeSide={activeSide}
                  onActiveSide={setActiveSide}
                  onSelectId={setSelectedId} onChangeEl={changeEl} onOpenPhotos={openPhotos} onDelete={deleteSelected}
                  onGestureStart={beginHistoryGesture}
                  onElementDragActive={onElementDragActive}
                  onPageSwipe={isMobile ? onPageSwipe : undefined}
                  editRequestId={editRequestId} onEditRequestHandled={clearEditRequest}
                  pageW={pageW} pageH={pageH} canvasH={canvasH} shapeRefs={shapeRefs} isMobile={isMobile}
                  readOnly={isOrdered}/>
              ) : <p className="text-neutral-400 text-sm">No pages found</p>}
            </div>
            <AnimatePresence initial={false}>
              {!isMobile && !isOrdered && selectedIsBackground && coverBgDockSide === 'right' && (
                <CoverBackgroundDock
                  key="cover-bg-dock-right"
                  side="right"
                  bg={activeCoverBg}
                  photos={photos}
                  uploading={uploading}
                  lang={lang}
                  onClose={() => setSelectedId(null)}
                  onSetColor={setCoverColor}
                  onSetGradient={setCoverGradient}
                  onSetPhoto={setCoverPhoto}
                  onUploadPhoto={uploadCoverPhoto}
                />
              )}
            </AnimatePresence>
          </div>
          <SpreadNav spreads={spreads} current={spreadIdx}
            onChange={onSpreadChange}
            onAddSpread={addSpread} addingSpread={addingSpread}
            onReorder={reorderSpreads}
            onDeleteSpread={deleteSpread} deletingSpread={deletingSpread}
            pagesContent={deferredPagesContent} canvasH={canvasH} lang={lang}
            readOnly={isOrdered}/>
          {isMobile && !isOrdered && (
            <div className="flex items-center border-t border-neutral-200 bg-white py-1 px-1 flex-shrink-0" style={{gap:2}}>
              {([
                {id:'designs',Icon:Wand2,         label:lang==='sq'?'Dizajne':'Style'},
                {id:'layouts',Icon:LayoutTemplate, label:lang==='sq'?'Paraqitje':'Layout'},
                {id:'photos', Icon:ImageIcon,      label:lang==='sq'?'Foto':'Photos'},
                {id:'text',   Icon:Type,           label:lang==='sq'?'Tekst':'Text'},
              ] as const).map(({id,Icon,label})=>(
                <button key={id} onClick={()=>{setTab(id);setShowSheet(true);}}
                  className={`flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-xl text-[10px] transition-colors ${tab===id&&showSheet?'text-neutral-900 bg-neutral-100':'text-neutral-400'}`}>
                  <Icon size={20}/>{label}
                </button>
              ))}
              <button onClick={deleteSelected} disabled={!selectedId || selectedIsBackground}
                className={`flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-xl text-[10px] transition-colors ${selectedId && !selectedIsBackground?'text-red-400 active:bg-red-50':'text-neutral-200 pointer-events-none'}`}>
                <Trash2 size={20}/>{lang==='sq'?'Fshi':'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isMobile && !isOrdered && <MobileSheet tab={tab} show={showSheet} onClose={()=>setShowSheet(false)}
        photos={photos} onUpload={upload} uploading={uploading}
        onAddPhoto={addPhoto} onLayout={applyLayout} onAddText={addText}
        onApplyDesign={requestApplyDesign} lang={lang} designs={designsCatalog} layouts={editorLayouts}/>}

      {isMobile && !isOrdered && (
        <CoverBgMobileSheet
          show={selectedIsBackground}
          onClose={() => setSelectedId(null)}
          bg={activeCoverBg}
          photos={photos}
          uploading={uploading}
          lang={lang}
          onSetColor={setCoverColor}
          onSetGradient={setCoverGradient}
          onSetPhoto={setCoverPhoto}
          onUploadPhoto={uploadCoverPhoto}
        />
      )}

      {pickerOpen && !isOrdered && (
        <InlinePhotoPicker
          photos={photos}
          onSelect={url=>{addPhoto(url);setPickerOpen(false);}}
          onUploadAndPlace={uploadAndPlace}
          uploading={uploading}
          onClose={()=>setPickerOpen(false)}
          lang={lang}
        />
      )}

      <AnimatePresence>
        {showOrder && !isOrdered && <OrderModal key="ord" project={project} onClose={()=>setShowOrder(false)} lang={lang} flushSave={flushSave}/>}
      </AnimatePresence>

      {/* PDF generation progress overlay */}
      <AnimatePresence>
        {pdfProgress && (
          <motion.div key="pdf-progress" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.55)'}}>
            <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}}
              className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-5 mx-4" style={{minWidth:260}}>
              <FileDown size={32} className="text-neutral-400"/>
              <div className="text-center">
                <p className="font-semibold text-neutral-800 text-base mb-1">
                  {lang==='sq'?'Duke gjeneruar PDF…':'Generating PDF…'}
                </p>
                <p className="text-sm text-neutral-400">
                  {lang==='sq'?`Faqja ${pdfProgress.current} nga ${pdfProgress.total}`:`Page ${pdfProgress.current} of ${pdfProgress.total}`}
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-neutral-800 rounded-full transition-all duration-300"
                  style={{width:`${pdfProgress.total>0?(pdfProgress.current/pdfProgress.total)*100:0}%`}}/>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty pages warning */}
      <AnimatePresence>
        {emptyPagesWarn.length>0 && (
          <motion.div key="empty-warn" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}}>
            <motion.div initial={{y:60,opacity:0}} animate={{y:0,opacity:1}} exit={{y:60,opacity:0}}
              className="bg-white w-full md:max-w-sm md:rounded-2xl rounded-t-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⚠️</span>
                <h3 className="font-semibold text-neutral-800 text-base">
                  {lang==='sq'?`${emptyPagesWarn.length} faqe bosh`:`${emptyPagesWarn.length} empty page${emptyPagesWarn.length!==1?'s':''}`}
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {emptyPagesWarn.map(n=>(
                  <span key={n} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                    {lang==='sq'?`F${n}`:`P${n}`}
                  </span>
                ))}
              </div>
              <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
                {lang==='sq'
                  ? 'Çdo faqe e brendshme duhet të ketë foto ose tekst përpara se të porosisësh. Kopertinat dhe faqet e mbyllura nuk llogariten.'
                  : 'Every inner page needs a photo or text before you can order. Covers and locked pages are ignored.'}
              </p>
              <button onClick={()=>setEmptyPagesWarn([])}
                className="w-full py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium active:bg-neutral-700 transition-colors">
                {lang==='sq'?'Kthehu te albumi':'Back to album'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {show3D && (
          <motion.div key="3d" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}}>
            <React.Suspense fallback={
              <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.85)'}}>
                <Loader2 size={32} className="animate-spin text-white opacity-60"/>
              </div>
            }>
              <Book3DViewer
                project={project}
                pagesContent={pagesContent}
                spreads={spreads as any}
                onClose={()=>setShow3D(false)}
                lang={lang}
                canvasH={canvasH}
              />
            </React.Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
