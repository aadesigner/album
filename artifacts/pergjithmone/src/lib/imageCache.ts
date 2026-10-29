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

export function loadCachedImage(src: string): Promise<HTMLImageElement> {
  const url = resolvePublicImageSrc(src) || src;
  const hit = peekCachedImage(url);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(url);
  if (pending) return pending;

  const next = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    // Same-origin /api uploads do not need CORS. Forcing anonymous here made
    // Konva drop photos in the editor and Creative Studio when CORP/CORS
    // headers were missing on the file response.
    const absolute = /^https?:\/\//i.test(url);
    const sameOrigin = !absolute || (typeof window !== 'undefined' && url.startsWith(window.location.origin));
    if (!sameOrigin) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      inflight.delete(url);
      touch(url, img);
      resolve(img);
    };
    img.onerror = () => {
      inflight.delete(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
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
