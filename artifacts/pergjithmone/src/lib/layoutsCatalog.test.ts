import { describe, it, expect } from 'vitest';
import { LAYOUTS, RETIRED_LAYOUT_IDS, LAYOUT_CATEGORY_LABELS } from './designs';

const KEEP_IDS = [
  'full', 'bordered-single', 'portrait-center', 'single-inset',
  'two-h', 'two-v', 'two-h-6040', 'two-h-4060',
  'triptych', 'strips-3', 'land-2port', 'port-2land', 'hero-l', 'hero-r', 'tall-l-2r',
  'grid4', 'strips-4', 'hero-3r', 'hero-3l', 'top-3below',
] as const;

describe('editor layout catalog', () => {
  it('keeps only the client-approved 1–4 photo templates', () => {
    expect(LAYOUTS.map(l => l.id).sort()).toEqual([...KEEP_IDS].sort());
  });

  it('does not list a kept layout as retired', () => {
    for (const l of LAYOUTS) {
      expect(RETIRED_LAYOUT_IDS.has(l.id)).toBe(false);
      expect(LAYOUT_CATEGORY_LABELS[l.category]).toBeTruthy();
    }
  });

  it('every zone stays on the page', () => {
    for (const l of LAYOUTS) {
      expect(l.zones.length).toBeGreaterThan(0);
      for (const z of l.zones) {
        expect(z.type).toBe('photo');
        expect(z.x).toBeGreaterThanOrEqual(0);
        expect(z.y).toBeGreaterThanOrEqual(0);
        expect(z.x + z.w).toBeLessThanOrEqual(1.001);
        expect(z.y + z.h).toBeLessThanOrEqual(1.001);
      }
    }
  });

  it('hides the screenshot X / out-of-scope templates', () => {
    const mustHide = [
      'two-h-pad', 'two-v-pad', 'two-h-inset',
      'three-mid', 'scatter-3',
      'cols-4', 'grid4-topheavy', 'grid4-pad',
      'photo-cap', 'quote', 'gallery-5', 'mag', 'casual-pile-4',
    ];
    for (const id of mustHide) {
      expect(LAYOUTS.some(l => l.id === id)).toBe(false);
      expect(RETIRED_LAYOUT_IDS.has(id)).toBe(true);
    }
  });
});
