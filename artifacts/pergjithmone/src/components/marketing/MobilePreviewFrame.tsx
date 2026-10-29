import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Router, useLocation } from 'wouter';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthScope, useAuth } from '@/contexts/AuthContext';
import { LanguageScope, useLanguage } from '@/contexts/LanguageContext';
import { PageContentProvider } from './PageContent';
import { PageEditorScope, usePageEditor } from './PageEditorContext';

const PHONE_WIDTH = 390;

function preparePreviewDocument(doc: Document) {
  doc.head.replaceChildren();
  const vp = doc.createElement('meta');
  vp.setAttribute('name', 'viewport');
  vp.setAttribute('content', `width=${PHONE_WIDTH}, initial-scale=1, maximum-scale=1`);
  doc.head.appendChild(vp);
  document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"], style').forEach((node) => {
    doc.head.appendChild(node.cloneNode(true));
  });
  doc.documentElement.lang = document.documentElement.lang;
  doc.documentElement.className = document.documentElement.className;
  doc.body.style.margin = '0';
  doc.body.style.background = 'hsl(40 33% 97%)';
}

export function MobilePreviewFrame({
  inspectorOpen,
  children,
}: {
  inspectorOpen: boolean;
  children: React.ReactNode;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rootRef = useRef<Root | null>(null);
  const queryClient = useQueryClient();
  const auth = useAuth();
  const language = useLanguage();
  const editor = usePageEditor();
  const [location, navigate] = useLocation();
  const base = (import.meta.env.BASE_URL || '').replace(/\/$/, '');

  const tree = useMemo(() => (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageScope value={language}>
            <AuthScope value={auth}>
              <Router base={base} hook={() => [location, navigate]}>
                <PageEditorScope value={editor}>
                  <PageContentProvider slug={editor.slug}>
                    {children}
                  </PageContentProvider>
                </PageEditorScope>
              </Router>
            </AuthScope>
          </LanguageScope>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  ), [queryClient, language, auth, base, location, navigate, editor, children]);

  const mountPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    if (!rootRef.current) {
      preparePreviewDocument(doc);
      const mount = doc.createElement('div');
      mount.id = 'mobile-preview-root';
      doc.body.replaceChildren(mount);
      rootRef.current = createRoot(mount);
    }
    rootRef.current.render(tree);
  }, [tree]);

  useEffect(() => {
    mountPreview();
  }, [mountPreview]);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
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
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!editor.dirty) return;
      const t = e.target as HTMLElement | null;
      const a = t?.closest?.('a');
      if (!a) return;
      const ok = window.confirm(language.lang === 'sq'
        ? 'Ke ndryshime të paruajtura. Të dalësh pa i ruajtur?'
        : 'You have unsaved changes. Leave without saving?');
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    doc.addEventListener('keydown', onKey);
    doc.addEventListener('click', onClick, true);
    return () => {
      doc.removeEventListener('keydown', onKey);
      doc.removeEventListener('click', onClick, true);
    };
  }, [editor, language.lang, mountPreview]);

  useEffect(() => () => {
    rootRef.current?.unmount();
    rootRef.current = null;
  }, []);

  return (
    <div
      className="flex justify-center"
      style={{
        minHeight: '100dvh',
        background: '#1a1917',
        paddingTop: 20,
        paddingBottom: 100,
        paddingLeft: 16,
        paddingRight: inspectorOpen ? 'calc(min(22rem, calc(100vw - 24px)) + 28px)' : 16,
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Mobile · {PHONE_WIDTH}px
        </p>
        <div
          style={{
            width: PHONE_WIDTH,
            height: 'min(844px, calc(100dvh - 140px))',
            borderRadius: 28,
            overflow: 'hidden',
            background: '#fff',
            boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
            border: '10px solid #111',
          }}
        >
          <iframe
            ref={iframeRef}
            title="Mobile page preview"
            className="block w-full h-full border-0"
            onLoad={mountPreview}
          />
        </div>
      </div>
    </div>
  );
}
