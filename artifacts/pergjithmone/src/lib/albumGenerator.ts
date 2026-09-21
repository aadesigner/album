// ── AI Photobook generator ──────────────────────────────────────────────────
// Client-side layout planner (not an LLM). Builds coherent albums by:
// - preferring clean photo layouts (no strips / casual piles / filmstrips)
// - budgeting photos so each image appears once
// - photo-forward covers with category tones (not mismatched stock city art)
// - leaving caption zones blank for the user to fill

import {
  LAYOUTS,
  DESIGNS,
  DESIGN_W,
  getCanvasHeight,
  scaleElementsToCanvas,
  elementsWithCoverWallpaper,
  wallpaperSrc as resolveWallpaperUrl,
  type DE,
  type DesignDef,
  type LayoutDef,
  type EditorElement,
} from './designs';

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
  Celebration: ['Travel', 'Wedding'],
  Modern: ['Travel'],
  Portrait: ['Wedding', 'Travel'],
  Nature: ['Travel'],
  Locations: ['Travel'],
};

/** Layouts that look good with object-fit cover photos (no harsh crop strips). */
const AI_LAYOUT_ALLOW = new Set([
  'full', 'bordered-single', 'portrait-center',
  'photo-cap', 'cap-top',
  'two-h', 'two-v', 'two-h-6040', 'two-h-4060', 'two-v-7030', 'two-v-3070',
  'land-2port', 'port-2land', 'hero-l', 'hero-r', 'tall-l-2r',
  'grid4', 'grid4-topheavy', 'hero-3r', 'hero-3l', 'top-3below',
  'gallery-5',
  'mag', 'text-2photos',
]);

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

const CATEGORY_TONES: Record<string, { bg: string; fill: string; muted: string; accent?: string }> = {
  Wedding: { bg: '#F4EFE8', fill: '#1A1A1A', muted: '#8A7A6A', accent: '#C8B8A8' },
  Travel: { bg: '#1C2B3A', fill: '#FFFFFF', muted: '#A8C4D8', accent: '#3A5A70' },
  'Baby & Family': { bg: '#E8EEF2', fill: '#3A5568', muted: '#6A8496', accent: '#BCC9D1' },
  Celebration: { bg: '#1A120C', fill: '#F5E6C8', muted: '#C8A878', accent: '#3A2A18' },
  Modern: { bg: '#111111', fill: '#FFFFFF', muted: '#888888', accent: '#2A2A2A' },
  Portrait: { bg: '#F4F0EA', fill: '#2A2A2A', muted: '#8A8078', accent: '#D8D0C8' },
  Nature: { bg: '#E8F0E8', fill: '#1A3020', muted: '#5A7A60', accent: '#C8D8C8' },
  Locations: { bg: '#F7F2EA', fill: '#1A1A1A', muted: '#7A6A5A', accent: '#E0D4C4' },
};

