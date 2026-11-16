// ── AI Photobook generator ──────────────────────────────────────────────────
// Client-side layout planner (not an LLM). Builds a narrative album by:
// - keeping upload order (first photo opens, last photo closes)
// - pairing facing pages into designed spreads
// - category dedication pages (headline + authentic prose) every 3–4 pages
// - preferring category catalog covers + editorial photo covers
// - putting the lead photo of each page in the largest frame
// - short category captions on photo+text breathing pages

import {
  LAYOUTS,
  DESIGNS,
  DESIGN_W,
  getCanvasHeight,
  fitDesignToCanvas,
  elementsWithCoverWallpaper,
  wallpaperSrc as resolveWallpaperUrl,
  designFrontElements,
  designBackElements,
  type DE,
  type DesignDef,
  type LayoutDef,
  type EditorElement,
} from './designs';
import { layoutZoneToElement } from './editorLayouts';
import {
  captionsFor,
  narrativesFor,
  type NarrativePiece,
} from './albumNarratives';

function rand(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 0x100000000;
  }
  return Math.random();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickWeighted<T>(items: T[], weight: (item: T) => number): T {
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pick(items);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Expand thin category pools so AI covers aren't stuck on 1–2 templates. */
const AI_CATEGORY_EXPAND: Record<string, string[]> = {
  Wedding: ['Wedding'],
  Travel: ['Travel'],
  'Baby & Family': ['Baby & Family'],
  Celebration: ['Celebration'],
  Friendship: ['Friendship'],
  Modern: ['Modern', 'Travel'],
  Portrait: ['Wedding'],
  Nature: ['Nature', 'Travel'],
  Locations: ['Travel'],
};

/** Layouts that look good with object-fit cover photos (no harsh crop strips). */
const AI_LAYOUT_ALLOW = new Set([
  'full', 'bordered-single', 'portrait-center',
  'two-h', 'two-v', 'two-h-6040', 'two-h-4060',
  'land-2port', 'port-2land', 'hero-l', 'hero-r', 'tall-l-2r',
  'triptych', 'grid4', 'hero-3r', 'hero-3l', 'top-3below',
]);

/** Facing-page recipes — left / right of a spread, in narrative rhythm. */
const SPREAD_RECIPES: Record<string, [string, string][]> = {
  Wedding: [
    ['full', 'two-h'],
    ['bordered-single', 'two-v'],
    ['two-h', 'full'],
    ['full', 'bordered-single'],
    ['hero-r', 'bordered-single'],
    ['two-v', 'two-h'],
    ['bordered-single', 'two-h-6040'],
    ['two-h', 'full'],
  ],
  Travel: [
    ['full', 'land-2port'],
    ['two-h', 'full'],
    ['hero-l', 'two-v'],
    ['port-2land', 'two-h-6040'],
    ['two-h', 'hero-r'],
    ['land-2port', 'bordered-single'],
    ['triptych', 'full'],
    ['grid4', 'full'],
    ['tall-l-2r', 'two-h'],
  ],
  'Baby & Family': [
    ['bordered-single', 'two-h'],
    ['full', 'two-v'],
    ['two-h', 'bordered-single'],
    ['bordered-single', 'full'],
    ['two-v', 'two-h'],
    ['hero-r', 'bordered-single'],
  ],
  Celebration: [
    ['full', 'two-h'],
    ['hero-r', 'two-v'],
    ['triptych', 'full'],
    ['two-h-6040', 'land-2port'],
    ['grid4', 'bordered-single'],
    ['two-h', 'hero-l'],
  ],
  Friendship: [
    ['full', 'two-h'],
    ['two-v', 'bordered-single'],
    ['two-h', 'full'],
    ['hero-r', 'two-h'],
    ['bordered-single', 'two-v'],
    ['two-h-4060', 'full'],
  ],
  Modern: [
    ['full', 'two-h'],
    ['hero-l', 'bordered-single'],
    ['two-h-6040', 'full'],
    ['grid4', 'two-v'],
    ['port-2land', 'full'],
    ['two-h', 'hero-r'],
  ],
  Portrait: [
    ['full', 'bordered-single'],
    ['bordered-single', 'two-h'],
    ['full', 'two-v'],
    ['two-h', 'full'],
  ],
  Nature: [
    ['full', 'two-h'],
    ['land-2port', 'full'],
    ['bordered-single', 'two-v'],
    ['two-h', 'hero-r'],
  ],
  Locations: [
    ['full', 'land-2port'],
    ['two-h', 'full'],
    ['hero-l', 'two-v'],
    ['port-2land', 'bordered-single'],
  ],
};

/** Soft category bias — favors breathing room over dense grids. */
const CATEGORY_LAYOUT_BIAS: Record<string, Record<string, number>> = {
  Wedding: {
    '1 Photo': 1.8, 'Photo + Text': 1.4, '2 Photos': 1.35, '3 Photos': 0.85,
    '4 Photos': 0.45, '5-6 Photos': 0.15, Magazine: 0.7,
  },
  Travel: {
    '1 Photo': 1.2, 'Photo + Text': 0.9, '2 Photos': 1.45, '3 Photos': 1.35,
    '4 Photos': 1.0, '5-6 Photos': 0.35, Magazine: 1.1,
  },
  'Baby & Family': {
    '1 Photo': 1.7, 'Photo + Text': 1.3, '2 Photos': 1.4, '3 Photos': 0.95,
    '4 Photos': 0.5, '5-6 Photos': 0.15, Magazine: 0.6,
  },
  Celebration: {
    '1 Photo': 1.15, 'Photo + Text': 1.0, '2 Photos': 1.35, '3 Photos': 1.25,
    '4 Photos': 0.9, '5-6 Photos': 0.3, Magazine: 0.9,
  },
  Friendship: {
    '1 Photo': 1.4, 'Photo + Text': 1.2, '2 Photos': 1.45, '3 Photos': 1.1,
    '4 Photos': 0.55, '5-6 Photos': 0.15, Magazine: 0.7,
  },
  Modern: {
    '1 Photo': 1.35, 'Photo + Text': 0.85, '2 Photos': 1.3, '3 Photos': 1.2,
    '4 Photos': 0.85, '5-6 Photos': 0.25, Magazine: 1.4,
  },
  Portrait: {
    '1 Photo': 2.2, 'Photo + Text': 1.5, '2 Photos': 1.3, '3 Photos': 0.6,
    '4 Photos': 0.25, '5-6 Photos': 0.05, Magazine: 0.5,
  },
  Nature: {
    '1 Photo': 1.6, 'Photo + Text': 1.1, '2 Photos': 1.35, '3 Photos': 1.1,
    '4 Photos': 0.7, '5-6 Photos': 0.2, Magazine: 0.8,
  },
  Locations: {
    '1 Photo': 1.3, 'Photo + Text': 1.0, '2 Photos': 1.4, '3 Photos': 1.3,
    '4 Photos': 0.95, '5-6 Photos': 0.25, Magazine: 1.0,
  },
};

const CATEGORY_TONES: Record<string, { bg: string; fill: string; muted: string; accent?: string; paper: string }> = {
  Wedding: { bg: '#F4EFE8', fill: '#1A1612', muted: '#8A7A6A', accent: '#C8B8A8', paper: '#F7F3EE' },
  Travel: { bg: '#1C2B3A', fill: '#FFFFFF', muted: '#A8C4D8', accent: '#3A5A70', paper: '#FFFFFF' },
  'Baby & Family': { bg: '#E8EEF2', fill: '#3A5568', muted: '#6A8496', accent: '#BCC9D1', paper: '#F4F7F8' },
  Celebration: { bg: '#1A120C', fill: '#F5E6C8', muted: '#C8A878', accent: '#3A2A18', paper: '#FFFCF7' },
  Friendship: { bg: '#1A3A42', fill: '#FFFFFF', muted: '#7EC8C4', accent: '#2A5058', paper: '#F4F8F8' },
  Modern: { bg: '#111111', fill: '#FFFFFF', muted: '#888888', accent: '#2A2A2A', paper: '#FFFFFF' },
  Portrait: { bg: '#F4F0EA', fill: '#2A2A2A', muted: '#8A8078', accent: '#D8D0C8', paper: '#F7F3EE' },
  Nature: { bg: '#E8F0E8', fill: '#1A3020', muted: '#5A7A60', accent: '#C8D8C8', paper: '#F4F7F2' },
  Locations: { bg: '#F7F2EA', fill: '#1A1A1A', muted: '#7A6A5A', accent: '#E0D4C4', paper: '#FFFFFF' },
};

function designsForCategory(
  categoryKey: string,
  catalog?: DesignDef[] | null,
): DesignDef[] {
  const source = catalog?.length ? catalog : DESIGNS;
  const keys = AI_CATEGORY_EXPAND[categoryKey] ?? (categoryKey ? [categoryKey] : ['Travel', 'Wedding']);
  const filtered = source.filter((d) => keys.includes(d.category));
  if (filtered.length) return filtered;
  const travel = source.filter((d) => d.category === 'Travel');
  return travel.length ? travel : source;
}

/** Prefer clean typography / framed photo covers; city-name banners are riskier for AI. */
function coverDesignWeight(design: DesignDef): number {
  const els = design.elements || [];
  const hasLandmark = els.some((e) => e.type === 'image' && e.objectFit === 'contain');
  const hasFramedPhoto = els.some((e) => e.type === 'image' && e.src && e.objectFit !== 'contain');
  const texts = els.filter((e) => e.type === 'text' && String(e.text || '').trim());
  const textCount = texts.length;
  // ALL-CAPS city labels (LONDON, PARIS…) fight category personalization.
  const cityBanner = texts.some((e) => {
    const t = String(e.text || '').trim();
    return t.length >= 4 && t === t.toUpperCase() && /^[A-ZÀ-Ÿ\s]+$/.test(t);
  });
  if (cityBanner) return 0.35;
  if (hasLandmark) return 0.55;
  if (hasFramedPhoto) return 1.45;
  if (textCount >= 2 && textCount <= 4) return 1.3;
  if (textCount > 6) return 0.5;
  return 1;
}

let idCounter = 0;
function withIds(elements: DE[], prefix: string): EditorElement[] {
  const ts = Date.now();
  const salt = Math.floor(rand() * 1e6);
  return elements.map((el) => ({
    ...el,
    id: `${prefix}-${idCounter++}-${ts}-${salt}`,
  }));
}

function photoSlotCount(layout: LayoutDef): number {
  return layout.zones.filter((z) => z.type === 'photo').length;
}

function findAllowedLayout(id: string): LayoutDef | undefined {
  return LAYOUTS.find((l) => l.id === id && AI_LAYOUT_ALLOW.has(l.id));
}

function pickFit(
  preferredIds: string[],
  budget: number,
  categoryKey: string,
  avoidId?: string,
): LayoutDef | null {
  if (budget <= 0) return null;
  for (const id of preferredIds) {
    if (id === avoidId) continue;
    const layout = findAllowedLayout(id);
    if (layout && photoSlotCount(layout) <= budget && photoSlotCount(layout) >= 1) {
      return layout;
    }
  }
  const fits = LAYOUTS.filter((l) => (
    AI_LAYOUT_ALLOW.has(l.id)
    && photoSlotCount(l) >= 1
    && photoSlotCount(l) <= budget
    && l.id !== avoidId
  ));
  if (!fits.length) return null;
  return pickWeighted(fits, (l) => {
    const slots = photoSlotCount(l);
    const bias = CATEGORY_LAYOUT_BIAS[categoryKey]?.[l.category] ?? 1;
    const size =
      slots === budget ? 1.45 :
      slots === 2 ? 1.25 :
      slots === 1 ? 1.1 :
      slots === 3 ? 0.95 :
      0.7;
    return Math.max(0.05, bias * size);
  });
}

/**
 * Choreograph inner pages as opening hero → facing spreads → closer.
 * Reserves at least one photo per remaining page when the count allows.
 */
function planPageLayouts(
  photoCount: number,
  pageCount: number,
  categoryKey: string,
): (LayoutDef | null)[] {
  const out: (LayoutDef | null)[] = Array.from({ length: pageCount }, () => null);
  let left = photoCount;
  if (pageCount <= 0 || photoCount <= 0) return out;

  const recipes = SPREAD_RECIPES[categoryKey] ?? SPREAD_RECIPES.Modern;
  const offset = Math.floor(rand() * recipes.length);

  for (let p = 0; p < pageCount; p++) {
    if (left <= 0) break;
    const pagesAfter = pageCount - p - 1;
    const reserve = Math.min(pagesAfter, Math.max(0, left - 1));
    const budget = Math.max(1, left - reserve);
    const prevId = p > 0 ? out[p - 1]?.id : undefined;
    const isFirst = p === 0;
    const isLast = p === pageCount - 1;

    let preferred: string[];
    if (isFirst) {
      preferred = rand() < 0.74 ? ['full', 'bordered-single'] : ['bordered-single', 'full'];
    } else if (isLast) {
      preferred = left >= 2
        ? ['bordered-single', 'full', 'two-h', 'two-v']
        : ['bordered-single', 'full'];
    } else {
      let pair = recipes[(offset + Math.floor((p - 1) / 2)) % recipes.length];
      if (rand() < 0.32) pair = [pair[1], pair[0]];
      const side = (p - 1) % 2;
      const primary = pair[side] ?? pair[0];
      const secondary = pair[1 - side] ?? pair[0];
      preferred = [
        primary === prevId ? secondary : primary,
        secondary,
        'two-h',
        'two-v',
        'full',
      ];
    }

    const layout = pickFit(preferred, budget, categoryKey, prevId);
    if (!layout) break;
    out[p] = layout;
    left -= photoSlotCount(layout);
  }

  // Leftovers: densify middle pages instead of dumping onto the closer.
  if (left > 0) {
    for (let p = 1; p < pageCount - 1 && left > 0; p++) {
      const current = out[p];
      const currentSlots = current ? photoSlotCount(current) : 0;
      const upgraded = pickFit(
        ['grid4', 'land-2port', 'hero-r', 'hero-l', 'triptych', 'tall-l-2r', 'two-h'],
        currentSlots + left,
        categoryKey,
        out[p - 1]?.id,
      );
      if (upgraded && photoSlotCount(upgraded) > currentSlots) {
        left -= photoSlotCount(upgraded) - currentSlots;
        out[p] = upgraded;
      }
    }
  }

  return out;
}

/** First photo opens, last photo closes, the rest stay in upload order. */
function splitPhotoRoles(photoUrls: string[]): {
  frontUrl?: string;
  backUrl?: string;
  story: string[];
} {
  const photos = photoUrls.filter(Boolean);
  if (photos.length === 0) return { story: [] };
  if (photos.length === 1) return { frontUrl: photos[0], story: [] };
  if (photos.length === 2) return { frontUrl: photos[0], story: [photos[1]] };
  return {
    frontUrl: photos[0],
    backUrl: photos[photos.length - 1],
    story: photos.slice(1, -1),
  };
}

function fillPlaceholders(elements: DE[], nextPhoto: () => string | undefined): DE[] {
  return elements.map((el) => {
    if (el.type !== 'placeholder') return el;
    const url = nextPhoto();
    return url ? { ...el, type: 'image' as const, src: url, cropZoom: 1, slotLocked: true } : el;
  });
}

/** Short cover titles that fit template boxes (avoid long phrases that spill in 3D). */
function coverPrimaryTitle(categoryKey: string, lang: 'sq' | 'en'): string {
  if (lang === 'sq') {
    if (categoryKey === 'Wedding') return 'Dasma jonë';
    if (categoryKey === 'Travel' || categoryKey === 'Locations') return 'Udhëtimi';
    if (categoryKey === 'Baby & Family') return 'Familja';
    if (categoryKey === 'Celebration') return 'Festë';
    if (categoryKey === 'Friendship') return 'Miqësia';
    if (categoryKey === 'Portrait') return 'Portrete';
    if (categoryKey === 'Nature') return 'Natyra';
    return 'Albumi ynë';
  }
  if (categoryKey === 'Wedding') return 'Our Wedding';
  if (categoryKey === 'Travel' || categoryKey === 'Locations') return 'Travel';
  if (categoryKey === 'Baby & Family') return 'Family';
  if (categoryKey === 'Celebration') return 'Celebrate';
  if (categoryKey === 'Friendship') return 'Friends';
  if (categoryKey === 'Portrait') return 'Portraits';
  if (categoryKey === 'Nature') return 'Nature';
  return 'Our Album';
}

function looksLikeYear(text: string): boolean {
  return /^\d{4}$/.test(text.trim());
}

/** City / place banners (LONDON, PARIS…) — keep on Travel, don't mash into "Travel". */
function looksLikePlaceBanner(text: string): boolean {
  const t = text.trim();
  if (t.length < 3 || t.length > 18) return false;
  if (t !== t.toUpperCase()) return false;
  return /^[A-ZÀ-Ÿ][A-ZÀ-Ÿ\s'\-]*$/.test(t);
}

function isPlaceholderCoverText(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^tap to edit|^shto tekst|^your (name|text)|^click to|^edit me/i.test(t)) return true;
  if (/^names?$|^title$|^subtitle$|^date$/i.test(t)) return true;
  return false;
}

/** Sample couple / person lines the catalog uses as demos. */
function looksLikeDemoPersonLine(text: string): boolean {
  const t = text.trim();
  if (/^[A-ZÀ-Ÿ][a-zà-ÿ]+\s*&\s*[A-ZÀ-Ÿ][a-zà-ÿ]+$/.test(t)) return true;
  if (/^(anna|lena|mira|elsa|sara|mark|leon|toni|alex)\b/i.test(t)) return true;
  if (/wedding of|our story|the johnson|smith &/i.test(t)) return true;
  return false;
}

/**
 * Make catalog covers album-ready without destroying intentional design copy.
 * Travel city banners stay; demo names / placeholders become a short category
 * title + year. Empty leftover text nodes are removed so 3D thumbs don't paint
 * overlapping ghost lines.
 */
function personalizeCoverText(elements: DE[], categoryKey: string, lang: 'sq' | 'en'): DE[] {
  const year = String(new Date().getFullYear());
  const primary = coverPrimaryTitle(categoryKey, lang);
  const isTravelish = categoryKey === 'Travel' || categoryKey === 'Locations';

  const texts = elements.filter((e) => {
    if (e.type !== 'text') return false;
    const raw = String(e.text || '').trim();
    return raw.length > 0 && raw !== '&';
  });
  if (!texts.length) {
    return elements.filter((e) => e.type !== 'text' || String(e.text || '').trim().length > 0);
  }

  const ranked = [...texts].sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0));
  const titleEl = ranked[0];
  const titleRaw = String(titleEl.text || '').trim();
  const keepPlaceName = isTravelish && looksLikePlaceBanner(titleRaw);

  const yearEl = ranked.find((e) => e !== titleEl && looksLikeYear(String(e.text || '')))
    || ranked.find((e) => {
      if (e === titleEl) return false;
      const t = String(e.text || '').trim();
      if (looksLikePlaceBanner(t)) return false;
      return (e.fontSize || 0) <= (titleEl.fontSize || 40) * 0.55;
    })
    || null;

  return elements
    .map((el) => {
      if (el.type !== 'text') return el;
      const raw = String(el.text || '').trim();
      if (!raw || raw === '&') {
        // Keep a lone "&" ornament between names only when we keep the title line.
        if (raw === '&' && keepPlaceName) return el;
        return { ...el, text: '' };
      }
      if (isPlaceholderCoverText(raw)) return { ...el, text: '' };

      if (el === titleEl) {
        if (keepPlaceName) return el; // BARCELONA / PARIS stays
        if (!looksLikeDemoPersonLine(raw) && !looksLikePlaceBanner(raw) && raw.length <= 22
          && !isPlaceholderCoverText(raw) && !looksLikeYear(raw)) {
          // Short intentional titles (e.g. "YAY", "DAY ONE") — leave alone.
          if (raw === raw.toUpperCase() && raw.length <= 10) return el;
        }
        let fontSize = titleEl.fontSize || 36;
        if (raw.length > 0 && primary.length > raw.length + 2) {
          fontSize = Math.max(22, Math.round(fontSize * (raw.length / primary.length) * 1.15));
        }
        return { ...el, text: primary, fontSize };
      }

      if (yearEl && el === yearEl) {
        return { ...el, text: year };
      }

      // Drop demo person lines and extra filler; keep small ornaments on travel.
      if (looksLikeDemoPersonLine(raw) || isPlaceholderCoverText(raw)) {
        return { ...el, text: '' };
      }
      if (looksLikeYear(raw)) return { ...el, text: year };
      // Extra body lines under a city banner clutter 3D — clear them.
      if (keepPlaceName) return { ...el, text: '' };
      return { ...el, text: '' };
    })
    .filter((e) => e.type !== 'text' || String(e.text || '').trim().length > 0);
}

