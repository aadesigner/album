import { useEffect, useState } from 'react';
import { resolvePublicImageSrc } from './categoryImages';

const MAX_ENTRIES = 64;
const inflight = new Map<string, Promise<HTMLImageElement>>();
const ready = new Map<string, HTMLImageElement>();

function touch(src: string, img: HTMLImageElement) {
  ready.delete(src);
  ready.set(src, img);
  while (ready.size > MAX_ENTRIES) {
    const oldest = ready.keys().next().value;
    if (oldest === undefined) break;
    ready.delete(oldest);
    inflight.delete(oldest);
  }
}

export function peekCachedImage(src: string): HTMLImageElement | undefined {
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

export function loadCachedImage(src: string): Promise<HTMLImageElement> {
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
      touch(url, img);
      return img;
    })
    .catch((err) => {
      inflight.delete(url);
      throw err;
    });
  inflight.set(url, next);
  return next;
}

/** Shared decoded bitmap for Konva — same photo is not decoded again per slot. */
export function useCachedImage(src?: string | null): HTMLImageElement | undefined {
  const url = src ? (resolvePublicImageSrc(src) || src) : '';
  const [img, setImg] = useState<HTMLImageElement | undefined>(() =>
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
