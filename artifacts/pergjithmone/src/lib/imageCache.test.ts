import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCachedImage, peekCachedImage, resetImageCacheForTests } from './imageCache';

function fakeImage() {
  const store: { src: string; onload: (() => void) | null; onerror: (() => void) | null } = {
    src: '',
    onload: null,
    onerror: null,
  };
  class FakeImage {
    crossOrigin = '';
    decoding = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    get src() { return store.src; }
    set src(v: string) {
      store.src = v;
      store.onload = () => this.onload?.();
      queueMicrotask(() => this.onload?.());
    }
  }
  return { FakeImage, store };
}

describe('imageCache', () => {
  beforeEach(() => {
    resetImageCacheForTests();
  });

  it('reuses one decoded image for the same url', async () => {
    const { FakeImage } = fakeImage();
    vi.stubGlobal('Image', FakeImage);
    const a = loadCachedImage('https://cdn.example/p.jpg');
    const b = loadCachedImage('https://cdn.example/p.jpg');
    expect(a).toBe(b);
    const img = await a;
    expect(peekCachedImage('https://cdn.example/p.jpg')).toBe(img);
    const again = await loadCachedImage('https://cdn.example/p.jpg');
    expect(again).toBe(img);
    vi.unstubAllGlobals();
  });
});
