import type { CSSProperties } from 'react';

// Lightweight design metadata — shared between the Wizard picker and the Editor.
// Canvas elements live in @/lib/designs DESIGNS, looked up by id at apply-time.

export interface DesignMeta {
  id: string;
  name: { sq: string; en: string };
  category: string;
  thumb: CSSProperties;
  thumbAccents: CSSProperties[];
  /** Real photo URL to show as the card background (overrides thumb CSS) */
  thumbPhoto?: string;
  /** Short bold text overlaid on the photo thumbnail (e.g. "PARIS") */
  thumbLabel?: string;
}

export const DESIGN_CATEGORY_LABELS: Record<string, { sq: string; en: string }> = {
  'Wedding':       { sq: 'Dasma',          en: 'Wedding'       },
  'Travel':        { sq: 'Udhëtime',       en: 'Travel'        },
  'Baby & Family': { sq: 'Bebe & Familja', en: 'Baby & Family' },
  'Celebration':   { sq: 'Festime',        en: 'Celebration'   },
  'Modern':        { sq: 'Moderne',        en: 'Modern'        },
  'Portrait':      { sq: 'Portret',        en: 'Portrait'      },
  'Nature':        { sq: 'Natyrë',         en: 'Nature'        },
  'Locations':     { sq: 'Vendndodhje',    en: 'Locations'     },
};

/** Lowercase + strip diacritics so "Ditëlindje" / "Ditelindje" / slug all match. */
export function normalizeCatKey(raw: string | null | undefined): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Maps normalized DB category name / slug / English → DESIGNS category key
const DB_CAT_TO_DESIGN_CAT_RAW: Record<string, string> = {
  'Dasmë': 'Wedding', 'Dasëm': 'Wedding', 'Wedding': 'Wedding', 'Dasma': 'Wedding', 'dasme': 'Wedding',
  'Udhëtime': 'Travel', 'Udhëtim': 'Travel', 'Travel': 'Travel', 'udhetime': 'Travel',
  'Familje': 'Baby & Family', 'Fëmijë': 'Baby & Family', 'Bebe': 'Baby & Family',
  'Fëmijëri': 'Baby & Family', 'Family': 'Baby & Family', 'Baby': 'Baby & Family', 'familje': 'Baby & Family',
  // Birthday / parties / friendship → Celebration (NOT travel)
  'Ditëlindje': 'Celebration', 'ditelindje': 'Celebration',
  'Festash': 'Celebration', 'Festë': 'Celebration', 'Festim': 'Celebration', 'festash': 'Celebration',
  'Birthday': 'Celebration', 'Celebrations': 'Celebration', 'Celebration': 'Celebration',
  'Miqësi': 'Celebration', 'miqesi': 'Celebration', 'Friendship': 'Celebration',
  'Natyrë': 'Travel', 'Peizazh': 'Travel', 'Nature': 'Travel',
  'Çifte': 'Wedding', 'Dashurinë': 'Wedding', 'Portrait': 'Wedding', 'Couples': 'Wedding',
  'Sport': 'Travel', 'Arkitekturë': 'Travel', 'Graduim': 'Celebration',
  'Modern': 'Travel',
  'Vendndodhje': 'Travel', 'Locations': 'Travel',
};

export const DB_CAT_TO_DESIGN_CAT: Record<string, string> = Object.fromEntries(
  Object.entries(DB_CAT_TO_DESIGN_CAT_RAW).flatMap(([k, v]) => [
    [k, v],
    [normalizeCatKey(k), v],
  ]),
);

/** Resolve design category from a DB category row (nameAl / nameEn / slug). */
export function resolveDesignCategory(cat: {
  nameAl?: string | null;
  nameEn?: string | null;
  slug?: string | null;
} | null | undefined): string {
  if (!cat) return '';
  const candidates = [cat.nameAl, cat.nameEn, cat.slug];
  for (const c of candidates) {
    if (!c) continue;
    const hit = DB_CAT_TO_DESIGN_CAT[c] || DB_CAT_TO_DESIGN_CAT[normalizeCatKey(c)];
    if (hit) return hit;
  }
  return '';
}

const cityAccent: CSSProperties[] = [
  { position: 'absolute', bottom: 0, left: 0, right: 0, height: '32%', background: 'linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 100%)' },
];

