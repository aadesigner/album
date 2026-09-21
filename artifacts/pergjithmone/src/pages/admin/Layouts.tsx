import React, { useMemo, useState } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import {
  useListAdminLayouts, useCreateAdminLayout, useUpdateAdminLayout, useDeleteAdminLayout,
  getListAdminLayoutsQueryKey, getListLayoutsQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Image as ImageIcon, Type } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { LAYOUTS, LAYOUT_CATEGORY_LABELS, type LayoutZone } from '@/lib/designs';

type Layout = {
  id: number; slug: string; nameAl: string; nameEn: string;
  previewIcon?: string | null; gridDefinitionJson: string; isActive: boolean;
};

type Cell = LayoutZone;

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
        w: Math.max(0.05, Number(c.w) || 0.2),
        h: Math.max(0.05, Number(c.h) || 0.2),
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
  return JSON.stringify(
    category ? { category, cells } : { cells },
    null,
    2,
  );
}

async function invalidateLayoutQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getListAdminLayoutsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListLayoutsQueryKey() }),
  ]);
}

function LayoutPreview({ cells, size = 72 }: { cells: Cell[]; size?: number }) {
  const W = size;
  const H = Math.round(size * (4 / 3));
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

function ZoneEditor({ cells, onChange }: { cells: Cell[]; onChange: (next: Cell[]) => void }) {
  const [selected, setSelected] = useState(0);
  const sel = cells[selected] || cells[0];

  const updateSel = (patch: Partial<Cell>) => {
    if (!sel) return;
    onChange(cells.map((c, i) => (i === selected ? { ...c, ...patch } : c)));
  };

  const addCell = (type: 'photo' | 'text') => {
    const next = [...cells, { x: 0.1, y: 0.1, w: 0.35, h: 0.35, type }];
    onChange(next);
    setSelected(next.length - 1);
  };

  const removeSel = () => {
    if (cells.length <= 1) return;
    const next = cells.filter((_, i) => i !== selected);
    onChange(next);
    setSelected(Math.max(0, selected - 1));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-start">
        <div className="relative shrink-0" style={{ width: 120 }}>
          <LayoutPreview cells={cells} size={120} />
          {/* clickable overlays for selection */}
          <div className="absolute inset-0" style={{ height: Math.round(120 * 4 / 3) }}>
            {cells.map((z, i) => (
              <button
                key={i}
                type="button"
                title={`${z.type} ${i + 1}`}
                onClick={() => setSelected(i)}
                className="absolute"
                style={{
                  left: `${z.x * 100}%`,
                  top: `${z.y * 100}%`,
                  width: `${z.w * 100}%`,
                  height: `${z.h * 100}%`,
                  outline: i === selected ? `2px solid ${ADMIN.blush}` : 'none',
                  outlineOffset: -1,
                  background: 'transparent',
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 text-xs"
              onClick={() => addCell('photo')}>
              <ImageIcon size={12} className="mr-1" /> Photo zone
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 text-xs"
              onClick={() => addCell('text')}>
              <Type size={12} className="mr-1" /> Text zone
            </Button>
            <Button type="button" variant="ghost" size="sm" className="rounded-xl h-8 text-xs text-red-700"
              onClick={removeSel} disabled={cells.length <= 1}>
              <Trash2 size={12} className="mr-1" /> Remove
            </Button>
          </div>
          <p className="text-[11px]" style={{ color: ADMIN.muted }}>
            {cells.length} zone{cells.length === 1 ? '' : 's'} · tap a zone on the preview to edit
          </p>
          {sel && (
            <div className="grid grid-cols-2 gap-2">
              {(['x', 'y', 'w', 'h'] as const).map(k => (
                <div key={k}>
                  <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: ADMIN.muted }}>
                    {k}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={Number(sel[k].toFixed(3))}
                    onChange={e => updateSel({ [k]: Math.min(1, Math.max(0, Number(e.target.value) || 0)) })}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: ADMIN.muted }}>
                  Type
                </label>
                <div className="flex gap-1">
                  {(['photo', 'text'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateSel({ type: t })}
                      className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold capitalize"
                      style={
                        sel.type === t
                          ? { background: ADMIN.blush, color: '#fff' }
                          : { background: ADMIN.blushSoft, color: ADMIN.blushDeep }
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <details className="text-[11px]" style={{ color: ADMIN.muted }}>
        <summary className="cursor-pointer font-medium">Advanced JSON</summary>
        <pre className="mt-2 p-2 rounded-lg overflow-auto text-[10px] font-mono"
          style={{ background: ADMIN.bg, border: `1px solid ${ADMIN.line}` }}>
          {cellsToJson(cells)}
        </pre>
      </details>
    </div>
  );
}

function LayoutFormModal({ layout, onClose }: { layout: Layout | null; onClose: () => void }) {
  const isEdit = !!layout;
  const initialCells = useMemo(
    () => (layout ? parseCells(layout.gridDefinitionJson) : [{ x: 0, y: 0, w: 1, h: 1, type: 'photo' as const }]),
    [layout],
  );
  const [form, setForm] = useState({
    slug: layout?.slug || '',
    nameAl: layout?.nameAl || '',
    nameEn: layout?.nameEn || '',
    previewIcon: layout?.previewIcon || '',
    isActive: layout?.isActive ?? true,
  });
  const [cells, setCells] = useState<Cell[]>(initialCells);
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
    if (!form.slug) setForm(f => ({ ...f, slug: p.id }));
    if (!form.nameEn) setForm(f => ({ ...f, nameEn: p.label.en, nameAl: p.label.sq }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        gridDefinitionJson: cellsToJson(cells, layout ? parseCategory(layout.gridDefinitionJson) : null),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ background: ADMIN.blushSoft }}>
            {isEdit ? <Edit2 size={16} style={{ color: ADMIN.blushDeep }} /> : <Plus size={16} style={{ color: ADMIN.blushDeep }} />}
          </div>
          <h3 className="font-serif text-lg font-semibold">{isEdit ? 'Edit Layout' : 'New Layout'}</h3>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Icon</label>
              <Input value={form.previewIcon} onChange={e => setForm(f => ({ ...f, previewIcon: e.target.value }))} placeholder="📐" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Slug *</label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="two-up-grid" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Name (Albanian) *</label>
            <Input value={form.nameAl} onChange={e => setForm(f => ({ ...f, nameAl: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Name (English) *</label>
            <Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} required />
          </div>

          {!isEdit && (
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Start from preset</label>
              <select
                className="w-full h-9 rounded-md border bg-white px-3 text-sm"
                style={{ borderColor: ADMIN.line }}
                defaultValue=""
                onChange={e => { if (e.target.value) applyPreset(e.target.value); }}
              >
                <option value="">Blank / custom…</option>
                {LAYOUTS.map(l => (
                  <option key={l.id} value={l.id}>{l.label.en} ({l.category})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-2">Zones *</label>
            <ZoneEditor cells={cells} onChange={setCells} />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
            Active (shown in editor)
          </label>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 text-white hover:opacity-90 rounded-2xl" style={{ background: ADMIN.blush }}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Layout'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ name, onConfirm, onCancel, loading }: { name: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
        <h3 className="font-serif text-lg font-semibold mb-2">Delete Layout?</h3>
        <p className="text-sm text-neutral-500 mb-5">
          This will permanently delete <strong>{name}</strong>. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
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

  const grouped = useMemo(() => {
    const list = layouts || [];
    const map = new Map<string, Layout[]>();
    for (const layout of list) {
      const cat = parseCategory(layout.gridDefinitionJson)
        || LAYOUTS.find(l => l.id === layout.slug)?.category
        || 'Custom';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(layout);
    }
    // Prefer known category order from LAYOUTS
    const order = [...new Set([
      ...LAYOUTS.map(l => l.category),
      ...map.keys(),
    ])];
    return order
      .filter(cat => map.has(cat))
      .map(cat => ({
        category: cat,
        label: LAYOUT_CATEGORY_LABELS[cat]?.en || cat,
        items: map.get(cat)!,
      }));
  }, [layouts]);

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

      <div className="p-4 sm:p-5 md:p-8 max-w-screen-xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>Catalog</p>
            <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>Layouts</h1>
            <p className="text-sm" style={{ color: ADMIN.muted }}>
              Photo grid layouts customers pick in the album editor. Click a card to edit zones.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {missingBuiltinCount > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={importing}
                className="gap-2 rounded-2xl"
                onClick={importBuiltins}
              >
                {importing ? 'Importing…' : `Import ${missingBuiltinCount} built-in`}
              </Button>
            )}
            <Button className="gap-2 rounded-2xl text-white hover:opacity-90" style={{ background: ADMIN.blush }}
              onClick={() => setFormTarget({ open: true, layout: null })}>
              <Plus size={16} /> New Layout
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm py-12 text-center" style={{ color: ADMIN.muted }}>Loading…</p>
        ) : !layouts?.length ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
            <p className="text-sm mb-2" style={{ color: ADMIN.ink }}>No layouts in the catalog yet</p>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: ADMIN.muted }}>
              Import the built-in editor grids (full bleed, 2 columns, magazine…) or create your own.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                className="rounded-2xl text-white"
                style={{ background: ADMIN.blush }}
                disabled={importing}
                onClick={importBuiltins}
              >
                {importing ? 'Importing…' : `Import ${LAYOUTS.length} built-in layouts`}
              </Button>
              <Button type="button" variant="outline" className="rounded-2xl"
                onClick={() => setFormTarget({ open: true, layout: null })}>
                <Plus size={16} className="mr-1.5" /> New Layout
              </Button>
            </div>
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
                          <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: ADMIN.muted }}>{layout.slug}</p>
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
