import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text as KonvaText, Image as KonvaImage, Transformer, Group } from 'react-konva';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import { useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey, getGetAppSettingsQueryKey } from '@workspace/api-client-react-tsconfig';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DESIGNS, DESIGN_W, DESIGN_H, CATEGORY_LABELS,
  buildDesignCatalog, parseCustomDesigns,
  designFrontElements, designBackElements,
  designElementsWithIds, designElementsWithoutIds,
  blankCoverElements, newCustomDesignId,
  type CustomDesignRecord, type DesignDef, type DesignOverrides, type EditorElement, type DE,
} from '@/lib/designs';
import { applyCoverBackground, coverBgMode, type CoverBgMode } from '@/lib/coverBackground';
import { compressImageFile, ImageTooLargeError } from '@/lib/imageCompression';
import { useAuth } from '@/contexts/AuthContext';
import {
  Check, Loader2, RotateCcw, Save, Eye, EyeOff, AlertTriangle,
  Plus, Trash2, X, Upload, Image as ImageIcon, Type, Square, Palette, Droplets,
  Copy,
} from 'lucide-react';
import { useEditorFontsReady, ensureEditorFonts } from '@/lib/editorFonts';

const PREVIEW_W = 300;
const PREVIEW_H = Math.round(PREVIEW_W * (DESIGN_H / DESIGN_W));
const SCALE = PREVIEW_W / DESIGN_W;

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
  'Wedding', 'Travel', 'Celebration', 'Baby & Family',
  'Modern', 'Portrait', 'Nature', 'Locations',
];

const VIS_FILTERS = ['all', 'visible', 'hidden'] as const;
type VisFilter = (typeof VIS_FILTERS)[number];
type CoverSide = 'front' | 'back';

