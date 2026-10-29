import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { FieldKind, PageSlug } from '@/lib/marketingPages';
import { mergePageContent, setAt } from '@/lib/marketingPages';
import { PAGE_DEFAULTS } from '@/lib/marketingPages.defaults';
import {
  emptyEditorHistory,
  recordEditorEdit,
  redoEditorHistory,
  undoEditorHistory,
  type EditorHistory,
} from '@/lib/pageEditorHistory';

export type PageEditorCtx = {
  slug: PageSlug;
  content: Record<string, unknown>;
  selected: string | null;
  selectedKind: FieldKind;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  select: (path: string, kind?: FieldKind) => void;
  patch: (path: string, value: unknown) => void;
  replace: (content: Record<string, unknown>) => void;
  markSaved: () => void;
  undo: () => void;
  redo: () => void;
};

const PageEditorContext = createContext<PageEditorCtx | null>(null);

export function PageEditorScope({
  value,
  children,
}: {
  value: PageEditorCtx;
  children: React.ReactNode;
}) {
  return <PageEditorContext.Provider value={value}>{children}</PageEditorContext.Provider>;
}

export function PageEditorProvider({
  slug,
  initial,
  onSelect,
  children,
}: {
  slug: PageSlug;
  initial?: unknown;
  onSelect?: (path: string, kind: FieldKind) => void;
  children: React.ReactNode;
}) {
  const [content, setContent] = useState<Record<string, unknown>>(
    () => mergePageContent(PAGE_DEFAULTS[slug], initial),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<FieldKind>('text');
  const [dirty, setDirty] = useState(false);
  const [history, setHistory] = useState<EditorHistory>(emptyEditorHistory);
  const contentRef = useRef(content);
  contentRef.current = content;
  const historyRef = useRef(history);
  historyRef.current = history;

  const select = useCallback((path: string, kind: FieldKind = 'text') => {
    setSelected(path);
    setSelectedKind(kind);
    onSelect?.(path, kind);
  }, [onSelect]);

  const patch = useCallback((path: string, value: unknown) => {
    const present = contentRef.current;
    const nextHistory = recordEditorEdit(historyRef.current, present, path);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    const nextContent = setAt(present, path, value) as Record<string, unknown>;
    contentRef.current = nextContent;
    setContent(nextContent);
    setDirty(true);
  }, []);

  const replace = useCallback((next: Record<string, unknown>) => {
    const merged = mergePageContent(PAGE_DEFAULTS[slug], next);
    const reset = emptyEditorHistory();
    contentRef.current = merged;
    historyRef.current = reset;
    setContent(merged);
    setDirty(false);
    setSelected(null);
    setHistory(reset);
  }, [slug]);

  const markSaved = useCallback(() => setDirty(false), []);

  const undo = useCallback(() => {
    const stepped = undoEditorHistory(historyRef.current, contentRef.current);
    if (!stepped) return;
    contentRef.current = stepped.present;
    historyRef.current = stepped.history;
    setContent(stepped.present);
    setHistory(stepped.history);
    setDirty(true);
  }, []);

  const redo = useCallback(() => {
    const stepped = redoEditorHistory(historyRef.current, contentRef.current);
    if (!stepped) return;
    contentRef.current = stepped.present;
    historyRef.current = stepped.history;
    setContent(stepped.present);
    setHistory(stepped.history);
    setDirty(true);
  }, []);

  const value = useMemo<PageEditorCtx>(() => ({
    slug,
    content,
    selected,
    selectedKind,
    dirty,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undoCount: history.past.length,
    redoCount: history.future.length,
    select,
    patch,
    replace,
    markSaved,
    undo,
    redo,
  }), [slug, content, selected, selectedKind, dirty, history, select, patch, replace, markSaved, undo, redo]);

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
