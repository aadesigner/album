/**
 * Built-in photo-grid layouts seeded into the admin `layouts` table.
 * Keep in sync with artifacts/pergjithmone/src/lib/designs.ts LAYOUTS.
 */

/** Screenshot red-X / out-of-scope slugs — deactivated on seed if still in the DB. */
export const RETIRED_LAYOUT_SLUGS = [
  'panoramic', 'photo-cap', 'cap-top', 'photo-text-r', 'quote',
  'two-h-pad', 'two-v-pad', 'two-h-inset', 'two-portraits', 'two-landscape',
  'two-v-7030', 'two-v-3070',
  'three-mid', 'scatter-3', 'asymm-3', 'strips-3-uneven', 'strips-3-focus',
  'land-2port-pad', 'strips-3-pad',
  'cols-4', 'grid4-topheavy', 'grid4-pad', 'strips-4-pad', 'masonry-4',
  'gallery-5', 'filmstrip-5', 'grid-6', 'mag', 'text-2photos',
  'casual-toss-3', 'casual-pile-4', 'casual-strip-3', 'casual-note-2',
] as const;
export const BUILTIN_LAYOUTS: Array<{
  slug: string;
  nameAl: string;
  nameEn: string;
  previewIcon: string;
  category: string;
  cells: Array<{ x: number; y: number; w: number; h: number; type: string; rotation?: number }>;
}> = [
  { slug: 'full', nameAl: 'Foto e plotë', nameEn: 'Full bleed', previewIcon: '▢', category: '1 Photo',
    cells: [{ x: 0, y: 0, w: 1, h: 1, type: 'photo' }] },
  { slug: 'bordered-single', nameAl: 'Me kufi', nameEn: 'Bordered', previewIcon: '⬚', category: '1 Photo',
    cells: [{ x: 0.06, y: 0.05, w: 0.88, h: 0.90, type: 'photo' }] },
  { slug: 'portrait-center', nameAl: 'Portret', nameEn: 'Portrait', previewIcon: '▯', category: '1 Photo',
    cells: [{ x: 0.12, y: 0.08, w: 0.76, h: 0.84, type: 'photo' }] },
  { slug: 'single-inset', nameAl: 'Kornizë', nameEn: 'Framed', previewIcon: '▭', category: '1 Photo',
    cells: [{ x: 0.16, y: 0.12, w: 0.68, h: 0.76, type: 'photo' }] },

  { slug: 'two-h', nameAl: '2 Kolona', nameEn: '2 Columns', previewIcon: '◫', category: '2 Photos',
    cells: [{ x: 0, y: 0, w: 0.487, h: 1, type: 'photo' }, { x: 0.513, y: 0, w: 0.487, h: 1, type: 'photo' }] },
  { slug: 'two-v', nameAl: '2 Shtresa', nameEn: '2 Stacked', previewIcon: '☰', category: '2 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.487, type: 'photo' }, { x: 0, y: 0.513, w: 1, h: 0.487, type: 'photo' }] },
  { slug: 'two-h-6040', nameAl: 'Gjerë + Ngushtë', nameEn: 'Wide + Narrow', previewIcon: '◨', category: '2 Photos',
    cells: [{ x: 0, y: 0, w: 0.60, h: 1, type: 'photo' }, { x: 0.62, y: 0, w: 0.38, h: 1, type: 'photo' }] },
  { slug: 'two-h-4060', nameAl: 'Ngushtë + Gjerë', nameEn: 'Narrow + Wide', previewIcon: '◧', category: '2 Photos',
    cells: [{ x: 0, y: 0, w: 0.38, h: 1, type: 'photo' }, { x: 0.40, y: 0, w: 0.60, h: 1, type: 'photo' }] },

  { slug: 'triptych', nameAl: '3 Kolona', nameEn: '3 Columns', previewIcon: '|||', category: '3 Photos',
    cells: [{ x: 0, y: 0, w: 0.316, h: 1, type: 'photo' }, { x: 0.342, y: 0, w: 0.316, h: 1, type: 'photo' }, { x: 0.684, y: 0, w: 0.316, h: 1, type: 'photo' }] },
  { slug: 'strips-3', nameAl: '3 Shtresa', nameEn: '3 Strips', previewIcon: '☰', category: '3 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.316, type: 'photo' }, { x: 0, y: 0.342, w: 1, h: 0.316, type: 'photo' }, { x: 0, y: 0.684, w: 1, h: 0.316, type: 'photo' }] },
  { slug: 'land-2port', nameAl: 'Sipër + 2', nameEn: 'Top + 2 below', previewIcon: '⊟', category: '3 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.487, type: 'photo' }, { x: 0, y: 0.513, w: 0.487, h: 0.487, type: 'photo' }, { x: 0.513, y: 0.513, w: 0.487, h: 0.487, type: 'photo' }] },
  { slug: 'port-2land', nameAl: '2 + Poshtë', nameEn: '2 top + Bottom', previewIcon: '⊞', category: '3 Photos',
    cells: [{ x: 0, y: 0, w: 0.487, h: 0.487, type: 'photo' }, { x: 0.513, y: 0, w: 0.487, h: 0.487, type: 'photo' }, { x: 0, y: 0.513, w: 1, h: 0.487, type: 'photo' }] },
  { slug: 'hero-l', nameAl: '2 + Kryesore', nameEn: '2 left + Hero', previewIcon: '◧', category: '3 Photos',
    cells: [{ x: 0, y: 0, w: 0.35, h: 0.487, type: 'photo' }, { x: 0, y: 0.513, w: 0.35, h: 0.487, type: 'photo' }, { x: 0.37, y: 0, w: 0.63, h: 1, type: 'photo' }] },
  { slug: 'hero-r', nameAl: 'Kryesore + 2', nameEn: 'Hero + 2 right', previewIcon: '◨', category: '3 Photos',
    cells: [{ x: 0, y: 0, w: 0.63, h: 1, type: 'photo' }, { x: 0.65, y: 0, w: 0.35, h: 0.487, type: 'photo' }, { x: 0.65, y: 0.513, w: 0.35, h: 0.487, type: 'photo' }] },
  { slug: 'tall-l-2r', nameAl: 'E gjatë + 2', nameEn: 'Tall + 2 right', previewIcon: '◫', category: '3 Photos',
    cells: [{ x: 0, y: 0, w: 0.55, h: 1, type: 'photo' }, { x: 0.57, y: 0, w: 0.43, h: 0.487, type: 'photo' }, { x: 0.57, y: 0.513, w: 0.43, h: 0.487, type: 'photo' }] },

  { slug: 'grid4', nameAl: 'Rrjetë 4', nameEn: '4 Grid', previewIcon: '⊞', category: '4 Photos',
    cells: [{ x: 0, y: 0, w: 0.487, h: 0.487, type: 'photo' }, { x: 0.513, y: 0, w: 0.487, h: 0.487, type: 'photo' }, { x: 0, y: 0.513, w: 0.487, h: 0.487, type: 'photo' }, { x: 0.513, y: 0.513, w: 0.487, h: 0.487, type: 'photo' }] },
  { slug: 'strips-4', nameAl: '4 Shtresa', nameEn: '4 Strips', previewIcon: '☰', category: '4 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.235, type: 'photo' }, { x: 0, y: 0.255, w: 1, h: 0.235, type: 'photo' }, { x: 0, y: 0.510, w: 1, h: 0.235, type: 'photo' }, { x: 0, y: 0.765, w: 1, h: 0.235, type: 'photo' }] },
  { slug: 'hero-3r', nameAl: 'Kryesore + 3', nameEn: 'Hero + 3 right', previewIcon: '◨', category: '4 Photos',
    cells: [{ x: 0, y: 0, w: 0.63, h: 1, type: 'photo' }, { x: 0.65, y: 0, w: 0.35, h: 0.316, type: 'photo' }, { x: 0.65, y: 0.342, w: 0.35, h: 0.316, type: 'photo' }, { x: 0.65, y: 0.684, w: 0.35, h: 0.316, type: 'photo' }] },
  { slug: 'hero-3l', nameAl: '3 + Kryesore', nameEn: '3 left + Hero', previewIcon: '◧', category: '4 Photos',
    cells: [{ x: 0, y: 0, w: 0.35, h: 0.316, type: 'photo' }, { x: 0, y: 0.342, w: 0.35, h: 0.316, type: 'photo' }, { x: 0, y: 0.684, w: 0.35, h: 0.316, type: 'photo' }, { x: 0.37, y: 0, w: 0.63, h: 1, type: 'photo' }] },
  { slug: 'top-3below', nameAl: 'Sipër + 3', nameEn: 'Top + 3 below', previewIcon: '⊟', category: '4 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.55, type: 'photo' }, { x: 0, y: 0.57, w: 0.316, h: 0.43, type: 'photo' }, { x: 0.342, y: 0.57, w: 0.316, h: 0.43, type: 'photo' }, { x: 0.684, y: 0.57, w: 0.316, h: 0.43, type: 'photo' }] },
];
