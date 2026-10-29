import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import { AdminModal } from '@/components/admin/AdminModal';
import {
  useListAdminLayouts, useCreateAdminLayout, useUpdateAdminLayout, useDeleteAdminLayout,
  getListAdminLayoutsQueryKey, getListLayoutsQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Edit2, Trash2, Image as ImageIcon, Type, Copy, RotateCcw,
  Search, Grid2x2, Magnet,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { LAYOUTS, LAYOUT_CATEGORY_LABELS, type LayoutZone } from '@/lib/designs';

type Layout = {
  id: number; slug: string; nameAl: string; nameEn: string;
  previewIcon?: string | null; gridDefinitionJson: string; isActive: boolean;
};

type Cell = LayoutZone;
type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type DragKind =
  | { kind: 'move'; index: number; ox: number; oy: number; orig: Cell }
  | { kind: 'resize'; index: number; handle: Handle; ox: number; oy: number; orig: Cell }
  | { kind: 'rotate'; index: number; cx: number; cy: number; startAngle: number; origRot: number };

const CUSTOMER_CATEGORIES = Object.keys(LAYOUT_CATEGORY_LABELS);
const SNAP = 0.018;
const MIN_ZONE = 0.06;
const PAGE_ASPECT = 4 / 3;

function parseCells(json: string): Cell[] {
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
        w: Math.max(MIN_ZONE, Number(c.w) || 0.2),
        h: Math.max(MIN_ZONE, Number(c.h) || 0.2),
        type: c.type === 'text' ? 'text' : 'photo',
        ...(typeof c.rotation === 'number' ? { rotation: c.rotation } : {}),
      }))
      .filter((c: Cell) => c.w > 0 && c.h > 0);
  } catch {
    return [];
  }
}

function parseCategory(json: string): string | null {
  try {
    const parsed = JSON.parse(json);
    return typeof parsed?.category === 'string' ? parsed.category : null;
  } catch {
    return null;
  }
}

function cellsToJson(cells: Cell[], category?: string | null): string {
  return JSON.stringify(category ? { category, cells } : { cells }, null, 2);
}

function inferCategory(cells: Cell[]): string {
  const photos = cells.filter(c => c.type === 'photo').length;
  if (photos <= 1) return '1 Photo';
  if (photos === 2) return '2 Photos';
  if (photos === 3) return '3 Photos';
  return '4 Photos';
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function snapValue(v: number, targets: number[]) {
  let best = v;
  let dist = SNAP;
  for (const t of targets) {
    const d = Math.abs(v - t);
    if (d < dist) { dist = d; best = t; }
  }
  return best;
}

function normalizeCell(c: Cell): Cell {
  const w = clamp(c.w, MIN_ZONE, 1.2);
  const h = clamp(c.h, MIN_ZONE, 1.2);
  return {
    ...c,
    x: clamp(c.x, -0.15, 1.05),
    y: clamp(c.y, -0.15, 1.05),
    w,
    h,
    type: c.type === 'text' ? 'text' : 'photo',
    ...(typeof c.rotation === 'number' && Math.abs(c.rotation) > 0.2
      ? { rotation: Math.round(c.rotation) }
      : { rotation: undefined }),
  };
}

async function invalidateLayoutQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getListAdminLayoutsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListLayoutsQueryKey() }),
  ]);
}

function LayoutPreview({ cells, size = 72 }: { cells: Cell[]; size?: number }) {
  const W = size;
  const H = Math.round(size * PAGE_ASPECT);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block rounded-md overflow-hidden"
      style={{ background: '#F2EFE9', border: `1px solid ${ADMIN.line}` }}>
      {cells.length === 0 ? (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={9} fill="#999">empty</text>
      ) : cells.map((z, i) => {
        const rx = z.x * W + 1.5, ry = z.y * H + 1.5;
        const rw = Math.max(1, z.w * W - 3), rh = Math.max(1, z.h * H - 3);
        const cx = rx + rw / 2, cy = ry + rh / 2;
        return (
          <rect key={i}
            x={rx} y={ry} width={rw} height={rh}
            fill={z.type === 'photo' ? '#C8C0B8' : '#E2DDD6'}
            rx={1.5}
            transform={z.rotation ? `rotate(${z.rotation} ${cx} ${cy})` : undefined}
          />
        );
      })}
    </svg>
  );
}