function prepareCover(
  design: DesignDef,
  canvasH: number,
  nextPhoto: () => string | undefined,
  categoryKey: string,
  lang: 'sq' | 'en',
  side: 'front' | 'back' = 'front',
): DE[] {
  const sideEls = side === 'back' ? designBackElements(design) : designFrontElements(design);
  const hasCoverArt = sideEls.some((e) => e.type === 'image' && !!e.src);
  const hasFramedStock = sideEls.some((e) => e.type === 'image' && !!e.src && e.objectFit !== 'contain');
  const userPhoto = nextPhoto();
  let source = sideEls;

  // Static full-color backs stay a solid plate — never bake wallpaper/photos
  // onto them (that recreated letterboxed front chrome on square albums).
  const solidBackOnly = side === 'back' && !hasCoverArt
    && sideEls.every((e) => e.type === 'background');

  if (userPhoto && !solidBackOnly) {
    if (hasFramedStock) {
      // City / postcard frames: drop the stock photo, keep the user's.
      source = sideEls.map((el) => (
        el.type === 'image' && el.src && el.objectFit !== 'contain'
          ? { ...el, src: userPhoto, cropZoom: 1 }
          : el
      ));
    } else {
      source = elementsWithCoverWallpaper(
        sideEls.map((el) => (el.type === 'background' ? { ...el, src: undefined } : el)),
        userPhoto,
      );
      source = source.filter((el) => {
        if (el.type === 'placeholder') return false;
        if (el.type === 'image' && el.src === userPhoto && el.objectFit !== 'contain') return false;
        return true;
      });
    }
  } else if (!solidBackOnly && !hasCoverArt && design.thumbPhoto) {
    source = elementsWithCoverWallpaper(sideEls, design.thumbPhoto);
    const baked = resolveWallpaperUrl(design.thumbPhoto);
    source = source.filter((el) => {
      if (el.type === 'image' && el.src === baked) return false;
      return true;
    });
  }

  const projected = fitDesignToCanvas(source, canvasH);
  const filled = fillPlaceholders(projected, nextPhoto);
  return personalizeCoverText(filled, categoryKey, lang);
}

