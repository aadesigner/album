import React, { useMemo, useState } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import {
  useListAdminTemplates, useListAdminCategories,
  useCreateAdminTemplate, useUpdateAdminTemplate, useDeleteAdminTemplate,
  getListAdminTemplatesQueryKey, getListTemplatesQueryKey,
  getListSubcategoriesQueryOptions,
} from '@workspace/api-client-react-tsconfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUploadInput } from '@/components/admin/ImageUploadInput';
import { Plus, Edit2, Trash2, Sparkles, ExternalLink, ImageOff } from 'lucide-react';
import { useQueryClient, useQueries } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

type Template = {
  id: number; subcategoryId: number; nameAl: string; nameEn: string;
  coverImageUrl: string; backCoverImageUrl?: string | null;
  themeColors?: string[]; fonts?: string[]; isActive: boolean;
};

async function invalidateTemplateQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getListAdminTemplatesQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() }),
    queryClient.invalidateQueries({
      predicate: query => typeof query.queryKey[0] === 'string' && (query.queryKey[0] as string).startsWith('/api/templates/'),
    }),
  ]);
}

function useGroupedSubcategories() {
  const { data: categories } = useListAdminCategories();
  const results = useQueries({
    queries: (categories || []).map(cat => getListSubcategoriesQueryOptions(cat.id)),
  });

  const groups = (categories || []).map((cat, i) => ({
    category: cat,
    subcategories: (results[i]?.data as any[]) || [],
  }));
  const subNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const g of groups) {
      for (const sub of g.subcategories) {
        map.set(sub.id, `${g.category.nameEn} · ${sub.nameEn}`);
      }
    }
    return map;
  }, [groups]);
  const isLoading = !categories || results.some(r => r.isLoading);
  return { groups, isLoading, subNameById };
}

function CoverThumb({ src, label }: { src?: string | null; label: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-neutral-100 text-neutral-400">
        <ImageOff size={18} />
        <span className="text-[10px] font-medium">{label}</span>
      </div>
    );
  }
  return <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setBroken(true)} />;
}

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ background: ADMIN.blushSoft }}>
            {isEdit ? <Edit2 size={16} style={{ color: ADMIN.blushDeep }} /> : <Plus size={16} style={{ color: ADMIN.blushDeep }} />}
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold">{isEdit ? 'Edit Template' : 'New Template'}</h3>
            <p className="text-[11px]" style={{ color: ADMIN.muted }}>Showcase cover images linked to a subcategory.</p>
          </div>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Name (Albanian) *</label>
              <Input value={form.nameAl} onChange={e => setForm(f => ({ ...f, nameAl: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Name (English) *</label>
              <Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploadInput value={form.coverImageUrl} onChange={url => setForm(f => ({ ...f, coverImageUrl: url }))} label="Front cover *" />
            <ImageUploadInput value={form.backCoverImageUrl} onChange={url => setForm(f => ({ ...f, backCoverImageUrl: url }))} label="Back cover" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Theme Colors (comma-separated hex)</label>
            <Input value={form.themeColors} onChange={e => setForm(f => ({ ...f, themeColors: e.target.value }))} placeholder="#E85A6B, #FCE8EB" />
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
            <Button type="submit" disabled={loading} className="flex-1 text-white hover:opacity-90 rounded-2xl" style={{ background: ADMIN.blush }}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}
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
        <h3 className="font-serif text-lg font-semibold mb-2">Delete Template?</h3>
        <p className="text-sm text-neutral-500 mb-5">
          Permanently delete <strong>{name}</strong>? This cannot be undone.
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
  const { subNameById } = useGroupedSubcategories();
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

      <div className="p-4 sm:p-5 md:p-8 max-w-screen-xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>Catalog</p>
            <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>Templates</h1>
            <p className="text-sm max-w-xl" style={{ color: ADMIN.muted }}>
              Marketing / showcase covers linked to subcategories. Editable album covers live in Design Studio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href="/heyadmin/dizajne">
              <Button variant="outline" className="gap-2 rounded-2xl">
                <Sparkles size={14} /> Design Studio
              </Button>
            </Link>
            <Button className="gap-2 rounded-2xl text-white hover:opacity-90" style={{ background: ADMIN.blush }}
              onClick={() => setFormTarget({ open: true, template: null })}>
              <Plus size={16} /> New Template
            </Button>
          </div>
        </div>

        <div
          className="mb-6 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 text-sm"
          style={{ background: ADMIN.accentSoft, border: `1px solid ${ADMIN.line}` }}
        >
          <Sparkles size={16} style={{ color: ADMIN.accentDeep }} className="shrink-0" />
          <p style={{ color: ADMIN.ink }} className="flex-1">
            Need to edit front &amp; back cover layouts (text, art, hide/show)? Use{' '}
            <Link href="/heyadmin/dizajne" className="font-semibold underline underline-offset-2" style={{ color: ADMIN.accentDeep }}>
              Design Studio
            </Link>
            .
          </p>
          <Link href="/heyadmin/dizajne" className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: ADMIN.accentDeep }}>
            Open <ExternalLink size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {isLoading ? (
            [1, 2, 3, 4].map(i => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl" style={{ background: ADMIN.blushSoft }} />)
          ) : !templates?.length ? (
            <div className="col-span-full py-16 text-center rounded-2xl" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
              <p className="text-sm font-medium mb-1" style={{ color: ADMIN.ink }}>No showcase templates yet</p>
              <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: ADMIN.muted }}>
                Create one here for marketing cards, or edit the real album covers customers pick in Design Studio.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" className="rounded-2xl" onClick={() => setFormTarget({ open: true, template: null })}>
                  <Plus size={14} className="mr-1.5" /> New template
                </Button>
                <Link href="/heyadmin/dizajne">
                  <Button className="rounded-2xl text-white" style={{ background: ADMIN.blush }}>
                    <Sparkles size={14} className="mr-1.5" /> Design Studio
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            templates.map(template => (
              <div key={template.id} className="rounded-2xl overflow-hidden group shadow-sm" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
                <div className="grid grid-cols-2 gap-px bg-neutral-200">
                  <div className="aspect-[3/4] relative bg-white">
                    <CoverThumb src={template.coverImageUrl} label="Front" />
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-black/55 text-white">Front</span>
                  </div>
                  <div className="aspect-[3/4] relative bg-white">
                    <CoverThumb src={template.backCoverImageUrl} label="No back" />
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-black/55 text-white">Back</span>
                  </div>
                </div>
                <div className="p-4" style={{ borderTop: `1px solid ${ADMIN.line}` }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-serif font-medium text-base truncate" style={{ color: ADMIN.ink }}>{template.nameEn}</h3>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${template.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'}`}>
                      {template.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <p className="text-xs truncate mb-3" style={{ color: ADMIN.muted }}>
                    {subNameById.get(template.subcategoryId) || `Subcategory #${template.subcategoryId}`}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl h-8 text-xs" onClick={() => setFormTarget({ open: true, template })}>
                      <Edit2 size={12} className="mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-50" onClick={() => setDeleteTarget(template)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