const HANDLES: { id: Handle; cursor: string; left: string; top: string }[] = [
  { id: 'nw', cursor: 'nwse-resize', left: '0%', top: '0%' },
  { id: 'n', cursor: 'ns-resize', left: '50%', top: '0%' },
  { id: 'ne', cursor: 'nesw-resize', left: '100%', top: '0%' },
  { id: 'e', cursor: 'ew-resize', left: '100%', top: '50%' },
  { id: 'se', cursor: 'nwse-resize', left: '100%', top: '100%' },
  { id: 's', cursor: 'ns-resize', left: '50%', top: '100%' },
  { id: 'sw', cursor: 'nesw-resize', left: '0%', top: '100%' },
  { id: 'w', cursor: 'ew-resize', left: '0%', top: '50%' },
];

function ZoneCanvas({
  cells, selected, onSelect, onChange, showGrid, snap,
}: {
  cells: Cell[];
  selected: number;
  onSelect: (i: number) => void;
  onChange: (next: Cell[]) => void;
  showGrid: boolean;
  snap: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragKind | null>(null);
  const [pageBox, setPageBox] = useState({ w: 240, h: 320 });
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const availW = el.clientWidth;
      const availH = el.clientHeight;
      if (availW < 40 || availH < 40) return;
      let w = availW;
      let h = w * PAGE_ASPECT;
      if (h > availH) {
        h = availH;
        w = h / PAGE_ASPECT;
      }
      setPageBox({ w: Math.max(120, Math.floor(w)), h: Math.max(160, Math.floor(h)) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toNorm = useCallback((clientX: number, clientY: number) => {
    const page = pageRef.current;
    if (!page) return { x: 0, y: 0 };
    const r = page.getBoundingClientRect();
    return {
      x: (clientX - r.left) / Math.max(1, r.width),
      y: (clientY - r.top) / Math.max(1, r.height),
    };
  }, []);

  const applySnap = useCallback((cell: Cell, others: Cell[]) => {
    if (!snap) return { cell, v: [] as number[], h: [] as number[] };
    const targetsX = [0, 0.5, 1, ...others.flatMap(o => [o.x, o.x + o.w, o.x + o.w / 2])];
    const targetsY = [0, 0.5, 1, ...others.flatMap(o => [o.y, o.y + o.h, o.y + o.h / 2])];
    const x = snapValue(cell.x, targetsX);
    const y = snapValue(cell.y, targetsY);
    const r = snapValue(cell.x + cell.w, targetsX);
    const b = snapValue(cell.y + cell.h, targetsY);
    const next = { ...cell, x, y, w: Math.max(MIN_ZONE, r - x), h: Math.max(MIN_ZONE, b - y) };
    const v: number[] = [];
    const h: number[] = [];
    for (const t of [0, 0.5, 1]) {
      if (Math.abs(next.x - t) < 0.001 || Math.abs(next.x + next.w - t) < 0.001 || Math.abs(next.x + next.w / 2 - t) < 0.001) v.push(t);
      if (Math.abs(next.y - t) < 0.001 || Math.abs(next.y + next.h - t) < 0.001 || Math.abs(next.y + next.h / 2 - t) < 0.001) h.push(t);
    }
    return { cell: next, v, h };
  }, [snap]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const p = toNorm(e.clientX, e.clientY);
      const others = cells.filter((_, i) => i !== drag.index);
      let next = cells[drag.index];
      if (!next) return;

      if (drag.kind === 'move') {
        next = {
          ...drag.orig,
          x: drag.orig.x + (p.x - drag.ox),
          y: drag.orig.y + (p.y - drag.oy),
        };
      } else if (drag.kind === 'resize') {
        const o = drag.orig;
        let x = o.x, y = o.y, w = o.w, h = o.h;
        const dx = p.x - drag.ox;
        const dy = p.y - drag.oy;
        if (drag.handle.includes('w')) { x = o.x + dx; w = o.w - dx; }
        if (drag.handle.includes('e')) { w = o.w + dx; }
        if (drag.handle.includes('n')) { y = o.y + dy; h = o.h - dy; }
        if (drag.handle.includes('s')) { h = o.h + dy; }
        if (w < MIN_ZONE) { if (drag.handle.includes('w')) x = o.x + o.w - MIN_ZONE; w = MIN_ZONE; }
        if (h < MIN_ZONE) { if (drag.handle.includes('n')) y = o.y + o.h - MIN_ZONE; h = MIN_ZONE; }
        next = { ...o, x, y, w, h };
      } else {
        const ang = Math.atan2(p.y - drag.cy, p.x - drag.cx) * (180 / Math.PI);
        let rot = drag.origRot + (ang - drag.startAngle);
        rot = ((rot + 180) % 360 + 360) % 360 - 180;
        if (snap) {
          const snaps = [-180, -135, -90, -45, 0, 45, 90, 135, 180];
          let best = rot;
          let dist = 6;
          for (const s of snaps) {
            const d = Math.abs(rot - s);
            if (d < dist) { dist = d; best = s; }
          }
          rot = best;
        }
        next = { ...cells[drag.index], rotation: Math.round(rot) };
      }

      if (drag.kind !== 'rotate') {
        const snapped = applySnap(next, others);
        next = snapped.cell;
        setGuides({ v: snapped.v, h: snapped.h });
      }
      onChange(cells.map((c, i) => (i === drag.index ? normalizeCell(next) : c)));
    };
    const onUp = () => {
      dragRef.current = null;
      setGuides({ v: [], h: [] });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [cells, onChange, toNorm, applySnap, snap]);

  const startMove = (i: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(i);
    const p = toNorm(e.clientX, e.clientY);
    dragRef.current = { kind: 'move', index: i, ox: p.x, oy: p.y, orig: { ...cells[i] } };
  };
  const startResize = (i: number, handle: Handle, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(i);
    const p = toNorm(e.clientX, e.clientY);
    dragRef.current = { kind: 'resize', index: i, handle, ox: p.x, oy: p.y, orig: { ...cells[i] } };
  };
  const startRotate = (i: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(i);
    const z = cells[i];
    const cx = z.x + z.w / 2;
    const cy = z.y + z.h / 2;
    const p = toNorm(e.clientX, e.clientY);
    const startAngle = Math.atan2(p.y - cy, p.x - cx) * (180 / Math.PI);
    dragRef.current = { kind: 'rotate', index: i, cx, cy, startAngle, origRot: z.rotation || 0 };
  };

  return (
    <div
      ref={wrapRef}
      className="w-full h-full min-h-[220px] flex items-center justify-center"
      style={{ background: ADMIN.bg }}
      onPointerDown={() => onSelect(-1)}
    >
      <div
        ref={pageRef}
        className="relative shadow-lg overflow-visible select-none"
        style={{
          width: pageBox.w,
          height: pageBox.h,
          background: '#F7F4EF',
          border: `1px solid ${ADMIN.line}`,
          touchAction: 'none',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {showGrid && (
          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`v${i}`} x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%"
                stroke={ADMIN.line} strokeWidth="1" />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={`${(i + 1) * 10}%`} x2="100%" y2={`${(i + 1) * 10}%`}
                stroke={ADMIN.line} strokeWidth="1" />
            ))}
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke={ADMIN.blush} strokeOpacity="0.28" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke={ADMIN.blush} strokeOpacity="0.28" />
          </svg>
        )}
        {guides.v.map(v => (
          <div key={`gv${v}`} className="absolute top-0 bottom-0 w-px pointer-events-none z-20"
            style={{ left: `${v * 100}%`, background: '#0D9488' }} />
        ))}
        {guides.h.map(h => (
          <div key={`gh${h}`} className="absolute left-0 right-0 h-px pointer-events-none z-20"
            style={{ top: `${h * 100}%`, background: '#0D9488' }} />
        ))}

        {cells.map((z, i) => {
          const active = i === selected;
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${z.x * 100}%`,
                top: `${z.y * 100}%`,
                width: `${z.w * 100}%`,
                height: `${z.h * 100}%`,
                transform: z.rotation ? `rotate(${z.rotation}deg)` : undefined,
                transformOrigin: 'center center',
                zIndex: active ? 10 : 1,
              }}
              onPointerDown={e => startMove(i, e)}
            >
              <div
                className="absolute inset-0 rounded-[3px] flex items-center justify-center"
                style={{
                  background: z.type === 'photo' ? 'rgba(200,192,184,0.92)' : 'rgba(226,221,214,0.95)',
                  outline: active ? `2px solid ${ADMIN.blush}` : `1px solid rgba(40,20,30,0.12)`,
                  outlineOffset: -1,
                  cursor: 'move',
                }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide pointer-events-none"
                  style={{ color: active ? ADMIN.blushDeep : '#6b635c' }}>
                  {z.type === 'photo' ? `Photo ${i + 1}` : `Text ${i + 1}`}
                </span>
              </div>
              {active && (
                <>
                  {HANDLES.map(h => (
                    <button
                      key={h.id}
                      type="button"
                      aria-label={`Resize ${h.id}`}
                      className="absolute w-3 h-3 rounded-full bg-white shadow"
                      style={{
                        left: h.left,
                        top: h.top,
                        transform: 'translate(-50%, -50%)',
                        border: `1.5px solid ${ADMIN.blush}`,
                        cursor: h.cursor,
                        zIndex: 3,
                      }}
                      onPointerDown={e => startResize(i, h.id, e)}
                    />
                  ))}
                  <button
                    type="button"
                    aria-label="Rotate"
                    className="absolute left-1/2 w-3 h-3 rounded-full"
                    style={{
                      top: -22,
                      transform: 'translateX(-50%)',
                      background: ADMIN.blush,
                      border: '1.5px solid #fff',
                      cursor: 'grab',
                      zIndex: 3,
                    }}
                    onPointerDown={e => startRotate(i, e)}
                  />
                  <div
                    className="absolute left-1/2 w-px pointer-events-none"
                    style={{ top: -22, height: 22, transform: 'translateX(-50%)', background: ADMIN.blush }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ZoneEditor({
  cells, onChange, selected, setSelected,
}: {
  cells: Cell[];
  onChange: (next: Cell[]) => void;
  selected: number;
  setSelected: (i: number) => void;
}) {
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const sel = selected >= 0 ? cells[selected] : undefined;

  const updateSel = (patch: Partial<Cell>) => {
    if (!sel || selected < 0) return;
    onChange(cells.map((c, i) => (i === selected ? normalizeCell({ ...c, ...patch }) : c)));
  };

  const addCell = (type: 'photo' | 'text') => {
    const next = [...cells, { x: 0.12, y: 0.12, w: 0.36, h: 0.32, type }];
    onChange(next);
    setSelected(next.length - 1);
  };

  const duplicateSel = () => {
    if (!sel) return;
    const copy = normalizeCell({
      ...sel,
      x: clamp(sel.x + 0.04, -0.15, 1.05),
      y: clamp(sel.y + 0.04, -0.15, 1.05),
    });
    const next = [...cells, copy];
    onChange(next);
    setSelected(next.length - 1);
  };

  const removeSel = () => {
    if (cells.length <= 1 || selected < 0) return;
    const next = cells.filter((_, i) => i !== selected);
    onChange(next);
    setSelected(Math.max(0, selected - 1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (selected < 0 || !cells[selected]) return;
      const step = e.shiftKey ? 0.04 : 0.01;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSel();
        return;
      }
      if (e.key === 'Escape') {
        if (selected >= 0) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setSelected(-1);
        }
        return;
      }
      if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        duplicateSel();
        return;
      }
      const z = cells[selected];
      if (e.key === 'ArrowLeft') { e.preventDefault(); updateSel({ x: z.x - step }); }
      if (e.key === 'ArrowRight') { e.preventDefault(); updateSel({ x: z.x + step }); }
      if (e.key === 'ArrowUp') { e.preventDefault(); updateSel({ y: z.y - step }); }
      if (e.key === 'ArrowDown') { e.preventDefault(); updateSel({ y: z.y + step }); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, cells]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-0 h-full min-h-0">
      <div className="min-h-0 flex flex-col overflow-hidden" style={{ borderRight: `1px solid ${ADMIN.line}` }}>
        <div className="shrink-0 flex flex-wrap items-center gap-1.5 px-3 py-2"
          style={{ borderBottom: `1px solid ${ADMIN.line}`, background: ADMIN.card }}>
          <button type="button" onClick={() => addCell('photo')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
            style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
            <ImageIcon size={12} /> Photo
          </button>
          <button type="button" onClick={() => addCell('text')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
            style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
            <Type size={12} /> Text
          </button>
          <button type="button" onClick={duplicateSel} disabled={!sel}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40"
            style={{ background: ADMIN.bg, color: ADMIN.ink }}>
            <Copy size={12} /> Duplicate
          </button>
          <button type="button" onClick={removeSel} disabled={!sel || cells.length <= 1}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-red-700 disabled:opacity-40"
            style={{ background: '#FDF2F2' }}>
            <Trash2 size={12} /> Remove
          </button>
          <span className="flex-1" />
          <button type="button" onClick={() => setShowGrid(g => !g)} title="Grid"
            className="p-1.5 rounded-lg"
            style={{ background: showGrid ? ADMIN.blushSoft : 'transparent', color: ADMIN.ink }}>
            <Grid2x2 size={14} />
          </button>
          <button type="button" onClick={() => setSnap(s => !s)} title="Snap"
            className="p-1.5 rounded-lg"
            style={{ background: snap ? ADMIN.blushSoft : 'transparent', color: ADMIN.ink }}>
            <Magnet size={14} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden p-3">
          <ZoneCanvas
            cells={cells}
            selected={selected}
            onSelect={setSelected}
            onChange={onChange}
            showGrid={showGrid}
            snap={snap}
          />
        </div>
        <p className="shrink-0 px-3 pb-2 text-[10px]" style={{ color: ADMIN.muted }}>
          Drag to move · handles to resize · pink knob to rotate · arrows to nudge. Zones stay on the page — they never cover Save / Cancel.
        </p>
      </div>

      <div className="min-h-0 overflow-y-auto p-3 space-y-3" style={{ background: ADMIN.card }}>
        <p className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: ADMIN.muted }}>
          Zone {sel ? `${selected + 1} of ${cells.length}` : '—'}
        </p>
        {!sel ? (
          <p className="text-[12px] leading-relaxed" style={{ color: ADMIN.muted }}>
            Tap a zone on the page to edit it, or add a photo / text slot.
          </p>
        ) : (
          <>
            <div className="flex gap-1">
              {(['photo', 'text'] as const).map(t => (
                <button key={t} type="button" onClick={() => updateSel({ type: t })}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold capitalize"
                  style={sel.type === t
                    ? { background: ADMIN.blush, color: '#fff' }
                    : { background: ADMIN.blushSoft, color: ADMIN.blushDeep }}>
                  {t}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['x', 'y', 'w', 'h'] as const).map(k => (
                <div key={k}>
                  <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: ADMIN.muted }}>
                    {k}
                  </label>
                  <Input
                    type="number" min={-0.15} max={1.2} step={0.01}
                    value={Number(sel[k].toFixed(3))}
                    onChange={e => updateSel({ [k]: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: ADMIN.muted }}>
                  Rotation {Math.round(sel.rotation || 0)}°
                </label>
                <input
                  type="range" min={-180} max={180} step={1}
                  value={sel.rotation || 0}
                  onChange={e => updateSel({ rotation: Number(e.target.value) })}
                  className="w-full" style={{ accentColor: ADMIN.blush }}
                />
                <button type="button" onClick={() => updateSel({ rotation: 0 })}
                  className="mt-1 text-[10px] font-semibold inline-flex items-center gap-1" style={{ color: ADMIN.muted }}>
                  <RotateCcw size={10} /> Reset
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LayoutFormModal({ layout, onClose }: { layout: Layout | null; onClose: () => void }) {
  const isEdit = !!layout;
  const initialCells = useMemo(
    () => (layout ? parseCells(layout.gridDefinitionJson) : [{ x: 0, y: 0, w: 1, h: 1, type: 'photo' as const }]),
    [layout],
  );
  const initialCategory = layout
    ? (parseCategory(layout.gridDefinitionJson)
      || LAYOUTS.find(l => l.id === layout.slug)?.category
      || inferCategory(initialCells))
    : '1 Photo';
  const [form, setForm] = useState({
    slug: layout?.slug || '',
    nameAl: layout?.nameAl || '',
    nameEn: layout?.nameEn || '',
    previewIcon: layout?.previewIcon || '',
    isActive: layout?.isActive ?? true,
    category: CUSTOMER_CATEGORIES.includes(initialCategory) ? initialCategory : inferCategory(initialCells),
  });
  const [cells, setCells] = useState<Cell[]>(initialCells);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState('');
  const createLayout = useCreateAdminLayout();
  const updateLayout = useUpdateAdminLayout();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const loading = createLayout.isPending || updateLayout.isPending;

  const applyPreset = (presetId: string) => {
    const p = LAYOUTS.find(l => l.id === presetId);
    if (!p) return;
    setCells(p.zones.map(z => ({ ...z })));
    setSelected(0);
    setForm(f => ({
      ...f,
      slug: f.slug || p.id,
      nameEn: f.nameEn || p.label.en,
      nameAl: f.nameAl || p.label.sq,
      category: p.category,
    }));
  };

  const submit = async () => {
    setError('');
    if (!form.slug.trim() || !form.nameAl.trim() || !form.nameEn.trim()) {
      setError('Slug and both names are required.');
      return;
    }
    if (cells.length === 0) {
      setError('Add at least one photo or text zone.');
      return;
    }
    try {
      const data = {
        slug: form.slug.trim(),
        nameAl: form.nameAl.trim(),
        nameEn: form.nameEn.trim(),
        previewIcon: form.previewIcon || undefined,
        gridDefinitionJson: cellsToJson(cells, form.category),
        isActive: form.isActive,
      };
      if (isEdit) {
        await updateLayout.mutateAsync({ layoutId: layout!.id, data });
      } else {
        await createLayout.mutateAsync({ data });
      }
      await invalidateLayoutQueries(queryClient);
      toast({ title: isEdit ? 'Layout updated' : 'Layout created' });
      onClose();
    } catch (err: any) {
      setError(err?.data?.error || err?.message || `Failed to ${isEdit ? 'update' : 'create'} layout`);
    }
  };

  return (
    <AdminModal
      size="full"
      tall
      title={isEdit ? 'Edit layout' : 'New layout'}
      subtitle="Drag zones like the album editor. Customers only see 1–4 photo layouts that are Active."
      icon={isEdit ? <Edit2 size={16} style={{ color: ADMIN.blushDeep }} /> : <Plus size={16} style={{ color: ADMIN.blushDeep }} />}
      onClose={onClose}
      footer={
        <>
          {error && <p className="text-sm text-red-600 flex-1 min-w-0">{error}</p>}
          <span className="flex-1" />
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl min-w-[6.5rem]">Cancel</Button>
          <Button type="button" disabled={loading} onClick={submit}
            className="rounded-xl text-white min-w-[8rem] hover:opacity-90" style={{ background: ADMIN.blush }}>
            {loading ? 'Saving…' : isEdit ? 'Save layout' : 'Create layout'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 h-full">
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 px-4 py-3"
          style={{ borderBottom: `1px solid ${ADMIN.line}`, background: ADMIN.card }}>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: ADMIN.muted }}>Icon</label>
            <Input value={form.previewIcon} onChange={e => setForm(f => ({ ...f, previewIcon: e.target.value }))} placeholder="▦" className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: ADMIN.muted }}>Slug *</label>
            <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="two-up-grid" className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: ADMIN.muted }}>Name AL *</label>
            <Input value={form.nameAl} onChange={e => setForm(f => ({ ...f, nameAl: e.target.value }))} className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: ADMIN.muted }}>Name EN *</label>
            <Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: ADMIN.muted }}>Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full h-8 rounded-md border bg-white px-2 text-xs"
              style={{ borderColor: ADMIN.line }}
            >
              {CUSTOMER_CATEGORIES.map(c => (
                <option key={c} value={c}>{LAYOUT_CATEGORY_LABELS[c]?.en || c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: ADMIN.muted }}>Start from</label>
            <select
              className="w-full h-8 rounded-md border bg-white px-2 text-xs"
              style={{ borderColor: ADMIN.line }}
              defaultValue=""
              onChange={e => { if (e.target.value) applyPreset(e.target.value); e.target.value = ''; }}
            >
              <option value="">Preset…</option>
              {LAYOUTS.map(l => (
                <option key={l.id} value={l.id}>{l.label.en}</option>
              ))}
            </select>
          </div>
          <label className="col-span-2 sm:col-span-3 lg:col-span-6 flex items-center gap-2 text-[12px] font-medium cursor-pointer" style={{ color: ADMIN.ink }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
            Active — shown in the customer editor
          </label>
        </div>
        <div className="flex-1 min-h-0">
          <ZoneEditor cells={cells} onChange={setCells} selected={selected} setSelected={setSelected} />
        </div>
      </div>
    </AdminModal>
  );
}

function DeleteConfirm({ name, onConfirm, onCancel, loading }: { name: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <AdminModal
      size="sm"
      title="Delete layout?"
      subtitle={`Permanently delete ${name}. This cannot be undone.`}
      onClose={onCancel}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl">Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white">
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </>
      }
    >
      <div className="px-5 py-4 text-sm" style={{ color: ADMIN.muted }}>
        Customers will no longer see this grid in the album editor.
      </div>
    </AdminModal>
  );
}

export default function AdminLayouts() {
  const { data: layouts, isLoading } = useListAdminLayouts();
  const createLayout = useCreateAdminLayout();
  const deleteLayout = useDeleteAdminLayout();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formTarget, setFormTarget] = useState<{ open: boolean; layout: Layout | null }>({ open: false, layout: null });
  const [deleteTarget, setDeleteTarget] = useState<Layout | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [visFilter, setVisFilter] = useState<'all' | 'active' | 'hidden'>('all');

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLayout.mutateAsync({ layoutId: deleteTarget.id });
      await invalidateLayoutQueries(queryClient);
      toast({ title: 'Layout deleted' });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: 'Failed to delete layout', description: e?.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const importBuiltins = async () => {
    setImporting(true);
    try {
      const have = new Set((layouts || []).map(l => l.slug));
      const missing = LAYOUTS.filter(l => !have.has(l.id));
      if (missing.length === 0) {
        toast({ title: 'All built-in layouts already imported' });
        return;
      }
      let ok = 0;
      for (const l of missing) {
        try {
          await createLayout.mutateAsync({
            data: {
              slug: l.id,
              nameAl: l.label.sq,
              nameEn: l.label.en,
              previewIcon: '▦',
              gridDefinitionJson: JSON.stringify({ category: l.category, cells: l.zones }),
              isActive: true,
            },
          });
          ok += 1;
        } catch {
          // skip slug conflicts
        }
      }
      await invalidateLayoutQueries(queryClient);
      toast({ title: `Imported ${ok} layout${ok === 1 ? '' : 's'}` });
    } catch (e: any) {
      toast({ title: 'Import failed', description: e?.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const categoryOf = (layout: Layout) =>
    parseCategory(layout.gridDefinitionJson)
    || LAYOUTS.find(l => l.id === layout.slug)?.category
    || inferCategory(parseCells(layout.gridDefinitionJson));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (layouts || []).filter(layout => {
      if (visFilter === 'active' && !layout.isActive) return false;
      if (visFilter === 'hidden' && layout.isActive) return false;
      const cat = categoryOf(layout);
      if (catFilter !== 'all' && cat !== catFilter) return false;
      if (!q) return true;
      return [layout.nameEn, layout.nameAl, layout.slug, cat].some(s => s.toLowerCase().includes(q));
    });
  }, [layouts, query, catFilter, visFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Layout[]>();
    for (const layout of filtered) {
      const cat = categoryOf(layout);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(layout);
    }
    const order = [...new Set([...CUSTOMER_CATEGORIES, ...map.keys()])];
    return order
      .filter(cat => map.has(cat))
      .map(cat => ({
        category: cat,
        label: LAYOUT_CATEGORY_LABELS[cat]?.en || cat,
        items: map.get(cat)!,
      }));
  }, [filtered]);

  const missingBuiltinCount = useMemo(() => {
    const have = new Set((layouts || []).map(l => l.slug));
    return LAYOUTS.filter(l => !have.has(l.id)).length;
  }, [layouts]);

  return (
    <AdminLayout>
      {formTarget.open && (
        <LayoutFormModal layout={formTarget.layout} onClose={() => setFormTarget({ open: false, layout: null })} />
      )}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.nameEn}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      <div className="p-3 sm:p-4 md:p-5 max-w-screen-xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>Catalog</p>
            <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>Layouts</h1>
            <p className="text-sm max-w-xl" style={{ color: ADMIN.muted }}>
              Photo grids customers pick inside a page. Open a card to drag, resize, and rotate zones.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {missingBuiltinCount > 0 && (
              <Button type="button" variant="outline" disabled={importing} className="gap-2 rounded-2xl" onClick={importBuiltins}>
                {importing ? 'Importing…' : `Import ${missingBuiltinCount} built-in`}
              </Button>
            )}
            <Button className="gap-2 rounded-2xl text-white hover:opacity-90" style={{ background: ADMIN.blush }}
              onClick={() => setFormTarget({ open: true, layout: null })}>
              <Plus size={16} /> New Layout
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-col lg:flex-row gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: ADMIN.muted }} />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search layouts…" className="pl-8 h-10 rounded-xl" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setCatFilter('all')}
              className="px-3 h-10 rounded-xl text-[11px] font-semibold"
              style={catFilter === 'all' ? { background: ADMIN.ink, color: '#fff' } : { background: ADMIN.card, color: ADMIN.ink, border: `1px solid ${ADMIN.line}` }}>
              All
            </button>
            {CUSTOMER_CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setCatFilter(c)}
                className="px-3 h-10 rounded-xl text-[11px] font-semibold"
                style={catFilter === c ? { background: ADMIN.ink, color: '#fff' } : { background: ADMIN.card, color: ADMIN.ink, border: `1px solid ${ADMIN.line}` }}>
                {LAYOUT_CATEGORY_LABELS[c]?.en || c}
              </button>
            ))}
            {(['all', 'active', 'hidden'] as const).map(v => (
              <button key={v} type="button" onClick={() => setVisFilter(v)}
                className="px-3 h-10 rounded-xl text-[11px] font-semibold capitalize"
                style={visFilter === v ? { background: ADMIN.blushSoft, color: ADMIN.blushDeep } : { color: ADMIN.muted }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm py-12 text-center" style={{ color: ADMIN.muted }}>Loading…</p>
        ) : !layouts?.length ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
            <p className="text-sm mb-2" style={{ color: ADMIN.ink }}>No layouts in the catalog yet</p>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: ADMIN.muted }}>
              Import the built-in editor grids or create your own on a visual page.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" className="rounded-2xl text-white" style={{ background: ADMIN.blush }}
                disabled={importing} onClick={importBuiltins}>
                {importing ? 'Importing…' : `Import ${LAYOUTS.length} built-in layouts`}
              </Button>
              <Button type="button" variant="outline" className="rounded-2xl"
                onClick={() => setFormTarget({ open: true, layout: null })}>
                <Plus size={16} className="mr-1.5" /> New Layout
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
            <p className="text-sm" style={{ color: ADMIN.muted }}>No layouts match this filter.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(group => (
              <section key={group.category}>
                <div className="flex items-end justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-lg font-serif font-semibold" style={{ color: ADMIN.ink }}>{group.label}</h2>
                    <p className="text-[11px]" style={{ color: ADMIN.muted }}>{group.items.length} layout{group.items.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {group.items.map(layout => {
                    const cells = parseCells(layout.gridDefinitionJson);
                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => setFormTarget({ open: true, layout })}
                        className="rounded-2xl p-3 flex flex-col gap-2 text-left transition-shadow hover:shadow-md"
                        style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}`, opacity: layout.isActive ? 1 : 0.55 }}
                      >
                        <LayoutPreview cells={cells} size={96} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: ADMIN.ink }}>{layout.nameEn}</p>
                          <p className="text-[11px] truncate" style={{ color: ADMIN.muted }}>{layout.nameAl}</p>
                          <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: ADMIN.muted }}>
                            {layout.slug} · {cells.length} zone{cells.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-auto" onClick={e => e.stopPropagation()}>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                            layout.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                          }`}>
                            {layout.isActive ? 'Active' : 'Hidden'}
                          </span>
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8" style={{ color: ADMIN.muted }}
                              onClick={() => setFormTarget({ open: true, layout })}>
                              <Edit2 size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(layout)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