function coverTitle(
  categoryKey: string,
  lang: 'sq' | 'en',
  variant: 'front' | 'back',
): string {
  if (variant === 'front') {
    if (lang === 'sq') {
      if (categoryKey === 'Wedding') return 'Dasma jonë';
      if (categoryKey === 'Travel' || categoryKey === 'Locations') return 'Udhëtimi ynë';
      if (categoryKey === 'Baby & Family') return 'Familja jonë';
      if (categoryKey === 'Portrait') return 'Portrete';
      if (categoryKey === 'Nature') return 'Natyra';
      if (categoryKey === 'Celebration') return 'Festë';
      if (categoryKey === 'Friendship') return 'Miqësia jonë';
      return 'Albumi ynë';
    }
    if (categoryKey === 'Wedding') return 'Our Wedding';
    if (categoryKey === 'Travel' || categoryKey === 'Locations') return 'Our Journey';
    if (categoryKey === 'Baby & Family') return 'Our Family';
    if (categoryKey === 'Portrait') return 'Portraits';
    if (categoryKey === 'Nature') return 'In Nature';
    if (categoryKey === 'Celebration') return 'Celebrate';
    if (categoryKey === 'Friendship') return 'Our Friendship';
    return 'Our Album';
  }
  if (lang === 'sq') {
    if (categoryKey === 'Wedding') return 'Me dashuri';
    if (categoryKey === 'Travel' || categoryKey === 'Locations') return 'Kujtime udhëtimi';
    if (categoryKey === 'Baby & Family') return 'Me dashuri';
    if (categoryKey === 'Friendship') return 'Për gjithmonë';
    return 'Faleminderit';
  }
  if (categoryKey === 'Wedding') return 'With love';
  if (categoryKey === 'Travel' || categoryKey === 'Locations') return 'Travel memories';
  if (categoryKey === 'Baby & Family') return 'With love';
  if (categoryKey === 'Friendship') return 'Forever';
  return 'Thank you';
}

