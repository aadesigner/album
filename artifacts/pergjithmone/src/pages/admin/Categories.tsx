import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  useListAdminCategories, useCreateAdminCategory, useUpdateAdminCategory, useDeleteAdminCategory,
  useListSubcategories, useCreateAdminSubcategory, useUpdateAdminSubcategory, useDeleteAdminSubcategory,
  getListAdminCategoriesQueryKey, getListCategoriesQueryKey, getListSubcategoriesQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUploadInput } from '@/components/admin/ImageUploadInput';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, FolderTree } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
            {isEdit ? <Edit2 size={16} className="text-rose-600" /> : <Plus size={16} className="text-rose-600" />}
          </div>
          <h3 className="font-serif text-lg font-semibold">{isEdit ? 'Edit Category' : 'New Category'}</h3>
        </div>
        <form onSubmit={submit} className="space-y-4">
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
          <ImageUploadInput value={form.coverImage} onChange={url => setForm(f => ({ ...f, coverImage: url }))} label="Cover Image" />
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
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
            {isEdit ? <Edit2 size={16} className="text-rose-600" /> : <Plus size={16} className="text-rose-600" />}
          </div>
          <h3 className="font-serif text-lg font-semibold">{isEdit ? 'Edit Subcategory' : 'New Subcategory'}</h3>
        </div>
        <form onSubmit={submit} className="space-y-4">
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
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Subcategory'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Generic delete confirm ──────────────────────────────────────────────────
function DeleteConfirm({ title, description, onConfirm, onCancel, loading }: {
  title: string; description: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="font-serif text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-neutral-500 mb-5">{description}</p>
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

      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2">Categories</h1>
            <p className="text-muted-foreground">Manage book categories, subcategories, and visibility.</p>
          </div>
          <Button className="gap-2" onClick={() => setFormTarget({ open: true, cat: null })}>
            <Plus size={16} /> New Category
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium w-8"></th>
                  <th className="px-6 py-4 font-medium">Icon</th>
                  <th className="px-6 py-4 font-medium">Name (AL)</th>
                  <th className="px-6 py-4 font-medium">Name (EN)</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Order</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading categories...</td></tr>
                ) : categories?.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No categories found.</td></tr>
                ) : (
                  categories?.map(cat => (
                    <React.Fragment key={cat.id}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Toggle subcategories"
                          >
                            {expanded === cat.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-2xl">{cat.iconEmoji}</td>
                        <td className="px-6 py-4 font-medium">{cat.nameAl}</td>
                        <td className="px-6 py-4 text-muted-foreground">{cat.nameEn}</td>
                        <td className="px-6 py-4">
                          <ActiveToggle catId={cat.id} isActive={cat.isActive} />
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{cat.sortOrder}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                          <td colSpan={7} className="p-0">
                            <SubcategoryPanel categoryId={cat.id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5">
          <FolderTree size={12} /> Expand a category to manage its subcategories — templates link to a subcategory.
        </p>
      </div>
    </AdminLayout>
  );
}
