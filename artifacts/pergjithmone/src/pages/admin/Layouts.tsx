import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  useListAdminLayouts, useCreateAdminLayout, useUpdateAdminLayout, useDeleteAdminLayout,
  getListAdminLayoutsQueryKey, getListLayoutsQueryKey,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Grid } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type Layout = {
  id: number; slug: string; nameAl: string; nameEn: string;
  previewIcon?: string | null; gridDefinitionJson: string; isActive: boolean;
};

async function invalidateLayoutQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getListAdminLayoutsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListLayoutsQueryKey() }),
  ]);
}

// ── Create / Edit layout modal ──────────────────────────────────────────────
function LayoutFormModal({ layout, onClose }: { layout: Layout | null; onClose: () => void }) {
  const isEdit = !!layout;
  const [form, setForm] = useState({
    slug: layout?.slug || '',
    nameAl: layout?.nameAl || '',
    nameEn: layout?.nameEn || '',
    previewIcon: layout?.previewIcon || '',
    gridDefinitionJson: layout?.gridDefinitionJson || '{\n  "cells": []\n}',
    isActive: layout?.isActive ?? true,
  });
  const [error, setError] = useState('');
  const createLayout = useCreateAdminLayout();
  const updateLayout = useUpdateAdminLayout();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const loading = createLayout.isPending || updateLayout.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.slug.trim() || !form.nameAl.trim() || !form.nameEn.trim() || !form.gridDefinitionJson.trim()) {
      setError('Slug, both names, and a grid definition are required.');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(form.gridDefinitionJson);
    } catch {
      setError('Grid Definition must be valid JSON.');
      return;
    }
    try {
      const data = {
        slug: form.slug.trim(),
        nameAl: form.nameAl.trim(),
        nameEn: form.nameEn.trim(),
        previewIcon: form.previewIcon || undefined,
        gridDefinitionJson: JSON.stringify(parsed),
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
            {isEdit ? <Edit2 size={16} className="text-rose-600" /> : <Plus size={16} className="text-rose-600" />}
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
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Grid Definition (JSON) *</label>
            <textarea
              value={form.gridDefinitionJson}
              onChange={e => setForm(f => ({ ...f, gridDefinitionJson: e.target.value }))}
              rows={6}
              spellCheck={false}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-300 resize-y"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Defines the placeholder grid used by the editor for this layout.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
            Active
          </label>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Layout'}
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
  const deleteLayout = useDeleteAdminLayout();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formTarget, setFormTarget] = useState<{ open: boolean; layout: Layout | null }>({ open: false, layout: null });
  const [deleteTarget, setDeleteTarget] = useState<Layout | null>(null);
  const [deleting, setDeleting] = useState(false);

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

      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2">Layouts</h1>
            <p className="text-muted-foreground">Manage the photo grid layouts available in the editor.</p>
          </div>
          <Button className="gap-2" onClick={() => setFormTarget({ open: true, layout: null })}>
            <Plus size={16} /> New Layout
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Icon</th>
                  <th className="px-6 py-4 font-medium">Slug</th>
                  <th className="px-6 py-4 font-medium">Name (AL)</th>
                  <th className="px-6 py-4 font-medium">Name (EN)</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading layouts...</td></tr>
                ) : layouts?.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No layouts found.</td></tr>
                ) : (
                  layouts?.map(layout => (
                    <tr key={layout.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-2xl">{layout.previewIcon || <Grid size={20} className="text-muted-foreground" />}</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{layout.slug}</td>
                      <td className="px-6 py-4 font-medium">{layout.nameAl}</td>
                      <td className="px-6 py-4 text-muted-foreground">{layout.nameEn}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${layout.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'}`}>
                          {layout.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setFormTarget({ open: true, layout })}>
                            <Edit2 size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteTarget(layout)}>
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