function coverTypeface(categoryKey: string): { title: string; meta: string; italic?: boolean } {
  if (categoryKey === 'Wedding' || categoryKey === 'Portrait') {
    return { title: "'Great Vibes', cursive", meta: "Arial, 'Helvetica Neue', sans-serif" };
  }
  if (categoryKey === 'Travel' || categoryKey === 'Locations') {
    return { title: "'Londrina Solid', cursive", meta: "'Londrina Solid', cursive" };
  }
  if (categoryKey === 'Celebration') {
    return { title: "Georgia, 'Times New Roman', serif", meta: "Arial, 'Helvetica Neue', sans-serif" };
  }
  return {
    title: "Georgia, 'Times New Roman', serif",
    meta: "Arial, 'Helvetica Neue', sans-serif",
    italic: true,
  };
}

/** Editorial photo-forward cover — category type, not a generic stock plate. */
function buildPhotoCover(
  canvasH: number,
  photoUrl: string | undefined,
  categoryKey: string,
  lang: 'sq' | 'en',
  variant: 'front' | 'back',
): DE[] {
  const tone = CATEGORY_TONES[categoryKey] ?? CATEGORY_TONES.Modern;
  const year = String(new Date().getFullYear());
  const title = coverTitle(categoryKey, lang, variant);
  const type = coverTypeface(categoryKey);
  const titleSize = categoryKey === 'Wedding' ? 44 : categoryKey === 'Travel' || categoryKey === 'Locations' ? 40 : 34;
  const els: DE[] = [
    { type: 'background', x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0, bgColor: tone.bg },
  ];

  if (photoUrl && variant === 'front') {
    const framed = categoryKey === 'Baby & Family' || categoryKey === 'Portrait';
    if (framed) {
      els.push({
        type: 'image',
        src: photoUrl,
        x: 40, y: 40, w: DESIGN_W - 80, h: canvasH * 0.68,
        rotation: 0,
        cropZoom: 1,
      });
      els.push({
        type: 'text',
        text: title,
        x: 40, y: canvasH * 0.76, w: DESIGN_W - 80, h: 56,
        rotation: 0,
        fontSize: titleSize,
        fill: tone.fill,
        align: 'center',
        fontFamily: type.title,
        fontStyle: type.italic ? 'italic' : 'normal',
      });
      els.push({
        type: 'text',
        text: year,
        x: 40, y: canvasH * 0.86, w: DESIGN_W - 80, h: 28,
        rotation: 0,
        fontSize: 13,
        fill: tone.muted,
        align: 'center',
        fontFamily: type.meta,
        letterSpacing: 4,
      });
    } else {
      els.push({
        type: 'image',
        src: photoUrl,
        x: 0, y: 0, w: DESIGN_W, h: canvasH,
        rotation: 0,
        cropZoom: 1,
      });
      const bandH = categoryKey === 'Travel' || categoryKey === 'Locations' ? canvasH * 0.28 : canvasH * 0.32;
      els.push({
        type: 'shape',
        shapeKind: 'rect',
        x: 0, y: canvasH - bandH, w: DESIGN_W, h: bandH,
        rotation: 0,
        fill: tone.bg,
        opacity: categoryKey === 'Travel' || categoryKey === 'Locations' ? 0.72 : 0.92,
      });
      els.push({
        type: 'text',
        text: title,
        x: 36, y: canvasH - bandH + 28, w: DESIGN_W - 72, h: 56,
        rotation: 0,
        fontSize: titleSize,
        fill: tone.fill,
        align: 'center',
        fontFamily: type.title,
        fontStyle: type.italic ? 'italic' : 'normal',
      });
      els.push({
        type: 'text',
        text: year,
        x: 36, y: canvasH - bandH + 88, w: DESIGN_W - 72, h: 28,
        rotation: 0,
        fontSize: 13,
        fill: tone.muted,
        align: 'center',
        fontFamily: type.meta,
        letterSpacing: 4,
      });
    }
  } else if (photoUrl) {
    els.push({
      type: 'image',
      src: photoUrl,
      x: 40, y: 40, w: DESIGN_W - 80, h: canvasH - 168,
      rotation: 0,
      cropZoom: 1,
    });
    els.push({
      type: 'text',
      text: title,
      x: 40, y: canvasH - 104, w: DESIGN_W - 80, h: 48,
      rotation: 0,
      fontSize: 22,
      fill: tone.fill,
      align: 'center',
      fontFamily: type.title,
      fontStyle: type.italic ? 'italic' : 'normal',
    });
  } else {
    els.push({
      type: 'text',
      text: title,
      x: 40, y: canvasH * 0.42, w: DESIGN_W - 80, h: 56,
      rotation: 0,
      fontSize: titleSize,
      fill: tone.fill,
      align: 'center',
      fontFamily: type.title,
      fontStyle: type.italic ? 'italic' : 'normal',
    });
  }
  return els;
}

