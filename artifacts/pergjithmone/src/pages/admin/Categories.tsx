import React, { useMemo, useState } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import { AdminModal } from '@/components/admin/AdminModal';
import {
  useListAdminCategories, useCreateAdminCategory, useUpdateAdminCategory, useDeleteAdminCategory,
  useListSubcategories, useCreateAdminSubcategory, useUpdateAdminSubcategory, useDeleteAdminSubcategory,
  getListAdminCategoriesQueryKey, getListCategoriesQueryKey, getListSubcategoriesQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUploadInput } from '@/components/admin/ImageUploadInput';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, FolderTree, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getCategoryImage } from '@/lib/categoryImages';
import { CategoryCoverImg } from '@/components/CategoryCoverImg';

type Category = {
  id: number; slug: string; nameAl: string; nameEn: string; iconEmoji: string;
  coverImage?: string | null; sortOrder: number; isActive: boolean;
};

type Subcategory = {
  id: number; categoryId: number; slug: string; nameAl: string; nameEn: string;
  previewImage?: string | null; sortOrder: number; isActive: boolean;
};

// ── Inline active/inactive toggle pill ──────────────────────────────────────
function ActiveToggle({ catId, isActive }: { catId: number; isActive: boolean }) {
  const updateCategory = useUpdateAdminCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      await updateCategory.mutateAsync({
        categoryId: catId,
        data: { isActive: !isActive } as any,
      });
      await invalidateCategoryQueries(queryClient);
    } catch (e: any) {
      toast({ title: 'Failed to update category', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isActive ? 'Click to hide' : 'Click to show'}
      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-150 focus:outline-none disabled:opacity-60 ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
          : 'bg-neutral-100 text-neutral-400 border-neutral-200 hover:bg-neutral-200 hover:text-neutral-600'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
      {loading ? '…' : isActive ? 'Active' : 'Hidden'}
    </button>
  );
}

async function invalidateCategoryQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getListAdminCategoriesQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() }),
  ]);
}

// ── Create / Edit category modal ────────────────────────────────────────────
function CategoryFormModal({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const isEdit = !!category;
  const [form, setForm] = useState({
    slug: category?.slug || '',
    nameAl: category?.nameAl || '',
    nameEn: category?.nameEn || '',
    iconEmoji: category?.iconEmoji || '📷',
    coverImage: category?.coverImage || '',
    sortOrder: category?.sortOrder ?? 0,
    isActive: category?.isActive ?? true,
  });
  const [error, setError] = useState('');
  const createCategory = useCreateAdminCategory();
  const updateCategory = useUpdateAdminCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const loading = createCategory.isPending || updateCategory.isPending;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!form.slug.trim() || !form.nameAl.trim() || !form.nameEn.trim() || !form.iconEmoji.trim()) {
      setError('Slug, icon, and both names (AL/EN) are required.');
      return;
    }
    try {
      const data = {
        slug: form.slug.trim(),
        nameAl: form.nameAl.trim(),
        nameEn: form.nameEn.trim(),
        iconEmoji: form.iconEmoji.trim(),
        coverImage: form.coverImage || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      if (isEdit) {
        await updateCategory.mutateAsync({ categoryId: category!.id, data });
      } else {
        await createCategory.mutateAsync({ data });
      }
      await invalidateCategoryQueries(queryClient);
      toast({ title: isEdit ? 'Category updated' : 'Category created' });
      onClose();
    } catch (err: any) {
      setError(err?.data?.error || err?.message || `Failed to ${isEdit ? 'update' : 'create'} category`);
    }
  };

  return (
    <AdminModal
      size="md"
      title={isEdit ? 'Edit category' : 'New category'}
      subtitle="Shown on Home and in the create-album flow."
      icon={isEdit ? <Edit2 size={16} style={{ color: ADMIN.blushDeep }} /> : <Plus size={16} style={{ color: ADMIN.blushDeep }} />}
      onClose={onClose}
      footer={
        <>
          {error && <p className="text-sm text-red-600 flex-1 min-w-0">{error}</p>}
          <span className="flex-1" />
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl min-w-[6rem]">Cancel</Button>
          <Button type="button" disabled={loading} onClick={() => void submit()}
            className="rounded-xl text-white min-w-[8rem] hover:opacity-90" style={{ background: ADMIN.blush }}>
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4 px-5 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Icon *</label>
            <Input value={form.iconEmoji} onChange={e => setForm(f => ({ ...f, iconEmoji: e.target.value }))} placeholder="📷" required />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Slug *</label>
            <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="wedding" required />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Name (Albanian) *</label>
          <Input value={form.nameAl} onChange={e => setForm(f => ({ ...f, nameAl: e.target.value }))} placeholder="Dasma" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Name (English) *</label>
          <Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} placeholder="Wedding" required />
        </div>
        <ImageUploadInput
          value={form.coverImage}
          onChange={url => setForm(f => ({ ...f, coverImage: url }))}
          label="Cover Image"
          fallbackPreview={
            isEdit
              ? getCategoryImage(form.nameAl || category!.nameAl, null, form.slug || category!.slug)
              : (form.slug || form.nameAl
                  ? getCategoryImage(form.nameAl, null, form.slug)
                  : undefined)
          }
          fallbackHint="This is what customers see on Home / Create. Upload to replace it."
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Sort Order</label>
            <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 pb-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
              Active
            </label>
          </div>
        </div>
      </form>
    </AdminModal>
  );
}

