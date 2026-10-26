import React, { useEffect, useRef, useState } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import { Link, useRoute, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Monitor, Smartphone, Save, RotateCcw, Check, Loader2, AlertTriangle,
  ChevronUp, ChevronDown, Plus, Trash2, Upload, Eye, EyeOff, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PreviewLanguageProvider } from '@/contexts/LanguageContext';
import {
  PAGE_META, isPageSlug, type PageSlug, type BiText, type ImgRef,
  getAt, isBiText, isImgRef,
} from '@/lib/marketingPages';
import { PageEditorProvider, usePageEditor } from '@/components/marketing/PageEditorContext';
import { FontPicker } from '@/components/FontPicker';
import { uploadErrorMessage, uploadImageToApi } from '@/lib/uploadImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const HomePage = React.lazy(() => import('@/pages/Home'));
const HowItWorksPage = React.lazy(() => import('@/pages/HowItWorks'));
const PricingPage = React.lazy(() => import('@/pages/Pricing'));
const ExamplesPage = React.lazy(() => import('@/pages/Examples'));
const AboutPage = React.lazy(() => import('@/pages/About'));
const FaqPage = React.lazy(() => import('@/pages/FAQ'));
const ContactPage = React.lazy(() => import('@/pages/Contact'));

function PreviewPage({ slug }: { slug: PageSlug }) {
  switch (slug) {
    case 'home': return <HomePage />;
    case 'how-it-works': return <HowItWorksPage />;
    case 'pricing': return <PricingPage />;
    case 'examples': return <ExamplesPage />;
    case 'about': return <AboutPage />;
    case 'faq': return <FaqPage />;
    case 'contact': return <ContactPage />;
  }
}

