/**
 * Album price = size base + (extra inner pages × price per extra page).
 * Covers / linings are never billed — `innerPageCount` is editable inners only.
 */
export function calcAlbumPriceLek(
  innerPageCount: number,
  basePriceLek: number,
  minPages: number,
  pricePerExtraPageLek: number,
): number {
  const pages = Math.max(0, Math.floor(Number(innerPageCount) || 0));
  const min = Math.max(0, Math.floor(Number(minPages) || 0));
  const base = Math.max(0, Math.floor(Number(basePriceLek) || 0));
  const perExtra = Math.max(0, Math.floor(Number(pricePerExtraPageLek) || 0));
  const extraPages = Math.max(0, pages - min);
  return base + extraPages * perExtra;
}

export function albumPriceBreakdown(
  innerPageCount: number,
  basePriceLek: number,
  minPages: number,
  pricePerExtraPageLek: number,
): {
  innerPages: number;
  minPages: number;
  extraPages: number;
  basePriceLek: number;
  pricePerExtraPageLek: number;
  extraTotalLek: number;
  totalPriceLek: number;
} {
  const pages = Math.max(0, Math.floor(Number(innerPageCount) || 0));
  const min = Math.max(0, Math.floor(Number(minPages) || 0));
  const base = Math.max(0, Math.floor(Number(basePriceLek) || 0));
  const perExtra = Math.max(0, Math.floor(Number(pricePerExtraPageLek) || 0));
  const extraPages = Math.max(0, pages - min);
  const extraTotalLek = extraPages * perExtra;
  return {
    innerPages: pages,
    minPages: min,
    extraPages,
    basePriceLek: base,
    pricePerExtraPageLek: perExtra,
    extraTotalLek,
    totalPriceLek: base + extraTotalLek,
  };
}
