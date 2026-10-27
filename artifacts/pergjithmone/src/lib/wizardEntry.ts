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
 *   /krijo?category=dasme&design=cream-names  → style step (cover preselected)
 *   /krijo?category=dasme                     → style step
 *   /krijo                                    → category step
 *
 * Never skip the design/style step from a deep link. A homepage cover only
 * highlights that style; the shopper still confirms it before picking a size.
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

  if (designOk || (slug && (categoryId != null || designCat))) {
    return { step: 2, categoryId, designId: designOk ? designId : null };
  }
  return { step: 1, categoryId: null, designId: null };
}