/**
 * Indices of dedication / text-only pages — skip opener + closer.
 * `maxUnique` caps slots so we never need to recycle the same copy.
 */
export function planNarrativeSlots(pageCount: number, maxUnique = Infinity): Set<number> {
  const slots = new Set<number>();
  if (pageCount < 5 || maxUnique <= 0) return slots;
  let i = 3 + Math.floor(rand() * 2); // page 4 or 5 (1-based)
  while (i < pageCount - 1 && slots.size < maxUnique) {
    slots.add(i);
    i += 3 + Math.floor(rand() * 2); // every 3–4 pages
  }
  return slots;
}

function narrativeTypeface(categoryKey: string): {
  title: string;
  body: string;
  titleItalic?: boolean;
} {
  if (categoryKey === 'Wedding' || categoryKey === 'Portrait') {
    return { title: "'Great Vibes', cursive", body: "Georgia, 'Times New Roman', serif", titleItalic: false };
  }
  if (categoryKey === 'Travel' || categoryKey === 'Locations') {
    return { title: "'Londrina Solid', cursive", body: "Georgia, 'Times New Roman', serif" };
  }
  if (categoryKey === 'Celebration') {
    return { title: "Georgia, 'Times New Roman', serif", body: "Arial, 'Helvetica Neue', sans-serif" };
  }
  return {
    title: "Georgia, 'Times New Roman', serif",
    body: "Georgia, 'Times New Roman', serif",
    titleItalic: true,
  };
}

