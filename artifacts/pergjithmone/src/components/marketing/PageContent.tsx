import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  type PageSlug, type FieldKind,
  mergePageContent, txt, imgSrc, listAt, hiddenAt, textStyle, textSizeClass, spaceClass,
} from '@/lib/marketingPages';
import { PAGE_DEFAULTS } from '@/lib/marketingPages.defaults';
import { usePageEditorOptional } from './PageEditorContext';

type PageFields = {
  slug: PageSlug;
  content: Record<string, unknown>;
  lang: 'sq' | 'en';
  txt: (path: string) => string;
  txtAll: (path: string) => { sq: string; en: string };
  img: (path: string, fallback?: string) => string;
  list: <T = unknown>(path: string) => T[];
  hidden: (path: string) => boolean;
  style: (path: string) => { fontFamily?: string; textAlign?: 'left' | 'center' | 'right' };
  sizeClass: (path: string) => string;
  space: (path: string, fallback?: string) => string;
};

const PageFieldsContext = createContext<PageFields | null>(null);

export function PageContentProvider({ slug, children }: { slug: PageSlug; children: React.ReactNode }) {
  const editor = usePageEditorOptional();
  const { lang } = useLanguage();
  const { data } = useQuery({
    queryKey: ['marketing-page', slug],
    queryFn: async () => {
      const r = await fetch(`/api/pages/${slug}`, { credentials: 'include' });
      if (!r.ok) return { content: {} };
      const body = await r.json().catch(() => ({}));
      return { content: body.content ?? {} };
    },
    enabled: !editor || editor.slug !== slug,
    staleTime: 5 * 60_000,
  });

  const content = useMemo(() => {
    if (editor && editor.slug === slug) return editor.content;
    return mergePageContent(PAGE_DEFAULTS[slug], data?.content);
  }, [editor, slug, data]);

  const value = useMemo<PageFields>(() => ({
    slug,
    content,
    lang,
    txt: (path) => txt(content, path, lang),
    txtAll: (path) => ({ sq: txt(content, path, 'sq'), en: txt(content, path, 'en') }),
    img: (path, fallback) => imgSrc(content, path, fallback),
    list: (path) => listAt(content, path),
    hidden: (path) => hiddenAt(content, path),
    style: (path) => textStyle(content, path),
    sizeClass: (path) => textSizeClass(content, path),
    space: (path, fallback) => spaceClass(content, path, fallback),
  }), [slug, content, lang]);

  return <PageFieldsContext.Provider value={value}>{children}</PageFieldsContext.Provider>;
}

export function usePageFields(): PageFields {
  const ctx = useContext(PageFieldsContext);
  if (!ctx) throw new Error('usePageFields must be used within PageContentProvider');
  return ctx;
}

export function usePageFieldsOptional(): PageFields | null {
  return useContext(PageFieldsContext);
}

export type { FieldKind };
