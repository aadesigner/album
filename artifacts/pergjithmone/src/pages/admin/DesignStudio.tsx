import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text as KonvaText, Image as KonvaImage, Transformer, Group, Path as KonvaPath } from 'react-konva';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import { AdminModal } from '@/components/admin/AdminModal';
import { useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey, getGetAppSettingsQueryKey, useListBookSizes } from '@workspace/api-client-react-tsconfig';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DESIGNS, DESIGN_W, DESIGN_H, PAPER_COLOR, CATEGORY_LABELS,
  buildDesignCatalog, parseCustomDesigns,
  designFrontElements, designBackElements,
  designElementsWithIds, designElementsWithoutIds,
  blankCoverElements, newCustomDesignId,
  getCanvasHeight, fitDesignToCanvas, unfitDesignFromCanvas,
  imageFrameCoverFit,
  type CustomDesignRecord, type DesignDef, type DesignOverrides, type EditorElement, type DE,
  PHOTO_CORNER_ZOOM, coverCropRect, imageFrameFocusFromOffset, minPhotoAdjustZoom,
} from '@/lib/designs';
import { applyCoverBackground, coverBgMode, type CoverBgMode } from '@/lib/coverBackground';
import { uploadErrorMessage, uploadImageToApi } from '@/lib/uploadImage';
import { ACCEPT_SAFE_IMAGES } from '@/lib/acceptedImages';
import { resolvePublicImageSrc } from '@/lib/categoryImages';
import { useAuth } from '@/contexts/AuthContext';
import { DesignCatalogThumb } from '@/components/PageThumb';
import {
  SHAPE_KINDS, SHAPE_LABELS, SHAPE_PRESETS, KEEP_RATIO_SHAPES,
  isStrokeOnlyShape, newShapeElement, shapePathForElement,
  type ShapeKind,
} from '@/lib/shapes';
import {
  Check, Loader2, RotateCcw, Save, Eye, EyeOff, AlertTriangle,
  Plus, Trash2, Upload, Image as ImageIcon, Type, Palette, Droplets,
  Copy, ChevronUp, ChevronDown, Hexagon,
  AlignLeft, AlignCenter, AlignRight, MousePointer2,
} from 'lucide-react';
import { useEditorFontsReady, ensureEditorFonts, normalizeEditorFont, isEditorSingleCutFont } from '@/lib/editorFonts';
import { FontPicker } from '@/components/FontPicker';

const PREVIEW_W_MIN = 160;
const CATALOG_THUMB_W = 48;
const CATALOG_THUMB_H = Math.round(CATALOG_THUMB_W * (DESIGN_H / DESIGN_W));

/** Contain-fit the full page — admin sees the same complete cover clients get. */
function previewContainFit(canvasH: number, availW: number, availH: number) {
  const stageW = Math.max(PREVIEW_W_MIN, Math.floor(availW));
  const stageH = Math.max(PREVIEW_W_MIN, Math.floor(availH));
  const scale = Math.min(stageW / DESIGN_W, stageH / Math.max(1, canvasH));
  return {
    stageW,
    stageH,
    scale,
    layerX: (stageW / scale - DESIGN_W) / 2,
    layerY: (stageH / scale - canvasH) / 2,
  };
}

function pinStudioBackground<T extends { type: string; x: number; y: number; w: number; h: number }>(
  els: T[],
  canvasH: number,
): T[] {
  return els.map(e => (
    e.type === 'background'
      ? { ...e, x: 0, y: 0, w: DESIGN_W, h: canvasH }
      : e
  ));
}

const TEXT_COLOR_CHIPS = [
  '#1A1A1A', '#FFFFFF', '#555555', '#C97B84', '#A83442',
  '#C9A227', '#0E4D5C', '#1A0A2E',
];

function studioFontStyle(ff?: string | null, fs?: string | null): string {
  if (isEditorSingleCutFont(ff)) return (fs || '').includes('bold') ? 'bold' : 'normal';
  return fs || 'normal';
}

function patchFontStyle(current: string | undefined, kind: 'bold' | 'italic', on: boolean): string {
  const parts = new Set((current || 'normal').split(/\s+/).filter(p => p && p !== 'normal'));
  if (on) parts.add(kind);
  else parts.delete(kind);
  if (parts.size === 0) return 'normal';
  return ['italic', 'bold'].filter(k => parts.has(k)).join(' ') || 'normal';
}

/** No canvas clamp — text/images may sit partly or fully outside the page. */
function studioDragBound(pos: { x: number; y: number }, _w?: number, _h?: number, _canvasH?: number) {
  return { x: pos.x, y: pos.y };
}

type StudioCtxMenu = { x: number; y: number; id: string | null };

function hitStudioElement(elements: EditorElement[], x: number, y: number, canvasH: number): string | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'background') continue;
    if (x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h) return el.id;
  }
  if (x >= 0 && x <= DESIGN_W && y >= 0 && y <= canvasH) {
    return elements.find(el => el.type === 'background')?.id ?? null;
  }
  return null;
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

function ShapeGlyph({ kind, size = 28 }: { kind: ShapeKind; size?: number }) {
  const preset = SHAPE_PRESETS[kind];
  const d = shapePathForElement(kind, 40, 40, kind === 'rect' ? 6 : 0);
  const strokeOnly = isStrokeOnlyShape(kind);
  return (
    <svg width={size} height={size} viewBox="-4 -4 48 48" aria-hidden>
      <path
        d={d}
        fill={strokeOnly ? 'none' : (preset.fill === 'transparent' ? 'none' : preset.fill)}
        fillRule="evenodd"
        stroke={preset.strokeColor || (strokeOnly ? '#1A1A1A' : 'none')}
        strokeWidth={strokeOnly ? 3.5 : 0}
        strokeLinecap="round"
        opacity={0.9}
      />
    </svg>
  );
}

