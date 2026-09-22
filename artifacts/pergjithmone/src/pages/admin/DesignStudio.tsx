import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text as KonvaText, Image as KonvaImage, Transformer, Group } from 'react-konva';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import { useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey, getGetAppSettingsQueryKey, useListBookSizes } from '@workspace/api-client-react-tsconfig';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DESIGNS, DESIGN_W, DESIGN_H, CATEGORY_LABELS,
  buildDesignCatalog, parseCustomDesigns,
  designFrontElements, designBackElements,
  designElementsWithIds, designElementsWithoutIds,
  blankCoverElements, newCustomDesignId,
  getCanvasHeight, scaleElementsToCanvas, reprojectCanvasElements,
  imageFrameCoverFit,
  type CustomDesignRecord, type DesignDef, type DesignOverrides, type EditorElement, type DE,
  PHOTO_CORNER_ZOOM, coverCropRect, imageFrameFocusFromOffset,
} from '@/lib/designs';
import { applyCoverBackground, coverBgMode, type CoverBgMode } from '@/lib/coverBackground';
import { compressImageFile, ImageTooLargeError } from '@/lib/imageCompression';
import { useAuth } from '@/contexts/AuthContext';
import { PageThumb } from '@/components/PageThumb';
import {
  Check, Loader2, RotateCcw, Save, Eye, EyeOff, AlertTriangle,
  Plus, Trash2, X, Upload, Image as ImageIcon, Type, Palette, Droplets,
  Copy, Layers,
} from 'lucide-react';
import { useEditorFontsReady, ensureEditorFonts } from '@/lib/editorFonts';

const PREVIEW_W = 560;
const PREVIEW_W_MIN = 280;
const CATALOG_THUMB_W = 48;
const CATALOG_THUMB_H = Math.round(CATALOG_THUMB_W * (DESIGN_H / DESIGN_W));

function previewSizeForCanvas(canvasH: number, availW = PREVIEW_W, availH?: number) {
  const maxW = Math.max(PREVIEW_W_MIN, Math.min(PREVIEW_W, Math.floor(availW)));
  let w = maxW;
  let h = Math.round(w * (canvasH / DESIGN_W));
  // Fit portrait (tall) formats into the panel height so the full page is visible.
  if (availH && availH > 120 && h > availH) {
    w = Math.max(PREVIEW_W_MIN, Math.floor(availH * (DESIGN_W / canvasH)));
    w = Math.min(w, maxW);
    h = Math.round(w * (canvasH / DESIGN_W));
  }
  return { w, h, scale: w / DESIGN_W };
}

/** No canvas clamp — text/images may sit partly or fully outside the page. */
function studioDragBound(pos: { x: number; y: number }, _w?: number, _h?: number, _canvasH?: number) {
  return { x: pos.x, y: pos.y };
}

function formatSizeLabel(s: { label?: string; widthCm?: number | string; heightCm?: number | string }) {
  const w = Number(s.widthCm);
  const h = Number(s.heightCm);
  const dims = (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0)
    ? `${w}×${h} cm`
    : '';
  const name = String(s.label || '').trim();
  if (name && dims) return `${name} · ${dims}`;
  return name || dims || 'Format';
}

const COVER_SWATCHES = [
  '#FFFFFF', '#F7F5F2', '#ECE7E1', '#1A1A1A', '#2A2A2A',
  '#C97B84', '#FEC5D7', '#A83442', '#1A2A1A', '#0D1B2A',
  '#1A0A2E', '#FF6B8A', '#C9A227', '#0E4D5C', '#BCC9D1',
];

/** Same catalog as the client editor toolbar. */
const STUDIO_FONTS = [
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

function normalizeStudioFont(ff?: string | null): string {
  const raw = (ff || 'Georgia, serif').trim();
  if (STUDIO_FONTS.some(f => f.value === raw)) return raw;
  const lower = raw.toLowerCase();
  const byPrimary = STUDIO_FONTS.find(f => {
    const primary = f.value.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
    return primary.length > 0 && lower.includes(primary);
  });
  if (byPrimary) return byPrimary.value;
  if (lower.includes('great vibes')) return "'Great Vibes', cursive";
  if (lower.includes('londrina')) return "'Londrina Solid', cursive";
  if (lower.includes('dancing')) return "'Dancing Script', cursive";
  if (lower.includes('pacifico')) return "'Pacifico', cursive";
  if (lower.includes('playfair')) return "'Playfair Display', serif";
  if (lower.includes('cormorant')) return "'Cormorant Garamond', serif";
  if (lower.includes('raleway')) return "'Raleway', sans-serif";
  if (lower.includes('montserrat')) return "'Montserrat', sans-serif";
  if (lower.includes('arial') || lower.includes('helvetica')) return 'Arial, Helvetica, sans-serif';
  return 'Georgia, serif';
}

function isScriptFont(ff?: string | null): boolean {
  return /great vibes|dancing script|pacifico|londrina/i.test(ff || '');
}

const COVER_GRADIENT_PRESETS: { from: string; to: string; dir: 'tb' | 'lr' | 'diag' }[] = [
  { from: '#1A1A1A', to: '#4A4A4A', dir: 'tb' },
  { from: '#FEC5D7', to: '#FFF5F8', dir: 'tb' },
  { from: '#1A0A2E', to: '#7C3AED', dir: 'diag' },
  { from: '#0D1B2A', to: '#1A4A6A', dir: 'lr' },
  { from: '#A83442', to: '#1A1A1A', dir: 'tb' },
  { from: '#ECE7E1', to: '#FFFFFF', dir: 'tb' },
  { from: '#0E4D5C', to: '#1A3040', dir: 'diag' },
  { from: '#C9A227', to: '#1A120C', dir: 'tb' },
];

async function uploadStudioImage(file: File, token: string | null): Promise<string> {
  const compressed = await compressImageFile(file);
  const fd = new FormData();
  fd.append('file', compressed);
  const r = await fetch('/api/uploads/image', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: fd,
  });
  if (!r.ok) throw new Error(await r.text().catch(() => 'Upload failed'));
  const data = await r.json();
  if (!data?.url) throw new Error('Upload returned no URL');
  return data.url as string;
}

const CATEGORY_ORDER = [
  'Wedding', 'Travel', 'Friendship', 'Celebration', 'Baby & Family',
  'Modern', 'Portrait', 'Nature', 'Locations',
];

const VIS_FILTERS = ['all', 'visible', 'hidden'] as const;
type VisFilter = (typeof VIS_FILTERS)[number];
type CoverSide = 'front' | 'back';

function bindFrameNode(n: any, id: string, shapeRefs: React.MutableRefObject<Record<string, any>>) {
  if (!n) return;
  shapeRefs.current[id] = n;
  n.getSelfRect = () => ({
    x: 0,
    y: 0,
    width: Math.max(1, n.width() || 1),
    height: Math.max(1, n.height() || 1),
  });
}

type StudioGesture = {
  active: React.MutableRefObject<boolean>;
  begin: () => void;
  end: () => void;
};

/**
 * Smooth builder gestures:
 * - Always draggable (select + drag in one stroke)
 * - Live position kept in a ref so image-load re-renders don't snap Konva back
 */
function useStudioDrag(
  el: EditorElement,
  canvasH: number,
  onSelect: () => void,
  onChange: (c: Partial<EditorElement>) => void,
  gesture: StudioGesture,
) {
  const livePos = useRef({ x: el.x, y: el.y });
  // Sync from props only when idle — never mid-gesture.
  if (!gesture.active.current) {
    livePos.current = { x: el.x, y: el.y };
  }

  return {
    x: livePos.current.x,
    y: livePos.current.y,
    draggable: true as const,
    dragDistance: 2,
    onMouseDown: (e: any) => { e.cancelBubble = true; onSelect(); },
    onTouchStart: (e: any) => { e.cancelBubble = true; onSelect(); },
    onClick: (e: any) => { e.cancelBubble = true; onSelect(); },
    onTap: (e: any) => { e.cancelBubble = true; onSelect(); },
    dragBoundFunc: (pos: any) => studioDragBound(pos, el.w, el.h, canvasH),
    onDragStart: (e: any) => {
      e.cancelBubble = true;
      onSelect();
      gesture.begin();
      livePos.current = { x: e.target.x(), y: e.target.y() };
    },
    onDragMove: (e: any) => {
      e.cancelBubble = true;
      livePos.current = { x: e.target.x(), y: e.target.y() };
    },
    onDragEnd: (e: any) => {
      e.cancelBubble = true;
      const b = studioDragBound({ x: e.target.x(), y: e.target.y() }, el.w, el.h, canvasH);
      e.target.position(b);
      livePos.current = b;
      onChange(b);
      gesture.end();
    },
  };
}

function useHtmlImage(src?: string) {
  const [img, setImg] = useState<HTMLImageElement>();
  useEffect(() => {
    if (!src) { setImg(undefined); return; }
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => setImg(i);
    i.onerror = () => setImg(undefined);
    i.src = src;
  }, [src]);
  return img;
}

/** Skip React→Konva prop sync while a gesture is in flight (prevents snap-back). */
function studioNodePropsEqual(prev: any, next: any) {
  if (next.gesture?.active?.current) return true;
  return (
    prev.el === next.el
    && prev.selected === next.selected
    && prev.canvasH === next.canvasH
    && prev.fontEpoch === next.fontEpoch
    && prev.photoAdjust === next.photoAdjust
  );
}

