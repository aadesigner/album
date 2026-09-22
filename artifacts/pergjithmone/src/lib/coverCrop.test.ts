import { describe, it, expect } from 'vitest';
import { coverCropRect, PHOTO_CORNER_ZOOM } from './designs';
import { applyCoverBackground } from './coverBackground';
import type { EditorElement } from './designs';

describe('coverCropRect', () => {
  it('centers crop when focus is 0.5', () => {
    const c = coverCropRect(2000, 1000, 600, 800, 0.5, 0.5, 1);
    expect(c.maxX).toBeGreaterThan(0);
    expect(c.x).toBeCloseTo(c.maxX * 0.5);
    expect(c.y).toBeCloseTo(c.maxY * 0.5);
  });

  it('zoom unlocks pan on exact-aspect pages', () => {
    // 3:4 photo into 600×800 page — exact aspect, no pan at zoom 1
    const base = coverCropRect(1200, 1600, 600, 800, 0.5, 0.5, 1);
    expect(base.maxX).toBe(0);
    expect(base.maxY).toBe(0);
    const zoomed = coverCropRect(1200, 1600, 600, 800, 0.5, 0.5, PHOTO_CORNER_ZOOM);
    expect(zoomed.maxX).toBeGreaterThan(1);
    expect(zoomed.maxY).toBeGreaterThan(1);
  });

  it('focus 0/1 reaches crop edges', () => {
    const lo = coverCropRect(2000, 1000, 600, 800, 0, 0, PHOTO_CORNER_ZOOM);
    const hi = coverCropRect(2000, 1000, 600, 800, 1, 1, PHOTO_CORNER_ZOOM);
    expect(lo.x).toBe(0);
    expect(lo.y).toBe(0);
    expect(hi.x).toBeCloseTo(hi.maxX);
    expect(hi.y).toBeCloseTo(hi.maxY);
  });
});

describe('applyCoverBackground crop persistence', () => {
  const H = 800;
  const withCrop: EditorElement[] = [
    {
      id: 'bg-1', type: 'background',
      x: 0, y: 0, w: 600, h: H, rotation: 0,
      bgColor: '#111',
      src: 'https://cdn/cover.jpg',
      cropFocusX: 0.2,
      cropFocusY: 0.8,
      cropZoom: 1.5,
    },
  ];

  it('preserves focus/zoom when re-applying the same photo URL', () => {
    const next = applyCoverBackground(withCrop, H, { mode: 'photo', src: 'https://cdn/cover.jpg' });
    const bg = next.find(e => e.type === 'background')!;
    expect(bg.cropFocusX).toBe(0.2);
    expect(bg.cropFocusY).toBe(0.8);
    expect(bg.cropZoom).toBe(1.5);
  });

  it('resets focus/zoom when replacing with a different photo', () => {
    const next = applyCoverBackground(withCrop, H, { mode: 'photo', src: 'https://cdn/other.jpg' });
    const bg = next.find(e => e.type === 'background')!;
    expect(bg.src).toBe('https://cdn/other.jpg');
    expect(bg.cropFocusX).toBe(0.5);
    expect(bg.cropFocusY).toBe(0.5);
    expect(bg.cropZoom).toBe(1);
  });

  it('drops crop fields when switching to solid color', () => {
    const next = applyCoverBackground(withCrop, H, { mode: 'color', bgColor: '#fff' });
    const bg = next.find(e => e.type === 'background')!;
    expect(bg.src).toBeUndefined();
    expect(bg.cropFocusX).toBeUndefined();
    expect(bg.cropZoom).toBeUndefined();
  });
});