/** Full-bleed dedication page — headline + authentic paragraphs. */
export function buildNarrativePage(
  piece: NarrativePiece,
  canvasH: number,
  paper: string,
  categoryKey: string,
  style: 0 | 1 | 2 = 0,
): DE[] {
  const tone = CATEGORY_TONES[categoryKey] ?? CATEGORY_TONES.Modern;
  const type = narrativeTypeface(categoryKey);
  const ink = '#1A1612';
  const muted = '#6A5C4E';
  const els: DE[] = [
    { type: 'background', x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0, bgColor: paper || '#FFFFFF' },
  ];

  const titleSize = categoryKey === 'Wedding' ? 52 : categoryKey === 'Travel' ? 40 : 36;
  const bodySize = 15;
  const bodyH = Math.min(canvasH * 0.42, 280);

  if (style === 1) {
    // Editorial: headline top-left, rule, body below.
    els.push({
      type: 'text',
      text: piece.headline,
      x: 48, y: canvasH * 0.14, w: DESIGN_W - 96, h: 72,
      rotation: 0,
      fontSize: titleSize,
      fill: ink,
      align: 'left',
      fontFamily: type.title,
      fontStyle: type.titleItalic ? 'italic' : 'normal',
      lineHeight: 1.05,
    });
    els.push({
      type: 'shape',
      shapeKind: 'rect',
      x: 48, y: canvasH * 0.14 + 78, w: 72, h: 2,
      rotation: 0,
      fill: tone.accent || muted,
      opacity: 1,
      strokeWidth: 0,
    });
    els.push({
      type: 'text',
      text: piece.body,
      x: 48, y: canvasH * 0.14 + 100, w: DESIGN_W - 96, h: bodyH,
      rotation: 0,
      fontSize: bodySize,
      fill: muted,
      align: 'left',
      fontFamily: type.body,
      fontStyle: 'normal',
      lineHeight: 1.55,
    });
  } else if (style === 2) {
    // Centered soft plate with generous margins.
    els.push({
      type: 'shape',
      shapeKind: 'rect',
      x: 36, y: canvasH * 0.12, w: DESIGN_W - 72, h: canvasH * 0.76,
      rotation: 0,
      fill: '#000000',
      opacity: 0.03,
      strokeWidth: 0,
    });
    els.push({
      type: 'text',
      text: piece.headline,
      x: 56, y: canvasH * 0.22, w: DESIGN_W - 112, h: 80,
      rotation: 0,
      fontSize: titleSize,
      fill: ink,
      align: 'center',
      fontFamily: type.title,
      fontStyle: type.titleItalic ? 'italic' : 'normal',
      lineHeight: 1.05,
    });
    els.push({
      type: 'text',
      text: piece.body,
      x: 64, y: canvasH * 0.36, w: DESIGN_W - 128, h: bodyH,
      rotation: 0,
      fontSize: bodySize,
      fill: muted,
      align: 'center',
      fontFamily: type.body,
      fontStyle: 'normal',
      lineHeight: 1.55,
    });
  } else {
    // Classic centered dedication.
    els.push({
      type: 'text',
      text: piece.headline,
      x: 40, y: canvasH * 0.22, w: DESIGN_W - 80, h: 80,
      rotation: 0,
      fontSize: titleSize,
      fill: ink,
      align: 'center',
      fontFamily: type.title,
      fontStyle: type.titleItalic ? 'italic' : 'normal',
      lineHeight: 1.05,
    });
    els.push({
      type: 'shape',
      shapeKind: 'rect',
      x: (DESIGN_W - 56) / 2, y: canvasH * 0.22 + 88, w: 56, h: 1.5,
      rotation: 0,
      fill: tone.accent || muted,
      opacity: 0.85,
      strokeWidth: 0,
    });
    els.push({
      type: 'text',
      text: piece.body,
      x: 56, y: canvasH * 0.22 + 110, w: DESIGN_W - 112, h: bodyH,
      rotation: 0,
      fontSize: bodySize,
      fill: muted,
      align: 'center',
      fontFamily: type.body,
      fontStyle: 'normal',
      lineHeight: 1.55,
    });
  }

  if (piece.signoff) {
    els.push({
      type: 'text',
      text: piece.signoff,
      x: 48, y: canvasH * 0.82, w: DESIGN_W - 96, h: 36,
      rotation: 0,
      fontSize: 13,
      fill: muted,
      align: 'center',
      fontFamily: type.body,
      fontStyle: 'italic',
      letterSpacing: 0.5,
    });
  }
  return els;
}

