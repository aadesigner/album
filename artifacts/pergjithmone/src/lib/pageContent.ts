import type { EditorElement } from '@/lib/designs';

/**
 * A page is blank when it has no real content — background / empty photo
 * placeholders alone don't count. Used to gate the Porosit (Order) button.
 */
export function isPageContentBlank(els: EditorElement[] | undefined | null): boolean {
  if (!els || els.length === 0) return true;
  return !els.some((e) => {
    if (e.type === 'image' && e.src) return true;
    if (e.type === 'text' && String(e.text || '').trim()) return true;
    if (e.type === 'shape') return true;
    return false;
  });
}

/** Empty editable inner page numbers. Skips covers and non-modifiable linings. */
export function getEmptyInnerPageNumbers(
  pages: Array<{ id: number; pageType?: string; pageNumber?: number }> | undefined | null,
  pagesContent: Record<number, EditorElement[]>,
): number[] {
  if (!pages?.length) return [];
  return pages
    .filter((p) => p.pageType === 'inner')
    .filter((p) => isPageContentBlank(pagesContent[p.id]))
    .map((p) => p.pageNumber ?? 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
}