function designsForCategory(categoryKey: string): DesignDef[] {
  const keys = AI_CATEGORY_EXPAND[categoryKey] ?? (categoryKey ? [categoryKey] : ['Travel', 'Wedding']);
  const filtered = DESIGNS.filter((d) => keys.includes(d.category));
  if (filtered.length) return filtered;
  const travel = DESIGNS.filter((d) => d.category === 'Travel');
  return travel.length ? travel : DESIGNS;
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

function layoutWeight(
  layout: LayoutDef,
  categoryKey: string,
  remainingPhotos: number,
  recentIds: string[],
  preferSingle: boolean,
): number {
  const slots = photoSlotCount(layout);
  if (slots === 0) return 0;
  // Hard rule: never pick a layout that needs more photos than we have left.
  if (slots > remainingPhotos) return 0;

  const bias = CATEGORY_LAYOUT_BIAS[categoryKey]?.[layout.category] ?? 1;
  let sizeBias =
    slots === 1 ? 1.45 :
    slots === 2 ? 1.4 :
    slots === 3 ? 1.05 :
    slots === 4 ? 0.7 :
    0.35;

  if (preferSingle && slots === 1) sizeBias *= 2.2;
  if (preferSingle && slots > 2) sizeBias *= 0.35;

  // Near the end, prefer layouts that consume remaining photos cleanly.
  const leftover = remainingPhotos - slots;
  const leftoverBias =
    leftover === 0 ? 1.6 :
    leftover === 1 ? 1.25 :
    leftover <= 3 ? 1.1 :
    1;

  const recentPenalty = recentIds.includes(layout.id) ? 0.05 : 1;
  // Avoid same category twice in a row (e.g. three grids).
  const lastId = recentIds[recentIds.length - 1];
  const lastLayout = lastId ? LAYOUTS.find((l) => l.id === lastId) : null;
  const catPenalty =
    lastLayout && lastLayout.category === layout.category && slots > 1 ? 0.45 : 1;

  return Math.max(0, bias * sizeBias * leftoverBias * recentPenalty * catPenalty);
}

/**
 * Plan how many photo slots each inner page should aim for so the album
 * uses each photo once and lands near `innerPageCount` pages of content.
 */
function planSlotTargets(photoCount: number, pageCount: number): number[] {
  if (pageCount <= 0) return [];
  if (photoCount <= 0) return Array(pageCount).fill(0);

  const targets: number[] = [];
  let left = photoCount;

  for (let p = 0; p < pageCount; p++) {
    const pagesLeft = pageCount - p;
    if (left <= 0) {
      targets.push(0);
      continue;
    }
    // Ideal average for remaining pages, clamped to sensible page sizes.
    const ideal = left / pagesLeft;
    let slots: number;
    if (p === 0 || p === pageCount - 1) {
      // Open and close on a hero / single when possible.
      slots = left >= 1 ? 1 : 0;
    } else if (ideal <= 1.15) {
      slots = 1;
    } else if (ideal <= 2.15) {
      slots = rand() < 0.55 ? 2 : (rand() < 0.65 ? 1 : 3);
    } else if (ideal <= 3.2) {
      slots = rand() < 0.45 ? 3 : (rand() < 0.55 ? 2 : 4);
    } else {
      slots = rand() < 0.5 ? 4 : 3;
    }
    slots = Math.min(slots, left, 5);
    // Don't leave stranded leftovers that can't fill a page later.
    const after = left - slots;
    const pagesAfter = pagesLeft - 1;
    if (pagesAfter > 0 && after > 0 && after / pagesAfter > 5) {
      slots = Math.min(5, left - pagesAfter); // leave at least 1 per remaining page
    }
    if (pagesAfter > 0 && after < pagesAfter) {
      slots = Math.max(1, left - pagesAfter);
    }
    slots = Math.max(0, Math.min(slots, left));
    targets.push(slots);
    left -= slots;
  }

  // Dump any rounding leftovers onto middle pages (still no wrap).
  let i = 1;
  while (left > 0 && targets.length > 2) {
    const idx = Math.min(i, targets.length - 2);
    const add = Math.min(2, left, 5 - targets[idx]);
    if (add > 0) {
      targets[idx] += add;
      left -= add;
    }
    i++;
    if (i > targets.length * 3) break;
  }

  return targets;
}

function fillPlaceholders(elements: DE[], nextPhoto: () => string | undefined): DE[] {
  return elements.map((el) => {
    if (el.type !== 'placeholder') return el;
    const url = nextPhoto();
    return url ? { ...el, type: 'image' as const, src: url } : el;
  });
}

/** Replace demo cover copy (names, cities, years) with category-generic labels. */
function personalizeCoverText(elements: DE[], categoryKey: string, lang: 'sq' | 'en'): DE[] {
  const year = String(new Date().getFullYear());
  const copy: Record<string, { primary: string; secondary: string }> = {
    Wedding: {
      primary: lang === 'sq' ? 'Dasma jonë' : 'Our Wedding',
      secondary: year,
    },
    Travel: {
      primary: lang === 'sq' ? 'Udhëtimi ynë' : 'Our Journey',
      secondary: lang === 'sq' ? 'Kujtime' : 'Memories',
    },
    'Baby & Family': {
      primary: lang === 'sq' ? 'Familja jonë' : 'Our Family',
      secondary: year,
    },
    Celebration: {
      primary: lang === 'sq' ? 'Festë' : 'Celebrate',
      secondary: year,
    },
    Modern: {
      primary: lang === 'sq' ? 'Albumi ynë' : 'Our Album',
      secondary: year,
    },
    Portrait: {
      primary: lang === 'sq' ? 'Portrete' : 'Portraits',
      secondary: year,
    },
    Nature: {
      primary: lang === 'sq' ? 'Natyra' : 'In Nature',
      secondary: year,
    },
    Locations: {
      primary: lang === 'sq' ? 'Vendet tona' : 'Places We Love',
      secondary: year,
    },
  };
  const labels = copy[categoryKey] ?? copy.Modern;
  const texts = elements.filter((e) => e.type === 'text');
  if (!texts.length) return elements;

  // Sort by font size — largest becomes title, next subtitle; hide the rest.
  const ranked = [...texts].sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0));
  const titleId = ranked[0];
  const subId = ranked[1];

  return elements.map((el) => {
    if (el.type !== 'text') return el;
    if (el === titleId) return { ...el, text: labels.primary };
    if (el === subId) return { ...el, text: labels.secondary };
    // Drop extra demo lines (dates, "CLASS OF…", couple names, etc.)
    return { ...el, text: '' };
  });
}

