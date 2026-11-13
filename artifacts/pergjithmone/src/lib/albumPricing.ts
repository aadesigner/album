/** Client-side mirror of api-server albumPricing — keep formulas identical. */
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
  return base + Math.max(0, pages - min) * perExtra;
}

export function albumPriceBreakdown(
  innerPageCount: number,
  basePriceLek: number,
  minPages: number,
  pricePerExtraPageLek: number,
) {
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