async function fetchPage(slug: PageSlug, token?: string | null) {
  const r = await fetch(`/api/admin/pages/${slug}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!r.ok) throw new Error('Could not load page');
  return r.json() as Promise<{ content: unknown }>;
}

export default function SitePages() {
  const [, params] = useRoute('/heyadmin/site/:page');
  const slug = params?.page && isPageSlug(params.page) ? params.page : null;
  if (slug) return <SitePageEditor slug={slug} />;
  return <SitePageIndex />;
}

function SitePageIndex() {
  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-5 py-10">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-2" style={{ color: ADMIN.muted }}>
          Marketing
        </p>
        <h1 className="font-serif text-3xl font-medium mb-2" style={{ color: ADMIN.ink }}>Site pages</h1>
        <p className="text-sm mb-8 max-w-lg" style={{ color: ADMIN.muted }}>
          Click anything on the live page to change text, images, sliders, fonts, and spacing. Albanian and English save together. Layout stays in code so a save cannot blank the site.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {PAGE_META.map((p) => (
            <Link key={p.slug} href={`/heyadmin/site/${p.slug}`}>
              <div
                className="rounded-2xl p-5 border hover:shadow-sm transition-shadow cursor-pointer"
                style={{ borderColor: ADMIN.line, background: ADMIN.card }}
              >
                <p className="font-serif text-lg font-medium" style={{ color: ADMIN.ink }}>{p.label}</p>
                <p className="text-[12px] mt-1" style={{ color: ADMIN.muted }}>{p.path}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

function SitePageEditor({ slug }: { slug: PageSlug }) {
  const { getToken } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-marketing-page', slug],
    queryFn: () => fetchPage(slug, getToken()),
  });
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24" style={{ color: ADMIN.muted }}>Loading page…</div>
      </AdminLayout>
    );
  }
  if (error) {
    return (
      <AdminLayout>
        <div className="p-8 text-sm" style={{ color: ADMIN.blush }}>Could not load this page.</div>
      </AdminLayout>
    );
  }
  return (
    <PageEditorProvider slug={slug} initial={data?.content} key={slug}>
      <EditorShell slug={slug} />
    </PageEditorProvider>
  );
}

function EditorShell({ slug }: { slug: PageSlug }) {
  const meta = PAGE_META.find((p) => p.slug === slug)!;
  const editor = usePageEditor();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewLang, setPreviewLang] = useState<'sq' | 'en'>('sq');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = frameRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-editable]')) return;
      const a = t.closest('a');
      if (a) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    root.addEventListener('click', onClick, true);
    return () => root.removeEventListener('click', onClick, true);
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const token = getToken();
      const r = await fetch(`/api/admin/pages/${slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ content: editor.content }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Save failed');
      editor.markSaved();
      queryClient.invalidateQueries({ queryKey: ['marketing-page', slug] });
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-page', slug] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } catch (err: any) {
      setSaveError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    if (editor.dirty && !window.confirm('Discard unsaved changes?')) return;
    const fresh = await fetchPage(slug, getToken());
    editor.replace((fresh.content || {}) as Record<string, unknown>);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100dvh-0px)] min-h-0" style={{ background: ADMIN.bg }}>
        <div
          className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b"
          style={{ borderColor: ADMIN.line, background: ADMIN.card }}
        >
          <button
            type="button"
            onClick={() => setLocation('/heyadmin/site')}
            className="text-[11px] uppercase tracking-widest font-semibold px-2 py-1"
            style={{ color: ADMIN.muted }}
          >
            ← Pages
          </button>
          <p className="font-serif text-[15px] font-semibold" style={{ color: ADMIN.ink }}>{meta.label}</p>
          <a href={meta.path} target="_blank" rel="noreferrer" className="text-[11px] inline-flex items-center gap-1" style={{ color: ADMIN.muted }}>
            {meta.path} <ExternalLink size={10} />
          </a>
          <div className="flex-1" />
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: ADMIN.line }}>
            {(['sq', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setPreviewLang(l)}
                className="px-2.5 py-1 text-[10px] font-semibold uppercase"
                style={{
                  background: previewLang === l ? ADMIN.blushSoft : 'transparent',
                  color: previewLang === l ? ADMIN.blushDeep : ADMIN.muted,
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: ADMIN.line }}>
            <button type="button" onClick={() => setDevice('desktop')} className="px-2 py-1" title="Desktop"
              style={{ background: device === 'desktop' ? ADMIN.blushSoft : 'transparent', color: ADMIN.ink }}>
              <Monitor size={14} />
            </button>
            <button type="button" onClick={() => setDevice('mobile')} className="px-2 py-1" title="Mobile"
              style={{ background: device === 'mobile' ? ADMIN.blushSoft : 'transparent', color: ADMIN.ink }}>
              <Smartphone size={14} />
            </button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={discard} disabled={saving}>
            <RotateCcw size={12} className="mr-1" /> Discard
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving || !editor.dirty}
            style={{ background: ADMIN.blush, color: '#fff' }}>
            {saving ? <Loader2 size={12} className="mr-1 animate-spin" /> : savedFlash ? <Check size={12} className="mr-1" /> : <Save size={12} className="mr-1" />}
            {savedFlash ? 'Saved' : 'Save'}
          </Button>
        </div>
        {saveError && (
          <div className="px-4 py-2 text-[12px] flex items-center gap-2" style={{ background: '#FDECEC', color: '#9B1C1C' }}>
            <AlertTriangle size={13} /> {saveError}
          </div>
        )}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-h-0 overflow-auto p-3 md:p-5" style={{ background: '#D8D0C8' }}>
            <div
              ref={frameRef}
              className="mx-auto bg-white shadow-xl overflow-auto"
              style={{
                width: device === 'mobile' ? 375 : '100%',
                maxWidth: '100%',
                height: '100%',
                minHeight: 640,
                borderRadius: device === 'mobile' ? 24 : 8,
              }}
            >
              <PreviewLanguageProvider lang={previewLang}>
                <React.Suspense fallback={<div className="p-10 text-sm text-neutral-400">Loading preview…</div>}>
                  <PreviewPage slug={slug} />
                </React.Suspense>
              </PreviewLanguageProvider>
            </div>
          </div>
          <aside className="min-h-0 overflow-y-auto border-t lg:border-t-0 lg:border-l p-3" style={{ borderColor: ADMIN.line, background: ADMIN.card }}>
            <Inspector />
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}

function Inspector() {
  const editor = usePageEditor();
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const path = editor.selected;
  const kind = editor.selectedKind;
  const value = path ? getAt(editor.content, path) : null;

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: ADMIN.muted }}>
        Inspector
      </p>
      {!path && (
        <p className="text-[13px] leading-relaxed" style={{ color: ADMIN.muted }}>
          Click a headline, paragraph, image, or section on the page. Albanian and English edit together. Nothing goes live until Save.
        </p>
      )}
      {path && (
        <p className="text-[11px] font-mono break-all" style={{ color: ADMIN.muted }}>{path}</p>
      )}

      {path && kind === 'section' && (
        <SectionFields path={path} />
      )}

      {path && (kind === 'text' || isBiText(value)) && (
        <BiTextFields path={path} />
      )}

      {path && (kind === 'image' || isImgRef(value)) && (
        <ImageFields
          path={path}
          uploading={uploading}
          onUpload={async (file) => {
            setUploading(true);
            try {
              const url = await uploadImageToApi(file, getToken());
              editor.patch(path, { src: url } satisfies ImgRef);
            } catch (err) {
              window.alert(uploadErrorMessage(err, 'en'));
            } finally {
              setUploading(false);
            }
          }}
        />
      )}

      {path && kind === 'slider' && Array.isArray(value) && (
        <SliderFields path={path} items={value} />
      )}
    </div>
  );
}

