import type { Response } from "express";

/** Public catalog GETs — short browser cache so repeat visits skip a round trip. */
export function setPublicCatalogCache(res: Response): void {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
}
