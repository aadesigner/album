// ── AI Photobook generator ──────────────────────────────────────────────────
// Client-side algorithmic layout + style randomization. Each run reshuffles
// photos, picks a fresh category design for covers, and builds varied inner
// pages so two generations never look the same.

import {
  LAYOUTS,
  DESIGNS,
  DESIGN_W,
  getCanvasHeight,
  scaleElementsToCanvas,
  elementsWithCoverWallpaper,
  type DE,
  type DesignDef,
  type LayoutDef,
  type EditorElement,
} from './designs';

function rand(): number {
  // Prefer crypto when available so successive runs diverge even when called
  // in the same millisecond (Math.random alone is fine, but this helps tests
  // and rapid retries feel less "stuck").
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

function designsForCategory(categoryKey: string): DesignDef[] {
  const filtered = categoryKey
    ? DESIGNS.filter((d) => d.category === categoryKey)
    : DESIGNS;
  // Fall back to Modern + Celebration so unknown categories still get a
  // coherent look instead of a chaotic mix of every template.
  if (filtered.length) return filtered;
  const soft = DESIGNS.filter((d) => d.category === 'Modern' || d.category === 'Celebration');
  return soft.length ? soft : DESIGNS;
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

/** Soft preferences per occasion — still random, but biased toward nice pages. */
const CATEGORY_LAYOUT_BIAS: Record<string, Record<string, number>> = {
  Wedding: {
    '1 Photo': 1.4,
    'Photo + Text': 1.6,
    '2 Photos': 1.3,
    '3 Photos': 0.9,
    '4 Photos': 0.6,
    '5-6 Photos': 0.25,
    Magazine: 0.8,
    Casual: 0.35,
    Text: 0.4,
  },
  Travel: {
    '1 Photo': 1.1,
    'Photo + Text': 1.0,
    '2 Photos': 1.4,
    '3 Photos': 1.5,
    '4 Photos': 1.2,
    '5-6 Photos': 0.8,
    Magazine: 1.3,
    Casual: 0.9,
    Text: 0.25,
  },
  'Baby & Family': {
    '1 Photo': 1.5,
    'Photo + Text': 1.4,
    '2 Photos': 1.3,
    '3 Photos': 1.0,
    '4 Photos': 0.7,
    '5-6 Photos': 0.35,
    Magazine: 0.7,
    Casual: 1.1,
    Text: 0.45,
  },
  Celebration: {
    '1 Photo': 1.0,
    'Photo + Text': 1.1,
    '2 Photos': 1.2,
    '3 Photos': 1.3,
    '4 Photos': 1.1,
    '5-6 Photos': 0.9,
    Magazine: 1.0,
    Casual: 1.2,
    Text: 0.3,
  },
  Modern: {
    '1 Photo': 1.2,
    'Photo + Text': 0.9,
    '2 Photos': 1.2,
    '3 Photos': 1.3,
    '4 Photos': 1.1,
    '5-6 Photos': 0.7,
    Magazine: 1.5,
    Casual: 0.6,
    Text: 0.35,
  },
  Portrait: {
    '1 Photo': 1.8,
    'Photo + Text': 1.5,
    '2 Photos': 1.4,
    '3 Photos': 0.8,
    '4 Photos': 0.5,
    '5-6 Photos': 0.2,
    Magazine: 0.7,
    Casual: 0.4,
    Text: 0.5,
  },
  Nature: {
    '1 Photo': 1.5,
    'Photo + Text': 1.2,
    '2 Photos': 1.3,
    '3 Photos': 1.1,
    '4 Photos': 0.8,
    '5-6 Photos': 0.4,
    Magazine: 0.9,
    Casual: 0.7,
    Text: 0.3,
  },
};

function layoutWeight(
  layout: LayoutDef,
  categoryKey: string,
  remainingPhotos: number,
  recentIds: string[],
): number {
  const slots = photoSlotCount(layout);
  // Never pick layouts that need more photos than we can reasonably fill
  // (allow mild reuse only when the album is nearly done).
  if (slots > remainingPhotos && remainingPhotos > 0 && slots > 4) return 0.05;
  if (slots === 0) return 0.15; // rare quote-only pages

  const bias = CATEGORY_LAYOUT_BIAS[categoryKey]?.[layout.category] ?? 1;
  // Prefer 1–3 photo pages most of the time for breathing room.
  const sizeBias =
    slots === 1 ? 1.25 :
    slots === 2 ? 1.35 :
    slots === 3 ? 1.2 :
    slots === 4 ? 0.85 :
    0.55;

  // Strongly avoid repeating the same layout two pages in a row.
  const recentPenalty = recentIds.includes(layout.id) ? 0.08 : 1;

  // Prefer layouts that consume remaining photos evenly toward the end.
  const leftover = remainingPhotos - slots;
  const leftoverBias =
    leftover < 0 ? 0.35 :
    leftover <= 2 ? 1.15 :
    1;

  return Math.max(0.01, bias * sizeBias * recentPenalty * leftoverBias);
}

function fillPlaceholders(elements: DE[], nextPhoto: () => string | undefined): DE[] {
  return elements.map((el) => {
    if (el.type !== 'placeholder') return el;
    const url = nextPhoto();
    return url ? { ...el, type: 'image' as const, src: url } : el;
  });
}

function prepareCover(
  design: DesignDef,
  canvasH: number,
  nextPhoto: () => string | undefined,
): DE[] {
  const hasCoverArt = design.elements.some((e) => e.type === 'image' && !!e.src);
  const source =
    !hasCoverArt && design.thumbPhoto
      ? elementsWithCoverWallpaper(design.elements, design.thumbPhoto)
      : design.elements;
  const projected = scaleElementsToCanvas(source, canvasH);
  return fillPlaceholders(projected, nextPhoto);
}

/** Photo-forward back cover when the category only has one design (or for variety). */
function buildPhotoBackCover(
  canvasH: number,
  photoUrl: string | undefined,
  categoryKey: string,
  lang: 'sq' | 'en',
): DE[] {
  const accents: Record<string, { bg: string; fill: string; muted: string }> = {
    Wedding: { bg: '#ECE7E1', fill: '#1A1A1A', muted: '#8A7A6A' },
    Travel: { bg: '#1C2B3A', fill: '#FFFFFF', muted: '#A8C4D8' },
    'Baby & Family': { bg: '#BCC9D1', fill: '#3A5568', muted: '#6A8496' },
    Celebration: { bg: '#1A120C', fill: '#F5E6C8', muted: '#C8A878' },
    Modern: { bg: '#111111', fill: '#FFFFFF', muted: '#888888' },
    Portrait: { bg: '#F4F0EA', fill: '#2A2A2A', muted: '#8A8078' },
    Nature: { bg: '#E8F0E8', fill: '#1A3020', muted: '#5A7A60' },
  };
  const tone = accents[categoryKey] ?? { bg: '#F7F5F2', fill: '#222', muted: '#888' };
  const label =
    lang === 'sq'
      ? (categoryKey === 'Wedding' ? 'Me dashuri' :
         categoryKey === 'Travel' ? 'Kujtime udhëtimi' :
         categoryKey === 'Baby & Family' ? 'Familja jonë' :
         'Faleminderit')
      : (categoryKey === 'Wedding' ? 'With love' :
         categoryKey === 'Travel' ? 'Travel memories' :
         categoryKey === 'Baby & Family' ? 'Our family' :
         'Thank you');

  const els: DE[] = [
    { type: 'background', x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0, bgColor: tone.bg },
  ];
  if (photoUrl) {
    els.push({
      type: 'image',
      src: photoUrl,
      x: 36, y: 36, w: DESIGN_W - 72, h: canvasH - 160,
      rotation: 0,
    });
  }
  els.push({
    type: 'text',
    text: label,
    x: 40, y: canvasH - 100, w: DESIGN_W - 80, h: 48,
    rotation: 0,
    fontSize: 22,
    fill: tone.fill,
    align: 'center',
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontStyle: 'italic',
  });
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
 * Generate a full randomized album from a category and a set of photo URLs.
 * - Front/back covers always come from the user's category designs (random
 *   each run; back may use a photo-forward fallback when the pool is tiny).
 * - Inner pages stay white paper with varied photo layouts — never the cover
 *   color — matching Editor.applyDesign semantics.
 */
export function generateAlbum(
  categoryKey: string,
  photoUrls: string[],
  innerPageCount: number,
  lang: 'sq' | 'en',
  bookSize?: { widthCm?: number; heightCm?: number },
): GeneratedAlbum {
  idCounter = 0;
  const pool = shuffle(designsForCategory(categoryKey));
  const canvasH = getCanvasHeight(bookSize?.widthCm, bookSize?.heightCm);

  const photoPool = shuffle(photoUrls.filter(Boolean));
  let photoIdx = 0;
  const nextPhoto = (): string | undefined => {
    if (!photoPool.length) return undefined;
    const url = photoPool[photoIdx % photoPool.length];
    photoIdx++;
    return url;
  };

  // ── Covers (category-aware, always random) ───────────────────────────────
  const frontDesign = pick(pool);
  let backDesign = pool.length > 1
    ? pick(pool.filter((d) => d.id !== frontDesign.id))
    : frontDesign;

  // ~40% of the time on multi-design categories, use a photo back instead —
  // keeps generations feeling distinct even with small pools.
  const preferPhotoBack = pool.length <= 1 || rand() < 0.4;

  const frontCover = withIds(
    prepareCover(frontDesign, canvasH, nextPhoto),
    'cover-front',
  );

  const backCover = withIds(
    preferPhotoBack
      ? buildPhotoBackCover(canvasH, nextPhoto() ?? photoPool[0], categoryKey || 'Modern', lang)
      : prepareCover(backDesign, canvasH, nextPhoto),
    'cover-back',
  );

  if (preferPhotoBack) backDesign = { ...frontDesign, id: 'photo-back' };

  const whiteBg: DE = {
    type: 'background',
    x: 0,
    y: 0,
    w: DESIGN_W,
    h: canvasH,
    rotation: 0,
    bgColor: '#FFFFFF',
  };
  const insideCover = withIds([whiteBg], 'inside-cover');

  // ── Inner pages ──────────────────────────────────────────────────────────
  const captionText = lang === 'sq' ? 'Shto tekstin tënd...' : 'Your text here...';
  const usableLayouts = LAYOUTS.filter((l) => photoSlotCount(l) > 0 || l.id === 'quote');
  const recentLayoutIds: string[] = [];
  let remaining = Math.max(photoPool.length, innerPageCount); // soft budget

  const innerPages: EditorElement[][] = [];
  for (let p = 0; p < innerPageCount; p++) {
    const layout = pickWeighted(usableLayouts, (l) =>
      layoutWeight(l, categoryKey || 'Modern', Math.max(1, remaining), recentLayoutIds),
    );
    recentLayoutIds.push(layout.id);
    if (recentLayoutIds.length > 3) recentLayoutIds.shift();

    const slots = photoSlotCount(layout);
    remaining = Math.max(0, remaining - slots);

    const zoneEls: DE[] = layout.zones.map((z) => {
      const base = {
        x: z.x * DESIGN_W,
        y: z.y * canvasH,
        w: z.w * DESIGN_W,
        h: z.h * canvasH,
        rotation: z.rotation ?? 0,
      };
      if (z.type === 'photo') {
        const url = nextPhoto();
        return url
          ? { ...base, type: 'image' as const, src: url }
          : { ...base, type: 'placeholder' as const };
      }
      return {
        ...base,
        type: 'text' as const,
        text: captionText,
        fontSize: 18,
        fill: '#333333',
        align: 'center' as const,
        fontFamily: 'Georgia, serif',
      };
    });

    // White paper only — never inherit cover palette on inners.
    innerPages.push(withIds([whiteBg, ...zoneEls], `inner-${p}`));
  }

  return {
    frontCover,
    insideCover,
    backCover,
    innerPages,
    meta: {
      frontDesignId: frontDesign.id,
      backDesignId: backDesign.id,
      categoryKey: categoryKey || 'Modern',
    },
  };
}
