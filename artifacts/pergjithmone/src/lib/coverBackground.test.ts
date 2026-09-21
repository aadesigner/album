import { describe, it, expect } from 'vitest';
import { applyCoverBackground, coverBgMode, coverBgPersistsClean } from './coverBackground';
import type { EditorElement } from './designs';

const H = 800;
const base: EditorElement[] = [
  {
    id: 'bg-1', type: 'background',
    x: 0, y: 0, w: 600, h: H, rotation: 0,
    bgColor: '#ECE7E1',
  },
  {
    id: 'tx-1', type: 'text',
    x: 40, y: 300, w: 520, h: 80, rotation: 0,
    text: 'Names', fontSize: 42, fontFamily: "'Great Vibes', cursive",
  },
];

describe('applyCoverBackground', () => {
  it('sets solid color and clears photo/gradient', () => {
    const withPhoto = applyCoverBackground(base, H, { mode: 'photo', src: 'https://cdn/x.jpg' });
    const solid = applyCoverBackground(withPhoto, H, { mode: 'color', bgColor: '#112233' });
    const bg = solid.find(e => e.type === 'background')!;
    expect(bg.bgColor).toBe('#112233');
    expect(bg.src).toBeUndefined();
    expect(bg.bgGradientFrom).toBeUndefined();
    expect(coverBgMode(bg)).toBe('color');
    expect(coverBgPersistsClean(solid)).toBe(true);
    expect(JSON.stringify(solid)).not.toContain('cdn/x.jpg');
  });

  it('sets gradient and clears photo', () => {
    const withPhoto = applyCoverBackground(base, H, { mode: 'photo', src: 'https://cdn/x.jpg' });
    const grad = applyCoverBackground(withPhoto, H, {
      mode: 'gradient', bgGradientFrom: '#111', bgGradientTo: '#222', bgGradientDir: 'diag',
    });
    const bg = grad.find(e => e.type === 'background')!;
    expect(bg.bgGradientFrom).toBe('#111');
    expect(bg.bgGradientTo).toBe('#222');
    expect(bg.bgGradientDir).toBe('diag');
    expect(bg.src).toBeUndefined();
    expect(coverBgMode(bg)).toBe('gradient');
    expect(coverBgPersistsClean(grad)).toBe(true);
  });

  it('sets photo and clears gradients; remove photo falls back via color mode', () => {
    const grad = applyCoverBackground(base, H, {
      mode: 'gradient', bgGradientFrom: '#aaa', bgGradientTo: '#bbb', bgGradientDir: 'tb',
    });
    const photo = applyCoverBackground(grad, H, { mode: 'photo', src: 'https://cdn/cover.jpg' });
    const bg = photo.find(e => e.type === 'background')!;
    expect(bg.src).toBe('https://cdn/cover.jpg');
    expect(bg.bgGradientFrom).toBeUndefined();
    expect(coverBgMode(bg)).toBe('photo');
    expect(coverBgPersistsClean(photo)).toBe(true);

    const removed = applyCoverBackground(photo, H, { mode: 'color', bgColor: bg.bgColor || '#FFFFFF' });
    expect(removed.find(e => e.type === 'background')!.src).toBeUndefined();
    expect(JSON.parse(JSON.stringify(removed)).find((e: EditorElement) => e.type === 'background').src).toBeUndefined();
  });

  it('preserves non-background elements', () => {
    const next = applyCoverBackground(base, H, { mode: 'color', bgColor: '#000' });
    expect(next.find(e => e.id === 'tx-1')?.text).toBe('Names');
    expect(next).toHaveLength(2);
  });

  it('creates a background when missing', () => {
    const onlyText = base.filter(e => e.type !== 'background');
    const next = applyCoverBackground(onlyText, H, { mode: 'color', bgColor: '#fff' });
    expect(next[0].type).toBe('background');
    expect(next[0].bgColor).toBe('#fff');
  });
});
