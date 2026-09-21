/**
 * Built-in photo-grid layouts seeded into the admin `layouts` table.
 * Keep in sync with artifacts/pergjithmone/src/lib/designs.ts LAYOUTS.
 */
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
  { slug: 'portrait-center', nameAl: 'Portret qendror', nameEn: 'Portrait center', previewIcon: '▮', category: '1 Photo',
    cells: [{ x: 0.12, y: 0.08, w: 0.76, h: 0.84, type: 'photo' }] },

  { slug: 'photo-cap', nameAl: 'Foto + Titull', nameEn: 'Photo + Caption', previewIcon: '▤', category: 'Photo + Text',
    cells: [{ x: 0, y: 0, w: 1, h: 0.74, type: 'photo' }, { x: 0.06, y: 0.77, w: 0.88, h: 0.18, type: 'text' }] },
  { slug: 'cap-top', nameAl: 'Titull + Foto', nameEn: 'Title + Photo', previewIcon: '▥', category: 'Photo + Text',
    cells: [{ x: 0.06, y: 0.05, w: 0.88, h: 0.18, type: 'text' }, { x: 0, y: 0.26, w: 1, h: 0.74, type: 'photo' }] },
  { slug: 'photo-text-r', nameAl: 'Foto + Tekst →', nameEn: 'Photo + Text →', previewIcon: '◧', category: 'Photo + Text',
    cells: [{ x: 0, y: 0, w: 0.60, h: 1, type: 'photo' }, { x: 0.62, y: 0.06, w: 0.35, h: 0.88, type: 'text' }] },

  { slug: 'quote', nameAl: 'Faqe citimi', nameEn: 'Quote page', previewIcon: '❝', category: 'Text',
    cells: [{ x: 0.08, y: 0.10, w: 0.84, h: 0.80, type: 'text' }] },

  { slug: 'two-h', nameAl: '2 Kolona', nameEn: '2 Columns', previewIcon: '◫', category: '2 Photos',
    cells: [{ x: 0, y: 0, w: 0.487, h: 1, type: 'photo' }, { x: 0.513, y: 0, w: 0.487, h: 1, type: 'photo' }] },
  { slug: 'two-v', nameAl: '2 Shtresa', nameEn: '2 Stacked', previewIcon: '☰', category: '2 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.487, type: 'photo' }, { x: 0, y: 0.513, w: 1, h: 0.487, type: 'photo' }] },
  { slug: 'two-h-6040', nameAl: 'Gjerë + Ngushtë', nameEn: 'Wide + Narrow', previewIcon: '◨', category: '2 Photos',
    cells: [{ x: 0, y: 0, w: 0.60, h: 1, type: 'photo' }, { x: 0.62, y: 0, w: 0.38, h: 1, type: 'photo' }] },
  { slug: 'two-h-4060', nameAl: 'Ngushtë + Gjerë', nameEn: 'Narrow + Wide', previewIcon: '◧', category: '2 Photos',
    cells: [{ x: 0, y: 0, w: 0.38, h: 1, type: 'photo' }, { x: 0.40, y: 0, w: 0.60, h: 1, type: 'photo' }] },
  { slug: 'two-v-7030', nameAl: 'Madhe + Holle', nameEn: 'Tall + Thin', previewIcon: '☰', category: '2 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.68, type: 'photo' }, { x: 0, y: 0.70, w: 1, h: 0.30, type: 'photo' }] },
  { slug: 'two-v-3070', nameAl: 'Holle + Madhe', nameEn: 'Thin + Tall', previewIcon: '☰', category: '2 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.30, type: 'photo' }, { x: 0, y: 0.32, w: 1, h: 0.68, type: 'photo' }] },

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
  { slug: 'triptych', nameAl: 'Triptik', nameEn: 'Triptych', previewIcon: '|||', category: '3 Photos',
    cells: [{ x: 0, y: 0, w: 0.316, h: 1, type: 'photo' }, { x: 0.342, y: 0, w: 0.316, h: 1, type: 'photo' }, { x: 0.684, y: 0, w: 0.316, h: 1, type: 'photo' }] },
  { slug: 'strips-3-uneven', nameAl: '3 Shtresa ≠', nameEn: '3 Uneven strips', previewIcon: '☰', category: '3 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.38, type: 'photo' }, { x: 0, y: 0.40, w: 1, h: 0.20, type: 'photo' }, { x: 0, y: 0.62, w: 1, h: 0.38, type: 'photo' }] },
  { slug: 'strips-3-focus', nameAl: '3 Fokus mes', nameEn: '3 Mid focus', previewIcon: '☰', category: '3 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.22, type: 'photo' }, { x: 0, y: 0.24, w: 1, h: 0.52, type: 'photo' }, { x: 0, y: 0.78, w: 1, h: 0.22, type: 'photo' }] },
  { slug: 'three-mid', nameAl: '3 Qendrore', nameEn: '3 Centered', previewIcon: '|||', category: '3 Photos',
    cells: [{ x: 0, y: 0.13, w: 0.316, h: 0.74, type: 'photo' }, { x: 0.342, y: 0.13, w: 0.316, h: 0.74, type: 'photo' }, { x: 0.684, y: 0.13, w: 0.316, h: 0.74, type: 'photo' }] },

  { slug: 'strips-4', nameAl: '4 Shtresa', nameEn: '4 Strips', previewIcon: '☰', category: '4 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.235, type: 'photo' }, { x: 0, y: 0.255, w: 1, h: 0.235, type: 'photo' }, { x: 0, y: 0.510, w: 1, h: 0.235, type: 'photo' }, { x: 0, y: 0.765, w: 1, h: 0.235, type: 'photo' }] },
  { slug: 'grid4-topheavy', nameAl: '2 Madhe + 2', nameEn: '2 Large + 2', previewIcon: '⊞', category: '4 Photos',
    cells: [{ x: 0, y: 0, w: 0.487, h: 0.55, type: 'photo' }, { x: 0.513, y: 0, w: 0.487, h: 0.55, type: 'photo' }, { x: 0, y: 0.57, w: 0.487, h: 0.43, type: 'photo' }, { x: 0.513, y: 0.57, w: 0.487, h: 0.43, type: 'photo' }] },
  { slug: 'grid4', nameAl: 'Rrjetë 4', nameEn: '4 Grid', previewIcon: '⊞', category: '4 Photos',
    cells: [{ x: 0, y: 0, w: 0.487, h: 0.487, type: 'photo' }, { x: 0.513, y: 0, w: 0.487, h: 0.487, type: 'photo' }, { x: 0, y: 0.513, w: 0.487, h: 0.487, type: 'photo' }, { x: 0.513, y: 0.513, w: 0.487, h: 0.487, type: 'photo' }] },
  { slug: 'top-3below', nameAl: 'Sipër + 3', nameEn: 'Top + 3 below', previewIcon: '⊟', category: '4 Photos',
    cells: [{ x: 0, y: 0, w: 1, h: 0.55, type: 'photo' }, { x: 0, y: 0.57, w: 0.316, h: 0.43, type: 'photo' }, { x: 0.342, y: 0.57, w: 0.316, h: 0.43, type: 'photo' }, { x: 0.684, y: 0.57, w: 0.316, h: 0.43, type: 'photo' }] },
  { slug: 'hero-3r', nameAl: 'Kryesore + 3', nameEn: 'Hero + 3 right', previewIcon: '◨', category: '4 Photos',
    cells: [{ x: 0, y: 0, w: 0.63, h: 1, type: 'photo' }, { x: 0.65, y: 0, w: 0.35, h: 0.316, type: 'photo' }, { x: 0.65, y: 0.342, w: 0.35, h: 0.316, type: 'photo' }, { x: 0.65, y: 0.684, w: 0.35, h: 0.316, type: 'photo' }] },
  { slug: 'hero-3l', nameAl: '3 + Kryesore', nameEn: '3 left + Hero', previewIcon: '◧', category: '4 Photos',
    cells: [{ x: 0, y: 0, w: 0.35, h: 0.316, type: 'photo' }, { x: 0, y: 0.342, w: 0.35, h: 0.316, type: 'photo' }, { x: 0, y: 0.684, w: 0.35, h: 0.316, type: 'photo' }, { x: 0.37, y: 0, w: 0.63, h: 1, type: 'photo' }] },

  { slug: 'filmstrip-5', nameAl: 'Shirit 5', nameEn: 'Filmstrip 5', previewIcon: '|||||', category: '5-6 Photos',
    cells: [{ x: 0, y: 0, w: 0.188, h: 1, type: 'photo' }, { x: 0.203, y: 0, w: 0.188, h: 1, type: 'photo' }, { x: 0.406, y: 0, w: 0.188, h: 1, type: 'photo' }, { x: 0.609, y: 0, w: 0.188, h: 1, type: 'photo' }, { x: 0.812, y: 0, w: 0.188, h: 1, type: 'photo' }] },
  { slug: 'gallery-5', nameAl: 'Galeri 5', nameEn: 'Gallery 5', previewIcon: '▦', category: '5-6 Photos',
    cells: [{ x: 0, y: 0, w: 0.487, h: 0.45, type: 'photo' }, { x: 0.513, y: 0, w: 0.487, h: 0.45, type: 'photo' }, { x: 0, y: 0.47, w: 0.316, h: 0.53, type: 'photo' }, { x: 0.342, y: 0.47, w: 0.316, h: 0.53, type: 'photo' }, { x: 0.684, y: 0.47, w: 0.316, h: 0.53, type: 'photo' }] },
  { slug: 'grid-6', nameAl: 'Rrjetë 6', nameEn: '6 Grid', previewIcon: '▦', category: '5-6 Photos',
    cells: [{ x: 0, y: 0, w: 0.487, h: 0.316, type: 'photo' }, { x: 0.513, y: 0, w: 0.487, h: 0.316, type: 'photo' }, { x: 0, y: 0.342, w: 0.487, h: 0.316, type: 'photo' }, { x: 0.513, y: 0.342, w: 0.487, h: 0.316, type: 'photo' }, { x: 0, y: 0.684, w: 0.487, h: 0.316, type: 'photo' }, { x: 0.513, y: 0.684, w: 0.487, h: 0.316, type: 'photo' }] },

  { slug: 'mag', nameAl: 'Revistë', nameEn: 'Magazine', previewIcon: '◫', category: 'Magazine',
    cells: [{ x: 0, y: 0, w: 0.55, h: 0.62, type: 'photo' }, { x: 0.57, y: 0, w: 0.43, h: 1, type: 'photo' }, { x: 0, y: 0.64, w: 0.55, h: 0.36, type: 'text' }] },
  { slug: 'text-2photos', nameAl: 'Tekst + 2 Foto', nameEn: 'Text + 2 Photos', previewIcon: '▤', category: 'Magazine',
    cells: [{ x: 0.06, y: 0.05, w: 0.88, h: 0.22, type: 'text' }, { x: 0, y: 0.30, w: 0.487, h: 0.70, type: 'photo' }, { x: 0.513, y: 0.30, w: 0.487, h: 0.70, type: 'photo' }] },

  { slug: 'casual-toss-3', nameAl: 'Të hedhura 3', nameEn: 'Tossed 3', previewIcon: '✧', category: 'Casual',
    cells: [
      { x: 0.06, y: 0.05, w: 0.52, h: 0.42, type: 'photo', rotation: -6 },
      { x: 0.40, y: 0.46, w: 0.54, h: 0.42, type: 'photo', rotation: 4 },
      { x: 0.04, y: 0.55, w: 0.40, h: 0.34, type: 'photo', rotation: -3 },
    ] },
  { slug: 'casual-pile-4', nameAl: 'Grumbull 4', nameEn: 'Photo pile 4', previewIcon: '✧', category: 'Casual',
    cells: [
      { x: 0.10, y: 0.06, w: 0.46, h: 0.40, type: 'photo', rotation: 5 },
      { x: 0.42, y: 0.10, w: 0.48, h: 0.40, type: 'photo', rotation: -4 },
      { x: 0.06, y: 0.50, w: 0.46, h: 0.40, type: 'photo', rotation: -6 },
      { x: 0.44, y: 0.54, w: 0.46, h: 0.38, type: 'photo', rotation: 3 },
    ] },
  { slug: 'casual-strip-3', nameAl: 'Shirit i lirë 3', nameEn: 'Loose strip 3', previewIcon: '✧', category: 'Casual',
    cells: [
      { x: 0.02, y: 0.10, w: 0.32, h: 0.66, type: 'photo', rotation: -5 },
      { x: 0.35, y: 0.02, w: 0.32, h: 0.66, type: 'photo', rotation: 3 },
      { x: 0.67, y: 0.14, w: 0.31, h: 0.66, type: 'photo', rotation: -2 },
    ] },
  { slug: 'casual-note-2', nameAl: 'Shënim + 2', nameEn: 'Note + 2 tossed', previewIcon: '✧', category: 'Casual',
    cells: [
      { x: 0.08, y: 0.06, w: 0.46, h: 0.38, type: 'photo', rotation: -5 },
      { x: 0.44, y: 0.14, w: 0.44, h: 0.34, type: 'photo', rotation: 6 },
      { x: 0.14, y: 0.56, w: 0.72, h: 0.30, type: 'text', rotation: -1 },
    ] },
];