/** Lead photo of the group goes in the largest frame. */
function elementsForLayout(
  layout: LayoutDef,
  canvasH: number,
  paper: string,
  nextPhoto: () => string | undefined,
  nextCaption?: () => string | undefined,
): DE[] {
  const photoIndexes = layout.zones
    .map((z, i) => ({ z, i, area: z.w * z.h }))
    .filter((x) => x.z.type === 'photo')
    .sort((a, b) => b.area - a.area || a.i - b.i);

  const urlByIndex = new Map<number, string>();
  for (const slot of photoIndexes) {
    const url = nextPhoto();
    if (url) urlByIndex.set(slot.i, url);
  }

  const zoneEls: DE[] = [];
  layout.zones.forEach((z, i) => {
    const { id: _id, ...mapped } = layoutZoneToElement(z, canvasH, { id: '_', text: '' });
    if (z.type === 'photo') {
      const url = urlByIndex.get(i);
      if (!url) return;
      zoneEls.push({
        ...mapped,
        type: 'image',
        src: url,
        cropZoom: 1,
      });
      return;
    }
    // Fill text zones with a short authentic caption — skip empty so we don't
    // leave invisible text boxes that still stack in 3D thumbs.
    const caption = nextCaption?.();
    if (!caption) return;
    zoneEls.push({ ...mapped, text: caption });
  });

  const paperBg: DE = {
    type: 'background',
    x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0,
    bgColor: paper,
  };
  return [paperBg, ...zoneEls];
}

export interface GeneratedAlbum {
  frontCover: EditorElement[];
  insideCover: EditorElement[];
  backCover: EditorElement[];
  /** One element array per inner page, in page order. */
  innerPages: EditorElement[][];
  /** Design ids chosen this run — useful for debugging / analytics. */
  meta: { frontDesignId: string; backDesignId: string; categoryKey: string };
}

/**
 * Generate a full album from a category and photo URLs.
 * Photos stay in upload order. Prefer unique photos; recycle only if needed
 * so every inner page still receives a layout + photo.
 *
 * Front/back covers always use an admin catalog template (Design Studio),
 * including custom designs when `catalogDesigns` is provided.
 */