function SectionFields({ path }: { path: string }) {
  const editor = usePageEditor();
  const node = (getAt(editor.content, path) || {}) as { hidden?: boolean; space?: string };
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-[13px]" style={{ color: ADMIN.ink }}>
        <button
          type="button"
          onClick={() => editor.patch(`${path}.hidden`, !node.hidden)}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
          style={{ color: node.hidden ? ADMIN.blush : ADMIN.ink }}
        >
          {node.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          {node.hidden ? 'Hidden' : 'Visible'}
        </button>
      </label>
      <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.muted }}>Spacing</label>
      <div className="flex gap-1">
        {(['sm', 'md', 'lg'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => editor.patch(`${path}.space`, s)}
            className="px-2 py-1 rounded text-[11px] font-semibold uppercase border"
            style={{
              borderColor: node.space === s ? ADMIN.blush : ADMIN.line,
              background: node.space === s ? ADMIN.blushSoft : 'transparent',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function BiTextFields({ path }: { path: string }) {
  const editor = usePageEditor();
  const raw = getAt(editor.content, path);
  const value: BiText = isBiText(raw) ? raw : { sq: '', en: '' };
  const set = (patch: Partial<BiText>) => editor.patch(path, { ...value, ...patch });
  return (
    <div className="space-y-3">
      <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.muted }}>Albanian</label>
      <textarea
        value={value.sq}
        onChange={(e) => set({ sq: e.target.value })}
        rows={3}
        className="w-full text-[13px] rounded-lg border px-2.5 py-2"
        style={{ borderColor: ADMIN.line, color: ADMIN.ink, background: ADMIN.bg }}
      />
      <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.muted }}>English</label>
      <textarea
        value={value.en}
        onChange={(e) => set({ en: e.target.value })}
        rows={3}
        className="w-full text-[13px] rounded-lg border px-2.5 py-2"
        style={{ borderColor: ADMIN.line, color: ADMIN.ink, background: ADMIN.bg }}
      />
      <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: ADMIN.muted }}>Font</label>
      <FontPicker tone="admin" value={value.font} onChange={(font) => set({ font })} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: ADMIN.muted }}>Size</label>
          <select
            value={value.size || ''}
            onChange={(e) => set({ size: (e.target.value || undefined) as BiText['size'] })}
            className="w-full text-[12px] rounded-lg border px-2 py-1.5"
            style={{ borderColor: ADMIN.line }}
          >
            <option value="">Default</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">XL</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: ADMIN.muted }}>Align</label>
          <select
            value={value.align || ''}
            onChange={(e) => set({ align: (e.target.value || undefined) as BiText['align'] })}
            className="w-full text-[12px] rounded-lg border px-2 py-1.5"
            style={{ borderColor: ADMIN.line }}
          >
            <option value="">Default</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ImageFields({
  path, uploading, onUpload,
}: {
  path: string;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const editor = usePageEditor();
  const raw = getAt(editor.content, path);
  const src = isImgRef(raw) ? raw.src : '';
  return (
    <div className="space-y-3">
      {src && <img src={src} alt="" className="w-full rounded-lg object-cover max-h-40" />}
      <Input
        value={src}
        onChange={(e) => editor.patch(path, { src: e.target.value })}
        placeholder="https://… or /api/uploads/files/…"
      />
      <label className="inline-flex items-center gap-1.5 text-[12px] font-semibold cursor-pointer" style={{ color: ADMIN.blushDeep }}>
        <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload image'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

function SliderFields({ path, items }: { path: string; items: unknown[] }) {
  const editor = usePageEditor();
  const move = (i: number, dir: number) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    editor.patch(path, next);
  };
  const remove = (i: number) => {
    if (items.length <= 1) return;
    editor.patch(path, items.filter((_, idx) => idx !== i));
  };
  const add = () => {
    const last = items[items.length - 1];
    const clone = last && typeof last === 'object' ? JSON.parse(JSON.stringify(last)) : { sq: '', en: '' };
    editor.patch(path, [...items, clone]);
  };
  return (
    <div className="space-y-2">
      {items.map((_, i) => (
        <div key={i} className="flex items-center gap-1 rounded-lg border px-2 py-1.5" style={{ borderColor: ADMIN.line }}>
          <button type="button" className="text-[12px] flex-1 text-left" onClick={() => {
            const item = items[i];
            if (isBiText(item)) editor.select(`${path}.${i}`, 'text');
            else if (isImgRef(item)) editor.select(`${path}.${i}`, 'image');
            else editor.select(`${path}.${i}.label`, 'text');
          }}>
            Slide {i + 1}
          </button>
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp size={13} /></button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ChevronDown size={13} /></button>
          <button type="button" onClick={() => remove(i)} disabled={items.length <= 1}><Trash2 size={13} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: ADMIN.blushDeep }}>
        <Plus size={13} /> Add item
      </button>
    </div>
  );
}
