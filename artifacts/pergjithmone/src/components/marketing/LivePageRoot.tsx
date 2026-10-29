import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  Loader2,
  Monitor,
  PanelRight,
  Pencil,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Undo2,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { authFetch } from '@/lib/authFetch';
import { ADMIN } from '@/components/layout/AdminLayout';
import { PAGE_DEFAULTS } from '@/lib/marketingPages.defaults';
import {
  PAGE_META,
  fetchPublishedPage,
  preparePageContentForSave,
  type PageSlug,
} from '@/lib/marketingPages';
import { PageContentProvider } from './PageContent';
import { PageEditorProvider, usePageEditorOptional } from './PageEditorContext';
import { PageInspector } from './PageInspector';
import { MobilePreviewFrame } from './MobilePreviewFrame';

const LIVE_EDIT_KEY = 'pergjithmone_live_admin_edit';

export function setLiveAdminEdit(on: boolean) {
  try {
    if (on) sessionStorage.setItem(LIVE_EDIT_KEY, '1');
    else sessionStorage.removeItem(LIVE_EDIT_KEY);
  } catch { /* ignore */ }
}

export function isLiveAdminEdit(): boolean {
  try {
    return sessionStorage.getItem(LIVE_EDIT_KEY) === '1';
  } catch {
    return false;
  }
}

