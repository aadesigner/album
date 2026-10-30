import React, { useEffect, useRef, useState } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import {
  useGetAdminSettings, useUpdateAdminSettings,
  getGetAdminSettingsQueryKey, getGetAppSettingsQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Sticker, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { uploadErrorMessage, uploadImageToApi } from '@/lib/uploadImage';
import { ACCEPT_SAFE_IMAGES } from '@/lib/acceptedImages';
import { resolvePublicImageSrc } from '@/lib/categoryImages';
import { parseEditorElements, EDITOR_ELEMENTS_MAX, type EditorElementAsset } from '@/lib/editorElements';

const CHECKER = 'repeating-conic-gradient(#E8E4DC 0% 25%, #FAF7F2 0% 50%) 50% / 16px 16px';

export default function AdminEditorElements() {
  const { data: settings } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<EditorElementAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(parseEditorElements((settings as any)?.editorElements));
  }, [settings]);

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
    if (!item) return;
    void persist(items);
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: ADMIN.muted }}>
              Catalog
            </p>
            <h1 className="font-serif text-3xl font-semibold" style={{ color: ADMIN.ink }}>
              Text / Elements
            </h1>
            <p className="text-sm mt-2 max-w-xl" style={{ color: ADMIN.muted }}>
              Upload PNG or JPG decorations. Clients pick them in the album editor under Text / Art
              and move them on the page like a photo — without crop or adjust.
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              onClick={() => fileRef.current?.click()}
              disabled={uploading || saving}
              style={{ background: ADMIN.ink, color: '#fff' }}
            >
              {uploading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
              Upload PNG / JPG
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed px-6 py-16 text-center"
            style={{ borderColor: ADMIN.line, background: ADMIN.card }}
          >
            <Sticker size={28} className="mx-auto mb-3" style={{ color: ADMIN.muted }} />
            <p className="text-sm font-medium" style={{ color: ADMIN.ink }}>No decorations yet</p>
            <p className="text-xs mt-1" style={{ color: ADMIN.muted }}>
              Hearts, frames, bows, seasonal art — transparent PNGs work best.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map(it => (
              <div
                key={it.id}
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: ADMIN.line, background: ADMIN.card, boxShadow: ADMIN.cardShadow }}
              >
                <div className="relative aspect-square" style={{ background: CHECKER }}>
                  <img
                    src={resolvePublicImageSrc(it.src) || it.src}
                    alt={it.name || ''}
                    className="absolute inset-0 w-full h-full object-contain p-3"
                    draggable={false}
                  />
                  <button
                    type="button"
                    onClick={() => void persist(items.filter(x => x.id !== it.id))}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full inline-flex items-center justify-center text-white"
                    style={{ background: 'rgba(180,40,40,0.9)' }}
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
                    placeholder="Label (optional)"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {saving && (
          <p className="text-xs mt-4" style={{ color: ADMIN.muted }}>Saving…</p>
        )}
      </div>
    </AdminLayout>
  );
}