export function generateAlbum(
  categoryKey: string,
  photoUrls: string[],
  innerPageCount: number,
  lang: 'sq' | 'en',
  bookSize?: { widthCm?: number; heightCm?: number },
  catalogDesigns?: DesignDef[] | null,
): GeneratedAlbum {
  idCounter = 0;
  const cat = categoryKey || 'Modern';
  const pool = shuffle(designsForCategory(cat, catalogDesigns));
  const canvasH = getCanvasHeight(bookSize?.widthCm, bookSize?.heightCm);
  const { frontUrl, backUrl, story: storyBase } = splitPhotoRoles(photoUrls);

  const takeOnce = (url?: string): (() => string | undefined) => {
    let used = false;
    return () => {
      if (used || !url) return undefined;
      used = true;
      return url;
    };
  };

  // Always apply admin front + back of the same design template.
  let frontDesignId = 'photo-front';
  let backDesignId = 'photo-back';
  let frontCover: EditorElement[];
  let backCover: EditorElement[];
  let backPhotoConsumed = false;
  if (pool.length > 0) {
    const design = pickWeighted(pool, coverDesignWeight);
    frontDesignId = design.id;
    backDesignId = design.id;
    frontCover = withIds(
      prepareCover(design, canvasH, takeOnce(frontUrl), cat, lang, 'front'),
      'cover-front',
    );
    const takeBack = takeOnce(backUrl);
    backCover = withIds(
      prepareCover(design, canvasH, takeBack, cat, lang, 'back'),
      'cover-back',
    );
    // Solid full-color backs ignore the reserved photo — return it to the story.
    backPhotoConsumed = backCover.some((e) =>
      (e.type === 'image' || e.type === 'background') && !!e.src && e.src === backUrl,
    );
  } else {
    frontCover = withIds(buildPhotoCover(canvasH, frontUrl, cat, lang, 'front'), 'cover-front');
    backCover = withIds(buildPhotoCover(canvasH, backUrl, cat, lang, 'back'), 'cover-back');
    backPhotoConsumed = !!backUrl;
  }

  const story = (!backPhotoConsumed && backUrl)
    ? [...storyBase, backUrl]
    : storyBase;

  // Inner empty margins are always pure white — never category cream/tint.
  const whitePaper = '#FFFFFF';
  const paperBg: DE = {
    type: 'background',
    x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0,
    bgColor: whitePaper,
  };
  // Locked endpapers — never editable; PDF paints hatch + labels separately.
  const insideCover: EditorElement[] = [];

  let storyIdx = 0;
  /** Prefer unused story photos; recycle only to keep every page filled. */
  const nextStoryPhoto = (): string | undefined => {
    if (!story.length) return undefined;
    const url = story[storyIdx % story.length];
    storyIdx += 1;
    return url;
  };

  const safePageCount = Math.max(0, Math.floor(innerPageCount) || 0);
  // Never schedule more dedication pages than unique copy pieces.
  const narrativePool = shuffle(narrativesFor(cat, lang));
  const narrativeSlots = planNarrativeSlots(safePageCount, narrativePool.length);
  const photoPageCount = Math.max(0, safePageCount - narrativeSlots.size);
  const plannedPhoto = photoPageCount > 0
    ? planPageLayouts(story.length, photoPageCount, cat)
    : [];
  const fallbackLayout =
    findAllowedLayout('full')
    || findAllowedLayout('bordered-single')
    || LAYOUTS.find((l) => photoSlotCount(l) === 1)
    || LAYOUTS[0];

  // Map photo layouts onto non-narrative indices only.
  const planned: (LayoutDef | null)[] = Array.from({ length: safePageCount }, () => null);
  let photoPlanIdx = 0;
  for (let p = 0; p < safePageCount; p++) {
    if (narrativeSlots.has(p)) continue;
    planned[p] = plannedPhoto[photoPlanIdx] || null;
    photoPlanIdx += 1;
  }

  let narrativeIdx = 0;
  const captionPool = shuffle(captionsFor(cat, lang));
  let captionIdx = 0;
  const nextCaption = (): string | undefined => {
    // One-shot captions only — blank rather than repeat the same line.
    if (captionIdx >= captionPool.length) return undefined;
    const line = captionPool[captionIdx];
    captionIdx += 1;
    return line;
  };

  const usedHeadlines = new Set<string>();
  const innerPages: EditorElement[][] = [];
  for (let p = 0; p < safePageCount; p++) {
    if (narrativeSlots.has(p)) {
      // Walk pool once; skip any accidental duplicate headlines.
      let piece = narrativePool[narrativeIdx++];
      while (piece && usedHeadlines.has(piece.headline) && narrativeIdx < narrativePool.length) {
        piece = narrativePool[narrativeIdx++];
      }
      if (!piece || usedHeadlines.has(piece.headline)) {
        // No unique copy left — fall through to a photo page instead of repeating.
        const url = nextStoryPhoto();
        innerPages.push(withIds(
          url
            ? [
                paperBg,
                {
                  type: 'image', x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0,
                  src: url, cropZoom: 1,
                },
              ]
            : [paperBg],
          `inner-${p}`,
        ));
        continue;
      }
      usedHeadlines.add(piece.headline);
      const style = (usedHeadlines.size % 3) as 0 | 1 | 2;
      innerPages.push(withIds(
        buildNarrativePage(piece, canvasH, whitePaper, cat, style),
        `inner-story-${p}`,
      ));
      continue;
    }

    const layout = planned[p] || fallbackLayout;
    if (!layout) {
      const url = nextStoryPhoto();
      innerPages.push(withIds(
        url
          ? [
              paperBg,
              {
                type: 'image', x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0,
                src: url, cropZoom: 1,
              },
            ]
          : [paperBg],
        `inner-${p}`,
      ));
      continue;
    }
    // Occasional short captions on layouts that already have text zones.
    const hasTextZone = layout.zones.some((z) => z.type === 'text');
    innerPages.push(withIds(
      elementsForLayout(
        layout,
        canvasH,
        whitePaper,
        nextStoryPhoto,
        hasTextZone ? nextCaption : undefined,
      ),
      `inner-${p}`,
    ));
  }

  return {
    frontCover,
    insideCover,
    backCover,
    innerPages,
    meta: {
      frontDesignId,
      backDesignId,
      categoryKey: cat,
    },
  };
}

/**
 * Suggested inner page count.
 * Dense enough that a 32-photo album can fill typical minPages (≈30)
 * without blank sheets — prefer ≤1.25 photos/page when possible,
 * plus room for category dedication pages (~1 every 3–4 pages).
 */
export function suggestInnerPageCount(photoCount: number, minPages = 4): number {
  if (photoCount <= 0) return minPages;
  const coverTake = photoCount >= 3 ? 2 : photoCount >= 1 ? 1 : 0;
  const story = Math.max(0, photoCount - coverTake);
  if (story === 0) return minPages;
  const packed = Math.max(minPages, Math.ceil(story / 1.25));
  const narrativeRoom = Math.floor(packed / 4);
  const withStory = packed + narrativeRoom;
  // When we have enough story photos for minPages, keep a little headroom
  // for dedication pages instead of packing photos only.
  if (story >= minPages) return Math.min(withStory, story + narrativeRoom);
  return withStory;
}
