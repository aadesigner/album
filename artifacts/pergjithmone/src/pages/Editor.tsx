import React, { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue, startTransition } from 'react';
import { Stage, Layer, Rect, Text as KonvaText, Image as KonvaImage, Transformer } from 'react-konva';
import { useGetProject, useCreateOrder, useGetOrderWhatsapp, useListBookSizes, getGetProjectQueryKey, getGetOrderWhatsappQueryKey, getListProjectsQueryKey } from '@workspace/api-client-react-tsconfig';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ShoppingBag, LayoutTemplate, Image as ImageIcon, Type,
  Trash2, Check, X, Plus, Camera, Lock, Loader2, Wand2, Box, Undo2, FileDown,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { generatePDF } from '@/lib/generatePDF';
import { Link, useRoute } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
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
} from '@/lib/designs';
export type { EditorElement, DE, DesignDef, LayoutZone, LayoutDef } from '@/lib/designs';
import {
  DESIGN_W, DESIGN_H, LAYOUTS, DESIGNS, CATEGORY_LABELS, LAYOUT_CATEGORY_LABELS,
  getCanvasHeight, scaleElementsToCanvas,
  type EditorElement, type DE, type DesignDef, type LayoutZone,
} from '@/lib/designs';
import { PageThumb } from '@/components/PageThumb';
import { compressImageFile, ImageTooLargeError } from '@/lib/imageCompression';

const PAPER_COLOR = '#FEFDF9';
const SPINE_W = 1;
const PAPER_TEXTURE = `url("data:image/svg+xml,<svg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>")`;

/** Live clamp while dragging so elements don't jump on release. */
function dragBoundBox(pos: { x: number; y: number }, w: number, h: number, canvasH: number) {
  const maxX = Math.max(0, DESIGN_W - w);
  const maxY = Math.max(0, canvasH - h);
  return {
    x: Math.min(Math.max(pos.x, 0), maxX),
    y: Math.min(Math.max(pos.y, 0), maxY),
  };
}

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
  { label: 'Dancing',    value: "'Dancing Script', cursive" },
  { label: 'Vibes',      value: "'Great Vibes', cursive" },
  { label: 'Pacifico',   value: "'Pacifico', cursive" },
];

// Preset text colours shown in the inline toolbar
const TEXT_COLORS = [
  '#FFFFFF','#1A1A1A','#555555','#AAAAAA',
  '#D4AF37','#E63946','#457B9D','#2A9D8F','#F4A261',
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

function KBgEl({el,canvasH}: {el: EditorElement; canvasH:number}) {
  if (el.bgGradientFrom) {
    const ep = el.bgGradientDir==='lr' ? {x:DESIGN_W,y:0}
             : el.bgGradientDir==='diag' ? {x:DESIGN_W,y:canvasH}
             : {x:0,y:canvasH};
    return <Rect x={0} y={0} width={DESIGN_W} height={canvasH}
      fillLinearGradientStartPoint={{x:0,y:0}} fillLinearGradientEndPoint={ep}
      fillLinearGradientColorStops={[0,el.bgGradientFrom,1,el.bgGradientTo||'#fff']} listening={false}/>;
  }
  return <Rect x={0} y={0} width={DESIGN_W} height={canvasH} fill={el.bgColor||PAPER_COLOR} listening={false}/>;
}

function KShapeEl({el,isSelected,onSelect,onChange,onGestureStart,onDragActive,shapeRefs,canvasH}: {
  el: EditorElement; isSelected: boolean; onSelect:()=>void;
  onChange:(c:Partial<EditorElement>)=>void; onGestureStart?:()=>void;
  onDragActive?:(active:boolean)=>void;
  shapeRefs:React.MutableRefObject<Record<string,any>>; canvasH:number;
}) {
  const cr = el.shapeKind==='circle' ? Math.min(el.w,el.h)/2 : (el.cornerRadius??0);
  return <Rect ref={(n:any)=>{if(n) shapeRefs.current[el.id]=n;}}
    x={el.x} y={el.y} width={el.w} height={el.h} fill={el.fill||'transparent'}
    stroke={el.strokeColor} strokeWidth={el.strokeWidth||0} dash={el.strokeDash}
    cornerRadius={cr} rotation={el.rotation} opacity={el.opacity??1}
    perfectDrawEnabled={false}
    onClick={onSelect} onTap={onSelect} draggable={isSelected}
    dragBoundFunc={(pos:any)=>dragBoundBox(pos,el.w,el.h,canvasH)}
    onDragStart={()=>{onGestureStart?.();onDragActive?.(true);}}
    onDragEnd={(e:any)=>{
      onDragActive?.(false);
      const b=dragBoundBox({x:e.target.x(),y:e.target.y()},el.w,el.h,canvasH);
      e.target.position(b); onChange(b);
    }}
    onTransformStart={()=>onGestureStart?.()}
    onTransformEnd={(e:any)=>{
      const n=e.target,sx=n.scaleX(),sy=n.scaleY(); n.scaleX(1); n.scaleY(1);
      const nw=n.width()*sx,nh=n.height()*sy;
      const b=dragBoundBox({x:n.x(),y:n.y()},nw,nh,canvasH);
      n.position(b); onChange({...b,w:nw,h:nh,rotation:n.rotation()});
    }}/>;
}

function KImgEl({el,isSelected,onSelect,onChange,onGestureStart,onDragActive,shapeRefs,canvasH}: {
  el: EditorElement; isSelected:boolean; onSelect:()=>void;
  onChange:(c:Partial<EditorElement>)=>void; onGestureStart?:()=>void;
  onDragActive?:(active:boolean)=>void;
  shapeRefs:React.MutableRefObject<Record<string,any>>; canvasH:number;
}) {
  const [img,setImg]=useState<HTMLImageElement>();
  useEffect(()=>{
    if (!el.src) return;
    const i=new window.Image(); i.crossOrigin='anonymous';
    i.onload=()=>setImg(i); i.src=el.src;
  },[el.src]);

  // object-fit: cover — crop the image so it fills el.w × el.h with no distortion
  const coverCrop = img ? (()=>{
    const sx=el.w/img.naturalWidth, sy=el.h/img.naturalHeight;
    const s=Math.max(sx,sy);          // scale that makes image cover the box
    const cw=el.w/s, ch=el.h/s;      // crop region size in image-space
    return { x:(img.naturalWidth-cw)/2, y:(img.naturalHeight-ch)/2, width:cw, height:ch };
  })() : undefined;

  // A crisp blue outline directly on the photo so selection reads instantly —
  // the Transformer's handles alone are easy to miss on a busy photo.
  const selectionStroke = isSelected
    ? <Rect x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation}
        stroke="#2563EB" strokeWidth={2.5} listening={false} cornerRadius={2}/>
    : null;

  if (!img) return <>
    <Rect x={el.x} y={el.y} width={el.w} height={el.h} fill="#D0C8BC"
      rotation={el.rotation} onClick={onSelect} onTap={onSelect} cornerRadius={2}/>
    {selectionStroke}
  </>;
  return <>
    <KonvaImage ref={(n:any)=>{if(n) shapeRefs.current[el.id]=n;}}
    image={img} x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation}
    crop={coverCrop}
    onClick={onSelect} onTap={onSelect} draggable={isSelected}
    perfectDrawEnabled={false}
    dragBoundFunc={(pos:any)=>dragBoundBox(pos,el.w,el.h,canvasH)}
    onDragStart={()=>{onGestureStart?.();onDragActive?.(true);}}
    onDragEnd={(e:any)=>{
      onDragActive?.(false);
      const b=dragBoundBox({x:e.target.x(),y:e.target.y()},el.w,el.h,canvasH);
      e.target.position(b); onChange(b);
    }}
    onTransformStart={()=>onGestureStart?.()}
    onTransformEnd={(e:any)=>{
      const n=e.target,sx=n.scaleX(),sy=n.scaleY(); n.scaleX(1); n.scaleY(1);
      const nw=Math.max(20,n.width()*sx),nh=Math.max(20,n.height()*sy);
      const b=dragBoundBox({x:n.x(),y:n.y()},nw,nh,canvasH);
      n.position(b); onChange({...b,w:nw,h:nh,rotation:n.rotation()});
    }}/>
    {selectionStroke}
  </>;
}