function bindFrameNode(n: any, id: string, shapeRefs: React.MutableRefObject<Record<string, any>>) {
  if (!n) return;
  shapeRefs.current[id] = n;
  // Frame bounds only — ignore overflowing children (same as editor).
  n.getSelfRect = () => ({
    x: 0,
    y: 0,
    width: n.width() || 1,
    height: n.height() || 1,
  });
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

function BgFill({ el, onSelect }: { el: EditorElement; onSelect: () => void }) {
  const img = useHtmlImage(el.src);
  if (img) {
    return (
      <KonvaImage
        image={img}
        x={0} y={0} width={DESIGN_W} height={DESIGN_H}
        onClick={onSelect} onTap={onSelect}
      />
    );
  }
  const hasGrad = !!(el.bgGradientFrom && el.bgGradientTo);
  const end = el.bgGradientDir === 'lr'
    ? { x: DESIGN_W, y: 0 }
    : el.bgGradientDir === 'diag'
      ? { x: DESIGN_W, y: DESIGN_H }
      : { x: 0, y: DESIGN_H };
  return (
    <Rect
      x={0} y={0} width={DESIGN_W} height={DESIGN_H}
      fill={hasGrad ? undefined : (el.bgColor || '#fff')}
      {...(hasGrad ? {
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: end,
        fillLinearGradientColorStops: [0, el.bgGradientFrom!, 1, el.bgGradientTo!],
      } : {})}
      onClick={onSelect}
      onTap={onSelect}
    />
  );
}

function StudioImage({ el, selected, onSelect, onChange, shapeRefs }: {
  el: EditorElement; selected: boolean;
  onSelect: () => void;
  onChange: (c: Partial<EditorElement>) => void;
  shapeRefs: React.MutableRefObject<Record<string, any>>;
}) {
  const img = useHtmlImage(el.src);
  return (
    <Group
      ref={(n: any) => bindFrameNode(n, el.id, shapeRefs)}
      x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation || 0}
      draggable
      onMouseDown={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTouchStart={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onClick={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTap={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onDragEnd={(e: any) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e: any) => {
        const n = e.target;
        const sx = n.scaleX(), sy = n.scaleY();
        n.scaleX(1); n.scaleY(1);
        const nw = Math.max(20, (n.width() || el.w) * sx);
        const nh = Math.max(20, (n.height() || el.h) * sy);
        n.width(nw); n.height(nh);
        onChange({ x: n.x(), y: n.y(), w: nw, h: nh, rotation: n.rotation() });
      }}
    >
      <Rect width={el.w} height={el.h} fill="rgba(0,0,0,0.001)" />
      {img && (
        <KonvaImage image={img} width={el.w} height={el.h} perfectDrawEnabled={false} listening={false} />
      )}
      {selected && (
        <Rect width={el.w} height={el.h} stroke="#C97B84" strokeWidth={2} listening={false} />
      )}
    </Group>
  );
}

function StudioShape({ el, selected, onSelect, onChange, shapeRefs }: {
  el: EditorElement; selected: boolean;
  onSelect: () => void;
  onChange: (c: Partial<EditorElement>) => void;
  shapeRefs: React.MutableRefObject<Record<string, any>>;
}) {
  const isCircle = el.shapeKind === 'circle';
  return (
    <Group
      ref={(n: any) => bindFrameNode(n, el.id, shapeRefs)}
      x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation || 0}
      draggable
      onMouseDown={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTouchStart={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onClick={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTap={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onDragEnd={(e: any) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e: any) => {
        const n = e.target;
        const sx = n.scaleX(), sy = n.scaleY();
        n.scaleX(1); n.scaleY(1);
        const nw = Math.max(8, (n.width() || el.w) * sx);
        const nh = Math.max(8, (n.height() || el.h) * sy);
        n.width(nw); n.height(nh);
        onChange({ x: n.x(), y: n.y(), w: nw, h: nh, rotation: n.rotation() });
      }}
    >
      <Rect
        width={el.w}
        height={el.h}
        fill={el.fill && el.fill !== 'transparent' ? el.fill : 'rgba(0,0,0,0.001)'}
        opacity={el.opacity ?? 1}
        cornerRadius={isCircle ? Math.min(el.w, el.h) / 2 : (el.cornerRadius || 0)}
        stroke={el.strokeColor}
        strokeWidth={el.strokeWidth || 0}
        listening={false}
      />
      {selected && (
        <Rect width={el.w} height={el.h} stroke="#C97B84" strokeWidth={2} listening={false} />
      )}
    </Group>
  );
}

function StudioText({ el, selected, onSelect, onChange, shapeRefs, fontEpoch }: {
  el: EditorElement; selected: boolean;
  onSelect: () => void;
  onChange: (c: Partial<EditorElement>) => void;
  shapeRefs: React.MutableRefObject<Record<string, any>>;
  fontEpoch?: number;
}) {
  const startRef = useRef({ w: el.w, h: el.h });
  return (
    <Group
      ref={(n: any) => bindFrameNode(n, el.id, shapeRefs)}
      x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation || 0}
      draggable
      onMouseDown={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTouchStart={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onClick={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTap={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onDragEnd={(e: any) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformStart={() => { startRef.current = { w: el.w, h: el.h }; }}
      onTransform={(e: any) => {
        const n = e.target;
        const sx = n.scaleX(), sy = n.scaleY();
        n.scaleX(1); n.scaleY(1);
        const nw = Math.max(40, startRef.current.w * sx);
        const nh = Math.max(24, startRef.current.h * sy);
        n.width(nw); n.height(nh);
        n.getChildren().forEach((c: any) => {
          if (typeof c.width === 'function') { c.width(nw); c.height(nh); }
        });
      }}
      onTransformEnd={(e: any) => {
        const n = e.target;
        n.scaleX(1); n.scaleY(1);
        const nw = Math.max(40, n.width() || el.w);
        const nh = Math.max(24, n.height() || el.h);
        onChange({ x: n.x(), y: n.y(), w: nw, h: nh, rotation: n.rotation() });
      }}
    >
      <Rect width={el.w} height={el.h} fill="rgba(0,0,0,0.001)" />
      <KonvaText
        key={`studio-txt-${el.id}-f${fontEpoch ?? 0}`}
        text={el.text || ''}
        width={el.w} height={el.h}
        fontSize={el.fontSize || 20}
        fontFamily={el.fontFamily || 'Georgia, serif'}
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
}

function DesignCanvas({
  elements, selectedId, onSelect, onChangeEl,
}: {
  elements: EditorElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChangeEl: (id: string, patch: Partial<EditorElement>) => void;
}) {
  const trRef = useRef<any>(null);
  const shapeRefs = useRef<Record<string, any>>({});
  const fontsReady = useEditorFontsReady();
  const fontEpoch = fontsReady ? 1 : 0;
  const bgs = elements.filter(e => e.type === 'background');
  const imgs = elements.filter(e => e.type === 'image');
  const txts = elements.filter(e => e.type === 'text');
  const shapes = elements.filter(e => e.type === 'shape');
  const selected = selectedId ? elements.find(e => e.id === selectedId) : null;
  const canTransform = selected && selected.type !== 'background';

  useEffect(() => {
    if (!trRef.current) return;
    const node = (canTransform && selectedId) ? shapeRefs.current[selectedId] : null;
    trRef.current.nodes(node ? [node] : []);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId, elements, fontEpoch, canTransform]);

  return (
    <Stage
      width={PREVIEW_W}
      height={PREVIEW_H}
      scaleX={SCALE}
      scaleY={SCALE}
      onMouseDown={(e: any) => {
        if (e.target === e.target.getStage()) onSelect(null);
      }}
      onTouchStart={(e: any) => {
        if (e.target === e.target.getStage()) onSelect(null);
      }}
    >
      <Layer>
        {bgs.map(el => (
          <BgFill key={el.id} el={el} onSelect={() => onSelect(el.id)} />
        ))}
        {shapes.map(el => (
          <StudioShape
            key={el.id} el={el} selected={selectedId === el.id}
            onSelect={() => onSelect(el.id)}
            onChange={c => onChangeEl(el.id, c)}
            shapeRefs={shapeRefs}
          />
        ))}
        {imgs.map(el => (
          <StudioImage
            key={el.id} el={el} selected={selectedId === el.id}
            onSelect={() => onSelect(el.id)}
            onChange={c => onChangeEl(el.id, c)}
            shapeRefs={shapeRefs}
          />
        ))}
        {txts.map(el => (
          <StudioText
            key={el.id} el={el} selected={selectedId === el.id}
            onSelect={() => onSelect(el.id)}
            onChange={c => onChangeEl(el.id, c)}
            shapeRefs={shapeRefs}
            fontEpoch={fontEpoch}
          />
        ))}
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={
            selected?.type === 'text'
              ? ['middle-left', 'middle-right', 'top-center', 'bottom-center']
              : ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']
          }
          boundBoxFunc={(oldBox: any, newBox: any) =>
            newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
          }
          borderStroke="#C97B84"
          anchorStroke="#C97B84"
          anchorFill="#fff"
          anchorSize={12}
        />
      </Layer>
    </Stage>
  );
}

function CatalogThumb({ design }: { design: DesignDef }) {
  return (
    <div
      className="w-12 h-16 rounded-md overflow-hidden flex-shrink-0 relative"
      style={{ border: `1px solid ${ADMIN.line}`, background: (design.thumb?.background as string) || ADMIN.bg }}
    >
      {design.thumbPhoto ? (
        <img src={design.thumbPhoto} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
      ) : null}
      {design.thumbAccents?.map((style, i) => (
        <div key={i} style={{ position: 'absolute', ...style }} />
      ))}
      {design.thumbLabel ? (
        <span className="absolute bottom-0.5 left-0 right-0 text-center text-[7px] font-bold tracking-wide text-white"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{design.thumbLabel}</span>
      ) : null}
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
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const s = settings as any;

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
    setDraftFront(front);
    setDraftBack(back);
    setSelectedId(null);
    setDirtyFront(false);
    setDirtyBack(false);
    setCoverSide('front');
  }, [design?.id, overrideFingerprint, customFingerprint]);

  const draft = coverSide === 'front' ? draftFront : draftBack;

  const setDraft = useCallback((updater: (prev: EditorElement[]) => EditorElement[]) => {
    if (coverSide === 'front') {
      setDraftFront(updater);
      setDirtyFront(true);
    } else {
      setDraftBack(updater);
      setDirtyBack(true);
    }
  }, [coverSide]);

  const onChangeEl = useCallback((id: string, patch: Partial<EditorElement>) => {
    setDraft(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }, [setDraft]);

  const selected = draft.find(e => e.id === selectedId);
  const bgEl = draft.find(e => e.type === 'background');

  useEffect(() => {
    setBgUiMode(coverBgMode(bgEl));
  }, [bgEl?.id, bgEl?.src, bgEl?.bgGradientFrom, bgEl?.bgColor, coverSide, designId]);

  // Simpler applyBg that doesn't double-read stale draft
  const setCoverBg = useCallback((patch: Parameters<typeof applyCoverBackground>[2]) => {
    setDraft(prev => {
      const next = applyCoverBackground(prev, DESIGN_H, patch);
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
    setUploading(true);
    setSaveError(null);
    try {
      const url = await uploadStudioImage(file, getToken());
      setBgUiMode('photo');
      setCoverBg({ mode: 'photo', src: url });
    } catch (e) {
      handleUploadError(e);
    } finally {
      setUploading(false);
    }
  };

  const uploadAndReplaceImage = async (file: File, targetId?: string) => {
    setUploading(true);
    setSaveError(null);
    try {
      const url = await uploadStudioImage(file, getToken());
      const id = targetId || selectedId;
      if (id && draft.some(e => e.id === id && e.type === 'image')) {
        onChangeEl(id, { src: url, cropFocusX: 0.5, cropFocusY: 0.5 });
      } else {
        const el: EditorElement = {
          id: `img-${Date.now()}`,
          type: 'image',
          src: url,
          x: 80, y: 160, w: 440, h: 280, rotation: 0,
          cropFocusX: 0.5, cropFocusY: 0.5,
        };
        setDraft(prev => [...prev, el]);
        setSelectedId(el.id);
      }
    } catch (e) {
      handleUploadError(e);
    } finally {
      setUploading(false);
    }
  };

  const addText = () => {
    const el: EditorElement = {
      id: `tx-${Date.now()}`,
      type: 'text',
      text: 'New text',
      x: 60, y: 260, w: DESIGN_W - 120, h: 60, rotation: 0,
      fontSize: 32, fill: '#1A1A1A', align: 'center',
      fontFamily: "'Londrina Solid', cursive",
    };
    setDraft(prev => [...prev, el]);
    setSelectedId(el.id);
  };

  const addShape = () => {
    const el: EditorElement = {
      id: `sh-${Date.now()}`,
      type: 'shape',
      shapeKind: 'rect',
      x: 100, y: 200, w: 400, h: 120, rotation: 0,
      fill: '#E85A6B', opacity: 0.35,
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
  };

  const save = async () => {
    if (!design) return;
    setSaving(true);
    setSaveError(null);
    try {
      const frontElements = designElementsWithoutIds(draftFront);
      const backElements = designElementsWithoutIds(draftBack);

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
          [design.id]: { frontElements, backElements },
        };
        await updateSettings.mutateAsync({
          data: { designOverrides: next } as any,
        });
      }
      await invalidate();
      setDirtyFront(false);
      setDirtyBack(false);
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
      const front = blankCoverElements('FRONT');
      const back = blankCoverElements('BACK');
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
    setDraftFront(front);
    setDraftBack(back);
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

  return (
    <AdminLayout>
      <div className="p-4 sm:p-5 md:p-8 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>
              Covers
            </p>
            <h1 className="text-2xl md:text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>Design Studio</h1>
            <p className="text-sm max-w-xl" style={{ color: ADMIN.muted }}>
              Edit <strong style={{ color: ADMIN.ink, fontWeight: 600 }}>Front</strong> and{' '}
              <strong style={{ color: ADMIN.ink, fontWeight: 600 }}>Back</strong> covers separately —
              the front is what customers see first; the back closes the book. Create custom designs
              or tweak built-ins; Wizard and Editor pick up the layouts after save.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreate(true)}
              disabled={saving || creating}
              className="rounded-2xl flex-1 sm:flex-none"
            >
              <Plus size={14} className="mr-1.5" /> Create design
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={toggleHidden}
              disabled={!design || hiding || saving}
              className="rounded-2xl flex-1 sm:flex-none"
              title={isHidden ? 'Show in wizard & editor' : 'Hide from wizard & editor'}
            >
              {hiding ? <Loader2 size={14} className="mr-1.5 animate-spin" /> :
                isHidden ? <Eye size={14} className="mr-1.5" /> : <EyeOff size={14} className="mr-1.5" />}
              {isHidden ? 'Show design' : 'Hide design'}
            </Button>
            {design?.isCustom && (
              <Button
                type="button"
                variant="outline"
                onClick={deleteCustom}
                disabled={deleting || saving}
                className="rounded-2xl flex-1 sm:flex-none text-red-700"
              >
                {deleting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Trash2 size={14} className="mr-1.5" />}
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={resetToDefault} disabled={!design || saving} className="rounded-2xl flex-1 sm:flex-none">
              <RotateCcw size={14} className="mr-1.5" /> Reset
            </Button>
            <Button type="button" onClick={save} disabled={!design || !dirty || saving}
              className="rounded-2xl text-white hover:opacity-90 flex-1 sm:flex-none"
              style={{ background: ADMIN.blush }}>
              {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> :
                savedFlash ? <Check size={14} className="mr-1.5" /> :
                <Save size={14} className="mr-1.5" />}
              {savedFlash ? 'Saved' : 'Save covers'}
            </Button>
          </div>
        </div>

        {saveError && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm"
            style={{ background: '#FDF2F2', border: '1px solid #F0C9C9', color: '#8B3A3A' }}
          >
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
          <div
            className="mb-5 rounded-2xl p-4 sm:p-5 space-y-4"
            style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-serif font-semibold" style={{ color: ADMIN.ink }}>Create custom design</p>
                <p className="text-[11px] mt-0.5" style={{ color: ADMIN.muted }}>
                  Starts with blank Front &amp; Back covers, or duplicates an existing design&apos;s layouts.
                </p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1 rounded-lg" style={{ color: ADMIN.muted }}>
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Name (EN)</label>
                <Input
                  value={createForm.nameEn}
                  onChange={e => setCreateForm(f => ({ ...f, nameEn: e.target.value }))}
                  placeholder="My Cover"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Name (SQ)</label>
                <Input
                  value={createForm.nameSq}
                  onChange={e => setCreateForm(f => ({ ...f, nameSq: e.target.value }))}
                  placeholder="Kopertina ime"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Category</label>
                <select
                  value={createForm.category}
                  onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                  style={{ borderColor: ADMIN.line }}
                >
                  {categoryOptions.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]?.en ?? cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Duplicate from (optional)</label>
                <select
                  value={createForm.duplicateFrom}
                  onChange={e => setCreateForm(f => ({ ...f, duplicateFrom: e.target.value }))}
                  className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                  style={{ borderColor: ADMIN.line }}
                >
                  <option value="">Blank covers</option>
                  {catalog.map(d => (
                    <option key={d.id} value={d.id}>{d.name.en} ({d.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Thumb color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={createForm.thumbColor}
                    onChange={e => setCreateForm(f => ({ ...f, thumbColor: e.target.value }))}
                    className="h-9 w-12 rounded border cursor-pointer"
                    style={{ borderColor: ADMIN.line }}
                  />
                  <Input
                    value={createForm.thumbColor}
                    onChange={e => setCreateForm(f => ({ ...f, thumbColor: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: ADMIN.ink }}>Thumb label</label>
                <Input
                  value={createForm.thumbLabel}
                  onChange={e => setCreateForm(f => ({ ...f, thumbLabel: e.target.value }))}
                  placeholder="Optional short label"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={createDesign}
                disabled={creating}
                className="rounded-2xl text-white"
                style={{ background: ADMIN.blush }}
              >
                {creating ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Plus size={14} className="mr-1.5" />}
                Create
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="rounded-2xl">
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
          <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_280px] gap-4 sm:gap-5">
            {/* Catalog */}
            <div className="rounded-2xl overflow-hidden flex flex-col max-h-[70vh] lg:max-h-[78vh] order-2 lg:order-1" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
              <div className="flex gap-1 overflow-x-auto p-2" style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
                {categories.map(cat => (
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
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors"
                    style={
                      activeCat === cat
                        ? { background: ADMIN.blush, color: '#fff' }
                        : { background: ADMIN.blushSoft, color: ADMIN.blushDeep }
                    }
                  >
                    {CATEGORY_LABELS[cat]?.en ?? cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 p-2" style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
                {VIS_FILTERS.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setVisFilter(f)}
                    className="flex-1 px-2 py-1 rounded-lg text-[10px] font-semibold capitalize"
                    style={
                      visFilter === f
                        ? { background: ADMIN.ink, color: '#fff' }
                        : { background: ADMIN.bg, color: ADMIN.muted }
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="overflow-y-auto p-3 space-y-2 flex-1">
                {catDesigns.length === 0 && (
                  <p className="text-[11px] py-4 text-center" style={{ color: ADMIN.muted }}>No designs in this filter.</p>
                )}
                {catDesigns.map(d => {
                  const overridden = !d.isCustom && !!savedOverrides[d.id];
                  const hidden = savedHiddenIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => selectDesign(d.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl border text-left transition-all"
                      style={
                        designId === d.id
                          ? { borderColor: ADMIN.blush, background: ADMIN.blushSoft, boxShadow: `0 0 0 1px ${ADMIN.blush}` }
                          : { borderColor: ADMIN.line, opacity: hidden ? 0.55 : 1 }
                      }
                    >
                      <CatalogThumb design={d} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: ADMIN.ink }}>{d.name.en}</p>
                        <p className="text-[10px] truncate" style={{ color: ADMIN.muted }}>{d.name.sq}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {d.isCustom && (
                            <span className="inline-block text-[9px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.blush }}>
                              Yours
                            </span>
                          )}
                          {overridden && (
                            <span className="inline-block text-[9px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.blush }}>
                              Edited
                            </span>
                          )}
                          {hidden && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-500">
                              <EyeOff size={9} /> Hidden
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canvas */}
            <div className="rounded-2xl flex flex-col items-center justify-center p-4 sm:p-6 min-h-[420px] sm:min-h-[520px] order-1 lg:order-2"
              style={{ background: ADMIN.bg, border: `1px solid ${ADMIN.line}` }}>
              {design ? (
                <>
                  <p className="text-sm font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>{design.name.en}</p>
                  <div className="flex gap-1 mb-3">
                    {(['front', 'back'] as const).map(side => (
                      <button
                        key={side}
                        type="button"
                        onClick={() => {
                          setCoverSide(side);
                          setSelectedId(null);
                        }}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold capitalize"
                        style={
                          coverSide === side
                            ? { background: ADMIN.blush, color: '#fff' }
                            : { background: ADMIN.blushSoft, color: ADMIN.blushDeep }
                        }
                      >
                        {side}
                        {(side === 'front' ? dirtyFront : dirtyBack) ? ' ·' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] mb-4 text-center max-w-sm" style={{ color: ADMIN.muted }}>
                    {coverSide === 'front'
                      ? 'Front cover — the opening face of the book. Drag text & images · resize with handles · edit on the right.'
                      : 'Back cover — the closing face. Edit independently from the front.'}
                    {isHidden ? ' · currently hidden from customers' : ''}
                    {hasOverride ? ' · built-in override saved' : ''}
                  </p>
                  <div className="rounded-sm shadow-xl overflow-hidden bg-white max-w-full" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
                    <DesignCanvas
                      elements={draft}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onChangeEl={onChangeEl}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                    <input ref={imageFileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAndReplaceImage(f); e.target.value = ''; }} />
                    <input ref={bgFileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAndSetBgPhoto(f); e.target.value = ''; }} />
                    <button type="button" onClick={addText} disabled={uploading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                      style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
                      <Type size={12} /> Text
                    </button>
                    <button type="button" onClick={addShape} disabled={uploading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                      style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
                      <Square size={12} /> Shape
                    </button>
                    <button type="button" onClick={() => imageFileRef.current?.click()} disabled={uploading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                      style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
                      {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Image
                    </button>
                    <button type="button" onClick={() => {
                      const bg = draft.find(e => e.type === 'background');
                      if (bg) setSelectedId(bg.id);
                      else setCoverBg({ mode: 'color', bgColor: '#FFFFFF' });
                    }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                      style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
                      <Palette size={12} /> Background
                    </button>
                    <button type="button" onClick={deleteSelected} disabled={!selected || selected.type === 'background'}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-red-700 disabled:opacity-40"
                      style={{ background: '#FDF2F2' }}>
                      <Trash2 size={12} /> Delete
                    </button>
                    {coverSide === 'back' && (
                      <button type="button" onClick={copyFrontToBack}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                        style={{ background: ADMIN.bg, color: ADMIN.ink, border: `1px solid ${ADMIN.line}` }}>
                        Copy front → back
                      </button>
                    )}
                  </div>
                  {dirty && (
                    <p className="mt-3 text-[11px] text-amber-700 font-medium">
                      Unsaved changes{dirtyFront && dirtyBack ? ' (front & back)' : dirtyFront ? ' (front)' : ' (back)'}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm" style={{ color: ADMIN.muted }}>Select a design</p>
              )}
            </div>

            {/* Inspector */}
            <div className="rounded-2xl p-4 space-y-4 max-h-[70vh] lg:max-h-[78vh] overflow-y-auto order-3"
              style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
              <p className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: ADMIN.muted }}>
                Properties · {coverSide === 'front' ? 'Front' : 'Back'}
              </p>
              {!selected ? (
                <p className="text-sm leading-relaxed" style={{ color: ADMIN.muted }}>
                  Tap text, shapes, or landmark art on the {coverSide} cover to edit.
                </p>
              ) : selected.type === 'text' ? (
                <div className="space-y-3">
                  <label className="block text-[11px] font-medium" style={{ color: ADMIN.ink }}>Text</label>
                  <Input
                    value={selected.text || ''}
                    onChange={e => onChangeEl(selected.id, { text: e.target.value })}
                  />
                  <label className="block text-[11px] font-medium" style={{ color: ADMIN.ink }}>Font size</label>
                  <Input
                    type="number"
                    value={selected.fontSize || 20}
                    onChange={e => onChangeEl(selected.id, { fontSize: Number(e.target.value) || 20 })}
                  />
                  <label className="block text-[11px] font-medium" style={{ color: ADMIN.ink }}>Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={selected.fill || '#111111'}
                      onChange={e => onChangeEl(selected.id, { fill: e.target.value })}
                      className="h-9 w-12 rounded border cursor-pointer"
                      style={{ borderColor: ADMIN.line }}
                    />
                    <Input
                      value={selected.fill || '#111111'}
                      onChange={e => onChangeEl(selected.id, { fill: e.target.value })}
                    />
                  </div>
                  <label className="block text-[11px] font-medium" style={{ color: ADMIN.ink }}>Letter spacing</label>
                  <Input
                    type="number"
                    value={selected.letterSpacing ?? 0}
                    onChange={e => onChangeEl(selected.id, { letterSpacing: Number(e.target.value) || 0 })}
                  />
                  <label className="block text-[11px] font-medium" style={{ color: ADMIN.ink }}>Align</label>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map(a => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => onChangeEl(selected.id, { align: a })}
                        className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold capitalize"
                        style={
                          (selected.align || 'center') === a
                            ? { background: ADMIN.blush, color: '#fff' }
                            : { background: ADMIN.blushSoft, color: ADMIN.blushDeep }
                        }
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              ) : selected.type === 'image' ? (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: ADMIN.ink }}>Landmark / cover art</p>
                  {selected.src ? (
                    <img src={selected.src} alt="" className="w-full h-28 object-cover rounded-xl" style={{ border: `1px solid ${ADMIN.line}` }} />
                  ) : null}
                  <p className="text-[11px] break-all" style={{ color: ADMIN.muted }}>{selected.src || 'No image yet'}</p>
                  <Button type="button" variant="outline" className="w-full rounded-xl" disabled={uploading}
                    onClick={() => imageFileRef.current?.click()}>
                    {uploading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Upload size={14} className="mr-1.5" />}
                    {selected.src ? 'Replace image' : 'Upload image'}
                  </Button>
                  <p className="text-[11px]" style={{ color: ADMIN.muted }}>
                    Drag to reposition, use corner handles to resize. Size: {Math.round(selected.w)}×{Math.round(selected.h)}
                  </p>
                </div>
              ) : selected.type === 'shape' ? (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: ADMIN.ink }}>Shape</p>
                  <label className="block text-[11px] font-medium" style={{ color: ADMIN.ink }}>Fill</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={(selected.fill && selected.fill.startsWith('#')) ? selected.fill : '#C97B84'}
                      onChange={e => onChangeEl(selected.id, { fill: e.target.value })}
                      className="h-9 w-12 rounded border cursor-pointer"
                      style={{ borderColor: ADMIN.line }}
                    />
                    <Input
                      value={selected.fill || ''}
                      onChange={e => onChangeEl(selected.id, { fill: e.target.value })}
                    />
                  </div>
                  <label className="block text-[11px] font-medium" style={{ color: ADMIN.ink }}>Opacity</label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selected.opacity ?? 1}
                    onChange={e => onChangeEl(selected.id, { opacity: Math.min(1, Math.max(0, Number(e.target.value) || 0)) })}
                  />
                  <p className="text-[11px]" style={{ color: ADMIN.muted }}>
                    Drag / resize on canvas. Size: {Math.round(selected.w)}×{Math.round(selected.h)}
                  </p>
                </div>
              ) : selected.type === 'background' ? (
                <div className="space-y-3">
                  <label className="block text-[11px] font-medium" style={{ color: ADMIN.ink }}>Background</label>
                  <div className="flex gap-1">
                    {([
                      { id: 'color' as const, label: 'Color', icon: Droplets },
                      { id: 'gradient' as const, label: 'Gradient', icon: Palette },
                      { id: 'photo' as const, label: 'Photo', icon: ImageIcon },
                    ]).map(m => (
                      <button
                        key={m.id}
                        type="button"
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
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-semibold"
                        style={
                          bgUiMode === m.id
                            ? { background: ADMIN.blush, color: '#fff' }
                            : { background: ADMIN.blushSoft, color: ADMIN.blushDeep }
                        }
                      >
                        <m.icon size={11} /> {m.label}
                      </button>
                    ))}
                  </div>

                  {bgUiMode === 'color' && (
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selected.bgColor || '#ffffff'}
                        onChange={e => setCoverBg({ mode: 'color', bgColor: e.target.value })}
                        className="h-9 w-12 rounded border cursor-pointer"
                        style={{ borderColor: ADMIN.line }}
                      />
                      <Input
                        value={selected.bgColor || '#ffffff'}
                        onChange={e => setCoverBg({ mode: 'color', bgColor: e.target.value })}
                      />
                    </div>
                  )}

                  {bgUiMode === 'gradient' && (
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <input type="color"
                          value={selected.bgGradientFrom || selected.bgColor || '#1A1A1A'}
                          onChange={e => setCoverBg({
                            mode: 'gradient',
                            bgGradientFrom: e.target.value,
                            bgGradientTo: selected.bgGradientTo || '#666666',
                            bgGradientDir: selected.bgGradientDir || 'tb',
                          })}
                          className="h-9 w-12 rounded border cursor-pointer" style={{ borderColor: ADMIN.line }} />
                        <span className="text-[10px]" style={{ color: ADMIN.muted }}>→</span>
                        <input type="color"
                          value={selected.bgGradientTo || '#666666'}
                          onChange={e => setCoverBg({
                            mode: 'gradient',
                            bgGradientFrom: selected.bgGradientFrom || selected.bgColor || '#1A1A1A',
                            bgGradientTo: e.target.value,
                            bgGradientDir: selected.bgGradientDir || 'tb',
                          })}
                          className="h-9 w-12 rounded border cursor-pointer" style={{ borderColor: ADMIN.line }} />
                      </div>
                      <div className="flex gap-1">
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
                            className="flex-1 py-1.5 rounded-xl text-sm font-semibold"
                            style={
                              (selected.bgGradientDir || 'tb') === d.id
                                ? { background: ADMIN.ink, color: '#fff' }
                                : { background: ADMIN.bg, color: ADMIN.muted }
                            }
                          >{d.label}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {bgUiMode === 'photo' && (
                    <div className="space-y-2">
                      {selected.src ? (
                        <img src={selected.src} alt="" className="w-full h-28 object-cover rounded-xl" style={{ border: `1px solid ${ADMIN.line}` }} />
                      ) : (
                        <p className="text-[11px]" style={{ color: ADMIN.muted }}>No photo yet — upload one.</p>
                      )}
                      <Button type="button" variant="outline" className="w-full rounded-xl" disabled={uploading}
                        onClick={() => bgFileRef.current?.click()}>
                        {uploading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Upload size={14} className="mr-1.5" />}
                        {selected.src ? 'Replace photo' : 'Upload photo'}
                      </Button>
                      {selected.src && (
                        <Button type="button" variant="ghost" className="w-full rounded-xl text-red-700"
                          onClick={() => setCoverBg({ mode: 'color', bgColor: selected.bgColor || '#FFFFFF' })}>
                          Remove photo
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm" style={{ color: ADMIN.muted }}>Select text, a shape, or an image to edit.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
