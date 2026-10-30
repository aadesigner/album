import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import {
  useGetAdminSettings, useUpdateAdminSettings,
  getGetAdminSettingsQueryKey, getGetAppSettingsQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Loader2, Search, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { uploadErrorMessage, uploadImageToApi } from '@/lib/uploadImage';
import { ACCEPT_SAFE_IMAGES } from '@/lib/acceptedImages';
import { resolvePublicImageSrc } from '@/lib/categoryImages';
import { parseEditorElements, EDITOR_ELEMENTS_MAX, type EditorElementAsset } from '@/lib/editorElements';

const CHECKER = 'repeating-conic-gradient(#E8E4DC 0% 25%, #FAF7F2 0% 50%) 50% / 14px 14px';

export default function AdminEditorElements() {
  const { data: settings } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<EditorElementAsset[]>([]);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setItems(parseEditorElements((settings as any)?.editorElements));
  }, [settings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it => (it.name || '').toLowerCase().includes(q) || it.src.toLowerCase().includes(q));
  }, [items, query]);

  const persist = async (next: EditorElementAsset[]) => {
    setSaving(true);
    try {
      await updateSettings.mutateAsync({ data: { editorElements: next } as any });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAppSettingsQueryKey() }),
      ]);
      setItems(next);
    } catch (e: any) {
      toast({
        title: 'Could not save elements',
        description: e?.data?.error || e?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const onFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    if (items.length + list.length > EDITOR_ELEMENTS_MAX) {
      toast({
        title: 'Too many elements',
        description: `Maximum ${EDITOR_ELEMENTS_MAX} decorations.`,
        variant: 'destructive',
      });
      return;
    }
    setUploading(true);
    try {
      const added: EditorElementAsset[] = [];
      for (const file of list) {
        const src = await uploadImageToApi(file, getToken());
        added.push({
          id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          src,
          name: file.name.replace(/\.[^.]+$/, '').slice(0, 80),
        });
      }
      await persist([...added, ...items]);
      toast({ title: added.length === 1 ? 'Element uploaded' : `${added.length} elements uploaded` });
    } catch (e) {
      toast({
        title: 'Upload failed',
        description: uploadErrorMessage(e, 'en'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const rename = (id: string, name: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, name } : it));
  };

  const saveName = (id: string) => {
    const item = items.find(it => it.id === id);
    const saved = parseEditorElements((settings as any)?.editorElements);
    const prev = saved.find(it => it.id === id);
    if (!item || item.name === (prev?.name || '')) return;
    void persist(items);
  };

  const remove = (id: string) => {
    const item = items.find(it => it.id === id);
    if (!item) return;
    if (!window.confirm(`Remove “${item.name || 'this element'}”? Clients will no longer see it in the editor.`)) return;
    void persist(items.filter(x => x.id !== id));
  };

  const takeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files?.length) void onFiles(e.dataTransfer.files);
  };

  return (
    <AdminLayout>
      <div
        className="max-w-5xl"
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
        onDrop={takeDrop}
      >
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5" style={{ color: ADMIN.blush }}>
              Catalog
            </p>
            <h1 className="text-3xl font-serif font-semibold mb-1" style={{ color: ADMIN.ink }}>
              Text / Elements
            </h1>
            <p className="text-sm max-w-xl" style={{ color: ADMIN.muted }}>
              PNG and JPG decorations for the album editor. Transparent PNGs stay see-through
              on the page — hearts, frames, bows, seasonal art.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_SAFE_IMAGES}
              multiple
              className="hidden"
              onChange={e => {
                if (e.target.files) void onFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              className="gap-2 rounded-2xl text-white hover:opacity-90"
              style={{ background: ADMIN.blush }}
              onClick={() => fileRef.current?.click()}
              disabled={uploading || saving}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Upload PNG / JPG
            </Button>
          </div>
        </div>

        <div className="mb-5 flex flex-col sm:flex-row gap-2.5 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: ADMIN.muted }} />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="pl-8 h-10 rounded-xl"
            />
          </div>
          <p className="text-xs shrink-0 tabular-nums" style={{ color: ADMIN.muted }}>
            {items.length} / {EDITOR_ELEMENTS_MAX}
            {saving ? ' · Saving' : ''}
            {uploading ? ' · Uploading' : ''}
          </p>
        </div>

        {dragOver && (
          <div
            className="mb-4 rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm font-medium"
            style={{ borderColor: ADMIN.blush, background: ADMIN.blushSoft, color: ADMIN.blushDeep }}
          >
            Drop PNG or JPG files to add them
          </div>
        )}

        {items.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl border border-dashed px-6 py-16 text-center transition-colors"
            style={{ borderColor: ADMIN.line, background: ADMIN.card }}
          >
            <div
              className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: ADMIN.blushSoft }}
            >
              {uploading ? <Loader2 size={20} className="animate-spin" style={{ color: ADMIN.blushDeep }} /> : <Upload size={20} style={{ color: ADMIN.blushDeep }} />}
            </div>
            <p className="text-sm font-medium" style={{ color: ADMIN.ink }}>No decorations yet</p>
            <p className="text-xs mt-1.5 max-w-sm mx-auto" style={{ color: ADMIN.muted }}>
              Drop files here or click to upload. Use a transparent PNG so the album page shows through.
            </p>
          </button>
        ) : filtered.length === 0 ? (
          <p className="text-sm py-12 text-center" style={{ color: ADMIN.muted }}>No elements match that search.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(it => (
              <div
                key={it.id}
                className="rounded-2xl border overflow-hidden group"
                style={{ borderColor: ADMIN.line, background: ADMIN.card, boxShadow: ADMIN.cardShadow }}
              >
                <div className="relative aspect-square" style={{ background: CHECKER }}>
                  <img
                    src={resolvePublicImageSrc(it.src) || it.src}
                    alt={it.name || ''}
                    className="absolute inset-0 w-full h-full object-contain p-4"
                    draggable={false}
                  />
                  <button
                    type="button"
                    onClick={() => remove(it.id)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full inline-flex items-center justify-center text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(180,40,40,0.92)' }}
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="p-2.5">
                  <Input
                    value={it.name}
                    onChange={e => rename(it.id, e.target.value)}
                    onBlur={() => saveName(it.id)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    placeholder="Label (optional)"
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