const COVER_SWATCHES = [
  '#FFFFFF', '#F7F5F2', '#ECE7E1', '#1A1A1A', '#2A2A2A',
  '#C97B84', '#FEC5D7', '#A83442', '#1A2A1A', '#0D1B2A',
  '#1A0A2E', '#FF6B8A', '#C9A227', '#0E4D5C', '#BCC9D1',
];

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
  return uploadImageToApi(file, token);
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
    const url = resolvePublicImageSrc(src) || src;
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => setImg(i);
    i.onerror = () => setImg(undefined);
    i.src = url;
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
  const imgNodeRef = useRef<any>(null);
  const panStartRef = useRef<{
    focusX: number; focusY: number; px: number; py: number;
    maxOffX: number; maxOffY: number;
  } | null>(null);

  const enterAdjust = () => {
    if (isContain || !img) return;
    onEnterPhotoAdjust?.();
  };

  useEffect(() => {
    if (!photoAdjust || !img || isContain) return;
    const need = minPhotoAdjustZoom(img.width, img.height, el.w, el.h);
    if ((el.cropZoom ?? 1) + 0.001 < need) {
      onChange({ cropZoom: need });
    }
  // intentionally omit onChange — bump once when entering adjust / frame size changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoAdjust, img, isContain, el.w, el.h, el.cropZoom]);

  return (
    <Group
      ref={(n: any) => bindFrameNode(n, el.id, shapeRefs)}
      x={drag.x} y={drag.y} width={el.w} height={el.h} rotation={el.rotation || 0}
      opacity={el.opacity ?? 1}
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
      {/* Frame-sized hit target for Adjust — avoids oversized bitmap stealing neighbor hits. */}
      <Rect
        width={el.w}
        height={el.h}
        fill="rgba(0,0,0,0.001)"
        perfectDrawEnabled={false}
        listening={true}
        draggable={panInside}
        dragDistance={2}
        dragBoundFunc={() => ({ x: 0, y: 0 })}
        onDragStart={(e: any) => {
          if (!panInside) return;
          e.cancelBubble = true;
          setPanning(true);
          gesture.begin();
          const { maxOffX: mx, maxOffY: my } = panMaxRef.current;
          const p = e.target.getStage()?.getRelativePointerPosition();
          panStartRef.current = {
            focusX, focusY,
            px: p?.x ?? 0, py: p?.y ?? 0,
            maxOffX: mx, maxOffY: my,
          };
        }}
        onDragMove={(e: any) => {
          if (!panInside || !panStartRef.current) return;
          e.cancelBubble = true;
          e.target.position({ x: 0, y: 0 });
          const p = e.target.getStage()?.getRelativePointerPosition();
          if (!p) return;
          const s = panStartRef.current;
          const dx = p.x - s.px;
          const dy = p.y - s.py;
          const newOffX = Math.min(s.maxOffX, Math.max(0, s.maxOffX * s.focusX - dx));
          const newOffY = Math.min(s.maxOffY, Math.max(0, s.maxOffY * s.focusY - dy));
          const node = imgNodeRef.current;
          if (node) {
            node.position({ x: -newOffX, y: -newOffY });
            node.getLayer()?.batchDraw();
          }
        }}
        onDragEnd={(e: any) => {
          if (!panInside) return;
          e.cancelBubble = true;
          e.target.position({ x: 0, y: 0 });
          const s = panStartRef.current;
          panStartRef.current = null;
          const node = imgNodeRef.current;
          const mx = s?.maxOffX ?? panMaxRef.current.maxOffX;
          const my = s?.maxOffY ?? panMaxRef.current.maxOffY;
          const pos = node ? { x: node.x(), y: node.y() } : { x: imgX, y: imgY };
          const next = imageFrameFocusFromOffset(pos.x, pos.y, mx, my);
          if (node) node.position({ x: next.x, y: next.y });
          setLiveFocus({ x: next.cropFocusX, y: next.cropFocusY });
          onChange({
            cropFocusX: next.cropFocusX,
            cropFocusY: next.cropFocusY,
            cropZoom: Math.max(
              cropZoom,
              img ? minPhotoAdjustZoom(img.width, img.height, el.w, el.h) : PHOTO_CORNER_ZOOM,
            ),
          });
          setPanning(false);
          gesture.end();
        }}
      />
      {img && (
        <KonvaImage
          ref={(n: any) => { imgNodeRef.current = n; }}
          image={img}
          {...(panning ? {} : { x: imgX, y: imgY })}
          width={iw} height={ih}
          perfectDrawEnabled={false}
          listening={false}
          globalCompositeOperation={(el.mixBlendMode as GlobalCompositeOperation) || undefined}
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
  const kind = el.shapeKind || 'rect';
  const strokeOnly = isStrokeOnlyShape(kind);
  const drag = useStudioDrag(el, canvasH, onSelect, onChange, gesture);
  const startRef = useRef({ w: el.w, h: el.h });
  const hitPad = Math.max(0, (24 - Math.min(el.w, el.h)) / 2);
  const visualFill = el.fill && el.fill !== 'transparent' ? el.fill : undefined;
  const hitFill = visualFill || 'rgba(0,0,0,0.001)';
  const path = shapePathForElement(kind, el.w, el.h, el.cornerRadius);

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
      <KonvaPath
        name="shape-fill"
        data={path}
        fill={strokeOnly ? undefined : hitFill}
        fillRule="evenodd"
        opacity={el.opacity ?? 1}
        stroke={el.strokeColor || (strokeOnly ? '#1A1A1A' : undefined)}
        strokeWidth={el.strokeWidth || (strokeOnly ? 4 : 0)}
        lineCap="round"
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
      opacity={el.opacity ?? 1}
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
        key={`studio-txt-${el.id}-f${fontEpoch ?? 0}-${normalizeEditorFont(el.fontFamily)}`}
        text={el.text || ''}
        width={el.w} height={el.h}
        fontSize={el.fontSize || 20}
        fontFamily={normalizeEditorFont(el.fontFamily)}
        fill={el.fill || '#111'}
        align={el.align || 'center'}
        verticalAlign={el.verticalAlign || 'top'}
        fontStyle={studioFontStyle(el.fontFamily, el.fontStyle)}
        letterSpacing={el.letterSpacing || 0}
        lineHeight={el.lineHeight ?? 1.2}
        padding={6}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}, studioNodePropsEqual);

function DesignCanvas({
  elements, selectedId, onSelect, onChangeEl, canvasH, photoAdjustId, onEnterPhotoAdjust, onExitPhotoAdjust, onContextMenu,
}: {
  elements: EditorElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChangeEl: (id: string, patch: Partial<EditorElement>) => void;
  canvasH: number;
  photoAdjustId?: string | null;
  onEnterPhotoAdjust?: (id: string) => void;
  onExitPhotoAdjust?: () => void;
  onContextMenu?: (info: StudioCtxMenu) => void;
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
  const [previewBox, setPreviewBox] = useState({ w: 420, h: 560 });
  const [coarsePointer, setCoarsePointer] = useState(false);

  // Fit the page into the workspace on every format change (square ↔ 21×28).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      if (gesturingRef.current) return;
      const availW = el.clientWidth || 420;
      const availH = el.clientHeight || el.parentElement?.clientHeight || 560;
      setPreviewBox({ w: availW, h: Math.max(160, availH) });
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

  const { stageW, stageH, scale, layerX, layerY } = previewContainFit(
    canvasH,
    previewBox.w,
    previewBox.h,
  );
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

  const pickAtPointer = useCallback((): string | null => {
    const stage = stageRef.current;
    const pos = stage?.getPointerPosition?.();
    if (!pos) return null;
    return hitStudioElement(elements, pos.x / scale - layerX, pos.y / scale - layerY, canvasH);
  }, [elements, scale, layerX, layerY, canvasH]);

  const openCtx = useCallback((clientX: number, clientY: number, id: string | null) => {
    onSelect(id);
    onContextMenu?.({ x: clientX, y: clientY, id });
  }, [onSelect, onContextMenu]);

  const longPressRef = useRef<number | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);
  const clearLongPress = useCallback(() => {
    if (longPressRef.current != null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    longPressStart.current = null;
  }, []);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  return (
    <div
      ref={wrapRef}
      className="w-full h-full min-h-[200px] overflow-hidden"
      style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      onContextMenu={(e) => {
        e.preventDefault();
        openCtx(e.clientX, e.clientY, pickAtPointer());
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (!t) return;
        clearLongPress();
        longPressStart.current = { x: t.clientX, y: t.clientY };
        const cx = t.clientX;
        const cy = t.clientY;
        longPressRef.current = window.setTimeout(() => {
          longPressRef.current = null;
          openCtx(cx, cy, pickAtPointer());
        }, 520);
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        const start = longPressStart.current;
        if (!t || !start) return;
        if (Math.hypot(t.clientX - start.x, t.clientY - start.y) > 12) clearLongPress();
      }}
      onTouchEnd={clearLongPress}
      onTouchCancel={clearLongPress}
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
        onContextMenu={(e: any) => {
          e.evt?.preventDefault?.();
        }}
      >
        <Layer x={layerX} y={layerY}>
          <Rect
            x={0} y={0} width={DESIGN_W} height={canvasH}
            fill={PAPER_COLOR} listening={false} perfectDrawEnabled={false}
          />
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
          <Rect x={DESIGN_W / 2} y={0} width={1} height={canvasH}
            fill="rgba(201,123,132,0.18)" listening={false} perfectDrawEnabled={false} />
          <Rect x={0} y={canvasH / 2} width={DESIGN_W} height={1}
            fill="rgba(201,123,132,0.18)" listening={false} perfectDrawEnabled={false} />
          <Transformer
            ref={trRef}
            rotateEnabled
            resizeEnabled
            keepRatio={selected?.type === 'image' || (selected?.type === 'shape' && KEEP_RATIO_SHAPES.has(selected.shapeKind || ''))}
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
  const [showShapes, setShowShapes] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<StudioCtxMenu | null>(null);
  const [studioPane, setStudioPane] = useState<'canvas' | 'catalog' | 'props'>('canvas');
  const shapeMenuRef = useRef<HTMLDivElement>(null);
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
    canvasHRef.current = canvasH;
  }, [canvasH]);

  useEffect(() => {
    if (!design) return;
    if (dirtyRef.current) return;
    const { front, back } = loadCoverDrafts(design);
    const h = canvasH;
    canvasHRef.current = h;
    setDraftFront(pinStudioBackground(fitDesignToCanvas(front, h), h));
    setDraftBack(pinStudioBackground(fitDesignToCanvas(back, h), h));
    setSelectedId(null);
    setDirtyFront(false);
    setDirtyBack(false);
    setCoverSide('front');
  }, [design?.id, overrideFingerprint, customFingerprint]);

  const formatHRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = formatHRef.current;
    formatHRef.current = canvasH;
    if (prev == null || prev === canvasH) return;
    const remap = (els: EditorElement[]) =>
      pinStudioBackground(fitDesignToCanvas(unfitDesignFromCanvas(els, prev), canvasH), canvasH);
    setDraftFront(remap);
    setDraftBack(remap);
    canvasHRef.current = canvasH;
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
    setSaveError(uploadErrorMessage(e, 'en'));
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

  const addShape = (kind: ShapeKind) => {
    const el: EditorElement = {
      id: `sh-${Date.now()}`,
      ...newShapeElement(kind, canvasHRef.current, DESIGN_W),
    };
    setDraft(prev => [...prev, el]);
    setSelectedId(el.id);
    setShowShapes(false);
  };

  useEffect(() => {
    if (!showShapes) return;
    const onDoc = (e: MouseEvent) => {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target as Node)) {
        setShowShapes(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowShapes(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [showShapes]);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [ctxMenu]);

  const liveSelected = () => {
    const id = selectedIdRef.current;
    if (!id) return null;
    const els = coverSideRef.current === 'front' ? draftFront : draftBack;
    return els.find(e => e.id === id) || null;
  };

  const deleteSelected = () => {
    const el = liveSelected();
    if (!el || el.type === 'background') return;
    setDraft(prev => prev.filter(e => e.id !== el.id));
    setSelectedId(null);
    setPhotoAdjustId(null);
    setCtxMenu(null);
  };

  const duplicateSelected = () => {
    const el = liveSelected();
    if (!el || el.type === 'background') return;
    const copy: EditorElement = {
      ...el,
      id: `${el.type}-${Date.now()}`,
      x: el.x + 18,
      y: el.y + 18,
    };
    setDraft(prev => [...prev, copy]);
    setSelectedId(copy.id);
    setPhotoAdjustId(null);
    setCtxMenu(null);
  };

  const moveSelectedLayer = (dir: -1 | 1) => {
    const el = liveSelected();
    if (!el || el.type === 'background') return;
    setDraft(prev => {
      const i = prev.findIndex(e => e.id === el.id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      if (prev[j].type === 'background' && dir < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(i, 1);
      next.splice(j, 0, moved);
      return next;
    });
    setCtxMenu(null);
  };

  const alignSelected = (how: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selected || selected.type === 'background') return;
    const pageH = canvasHRef.current;
    const patch: Partial<EditorElement> = {};
    if (how === 'left') patch.x = 0;
    if (how === 'center') patch.x = Math.round((DESIGN_W - selected.w) / 2);
    if (how === 'right') patch.x = Math.round(DESIGN_W - selected.w);
    if (how === 'top') patch.y = 0;
    if (how === 'middle') patch.y = Math.round((pageH - selected.h) / 2);
    if (how === 'bottom') patch.y = Math.round(pageH - selected.h);
    onChangeEl(selected.id, patch);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const id = selectedIdRef.current;
      if (!id) return;
      const els = coverSideRef.current === 'front' ? draftFront : draftBack;
      const el = els.find(x => x.id === id);
      if (!el || el.type === 'background') {
        if (e.key === 'Escape') { setSelectedId(null); setPhotoAdjustId(null); }
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'Escape') {
        e.preventDefault();
        setPhotoAdjustId(null);
        setSelectedId(null);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if ((e.key === 'd' || e.key === 'D') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); onChangeEl(el.id, { x: el.x - step }); }
      if (e.key === 'ArrowRight') { e.preventDefault(); onChangeEl(el.id, { x: el.x + step }); }
      if (e.key === 'ArrowUp') { e.preventDefault(); onChangeEl(el.id, { y: el.y - step }); }
      if (e.key === 'ArrowDown') { e.preventDefault(); onChangeEl(el.id, { y: el.y + step }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draftFront, draftBack, onChangeEl, selectedId]);

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
    setStudioPane('canvas');
  };

  const save = async () => {
    if (!design) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Persist on the 3:4 artboard so every album format can contain-fit.
      const toCanonical = (els: EditorElement[]) =>
        designElementsWithoutIds(
          unfitDesignFromCanvas(els, canvasHRef.current),
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
      const h = canvasHRef.current;
      const front = pinStudioBackground(fitDesignToCanvas(blankCoverElements('FRONT'), h), h);
      const back = pinStudioBackground(fitDesignToCanvas(blankCoverElements('BACK'), h), h);
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
    const h = canvasHRef.current;
    setDraftFront(pinStudioBackground(fitDesignToCanvas(front, h), h));
    setDraftBack(pinStudioBackground(fitDesignToCanvas(back, h), h));
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

  const panelH = 'h-[min(72dvh,640px)] md:h-[calc(100dvh-7.5rem)] md:max-h-[calc(100dvh-7.5rem)] lg:h-[calc(100dvh-6.25rem)] lg:max-h-[calc(100dvh-6.25rem)]';
  const paneClass = (pane: 'canvas' | 'catalog' | 'props') =>
    `${studioPane === pane ? 'flex' : 'hidden'} md:flex`;
  const ctxEl = ctxMenu?.id ? draft.find(e => e.id === ctxMenu.id) : null;
  const ctxCanEdit = !!(ctxEl && ctxEl.type !== 'background');
  const paperThumbH = Math.max(16, Math.round(20 * (canvasH / DESIGN_W)));

  return (
    <AdminLayout>
      <div className="p-2 sm:p-3 w-full max-w-none flex flex-col gap-2">
        {/* Compact top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-serif font-semibold leading-tight" style={{ color: ADMIN.ink }}>
              Design Studio
            </h1>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: ADMIN.muted }}>
              Front &amp; back covers · live after Save
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(true)}
              disabled={saving || creating} className="rounded-lg h-8 px-2.5 text-[12px]">
              <Plus size={13} className="mr-1" /> New
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={toggleHidden}
              disabled={!design || hiding || saving} className="rounded-lg h-8 px-2.5 text-[12px]"
              title={isHidden ? 'Show in wizard & editor' : 'Hide from wizard & editor'}>
              {hiding ? <Loader2 size={13} className="mr-1 animate-spin" /> :
                isHidden ? <Eye size={13} className="mr-1" /> : <EyeOff size={13} className="mr-1" />}
              {isHidden ? 'Show' : 'Hide'}
            </Button>
            {design?.isCustom && (
              <Button type="button" variant="outline" size="sm" onClick={deleteCustom}
                disabled={deleting || saving} className="rounded-lg h-8 px-2.5 text-[12px] text-red-700">
                {deleting ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Trash2 size={13} className="mr-1" />}
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={resetToDefault}
              disabled={!design || saving} className="rounded-lg h-8 px-2.5 text-[12px]">
              <RotateCcw size={13} className="mr-1" /> Reset
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={!design || !dirty || saving}
              className="rounded-lg h-8 text-white hover:opacity-90 min-w-[6.5rem] text-[12px]"
              style={{ background: dirty ? ADMIN.blush : ADMIN.ink }}>
              {saving ? <Loader2 size={13} className="mr-1 animate-spin" /> :
                savedFlash ? <Check size={13} className="mr-1" /> :
                <Save size={13} className="mr-1" />}
              {savedFlash ? 'Saved' : dirty ? 'Save' : 'Saved'}
            </Button>
          </div>
        </div>

        <div className="md:hidden grid grid-cols-3 gap-0.5 p-0.5 rounded-lg"
          style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
          {([
            ['catalog', 'Catalog'],
            ['canvas', 'Page'],
            ['props', 'Props'],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setStudioPane(id)}
              className="h-8 rounded-md text-[11px] font-semibold"
              style={studioPane === id
                ? { background: ADMIN.ink, color: '#fff' }
                : { color: ADMIN.muted }}>
              {label}
            </button>
          ))}
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
          <AdminModal
            size="lg"
            title="New custom design"
            subtitle="Blank covers or duplicate an existing layout. Save in the studio after you finish editing."
            icon={<Plus size={16} style={{ color: ADMIN.blushDeep }} />}
            onClose={() => setShowCreate(false)}
            footer={
              <>
                <span className="flex-1" />
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="button" onClick={createDesign} disabled={creating}
                  className="rounded-xl text-white" style={{ background: ADMIN.blush }}>
                  {creating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
                  Create
                </Button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-5 py-4">
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
          </AdminModal>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm py-20 justify-center" style={{ color: ADMIN.muted }}>
            <Loader2 className="animate-spin" size={16} /> Loading designs…
          </div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-[168px_minmax(0,1fr)_220px] xl:grid-cols-[210px_minmax(0,1fr)_256px] gap-2 ${panelH}`}>
            {/* Left: catalog */}
            <div className={`rounded-xl overflow-hidden flex-col order-2 md:order-1 min-h-0 ${paneClass('catalog')}`}
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
                <div className="w-[76px] shrink-0 overflow-y-auto py-1"
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
                          <DesignCatalogThumb
                            design={d}
                            width={CATALOG_THUMB_W}
                            height={CATALOG_THUMB_H}
                            preferMockup={false}
                          />
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
            <div className={`rounded-xl flex-col order-1 md:order-2 min-h-0 overflow-hidden ${paneClass('canvas')}`}
              style={{ background: ADMIN.bg, border: `1px solid ${ADMIN.line}` }}>
              {design ? (
                <>
                  {/* Workspace chrome */}
                  <div className="shrink-0 flex flex-wrap items-center gap-1.5 px-2.5 py-1.5"
                    style={{ background: ADMIN.card, borderBottom: `1px solid ${ADMIN.line}` }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-serif font-semibold truncate" style={{ color: ADMIN.ink }}>{design.name.en}</p>
                      <p className="text-[10px] truncate" style={{ color: ADMIN.muted }}>
                        {isHidden ? 'Hidden' : 'Live'}
                        {hasOverride ? ' · override' : ''}
                        {dirty ? ` · unsaved${dirtyFront && dirtyBack ? ' (both)' : dirtyFront ? ' (front)' : ' (back)'}` : ''}
                      </p>
                    </div>
                    <div className="inline-flex p-0.5 rounded-md" style={{ background: ADMIN.bg }}>
                      {(['front', 'back'] as const).map(side => (
                        <button key={side} type="button"
                          onClick={() => { setCoverSide(side); setSelectedId(null); setPhotoAdjustId(null); }}
                          className="px-2.5 py-0.5 rounded text-[10px] font-semibold capitalize"
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
                        <span
                          className="hidden sm:inline-flex rounded-[3px] bg-white shrink-0"
                          style={{
                            width: 16,
                            height: paperThumbH,
                            border: `1px solid ${ADMIN.line}`,
                            boxShadow: '0 1px 2px rgba(40,16,28,0.06)',
                          }}
                          title="Live page shape"
                        />
                        <select
                          value={formatSizeId ?? ''}
                          onChange={e => setFormatSizeId(e.target.value ? Number(e.target.value) : null)}
                          className="h-7 rounded-md px-1.5 text-[11px] font-semibold outline-none max-w-[10.5rem]"
                          style={{ border: `1px solid ${ADMIN.line}`, background: ADMIN.card, color: ADMIN.ink }}
                          title="Album size — the page view matches this ratio"
                        >
                          {bookSizes.map((sz: any) => (
                            <option key={sz.id} value={sz.id}>{formatSizeLabel(sz)}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  {/* Live page — square 21×21 or tall 21×28, contain-fitted. */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="w-full h-full min-h-[200px] overflow-hidden"
                      style={{ touchAction: 'none', background: ADMIN.bg }}>
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
                        onContextMenu={(info) => {
                          setSelectedId(info.id);
                          setPhotoAdjustId(cur => (cur && cur !== info.id ? null : cur));
                          setCtxMenu(info);
                        }}
                      />
                    </div>
                  </div>

                  {/* Tool strip */}
                  <div className="shrink-0 flex flex-wrap items-center justify-center gap-1 px-1.5 py-1.5"
                    style={{ background: ADMIN.card, borderTop: `1px solid ${ADMIN.line}` }}>
                    <input ref={imageFileRef} type="file" accept={ACCEPT_SAFE_IMAGES} className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAndReplaceImage(f); e.target.value = ''; }} />
                    <input ref={bgFileRef} type="file" accept={ACCEPT_SAFE_IMAGES} className="hidden"
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
                    <div className="relative" ref={shapeMenuRef}>
                      <button type="button" onClick={() => setShowShapes(v => !v)} disabled={uploading}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                        style={{
                          background: showShapes ? ADMIN.blush : ADMIN.blushSoft,
                          color: showShapes ? '#fff' : ADMIN.blushDeep,
                        }}>
                        <Hexagon size={13} /> Shape
                      </button>
                      {showShapes && (
                        <div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[220px] rounded-xl p-2 shadow-lg z-20"
                          style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}
                        >
                          <p className="text-[9px] uppercase tracking-[0.12em] font-semibold px-1 pb-1.5" style={{ color: ADMIN.muted }}>
                            Add shape
                          </p>
                          <div className="grid grid-cols-3 gap-1">
                            {SHAPE_KINDS.map(kind => (
                              <button
                                key={kind}
                                type="button"
                                onClick={() => addShape(kind)}
                                className="flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 hover:bg-black/[0.04]"
                                title={SHAPE_LABELS[kind]}
                              >
                                <ShapeGlyph kind={kind} />
                                <span className="text-[9px] font-semibold" style={{ color: ADMIN.ink }}>
                                  {SHAPE_LABELS[kind]}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => {
                      const bg = draft.find(e => e.type === 'background');
                      if (bg) setSelectedId(bg.id);
                      else setCoverBg({ mode: 'color', bgColor: '#FFFFFF' });
                    }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                      style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
                      <Palette size={13} /> Background
                    </button>
                    <button type="button" onClick={duplicateSelected}
                      disabled={!selected || selected.type === 'background'}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40"
                      style={{ background: ADMIN.bg, color: ADMIN.ink }}>
                      <Copy size={13} /> Duplicate
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
            <div className={`rounded-xl flex-col order-3 min-h-0 overflow-hidden ${paneClass('props')}`}
              style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
              <div className="shrink-0 px-2.5 py-1.5 flex items-center justify-between gap-2"
                style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
                <p className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: ADMIN.muted }}>
                  Properties
                </p>
                <span className="text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded"
                  style={{ background: ADMIN.bg, color: ADMIN.ink }}>
                  {coverSide}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2.5">
              {draft.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-1.5" style={{ color: ADMIN.muted }}>
                    Layers
                  </p>
                  <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${ADMIN.line}` }}>
                    {[...draft].reverse().map(el => {
                      const label = el.type === 'text'
                        ? (el.text || 'Text').slice(0, 28)
                        : el.type === 'background'
                          ? 'Background'
                          : el.type === 'image'
                            ? 'Photo'
                            : el.type === 'shape'
                              ? SHAPE_LABELS[(el.shapeKind || 'rect') as ShapeKind] || 'Shape'
                              : 'Decoration';
                      const Icon = el.type === 'text' ? Type : el.type === 'background' ? Palette : el.type === 'image' ? ImageIcon : Hexagon;
                      const active = selectedId === el.id;
                      return (
                        <button
                          key={el.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(el.id);
                            if (el.type !== 'image') setPhotoAdjustId(null);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedId(el.id);
                            if (el.type !== 'image') setPhotoAdjustId(null);
                            setCtxMenu({ x: e.clientX, y: e.clientY, id: el.id });
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1 text-left text-[11px] font-medium"
                          style={active
                            ? { background: ADMIN.blushSoft, color: ADMIN.blushDeep }
                            : { background: ADMIN.card, color: ADMIN.ink, borderTop: `1px solid ${ADMIN.line}` }}
                        >
                          <Icon size={12} className="shrink-0" />
                          <span className="truncate flex-1">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selected && selected.type !== 'background' && (
                <div className="space-y-2 rounded-lg p-2.5" style={{ background: ADMIN.bg }}>
                  <p className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: ADMIN.muted }}>
                    Arrange
                  </p>
                  <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: ADMIN.card }}>
                    {([
                      ['left', <AlignLeft key="l" size={13} />],
                      ['center', <AlignCenter key="c" size={13} />],
                      ['right', <AlignRight key="r" size={13} />],
                    ] as const).map(([how, icon]) => (
                      <button key={how} type="button" title={`Align ${how}`} onClick={() => alignSelected(how)}
                        className="flex-1 h-7 rounded-md inline-flex items-center justify-center"
                        style={{ color: ADMIN.ink }}>
                        {icon}
                      </button>
                    ))}
                    <span className="w-px self-stretch mx-0.5" style={{ background: ADMIN.line }} />
                    {([
                      ['top', 'T'],
                      ['middle', 'M'],
                      ['bottom', 'B'],
                    ] as const).map(([how, label]) => (
                      <button key={how} type="button" title={`Align ${how}`} onClick={() => alignSelected(how)}
                        className="flex-1 h-7 rounded-md text-[10px] font-semibold"
                        style={{ color: ADMIN.ink }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveSelectedLayer(-1)}
                      className="flex-1 h-7 rounded-md text-[10px] font-semibold inline-flex items-center justify-center gap-1"
                      style={{ background: ADMIN.card, color: ADMIN.ink, border: `1px solid ${ADMIN.line}` }}>
                      <ChevronDown size={11} /> Back
                    </button>
                    <button type="button" onClick={() => moveSelectedLayer(1)}
                      className="flex-1 h-7 rounded-md text-[10px] font-semibold inline-flex items-center justify-center gap-1"
                      style={{ background: ADMIN.card, color: ADMIN.ink, border: `1px solid ${ADMIN.line}` }}>
                      <ChevronUp size={11} /> Front
                    </button>
                    <button type="button" onClick={duplicateSelected}
                      className="flex-1 h-7 rounded-md text-[10px] font-semibold inline-flex items-center justify-center gap-1"
                      style={{ background: ADMIN.card, color: ADMIN.ink, border: `1px solid ${ADMIN.line}` }}>
                      <Copy size={11} /> Copy
                    </button>
                  </div>
                  <label className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase w-14 shrink-0" style={{ color: ADMIN.muted }}>
                      Opacity
                    </span>
                    <input type="range" min={0} max={100} step={5} className="flex-1 min-w-0"
                      value={Math.round((selected.opacity ?? 1) * 100)}
                      onChange={e => onChangeEl(selected.id, { opacity: Number(e.target.value) / 100 })}
                      style={{ accentColor: ADMIN.blush }} />
                    <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: ADMIN.ink }}>
                      {Math.round((selected.opacity ?? 1) * 100)}
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase w-14 shrink-0" style={{ color: ADMIN.muted }}>
                      Rotate
                    </span>
                    <input type="range" min={-180} max={180} step={1} className="flex-1 min-w-0"
                      value={selected.rotation || 0}
                      onChange={e => onChangeEl(selected.id, { rotation: Number(e.target.value) })}
                      style={{ accentColor: ADMIN.blush }} />
                    <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: ADMIN.ink }}>
                      {Math.round(selected.rotation || 0)}°
                    </span>
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {([
                      ['x', selected.x],
                      ['y', selected.y],
                      ['w', selected.w],
                      ['h', selected.h],
                    ] as const).map(([k, v]) => (
                      <label key={k} className="block">
                        <span className="text-[9px] font-semibold uppercase" style={{ color: ADMIN.muted }}>{k}</span>
                        <Input type="number" className="h-7 text-[11px] mt-0.5 px-1.5" value={Math.round(v)}
                          onChange={e => onChangeEl(selected.id, { [k]: Number(e.target.value) || 0 })} />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {!selected ? (
                <div className="rounded-lg px-3 py-4 text-center" style={{ background: ADMIN.bg }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: ADMIN.muted }}>
                    Select a layer, or add Text / Image / Background under the page.
                  </p>
                </div>
              ) : selected.type === 'text' ? (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold" style={{ color: ADMIN.ink }}>Type</p>
                  <textarea
                    value={selected.text || ''}
                    onChange={e => onChangeEl(selected.id, { text: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg px-2.5 py-2 text-[13px] outline-none resize-y min-h-[4.5rem]"
                    style={{ border: `1px solid ${ADMIN.line}`, background: ADMIN.card, color: ADMIN.ink }}
                  />
                  <FontPicker
                    tone="admin"
                    value={selected.fontFamily}
                    onChange={fontFamily => onChangeEl(selected.id, { fontFamily })}
                  />
                  <div className="flex items-center gap-1.5">
                    <Input type="number" className="h-8 w-16 text-xs px-2" value={selected.fontSize || 20}
                      onChange={e => onChangeEl(selected.id, { fontSize: Math.max(8, Number(e.target.value) || 20) })} />
                    {(['regular', 'bold'] as const).map(w => {
                      const on = w === 'bold'
                        ? (selected.fontStyle || '').includes('bold')
                        : !(selected.fontStyle || '').includes('bold');
                      return (
                        <button key={w} type="button"
                          disabled={isEditorSingleCutFont(selected.fontFamily) && w === 'bold'}
                          onClick={() => onChangeEl(selected.id, { fontStyle: patchFontStyle(selected.fontStyle, 'bold', w === 'bold') })}
                          className="h-8 px-2 rounded-md text-[10px] font-semibold capitalize disabled:opacity-40"
                          style={on ? { background: ADMIN.ink, color: '#fff' } : { background: ADMIN.bg, color: ADMIN.muted }}>
                          {w === 'regular' ? 'Reg' : 'Bold'}
                        </button>
                      );
                    })}
                    <button type="button"
                      disabled={isEditorSingleCutFont(selected.fontFamily)}
                      onClick={() => onChangeEl(selected.id, {
                        fontStyle: patchFontStyle(selected.fontStyle, 'italic', !(selected.fontStyle || '').includes('italic')),
                      })}
                      className="h-8 w-8 rounded-md text-[12px] italic font-semibold disabled:opacity-40"
                      style={(selected.fontStyle || '').includes('italic')
                        ? { background: ADMIN.blush, color: '#fff' }
                        : { background: ADMIN.bg, color: ADMIN.muted }}>
                      I
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={selected.fill || '#111111'}
                      onChange={e => onChangeEl(selected.id, { fill: e.target.value })}
                      className="h-8 w-8 rounded border cursor-pointer shrink-0" style={{ borderColor: ADMIN.line }} />
                    <div className="flex flex-wrap gap-1 flex-1">
                      {TEXT_COLOR_CHIPS.map(c => (
                        <button key={c} type="button" title={c}
                          onClick={() => onChangeEl(selected.id, { fill: c })}
                          className="w-5 h-5 rounded-full border"
                          style={{
                            background: c,
                            borderColor: (selected.fill || '').toLowerCase() === c.toLowerCase() ? ADMIN.blush : ADMIN.line,
                            boxShadow: (selected.fill || '').toLowerCase() === c.toLowerCase() ? `0 0 0 2px ${ADMIN.blush}` : undefined,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium" style={{ color: ADMIN.muted }}>Line</span>
                        <span className="text-[10px] tabular-nums" style={{ color: ADMIN.ink }}>{(selected.lineHeight ?? 1.2).toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" className="w-7 h-7 rounded-md text-xs"
                          style={{ background: ADMIN.bg, color: ADMIN.ink }}
                          onClick={() => onChangeEl(selected.id, { lineHeight: Math.max(0.8, +(selected.lineHeight ?? 1.2).toFixed(1) - 0.1) })}>−</button>
                        <input type="range" min={80} max={220} step={5} className="flex-1 min-w-0"
                          value={Math.round((selected.lineHeight ?? 1.2) * 100)}
                          onChange={e => onChangeEl(selected.id, { lineHeight: Number(e.target.value) / 100 })}
                          style={{ accentColor: ADMIN.blush }} />
                        <button type="button" className="w-7 h-7 rounded-md text-xs"
                          style={{ background: ADMIN.bg, color: ADMIN.ink }}
                          onClick={() => onChangeEl(selected.id, { lineHeight: Math.min(2.2, +(selected.lineHeight ?? 1.2).toFixed(1) + 0.1) })}>+</button>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium" style={{ color: ADMIN.muted }}>Tracking</span>
                        <span className="text-[10px] tabular-nums" style={{ color: ADMIN.ink }}>{selected.letterSpacing ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" className="w-7 h-7 rounded-md text-xs"
                          style={{ background: ADMIN.bg, color: ADMIN.ink }}
                          onClick={() => onChangeEl(selected.id, { letterSpacing: (selected.letterSpacing ?? 0) - 1 })}>−</button>
                        <input type="range" min={-8} max={24} step={1} className="flex-1 min-w-0"
                          value={selected.letterSpacing ?? 0}
                          onChange={e => onChangeEl(selected.id, { letterSpacing: Number(e.target.value) })}
                          style={{ accentColor: ADMIN.blush }} />
                        <button type="button" className="w-7 h-7 rounded-md text-xs"
                          style={{ background: ADMIN.bg, color: ADMIN.ink }}
                          onClick={() => onChangeEl(selected.id, { letterSpacing: (selected.letterSpacing ?? 0) + 1 })}>+</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="flex flex-1 gap-0.5 p-0.5 rounded-lg" style={{ background: ADMIN.bg }}>
                      {(['left', 'center', 'right'] as const).map(a => (
                        <button key={a} type="button" onClick={() => onChangeEl(selected.id, { align: a })}
                          className="flex-1 h-7 rounded-md inline-flex items-center justify-center"
                          style={(selected.align || 'center') === a
                            ? { background: ADMIN.ink, color: '#fff' }
                            : { color: ADMIN.muted }}>
                          {a === 'left' ? <AlignLeft size={13} /> : a === 'right' ? <AlignRight size={13} /> : <AlignCenter size={13} />}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-1 gap-0.5 p-0.5 rounded-lg" style={{ background: ADMIN.bg }}>
                      {(['top', 'middle', 'bottom'] as const).map(a => (
                        <button key={a} type="button" onClick={() => onChangeEl(selected.id, { verticalAlign: a })}
                          className="flex-1 h-7 rounded-md text-[9px] font-semibold capitalize"
                          style={(selected.verticalAlign || 'top') === a
                            ? { background: ADMIN.ink, color: '#fff' }
                            : { color: ADMIN.muted }}>
                          {a === 'middle' ? 'Mid' : a}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button"
                      onClick={() => onChangeEl(selected.id, { text: (selected.text || '').toUpperCase() })}
                      className="flex-1 h-7 rounded-md text-[10px] font-semibold"
                      style={{ background: ADMIN.bg, color: ADMIN.ink }}>
                      AA
                    </button>
                    <button type="button"
                      onClick={() => {
                        const t = selected.text || '';
                        onChangeEl(selected.id, { text: t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t });
                      }}
                      className="flex-1 h-7 rounded-md text-[10px] font-semibold"
                      style={{ background: ADMIN.bg, color: ADMIN.ink }}>
                      Aa
                    </button>
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
                        <div className="flex gap-1">
                          {(['cover', 'contain'] as const).map(fit => (
                            <button key={fit} type="button"
                              onClick={() => {
                                onChangeEl(selected.id, { objectFit: fit });
                                if (fit === 'contain') setPhotoAdjustId(null);
                              }}
                              className="flex-1 py-1.5 rounded-md text-[10px] font-semibold capitalize"
                              style={
                                (selected.objectFit || 'cover') === fit
                                  ? { background: ADMIN.ink, color: '#fff' }
                                  : { background: ADMIN.bg, color: ADMIN.muted }
                              }>
                              {fit}
                            </button>
                          ))}
                        </div>
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
                  <p className="text-[11px] font-semibold" style={{ color: ADMIN.ink }}>
                    {SHAPE_LABELS[(selected.shapeKind || 'rect') as ShapeKind] || 'Shape'}
                  </p>
                  <p className="text-[10px] tabular-nums" style={{ color: ADMIN.muted }}>
                    {Math.round(selected.w)}×{Math.round(selected.h)} · ({Math.round(selected.x)}, {Math.round(selected.y)})
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {SHAPE_KINDS.map(kind => {
                      const active = (selected.shapeKind || 'rect') === kind;
                      return (
                        <button key={kind} type="button" onClick={() => {
                          const p = SHAPE_PRESETS[kind];
                          onChangeEl(selected.id, {
                            shapeKind: kind,
                            fill: p.fill,
                            strokeColor: p.strokeColor,
                            strokeWidth: p.strokeWidth,
                            cornerRadius: p.cornerRadius,
                          });
                        }}
                          className="flex flex-col items-center gap-0.5 rounded-md py-1"
                          style={active
                            ? { background: ADMIN.ink, color: '#fff' }
                            : { background: ADMIN.bg, color: ADMIN.ink }}
                          title={SHAPE_LABELS[kind]}>
                          <ShapeGlyph kind={kind} size={22} />
                          <span className="text-[8px] font-semibold">{SHAPE_LABELS[kind]}</span>
                        </button>
                      );
                    })}
                  </div>
                  {!isStrokeOnlyShape(selected.shapeKind) && (
                    <div>
                      <p className="text-[10px] font-medium mb-1" style={{ color: ADMIN.muted }}>Fill</p>
                      <div className="flex flex-wrap gap-1">
                        {COVER_SWATCHES.map(c => (
                          <button key={c} type="button" onClick={() => onChangeEl(selected.id, { fill: c })}
                            className="w-6 h-6 rounded-md border"
                            style={{
                              background: c,
                              borderColor: (selected.fill || '').toLowerCase() === c.toLowerCase() ? ADMIN.blush : ADMIN.line,
                              boxShadow: (selected.fill || '').toLowerCase() === c.toLowerCase() ? `0 0 0 2px ${ADMIN.blush}` : undefined,
                            }} />
                        ))}
                      </div>
                      <div className="flex gap-2 mt-1.5">
                        <input type="color" value={selected.fill && selected.fill !== 'transparent' ? selected.fill : '#1A1A1A'}
                          onChange={e => onChangeEl(selected.id, { fill: e.target.value })}
                          className="h-8 w-10 rounded border cursor-pointer" style={{ borderColor: ADMIN.line }} />
                        <Input value={selected.fill || ''}
                          onChange={e => onChangeEl(selected.id, { fill: e.target.value })} />
                      </div>
                    </div>
                  )}
                  {(selected.shapeKind || 'rect') === 'rect' && (
                    <label className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase w-14 shrink-0" style={{ color: ADMIN.muted }}>
                        Radius
                      </span>
                      <input type="range" min={0} max={80} step={1} className="flex-1 min-w-0"
                        value={selected.cornerRadius || 0}
                        onChange={e => onChangeEl(selected.id, { cornerRadius: Number(e.target.value) })}
                        style={{ accentColor: ADMIN.blush }} />
                      <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: ADMIN.ink }}>
                        {Math.round(selected.cornerRadius || 0)}
                      </span>
                    </label>
                  )}
                  <div>
                    <p className="text-[10px] font-medium mb-1" style={{ color: ADMIN.muted }}>Stroke</p>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={selected.strokeColor || '#1A1A1A'}
                        onChange={e => onChangeEl(selected.id, { strokeColor: e.target.value })}
                        className="h-8 w-10 rounded border cursor-pointer" style={{ borderColor: ADMIN.line }} />
                      <input type="range" min={0} max={24} step={1} className="flex-1 min-w-0"
                        value={selected.strokeWidth || 0}
                        onChange={e => onChangeEl(selected.id, { strokeWidth: Number(e.target.value) })}
                        style={{ accentColor: ADMIN.blush }} />
                      <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: ADMIN.ink }}>
                        {Math.round(selected.strokeWidth || 0)}
                      </span>
                    </div>
                  </div>
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
                <p className="text-sm" style={{ color: ADMIN.muted }}>Select text, a shape, background, or an image to edit.</p>
              )}
              </div>
            </div>
          </div>
        )}
      </div>

      {ctxMenu && (
        <div
          className="fixed z-[80] min-w-[176px] rounded-xl py-1 shadow-xl"
          style={{
            left: Math.max(8, Math.min(ctxMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 400) - 188)),
            top: Math.max(8, Math.min(ctxMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 400) - 240)),
            background: ADMIN.card,
            border: `1px solid ${ADMIN.line}`,
          }}
          onMouseDown={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        >
          <p className="px-2.5 pt-1.5 pb-1 text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: ADMIN.muted }}>
            {ctxEl?.type === 'text' ? 'Text'
              : ctxEl?.type === 'image' ? 'Photo'
                : ctxEl?.type === 'shape' ? 'Shape'
                  : ctxEl?.type === 'background' ? 'Background'
                    : 'Page'}
          </p>
          <button type="button"
            onClick={() => {
              setSelectedId(ctxMenu.id);
              setStudioPane('props');
              setCtxMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[12px] font-medium"
            style={{ color: ADMIN.ink }}>
            <MousePointer2 size={13} /> Select
          </button>
          {ctxCanEdit && (
            <>
              <button type="button" onClick={duplicateSelected}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[12px] font-medium"
                style={{ color: ADMIN.ink }}>
                <Copy size={13} /> Duplicate
              </button>
              <button type="button" onClick={() => moveSelectedLayer(1)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[12px] font-medium"
                style={{ color: ADMIN.ink }}>
                <ChevronUp size={13} /> Bring forward
              </button>
              <button type="button" onClick={() => moveSelectedLayer(-1)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[12px] font-medium"
                style={{ color: ADMIN.ink }}>
                <ChevronDown size={13} /> Send back
              </button>
              <div className="my-1 h-px" style={{ background: ADMIN.line }} />
              <button type="button" onClick={deleteSelected}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[12px] font-semibold text-red-700">
                <Trash2 size={13} /> Remove
              </button>
            </>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