function KTxtEl({el,onSelect,onChange,onStartEdit,onGestureStart,onDragActive,isEditing,isSelected,shapeRefs,canvasH}: {
  el: EditorElement; onSelect:()=>void; onChange:(c:Partial<EditorElement>)=>void;
  onStartEdit:()=>void; onGestureStart?:()=>void; onDragActive?:(active:boolean)=>void;
  isEditing:boolean; isSelected:boolean;
  shapeRefs:React.MutableRefObject<Record<string,any>>; canvasH:number;
}) {
  return <KonvaText ref={(n:any)=>{if(n) shapeRefs.current[el.id]=n;}}
    text={el.text||'Double-tap to edit'} x={el.x} y={el.y} width={el.w} height={el.h}
    rotation={el.rotation} fontSize={el.fontSize||20} fontFamily={el.fontFamily||'Georgia, serif'}
    fill={el.fill||'#1a1a1a'} align={el.align||'center'} fontStyle={el.fontStyle||'normal'}
    lineHeight={el.lineHeight??1.2} letterSpacing={el.letterSpacing??0} padding={6}
    opacity={isEditing?0:(el.opacity??1)}
    wrap="word" perfectDrawEnabled={false} shadowForStrokeEnabled={false}
    onClick={onSelect} onTap={onSelect} onDblClick={onStartEdit} onDblTap={onStartEdit}
    draggable={isSelected && !isEditing}
    dragBoundFunc={(pos:any)=>dragBoundBox(pos,el.w,el.h,canvasH)}
    onDragStart={()=>{onGestureStart?.();onDragActive?.(true);}}
    onDragEnd={(e:any)=>{
      onDragActive?.(false);
      const b=dragBoundBox({x:e.target.x(),y:e.target.y()},el.w,el.h,canvasH);
      e.target.position(b); onChange(b);
    }}
    onTransformStart={()=>onGestureStart?.()}
    onTransformEnd={(e:any)=>{
      const n=e.target,sx=n.scaleX(); n.scaleX(1); n.scaleY(1);
      const nw=Math.max(50,n.width()*sx);
      const b=dragBoundBox({x:n.x(),y:n.y()},nw,el.h,canvasH);
      n.position(b); onChange({...b,w:nw,rotation:n.rotation()});
    }}/>;
}

function KPlaceholderEl({el,isSelected,onSelect,onOpenPhotos,shapeRefs}: {
  el: EditorElement; isSelected:boolean; onSelect:()=>void; onOpenPhotos?:()=>void;
  shapeRefs:React.MutableRefObject<Record<string,any>>;
}) {
  const handleTap=()=>{ onSelect(); onOpenPhotos?.(); };
  return <>
    <Rect ref={(n:any)=>{if(n) shapeRefs.current[el.id]=n;}}
      x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation}
      fill={isSelected?'#E8E0D5':'#EDE8E0'} stroke={isSelected?'#8B7355':'#C8BDA8'}
      strokeWidth={isSelected?2:1.5} dash={[10,6]} cornerRadius={3}
      onClick={handleTap} onTap={handleTap}/>
    <KonvaText x={el.x} y={el.y+el.h/2-16} width={el.w}
      text="📷  tap to place photo" fontSize={12} fill="#A09080" align="center" listening={false}/>
  </>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Canvas
// ─────────────────────────────────────────────────────────────────────────────