export function LivePageRoot({
  slug,
  children,
}: {
  slug: PageSlug;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [enabled, setEnabled] = useState(isLiveAdminEdit);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [preview, setPreview] = useState<'desktop' | 'mobile'>('desktop');

  const { data, isFetched } = useQuery({
    queryKey: ['marketing-page', slug],
    queryFn: () => fetchPublishedPage(slug),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 2,
  });

  const setMode = useCallback((on: boolean) => {
    setLiveAdminEdit(on);
    setEnabled(on);
    if (!on) setPreview('desktop');
  }, []);

  const ready = isFetched || data !== undefined;
  const editing = isAdmin && enabled && ready;

  const page = (
    <PageContentProvider slug={slug}>
      {editing && preview === 'mobile' ? (
        <MobilePreviewFrame inspectorOpen={inspectorOpen}>
          {children}
        </MobilePreviewFrame>
      ) : children}
      {isAdmin && (
        <AdminModeChrome
          slug={slug}
          enabled={enabled}
          preview={preview}
          onPreviewChange={setPreview}
          inspectorOpen={inspectorOpen}
          onInspectorOpenChange={setInspectorOpen}
          onEnabledChange={setMode}
        />
      )}
    </PageContentProvider>
  );

  if (editing) {
    return (
      <PageEditorProvider slug={slug} initial={data?.content} key={slug}>
        {page}
      </PageEditorProvider>
    );
  }
  return page;
}

function ChromeIcon({
  title,
  onClick,
  disabled,
  active,
  accent,
  children,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="relative inline-flex items-center justify-center rounded-full disabled:opacity-35"
      style={{
        width: 36,
        height: 36,
        background: accent ? '#C45A78' : active ? 'rgba(255,255,255,0.16)' : 'transparent',
        color: '#f7f5f2',
      }}
    >
      {children}
    </button>
  );
}

function AdminModeChrome({
  slug,
  enabled,
  preview,
  onPreviewChange,
  inspectorOpen,
  onInspectorOpenChange,
  onEnabledChange,
}: {
  slug: PageSlug;
  enabled: boolean;
  preview: 'desktop' | 'mobile';
  onPreviewChange: (next: 'desktop' | 'mobile') => void;
  inspectorOpen: boolean;
  onInspectorOpenChange: (open: boolean) => void;
  onEnabledChange: (on: boolean) => void;
}) {
  const editor = usePageEditorOptional();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const meta = PAGE_META.find((p) => p.slug === slug);

  useEffect(() => {
    document.documentElement.style.removeProperty('--admin-chrome-offset');
  }, []);

  useEffect(() => {
    if (!editor?.dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [editor?.dirty]);

  useEffect(() => {
    if (!enabled || !editor?.dirty) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-admin-chrome]')) return;
      const a = t.closest('a');
      if (!a) return;
      const ok = window.confirm(lang === 'sq'
        ? 'Ke ndryshime të paruajtura. Të dalësh pa i ruajtur?'
        : 'You have unsaved changes. Leave without saving?');
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled, editor?.dirty, lang]);

  const save = useCallback(async () => {
    if (!editor || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const content = preparePageContentForSave(PAGE_DEFAULTS[slug], editor.content);
      if (!content || Object.keys(content).length === 0) {
        throw new Error(lang === 'sq' ? 'Nuk ka përmbajtje për të ruajtur.' : 'Nothing to save.');
      }
      const r = await authFetch(`/api/admin/pages/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) {
          throw new Error(lang === 'sq' ? 'Sesioni skadoi — rifresko faqen.' : 'Session expired — refresh the page.');
        }
        throw new Error(body.error || 'Save failed');
      }
      const saved = (body.content || content) as Record<string, unknown>;
      editor.replace(saved);
      queryClient.setQueryData(['marketing-page', slug], {
        content: saved,
        updatedAt: body.updatedAt ?? new Date().toISOString(),
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } catch (err: any) {
      setSaveError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [editor, saving, slug, lang, queryClient]);

  useEffect(() => {
    if (!enabled || !editor) return;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!(e.metaKey || e.ctrlKey)) return;
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      } else if (key === 'y') {
        e.preventDefault();
        editor.redo();
      } else if (key === 's') {
        e.preventDefault();
        if (editor.dirty) void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, editor, save]);

  const discard = async () => {
    if (!editor) return;
    if (editor.dirty && !window.confirm(lang === 'sq' ? 'Anulo ndryshimet?' : 'Discard unsaved changes?')) return;
    try {
      const fresh = await fetchPublishedPage(slug);
      editor.replace((fresh.content || {}) as Record<string, unknown>);
      setSaveError(null);
    } catch (err: any) {
      setSaveError(err?.message || (lang === 'sq' ? 'Nuk u ngarkua faqja.' : 'Could not reload the page.'));
    }
  };

  const exit = () => {
    if (editor?.dirty && !window.confirm(lang === 'sq'
      ? 'Ke ndryshime të paruajtura. Të dalësh pa i ruajtur?'
      : 'You have unsaved changes. Leave without saving?')) return;
    onInspectorOpenChange(false);
    onPreviewChange('desktop');
    onEnabledChange(false);
  };

  const sq = lang === 'sq';

  const railStyle: React.CSSProperties = {
    position: 'fixed',
    right: 12,
    top: '46%',
    transform: 'translateY(-50%)',
    zIndex: 80,
    background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f7f5f2',
    boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
  };

  const bar = (
    <div data-admin-chrome className="contents">
      {enabled && inspectorOpen && editor && (
        <aside
          className="fixed z-[70] overflow-y-auto border shadow-xl"
          style={{
            top: 12,
            right: 60,
            bottom: 12,
            width: 'min(22rem, calc(100vw - 80px))',
            borderColor: ADMIN.line,
            background: ADMIN.card,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-serif text-[15px] font-semibold" style={{ color: ADMIN.ink }}>
              {meta?.label || 'Page'}
            </p>
            <button
              type="button"
              onClick={() => onInspectorOpenChange(false)}
              className="p-1 rounded-md"
              style={{ color: ADMIN.muted }}
              aria-label={sq ? 'Mbyll' : 'Close'}
            >
              <X size={16} />
            </button>
          </div>
          <PageInspector />
        </aside>
      )}

      {!enabled ? (
        <button
          type="button"
          onClick={() => onEnabledChange(true)}
          className="inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-3"
          style={{ ...railStyle, height: 40 }}
          title={sq ? 'Aktivizo editimin' : 'Enable admin mode'}
          aria-label={sq ? 'Aktivizo editimin' : 'Enable admin mode'}
        >
          <Pencil size={14} />
          <span className="text-[11px] font-semibold tracking-wide">{sq ? 'Edito' : 'Edit'}</span>
        </button>
      ) : (
        <div
          className="flex flex-col items-center gap-0.5 p-1 rounded-full"
          style={railStyle}
          role="toolbar"
          aria-label={sq ? 'Redaktimi i faqes' : 'Page editing'}
        >
          <ChromeIcon
            title={editor?.dirty ? (sq ? 'Po redakton — e paruajtur' : 'Editing — unsaved') : (sq ? 'Po redakton' : 'Editing')}
            active
          >
            <Pencil size={13} />
            {editor?.dirty && (
              <span
                className="absolute top-1 right-1 rounded-full"
                style={{ width: 6, height: 6, background: '#C45A78' }}
              />
            )}
          </ChromeIcon>
          <ChromeIcon
            title={sq ? 'Pamja desktop' : 'Desktop view'}
            onClick={() => onPreviewChange('desktop')}
            active={preview === 'desktop'}
          >
            <Monitor size={13} />
          </ChromeIcon>
          <ChromeIcon
            title={sq ? 'Pamja mobile' : 'Mobile view'}
            onClick={() => onPreviewChange('mobile')}
            active={preview === 'mobile'}
          >
            <Smartphone size={13} />
          </ChromeIcon>
          <ChromeIcon
            title={sq ? 'Kthe 1 hap' : 'Undo'}
            onClick={() => editor?.undo()}
            disabled={!editor?.canUndo}
          >
            <Undo2 size={13} />
          </ChromeIcon>
          <ChromeIcon
            title={sq ? 'Ribëj 1 hap' : 'Redo'}
            onClick={() => editor?.redo()}
            disabled={!editor?.canRedo}
          >
            <Redo2 size={13} />
          </ChromeIcon>
          <ChromeIcon
            title={sq ? 'Fushat' : 'Fields'}
            onClick={() => onInspectorOpenChange(!inspectorOpen)}
            active={inspectorOpen}
          >
            <PanelRight size={13} />
          </ChromeIcon>
          <ChromeIcon
            title={sq ? 'Anulo' : 'Discard'}
            onClick={discard}
            disabled={saving || !editor}
          >
            <RotateCcw size={12} />
          </ChromeIcon>
          <ChromeIcon
            title={savedFlash ? (sq ? 'U ruajt' : 'Saved') : (sq ? 'Ruaj' : 'Save')}
            onClick={save}
            disabled={saving || !editor || !editor.dirty}
            accent
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : savedFlash ? <Check size={12} /> : <Save size={12} />}
          </ChromeIcon>
          <ChromeIcon title={sq ? 'Dil' : 'Exit'} onClick={exit}>
            <X size={13} />
          </ChromeIcon>
        </div>
      )}

      {saveError && (
        <div
          className="fixed z-[81] flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] shadow-lg max-w-[16rem]"
          style={{ right: 60, top: '46%', transform: 'translateY(-50%)', background: '#FDECEC', color: '#9B1C1C' }}
        >
          <AlertTriangle size={13} /> {saveError}
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(bar, document.body);
}
