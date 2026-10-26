import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { FieldKind, PageSlug } from '@/lib/marketingPages';
import { mergePageContent, setAt } from '@/lib/marketingPages';
import { PAGE_DEFAULTS } from '@/lib/marketingPages.defaults';

export type PageEditorCtx = {
  slug: PageSlug;
  content: Record<string, unknown>;
  selected: string | null;
  selectedKind: FieldKind;
  dirty: boolean;
  select: (path: string, kind?: FieldKind) => void;
  patch: (path: string, value: unknown) => void;
  replace: (content: Record<string, unknown>) => void;
  markSaved: () => void;
};

const PageEditorContext = createContext<PageEditorCtx | null>(null);

export function PageEditorProvider({
  slug,
  initial,
  children,
}: {
  slug: PageSlug;
  initial?: unknown;
  children: React.ReactNode;
}) {
  const [content, setContent] = useState<Record<string, unknown>>(
    () => mergePageContent(PAGE_DEFAULTS[slug], initial),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<FieldKind>('text');
  const [dirty, setDirty] = useState(false);

  const select = useCallback((path: string, kind: FieldKind = 'text') => {
    setSelected(path);
    setSelectedKind(kind);
  }, []);

  const patch = useCallback((path: string, value: unknown) => {
    setContent((prev) => setAt(prev, path, value) as Record<string, unknown>);
    setDirty(true);
  }, []);

  const replace = useCallback((next: Record<string, unknown>) => {
    setContent(mergePageContent(PAGE_DEFAULTS[slug], next));
    setDirty(false);
    setSelected(null);
  }, [slug]);

  const markSaved = useCallback(() => setDirty(false), []);

  const value = useMemo<PageEditorCtx>(() => ({
    slug, content, selected, selectedKind, dirty, select, patch, replace, markSaved,
  }), [slug, content, selected, selectedKind, dirty, select, patch, replace, markSaved]);

  return <PageEditorContext.Provider value={value}>{children}</PageEditorContext.Provider>;
}

export function usePageEditor(): PageEditorCtx {
  const ctx = useContext(PageEditorContext);
  if (!ctx) throw new Error('usePageEditor must be used within PageEditorProvider');
  return ctx;
}

export function usePageEditorOptional(): PageEditorCtx | null {
  return useContext(PageEditorContext);
}
