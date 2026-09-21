import React, { useState } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import {
  useListAdminBookSizes, useCreateAdminBookSize, useUpdateAdminBookSize, useDeleteAdminBookSize,
  getListAdminBookSizesQueryKey, getListBookSizesQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, SquareSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type BookSize = {
  id: number;
  widthCm: number;
  heightCm: number;
  label: string;
  priceBase: number;
  pricePerExtraSpread: number;
  minPages: number;
  isActive: boolean;
};

async function invalidateBookSizeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getListAdminBookSizesQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListBookSizesQueryKey() }),
  ]);
}

// ── Create / Edit book size modal ───────────────────────────────────────────
function BookSizeFormModal({ size, onClose }: { size: BookSize | null; onClose: () => void }) {
  const isEdit = !!size;
  const [form, setForm] = useState({
    label: size?.label ?? '',
    widthCm: String(size?.widthCm ?? ''),
    heightCm: String(size?.heightCm ?? ''),
    priceBase: String(size?.priceBase ?? ''),
    pricePerExtraSpread: String(size?.pricePerExtraSpread ?? 200),
    minPages: String(size?.minPages ?? 30),
    isActive: size?.isActive ?? true,
  });
  const [error, setError] = useState('');
  const createSize = useCreateAdminBookSize();
  const updateSize = useUpdateAdminBookSize();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const loading = createSize.isPending || updateSize.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const widthCm = Number(form.widthCm);
    const heightCm = Number(form.heightCm);
    const priceBase = Number(form.priceBase);
    const pricePerExtraSpread = Number(form.pricePerExtraSpread);
    const minPages = Number(form.minPages);

    if (!form.label.trim() || !widthCm || !heightCm || !priceBase) {
      setError('Label, width, height, and base price are required.');
      return;
    }
    if (widthCm <= 0 || heightCm <= 0) {
      setError('Width and height must be positive numbers.');
      return;
    }
    if (minPages <= 0) {
      setError('Minimum pages must be a positive number.');
      return;
    }

    try {
      const data = {
        label: form.label.trim(),
        widthCm,
        heightCm,
        priceBase,
        pricePerExtraSpread,
        minPages,
        isActive: form.isActive,
      };
      if (isEdit) {
        await updateSize.mutateAsync({ sizeId: size!.id, data });
      } else {
        await createSize.mutateAsync({ data });
      }
      await invalidateBookSizeQueries(queryClient);
      toast({ title: isEdit ? 'Book size updated' : 'Book size created' });
      onClose();
    } catch (err: any) {
      setError(err?.data?.error || err?.message || `Failed to ${isEdit ? 'update' : 'create'} book size`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ background: ADMIN.blushSoft }}>
            {isEdit ? <Edit2 size={16} style={{ color: ADMIN.blushDeep }} /> : <Plus size={16} style={{ color: ADMIN.blushDeep }} />}
          </div>
          <h3 className="font-serif text-lg font-semibold">{isEdit ? 'Edit Book Size' : 'New Book Size'}</h3>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Label *</label>
            <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Square 20x20" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Width (cm) *</label>
              <Input type="number" step="0.1" min="0" value={form.widthCm} onChange={e => setForm(f => ({ ...f, widthCm: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Height (cm) *</label>
              <Input type="number" step="0.1" min="0" value={form.heightCm} onChange={e => setForm(f => ({ ...f, heightCm: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Base Price (LEK) *</label>
              <Input type="number" min="0" value={form.priceBase} onChange={e => setForm(f => ({ ...f, priceBase: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Extra Spread Price (LEK)</label>
              <Input type="number" min="0" value={form.pricePerExtraSpread} onChange={e => setForm(f => ({ ...f, pricePerExtraSpread: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Minimum Pages</label>
            <Input type="number" min="1" value={form.minPages} onChange={e => setForm(f => ({ ...f, minPages: e.target.value }))} />
            <p className="text-[11px] text-neutral-400 mt-1">Base page count included in the price before extra spreads are added.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
            Active (visible to customers in the wizard)
          </label>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 text-white hover:opacity-90 rounded-2xl" style={{ background: ADMIN.blush }}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Size'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm ──────────────────────────────────────────────────────────
function DeleteConfirm({ name, onConfirm, onCancel, loading }: { name: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="font-serif text-lg font-semibold mb-2">Delete Book Size?</h3>
        <p className="text-sm text-neutral-500 mb-5">
          This will permanently delete <strong>{name}</strong>. Existing orders keep their recorded price, but customers won't be able to pick this size anymore.
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

export default function AdminBookSizes() {
  const { data: sizes, isLoading } = useListAdminBookSizes();
  const deleteSize = useDeleteAdminBookSize();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formTarget, setFormTarget] = useState<{ open: boolean; size: BookSize | null }>({ open: false, size: null });
  const [deleteTarget, setDeleteTarget] = useState<BookSize | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSize.mutateAsync({ sizeId: deleteTarget.id });
      await invalidateBookSizeQueries(queryClient);
      toast({ title: 'Book size deleted' });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: 'Failed to delete book size', description: e?.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      {formTarget.open && (
        <BookSizeFormModal size={formTarget.size} onClose={() => setFormTarget({ open: false, size: null })} />
      )}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.label}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      <div className="p-4 sm:p-5 md:p-8 max-w-screen-xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>Pricing</p>
            <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>Book sizes</h1>
            <p className="text-sm" style={{ color: ADMIN.muted }}>Dimensions and pricing customers pick in the wizard.</p>
          </div>
          <Button className="gap-2 rounded-2xl text-white hover:opacity-90 shrink-0" style={{ background: ADMIN.blush }}
            onClick={() => setFormTarget({ open: true, size: null })}>
            <Plus size={16} /> New Size
          </Button>
        </div>

        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead style={{ background: ADMIN.bg }}>
                <tr style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
                  {['Label', 'Dimensions', 'Base Price', 'Extra Spread', 'Min Pages', 'Status', 'Actions'].map((h, i) => (
                    <th key={h} className={`px-4 sm:px-6 py-3.5 font-medium text-[10px] uppercase tracking-wider ${i === 6 ? 'text-right' : ''}`} style={{ color: ADMIN.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-sm" style={{ color: ADMIN.muted }}>Loading…</td></tr>
                ) : sizes?.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-sm" style={{ color: ADMIN.muted }}>No book sizes found.</td></tr>
                ) : (
                  sizes?.map((size: BookSize) => (
                    <tr key={size.id} className="transition-colors hover:bg-[#FBF7F5]" style={{ borderTop: `1px solid ${ADMIN.line}` }}>
                      <td className="px-4 sm:px-6 py-4 font-medium flex items-center gap-2" style={{ color: ADMIN.ink }}>
                        <SquareSquare size={16} className="shrink-0" style={{ color: ADMIN.blush }} />
                        {size.label}
                      </td>
                      <td className="px-4 sm:px-6 py-4 font-mono text-xs" style={{ color: ADMIN.muted }}>{size.widthCm} × {size.heightCm} cm</td>
                      <td className="px-4 sm:px-6 py-4 font-mono">{size.priceBase.toLocaleString()} LEK</td>
                      <td className="px-4 sm:px-6 py-4 font-mono" style={{ color: ADMIN.muted }}>{size.pricePerExtraSpread.toLocaleString()} LEK</td>
                      <td className="px-4 sm:px-6 py-4">{size.minPages}</td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${size.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'}`}>
                          {size.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" style={{ color: ADMIN.muted }} onClick={() => setFormTarget({ open: true, size })}>
                            <Edit2 size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteTarget(size)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