// ── Create / Edit subcategory modal ─────────────────────────────────────────
function SubcategoryFormModal({ categoryId, subcategory, onClose }: {
  categoryId: number; subcategory: Subcategory | null; onClose: () => void;
}) {
  const isEdit = !!subcategory;
  const [form, setForm] = useState({
    slug: subcategory?.slug || '',
    nameAl: subcategory?.nameAl || '',
    nameEn: subcategory?.nameEn || '',
    previewImage: subcategory?.previewImage || '',
    sortOrder: subcategory?.sortOrder ?? 0,
    isActive: subcategory?.isActive ?? true,
  });
  const [error, setError] = useState('');
  const createSub = useCreateAdminSubcategory();
  const updateSub = useUpdateAdminSubcategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const loading = createSub.isPending || updateSub.isPending;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!form.slug.trim() || !form.nameAl.trim() || !form.nameEn.trim()) {
      setError('Slug and both names (AL/EN) are required.');
      return;
    }
    try {
      const data = {
        categoryId,
        slug: form.slug.trim(),
        nameAl: form.nameAl.trim(),
        nameEn: form.nameEn.trim(),
        previewImage: form.previewImage || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      if (isEdit) {
        await updateSub.mutateAsync({ subcategoryId: subcategory!.id, data });
      } else {
        await createSub.mutateAsync({ data });
      }
      await queryClient.invalidateQueries({ queryKey: getListSubcategoriesQueryKey(categoryId) });
      toast({ title: isEdit ? 'Subcategory updated' : 'Subcategory created' });
      onClose();
    } catch (err: any) {
      setError(err?.data?.error || err?.message || `Failed to ${isEdit ? 'update' : 'create'} subcategory`);
    }
  };

  return (
    <AdminModal
      size="md"
      title={isEdit ? 'Edit subcategory' : 'New subcategory'}
      subtitle="Templates link to a subcategory, not the parent category."
      icon={isEdit ? <Edit2 size={16} style={{ color: ADMIN.blushDeep }} /> : <Plus size={16} style={{ color: ADMIN.blushDeep }} />}
      onClose={onClose}
      footer={
        <>
          {error && <p className="text-sm text-red-600 flex-1 min-w-0">{error}</p>}
          <span className="flex-1" />
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl min-w-[6rem]">Cancel</Button>
          <Button type="button" disabled={loading} onClick={() => void submit()}
            className="rounded-xl text-white min-w-[8rem] hover:opacity-90" style={{ background: ADMIN.blush }}>
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create subcategory'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4 px-5 py-4">
        <div>
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Slug *</label>
          <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="beach-wedding" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Name (Albanian) *</label>
          <Input value={form.nameAl} onChange={e => setForm(f => ({ ...f, nameAl: e.target.value }))} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Name (English) *</label>
          <Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} required />
        </div>
        <ImageUploadInput value={form.previewImage} onChange={url => setForm(f => ({ ...f, previewImage: url }))} label="Preview Image" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Sort Order</label>
            <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 pb-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
              Active
            </label>
          </div>
        </div>
      </form>
    </AdminModal>
  );
}

