import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Loader2, PanelRight, Pencil, RotateCcw, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ADMIN } from '@/components/layout/AdminLayout';
import { PAGE_DEFAULTS } from '@/lib/marketingPages.defaults';
import {
  PAGE_META,
  preparePageContentForSave,
  type PageSlug,
} from '@/lib/marketingPages';
import { PageContentProvider } from './PageContent';
import { PageEditorProvider, usePageEditorOptional } from './PageEditorContext';
import { PageInspector } from './PageInspector';

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

async function fetchPublishedPage(slug: PageSlug): Promise<{ content: unknown }> {
  const r = await fetch(`/api/pages/${slug}`, { credentials: 'include' });
  if (!r.ok) return { content: {} };
  const body = await r.json().catch(() => ({}));
  return { content: body.content ?? {} };
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

  const { data, isFetched } = useQuery({
    queryKey: ['marketing-page', slug],
    queryFn: () => fetchPublishedPage(slug),
    staleTime: 5 * 60_000,
  });

  const setMode = useCallback((on: boolean) => {
    setLiveAdminEdit(on);
    setEnabled(on);
  }, []);

  const ready = isFetched || data !== undefined;
  const editing = isAdmin && enabled && ready;

  const page = (
    <PageContentProvider slug={slug}>
      {children}
      {isAdmin && (
        <AdminModeChrome
          slug={slug}
          enabled={enabled}
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

function AdminModeChrome({
  slug,
  enabled,
  onEnabledChange,
}: {
  slug: PageSlug;
  enabled: boolean;
  onEnabledChange: (on: boolean) => void;
}) {
  const editor = usePageEditorOptional();
  const { lang } = useLanguage();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const meta = PAGE_META.find((p) => p.slug === slug);

  useEffect(() => {
    document.body.style.paddingBottom = enabled ? '72px' : '64px';
    return () => {
      document.body.style.paddingBottom = '';
    };
  }, [enabled]);

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

  const save = async () => {
    if (!editor) return;
    setSaving(true);
    setSaveError(null);
    try {
      const content = preparePageContentForSave(PAGE_DEFAULTS[slug], editor.content);
      const token = getToken();
      if (!token) throw new Error(lang === 'sq' ? 'Sesioni skadoi — rifresko faqen.' : 'Session expired — refresh the page.');
      const r = await fetch(`/api/admin/pages/${slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Save failed');
      editor.replace((body.content || content) as Record<string, unknown>);
      queryClient.setQueryData(['marketing-page', slug], { content: body.content || content });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } catch (err: any) {
      setSaveError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    if (!editor) return;
    if (editor.dirty && !window.confirm(lang === 'sq' ? 'Anulo ndryshimet?' : 'Discard unsaved changes?')) return;
    const fresh = await fetchPublishedPage(slug);
    editor.replace((fresh.content || {}) as Record<string, unknown>);
    setSaveError(null);
  };

  const exit = () => {
    if (editor?.dirty && !window.confirm(lang === 'sq'
      ? 'Ke ndryshime të paruajtura. Të dalësh pa i ruajtur?'
      : 'You have unsaved changes. Leave without saving?')) return;
    setInspectorOpen(false);
    onEnabledChange(false);
  };

  const sq = lang === 'sq';

  const bar = (
    <div data-admin-chrome className="contents">
      {enabled && inspectorOpen && editor && (
        <aside
          className="fixed z-[70] overflow-y-auto border shadow-xl"
          style={{
            top: 12,
            right: 12,
            bottom: 84,
            width: 'min(22rem, calc(100vw - 24px))',
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
              onClick={() => setInspectorOpen(false)}
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

      <div
        className="fixed inset-x-0 bottom-0 z-[80] flex justify-center pointer-events-none"
        style={{ padding: '0 12px 12px' }}
      >
        <div
          className="pointer-events-auto w-full max-w-3xl rounded-2xl border shadow-lg px-3 py-2.5 flex flex-wrap items-center gap-2"
          style={{
            background: '#1a1a1a',
            borderColor: 'rgba(255,255,255,0.08)',
            color: '#f7f5f2',
          }}
        >
          {!enabled ? (
            <>
              <span
                className="inline-flex items-center justify-center rounded-full shrink-0"
                style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.1)' }}
              >
                <Pencil size={13} />
              </span>
              <p className="text-[13px] font-medium flex-1 min-w-[12rem]">
                {sq ? 'Je i kyçur si admin. Aktivizo editimin e kësaj faqeje.' : 'Signed in as admin. Enable editing on this page.'}
              </p>
              <button
                type="button"
                onClick={() => onEnabledChange(true)}
                className="text-[12px] font-semibold rounded-full px-3.5 py-1.5"
                style={{ background: '#C45A78', color: '#fff' }}
              >
                {sq ? 'Aktivizo editimin' : 'Enable admin mode'}
              </button>
            </>
          ) : (
            <>
              <span
                className="inline-flex items-center justify-center rounded-full shrink-0"
                style={{ width: 28, height: 28, background: 'rgba(196,90,120,0.25)' }}
              >
                <Pencil size={13} />
              </span>
              <p className="text-[13px] font-medium min-w-0">
                {sq ? 'Po redakton' : 'Editing'}{' '}
                <span style={{ color: '#E8C4CE' }}>{meta?.label}</span>
                {editor?.dirty && (
                  <span className="ml-2 text-[11px] uppercase tracking-wide" style={{ color: '#E8C4CE' }}>
                    {sq ? 'e paruajtur' : 'unsaved'}
                  </span>
                )}
              </p>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setInspectorOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-[12px] font-semibold rounded-full px-2.5 py-1.5"
                style={{ background: inspectorOpen ? 'rgba(255,255,255,0.14)' : 'transparent', color: '#f7f5f2' }}
              >
                <PanelRight size={13} />
                {sq ? 'Fushat' : 'Fields'}
              </button>
              <button
                type="button"
                onClick={discard}
                disabled={saving || !editor}
                className="inline-flex items-center gap-1 text-[12px] font-semibold rounded-full px-2.5 py-1.5 disabled:opacity-40"
                style={{ color: '#d4d0cb' }}
              >
                <RotateCcw size={12} />
                {sq ? 'Anulo' : 'Discard'}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !editor || !editor.dirty}
                className="inline-flex items-center gap-1 text-[12px] font-semibold rounded-full px-3 py-1.5 disabled:opacity-40"
                style={{ background: '#C45A78', color: '#fff' }}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : savedFlash ? <Check size={12} /> : <Save size={12} />}
                {savedFlash ? (sq ? 'U ruajt' : 'Saved') : (sq ? 'Ruaj' : 'Save')}
              </button>
              <button
                type="button"
                onClick={exit}
                className="inline-flex items-center gap-1 text-[12px] font-semibold rounded-full px-2.5 py-1.5"
                style={{ color: '#d4d0cb' }}
              >
                <X size={13} />
                {sq ? 'Dil' : 'Exit'}
              </button>
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div
          className="fixed left-1/2 z-[81] -translate-x-1/2 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] shadow-lg"
          style={{ bottom: 88, background: '#FDECEC', color: '#9B1C1C' }}
        >
          <AlertTriangle size={13} /> {saveError}
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(bar, document.body);
}