function BgFill({ el, onSelect, onChange, canvasH, interactive, gesture }: {
  el: EditorElement;
  onSelect: () => void;
  onChange?: (c: Partial<EditorElement>) => void;
  canvasH: number;
  interactive?: boolean;
  gesture?: StudioGesture;
}) {
  const img = useHtmlImage(el.src);
  const panStartRef = useRef<{ focusX: number; focusY: number; px: number; py: number } | null>(null);
  const focusX = el.cropFocusX ?? 0.5;
  const focusY = el.cropFocusY ?? 0.5;
  const zoom = Math.max(1, el.cropZoom ?? 1);
  const cover = img
    ? coverCropRect(img.naturalWidth || img.width, img.naturalHeight || img.height, DESIGN_W, canvasH, focusX, focusY, zoom)
    : null;
  // Pan when selected and the photo overflows the page (or zoom unlocks corners).
  const canPan = !!(interactive && cover && onChange && (cover.maxX > 1 || cover.maxY > 1));
  const listen = !!interactive;

  if (img && cover) {
    return (
      <>
        <KonvaImage
          image={img}
          x={0} y={0} width={DESIGN_W} height={canvasH}
          crop={{ x: cover.x, y: cover.y, width: cover.width, height: cover.height }}
          listening={listen}
          draggable={canPan}
          dragDistance={3}
          dragBoundFunc={() => ({ x: 0, y: 0 })}
          onMouseDown={listen ? (e: any) => { e.cancelBubble = true; onSelect(); } : undefined}
          onTouchStart={listen ? (e: any) => { e.cancelBubble = true; onSelect(); } : undefined}
          onClick={listen ? onSelect : undefined}
          onTap={listen ? onSelect : undefined}
          onDragStart={(e: any) => {
            if (!canPan || !cover) return;
            gesture?.begin();
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
            if (!canPan || !cover || !panStartRef.current) {
              gesture?.end();
              return;
            }
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
            gesture?.end();
          }}
        />
        {interactive && (
          <Rect x={0} y={0} width={DESIGN_W} height={canvasH}
            stroke="#C97B84" strokeWidth={3} dash={[10, 6]} listening={false} />
        )}
      </>
    );
  }
  const hasGrad = !!(el.bgGradientFrom && el.bgGradientTo);
  const end = el.bgGradientDir === 'lr'
    ? { x: DESIGN_W, y: 0 }
    : el.bgGradientDir === 'diag'
      ? { x: DESIGN_W, y: canvasH }
      : { x: 0, y: canvasH };
  return (
    <Rect
      x={0} y={0} width={DESIGN_W} height={canvasH}
      fill={hasGrad ? undefined : (el.bgColor || '#fff')}
      listening={listen}
      {...(hasGrad ? {
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: end,
        fillLinearGradientColorStops: [0, el.bgGradientFrom!, 1, el.bgGradientTo!],
      } : {})}
      onMouseDown={listen ? (e: any) => { e.cancelBubble = true; onSelect(); } : undefined}
      onTouchStart={listen ? (e: any) => { e.cancelBubble = true; onSelect(); } : undefined}
      onClick={listen ? onSelect : undefined}
      onTap={listen ? onSelect : undefined}
    />
  );
}

