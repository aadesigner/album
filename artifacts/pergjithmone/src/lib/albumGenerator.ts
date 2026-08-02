// ── AI Photobook generator ──────────────────────────────────────────────────
// Purely client-side randomization: given a design category and a pool of
// uploaded photo URLs, produces ready-to-save page contents (Editor's
// EditorElement[] shape) for the front/inside/back covers and N inner pages.
// No ML/vision is involved — "AI" here means algorithmic layout + style
// randomization, mirroring what a user would do manually via the Editor's
// Designs/Layouts panels (see applyDesign/applyLayout in Editor.tsx).

import { LAYOUTS, DESIGNS, DESIGN_W, getCanvasHeight, scaleElementsToCanvas, type DE, type EditorElement } from '@/lib/designs';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function designsForCategory(categoryKey: string) {
  const filtered = categoryKey ? DESIGNS.filter(d => d.category === categoryKey) : DESIGNS;
  return filtered.length ? filtered : DESIGNS;
}

let idCounter = 0;
function withIds(elements: DE[], prefix: string): EditorElement[] {
  return elements.map(el => ({ ...el, id: `${prefix}-${idCounter++}-${Date.now()}` }));
}

export interface GeneratedAlbum {
  frontCover: EditorElement[];
  insideCover: EditorElement[];
  backCover: EditorElement[];
  /** One element array per inner page, in page order. */
  innerPages: EditorElement[][];
}

/**
 * Generate a full randomized album from a category and a set of photo URLs.
 * - Covers: one random design (matching the category) applied the same way
 *   Editor's applyDesign does — full elements on front, bg+decor on back,
 *   background swap on inside cover — so the book has a coherent "face".
 * - Inner pages: each page independently picks a random design (for
 *   background/color) and a random layout (for photo-zone structure), then
 *   fills the layout's photo zones from a shuffled, cycling photo pool.
 */
export function generateAlbum(
  categoryKey: string,
  photoUrls: string[],
  innerPageCount: number,
  lang: 'sq' | 'en',
  bookSize?: { widthCm?: number; heightCm?: number },
): GeneratedAlbum {
  const pool = designsForCategory(categoryKey);
  // Re-project reference-authored (3:4) design elements onto the chosen
  // book's real canvas height so non-3:4 books (e.g. square) don't stretch.
  const canvasH = getCanvasHeight(bookSize?.widthCm, bookSize?.heightCm);
  const projectDesign = (d: typeof pool[number]) => scaleElementsToCanvas(d.elements, canvasH);

  const coverDesign = pick(pool);
  const coverElements = projectDesign(coverDesign);
  const coverBg = coverElements.find(e => e.type === 'background');

  const frontCover = withIds(coverElements, 'cover-front');
  const backCover = withIds(
    coverElements.filter(e => e.type !== 'placeholder'),
    'cover-back',
  );
  const insideCover = coverBg ? withIds([coverBg], 'inside-cover') : [];

  const shuffledPhotos = shuffle(photoUrls);
  let photoIdx = 0;
  const nextPhoto = (): string | undefined => {
    if (!shuffledPhotos.length) return undefined;
    const url = shuffledPhotos[photoIdx % shuffledPhotos.length];
    photoIdx++;
    return url;
  };

  const captionText = lang === 'sq' ? 'Shto tekstin tënd...' : 'Your text here...';

  const innerPages: EditorElement[][] = [];
  for (let p = 0; p < innerPageCount; p++) {
    const design = pick(pool);
    const layout = pick(LAYOUTS);
    const bg = projectDesign(design).find(e => e.type === 'background');

    // LAYOUTS zones are already 0-1 fractions of the canvas — multiply
    // directly by the project's real canvas size (DESIGN_W is invariant;
    // canvasH follows the chosen book's aspect ratio).
    const zoneEls: DE[] = layout.zones.map(z => {
      const base = { x: z.x * DESIGN_W, y: z.y * canvasH, w: z.w * DESIGN_W, h: z.h * canvasH, rotation: 0 };
      if (z.type === 'photo') {
        const url = nextPhoto();
        return url
          ? { ...base, type: 'image' as const, src: url }
          : { ...base, type: 'placeholder' as const };
      }
      return {
        ...base, type: 'text' as const, text: captionText,
        fontSize: 18, fill: '#333', align: 'center' as const, fontFamily: 'Georgia, serif',
      };
    });

    const pageElements: DE[] = bg ? [bg, ...zoneEls] : zoneEls;
    innerPages.push(withIds(pageElements, `inner-${p}`));
  }

  return { frontCover, insideCover, backCover, innerPages };
}
