import { useEffect, useState } from 'react';

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
  const hit = peekCachedImage(src);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(src);
  if (pending) return pending;

  const next = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    // Same-origin /api uploads do not need CORS. Forcing anonymous here made
    // Konva drop photos in the editor and Creative Studio when CORP/CORS
    // headers were missing on the file response.
    const absolute = /^https?:\/\//i.test(src);
    const sameOrigin = !absolute || (typeof window !== 'undefined' && src.startsWith(window.location.origin));
    if (!sameOrigin) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      inflight.delete(src);
      touch(src, img);
      resolve(img);
    };
    img.onerror = () => {
      inflight.delete(src);
      reject(new Error('image load failed'));
    };
    img.src = src;
  });
  inflight.set(src, next);
  return next;
}

/** Shared decoded bitmap for Konva — same photo is not decoded again per slot. */
export function useCachedImage(src?: string | null): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement | undefined>(() =>
    src ? peekCachedImage(src) : undefined,
  );

  useEffect(() => {
    if (!src) {
      setImg(undefined);
      return;
    }
    const cached = peekCachedImage(src);
    if (cached) {
      setImg(cached);
      return;
    }
    let cancelled = false;
    loadCachedImage(src)
      .then((el) => { if (!cancelled) setImg(el); })
      .catch(() => { if (!cancelled) setImg(undefined); });
    return () => { cancelled = true; };
  }, [src]);

  return img;
}

export function resetImageCacheForTests() {
  inflight.clear();
  ready.clear();
}
