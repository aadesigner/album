import { matchDbCategory, resolveDesignCategoryFromQuery } from './designMeta';

export type WizardEntry = {
  step: 1 | 2 | 3;
  categoryId: number | null;
  designId: string | null;
};

type DbCategory = {
  id?: number | null;
  slug?: string | null;
  nameAl?: string | null;
  nameEn?: string | null;
};

/**
 * Homepage starter / deep links:
 *   /krijo?category=dasme&design=cream-names  → size step (cover already chosen)
 *   /krijo?category=dasme                     → style step
 *   /krijo                                    → category step
 */
export function wizardEntryFromSearch(args: {
  categorySlug?: string | null;
  designId?: string | null;
  categories: DbCategory[];
  designs: Array<{ id: string; category: string }>;
}): WizardEntry {
  const slug = String(args.categorySlug || '').trim();
  const designId = String(args.designId || '').trim();
  const designOk = !!(designId && args.designs.some((d) => d.id === designId));
  const designCat = resolveDesignCategoryFromQuery(slug, designOk ? designId : null, args.designs);
  const match = matchDbCategory(args.categories, slug, designCat);
  const categoryId = match?.id != null ? Number(match.id) : null;

  if (designOk) {
    return { step: 3, categoryId, designId };
  }
  if (slug && (categoryId != null || designCat)) {
    return { step: 2, categoryId, designId: null };
  }
  return { step: 1, categoryId: null, designId: null };
}