export const DESIGN_METAS: DesignMeta[] = [

  // ── WEDDING ──────────────────────────────────────────────────────────────
  { id: 'cream-names', name: { sq: 'Emrat Tanë', en: 'Our Names' }, category: 'Wedding',
    thumb: { background: '#ECE7E1' },
    thumbPhoto: '/designs/wedding-cream-thumb.jpg',
    thumbLabel: 'EMRAT',
    thumbAccents: [] },
  { id: 'the-wedding-of', name: { sq: 'Dasma', en: 'The Wedding' }, category: 'Wedding',
    thumb: { background: '#1A2A1A' },
    thumbPhoto: '/designs/wedding-spin-thumb.jpg',
    thumbLabel: 'WEDDING',
    thumbAccents: cityAccent },

  // ── TRAVEL — landmark + real cities ──────────────────────────────────────
  { id: 'paris-pink', name: { sq: 'Paris', en: 'Paris' }, category: 'Travel',
    thumb: { background: '#FEC5D7' },
    thumbPhoto: '/designs/paris-cover-thumb.jpg',
    thumbLabel: 'PARIS',
    thumbAccents: [
      { position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%', background: 'linear-gradient(to top,rgba(254,197,215,0.55) 0%,transparent 100%)' },
    ] },
  { id: 'barcelona-red', name: { sq: 'Barcelona', en: 'Barcelona' }, category: 'Travel',
    thumb: { background: '#A83442' },
    thumbPhoto: '/designs/barcelona-cover-thumb.jpg',
    thumbLabel: 'BARCELONA',
    thumbAccents: [
      { position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%', background: 'linear-gradient(to top,rgba(168,52,66,0.55) 0%,transparent 100%)' },
    ] },

  { id: 'rome', name: { sq: 'Romë', en: 'Rome' }, category: 'Travel',
    thumb: { background: '#5C4030' }, thumbPhoto: '/designs/rome-cover-thumb.jpg', thumbLabel: 'ROME', thumbAccents: cityAccent },
  { id: 'london', name: { sq: 'Londër', en: 'London' }, category: 'Travel',
    thumb: { background: '#1A2A3A' }, thumbPhoto: '/designs/london-cover-thumb.jpg', thumbLabel: 'LONDON', thumbAccents: cityAccent },
  { id: 'venice', name: { sq: 'Venecia', en: 'Venice' }, category: 'Travel',
    thumb: { background: '#1A3A4A' }, thumbPhoto: '/designs/venice-cover-thumb.jpg', thumbLabel: 'VENICE', thumbAccents: cityAccent },
  { id: 'newyork', name: { sq: 'New York', en: 'New York' }, category: 'Travel',
    thumb: { background: '#0D1B2A' }, thumbPhoto: '/designs/newyork-cover-thumb.jpg', thumbLabel: 'NEW YORK', thumbAccents: cityAccent },
  { id: 'istanbul', name: { sq: 'Stamboll', en: 'Istanbul' }, category: 'Travel',
    thumb: { background: '#3A2010' }, thumbPhoto: '/designs/istanbul-cover-thumb.jpg', thumbLabel: 'ISTANBUL', thumbAccents: cityAccent },
  { id: 'tokyo', name: { sq: 'Tokio', en: 'Tokyo' }, category: 'Travel',
    thumb: { background: '#1A1020' }, thumbPhoto: '/designs/tokyo-cover-thumb.jpg', thumbLabel: 'TOKYO', thumbAccents: cityAccent },
  { id: 'amsterdam', name: { sq: 'Amsterdam', en: 'Amsterdam' }, category: 'Travel',
    thumb: { background: '#1A3040' }, thumbPhoto: '/designs/amsterdam-cover-thumb.jpg', thumbLabel: 'AMSTERDAM', thumbAccents: cityAccent },
  { id: 'athens', name: { sq: 'Athinë', en: 'Athens' }, category: 'Travel',
    thumb: { background: '#4A3A28' }, thumbPhoto: '/designs/athens-cover-thumb.jpg', thumbLabel: 'ATHENS', thumbAccents: cityAccent },
  { id: 'prague', name: { sq: 'Pragë', en: 'Prague' }, category: 'Travel',
    thumb: { background: '#2A1A18' }, thumbPhoto: '/designs/prague-cover-thumb.jpg', thumbLabel: 'PRAGUE', thumbAccents: cityAccent },
  { id: 'vienna', name: { sq: 'Vjenë', en: 'Vienna' }, category: 'Travel',
    thumb: { background: '#2A2030' }, thumbPhoto: '/designs/vienna-cover-thumb.jpg', thumbLabel: 'VIENNA', thumbAccents: cityAccent },
  { id: 'tirana', name: { sq: 'Tiranë', en: 'Tirana' }, category: 'Travel',
    thumb: { background: '#1A3048' }, thumbPhoto: '/designs/tirana-cover-thumb.jpg', thumbLabel: 'TIRANA', thumbAccents: cityAccent },
  { id: 'dubrovnik', name: { sq: 'Dubrovnik', en: 'Dubrovnik' }, category: 'Travel',
    thumb: { background: '#0A3048' }, thumbPhoto: '/designs/dubrovnik-cover-thumb.jpg', thumbLabel: 'DUBROVNIK', thumbAccents: cityAccent },
  { id: 'santorini', name: { sq: 'Santorini', en: 'Santorini' }, category: 'Travel',
    thumb: { background: '#1A4A6A' }, thumbPhoto: '/designs/santorini-cover-thumb.jpg', thumbLabel: 'SANTORINI', thumbAccents: cityAccent },
  { id: 'amalfi', name: { sq: 'Amalfi', en: 'Amalfi' }, category: 'Travel',
    thumb: { background: '#1A4060' }, thumbPhoto: '/designs/amalfi-cover-thumb.jpg', thumbLabel: 'AMALFI', thumbAccents: cityAccent },
  { id: 'berlin', name: { sq: 'Berlin', en: 'Berlin' }, category: 'Travel',
    thumb: { background: '#1A1A1A' }, thumbPhoto: '/designs/berlin-cover-thumb.jpg', thumbLabel: 'BERLIN', thumbAccents: cityAccent },
  { id: 'lisbon', name: { sq: 'Lisbonë', en: 'Lisbon' }, category: 'Travel',
    thumb: { background: '#4A2818' }, thumbPhoto: '/designs/lisbon-cover-thumb.jpg', thumbLabel: 'LISBON', thumbAccents: cityAccent },
  { id: 'florence', name: { sq: 'Firence', en: 'Florence' }, category: 'Travel',
    thumb: { background: '#3A2818' }, thumbPhoto: '/designs/florence-cover-thumb.jpg', thumbLabel: 'FLORENCE', thumbAccents: cityAccent },

  // ── CELEBRATION — birthday / parties / friendship ─────────────────────────
  { id: 'birthday-bloom', name: { sq: 'Ditëlindje', en: 'Birthday' }, category: 'Celebration',
    thumb: { background: '#FF6B8A' }, thumbLabel: 'BIRTHDAY',
    thumbAccents: [
      { position: 'absolute', top: '18%', left: '12%', width: 18, height: 18, borderRadius: '50%', background: '#FFE08A' },
      { position: 'absolute', top: '28%', right: '16%', width: 12, height: 12, borderRadius: '50%', background: '#FFF' },
      { position: 'absolute', bottom: '22%', left: '22%', width: 14, height: 14, borderRadius: '50%', background: '#7C5CFF' },
    ] },
  { id: 'party-nights', name: { sq: 'Festë', en: 'Party Night' }, category: 'Celebration',
    thumb: { background: '#1A0A2E' }, thumbLabel: 'PARTY',
    thumbAccents: [
      { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top,#7C3AED55,transparent)' },
    ] },
  { id: 'cheers-gold', name: { sq: 'Gëzuar', en: 'Cheers' }, category: 'Celebration',
    thumb: { background: '#1A120C' }, thumbLabel: 'CHEERS',
    thumbAccents: [
      { position: 'absolute', top: '35%', left: '10%', right: '10%', height: 2, background: '#C9A227' },
    ] },
  { id: 'friends-forever', name: { sq: 'Miqësi', en: 'Friends' }, category: 'Celebration',
    thumb: { background: '#0E4D5C' }, thumbLabel: 'FRIENDS',
    thumbAccents: cityAccent },
  { id: 'celebrate-confetti', name: { sq: 'Festojmë', en: 'Celebrate' }, category: 'Celebration',
    thumb: { background: '#FF8A3D' }, thumbLabel: 'YAY',
    thumbAccents: [
      { position: 'absolute', top: '20%', left: '20%', width: 10, height: 10, borderRadius: '50%', background: '#FFF' },
      { position: 'absolute', top: '40%', right: '18%', width: 16, height: 16, borderRadius: '50%', background: '#FFE08A' },
      { position: 'absolute', bottom: '30%', left: '30%', width: 8, height: 8, borderRadius: '50%', background: '#FF4D6D' },
    ] },

  // ── BABY & FAMILY ────────────────────────────────────────────────────────
  { id: 'baby-ador', name: { sq: 'ADOR', en: 'ADOR' }, category: 'Baby & Family',
    thumb: { background: '#BCC9D1' },
    thumbPhoto: '/designs/baby-ador-thumb.jpg',
    thumbLabel: 'ADOR',
    thumbAccents: [] },
];

/** Merge built-in DESIGN_METAS with admin custom designs for wizard/settings pickers. */
export function mergeDesignMetas(
  customs: Array<{
    id: string;
    name: { sq: string; en: string };
    category: string;
    thumbLabel?: string;
    thumbColor?: string;
    thumbPhoto?: string;
  }> = [],
): DesignMeta[] {
  const builtInIds = new Set(DESIGN_METAS.map((d) => d.id));
  const extras: DesignMeta[] = [];
  for (const c of customs) {
    if (!c?.id || builtInIds.has(c.id)) continue;
    extras.push({
      id: c.id,
      name: c.name,
      category: c.category,
      thumb: { background: c.thumbColor || '#2A2A2A' },
      thumbAccents: [],
      thumbPhoto: c.thumbPhoto,
      thumbLabel: c.thumbLabel || c.name.en?.slice(0, 12).toUpperCase(),
    });
  }
  return [...DESIGN_METAS, ...extras];
}