function prepareCover(
  design: DesignDef,
  canvasH: number,
  nextPhoto: () => string | undefined,
  categoryKey: string,
  lang: 'sq' | 'en',
): DE[] {
  const hasCoverArt = design.elements.some((e) => e.type === 'image' && !!e.src);
  const userWallpaper = nextPhoto();
  let source = design.elements;

  if (userWallpaper) {
    source = elementsWithCoverWallpaper(
      source.map((el) =>
        el.type === 'background' ? { ...el, src: undefined } : el,
      ),
      userWallpaper,
    );
    // Wallpaper already covers the page — drop photo frames that show the same URL.
    source = source.filter((el) => {
      if (el.type === 'placeholder') return false;
      if (el.type === 'image' && el.src === userWallpaper) return false;
      return true;
    });
  } else if (!hasCoverArt && design.thumbPhoto) {
    source = elementsWithCoverWallpaper(design.elements, design.thumbPhoto);
    const baked = resolveWallpaperUrl(design.thumbPhoto);
    source = source.filter((el) => {
      if (el.type === 'image' && el.src === baked) return false;
      return true;
    });
  }

  const projected = scaleElementsToCanvas(source, canvasH);
  const filled = fillPlaceholders(projected, nextPhoto);
  return personalizeCoverText(filled, categoryKey, lang);
}

