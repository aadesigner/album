import { useEffect, useState } from 'react';
import { resolvePublicImageSrc } from './categoryImages';
import { isLandmarkPng, knockOutBlackToAlpha } from './designs';

/** Konva accepts either decoded <img> or a canvas (landmarks stay as canvas). */
export type CachedBitmap = HTMLImageElement | HTMLCanvasElement;

export function bitmapWidth(img: CachedBitmap): number {
  return ('naturalWidth' in img && img.naturalWidth) ? img.naturalWidth : img.width;
}

export function bitmapHeight(img: CachedBitmap): number {
  return ('naturalHeight' in img && img.naturalHeight) ? img.naturalHeight : img.height;
}

const MAX_ENTRIES = 48;
const inflight = new Map<string, Promise<CachedBitmap>>();
const ready = new Map<string, CachedBitmap>();

function touch(src: string, img: CachedBitmap) {
  ready.delete(src);
  ready.set(src, img);
  while (ready.size > MAX_ENTRIES) {
    const oldest = ready.keys().next().value;
    if (oldest === undefined) break;
    ready.delete(oldest);
    inflight.delete(oldest);
  }
}

export function peekCachedImage(src: string): CachedBitmap | undefined {
  const img = ready.get(src);
  if (!img) return undefined;
  touch(src, img);
  return img;
}

export function imageLoadNeedsCors(url: string): boolean {
  const absolute = /^https?:\/\//i.test(url);
  return absolute && typeof window !== 'undefined' && !url.startsWith(window.location.origin);
}

export function designApiFallback(url: string): string | null {
  const path = url.split('?')[0];
  const m = path.match(/\/designs\/([^/]+)$/i);
  if (!m) return null;
  if (path.includes('/api/designs/')) return null;
  return `/api/designs/${m[1]}`;
}

function decodeHtmlImage(url: string, withCors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Same-origin /designs and /api uploads do not need CORS. Forcing
    // anonymous made Konva paint a grey frame when the static server
    // omitted Access-Control-Allow-Origin.
    if (withCors) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

export function loadCachedImage(src: string): Promise<CachedBitmap> {
  const url = resolvePublicImageSrc(src) || src;
  const hit = peekCachedImage(url);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(url);
  if (pending) return pending;

  const next = decodeHtmlImage(url, imageLoadNeedsCors(url))
    .catch((err) => {
      if (imageLoadNeedsCors(url)) return decodeHtmlImage(url, false);
      throw err;
    })
    .catch((err) => {
      const fallback = designApiFallback(url);
      if (!fallback) throw err;
      return decodeHtmlImage(fallback, imageLoadNeedsCors(fallback));
    })
    .then((img) => {
      inflight.delete(url);
      // Keep the canvas — skip toDataURL (huge CPU/RAM cost on every landmark).
      let out: CachedBitmap = img;
      if (isLandmarkPng(src) || isLandmarkPng(url)) {
        const cut = knockOutBlackToAlpha(img);
        if (cut) out = cut;
      }
      touch(url, out);
      return out;
    })
    .catch((err) => {
      inflight.delete(url);
      throw err;
    });
  inflight.set(url, next);
  return next;
}

/** Shared decoded bitmap for Konva — same photo is not decoded again per slot. */
export function useCachedImage(src?: string | null): CachedBitmap | undefined {
  const url = src ? (resolvePublicImageSrc(src) || src) : '';
  const [img, setImg] = useState<CachedBitmap | undefined>(() =>
    url ? peekCachedImage(url) : undefined,
  );

  useEffect(() => {
    if (!url) {
      setImg(undefined);
      return;
    }
    const cached = peekCachedImage(url);
    if (cached) {
      setImg(cached);
      return;
    }
    let cancelled = false;
    loadCachedImage(url)
      .then((el) => { if (!cancelled) setImg(el); })
      .catch(() => { if (!cancelled) setImg(undefined); });
    return () => { cancelled = true; };
  }, [url]);

  return img;
}

export function resetImageCacheForTests() {
  inflight.clear();
  ready.clear();
}