function PageCanvas({page,elements,selectedId,onSelectId,onChangeEl,onOpenPhotos,onDelete,onGestureStart,editRequestId,onEditRequestHandled,isActive,pageW,pageH,canvasH,shapeRefs,side,isMobile}: {
  page:PageDef; elements:EditorElement[]; selectedId:string|null;
  onSelectId:(id:string|null)=>void; onChangeEl:(id:string,c:Partial<EditorElement>)=>void;
  onOpenPhotos?:()=>void; onDelete?:()=>void; onGestureStart?:()=>void;
  editRequestId?:string|null; onEditRequestHandled?:()=>void;
  isActive:boolean; pageW:number; pageH:number; canvasH:number;
  shapeRefs:React.MutableRefObject<Record<string,any>>; side:'left'|'right'|'solo'; isMobile?:boolean;
}) {
  const trRef = useRef<any>(null);
  const scX = pageW/DESIGN_W, scY = pageH/canvasH;

  const [editId,setEditId]=useState<string|null>(null);
  const [editText,setEditText]=useState('');
  const [dragging,setDragging]=useState(false);
  const textareaRef=useRef<HTMLTextAreaElement>(null);
  // The box never shrinks below whatever height it started editing at
  // (the template's design height), but grows to fit longer text.
  const editMinHRef=useRef(0);

  const startEdit=useCallback((el:EditorElement)=>{
    setEditId(el.id); setEditText(el.text||''); editMinHRef.current=el.h; onSelectId(el.id);
  },[onSelectId]);

  const commitEdit=useCallback(()=>{
    setEditId(prev=>{
      if(prev) onChangeEl(prev,{text:editText});
      return null;
    });
  },[editText,onChangeEl]);

  useEffect(()=>{ if(editId) setTimeout(()=>textareaRef.current?.focus(),30); },[editId]);

  // Newly added text opens the editor immediately (desktop + mobile).
  useEffect(()=>{
    if(!editRequestId||!isActive) return;
    const el=elements.find(e=>e.id===editRequestId&&e.type==='text');
    if(!el) return;
    startEdit(el);
    onEditRequestHandled?.();
  },[editRequestId,elements,isActive,startEdit,onEditRequestHandled]);

  useEffect(()=>{
    if (!trRef.current) return;
    const node=(isActive&&selectedId&&selectedId!==editId)?shapeRefs.current[selectedId]:null;
    trRef.current.nodes(node?[node]:[]); trRef.current.getLayer()?.batchDraw();
  },[isActive,selectedId,editId,shapeRefs]);

  const editEl=editId?elements.find(e=>e.id===editId):null;
  const bgs    = elements.filter(e=>e.type==='background');
  const shapes = elements.filter(e=>e.type==='shape');
  const phs    = elements.filter(e=>e.type==='placeholder');
  const imgs   = elements.filter(e=>e.type==='image');
  const txts   = elements.filter(e=>e.type==='text');

  const innerShadow = side==='left'
    ? 'linear-gradient(to left, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.12) 7%, transparent 24%)'
    : side==='right'
    ? 'linear-gradient(to right, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.10) 7%, transparent 24%)'
    : undefined;

  const toolbarEl=editEl?elements.find(e=>e.id===editId):null;
  const isBold=toolbarEl?.fontStyle?.includes('bold')??false;
  const isItalic=toolbarEl?.fontStyle?.includes('italic')??false;
  // Smart panel placement: below the text if room, otherwise above
  const PANEL_W=366; const PANEL_H=90;
  const elBottom=toolbarEl?(toolbarEl.y+toolbarEl.h)*scY:0;
  const elTop=toolbarEl?toolbarEl.y*scY:0;
  const panelShowBelow=toolbarEl&&(elBottom+PANEL_H+10<=pageH);
  const panelTop=toolbarEl?(panelShowBelow?elBottom+8:Math.max(4,elTop-PANEL_H-8)):0;
  const panelLeft=toolbarEl?Math.max(4,Math.min(toolbarEl.x*scX,pageW-PANEL_W-4)):4;

  return (
    <div style={{position:'relative',width:pageW,height:pageH,flexShrink:0}}>
      <Stage width={pageW} height={pageH} scaleX={scX} scaleY={scY}
        pixelRatio={isMobile ? Math.min(window.devicePixelRatio ?? 1, 1.5) : window.devicePixelRatio ?? 1}
        onMouseDown={(e:any)=>{if(e.target===e.target.getStage()){if(editId)commitEdit();onSelectId(null);}}}
        onTouchStart={(e:any)=>{if(e.target===e.target.getStage()){if(editId)commitEdit();onSelectId(null);}}}>
        <Layer>
          <Rect x={0} y={0} width={DESIGN_W} height={canvasH} fill={PAPER_COLOR} listening={false}/>
          {bgs.map(el => <KBgEl key={el.id} el={el} canvasH={canvasH}/>)}
          {shapes.map(el => <KShapeEl key={el.id} el={el} isSelected={selectedId===el.id}
            onSelect={()=>{if(editId)commitEdit();onSelectId(el.id);}}
            onChange={c=>onChangeEl(el.id,c)} onGestureStart={onGestureStart} onDragActive={setDragging}
            shapeRefs={shapeRefs} canvasH={canvasH}/>)}
          {phs.map(el => <KPlaceholderEl key={el.id} el={el} isSelected={selectedId===el.id}
            onSelect={()=>{if(editId)commitEdit();onSelectId(el.id);}} onOpenPhotos={onOpenPhotos} shapeRefs={shapeRefs}/>)}
          {imgs.map(el => <KImgEl key={el.id} el={el} isSelected={selectedId===el.id}
            onSelect={()=>{if(editId)commitEdit();onSelectId(el.id);}}
            onChange={c=>onChangeEl(el.id,c)} onGestureStart={onGestureStart} onDragActive={setDragging}
            shapeRefs={shapeRefs} canvasH={canvasH}/>)}
          {txts.map(el => <KTxtEl key={el.id} el={el} isEditing={editId===el.id}
            isSelected={selectedId===el.id}
            onSelect={()=>{if(editId&&editId!==el.id)commitEdit();onSelectId(el.id);}}
            onChange={c=>onChangeEl(el.id,c)} onGestureStart={onGestureStart} onDragActive={setDragging}
            onStartEdit={()=>startEdit(el)} shapeRefs={shapeRefs} canvasH={canvasH}/>)}
          {page.pageNumber!==undefined && (
            <KonvaText x={0} y={canvasH-26} width={DESIGN_W} text={String(page.pageNumber)}
              align="center" fontSize={9} fill="#C0B8B0" fontFamily="Georgia, serif" listening={false}/>
          )}
          <Transformer ref={trRef} rotateEnabled
            rotationSnaps={[0,45,90,135,180,225,270,315]}
            enabledAnchors={['top-left','top-center','top-right','middle-left','middle-right','bottom-left','bottom-center','bottom-right']}
            boundBoxFunc={(old:any,nw:any)=>(nw.width<10||nw.height<10?old:nw)}
            padding={4}
            borderStroke="#2563EB" borderStrokeWidth={2.5} borderDash={undefined}
            anchorFill="#FFFFFF" anchorStroke="#2563EB" anchorStrokeWidth={2.5}
            anchorSize={11} anchorCornerRadius={6}
            rotateAnchorOffset={26} rotationSnapTolerance={6}
            anchorStyleFunc={(anchor:any)=>{
              // A soft drop-shadow around every handle makes them read clearly
              // against any page background — light paper, dark cover, photo, etc.
              anchor.shadowColor('rgba(15,23,42,0.35)'); anchor.shadowBlur(4);
              anchor.shadowOffsetY(1); anchor.shadowOpacity(1);
              if (anchor.hasName('rotater')) {
                anchor.fill('#2563EB'); anchor.stroke('#FFFFFF'); anchor.strokeWidth(2);
                anchor.width(16); anchor.height(16); anchor.cornerRadius(8); anchor.offsetX(8); anchor.offsetY(8);
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
              fontSize:(editEl.fontSize||20)*scY,
              fontFamily:editEl.fontFamily||'Georgia, serif',
              fontStyle:editEl.fontStyle?.includes('italic')?'italic':'normal',
              fontWeight:editEl.fontStyle?.includes('bold')?'bold':'normal',
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
                value={toolbarEl?.fontFamily||'Georgia, serif'}
                onChange={e=>{onChangeEl(editId,{fontFamily:e.target.value});setTimeout(()=>textareaRef.current?.focus(),20);}}
                style={{flex:1,minWidth:0,fontSize:11,fontFamily:toolbarEl?.fontFamily||'Georgia, serif',
                  border:'1px solid #e8e8e8',borderRadius:7,padding:'4px 7px',
                  background:'#fafafa',cursor:'pointer',outline:'none',color:'#1a1a1a'}}
              >
                {FONTS.map(f=><option key={f.value} value={f.value} style={{fontFamily:f.value}}>{f.label}</option>)}
              </select>
              <span style={{width:1,height:20,background:'#e8e8e8',flexShrink:0}}/>
              {/* Bold */}
              <button onMouseDown={e=>{e.preventDefault();
                const fs=[(!isBold?'bold':''),(isItalic?'italic':'')].filter(Boolean).join(' ')||'normal';
                onChangeEl(editId,{fontStyle:fs});}}
                style={{width:28,height:28,borderRadius:7,border:'none',cursor:'pointer',fontWeight:'bold',
                  fontSize:13,flexShrink:0,transition:'all 0.12s',
                  background:isBold?'#1a1a1a':'#f0f0f0',color:isBold?'#fff':'#555'}}>B</button>
              {/* Italic */}
              <button onMouseDown={e=>{e.preventDefault();
                const fs=[(isBold?'bold':''),(!isItalic?'italic':'')].filter(Boolean).join(' ')||'normal';
                onChangeEl(editId,{fontStyle:fs});}}
                style={{width:28,height:28,borderRadius:7,border:'none',cursor:'pointer',fontStyle:'italic',
                  fontSize:14,flexShrink:0,transition:'all 0.12s',
                  background:isItalic?'#1a1a1a':'#f0f0f0',color:isItalic?'#fff':'#666'}}>I</button>
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

      {/* ── Delete button — hidden while dragging so it doesn't stick at the old spot ── */}
      {isActive && selectedId && !editId && !dragging && (()=>{
        const sel=elements.find(e=>e.id===selectedId&&(e.type==='image'||e.type==='text'||e.type==='placeholder'));
        if (!sel) return null;
        // Position at top-right corner of the element (screen coords)
        const bx=Math.min(Math.max((sel.x+sel.w)*scX, 28), pageW-4);
        const by=Math.max(sel.y*scY-14, 4);
        return (
          <div style={{position:'absolute',left:bx-14,top:by-14,zIndex:45,pointerEvents:'all',display:'flex',gap:5}}>
            {/* Delete */}
            <button
              onMouseDown={e=>{e.stopPropagation();e.preventDefault();onDelete?.();}}
              title="Delete"
              style={{
                width:28,height:28,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.9)',
                background:'rgba(220,38,38,0.88)',color:'white',
                fontSize:13,lineHeight:1,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:'0 2px 10px rgba(0,0,0,0.32)',
                transition:'transform 0.1s,background 0.1s',
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(185,28,28,0.96)';(e.currentTarget as HTMLButtonElement).style.transform='scale(1.12)';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(220,38,38,0.88)';(e.currentTarget as HTMLButtonElement).style.transform='scale(1)';}}
            >✕</button>
          </div>
        );
      })()}

      {innerShadow && <div style={{position:'absolute',inset:0,pointerEvents:'none',background:innerShadow}}/>}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',
        background:'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 20%, rgba(0,0,0,0.022) 100%)'}}/>
      <div style={{position:'absolute',inset:0,pointerEvents:'none',
        backgroundImage:PAPER_TEXTURE,backgroundSize:'256px 256px',
        opacity:0.055,mixBlendMode:'multiply' as any}}/>
      {isActive && <div style={{position:'absolute',inset:0,pointerEvents:'none',
        outline:'2.5px solid rgba(59,130,246,0.65)',outlineOffset:'-1px'}}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Locked page
// ─────────────────────────────────────────────────────────────────────────────

function LockedPageView({pageW,pageH,role,side}: {pageW:number;pageH:number;role:string;side:'left'|'right'}) {
  const shadow=side==='left'
    ?'linear-gradient(to left, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.09) 9%, transparent 25%)'
    :'linear-gradient(to right, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.08) 9%, transparent 25%)';
  return (
    <div style={{position:'relative',width:pageW,height:pageH,flexShrink:0,background:'#F0EBE2'}}>
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.08}}>
        <defs><pattern id="dg" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M-2,2 l4,-4 M0,20 l20,-20 M18,22 l4,-4" stroke="#5a4a3a" strokeWidth="0.6"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#dg)"/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
        <Lock size={18} color="#C0B4A8"/>
        <p style={{fontSize:9,color:'#C0B4A8',textTransform:'uppercase',letterSpacing:'0.18em',fontWeight:500,margin:0}}>
          {role==='locked_left'?'Inside Cover':role==='locked_right'?'Inside Back Cover':role==='back_cover'?'Outside Cover':'Back Cover'}
        </p>
      </div>
      <div style={{position:'absolute',inset:0,pointerEvents:'none',background:shadow}}/>
      <div style={{position:'absolute',inset:0,pointerEvents:'none',
        backgroundImage:PAPER_TEXTURE,backgroundSize:'256px 256px',opacity:0.055,mixBlendMode:'multiply' as any}}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Spread View — realistic book
// ─────────────────────────────────────────────────────────────────────────────

const SpreadView = React.memo(function SpreadView({spread,spreadContent,selectedId,activeSide,onActiveSide,onSelectId,onChangeEl,onOpenPhotos,onDelete,onGestureStart,editRequestId,onEditRequestHandled,pageW,pageH,canvasH,shapeRefs,isMobile}: {
  spread:SpreadDef; spreadContent:Record<number,EditorElement[]>;
  selectedId:string|null; activeSide:'left'|'right'; onActiveSide:(s:'left'|'right')=>void;
  onSelectId:(id:string|null)=>void; onChangeEl:(pid:number,eid:string,c:Partial<EditorElement>)=>void;
  onOpenPhotos?:()=>void; onDelete?:()=>void; onGestureStart?:()=>void;
  editRequestId?:string|null; onEditRequestHandled?:()=>void;
  pageW:number; pageH:number; canvasH:number;
  shapeRefs:React.MutableRefObject<Record<string,any>>; isMobile?:boolean;
}) {
  const effectiveSpineW = SPINE_W;
  const renderSide=(page:PageDef|null,side:'left'|'right')=>{
    if (!page) return <div style={{width:pageW,height:pageH,flexShrink:0,background:'#EAE5DC'}}/>;
    const locked=page.role==='locked_left'||page.role==='locked_right';
    if (locked) return <LockedPageView pageW={pageW} pageH={pageH} role={page.role} side={side}/>;
    return <div style={{cursor:'default'}} onClick={()=>onActiveSide(side)}>
      <PageCanvas page={page} elements={spreadContent[page.dbId]??[]}
        selectedId={selectedId}
        onSelectId={(id)=>{ onActiveSide(side); onSelectId(id); }}
        onChangeEl={(eid,c)=>onChangeEl(page.dbId,eid,c)} onOpenPhotos={onOpenPhotos} onDelete={onDelete}
        onGestureStart={onGestureStart} editRequestId={editRequestId} onEditRequestHandled={onEditRequestHandled}
        isActive={activeSide===side} pageW={pageW} pageH={pageH} canvasH={canvasH} shapeRefs={shapeRefs} side={side} isMobile={isMobile}/>
    </div>;
  };

  if (spread.isSolo) {
    const isBackCover = spread.id === 'back-cover';
    const soloPage = isBackCover ? spread.left! : spread.right!;
    const soloSide = isBackCover ? 'left' : 'right';
    const soloSpineW = isMobile ? 6 : 13;
    const spineGrad = isBackCover
      ? `linear-gradient(to left, #0C0C0C 0%, rgba(22,16,10,0.82) 42%, rgba(22,16,10,0.30) 100%)`
      : `linear-gradient(to right, #0C0C0C 0%, rgba(22,16,10,0.82) 42%, rgba(22,16,10,0.30) 100%)`;

    return (
      <div className="flex items-center justify-center">
        <div style={{boxShadow:'0 30px 80px rgba(0,0,0,0.38), 0 10px 24px rgba(0,0,0,0.22), 0 3px 8px rgba(0,0,0,0.14)'}}>
          <div style={{display:'flex',alignItems:'stretch',outline:`1.5px solid rgba(0,0,0,${isMobile?0.55:0.82})`,outlineOffset:0}}>
            {isBackCover && (
              <>
                <LockedPageView pageW={pageW} pageH={pageH} role="back_cover" side="left"/>
                <div style={{width:soloSpineW,height:pageH,flexShrink:0,background:spineGrad}}/>
              </>
            )}
            {!isBackCover && (
              <div style={{cursor:'default'}} onClick={()=>onActiveSide('right')}>
                <PageCanvas page={soloPage} elements={spreadContent[soloPage.dbId]??[]}
                  selectedId={selectedId} onSelectId={onSelectId}
                  onChangeEl={(eid,c)=>onChangeEl(soloPage.dbId,eid,c)} onOpenPhotos={onOpenPhotos} onDelete={onDelete}
                  onGestureStart={onGestureStart} editRequestId={editRequestId} onEditRequestHandled={onEditRequestHandled}
                  isActive={true} pageW={pageW} pageH={pageH} canvasH={canvasH} shapeRefs={shapeRefs} side="solo" isMobile={isMobile}/>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mobile: show one page at a time using activeSide as the selector
  if (isMobile) {
    const page = activeSide === 'left' ? spread.left : spread.right;
    if (!page) return <div style={{width:pageW,height:pageH,background:'#EAE5DC'}}/>;
    const locked = page.role === 'locked_left' || page.role === 'locked_right';
    return (
      <div className="flex items-center justify-center">
        <div style={{
          boxShadow:'0 28px 72px rgba(0,0,0,0.34), 0 10px 22px rgba(0,0,0,0.20), 0 3px 6px rgba(0,0,0,0.12)',
          outline:'1.5px solid rgba(0,0,0,0.72)',outlineOffset:0,
        }}>
          {locked
            ? <LockedPageView pageW={pageW} pageH={pageH} role={page.role} side={activeSide}/>
            : <PageCanvas page={page} elements={spreadContent[page.dbId]??[]}
                selectedId={selectedId}
                onSelectId={id=>{ onActiveSide(activeSide); onSelectId(id); }}
                onChangeEl={(eid,c)=>onChangeEl(page.dbId,eid,c)}
                onOpenPhotos={onOpenPhotos} onDelete={onDelete}
                onGestureStart={onGestureStart} editRequestId={editRequestId} onEditRequestHandled={onEditRequestHandled}
                isActive={true} pageW={pageW} pageH={pageH} canvasH={canvasH} shapeRefs={shapeRefs} side="solo" isMobile={true}/>
          }
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div style={{boxShadow:'0 28px 72px rgba(0,0,0,0.34), 0 10px 22px rgba(0,0,0,0.20), 0 3px 6px rgba(0,0,0,0.12)'}}>
        <div style={{display:'flex',alignItems:'stretch',outline:'1.5px solid rgba(0,0,0,0.82)',outlineOffset:0}}>
          {renderSide(spread.left,'left')}
          {/* Centre page divider — hairline only */}
          <div style={{width:effectiveSpineW,flexShrink:0,background:'rgba(0,0,0,0.18)'}}/>
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

const SpreadNav = React.memo(function SpreadNav({spreads,current,onChange,onAddSpread,addingSpread,onReorder,pagesContent,canvasH}: {
  spreads:SpreadDef[];current:number;onChange:(i:number)=>void;
  onAddSpread:()=>void;addingSpread:boolean;
  onReorder:(from:number,to:number)=>Promise<void>;
  pagesContent:Record<number,EditorElement[]>;
  canvasH:number;
}) {
  const scrollRef=useRef<HTMLDivElement>(null);
  const [dragIdx,setDragIdx]=useState<number|null>(null);
  const [overIdx,setOverIdx]=useState<number|null>(null);
  const [reordering,setReordering]=useState(false);
  // Refs for touch drag (need stable values in passive-false listener)
  const dragIdxRef=useRef<number|null>(null);
  const overIdxRef=useRef<number|null>(null);
  // Refs for swipe-to-navigate gesture
  const swipeRef=useRef<{x:number;y:number;t:number}|null>(null);

  useEffect(()=>{
    scrollRef.current?.querySelector('[data-cur="true"]')?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
  },[current]);

  // A spread is draggable if it's an inner spread (not solo, not sp1 which has the locked inside-cover)
  const canMove=(i:number)=>!spreads[i].isSolo && i>=2;

  const doReorder=async(from:number,to:number)=>{
    if (from===to||!canMove(from)||!canMove(to)||reordering) return;
    setReordering(true);
    try { await onReorder(from,to); } finally { setReordering(false); }
  };

  // Touch drag — attach non-passive touchmove so we can preventDefault (stop scroll during drag)
  useEffect(()=>{
    const el=scrollRef.current; if(!el) return;
    const onTouchMove=(e:TouchEvent)=>{
      if(dragIdxRef.current===null) return;
      e.preventDefault();
      const touch=e.touches[0];
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

  const handleTouchStart=(i:number)=>{
    if(!canMove(i)) return;
    dragIdxRef.current=i; overIdxRef.current=null;
    setDragIdx(i); setOverIdx(null);
  };
  const handleTouchEnd=()=>{
    const from=dragIdxRef.current; const to=overIdxRef.current;
    if(from!==null&&to!==null&&from!==to) doReorder(from,to);
    dragIdxRef.current=null; overIdxRef.current=null;
    setDragIdx(null); setOverIdx(null);
  };

  const onNavTouchStart=(e:React.TouchEvent)=>{
    // Only record swipe start if not already doing a reorder drag
    if(dragIdxRef.current!==null) return;
    swipeRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()};
  };

  const onNavTouchEnd=(e:React.TouchEvent)=>{
    if(!swipeRef.current||dragIdxRef.current!==null){swipeRef.current=null;return;}
    const dx=e.changedTouches[0].clientX-swipeRef.current.x;
    const dy=e.changedTouches[0].clientY-swipeRef.current.y;
    const dt=Math.max(1,Date.now()-swipeRef.current.t);
    swipeRef.current=null;
    // Must be more horizontal than vertical, and either fast (>0.45 px/ms) or long (>65 px)
    if(Math.abs(dx)<=Math.abs(dy)) return;
    const velocity=Math.abs(dx)/dt;
    if(Math.abs(dx)<65&&velocity<0.45) return;
    if(dx<0&&current<spreads.length-1) onChange(current+1); // swipe left → next spread
    else if(dx>0&&current>0)           onChange(current-1); // swipe right → prev spread
  };

  return (
    <div ref={scrollRef}
      className="flex items-center justify-center gap-2 overflow-x-auto px-3 py-2.5 border-t border-neutral-200 flex-shrink-0"
      style={{minHeight:68,background:'#F5F2EE',scrollbarWidth:'none'}}
      onTouchStart={onNavTouchStart}
      onTouchEnd={onNavTouchEnd}>
      {spreads.map((sp,i)=>{
        const movable=canMove(i);
        const isCurrent=i===current;
        const isDragging=dragIdx===i;
        const isOver=overIdx===i&&dragIdx!==null&&dragIdx!==i&&movable;
        // Dropping here inserts the dragged page into the gap next to this
        // thumbnail (shifting the pages in between), not on top of it —
        // which side depends on drag direction (matches the splice-based
        // reorder in reorderSpreads: forward drags land after the target,
        // backward drags land before it).
        const insertAfter=isOver&&dragIdx!==null&&dragIdx<i;
        const insertBefore=isOver&&dragIdx!==null&&dragIdx>i;

        // Helper: render a single page's scaled thumbnail
        const renderPageThumb=(page:PageDef|null,w:number,h:number)=>{
          if(!page) return <div style={{width:w,height:h,background:'#EAE5DC',flexShrink:0}}/>;
          const locked=page.role==='locked_left'||page.role==='locked_right'||page.role==='back_cover';
          if(locked) return <div style={{width:w,height:h,flexShrink:0,background:'#F0EBE2',backgroundImage:'repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(90,74,58,0.10) 2px,rgba(90,74,58,0.10) 3px)'}}/>;
          return <PageThumb elements={pagesContent[page.dbId]??[]} width={w} height={h} canvasH={canvasH}/>;
        };

        const ring=insertBefore
          ? 'inset 3px 0 0 0 #3b82f6, 0 1px 3px rgba(0,0,0,0.12)'
          : insertAfter
          ? 'inset -3px 0 0 0 #3b82f6, 0 1px 3px rgba(0,0,0,0.12)'
          : isCurrent
          ? '0 0 0 2px #C09A55, 0 4px 14px rgba(192,154,85,0.32)'
          : '0 1px 3px rgba(0,0,0,0.12)';

        // No scale-up on hover-to-drop — a size bump reads as "this tile is
        // the target/replacement", whereas the inset line above reads as
        // "the page will slide into the gap here".
        const scale=isCurrent?'scale(1.08)':'scale(1)';

        // Thumb dimensions derived from the book's aspect ratio so square/landscape
        // books never appear letterboxed or stretched in the navigator.
        const THUMB_SOLO_W=28, THUMB_PAIR_W=24;
        const thumbH=Math.round((sp.isSolo?THUMB_SOLO_W:THUMB_PAIR_W)*(canvasH/DESIGN_W));
        const thumbContainerW=sp.isSolo?THUMB_SOLO_W:THUMB_SOLO_W+2+THUMB_PAIR_W; // 28 or 50

        return (
          <div
            key={sp.id}
            data-si={i}
            className="flex-shrink-0 flex flex-col items-center gap-0.5 select-none"
            style={{opacity:isDragging?0.18:1,transition:'opacity 0.15s'}}
            // Mouse drag
            draggable={movable}
            onDragStart={movable ? e=>{e.dataTransfer.effectAllowed='move';setDragIdx(i);dragIdxRef.current=i;} : undefined}
            onDragOver={movable ? e=>{if(dragIdxRef.current!==null&&dragIdxRef.current!==i){e.preventDefault();e.dataTransfer.dropEffect='move';setOverIdx(i);}} : undefined}
            onDragLeave={movable ? ()=>setOverIdx(o=>o===i?null:o) : undefined}
            onDrop={movable ? e=>{e.preventDefault();if(dragIdxRef.current!==null&&dragIdxRef.current!==i)doReorder(dragIdxRef.current,i);setDragIdx(null);setOverIdx(null);dragIdxRef.current=null;} : undefined}
            onDragEnd={()=>{setDragIdx(null);setOverIdx(null);dragIdxRef.current=null;}}
            // Touch drag
            onTouchStart={movable ? ()=>handleTouchStart(i) : undefined}
            onTouchEnd={movable ? handleTouchEnd : undefined}
          >
            {/* Thumbnail */}
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
              {/* Thumb height is derived from the book's aspect ratio (canvasH/DESIGN_W)
                   so square and landscape books never appear letterboxed or stretched. */}
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
                {/* Drag handle overlay for movable spreads */}
                {movable && (
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.15)'}}>
                    <span style={{fontSize:9,color:'rgba(255,255,255,0.9)',letterSpacing:'0.04em',lineHeight:1}}>⠿</span>
                  </div>
                )}
              </div>
            </button>

            {/* Label */}
            <span style={{
              fontSize:7,letterSpacing:'0.09em',textTransform:'uppercase',
              color:isCurrent?'#B8904A':'#B0A898',
              fontWeight:isCurrent?700:400,
              transition:'color 0.20s ease',
            }}>{sp.navLabel}</span>

            {/* Active indicator pill */}
            <div style={{
              width:isCurrent?14:0,height:2,borderRadius:1,
              background:'linear-gradient(90deg,#C09A55,#E0BB7A)',
              transition:'width 0.28s cubic-bezier(0.34,1.56,0.64,1)',
              overflow:'hidden',flexShrink:0,
            }}/>
          </div>
        );
      })}

      {/* Add spread */}
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
  return (
    <button onClick={onApply}
      className="flex flex-col items-center gap-1.5 group transition-transform hover:scale-105 active:scale-95 outline-none">
      <div className="relative overflow-hidden rounded-md border border-neutral-200 group-hover:border-neutral-700 shadow-sm transition-all group-hover:shadow-md" style={{width:72,height:96}}>
        {design.thumbPhoto
          ? <>
              <img src={design.thumbPhoto} alt={design.name[lang]} className="absolute inset-0 w-full h-full object-cover"/>
              <div className="absolute inset-0 bg-black/20"/>
            </>
          : <PageThumb elements={design.elements} width={72} height={96}/>
        }
      </div>
      <span className="text-[9px] text-neutral-500 group-hover:text-neutral-800 transition-colors text-center leading-tight w-full truncate px-1">
        {design.name[lang]}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Designs Panel
// ─────────────────────────────────────────────────────────────────────────────

function DesignsPanel({onApply,lang}: {onApply:(d:DesignDef)=>void;lang:'sq'|'en'}) {
  const categories=useMemo(()=>[...new Set(DESIGNS.map(d=>d.category))],[]);
  return (
    <div className="overflow-y-auto flex-1">
      <p className="text-[9px] uppercase tracking-widest text-neutral-400 px-3 pt-2 pb-1">
        {lang==='sq'?'Kliko — aplikon në të gjitha faqet':'Click — applies to all pages'}
      </p>
      {categories.map(cat=>(
        <div key={cat} className="px-3 pb-4">
          <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold mb-2.5 mt-2">
            {(CATEGORY_LABELS[cat]?.[lang]) ?? cat}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DESIGNS.filter(d=>d.category===cat).map(d=>(
              <DesignThumb key={d.id} design={d} lang={lang} onApply={()=>onApply(d)}/>
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

function Sidebar({tab,onTab,photos,onUpload,uploading,onAddPhoto,onAddText,onLayout,onApplyDesign,selectedId,onDelete,lang}: {
  tab:SideTab; onTab:(t:SideTab)=>void; photos:string[]; onUpload:(f:File)=>void; uploading:boolean;
  onAddPhoto:(url:string)=>void; onAddText:(s?:{fontSize?:number;fontStyle?:string;align?:'left'|'center'|'right'})=>void; onLayout:(id:string)=>void;
  onApplyDesign:(d:DesignDef)=>void; selectedId:string|null; onDelete:()=>void; lang:'sq'|'en';
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
        {tab==='designs' && <DesignsPanel onApply={onApplyDesign} lang={lang}/>}
        {tab==='layouts' && (
          <div className="overflow-y-auto flex-1 p-3">
            <p className="text-[9px] uppercase tracking-widest text-neutral-400 mb-3">
              {lang==='sq'?'Apliko në faqen aktive':'Apply to active page'}
            </p>
            {[...new Set(LAYOUTS.map(l=>l.category))].map(cat=>(
              <div key={cat} className="pb-4">
                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold mb-2.5">
                  {(LAYOUT_CATEGORY_LABELS[cat]?.[lang]) ?? cat}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {LAYOUTS.filter(l=>l.category===cat).map(l=>(
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

function MobileSheet({tab,show,onClose,photos,onUpload,uploading,onAddPhoto,onLayout,onAddText,onApplyDesign,lang}: {
  tab:SideTab; show:boolean; onClose:()=>void; photos:string[]; onUpload:(f:File)=>void; uploading:boolean;
  onAddPhoto:(url:string)=>void; onLayout:(id:string)=>void; onAddText:(s?:{fontSize?:number;fontStyle?:string;align?:'left'|'center'|'right'})=>void;
  onApplyDesign:(d:DesignDef)=>void; lang:'sq'|'en';
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
                {[...new Set(DESIGNS.map(d=>d.category))].map(cat=>(
                  <div key={cat}>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-semibold mb-2">{cat}</p>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {DESIGNS.filter(d=>d.category===cat).map(d=>(
                        <div key={d.id} className="flex-shrink-0">
                          <DesignThumb design={d} lang={lang} onApply={()=>{onApplyDesign(d);onClose();}}/>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab==='layouts' && (
              <div className="space-y-4">
                {[...new Set(LAYOUTS.map(l=>l.category))].map(cat=>(
                  <div key={cat}>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-semibold mb-2">
                      {(LAYOUT_CATEGORY_LABELS[cat]?.[lang]) ?? cat}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {LAYOUTS.filter(l=>l.category===cat).map(l=>(
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

function OrderModal({project,onClose,lang}: {project:any;onClose:()=>void;lang:'sq'|'en'}) {
  const createOrder=useCreateOrder();
  const [orderId,setOrderId]=useState<number|null>(null);
  const [st,setSt]=useState<'idle'|'loading'|'done'|'error'>('idle');
  const whatsapp=useGetOrderWhatsapp(orderId??0,{query:{queryKey:getGetOrderWhatsappQueryKey(orderId??0),enabled:!!orderId}});
  useEffect(()=>{
    if (whatsapp.data?.url&&st==='loading'){window.open(whatsapp.data.url,'_blank');setSt('done');}
  },[whatsapp.data,st]);
  const go=async()=>{
    setSt('loading');
    try{const o=await createOrder.mutateAsync({data:{projectId:project.id}});setOrderId((o as any).id);}
    catch{setSt('error');}
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
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-neutral-900 text-white rounded-full text-sm">Close</button>
          </div>
        ):st==='error'?(
          <p className="text-center text-red-500 text-sm py-2">{lang==='sq'?'Ndodhi një gabim.':'An error occurred.'}</p>
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
  const {lang}=useLanguage();
  const {getToken}=useAuth();
  const queryClient=useQueryClient();

  const {data:project,isLoading,isError,refetch:refetchProject}=useGetProject(projectId,{query:{queryKey:getGetProjectQueryKey(projectId),enabled:!!projectId&&!isNaN(projectId)}});
  const {data:bookSizes}=useListBookSizes();
  // The project's real book size determines the logical canvas height
  // (DESIGN_W stays fixed across all book sizes — see getCanvasHeight).
  // Falls back to the 3:4 reference height until book sizes/project load.
  const bookSize=useMemo(()=>(bookSizes as any[]|undefined)?.find(s=>s.id===project?.bookSizeId),[bookSizes,project?.bookSizeId]);
  const canvasH=useMemo(()=>getCanvasHeight(
    bookSize?.widthCm!==undefined?Number(bookSize.widthCm):undefined,
    bookSize?.heightCm!==undefined?Number(bookSize.heightCm):undefined,
  ),[bookSize]);

  // The dashboard's project list (5min staleTime) caches each project's front-cover
  // thumbnail. Invalidate it when leaving the editor so the dashboard always shows
  // the front cover as it currently is, not whatever was cached before this edit.
  useEffect(()=>{
    return ()=>{ queryClient.invalidateQueries({queryKey:getListProjectsQueryKey()}); };
  },[queryClient]);
  const spreads=useMemo(()=>buildSpreads(project?.pages||[],lang),[project?.pages,lang]);

  const [spreadIdx,setSpreadIdx]=useState(0);
  const currentSpread=spreads[spreadIdx];

  const [pagesContent,setPagesContent]=useState<Record<number,EditorElement[]>>({});
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

  // Load Google Fonts for text editor
  useEffect(()=>{
    const id='gfonts-editor';
    if (document.getElementById(id)) return;
    const load=()=>{
      const link=document.createElement('link');
      link.id=id; link.rel='stylesheet';
      link.href='https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Dancing+Script:wght@400;600&family=Great+Vibes&family=Pacifico&family=Raleway:wght@300;400&family=Montserrat:wght@300;400&display=swap';
      document.head.appendChild(link);
    };
    // Defer font loading until the browser is idle — fonts are only needed when
    // the user starts editing text, so they must not block the initial paint.
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(load, {timeout:3000});
    } else {
      setTimeout(load, 1000);
    }
  },[]);

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

  const pushHistory=useCallback(()=>{
    // Clone page arrays (element objects are replaced immutably on edit, never mutated).
    const cur=liveContent.current;
    const snap:Record<number,EditorElement[]>={};
    for (const key of Object.keys(cur)) {
      const pid=Number(key);
      snap[pid]=cur[pid].slice();
    }
    const stack=[...historyRef.current,snap].slice(-MAX_HISTORY);
    historyRef.current=stack; setHistoryLen(stack.length); persistHistory(stack);
    // Any new edit forks a new timeline — the old "forward" states no longer apply.
    clearRedo();
  },[persistHistory,clearRedo]);

  // Drag/transform: push undo once at gesture start, not again on every release.
  const gestureHistoryRef=useRef(false);
  const beginHistoryGesture=useCallback(()=>{
    if (gestureHistoryRef.current) return;
    gestureHistoryRef.current=true;
    pushHistory();
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
  },[canvasH]);

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

  // Auto-apply a design chosen in the Wizard (first open of a fresh project).
  // Runs once when pagesContent first populates — uses a ref guard so the
  // effect never fires again, avoiding the pagesContent cascade.
  const pagesLoadedOnce=useRef(false);
  useEffect(()=>{
    if (pagesLoadedOnce.current||autoAppliedRef.current) return;
    if (Object.keys(pagesContent).length===0) return;
    pagesLoadedOnce.current=true;
    const designId=sessionStorage.getItem('wizard_initial_design');
    sessionStorage.removeItem('wizard_initial_design');
    autoAppliedRef.current=true;
    if (!designId) return;
    const allEmpty=Object.values(pagesContent).every(els=>!els?.length);
    if (!allEmpty) return;
    const design=DESIGNS.find(d=>d.id===designId);
    if (design) applyDesign(design);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[Object.keys(pagesContent).length]);

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

  // Native canvas swipe — React onTouch* on the wrapper often never fires because
  // Konva owns the canvas. Elements are only draggable when selected, so an
  // unselected page can swipe left/right to change page/spread.
  const pageSwipeRef=useRef({
    spreadIdx, spreadsLen:spreads.length, isSolo:!!currentSpread?.isSolo,
    activeSide, selectedId, isMobile,
  });
  pageSwipeRef.current={
    spreadIdx, spreadsLen:spreads.length, isSolo:!!currentSpread?.isSolo,
    activeSide, selectedId, isMobile,
  };

  useEffect(()=>{
    const el=canvasRef.current;
    if(!el) return;
    let start:{x:number;y:number;t:number}|null=null;
    let armed=false;

    const onStart=(e:TouchEvent)=>{
      if(e.touches.length!==1){ start=null; armed=false; return; }
      // Don't steal gestures while an element is selected (drag / transform).
      if(pageSwipeRef.current.selectedId){ start=null; return; }
      start={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()};
      armed=false;
    };
    const onMove=(e:TouchEvent)=>{
      if(!start||e.touches.length!==1) return;
      const dx=e.touches[0].clientX-start.x;
      const dy=e.touches[0].clientY-start.y;
      if(!armed && Math.abs(dx)>14 && Math.abs(dx)>Math.abs(dy)*1.15) armed=true;
      if(armed) e.preventDefault();
    };
    const finish=(e:TouchEvent)=>{
      if(!start) return;
      const dx=e.changedTouches[0].clientX-start.x;
      const dy=e.changedTouches[0].clientY-start.y;
      const dt=Math.max(1,Date.now()-start.t);
      const wasArmed=armed;
      start=null; armed=false;
      if(Math.abs(dx)<=Math.abs(dy)*1.1) return;
      const vel=Math.abs(dx)/dt;
      if(!wasArmed && Math.abs(dx)<40 && vel<0.3) return;
      if(Math.abs(dx)<36 && vel<0.28) return;

      const s=pageSwipeRef.current;
      const next=()=>{ if(s.spreadIdx<s.spreadsLen-1){ setSpreadIdx(s.spreadIdx+1); setSelectedId(null); setActiveSide('left'); } };
      const prev=()=>{ if(s.spreadIdx>0){ setSpreadIdx(s.spreadIdx-1); setSelectedId(null); setActiveSide(s.isMobile?'right':'left'); } };

      if(s.isMobile && !s.isSolo){
        if(dx<0){
          if(s.activeSide==='left'){ setActiveSide('right'); setSelectedId(null); }
          else next();
        } else {
          if(s.activeSide==='right'){ setActiveSide('left'); setSelectedId(null); }
          else prev();
        }
      } else {
        if(dx<0) next(); else prev();
      }
    };

    el.addEventListener('touchstart',onStart,{passive:true});
    el.addEventListener('touchmove',onMove,{passive:false});
    el.addEventListener('touchend',finish,{passive:true});
    el.addEventListener('touchcancel',()=>{start=null;armed=false;},{passive:true});
    return ()=>{
      el.removeEventListener('touchstart',onStart);
      el.removeEventListener('touchmove',onMove);
      el.removeEventListener('touchend',finish);
    };
  },[]);

  // The actual network save, shared by the debounced auto-save and by
  // flushSave (used to force-persist pending edits — e.g. a just-applied
  // design — before anything reads contentJson from the DB, like placing
  // an order that triggers server-side PDF generation).
  const performSave=useCallback(async()=>{
    setSaveStatus('saving');
    const token=getToken();
    const toSave=Array.from(dirtyPages.current); dirtyPages.current.clear();
    if (!toSave.length) { setSaveStatus('saved'); return; }
    const cur=liveContent.current;
    const pagesPayload=toSave.map(pid=>({id:pid,contentJson:JSON.stringify(cur[pid]||[])}));
    try {
      await fetch(`/api/projects/${projectId}/auto-save`,{
        method:'POST',
        headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify({pagesJson:JSON.stringify(pagesPayload)}),
      });
      setSaveStatus('saved');
    } catch(e){
      console.error('auto-save failed',e);
      // Put the pages back so the next save attempt (debounced or flushed)
      // retries them instead of silently dropping the edit.
      toSave.forEach(pid=>dirtyPages.current.add(pid));
      setSaveStatus('unsaved');
      throw e;
    }
  },[projectId,getToken]);

  const triggerSave=useCallback(()=>{
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('unsaved');
    saveTimer.current=setTimeout(()=>{ performSave(); },1500);
  },[performSave]);

  // Cancels any pending debounce and saves immediately, awaited. Call this
  // before any action whose result depends on the DB's contentJson being
  // current — most importantly placing an order, since that triggers
  // server-side PDF rendering straight from the database.
  const flushSave=useCallback(async()=>{
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current=undefined; }
    if (!dirtyPages.current.size) return;
    await performSave();
  },[performSave]);

  const undo=useCallback(()=>{
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
  },[persistHistory,persistRedo,triggerSave]);
  // Keep the stable keyboard-handler ref in sync every render.
  undoRef.current=undo;

  // Stable ref so the keyboard handler can call redo without it being in deps.
  const redoRefFn=useRef<()=>void>(()=>{});

  const redo=useCallback(()=>{
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
  },[persistHistory,persistRedo,triggerSave]);
  redoRefFn.current=redo;

  const updatePage=useCallback((pid:number,els:EditorElement[])=>{
    pushHistory();
    const next={...liveContent.current,[pid]:els};
    liveContent.current=next;
    setPagesContent(next); dirtyPages.current.add(pid); triggerSave();
  },[triggerSave,pushHistory]);

  // Batch-update multiple pages in one history entry + one save tick.
  const batchUpdatePages=useCallback((updates:Record<number,EditorElement[]>)=>{
    pushHistory();
    const next={...liveContent.current,...updates};
    liveContent.current=next;
    setPagesContent(next);
    Object.keys(updates).forEach(pid=>dirtyPages.current.add(Number(pid)));
    triggerSave();
  },[triggerSave,pushHistory]);

  const changeEl=useCallback((pid:number,eid:string,changes:Partial<EditorElement>)=>{
    if (gestureHistoryRef.current) gestureHistoryRef.current=false;
    else pushHistory();
    const prev=liveContent.current;
    const els=prev[pid]??[];
    const next={...prev,[pid]:els.map(e=>e.id===eid?{...e,...changes}:e)};
    liveContent.current=next;
    dirtyPages.current.add(pid);
    // Defer React paint so Konva can finish the gesture without hitching.
    startTransition(()=>setPagesContent(next));
    triggerSave();
  },[triggerSave,pushHistory]);

  const deleteSelected=useCallback(()=>{
    if (!selectedId||!activePageId) return;
    // Read from the live ref so pagesContent is not in the dep array — otherwise
    // this callback would be recreated on every element edit, breaking memo.
    updatePage(activePageId,(liveContent.current[activePageId]??[]).filter(e=>e.id!==selectedId));
    setSelectedId(null);
  },[selectedId,activePageId,updatePage]);

  const upload=useCallback(async(file:File)=>{
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
  },[getToken,lang]);

  const addPhoto=useCallback((url:string)=>{
    if (!activePageId) return;
    // Read from the live ref to avoid pagesContent in deps (which would cause
    // this callback to be recreated on every element edit, breaking memo).
    const els=liveContent.current[activePageId]??[];
    const ph=els.find(e=>e.id===selectedId&&e.type==='placeholder')
           ??els.find(e=>e.type==='placeholder');
    if (ph){updatePage(activePageId,els.map(e=>e.id===ph.id?{...e,type:'image' as const,src:url}:e));setSelectedId(null);return;}
    const hasImages=els.some(e=>e.type==='image');
    const el:EditorElement=hasImages
      ?{id:`img-${Date.now()}`,type:'image',src:url,x:50,y:Math.round(60*canvasH/DESIGN_H),w:500,h:Math.round(340*canvasH/DESIGN_H),rotation:0}
      :{id:`img-${Date.now()}`,type:'image',src:url,x:0,y:0,w:DESIGN_W,h:canvasH,rotation:0};
    updatePage(activePageId,[...els,el]); setSelectedId(el.id);
  },[activePageId,selectedId,updatePage,canvasH]);

  // Upload a file and immediately place it on the active page (used by InlinePhotoPicker)
  const uploadAndPlace=useCallback(async(file:File)=>{
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
  },[getToken,addPhoto,lang]);

  const reorderSpreads=useCallback(async(fromIdx:number,toIdx:number)=>{
    if (fromIdx===toIdx||!project?.pages) return;
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
  },[project,spreads,projectId,getToken,refetchProject]);

  const addSpread=useCallback(async()=>{
    if (!project?.pages||addingSpread) return;
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
  },[project,addingSpread,getToken,projectId,lang,refetchProject]);

  const [editRequestId,setEditRequestId]=useState<string|null>(null);
  const clearEditRequest=useCallback(()=>setEditRequestId(null),[]);

  const addText=useCallback((style?:{fontSize?:number;fontStyle?:string;align?:'left'|'center'|'right'})=>{
    if (!activePageId) return;
    const el:EditorElement={id:`txt-${Date.now()}`,type:'text',
      text:lang==='sq'?'Shto tekstin tënd...':'Your text here...',
      x:60,y:canvasH/2-40,w:DESIGN_W-120,h:100,rotation:0,
      fontSize:style?.fontSize??22,fontFamily:'Georgia, serif',fill:'#1a1a1a',
      align:style?.align??'center',fontStyle:style?.fontStyle??'normal'};
    const els=liveContent.current[activePageId]??[];
    updatePage(activePageId,[...els,el]);
    setSelectedId(el.id);
    setEditRequestId(el.id);
  },[activePageId,lang,updatePage,canvasH]);

  const applyLayout=useCallback((layoutId:string)=>{
    if (!activePageId) return;
    const layout=LAYOUTS.find(l=>l.id===layoutId); if(!layout) return;
    const newEls:EditorElement[]=layout.zones.map((z,i)=>({
      id:`${layoutId}-${i}-${Date.now()}`,rotation:z.rotation??0,
      x:z.x*DESIGN_W,y:z.y*canvasH,w:z.w*DESIGN_W,h:z.h*canvasH,
      ...(z.type==='photo'
        ?{type:'placeholder' as const}
        :{type:'text' as const,text:lang==='sq'?'Shto tekstin tënd...':'Your text here...',fontSize:18,fill:'#333',align:'center' as const,fontFamily:'Georgia, serif'}),
    }));
    updatePage(activePageId,newEls); setSelectedId(null);
  },[activePageId,lang,updatePage,canvasH]);

  const applyDesign=useCallback((design:DesignDef)=>{
    // Collect all page defs from spreads
    const allPages=(spreads.flatMap(s=>[s.left,s.right]).filter(Boolean) as PageDef[]);
    const ts=Date.now();
    const updates:Record<number,EditorElement[]>={};

    // DESIGNS are authored against the 3:4 reference canvas — re-project onto
    // this project's real canvas height before use (no-op for 3:4 books).
    const projected=scaleElementsToCanvas(design.elements,canvasH);

    // Background element from the design (used on inner pages)
    const bgEl=projected.find(e=>e.type==='background');

    for (const page of allPages) {
      if (page.role==='front_cover') {
        // Full design — all elements including photo placeholders
        updates[page.dbId]=projected.map((el,i)=>({...el,id:`${design.id}-${page.dbId}-${i}-${ts}`}));
      } else if (page.role==='back_cover') {
        // Background + decorative shapes/text — no photo placeholders
        updates[page.dbId]=projected
          .filter(el=>el.type!=='placeholder')
          .map((el,i)=>({...el,id:`${design.id}-${page.dbId}-${i}-${ts}`}));
      } else {
        // Inner pages and inside cover: replace existing background, keep photos/text
        if (!bgEl) continue;
        const current=liveContent.current[page.dbId]??[];
        const withoutBg=current.filter(e=>e.type!=='background');
        updates[page.dbId]=[{...bgEl,id:`${design.id}-${page.dbId}-bg-${ts}`},...withoutBg];
      }
    }

    batchUpdatePages(updates);
    setSelectedId(null);

    // Brief toast
    const name=design.name[lang]??design.id;
    setDesignToast(name);
    setTimeout(()=>setDesignToast(null),2800);
  },[spreads,batchUpdatePages,lang,canvasH]);

  // Stable callback for MobileSheet — avoids an inline arrow in JSX that would
  // defeat React.memo on MobileSheet and recreate it on every render.
  const applyDesignAndClose=useCallback((d:DesignDef)=>{
    applyDesign(d); setShowSheet(false);
  },[applyDesign]);

  const openPhotos=useCallback(()=>{
    setPickerOpen(true);
  },[]);

  const handleDownloadPDF=useCallback(async()=>{
    if (!project?.pages) return;
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
  },[project,pagesContent,bookSize]);

  if (isLoading) return (
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
  if (isError||!project) return (
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
            disabled={historyLen===0}
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
            disabled={redoLen===0}
            title={lang==='sq'?`Ribëj (${redoLen} hapa)`:`Redo (${redoLen} steps)`}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-full text-xs font-medium border transition-all ${
              redoLen>0
                ? 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                : 'bg-white text-neutral-300 border-neutral-100 cursor-not-allowed'
            }`}>
            <Undo2 size={13} className="scale-x-[-1]"/>
            {redoLen>0 && <span className="hidden md:inline tabular-nums">{redoLen}</span>}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={!!pdfProgress}
            title={lang==='sq'?'Shkarko PDF':'Download PDF'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed">
            {pdfProgress ? <Loader2 size={13} className="animate-spin"/> : <FileDown size={13}/>}
            <span>PDF</span>
          </button>
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
          <button onClick={async()=>{
            const innerPages=(project?.pages||[]).filter((p:any)=>p.pageType==='inner');
            const emptyNums=innerPages.filter((p:any)=>(pagesContent[p.id]?.length??0)===0).map((p:any)=>p.pageNumber);
            if(emptyNums.length>0){setEmptyPagesWarn(emptyNums);return;}
            // Force any pending edit (e.g. a just-applied design) to persist
            // before the order flow reads contentJson from the DB.
            await flushSave();
            setShowOrder(true);
          }}
            className="flex items-center gap-2 px-4 md:px-5 py-2 bg-neutral-900 text-white rounded-full text-xs md:text-sm font-medium hover:bg-neutral-700 transition-colors shadow-sm">
            <ShoppingBag size={14}/><span>{lang==='sq'?'Porosit':'Order'}</span>
          </button>
        </div>
      </div>
      </div>{/* end collapsible header wrapper */}

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
        {!isMobile && (
          <Sidebar tab={tab} onTab={setTab} photos={photos} onUpload={upload} uploading={uploading}
            onAddPhoto={addPhoto} onAddText={addText} onLayout={applyLayout} onApplyDesign={applyDesign}
            selectedId={selectedId} onDelete={deleteSelected} lang={lang}/>
        )}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Mobile page arrows — only for 2-page spreads */}
          {isMobile && currentSpread && !currentSpread.isSolo && (
            <div className="flex items-center justify-between flex-shrink-0 bg-white border-b border-neutral-100"
              style={{height:38,paddingLeft:8,paddingRight:8}}>
              <button
                onClick={()=>{ setActiveSide('left'); setSelectedId(null); }}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeSide==='left'
                    ? 'text-neutral-500 active:bg-neutral-100'
                    : 'bg-neutral-900 text-white'
                }`}>
                <ChevronLeft size={14}/>{lang==='sq'?'E majtë':'Left'}
              </button>

              <span style={{fontSize:11,color:'#B0A898',letterSpacing:'0.06em',fontWeight:500}}>
                {lang==='sq'
                  ? `Faqja ${activeSide==='left'?'1':'2'} / 2`
                  : `Page ${activeSide==='left'?'1':'2'} of 2`}
              </span>

              <button
                onClick={()=>{ setActiveSide('right'); setSelectedId(null); }}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeSide==='right'
                    ? 'text-neutral-500 active:bg-neutral-100'
                    : 'bg-neutral-900 text-white'
                }`}>
                {lang==='sq'?'E djathtë':'Right'}<ChevronRight size={14}/>
              </button>
            </div>
          )}

          {/* Canvas area — page swipe via native listeners (see useEffect on canvasRef) */}
          <div ref={canvasRef}
            className="flex-1 min-h-0 flex items-center justify-center"
            style={isMobile
              ? {overflow:'hidden',padding:'12px',touchAction:'pan-y'}
              : {padding:'32px 40px',overflowY:'auto',display:'flex',alignItems:'center',justifyContent:'center',touchAction:'pan-y'}}>
            {currentSpread ? (
              <SpreadView spread={currentSpread} spreadContent={spreadContent}
                selectedId={selectedId} activeSide={activeSide}
                onActiveSide={setActiveSide}
                onSelectId={setSelectedId} onChangeEl={changeEl} onOpenPhotos={openPhotos} onDelete={deleteSelected}
                onGestureStart={beginHistoryGesture}
                editRequestId={editRequestId} onEditRequestHandled={clearEditRequest}
                pageW={pageW} pageH={pageH} canvasH={canvasH} shapeRefs={shapeRefs} isMobile={isMobile}/>
            ) : <p className="text-neutral-400 text-sm">No pages found</p>}
          </div>
          <SpreadNav spreads={spreads} current={spreadIdx}
            onChange={onSpreadChange}
            onAddSpread={addSpread} addingSpread={addingSpread}
            onReorder={reorderSpreads}
            pagesContent={deferredPagesContent} canvasH={canvasH}/>
          {isMobile && (
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
              <button onClick={deleteSelected} disabled={!selectedId}
                className={`flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-xl text-[10px] transition-colors ${selectedId?'text-red-400 active:bg-red-50':'text-neutral-200 pointer-events-none'}`}>
                <Trash2 size={20}/>{lang==='sq'?'Fshi':'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isMobile && <MobileSheet tab={tab} show={showSheet} onClose={()=>setShowSheet(false)}
        photos={photos} onUpload={upload} uploading={uploading}
        onAddPhoto={addPhoto} onLayout={applyLayout} onAddText={addText}
        onApplyDesign={applyDesignAndClose} lang={lang}/>}

      {pickerOpen && (
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
        {showOrder && <OrderModal key="ord" project={project} onClose={()=>setShowOrder(false)} lang={lang}/>}
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
              <div className="flex flex-wrap gap-1.5 mb-5">
                {emptyPagesWarn.map(n=>(
                  <span key={n} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                    {lang==='sq'?`F${n}`:`P${n}`}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setEmptyPagesWarn([])}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 text-sm font-medium active:bg-neutral-50 transition-colors">
                  {lang==='sq'?'Kthehu':'Back'}
                </button>
                <button onClick={async()=>{setEmptyPagesWarn([]);await flushSave();setShowOrder(true);}}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium active:bg-neutral-700 transition-colors">
                  {lang==='sq'?'Vazhdo':'Order anyway'}
                </button>
              </div>
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