// ── Generic delete confirm ──────────────────────────────────────────────────
function DeleteConfirm({ title, description, onConfirm, onCancel, loading }: {
  title: string; description: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <AdminModal
      size="sm"
      title={title}
      subtitle={description}
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
        This cannot be undone.
      </div>
    </AdminModal>
  );
}

// ── Subcategory panel (expanded under a category row) ──────────────────────
function SubcategoryPanel({ categoryId }: { categoryId: number }) {
  const { data: subcategories, isLoading } = useListSubcategories(categoryId);
  const deleteSub = useDeleteAdminSubcategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formTarget, setFormTarget] = useState<{ open: boolean; sub: Subcategory | null }>({ open: false, sub: null });
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSub.mutateAsync({ subcategoryId: deleteTarget.id });
      await queryClient.invalidateQueries({ queryKey: getListSubcategoriesQueryKey(categoryId) });
      toast({ title: 'Subcategory deleted' });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: 'Failed to delete subcategory', description: e?.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-6 py-4 bg-muted/20">
      {formTarget.open && (
        <SubcategoryFormModal categoryId={categoryId} subcategory={formTarget.sub} onClose={() => setFormTarget({ open: false, sub: null })} />
      )}
      {deleteTarget && (
        <DeleteConfirm
          title="Delete Subcategory?"
          description={`This will permanently delete "${deleteTarget.nameEn}". Templates linked to it may be affected.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subcategories</p>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setFormTarget({ open: true, sub: null })}>
          <Plus size={12} /> New Subcategory
        </Button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : subcategories?.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No subcategories yet — templates need one to link to.</p>
      ) : (
        <div className="space-y-1.5">
          {subcategories?.map(sub => (
            <div key={sub.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sub.isActive ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                <span className="text-sm font-medium truncate">{sub.nameAl}</span>
                <span className="text-xs text-muted-foreground truncate">{sub.nameEn}</span>
                <span className="text-[10px] text-muted-foreground font-mono">#{sub.id}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFormTarget({ open: true, sub })}>
                  <Edit2 size={12} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteTarget(sub)}>
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCategories() {
  const { data: categories, isLoading } = useListAdminCategories();
  const deleteCategory = useDeleteAdminCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formTarget, setFormTarget] = useState<{ open: boolean; cat: Category | null }>({ open: false, cat: null });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [visFilter, setVisFilter] = useState<'all' | 'active' | 'hidden'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (categories || []).filter(cat => {
      if (visFilter === 'active' && !cat.isActive) return false;
      if (visFilter === 'hidden' && cat.isActive) return false;
      if (!q) return true;
      return [cat.nameAl, cat.nameEn, cat.slug].some(s => s.toLowerCase().includes(q));
    });
  }, [categories, query, visFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategory.mutateAsync({ categoryId: deleteTarget.id });
      await invalidateCategoryQueries(queryClient);
      toast({ title: 'Category deleted' });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: 'Failed to delete category', description: e?.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      {formTarget.open && (
        <CategoryFormModal category={formTarget.cat} onClose={() => setFormTarget({ open: false, cat: null })} />
      )}
      {deleteTarget && (
        <DeleteConfirm
          title="Delete Category?"
          description={`This will permanently delete "${deleteTarget.nameEn}" and all of its subcategories/templates. This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      <div className="p-3 sm:p-4 md:p-5 max-w-screen-xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>Catalog</p>
            <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>Categories</h1>
            <p className="text-sm" style={{ color: ADMIN.muted }}>Book categories, subcategories, and visibility on Home and Create.</p>
          </div>
          <Button className="gap-2 rounded-2xl text-white hover:opacity-90 shrink-0" style={{ background: ADMIN.blush }}
            onClick={() => setFormTarget({ open: true, cat: null })}>
            <Plus size={16} /> New Category
          </Button>
        </div>

        <div className="mb-5 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: ADMIN.muted }} />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search categories…" className="pl-8 h-10 rounded-xl" />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'active', 'hidden'] as const).map(v => (
              <button key={v} type="button" onClick={() => setVisFilter(v)}
                className="px-3 h-10 rounded-xl text-[11px] font-semibold capitalize"
                style={visFilter === v ? { background: ADMIN.ink, color: '#fff' } : { background: ADMIN.card, color: ADMIN.ink, border: `1px solid ${ADMIN.line}` }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead style={{ background: ADMIN.bg }}>
                <tr style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
                  <th className="px-4 sm:px-6 py-3.5 font-medium w-8 text-[10px] uppercase tracking-wider" style={{ color: ADMIN.muted }}></th>
                  <th className="px-4 sm:px-6 py-3.5 font-medium text-[10px] uppercase tracking-wider" style={{ color: ADMIN.muted }}>Cover</th>
                  <th className="px-4 sm:px-6 py-3.5 font-medium text-[10px] uppercase tracking-wider" style={{ color: ADMIN.muted }}>Name</th>
                  <th className="px-4 sm:px-6 py-3.5 font-medium text-[10px] uppercase tracking-wider" style={{ color: ADMIN.muted }}>Status</th>
                  <th className="px-4 sm:px-6 py-3.5 font-medium text-[10px] uppercase tracking-wider" style={{ color: ADMIN.muted }}>Order</th>
                  <th className="px-4 sm:px-6 py-3.5 font-medium text-[10px] uppercase tracking-wider text-right" style={{ color: ADMIN.muted }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm" style={{ color: ADMIN.muted }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm" style={{ color: ADMIN.muted }}>
                    {categories?.length ? 'No categories match this filter.' : 'No categories found.'}
                  </td></tr>
                ) : (
                  filtered.map(cat => {
                    const isCustomCover = !!cat.coverImage;
                    return (
                    <React.Fragment key={cat.id}>
                      <tr className="transition-colors hover:bg-[#F5F6F8]" style={{ borderTop: `1px solid ${ADMIN.line}` }}>
                        <td className="px-4 sm:px-6 py-4">
                          <button
                            onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
                            className="transition-colors"
                            style={{ color: ADMIN.muted }}
                            title="Toggle subcategories"
                          >
                            {expanded === cat.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-4 sm:px-6 py-3">
                          <div
                            className="relative rounded-xl overflow-hidden border shrink-0"
                            style={{ width: 56, height: 56, borderColor: ADMIN.line }}
                          >
                            <CategoryCoverImg
                              nameAl={cat.nameAl}
                              coverImage={cat.coverImage}
                              slug={cat.slug}
                              alt={cat.nameEn || cat.nameAl}
                            />
                            <span className="absolute bottom-0.5 left-0.5 text-[11px] leading-none drop-shadow">{cat.iconEmoji}</span>
                          </div>
                          <p className="text-[9px] mt-1 font-medium" style={{ color: isCustomCover ? ADMIN.success : ADMIN.warn }}>
                            {isCustomCover ? 'Custom' : 'Default'}
                          </p>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <p className="font-medium" style={{ color: ADMIN.ink }}>{cat.nameAl}</p>
                          <p className="text-xs" style={{ color: ADMIN.muted }}>{cat.nameEn} · <span className="font-mono">{cat.slug}</span></p>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <ActiveToggle catId={cat.id} isActive={cat.isActive} />
                        </td>
                        <td className="px-4 sm:px-6 py-4" style={{ color: ADMIN.muted }}>{cat.sortOrder}</td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              style={{ color: ADMIN.muted }}
                              onClick={() => setFormTarget({ open: true, cat })}
                              title="Edit category"
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeleteTarget(cat)}
                              title="Delete category"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expanded === cat.id && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <SubcategoryPanel categoryId={cat.id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-xs flex items-center gap-1.5" style={{ color: ADMIN.muted }}>
          <FolderTree size={12} /> Expand a category to manage its subcategories — templates link to a subcategory.
        </p>
      </div>
    </AdminLayout>
  );
}