/** Clean photo-forward cover — used often so AI albums feel personal, not stock. */
function buildPhotoCover(
  canvasH: number,
  photoUrl: string | undefined,
  categoryKey: string,
  lang: 'sq' | 'en',
  variant: 'front' | 'back',
): DE[] {
  const tone = CATEGORY_TONES[categoryKey] ?? CATEGORY_TONES.Modern;
  const year = String(new Date().getFullYear());
  const frontTitle =
    lang === 'sq'
      ? (categoryKey === 'Wedding' ? 'Dasma jonë' :
         categoryKey === 'Travel' || categoryKey === 'Locations' ? 'Udhëtimi ynë' :
         categoryKey === 'Baby & Family' ? 'Familja jonë' :
         categoryKey === 'Portrait' ? 'Portrete' :
         categoryKey === 'Nature' ? 'Natyra' :
         categoryKey === 'Celebration' ? 'Festë' :
         'Albumi ynë')
      : (categoryKey === 'Wedding' ? 'Our Wedding' :
         categoryKey === 'Travel' || categoryKey === 'Locations' ? 'Our Journey' :
         categoryKey === 'Baby & Family' ? 'Our Family' :
         categoryKey === 'Portrait' ? 'Portraits' :
         categoryKey === 'Nature' ? 'In Nature' :
         categoryKey === 'Celebration' ? 'Celebrate' :
         'Our Album');
  const backTitle =
    lang === 'sq'
      ? (categoryKey === 'Wedding' ? 'Me dashuri' :
         categoryKey === 'Travel' || categoryKey === 'Locations' ? 'Kujtime udhëtimi' :
         categoryKey === 'Baby & Family' ? 'Me dashuri' :
         'Faleminderit')
      : (categoryKey === 'Wedding' ? 'With love' :
         categoryKey === 'Travel' || categoryKey === 'Locations' ? 'Travel memories' :
         categoryKey === 'Baby & Family' ? 'With love' :
         'Thank you');

  const title = variant === 'front' ? frontTitle : backTitle;
  const els: DE[] = [
    { type: 'background', x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0, bgColor: tone.bg },
  ];

  if (photoUrl) {
    if (variant === 'front') {
      // Full-bleed photo with soft bottom band for title
      els.push({
        type: 'image',
        src: photoUrl,
        x: 0, y: 0, w: DESIGN_W, h: canvasH,
        rotation: 0,
      });
      els.push({
        type: 'shape',
        shapeKind: 'rect',
        x: 0, y: canvasH * 0.62, w: DESIGN_W, h: canvasH * 0.38,
        rotation: 0,
        fill: tone.bg,
        opacity: 0.92,
      });
      els.push({
        type: 'text',
        text: title,
        x: 40, y: canvasH * 0.72, w: DESIGN_W - 80, h: 56,
        rotation: 0,
        fontSize: 36,
        fill: tone.fill,
        align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontStyle: 'italic',
      });
      els.push({
        type: 'text',
        text: year,
        x: 40, y: canvasH * 0.82, w: DESIGN_W - 80, h: 32,
        rotation: 0,
        fontSize: 14,
        fill: tone.muted,
        align: 'center',
        fontFamily: "Arial, 'Helvetica Neue', sans-serif",
        letterSpacing: 3,
      });
    } else {
      els.push({
        type: 'image',
        src: photoUrl,
        x: 36, y: 36, w: DESIGN_W - 72, h: canvasH - 160,
        rotation: 0,
      });
      els.push({
        type: 'text',
        text: title,
        x: 40, y: canvasH - 100, w: DESIGN_W - 80, h: 48,
        rotation: 0,
        fontSize: 22,
        fill: tone.fill,
        align: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontStyle: 'italic',
      });
    }
  } else {
    els.push({
      type: 'text',
      text: title,
      x: 40, y: canvasH * 0.42, w: DESIGN_W - 80, h: 56,
      rotation: 0,
      fontSize: 36,
      fill: tone.fill,
      align: 'center',
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontStyle: 'italic',
    });
  }
  return els;
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
 * Each photo is used at most once across covers + inners.
 */
export function generateAlbum(
  categoryKey: string,
  photoUrls: string[],
  innerPageCount: number,
  lang: 'sq' | 'en',
  bookSize?: { widthCm?: number; heightCm?: number },
): GeneratedAlbum {
  idCounter = 0;
  const cat = categoryKey || 'Modern';
  const pool = shuffle(designsForCategory(cat));
  const canvasH = getCanvasHeight(bookSize?.widthCm, bookSize?.heightCm);

  const photoPool = shuffle(photoUrls.filter(Boolean));
  let photoIdx = 0;
  const nextPhoto = (): string | undefined => {
    if (photoIdx >= photoPool.length) return undefined;
    return photoPool[photoIdx++];
  };

  // ── Covers ───────────────────────────────────────────────────────────────
  // Prefer clean photo covers (~70%); otherwise a personalized category design.
  const usePhotoFront = !pool.length || rand() < 0.72;
  const usePhotoBack = rand() < 0.65;

  let frontDesignId = 'photo-front';
  let backDesignId = 'photo-back';

  let frontCover: EditorElement[];
  if (usePhotoFront) {
    const url = nextPhoto();
    frontCover = withIds(buildPhotoCover(canvasH, url, cat, lang, 'front'), 'cover-front');
  } else {
    const frontDesign = pick(pool);
    frontDesignId = frontDesign.id;
    frontCover = withIds(
      prepareCover(frontDesign, canvasH, nextPhoto, cat, lang),
      'cover-front',
    );
  }

  let backCover: EditorElement[];
  if (usePhotoBack || pool.length <= 1) {
    const url = nextPhoto();
    backCover = withIds(buildPhotoCover(canvasH, url, cat, lang, 'back'), 'cover-back');
    backDesignId = 'photo-back';
  } else {
    const frontId = frontDesignId;
    const backDesign = pick(pool.filter((d) => d.id !== frontId)) || pool[0];
    backDesignId = backDesign.id;
    backCover = withIds(
      prepareCover(backDesign, canvasH, nextPhoto, cat, lang),
      'cover-back',
    );
  }

  const whiteBg: DE = {
    type: 'background',
    x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0,
    bgColor: '#FFFFFF',
  };
  const insideCover = withIds([whiteBg], 'inside-cover');

  // ── Inner pages ──────────────────────────────────────────────────────────
  const remainingPhotos = Math.max(0, photoPool.length - photoIdx);
  const usableLayouts = LAYOUTS.filter(
    (l) => AI_LAYOUT_ALLOW.has(l.id) && photoSlotCount(l) > 0,
  );
  const slotTargets = planSlotTargets(remainingPhotos, innerPageCount);
  const recentLayoutIds: string[] = [];

  const innerPages: EditorElement[][] = [];
  for (let p = 0; p < innerPageCount; p++) {
    const remaining = Math.max(0, photoPool.length - photoIdx);
    const want = Math.min(slotTargets[p] ?? 1, remaining);

    let layout: LayoutDef | null = null;
    if (want > 0 && usableLayouts.length) {
      const candidates = usableLayouts.filter((l) => photoSlotCount(l) <= want);
      const poolForPick = candidates.length
        ? candidates
        : usableLayouts.filter((l) => photoSlotCount(l) === 1);
      if (poolForPick.length) {
        layout = pickWeighted(poolForPick, (l) =>
          layoutWeight(l, cat, remaining, recentLayoutIds, want === 1 || p === 0 || p === innerPageCount - 1),
        );
      }
    }

    // Fallback: single full-bleed if we still have a photo.
    if (!layout && remaining > 0) {
      layout = LAYOUTS.find((l) => l.id === 'full') || usableLayouts[0];
    }

    if (!layout || remaining <= 0) {
      // Empty white page rather than fake placeholder text / reused photos.
      innerPages.push(withIds([whiteBg], `inner-${p}`));
      continue;
    }

    recentLayoutIds.push(layout.id);
    if (recentLayoutIds.length > 4) recentLayoutIds.shift();

    const zoneEls: DE[] = [];
    for (const z of layout.zones) {
      const base = {
        x: z.x * DESIGN_W,
        y: z.y * canvasH,
        w: z.w * DESIGN_W,
        h: z.h * canvasH,
        rotation: z.rotation ?? 0,
      };
      if (z.type === 'photo') {
        const url = nextPhoto();
        if (!url) continue; // skip empty slots — never reuse
        zoneEls.push({ ...base, type: 'image' as const, src: url });
      } else {
        // Blank caption — user fills in editor (no "Your text here...")
        zoneEls.push({
          ...base,
          type: 'text' as const,
          text: '',
          fontSize: Math.round(Math.min(base.w, base.h) * 0.12) || 16,
          fill: '#6A6A6A',
          align: 'center' as const,
          fontFamily: 'Georgia, serif',
        });
      }
    }

    innerPages.push(withIds([whiteBg, ...zoneEls], `inner-${p}`));
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

/** Suggested inner page count so multi-slot layouts rarely need empty pages. */
export function suggestInnerPageCount(photoCount: number, minPages = 4): number {
  if (photoCount <= 0) return minPages;
  // ~1.6–2.0 photos per page on average → cleaner single/duo layouts.
  const ideal = Math.ceil(photoCount / 1.75);
  return Math.max(minPages, ideal);
}
