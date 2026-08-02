import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  useListAdminTemplates, useListAdminCategories,
  useCreateAdminTemplate, useUpdateAdminTemplate, useDeleteAdminTemplate,
  getListAdminTemplatesQueryKey, getListTemplatesQueryKey,
  getListSubcategoriesQueryOptions,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUploadInput } from '@/components/admin/ImageUploadInput';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useQueryClient, useQueries } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type Template = {
  id: number; subcategoryId: number; nameAl: string; nameEn: string;
  coverImageUrl: string; backCoverImageUrl?: string | null;
  themeColors?: string[]; fonts?: string[]; isActive: boolean;
};

async function invalidateTemplateQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getListAdminTemplatesQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() }),
    // Individual GET /templates/:id queries are keyed per-id; invalidate all of them by prefix.
    queryClient.invalidateQueries({
      predicate: query => typeof query.queryKey[0] === 'string' && (query.queryKey[0] as string).startsWith('/api/templates/'),
    }),
  ]);
}

/** Loads subcategories for every category so templates can be linked to one, grouped by category. */
function useGroupedSubcategories() {
  const { data: categories } = useListAdminCategories();
  const results = useQueries({
    queries: (categories || []).map(cat => getListSubcategoriesQueryOptions(cat.id)),
  });

  const groups = (categories || []).map((cat, i) => ({
    category: cat,
    subcategories: (results[i]?.data as any[]) || [],
  }));
  const isLoading = !categories || results.some(r => r.isLoading);
  return { groups, isLoading };
}

// ── Create / Edit template modal ────────────────────────────────────────────
function TemplateFormModal({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const isEdit = !!template;
  const { groups, isLoading: subsLoading } = useGroupedSubcategories();
  const [form, setForm] = useState({
    subcategoryId: template?.subcategoryId ?? 0,
    nameAl: template?.nameAl || '',
    nameEn: template?.nameEn || '',
    coverImageUrl: template?.coverImageUrl || '',
    backCoverImageUrl: template?.backCoverImageUrl || '',
    themeColors: (template?.themeColors || []).join(', '),
    fonts: (template?.fonts || []).join(', '),
    isActive: template?.isActive ?? true,
  });
  const [error, setError] = useState('');
  const createTemplate = useCreateAdminTemplate();
  const updateTemplate = useUpdateAdminTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const loading = createTemplate.isPending || updateTemplate.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.subcategoryId) {
      setError('Please select a subcategory to link this template to.');
      return;
    }
    if (!form.nameAl.trim() || !form.nameEn.trim() || !form.coverImageUrl.trim()) {
      setError('Both names and a cover image are required.');
      return;
    }
    try {
      const data = {
        subcategoryId: Number(form.subcategoryId),
        nameAl: form.nameAl.trim(),
        nameEn: form.nameEn.trim(),
        coverImageUrl: form.coverImageUrl.trim(),
        backCoverImageUrl: form.backCoverImageUrl || undefined,
        themeColors: form.themeColors.split(',').map(s => s.trim()).filter(Boolean),
        fonts: form.fonts.split(',').map(s => s.trim()).filter(Boolean),
        isActive: form.isActive,
      };
      if (isEdit) {
        await updateTemplate.mutateAsync({ templateId: template!.id, data });
      } else {
        await createTemplate.mutateAsync({ data });
      }
      await invalidateTemplateQueries(queryClient);
      toast({ title: isEdit ? 'Template updated' : 'Template created' });
      onClose();
    } catch (err: any) {
      setError(err?.data?.error || err?.message || `Failed to ${isEdit ? 'update' : 'create'} template`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
            {isEdit ? <Edit2 size={16} className="text-rose-600" /> : <Plus size={16} className="text-rose-600" />}
          </div>
          <h3 className="font-serif text-lg font-semibold">{isEdit ? 'Edit Template' : 'New Template'}</h3>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Subcategory *</label>
            <select
              value={form.subcategoryId}
              onChange={e => setForm(f => ({ ...f, subcategoryId: Number(e.target.value) }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              disabled={subsLoading}
            >
              <option value={0} disabled>{subsLoading ? 'Loading…' : 'Select a subcategory'}</option>
              {groups.map(g => (
                <optgroup key={g.category.id} label={`${g.category.iconEmoji} ${g.category.nameEn}`}>
                  {g.subcategories.length === 0 ? (
                    <option value="" disabled>No subcategories — add one under Categories</option>
                  ) : (
                    g.subcategories.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>{sub.nameEn} ({sub.nameAl})</option>
                    ))
                  )}
                </optgroup>
              ))}
            </select>
            {!subsLoading && groups.every(g => g.subcategories.length === 0) && (
              <p className="text-[11px] text-amber-600 mt-1.5">No subcategories exist yet. Create one from the Categories page first.</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Name (Albanian) *</label>
            <Input value={form.nameAl} onChange={e => setForm(f => ({ ...f, nameAl: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Name (English) *</label>
            <Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} required />
          </div>
          <ImageUploadInput value={form.coverImageUrl} onChange={url => setForm(f => ({ ...f, coverImageUrl: url }))} label="Cover Image *" />
          <ImageUploadInput value={form.backCoverImageUrl} onChange={url => setForm(f => ({ ...f, backCoverImageUrl: url }))} label="Back Cover Image (optional)" />
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Theme Colors (comma-separated hex)</label>
            <Input value={form.themeColors} onChange={e => setForm(f => ({ ...f, themeColors: e.target.value }))} placeholder="#f43f5e, #e879f9" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Fonts (comma-separated)</label>
            <Input value={form.fonts} onChange={e => setForm(f => ({ ...f, fonts: e.target.value }))} placeholder="Playfair Display, Inter" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
            Active
          </label>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}
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
        <h3 className="font-serif text-lg font-semibold mb-2">Delete Template?</h3>
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

export default function AdminTemplates() {
  const { data: templates, isLoading } = useListAdminTemplates();
  const deleteTemplate = useDeleteAdminTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formTarget, setFormTarget] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null });
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTemplate.mutateAsync({ templateId: deleteTarget.id });
      await invalidateTemplateQueries(queryClient);
      toast({ title: 'Template deleted' });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: 'Failed to delete template', description: e?.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      {formTarget.open && (
        <TemplateFormModal template={formTarget.template} onClose={() => setFormTarget({ open: false, template: null })} />
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
            <h1 className="text-3xl font-bold font-serif mb-2">Templates</h1>
            <p className="text-muted-foreground">Manage predefined album designs.</p>
          </div>
          <Button className="gap-2" onClick={() => setFormTarget({ open: true, template: null })}>
            <Plus size={16} /> New Template
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-2xl" />)
          ) : templates?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">No templates found.</div>
          ) : (
            templates?.map(template => (
              <div key={template.id} className="bg-card border border-border rounded-2xl overflow-hidden group">
                <div className="aspect-[4/5] relative">
                  <img src={template.coverImageUrl} alt={template.nameAl} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2">
                     <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${template.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {template.isActive ? 'Active' : 'Hidden'}
                     </span>
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full" onClick={() => setFormTarget({ open: true, template })}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-10 w-10 rounded-full" onClick={() => setDeleteTarget(template)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                <div className="p-4 border-t border-border">
                  <h3 className="font-serif font-medium text-lg truncate">{template.nameAl}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Subcategory ID: {template.subcategoryId}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