const StudioImage = React.memo(function StudioImage({ el, selected, onSelect, onChange, shapeRefs, gesture, canvasH, photoAdjust, onEnterPhotoAdjust, onExitPhotoAdjust }: {
  el: EditorElement; selected: boolean;
  onSelect: () => void;
  onChange: (c: Partial<EditorElement>) => void;
  shapeRefs: React.MutableRefObject<Record<string, any>>;
  gesture: StudioGesture;
  canvasH: number;
  photoAdjust?: boolean;
  onEnterPhotoAdjust?: () => void;
  onExitPhotoAdjust?: () => void;
}) {
  const img = useHtmlImage(el.src);
  const drag = useStudioDrag(el, canvasH, onSelect, onChange, gesture);
  const startRef = useRef({ w: el.w, h: el.h });
  const isContain = el.objectFit === 'contain' || el.mixBlendMode === 'screen';
  const [liveFocus, setLiveFocus] = useState<{ x: number; y: number } | null>(null);
  const focusX = liveFocus?.x ?? el.cropFocusX ?? 0.5;
  const focusY = liveFocus?.y ?? el.cropFocusY ?? 0.5;
  const cropZoom = Math.max(1, el.cropZoom ?? 1);
  const [panning, setPanning] = useState(false);
  const panMaxRef = useRef({ maxOffX: 0, maxOffY: 0 });

  useEffect(() => { setLiveFocus(null); }, [el.cropFocusX, el.cropFocusY, el.cropZoom, el.src]);
  useEffect(() => {
    if (photoAdjust && isContain) onExitPhotoAdjust?.();
  }, [photoAdjust, isContain, onExitPhotoAdjust]);
  useEffect(() => {
    if (!photoAdjust && panning) setPanning(false);
  }, [photoAdjust, panning]);

  const fit = img && !isContain
    ? imageFrameCoverFit(img.width, img.height, el.w, el.h, focusX, focusY, cropZoom)
    : null;
  const containLaid = img && isContain
    ? (() => {
        const s = Math.min(el.w / Math.max(1, img.width), el.h / Math.max(1, img.height));
        const iw = img.width * s;
        const ih = img.height * s;
        return { iw, ih, x: (el.w - iw) / 2, y: (el.h - ih) / 2 };
      })()
    : null;

  const iw = fit?.iw ?? containLaid?.iw ?? el.w;
  const ih = fit?.ih ?? containLaid?.ih ?? el.h;
  const imgX = fit ? -fit.offX : (containLaid?.x ?? 0);
  const imgY = fit ? -fit.offY : (containLaid?.y ?? 0);
  if (fit) panMaxRef.current = { maxOffX: fit.maxOffX, maxOffY: fit.maxOffY };

  const panInside = !!(selected && photoAdjust && !isContain && img);
  const moveFrame = !!(selected && !panInside);

  const enterAdjust = () => {
    if (isContain || !img) return;
    if ((el.cropZoom ?? 1) < PHOTO_CORNER_ZOOM) {
      onChange({ cropZoom: PHOTO_CORNER_ZOOM });
    }
    onEnterPhotoAdjust?.();
  };

  return (
    <Group
      ref={(n: any) => bindFrameNode(n, el.id, shapeRefs)}
      x={drag.x} y={drag.y} width={el.w} height={el.h} rotation={el.rotation || 0}
      clipX={0} clipY={0} clipWidth={el.w} clipHeight={el.h}
      draggable={moveFrame}
      dragDistance={drag.dragDistance}
      dragBoundFunc={drag.dragBoundFunc}
      onMouseDown={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTouchStart={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onClick={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTap={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onDblClick={(e: any) => { e.cancelBubble = true; enterAdjust(); }}
      onDblTap={(e: any) => { e.cancelBubble = true; enterAdjust(); }}
      onDragStart={moveFrame ? drag.onDragStart : undefined}
      onDragMove={moveFrame ? drag.onDragMove : undefined}
      onDragEnd={moveFrame ? drag.onDragEnd : undefined}
      onTransformStart={() => {
        if (panInside) return;
        startRef.current = { w: el.w, h: el.h };
        gesture.begin();
      }}
      onTransformEnd={(e: any) => {
        if (panInside) return;
        const n = e.target;
        const sx = n.scaleX();
        const sy = n.scaleY();
        const s = Math.max(Math.abs(sx), Math.abs(sy)) || 1;
        n.scaleX(1); n.scaleY(1);
        const nw = Math.max(20, startRef.current.w * s);
        const nh = Math.max(20, startRef.current.h * s);
        const b = studioDragBound({ x: n.x(), y: n.y() }, nw, nh, canvasH);
        n.position(b);
        n.width(nw); n.height(nh);
        n.clip({ x: 0, y: 0, width: nw, height: nh });
        const laidEnd = img
          ? (isContain
              ? (() => {
                  const sc = Math.min(nw / Math.max(1, img.width), nh / Math.max(1, img.height));
                  const w = img.width * sc;
                  const h = img.height * sc;
                  return { width: w, height: h, x: (nw - w) / 2, y: (nh - h) / 2 };
                })()
              : (() => {
                  const f = imageFrameCoverFit(img.width, img.height, nw, nh, focusX, focusY, cropZoom);
                  return { width: f.iw, height: f.ih, x: -f.offX, y: -f.offY };
                })())
          : { width: nw, height: nh, x: 0, y: 0 };
        n.getChildren().forEach((c: any) => {
          const name = typeof c.getClassName === 'function' ? c.getClassName() : '';
          if (name === 'Rect') { c.width(nw); c.height(nh); c.x(0); c.y(0); }
          else if (name === 'Image') {
            c.width(laidEnd.width); c.height(laidEnd.height); c.x(laidEnd.x); c.y(laidEnd.y);
          }
        });
        onChange({ ...b, w: nw, h: nh, rotation: n.rotation() });
        gesture.end();
      }}
    >
      {/* When adjusting, hit-test the photo — not this full-frame rect. */}
      <Rect width={el.w} height={el.h} fill="rgba(0,0,0,0.001)" perfectDrawEnabled={false} listening={!panInside} />
      {img && (
        <KonvaImage
          image={img}
          {...(panning ? {} : { x: imgX, y: imgY })}
          width={iw} height={ih}
          perfectDrawEnabled={false}
          listening={panInside}
          draggable={panInside}
          dragDistance={2}
          globalCompositeOperation={(el.mixBlendMode as GlobalCompositeOperation) || undefined}
          dragBoundFunc={(pos: any) => {
            const { maxOffX: mx, maxOffY: my } = panMaxRef.current;
            return {
              x: Math.min(0, Math.max(-mx, pos.x)),
              y: Math.min(0, Math.max(-my, pos.y)),
            };
          }}
          onMouseDown={(e: any) => { e.cancelBubble = true; onSelect(); }}
          onTouchStart={(e: any) => { e.cancelBubble = true; onSelect(); }}
          onClick={(e: any) => { e.cancelBubble = true; onSelect(); }}
          onTap={(e: any) => { e.cancelBubble = true; onSelect(); }}
          onDblClick={(e: any) => { e.cancelBubble = true; enterAdjust(); }}
          onDblTap={(e: any) => { e.cancelBubble = true; enterAdjust(); }}
          onDragStart={(e: any) => {
            if (!panInside) return;
            e.cancelBubble = true;
            setPanning(true);
            gesture.begin();
          }}
          onDragMove={(e: any) => {
            if (!panInside) return;
            e.cancelBubble = true;
          }}
          onDragEnd={(e: any) => {
            if (!panInside) return;
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
            gesture.end();
          }}
        />
      )}
      {selected && (
        <Rect width={el.w} height={el.h}
          stroke={panInside ? '#0D9488' : '#C97B84'}
          strokeWidth={2}
          dash={panInside ? [6, 4] : undefined}
          listening={false}
        />
      )}
    </Group>
  );
}, studioNodePropsEqual);

/** Decorative lines / shapes — fat hit target, smooth move/resize. */
const StudioShape = React.memo(function StudioShape({ el, onSelect, onChange, shapeRefs, gesture, canvasH }: {
  el: EditorElement; selected: boolean;
  onSelect: () => void;
  onChange: (c: Partial<EditorElement>) => void;
  shapeRefs: React.MutableRefObject<Record<string, any>>;
  gesture: StudioGesture;
  canvasH: number;
}) {
  const isCircle = el.shapeKind === 'circle';
  const drag = useStudioDrag(el, canvasH, onSelect, onChange, gesture);
  const startRef = useRef({ w: el.w, h: el.h });
  const hitPad = Math.max(0, (24 - Math.min(el.w, el.h)) / 2);
  const visualFill = el.fill && el.fill !== 'transparent' ? el.fill : undefined;
  const hitFill = visualFill || 'rgba(0,0,0,0.001)';

  return (
    <Group
      ref={(n: any) => bindFrameNode(n, el.id, shapeRefs)}
      x={drag.x} y={drag.y} width={el.w} height={el.h} rotation={el.rotation || 0}
      draggable={drag.draggable}
      dragDistance={drag.dragDistance}
      dragBoundFunc={drag.dragBoundFunc}
      onMouseDown={drag.onMouseDown}
      onTouchStart={drag.onTouchStart}
      onClick={drag.onClick}
      onTap={drag.onTap}
      onDragStart={drag.onDragStart}
      onDragMove={drag.onDragMove}
      onDragEnd={drag.onDragEnd}
      onTransformStart={() => {
        startRef.current = { w: el.w, h: el.h };
        gesture.begin();
      }}
      onTransformEnd={(e: any) => {
        const n = e.target;
        const sx = Math.abs(n.scaleX()) || 1;
        const sy = Math.abs(n.scaleY()) || 1;
        n.scaleX(1); n.scaleY(1);
        const nw = Math.max(4, startRef.current.w * sx);
        const nh = Math.max(4, startRef.current.h * sy);
        const b = studioDragBound({ x: n.x(), y: n.y() }, nw, nh, canvasH);
        n.position(b);
        n.width(nw); n.height(nh);
        const pad = Math.max(0, (24 - Math.min(nw, nh)) / 2);
        const kids = n.getChildren();
        if (kids[0]) {
          kids[0].x(-pad); kids[0].y(-pad);
          kids[0].width(nw + pad * 2); kids[0].height(nh + pad * 2);
        }
        if (kids[1]) {
          kids[1].x(0); kids[1].y(0);
          kids[1].width(nw); kids[1].height(nh);
          if (isCircle && typeof kids[1].cornerRadius === 'function') {
            kids[1].cornerRadius(Math.min(nw, nh) / 2);
          }
        }
        onChange({ ...b, w: nw, h: nh, rotation: n.rotation() });
        gesture.end();
      }}
    >
      <Rect
        name="hit-pad"
        x={-hitPad} y={-hitPad}
        width={el.w + hitPad * 2} height={el.h + hitPad * 2}
        fill="rgba(0,0,0,0.001)"
        perfectDrawEnabled={false}
      />
      <Rect
        name="shape-fill"
        width={el.w}
        height={el.h}
        fill={hitFill}
        opacity={el.opacity ?? 1}
        cornerRadius={isCircle ? Math.min(el.w, el.h) / 2 : (el.cornerRadius || 0)}
        stroke={el.strokeColor}
        strokeWidth={el.strokeWidth || 0}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}, studioNodePropsEqual);

const StudioText = React.memo(function StudioText({ el, onSelect, onChange, shapeRefs, fontEpoch, gesture, canvasH }: {
  el: EditorElement; selected: boolean;
  onSelect: () => void;
  onChange: (c: Partial<EditorElement>) => void;
  shapeRefs: React.MutableRefObject<Record<string, any>>;
  fontEpoch?: number;
  gesture: StudioGesture;
  canvasH: number;
}) {
  const drag = useStudioDrag(el, canvasH, onSelect, onChange, gesture);
  const startRef = useRef({ w: el.w, h: el.h, fontSize: el.fontSize || 20 });

  const bakeText = (n: any, sx: number, sy: number) => {
    n.scaleX(1); n.scaleY(1);
    const nw = Math.max(40, startRef.current.w * sx);
    const nh = Math.max(24, startRef.current.h * sy);
    const fs = Math.max(10, startRef.current.fontSize * sy);
    n.width(nw); n.height(nh);
    n.clip({ x: 0, y: 0, width: nw, height: nh });
    n.getChildren().forEach((c: any) => {
      if (typeof c.width === 'function') { c.width(nw); c.height(nh); }
      if (typeof c.fontSize === 'function') c.fontSize(fs);
    });
    return { nw, nh, fs };
  };

  return (
    <Group
      ref={(n: any) => bindFrameNode(n, el.id, shapeRefs)}
      x={drag.x} y={drag.y} width={el.w} height={el.h} rotation={el.rotation || 0}
      clipX={0} clipY={0} clipWidth={el.w} clipHeight={el.h}
      draggable={drag.draggable}
      dragDistance={drag.dragDistance}
      dragBoundFunc={drag.dragBoundFunc}
      onMouseDown={drag.onMouseDown}
      onTouchStart={drag.onTouchStart}
      onClick={drag.onClick}
      onTap={drag.onTap}
      onDragStart={drag.onDragStart}
      onDragMove={drag.onDragMove}
      onDragEnd={drag.onDragEnd}
      onTransformStart={() => {
        startRef.current = { w: el.w, h: el.h, fontSize: el.fontSize || 20 };
        gesture.begin();
      }}
      // Text must live-bake so type stays sharp (no bitmap stretch).
      onTransform={(e: any) => {
        bakeText(e.target, Math.abs(e.target.scaleX()) || 1, Math.abs(e.target.scaleY()) || 1);
      }}
      onTransformEnd={(e: any) => {
        const n = e.target;
        // onTransform already baked — scale should be 1; read final metrics from the node.
        const sx = Math.abs(n.scaleX()) || 1;
        const sy = Math.abs(n.scaleY()) || 1;
        if (sx !== 1 || sy !== 1) bakeText(n, sx, sy);
        n.scaleX(1); n.scaleY(1);
        const finalW = Math.max(40, n.width() || startRef.current.w);
        const finalH = Math.max(24, n.height() || startRef.current.h);
        let finalFs = startRef.current.fontSize;
        n.getChildren().forEach((c: any) => {
          if (typeof c.fontSize === 'function' && c.fontSize()) finalFs = c.fontSize();
        });
        finalFs = Math.max(10, Math.round(finalFs));
        n.width(finalW); n.height(finalH);
        const b = studioDragBound({ x: n.x(), y: n.y() }, finalW, finalH, canvasH);
        n.position(b);
        onChange({ ...b, w: finalW, h: finalH, fontSize: finalFs, rotation: n.rotation() });
        gesture.end();
      }}
    >
      <Rect width={el.w} height={el.h} fill="rgba(0,0,0,0.001)" perfectDrawEnabled={false} />
      <KonvaText
        key={`studio-txt-${el.id}-f${fontEpoch ?? 0}-${normalizeStudioFont(el.fontFamily)}`}
        text={el.text || ''}
        width={el.w} height={el.h}
        fontSize={el.fontSize || 20}
        fontFamily={normalizeStudioFont(el.fontFamily)}
        fill={el.fill || '#111'}
        align={el.align || 'center'}
        verticalAlign="top"
        fontStyle={el.fontStyle || 'normal'}
        letterSpacing={el.letterSpacing || 0}
        lineHeight={el.lineHeight ?? 1.2}
        padding={4}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}, studioNodePropsEqual);

function DesignCanvas({
  elements, selectedId, onSelect, onChangeEl, canvasH, photoAdjustId, onEnterPhotoAdjust, onExitPhotoAdjust,
}: {
  elements: EditorElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChangeEl: (id: string, patch: Partial<EditorElement>) => void;
  canvasH: number;
  photoAdjustId?: string | null;
  onEnterPhotoAdjust?: (id: string) => void;
  onExitPhotoAdjust?: () => void;
}) {
  const trRef = useRef<any>(null);
  const stageRef = useRef<any>(null);
  const shapeRefs = useRef<Record<string, any>>({});
  const gesturingRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fontsReady = useEditorFontsReady();
  const fontEpoch = fontsReady ? 1 : 0;
  const selected = selectedId ? elements.find(e => e.id === selectedId) : null;
  const adjusting = !!(photoAdjustId && photoAdjustId === selectedId);
  const canTransform = !!(selected && selected.type !== 'background' && !adjusting);
  const [previewBox, setPreviewBox] = useState({ w: PREVIEW_W, h: 0 });
  const [coarsePointer, setCoarsePointer] = useState(false);

  // Fit canvas to available width AND height so portrait formats stay fully visible.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      if (gesturingRef.current) return; // freeze Stage size mid-drag
      const availW = el.clientWidth || PREVIEW_W;
      // Prefer parent column height when available (panel is viewport-locked).
      const parent = el.parentElement;
      const availH = Math.max(
        160,
        (parent?.clientHeight || el.clientHeight || 600) - 8,
      );
      setPreviewBox({ w: availW, h: availH });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [canvasH]);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const apply = () => setCoarsePointer(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const { w: stageW, h: stageH, scale } = previewSizeForCanvas(canvasH, previewBox.w, previewBox.h || undefined);
  const anchorSize = coarsePointer ? 20 : 14;

  const syncTransformer = useCallback(() => {
    if (!trRef.current) return;
    if (gesturingRef.current) return;
    const node = (canTransform && selectedId) ? shapeRefs.current[selectedId] : null;
    trRef.current.nodes(node ? [node] : []);
    trRef.current.forceUpdate?.();
    trRef.current.getLayer()?.batchDraw();
  }, [canTransform, selectedId]);

  const gesture = useMemo<StudioGesture>(() => ({
    active: gesturingRef,
    begin: () => {
      gesturingRef.current = true;
      const root = wrapRef.current;
      if (root) root.style.touchAction = 'none';
      // Do NOT toggle body.overflow — that resizes the Stage mid-drag.
    },
    end: () => {
      gesturingRef.current = false;
      const root = wrapRef.current;
      if (root) root.style.touchAction = 'none';
      requestAnimationFrame(() => syncTransformer());
    },
  }), [syncTransformer]);

  useEffect(() => {
    syncTransformer();
  }, [syncTransformer, elements, fontEpoch, canvasH, scale, adjusting]);

  // Prevent browser gestures (scroll/zoom) from stealing canvas touches.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => {
      if (gesturingRef.current) e.preventDefault();
    };
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, []);

  useEffect(() => {
    if (!adjusting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExitPhotoAdjust?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [adjusting, onExitPhotoAdjust]);

  return (
    <div
      ref={wrapRef}
      className="w-full h-full min-h-[200px] flex justify-center items-start"
      style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      <Stage
        ref={stageRef}
        width={stageW}
        height={stageH}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={(e: any) => {
          if (e.target === e.target.getStage()) onSelect(null);
        }}
        onTouchStart={(e: any) => {
          if (e.target === e.target.getStage()) onSelect(null);
        }}
      >
        <Layer>
          {elements.map(el => {
            if (el.type === 'background') {
              return (
                <BgFill
                  key={el.id}
                  el={el}
                  canvasH={canvasH}
                  interactive={selectedId === el.id}
                  onSelect={() => onSelect(el.id)}
                  onChange={c => onChangeEl(el.id, c)}
                  gesture={gesture}
                />
              );
            }
            if (el.type === 'shape') {
              return (
                <StudioShape
                  key={el.id} el={el} selected={selectedId === el.id}
                  onSelect={() => onSelect(el.id)}
                  onChange={c => onChangeEl(el.id, c)}
                  shapeRefs={shapeRefs}
                  gesture={gesture}
                  canvasH={canvasH}
                />
              );
            }
            if (el.type === 'image') {
              return (
                <StudioImage
                  key={el.id} el={el} selected={selectedId === el.id}
                  onSelect={() => onSelect(el.id)}
                  onChange={c => onChangeEl(el.id, c)}
                  shapeRefs={shapeRefs}
                  gesture={gesture}
                  canvasH={canvasH}
                  photoAdjust={photoAdjustId === el.id}
                  onEnterPhotoAdjust={() => onEnterPhotoAdjust?.(el.id)}
                  onExitPhotoAdjust={onExitPhotoAdjust}
                />
              );
            }
            if (el.type === 'text') {
              return (
                <StudioText
                  key={el.id} el={el} selected={selectedId === el.id}
                  onSelect={() => onSelect(el.id)}
                  onChange={c => onChangeEl(el.id, c)}
                  shapeRefs={shapeRefs}
                  fontEpoch={fontEpoch}
                  gesture={gesture}
                  canvasH={canvasH}
                />
              );
            }
            return null;
          })}
          <Transformer
            ref={trRef}
            rotateEnabled
            resizeEnabled
            keepRatio={selected?.type === 'image'}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            rotationSnapTolerance={8}
            padding={coarsePointer ? 6 : 4}
            rotateAnchorOffset={coarsePointer ? 32 : 24}
            enabledAnchors={
              selected?.type === 'text'
                ? ['middle-left', 'middle-right', 'top-center', 'bottom-center']
                : selected?.type === 'image'
                  ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                  : ['top-left', 'top-right', 'bottom-left', 'bottom-right',
                     'middle-left', 'middle-right', 'top-center', 'bottom-center']
            }
            boundBoxFunc={(oldBox: any, newBox: any) => {
              const minW = selected?.type === 'text' ? 40 : selected?.type === 'shape' ? 4 : 16;
              const minH = selected?.type === 'text' ? 24 : selected?.type === 'shape' ? 4 : 16;
              return (newBox.width < minW || newBox.height < minH) ? oldBox : newBox;
            }}
            borderStroke="#C97B84"
            borderStrokeWidth={2}
            anchorStroke="#C97B84"
            anchorStrokeWidth={2}
            anchorFill="#fff"
            anchorSize={anchorSize}
            anchorCornerRadius={anchorSize / 2}
            ignoreStroke
            anchorStyleFunc={(anchor: any) => {
              anchor.shadowColor('rgba(40, 20, 30, 0.28)');
              anchor.shadowBlur(5);
              anchor.shadowOffsetY(1);
              anchor.shadowOpacity(1);
              if (anchor.hasName('rotater')) {
                anchor.fill('#C97B84');
                anchor.stroke('#fff');
                anchor.strokeWidth(2);
                const s = coarsePointer ? 22 : 18;
                anchor.width(s); anchor.height(s);
                anchor.cornerRadius(s / 2);
                anchor.offsetX(s / 2); anchor.offsetY(s / 2);
              }
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}

function loadCoverDrafts(design: DesignDef): { front: EditorElement[]; back: EditorElement[] } {
  const frontSrc = designFrontElements(design);
  const explicitBack = Array.isArray(design.backElements) && design.backElements.length > 0
    ? design.backElements
    : null;
  const backSrc = explicitBack
    ?? (design.isCustom ? [] : designBackElements(design));
  const front = frontSrc.length ? frontSrc : blankCoverElements('FRONT');
  const back = backSrc.length ? backSrc : blankCoverElements('BACK');
  return {
    front: designElementsWithIds(`${design.id}-f`, front),
    back: designElementsWithIds(`${design.id}-b`, back),
  };
}

export default function AdminDesignStudio() {
  const { data: settings, isLoading } = useGetAdminSettings();
  const { data: bookSizesRaw } = useListBookSizes();
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const s = settings as any;

  const bookSizes = useMemo(() => {
    const list = Array.isArray(bookSizesRaw) ? [...(bookSizesRaw as any[])] : [];
    return list.sort((a, b) => {
      const aw = Number(a.widthCm) || 0;
      const ah = Number(a.heightCm) || 0;
      const bw = Number(b.widthCm) || 0;
      const bh = Number(b.heightCm) || 0;
      return (aw * ah) - (bw * bh) || String(a.label || '').localeCompare(String(b.label || ''));
    });
  }, [bookSizesRaw]);

  const [formatSizeId, setFormatSizeId] = useState<number | null>(null);

  // Prefer a 3:4-ish size as the default authoring format when available.
  useEffect(() => {
    if (!bookSizes.length) return;
    if (formatSizeId != null && bookSizes.some(s => s.id === formatSizeId)) return;
    const prefer = bookSizes.find((s) => {
      const w = Number(s.widthCm);
      const h = Number(s.heightCm);
      if (!w || !h) return false;
      const r = h / w;
      return Math.abs(r - (DESIGN_H / DESIGN_W)) < 0.04;
    }) || bookSizes[0];
    setFormatSizeId(prefer.id);
  }, [bookSizes, formatSizeId]);

  const selectedFormat = useMemo(
    () => bookSizes.find(s => s.id === formatSizeId) || null,
    [bookSizes, formatSizeId],
  );

  const canvasH = useMemo(
    () => getCanvasHeight(
      selectedFormat ? Number(selectedFormat.widthCm) : null,
      selectedFormat ? Number(selectedFormat.heightCm) : null,
    ),
    [selectedFormat],
  );
  const canvasHRef = useRef(canvasH);

  const savedOverrides: DesignOverrides = (s?.designOverrides && typeof s.designOverrides === 'object' && !Array.isArray(s.designOverrides))
    ? s.designOverrides as DesignOverrides
    : {};
  const savedCustomDesigns = useMemo(
    () => parseCustomDesigns(s?.customDesigns),
    [s?.customDesigns],
  );
  const savedHiddenIds: string[] = Array.isArray(s?.hiddenDesignIds) ? s.hiddenDesignIds as string[] : [];

  const catalog = useMemo(
    () => buildDesignCatalog(savedOverrides, savedCustomDesigns),
    [savedOverrides, savedCustomDesigns],
  );

  const categories = useMemo(() => {
    const present = [...new Set(catalog.map(d => d.category))];
    return [
      ...CATEGORY_ORDER.filter(c => present.includes(c)),
      ...present.filter(c => !CATEGORY_ORDER.includes(c)),
    ];
  }, [catalog]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of catalog) {
      map[d.category] = (map[d.category] || 0) + 1;
    }
    return map;
  }, [catalog]);

  const [activeCat, setActiveCat] = useState(() => {
    const hasTravel = DESIGNS.some(d => d.category === 'Travel');
    return hasTravel ? 'Travel' : (DESIGNS[0]?.category || 'Travel');
  });
  const [visFilter, setVisFilter] = useState<VisFilter>('all');
  const [designId, setDesignId] = useState(() =>
    DESIGNS.find(d => d.category === 'Travel')?.id || DESIGNS[0]?.id || 'paris-pink',
  );
  const [coverSide, setCoverSide] = useState<CoverSide>('front');
  const [draftFront, setDraftFront] = useState<EditorElement[]>([]);
  const [draftBack, setDraftBack] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photoAdjustId, setPhotoAdjustId] = useState<string | null>(null);
  const [dirtyFront, setDirtyFront] = useState(false);
  const [dirtyBack, setDirtyBack] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hiding, setHiding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bgUiMode, setBgUiMode] = useState<CoverBgMode>('color');
  const imageFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const coverSideRef = useRef<CoverSide>('front');
  const selectedIdRef = useRef<string | null>(null);
  const [createForm, setCreateForm] = useState({
    nameEn: '',
    nameSq: '',
    category: 'Travel',
    duplicateFrom: '',
    thumbColor: '#2A2A2A',
    thumbLabel: '',
  });

  const dirty = dirtyFront || dirtyBack;
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  coverSideRef.current = coverSide;
  selectedIdRef.current = selectedId;

  const design: DesignDef | undefined = catalog.find(d => d.id === designId);
  const isHidden = !!design && savedHiddenIds.includes(design.id);
  const hasOverride = !!design && !design.isCustom && !!savedOverrides[design.id];

  const overrideFingerprint = design
    ? JSON.stringify(savedOverrides[design.id] ?? null)
    : '';
  const customFingerprint = design?.isCustom
    ? JSON.stringify(savedCustomDesigns.find(c => c.id === design.id) ?? null)
    : '';

  useEffect(() => { void ensureEditorFonts(); }, []);

  useEffect(() => {
    if (!design) return;
    if (dirtyRef.current) return;
    const { front, back } = loadCoverDrafts(design);
    setDraftFront(scaleElementsToCanvas(front, canvasH));
    setDraftBack(scaleElementsToCanvas(back, canvasH));
    setSelectedId(null);
    setDirtyFront(false);
    setDirtyBack(false);
    setCoverSide('front');
    canvasHRef.current = canvasH;
  }, [design?.id, overrideFingerprint, customFingerprint, canvasH]);

  // Switching album format reprojects the live draft into the new aspect.
  useEffect(() => {
    const prevH = canvasHRef.current;
    if (prevH === canvasH) return;
    setDraftFront(prev => reprojectCanvasElements(prev, prevH, canvasH));
    setDraftBack(prev => reprojectCanvasElements(prev, prevH, canvasH));
    canvasHRef.current = canvasH;
    setSelectedId(null);
  }, [canvasH]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const patchSide = useCallback((side: CoverSide, updater: (prev: EditorElement[]) => EditorElement[]) => {
    if (side === 'front') {
      setDraftFront(updater);
      setDirtyFront(true);
    } else {
      setDraftBack(updater);
      setDirtyBack(true);
    }
  }, []);

  const setDraft = useCallback((updater: (prev: EditorElement[]) => EditorElement[]) => {
    patchSide(coverSideRef.current, updater);
  }, [patchSide]);

  const onChangeEl = useCallback((id: string, patch: Partial<EditorElement>) => {
    setDraft(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }, [setDraft]);

  const draft = coverSide === 'front' ? draftFront : draftBack;
  const selected = draft.find(e => e.id === selectedId);
  const bgEl = draft.find(e => e.type === 'background');

  useEffect(() => {
    setBgUiMode(coverBgMode(bgEl));
  }, [bgEl?.id, bgEl?.src, bgEl?.bgGradientFrom, bgEl?.bgColor, coverSide, designId]);

  const setCoverBg = useCallback((patch: Parameters<typeof applyCoverBackground>[2]) => {
    setDraft(prev => {
      const next = applyCoverBackground(prev, canvasHRef.current, patch);
      const nextBg = next.find(e => e.type === 'background');
      if (nextBg) queueMicrotask(() => setSelectedId(nextBg.id));
      return next;
    });
  }, [setDraft]);

  const handleUploadError = (e: unknown) => {
    const msg = e instanceof ImageTooLargeError
      ? e.message
      : (e instanceof Error ? e.message : 'Upload failed');
    setSaveError(msg);
  };

  const uploadAndSetBgPhoto = async (file: File) => {
    const side = coverSideRef.current;
    setUploading(true);
    setSaveError(null);
    try {
      const url = await uploadStudioImage(file, getToken());
      setBgUiMode('photo');
      patchSide(side, prev => {
        const next = applyCoverBackground(prev, canvasHRef.current, { mode: 'photo', src: url });
        const nextBg = next.find(e => e.type === 'background');
        if (nextBg) queueMicrotask(() => setSelectedId(nextBg.id));
        return next;
      });
    } catch (e) {
      handleUploadError(e);
    } finally {
      setUploading(false);
    }
  };

  const uploadAndReplaceImage = async (file: File, targetId?: string) => {
    const side = coverSideRef.current;
    const idAtStart = targetId || selectedIdRef.current;
    setUploading(true);
    setSaveError(null);
    try {
      const url = await uploadStudioImage(file, getToken());
      patchSide(side, prev => {
        if (idAtStart && prev.some(e => e.id === idAtStart && e.type === 'image')) {
          return prev.map(e => e.id === idAtStart
            ? { ...e, src: url, cropFocusX: 0.5, cropFocusY: 0.5, cropZoom: PHOTO_CORNER_ZOOM }
            : e);
        }
        const el: EditorElement = {
          id: `img-${Date.now()}`,
          type: 'image',
          src: url,
          x: 80, y: Math.round(canvasHRef.current * 0.2), w: 440, h: Math.round(canvasHRef.current * 0.35), rotation: 0,
          cropFocusX: 0.5, cropFocusY: 0.5, cropZoom: PHOTO_CORNER_ZOOM,
        };
        queueMicrotask(() => setSelectedId(el.id));
        return [...prev, el];
      });
    } catch (e) {
      handleUploadError(e);
    } finally {
      setUploading(false);
    }
  };

  const addText = () => {
    const h = canvasHRef.current;
    const el: EditorElement = {
      id: `tx-${Date.now()}`,
      type: 'text',
      text: 'New text',
      x: 60, y: Math.round(h * 0.32), w: DESIGN_W - 120, h: 60, rotation: 0,
      fontSize: 32, fill: '#1A1A1A', align: 'center',
      fontFamily: "'Londrina Solid', cursive",
    };
    setDraft(prev => [...prev, el]);
    setSelectedId(el.id);
  };

  const deleteSelected = () => {
    if (!selected || selected.type === 'background') return;
    setDraft(prev => prev.filter(e => e.id !== selected.id));
    setSelectedId(null);
  };

  const copyFrontToBack = () => {
    if (!window.confirm('Replace back cover with a copy of the front?')) return;
    const cloned = designElementsWithIds(
      `${designId || 'd'}-b-copy`,
      designElementsWithoutIds(draftFront),
    );
    setDraftBack(cloned);
    setDirtyBack(true);
    setCoverSide('back');
    setSelectedId(null);
  };

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAppSettingsQueryKey() }),
    ]);
  };

  const confirmDiscardIfDirty = () => {
    if (!dirty) return true;
    return window.confirm('Discard unsaved cover changes?');
  };

  const selectDesign = (id: string) => {
    if (designId === id) return;
    if (!confirmDiscardIfDirty()) return;
    dirtyRef.current = false;
    setDirtyFront(false);
    setDirtyBack(false);
    setDesignId(id);
    setCoverSide('front');
    setSelectedId(null);
    setPhotoAdjustId(null);
  };

  const save = async () => {
    if (!design) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Always persist in the 3:4 reference canvas so every album format
      // can reproject via scaleElementsToCanvas at apply-time.
      const toCanonical = (els: EditorElement[]) =>
        designElementsWithoutIds(
          reprojectCanvasElements(els, canvasHRef.current, DESIGN_H),
        );
      const frontElements = toCanonical(draftFront);
      const backElements = toCanonical(draftBack);

      if (design.isCustom) {
        const now = new Date().toISOString();
        const nextCustoms = savedCustomDesigns.map((c): CustomDesignRecord =>
          c.id === design.id
            ? {
                ...c,
                name: design.name,
                category: design.category,
                thumbLabel: design.thumbLabel,
                thumbColor: (design.thumb?.background as string) || c.thumbColor,
                thumbPhoto: design.thumbPhoto,
                frontElements,
                backElements,
                updatedAt: now,
              }
            : c,
        );
        await updateSettings.mutateAsync({
          data: { customDesigns: nextCustoms } as any,
        });
      } else {
        const next: DesignOverrides = {
          ...savedOverrides,
          [design.id]: {
            frontElements,
            backElements,
            ...(design.layoutRev != null ? { layoutRev: design.layoutRev } : {}),
          },
        };
        await updateSettings.mutateAsync({
          data: { designOverrides: next } as any,
        });
      }
      dirtyRef.current = false;
      setDirtyFront(false);
      setDirtyBack(false);
      await invalidate();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } catch (err: any) {
      setSaveError(err?.data?.error || err?.message || 'Failed to save layout.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!design) return;
    if (design.isCustom) {
      if (!window.confirm(`Reset "${design.name.en}" to blank front & back covers?`)) return;
      const front = scaleElementsToCanvas(blankCoverElements('FRONT'), canvasHRef.current);
      const back = scaleElementsToCanvas(blankCoverElements('BACK'), canvasHRef.current);
      setDraftFront(designElementsWithIds(`${design.id}-f`, front));
      setDraftBack(designElementsWithIds(`${design.id}-b`, back));
      setDirtyFront(true);
      setDirtyBack(true);
      setSelectedId(null);
      setSaveError(null);
      return;
    }

    const base = DESIGNS.find(d => d.id === design.id);
    if (!base) return;
    if (!window.confirm(`Reset "${base.name.en}" to the built-in layout?`)) return;
    const { front, back } = loadCoverDrafts(base);
    setDraftFront(scaleElementsToCanvas(front, canvasHRef.current));
    setDraftBack(scaleElementsToCanvas(back, canvasHRef.current));
    setDirtyFront(false);
    setDirtyBack(false);
    setSaveError(null);
    setSelectedId(null);
    const next = { ...savedOverrides };
    delete next[design.id];
    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        data: { designOverrides: next } as any,
      });
      await invalidate();
    } catch (err: any) {
      setSaveError(err?.data?.error || err?.message || 'Failed to reset layout.');
      setDirtyFront(true);
      setDirtyBack(true);
    } finally {
      setSaving(false);
    }
  };

  const toggleHidden = async () => {
    if (!design) return;
    setHiding(true);
    setSaveError(null);
    try {
      const next = isHidden
        ? savedHiddenIds.filter(id => id !== design.id)
        : [...savedHiddenIds, design.id];
      await updateSettings.mutateAsync({
        data: { hiddenDesignIds: next } as any,
      });
      await invalidate();
    } catch (err: any) {
      setSaveError(err?.data?.error || err?.message || 'Failed to update visibility.');
    } finally {
      setHiding(false);
    }
  };

  const deleteCustom = async () => {
    if (!design?.isCustom) return;
    if (!window.confirm(`Permanently delete custom design "${design.name.en}"?`)) return;
    setDeleting(true);
    setSaveError(null);
    try {
      const nextCustoms = savedCustomDesigns.filter(c => c.id !== design.id);
      const nextHidden = savedHiddenIds.filter(id => id !== design.id);
      await updateSettings.mutateAsync({
        data: { customDesigns: nextCustoms, hiddenDesignIds: nextHidden } as any,
      });
      await invalidate();
      dirtyRef.current = false;
      setDirtyFront(false);
      setDirtyBack(false);
      const fallback = catalog.find(d => d.id !== design.id && d.category === activeCat)
        || catalog.find(d => d.id !== design.id)
        || DESIGNS[0];
      if (fallback) {
        setDesignId(fallback.id);
        setActiveCat(fallback.category);
      }
    } catch (err: any) {
      setSaveError(err?.data?.error || err?.message || 'Failed to delete design.');
    } finally {
      setDeleting(false);
    }
  };

  const createDesign = async () => {
    const nameEn = createForm.nameEn.trim();
    const nameSq = createForm.nameSq.trim() || nameEn;
    if (!nameEn) {
      setSaveError('English name is required.');
      return;
    }
    if (!confirmDiscardIfDirty()) return;
    setCreating(true);
    setSaveError(null);
    try {
      const id = newCustomDesignId();
      const now = new Date().toISOString();
      const source = createForm.duplicateFrom
        ? catalog.find(d => d.id === createForm.duplicateFrom)
        : undefined;

      let frontElements: DE[];
      let backElements: DE[];
      if (source) {
        frontElements = [...designFrontElements(source)];
        const srcBack = Array.isArray(source.backElements) && source.backElements.length
          ? source.backElements
          : designBackElements(source);
        backElements = [...srcBack];
        if (!frontElements.length) frontElements = blankCoverElements('FRONT');
        if (!backElements.length) backElements = blankCoverElements('BACK');
      } else {
        frontElements = blankCoverElements('FRONT', createForm.thumbColor || '#F7F5F2');
        backElements = blankCoverElements('BACK', createForm.thumbColor || '#F7F5F2');
      }

      const record: CustomDesignRecord = {
        id,
        name: { en: nameEn, sq: nameSq },
        category: createForm.category || 'Travel',
        thumbLabel: createForm.thumbLabel.trim() || nameEn.slice(0, 12).toUpperCase(),
        thumbColor: createForm.thumbColor || '#2A2A2A',
        frontElements,
        backElements,
        createdAt: now,
        updatedAt: now,
      };

      const nextCustoms = [...savedCustomDesigns, record];
      await updateSettings.mutateAsync({
        data: { customDesigns: nextCustoms } as any,
      });
      await invalidate();
      dirtyRef.current = false;
      setDirtyFront(false);
      setDirtyBack(false);
      setShowCreate(false);
      setCreateForm({
        nameEn: '',
        nameSq: '',
        category: createForm.category,
        duplicateFrom: '',
        thumbColor: '#2A2A2A',
        thumbLabel: '',
      });
      setActiveCat(record.category);
      setDesignId(id);
      setCoverSide('front');
    } catch (err: any) {
      setSaveError(err?.data?.error || err?.message || 'Failed to create design.');
    } finally {
      setCreating(false);
    }
  };

  const catDesigns = useMemo(() => {
    return catalog.filter(d => {
      if (d.category !== activeCat) return false;
      const hidden = savedHiddenIds.includes(d.id);
      if (visFilter === 'visible' && hidden) return false;
      if (visFilter === 'hidden' && !hidden) return false;
      return true;
    });
  }, [catalog, activeCat, visFilter, savedHiddenIds]);

  const categoryOptions = useMemo(() => {
    const keys = [
      ...CATEGORY_ORDER,
      ...Object.keys(CATEGORY_LABELS).filter(k => !CATEGORY_ORDER.includes(k)),
    ];
    return [...new Set(keys)];
  }, []);

  const panelH = 'min-h-[520px] lg:h-[calc(100vh-7.5rem)] lg:max-h-[calc(100vh-7.5rem)]';

  return (
    <AdminLayout>
      <div className="p-2.5 sm:p-4 w-full max-w-none flex flex-col gap-3">
        {/* Compact top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-serif font-semibold leading-tight" style={{ color: ADMIN.ink }}>
              Design Studio
            </h1>
            <p className="text-[12px] mt-0.5 truncate" style={{ color: ADMIN.muted }}>
              Edit front &amp; back covers · changes go live after Save
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(true)}
              disabled={saving || creating} className="rounded-xl h-9">
              <Plus size={14} className="mr-1" /> New
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={toggleHidden}
              disabled={!design || hiding || saving} className="rounded-xl h-9"
              title={isHidden ? 'Show in wizard & editor' : 'Hide from wizard & editor'}>
              {hiding ? <Loader2 size={14} className="mr-1 animate-spin" /> :
                isHidden ? <Eye size={14} className="mr-1" /> : <EyeOff size={14} className="mr-1" />}
              {isHidden ? 'Show' : 'Hide'}
            </Button>
            {design?.isCustom && (
              <Button type="button" variant="outline" size="sm" onClick={deleteCustom}
                disabled={deleting || saving} className="rounded-xl h-9 text-red-700">
                {deleting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Trash2 size={14} className="mr-1" />}
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={resetToDefault}
              disabled={!design || saving} className="rounded-xl h-9">
              <RotateCcw size={14} className="mr-1" /> Reset
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={!design || !dirty || saving}
              className="rounded-xl h-9 text-white hover:opacity-90 min-w-[7.5rem]"
              style={{ background: dirty ? ADMIN.blush : ADMIN.ink }}>
              {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> :
                savedFlash ? <Check size={14} className="mr-1" /> :
                <Save size={14} className="mr-1" />}
              {savedFlash ? 'Saved' : dirty ? 'Save' : 'Saved'}
            </Button>
          </div>
        </div>

        {saveError && (
          <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm"
            style={{ background: '#FDF2F2', border: '1px solid #F0C9C9', color: '#8B3A3A' }}>
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{saveError}</p>
              <button type="button" className="underline text-xs mt-1 opacity-80" onClick={() => setSaveError(null)}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="rounded-xl p-3.5 sm:p-4 space-y-3"
            style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-serif font-semibold" style={{ color: ADMIN.ink }}>New custom design</p>
                <p className="text-[11px] mt-0.5" style={{ color: ADMIN.muted }}>
                  Blank covers or duplicate an existing layout.
                </p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1 rounded-lg" style={{ color: ADMIN.muted }}>
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Name (EN)</label>
                <Input value={createForm.nameEn}
                  onChange={e => setCreateForm(f => ({ ...f, nameEn: e.target.value }))}
                  placeholder="My Cover" />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Name (SQ)</label>
                <Input value={createForm.nameSq}
                  onChange={e => setCreateForm(f => ({ ...f, nameSq: e.target.value }))}
                  placeholder="Kopertina ime" />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Category</label>
                <select value={createForm.category}
                  onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                  style={{ borderColor: ADMIN.line }}>
                  {categoryOptions.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]?.en ?? cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Duplicate from</label>
                <select value={createForm.duplicateFrom}
                  onChange={e => setCreateForm(f => ({ ...f, duplicateFrom: e.target.value }))}
                  className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                  style={{ borderColor: ADMIN.line }}>
                  <option value="">Blank covers</option>
                  {catalog.map(d => (
                    <option key={d.id} value={d.id}>{d.name.en} ({d.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Thumb color</label>
                <div className="flex gap-2">
                  <input type="color" value={createForm.thumbColor}
                    onChange={e => setCreateForm(f => ({ ...f, thumbColor: e.target.value }))}
                    className="h-9 w-12 rounded border cursor-pointer" style={{ borderColor: ADMIN.line }} />
                  <Input value={createForm.thumbColor}
                    onChange={e => setCreateForm(f => ({ ...f, thumbColor: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Thumb label</label>
                <Input value={createForm.thumbLabel}
                  onChange={e => setCreateForm(f => ({ ...f, thumbLabel: e.target.value }))}
                  placeholder="Optional short label" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={createDesign} disabled={creating}
                className="rounded-xl text-white" style={{ background: ADMIN.blush }}>
                {creating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
                Create
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm py-20 justify-center" style={{ color: ADMIN.muted }}>
            <Loader2 className="animate-spin" size={16} /> Loading designs…
          </div>
        ) : (
          <div className={`grid grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)_300px] gap-2.5 sm:gap-3 ${panelH}`}>
            {/* Left: catalog */}
            <div className="rounded-xl overflow-hidden flex flex-col order-2 lg:order-1 min-h-0"
              style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
              <div className="flex items-center justify-between gap-2 px-2.5 py-2 shrink-0"
                style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
                <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: ADMIN.muted }}>
                  Catalog
                </span>
                <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: ADMIN.bg }}>
                  {VIS_FILTERS.map(f => (
                    <button key={f} type="button" onClick={() => setVisFilter(f)}
                      className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold capitalize"
                      style={
                        visFilter === f
                          ? { background: ADMIN.ink, color: '#fff' }
                          : { color: ADMIN.muted }
                      }>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-1 min-h-0">
                <div className="w-[96px] shrink-0 overflow-y-auto py-1.5"
                  style={{ borderRight: `1px solid ${ADMIN.line}`, background: ADMIN.bg }}>
                  {categories.map(cat => {
                    const count = categoryCounts[cat] || 0;
                    const active = activeCat === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setActiveCat(cat);
                          const first = catalog.find(d => {
                            if (d.category !== cat) return false;
                            const hidden = savedHiddenIds.includes(d.id);
                            if (visFilter === 'visible' && hidden) return false;
                            if (visFilter === 'hidden' && !hidden) return false;
                            return true;
                          });
                          if (first) selectDesign(first.id);
                        }}
                        className="w-full flex flex-col items-start gap-0.5 px-2 py-1.5 text-left transition-colors"
                        style={
                          active
                            ? { background: ADMIN.blushSoft, color: ADMIN.blushDeep, borderRight: `2px solid ${ADMIN.blush}` }
                            : { color: ADMIN.ink }
                        }
                      >
                        <span className="text-[10px] font-semibold leading-tight line-clamp-2">
                          {CATEGORY_LABELS[cat]?.en ?? cat}
                        </span>
                        <span className="text-[9px] tabular-nums" style={{ color: ADMIN.muted }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1 min-w-0 overflow-y-auto p-1.5 space-y-1">
                  {catDesigns.length === 0 && (
                    <p className="text-[11px] py-6 text-center" style={{ color: ADMIN.muted }}>No designs here.</p>
                  )}
                  {catDesigns.map(d => {
                    const overridden = !d.isCustom && !!savedOverrides[d.id];
                    const hidden = savedHiddenIds.includes(d.id);
                    const previewEls = designFrontElements(d);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => selectDesign(d.id)}
                        className="w-full flex items-center gap-2 p-1 rounded-lg border text-left transition-all"
                        style={
                          designId === d.id
                            ? { borderColor: ADMIN.blush, background: ADMIN.blushSoft, boxShadow: `0 0 0 1px ${ADMIN.blush}` }
                            : { borderColor: 'transparent', background: 'transparent', opacity: hidden ? 0.55 : 1 }
                        }
                      >
                        <div className="rounded overflow-hidden shrink-0 relative bg-white"
                          style={{ width: CATALOG_THUMB_W, height: CATALOG_THUMB_H, border: `1px solid ${ADMIN.line}` }}>
                          {previewEls.length > 0 ? (
                            <PageThumb elements={previewEls} width={CATALOG_THUMB_W} height={CATALOG_THUMB_H} />
                          ) : (
                            <div className="w-full h-full" style={{ background: (d.thumb?.background as string) || ADMIN.bg }} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: ADMIN.ink }}>{d.name.en}</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {d.isCustom && (
                              <span className="text-[8px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.blush }}>Yours</span>
                            )}
                            {overridden && (
                              <span className="text-[8px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.blush }}>Edited</span>
                            )}
                            {hidden && (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-semibold uppercase tracking-wide text-neutral-500">
                                <EyeOff size={8} /> Hidden
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Center: canvas workspace */}
            <div className="rounded-xl flex flex-col order-1 lg:order-2 min-h-0 overflow-hidden"
              style={{ background: ADMIN.bg, border: `1px solid ${ADMIN.line}` }}>
              {design ? (
                <>
                  {/* Workspace chrome */}
                  <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2"
                    style={{ background: ADMIN.card, borderBottom: `1px solid ${ADMIN.line}` }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-serif font-semibold truncate" style={{ color: ADMIN.ink }}>{design.name.en}</p>
                      <p className="text-[10px] truncate" style={{ color: ADMIN.muted }}>
                        {isHidden ? 'Hidden from customers' : 'Visible to customers'}
                        {hasOverride ? ' · override' : ''}
                        {dirty ? ` · unsaved${dirtyFront && dirtyBack ? ' (both)' : dirtyFront ? ' (front)' : ' (back)'}` : ''}
                      </p>
                    </div>
                    <div className="inline-flex p-0.5 rounded-lg" style={{ background: ADMIN.bg }}>
                      {(['front', 'back'] as const).map(side => (
                        <button key={side} type="button"
                          onClick={() => { setCoverSide(side); setSelectedId(null); setPhotoAdjustId(null); }}
                          className="px-3 py-1 rounded-md text-[11px] font-semibold capitalize"
                          style={
                            coverSide === side
                              ? { background: ADMIN.blush, color: '#fff' }
                              : { color: ADMIN.muted }
                          }>
                          {side}{(side === 'front' ? dirtyFront : dirtyBack) ? ' ·' : ''}
                        </button>
                      ))}
                    </div>
                    {bookSizes.length > 0 && (
                      <label className="inline-flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: ADMIN.muted }}>
                        <Layers size={12} />
                        <select
                          value={formatSizeId ?? ''}
                          onChange={e => setFormatSizeId(e.target.value ? Number(e.target.value) : null)}
                          className="h-8 rounded-lg px-2 text-[11px] font-semibold outline-none max-w-[11rem]"
                          style={{ border: `1px solid ${ADMIN.line}`, background: ADMIN.card, color: ADMIN.ink }}
                          title="Preview book format"
                        >
                          {bookSizes.map((sz: any) => (
                            <option key={sz.id} value={sz.id}>{formatSizeLabel(sz)}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  {/* Canvas stage area */}
                  <div className="flex-1 min-h-0 overflow-auto flex justify-center items-start p-3 sm:p-4">
                    <div className="w-full max-w-[560px] h-full min-h-[200px] rounded-md shadow-lg overflow-hidden bg-white flex flex-col"
                      style={{ touchAction: 'none' }}>
                      <DesignCanvas
                        elements={draft}
                        selectedId={selectedId}
                        onSelect={(id) => {
                          setSelectedId(id);
                          setPhotoAdjustId(cur => (cur && cur !== id ? null : cur));
                        }}
                        onChangeEl={onChangeEl}
                        canvasH={canvasH}
                        photoAdjustId={photoAdjustId}
                        onEnterPhotoAdjust={(id) => {
                          const el = draft.find(e => e.id === id);
                          if (el && (el.cropZoom ?? 1) < PHOTO_CORNER_ZOOM) {
                            onChangeEl(id, { cropZoom: PHOTO_CORNER_ZOOM });
                          }
                          setSelectedId(id);
                          setPhotoAdjustId(id);
                        }}
                        onExitPhotoAdjust={() => setPhotoAdjustId(null)}
                      />
                    </div>
                  </div>

                  {/* Tool strip */}
                  <div className="shrink-0 flex flex-wrap items-center justify-center gap-1 px-2 py-2"
                    style={{ background: ADMIN.card, borderTop: `1px solid ${ADMIN.line}` }}>
                    <input ref={imageFileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAndReplaceImage(f); e.target.value = ''; }} />
                    <input ref={bgFileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAndSetBgPhoto(f); e.target.value = ''; }} />
                    <button type="button" onClick={addText} disabled={uploading}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                      style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
                      <Type size={13} /> Text
                    </button>
                    <button type="button" onClick={() => imageFileRef.current?.click()} disabled={uploading}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                      style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
                      {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Image
                    </button>
                    <button type="button" onClick={() => {
                      const bg = draft.find(e => e.type === 'background');
                      if (bg) setSelectedId(bg.id);
                      else setCoverBg({ mode: 'color', bgColor: '#FFFFFF' });
                    }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                      style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
                      <Palette size={13} /> Background
                    </button>
                    <button type="button" onClick={deleteSelected}
                      disabled={!selected || selected.type === 'background'}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-red-700 disabled:opacity-40"
                      style={{ background: '#FDF2F2' }}>
                      <Trash2 size={13} /> Delete
                    </button>
                    {coverSide === 'back' && (
                      <button type="button" onClick={copyFrontToBack}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                        style={{ background: ADMIN.bg, color: ADMIN.ink, border: `1px solid ${ADMIN.line}` }}>
                        <Copy size={13} /> Copy front → back
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <p className="text-sm" style={{ color: ADMIN.muted }}>Select a design from the catalog</p>
                </div>
              )}
            </div>

            {/* Right: inspector */}
            <div className="rounded-xl flex flex-col order-3 min-h-0 overflow-hidden"
              style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
              <div className="shrink-0 px-3 py-2 flex items-center justify-between gap-2"
                style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
                <p className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: ADMIN.muted }}>
                  Properties
                </p>
                <span className="text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded"
                  style={{ background: ADMIN.bg, color: ADMIN.ink }}>
                  {coverSide}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              {!selected ? (
                <div className="rounded-lg px-3 py-4 text-center" style={{ background: ADMIN.bg }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: ADMIN.muted }}>
                    Select an element on the cover, or add Text / Image / Background below the canvas.
                  </p>
                </div>
              ) : selected.type === 'text' ? (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold" style={{ color: ADMIN.ink }}>Text</p>
                  <Input value={selected.text || ''}
                    onChange={e => onChangeEl(selected.id, { text: e.target.value })} />
                  <label className="block text-[10px] font-medium" style={{ color: ADMIN.muted }}>Font</label>
                  <select
                    value={normalizeStudioFont(selected.fontFamily)}
                    onChange={e => onChangeEl(selected.id, { fontFamily: e.target.value })}
                    className="w-full h-9 rounded-lg px-2.5 text-[12px] outline-none"
                    style={{
                      border: `1px solid ${ADMIN.line}`,
                      background: ADMIN.card,
                      color: ADMIN.ink,
                      fontFamily: normalizeStudioFont(selected.fontFamily),
                    }}
                  >
                    {STUDIO_FONTS.map(f => (
                      <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: ADMIN.muted }}>Size</label>
                      <Input type="number" value={selected.fontSize || 20}
                        onChange={e => onChangeEl(selected.id, { fontSize: Number(e.target.value) || 20 })} />
                    </div>
                    <div className="flex gap-1 pb-0.5">
                      <button
                        type="button"
                        disabled={isScriptFont(selected.fontFamily)}
                        onClick={() => {
                          const fs = selected.fontStyle || 'normal';
                          const next = fs.includes('bold')
                            ? fs.replace('bold', '').replace(/\s+/g, ' ').trim() || 'normal'
                            : (fs === 'normal' || !fs ? 'bold' : `${fs} bold`.trim());
                          onChangeEl(selected.id, { fontStyle: next });
                        }}
                        className="w-9 h-9 rounded-lg text-[12px] font-bold disabled:opacity-40"
                        style={
                          (selected.fontStyle || '').includes('bold')
                            ? { background: ADMIN.blush, color: '#fff' }
                            : { background: ADMIN.blushSoft, color: ADMIN.blushDeep }
                        }
                      >
                        B
                      </button>
                      <button
                        type="button"
                        disabled={isScriptFont(selected.fontFamily)}
                        onClick={() => {
                          const fs = selected.fontStyle || 'normal';
                          const next = fs.includes('italic')
                            ? fs.replace('italic', '').replace(/\s+/g, ' ').trim() || 'normal'
                            : (fs === 'normal' || !fs ? 'italic' : `${fs} italic`.trim());
                          onChangeEl(selected.id, { fontStyle: next });
                        }}
                        className="w-9 h-9 rounded-lg text-[12px] italic disabled:opacity-40"
                        style={
                          (selected.fontStyle || '').includes('italic')
                            ? { background: ADMIN.blush, color: '#fff' }
                            : { background: ADMIN.blushSoft, color: ADMIN.blushDeep }
                        }
                      >
                        I
                      </button>
                    </div>
                  </div>
                  <label className="block text-[10px] font-medium" style={{ color: ADMIN.muted }}>Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={selected.fill || '#111111'}
                      onChange={e => onChangeEl(selected.id, { fill: e.target.value })}
                      className="h-9 w-11 rounded border cursor-pointer" style={{ borderColor: ADMIN.line }} />
                    <Input value={selected.fill || '#111111'}
                      onChange={e => onChangeEl(selected.id, { fill: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: ADMIN.muted }}>Tracking</label>
                      <Input type="number" value={selected.letterSpacing ?? 0}
                        onChange={e => onChangeEl(selected.id, { letterSpacing: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: ADMIN.muted }}>Align</label>
                      <div className="flex gap-0.5">
                        {(['left', 'center', 'right'] as const).map(a => (
                          <button key={a} type="button" onClick={() => onChangeEl(selected.id, { align: a })}
                            className="flex-1 h-9 rounded-lg text-[10px] font-semibold capitalize"
                            style={
                              (selected.align || 'center') === a
                                ? { background: ADMIN.blush, color: '#fff' }
                                : { background: ADMIN.blushSoft, color: ADMIN.blushDeep }
                            }>
                            {a[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : selected.type === 'image' ? (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold" style={{ color: ADMIN.ink }}>Image</p>
                  {selected.src ? (
                    <img src={selected.src} alt="" className="w-full h-28 object-contain rounded-lg bg-neutral-50"
                      style={{ border: `1px solid ${ADMIN.line}` }} />
                  ) : null}
                  <p className="text-[10px] tabular-nums" style={{ color: ADMIN.muted }}>
                    {Math.round(selected.w)}×{Math.round(selected.h)} · ({Math.round(selected.x)}, {Math.round(selected.y)})
                  </p>
                  {(() => {
                    const adjustDisabled = selected.objectFit === 'contain' || selected.mixBlendMode === 'screen' || !selected.src;
                    const adjusting = photoAdjustId === selected.id;
                    return (
                      <>
                        <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: ADMIN.bg }}>
                          <button type="button" onClick={() => setPhotoAdjustId(null)}
                            className="flex-1 py-1.5 rounded-md text-[10px] font-semibold"
                            style={!adjusting ? { background: ADMIN.ink, color: '#fff' } : { color: ADMIN.muted }}>
                            Move frame
                          </button>
                          <button type="button" disabled={adjustDisabled}
                            onClick={() => {
                              if (adjustDisabled) return;
                              if ((selected.cropZoom ?? 1) < PHOTO_CORNER_ZOOM) {
                                onChangeEl(selected.id, { cropZoom: PHOTO_CORNER_ZOOM });
                              }
                              setPhotoAdjustId(selected.id);
                            }}
                            className="flex-1 py-1.5 rounded-md text-[10px] font-semibold disabled:opacity-40"
                            style={adjusting ? { background: '#0D9488', color: '#fff' } : { color: ADMIN.muted }}>
                            Adjust photo
                          </button>
                        </div>
                        {(adjusting || (selected.cropZoom ?? 1) > 1) && !adjustDisabled && (
                          <div>
                            <label className="block text-[10px] font-medium mb-1" style={{ color: ADMIN.muted }}>
                              Zoom {Math.round((selected.cropZoom ?? 1) * 100)}%
                            </label>
                            <input type="range" min={100} max={300} step={5}
                              value={Math.round((selected.cropZoom ?? 1) * 100)}
                              onChange={e => onChangeEl(selected.id, { cropZoom: Math.max(1, Number(e.target.value) / 100) })}
                              className="w-full" style={{ accentColor: ADMIN.blush }} />
                          </div>
                        )}
                        <p className="text-[10px] leading-relaxed" style={{ color: ADMIN.muted }}>
                          {adjusting
                            ? 'Drag inside the frame to reposition · Esc to exit'
                            : adjustDisabled
                              ? 'Landmark graphics stay letterboxed — drag/resize the frame.'
                              : 'Move frame on the page, or Adjust photo to pan inside the frame.'}
                        </p>
                      </>
                    );
                  })()}
                  <Button type="button" variant="outline" size="sm" className="w-full rounded-lg" disabled={uploading}
                    onClick={() => imageFileRef.current?.click()}>
                    {uploading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Upload size={14} className="mr-1.5" />}
                    {selected.src ? 'Replace' : 'Upload'}
                  </Button>
                </div>
              ) : selected.type === 'shape' ? (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold" style={{ color: ADMIN.ink }}>Decoration</p>
                  <p className="text-[10px] tabular-nums" style={{ color: ADMIN.muted }}>
                    {Math.round(selected.w)}×{Math.round(selected.h)} · ({Math.round(selected.x)}, {Math.round(selected.y)})
                  </p>
                  <Button type="button" variant="outline" size="sm" className="w-full rounded-lg text-red-700"
                    onClick={deleteSelected}>
                    <Trash2 size={14} className="mr-1.5" /> Delete
                  </Button>
                </div>
              ) : selected.type === 'background' ? (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold" style={{ color: ADMIN.ink }}>Background</p>
                  <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: ADMIN.bg }}>
                    {([
                      { id: 'color' as const, label: 'Color', icon: Droplets },
                      { id: 'gradient' as const, label: 'Grad', icon: Palette },
                      { id: 'photo' as const, label: 'Photo', icon: ImageIcon },
                    ]).map(m => (
                      <button key={m.id} type="button"
                        onClick={() => {
                          setBgUiMode(m.id);
                          if (m.id === 'color') setCoverBg({ mode: 'color', bgColor: selected.bgColor || '#FFFFFF' });
                          else if (m.id === 'gradient') setCoverBg({
                            mode: 'gradient',
                            bgGradientFrom: selected.bgGradientFrom || selected.bgColor || '#1A1A1A',
                            bgGradientTo: selected.bgGradientTo || '#666666',
                            bgGradientDir: selected.bgGradientDir || 'tb',
                          });
                          else setCoverBg({ mode: 'photo', src: selected.src || undefined });
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-semibold"
                        style={
                          bgUiMode === m.id
                            ? { background: ADMIN.blush, color: '#fff' }
                            : { color: ADMIN.blushDeep }
                        }>
                        <m.icon size={11} /> {m.label}
                      </button>
                    ))}
                  </div>

                  {bgUiMode === 'color' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 gap-1.5">
                        {COVER_SWATCHES.map(c => {
                          const active = !selected.src && !(selected.bgGradientFrom && selected.bgGradientTo)
                            && (selected.bgColor || '').toLowerCase() === c.toLowerCase();
                          return (
                            <button key={c} type="button" title={c}
                              onClick={() => setCoverBg({ mode: 'color', bgColor: c })}
                              className="aspect-square rounded-md border transition-transform hover:scale-105"
                              style={{
                                background: c,
                                borderColor: active ? ADMIN.blush : ADMIN.line,
                                boxShadow: active ? `0 0 0 2px ${ADMIN.blush}` : undefined,
                              }}
                            />
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <input type="color" value={selected.bgColor || '#ffffff'}
                          onChange={e => setCoverBg({ mode: 'color', bgColor: e.target.value })}
                          className="h-9 w-11 rounded border cursor-pointer" style={{ borderColor: ADMIN.line }} />
                        <Input value={selected.bgColor || '#ffffff'}
                          onChange={e => setCoverBg({ mode: 'color', bgColor: e.target.value })} />
                      </div>
                    </div>
                  )}

                  {bgUiMode === 'gradient' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-1.5">
                        {COVER_GRADIENT_PRESETS.map((g, i) => (
                          <button key={i} type="button"
                            onClick={() => setCoverBg({
                              mode: 'gradient',
                              bgGradientFrom: g.from,
                              bgGradientTo: g.to,
                              bgGradientDir: g.dir,
                            })}
                            className="h-8 rounded-md border"
                            style={{
                              borderColor: ADMIN.line,
                              background: g.dir === 'lr'
                                ? `linear-gradient(to right, ${g.from}, ${g.to})`
                                : g.dir === 'diag'
                                  ? `linear-gradient(135deg, ${g.from}, ${g.to})`
                                  : `linear-gradient(to bottom, ${g.from}, ${g.to})`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <input type="color"
                          value={selected.bgGradientFrom || selected.bgColor || '#1A1A1A'}
                          onChange={e => setCoverBg({
                            mode: 'gradient',
                            bgGradientFrom: e.target.value,
                            bgGradientTo: selected.bgGradientTo || '#666666',
                            bgGradientDir: selected.bgGradientDir || 'tb',
                          })}
                          className="h-9 w-11 rounded border cursor-pointer" style={{ borderColor: ADMIN.line }} />
                        <span className="text-[10px]" style={{ color: ADMIN.muted }}>→</span>
                        <input type="color"
                          value={selected.bgGradientTo || '#666666'}
                          onChange={e => setCoverBg({
                            mode: 'gradient',
                            bgGradientFrom: selected.bgGradientFrom || selected.bgColor || '#1A1A1A',
                            bgGradientTo: e.target.value,
                            bgGradientDir: selected.bgGradientDir || 'tb',
                          })}
                          className="h-9 w-11 rounded border cursor-pointer" style={{ borderColor: ADMIN.line }} />
                      </div>
                      <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: ADMIN.bg }}>
                        {([
                          { id: 'tb' as const, label: '↓' },
                          { id: 'lr' as const, label: '→' },
                          { id: 'diag' as const, label: '↘' },
                        ]).map(d => (
                          <button key={d.id} type="button"
                            onClick={() => setCoverBg({
                              mode: 'gradient',
                              bgGradientFrom: selected.bgGradientFrom || selected.bgColor || '#1A1A1A',
                              bgGradientTo: selected.bgGradientTo || '#666666',
                              bgGradientDir: d.id,
                            })}
                            className="flex-1 py-1.5 rounded-md text-sm font-semibold"
                            style={
                              (selected.bgGradientDir || 'tb') === d.id
                                ? { background: ADMIN.ink, color: '#fff' }
                                : { color: ADMIN.muted }
                            }
                          >{d.label}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {bgUiMode === 'photo' && (
                    <div className="space-y-2">
                      {selected.src ? (
                        <img src={selected.src} alt="" className="w-full h-28 object-cover rounded-lg"
                          style={{ border: `1px solid ${ADMIN.line}` }} />
                      ) : (
                        <p className="text-[11px]" style={{ color: ADMIN.muted }}>No photo yet — upload one.</p>
                      )}
                      <Button type="button" variant="outline" size="sm" className="w-full rounded-lg" disabled={uploading}
                        onClick={() => bgFileRef.current?.click()}>
                        {uploading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Upload size={14} className="mr-1.5" />}
                        {selected.src ? 'Replace photo' : 'Upload photo'}
                      </Button>
                      {selected.src && (
                        <>
                          <div>
                            <label className="block text-[10px] font-medium mb-1" style={{ color: ADMIN.muted }}>
                              Zoom {Math.round((selected.cropZoom ?? 1) * 100)}%
                            </label>
                            <input type="range" min={100} max={300} step={5}
                              value={Math.round((selected.cropZoom ?? 1) * 100)}
                              onChange={e => {
                                const z = Math.max(1, Number(e.target.value) / 100);
                                onChangeEl(selected.id, { cropZoom: z });
                              }}
                              onPointerDown={() => {
                                if ((selected.cropZoom ?? 1) < PHOTO_CORNER_ZOOM) {
                                  onChangeEl(selected.id, { cropZoom: PHOTO_CORNER_ZOOM });
                                }
                              }}
                              className="w-full" style={{ accentColor: ADMIN.blush }} />
                          </div>
                          <p className="text-[10px] leading-relaxed" style={{ color: ADMIN.muted }}>
                            Drag the background on the canvas to reposition. Use zoom to unlock more crop room.
                          </p>
                          <Button type="button" variant="ghost" size="sm" className="w-full rounded-lg text-red-700"
                            onClick={() => setCoverBg({ mode: 'color', bgColor: selected.bgColor || '#FFFFFF' })}>
                            Remove photo
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm" style={{ color: ADMIN.muted }}>Select text, background, or an image to edit.</p>
              )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
