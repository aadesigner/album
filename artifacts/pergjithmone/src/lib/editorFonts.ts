import { useEffect, useState } from 'react';

export type EditorFontCategory = 'serif' | 'sans' | 'script' | 'display' | 'system';

export interface EditorFont {
  id: string;
  label: string;
  value: string;
  category: EditorFontCategory;
  /** Google Fonts family name. Omit for system fonts. */
  google?: string;
  /** Axis string after the family name, e.g. ital,wght@0,400;0,600;1,400 */
  googleSpec?: string;
  /** Single-cut faces — Konva italic/bold files are missing. */
  singleCut?: boolean;
}

export const EDITOR_FONTS: EditorFont[] = [
  // System
  { id: 'georgia', label: 'Georgia', value: 'Georgia, serif', category: 'system' },
  { id: 'times', label: 'Times New Roman', value: "'Times New Roman', Times, serif", category: 'system' },
  { id: 'palatino', label: 'Palatino', value: "Palatino, 'Palatino Linotype', serif", category: 'system' },
  { id: 'arial', label: 'Arial', value: 'Arial, Helvetica, sans-serif', category: 'system' },
  { id: 'verdana', label: 'Verdana', value: 'Verdana, Geneva, sans-serif', category: 'system' },
  { id: 'trebuchet', label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif", category: 'system' },
  { id: 'impact', label: 'Impact', value: 'Impact, Haettenschweiler, sans-serif', category: 'system' },
  { id: 'courier', label: 'Courier New', value: "'Courier New', Courier, monospace", category: 'system' },

  // Serif
  { id: 'playfair', label: 'Playfair Display', value: "'Playfair Display', serif", category: 'serif', google: 'Playfair Display', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'cormorant', label: 'Cormorant Garamond', value: "'Cormorant Garamond', serif", category: 'serif', google: 'Cormorant Garamond', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'ebgaramond', label: 'EB Garamond', value: "'EB Garamond', serif", category: 'serif', google: 'EB Garamond', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'baskerville', label: 'Libre Baskerville', value: "'Libre Baskerville', serif", category: 'serif', google: 'Libre Baskerville', googleSpec: 'ital,wght@0,400;0,700;1,400' },
  { id: 'lora', label: 'Lora', value: "'Lora', serif", category: 'serif', google: 'Lora', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'spectral', label: 'Spectral', value: "'Spectral', serif", category: 'serif', google: 'Spectral', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'sourceserif', label: 'Source Serif 4', value: "'Source Serif 4', serif", category: 'serif', google: 'Source Serif 4', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'newsreader', label: 'Newsreader', value: "'Newsreader', serif", category: 'serif', google: 'Newsreader', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'fraunces', label: 'Fraunces', value: "'Fraunces', serif", category: 'serif', google: 'Fraunces', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'dmserif', label: 'DM Serif Display', value: "'DM Serif Display', serif", category: 'serif', google: 'DM Serif Display', googleSpec: 'ital@0;1' },
  { id: 'bodoni', label: 'Bodoni Moda', value: "'Bodoni Moda', serif", category: 'serif', google: 'Bodoni Moda', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'cardo', label: 'Cardo', value: "'Cardo', serif", category: 'serif', google: 'Cardo', googleSpec: 'ital,wght@0,400;0,700;1,400' },
  { id: 'crimson', label: 'Crimson Pro', value: "'Crimson Pro', serif", category: 'serif', google: 'Crimson Pro', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'caslon', label: 'Libre Caslon Text', value: "'Libre Caslon Text', serif", category: 'serif', google: 'Libre Caslon Text', googleSpec: 'ital,wght@0,400;0,700;1,400' },
  { id: 'cinzel', label: 'Cinzel', value: "'Cinzel', serif", category: 'serif', google: 'Cinzel', googleSpec: 'wght@400;600' },
  { id: 'instrument', label: 'Instrument Serif', value: "'Instrument Serif', serif", category: 'serif', google: 'Instrument Serif', googleSpec: 'ital@0;1' },
  { id: 'alegreya', label: 'Alegreya', value: "'Alegreya', serif", category: 'serif', google: 'Alegreya', googleSpec: 'ital,wght@0,400;0,700;1,400' },
  { id: 'notoserif', label: 'Noto Serif', value: "'Noto Serif', serif", category: 'serif', google: 'Noto Serif', googleSpec: 'ital,wght@0,400;0,700;1,400' },

  // Sans
  { id: 'montserrat', label: 'Montserrat', value: "'Montserrat', sans-serif", category: 'sans', google: 'Montserrat', googleSpec: 'ital,wght@0,300;0,400;0,600;1,400' },
  { id: 'raleway', label: 'Raleway', value: "'Raleway', sans-serif", category: 'sans', google: 'Raleway', googleSpec: 'ital,wght@0,300;0,400;0,600;1,400' },
  { id: 'inter', label: 'Inter', value: "'Inter', sans-serif", category: 'sans', google: 'Inter', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'poppins', label: 'Poppins', value: "'Poppins', sans-serif", category: 'sans', google: 'Poppins', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'lato', label: 'Lato', value: "'Lato', sans-serif", category: 'sans', google: 'Lato', googleSpec: 'ital,wght@0,400;0,700;1,400' },
  { id: 'nunito', label: 'Nunito', value: "'Nunito', sans-serif", category: 'sans', google: 'Nunito', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'outfit', label: 'Outfit', value: "'Outfit', sans-serif", category: 'sans', google: 'Outfit', googleSpec: 'wght@400;600' },
  { id: 'dmsans', label: 'DM Sans', value: "'DM Sans', sans-serif", category: 'sans', google: 'DM Sans', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'worksans', label: 'Work Sans', value: "'Work Sans', sans-serif", category: 'sans', google: 'Work Sans', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'josefin', label: 'Josefin Sans', value: "'Josefin Sans', sans-serif", category: 'sans', google: 'Josefin Sans', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'quicksand', label: 'Quicksand', value: "'Quicksand', sans-serif", category: 'sans', google: 'Quicksand', googleSpec: 'wght@400;600' },
  { id: 'manrope', label: 'Manrope', value: "'Manrope', sans-serif", category: 'sans', google: 'Manrope', googleSpec: 'wght@400;600' },
  { id: 'figtree', label: 'Figtree', value: "'Figtree', sans-serif", category: 'sans', google: 'Figtree', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'jakarta', label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif", category: 'sans', google: 'Plus Jakarta Sans', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'oswald', label: 'Oswald', value: "'Oswald', sans-serif", category: 'sans', google: 'Oswald', googleSpec: 'wght@400;600' },
  { id: 'barlow', label: 'Barlow', value: "'Barlow', sans-serif", category: 'sans', google: 'Barlow', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'karla', label: 'Karla', value: "'Karla', sans-serif", category: 'sans', google: 'Karla', googleSpec: 'ital,wght@0,400;0,700;1,400' },
  { id: 'urbanist', label: 'Urbanist', value: "'Urbanist', sans-serif", category: 'sans', google: 'Urbanist', googleSpec: 'ital,wght@0,400;0,600;1,400' },
  { id: 'jost', label: 'Jost', value: "'Jost', sans-serif", category: 'sans', google: 'Jost', googleSpec: 'ital,wght@0,400;0,600;1,400' },

  // Script
  { id: 'vibes', label: 'Great Vibes', value: "'Great Vibes', cursive", category: 'script', google: 'Great Vibes', singleCut: true },
  { id: 'dancing', label: 'Dancing Script', value: "'Dancing Script', cursive", category: 'script', google: 'Dancing Script', googleSpec: 'wght@400;600', singleCut: true },
  { id: 'pacifico', label: 'Pacifico', value: "'Pacifico', cursive", category: 'script', google: 'Pacifico', singleCut: true },
  { id: 'allura', label: 'Allura', value: "'Allura', cursive", category: 'script', google: 'Allura', singleCut: true },
  { id: 'pinyon', label: 'Pinyon Script', value: "'Pinyon Script', cursive", category: 'script', google: 'Pinyon Script', singleCut: true },
  { id: 'tangerine', label: 'Tangerine', value: "'Tangerine', cursive", category: 'script', google: 'Tangerine', googleSpec: 'wght@400;700', singleCut: true },
  { id: 'alexbrush', label: 'Alex Brush', value: "'Alex Brush', cursive", category: 'script', google: 'Alex Brush', singleCut: true },
  { id: 'sacramento', label: 'Sacramento', value: "'Sacramento', cursive", category: 'script', google: 'Sacramento', singleCut: true },
  { id: 'satisfy', label: 'Satisfy', value: "'Satisfy', cursive", category: 'script', google: 'Satisfy', singleCut: true },
  { id: 'parisienne', label: 'Parisienne', value: "'Parisienne', cursive", category: 'script', google: 'Parisienne', singleCut: true },
  { id: 'italianno', label: 'Italianno', value: "'Italianno', cursive", category: 'script', google: 'Italianno', singleCut: true },
  { id: 'yellowtail', label: 'Yellowtail', value: "'Yellowtail', cursive", category: 'script', google: 'Yellowtail', singleCut: true },
  { id: 'cookie', label: 'Cookie', value: "'Cookie', cursive", category: 'script', google: 'Cookie', singleCut: true },
  { id: 'caveat', label: 'Caveat', value: "'Caveat', cursive", category: 'script', google: 'Caveat', googleSpec: 'wght@400;600', singleCut: true },
  { id: 'homemade', label: 'Homemade Apple', value: "'Homemade Apple', cursive", category: 'script', google: 'Homemade Apple', singleCut: true },
  { id: 'shadows', label: 'Shadows Into Light', value: "'Shadows Into Light', cursive", category: 'script', google: 'Shadows Into Light', singleCut: true },
  { id: 'petit', label: 'Petit Formal Script', value: "'Petit Formal Script', cursive", category: 'script', google: 'Petit Formal Script', singleCut: true },
  { id: 'qwigley', label: 'Qwigley', value: "'Qwigley', cursive", category: 'script', google: 'Qwigley', singleCut: true },

  // Display
  { id: 'londrina', label: 'Londrina Solid', value: "'Londrina Solid', cursive", category: 'display', google: 'Londrina Solid', singleCut: true },
  { id: 'abril', label: 'Abril Fatface', value: "'Abril Fatface', serif", category: 'display', google: 'Abril Fatface', singleCut: true },
  { id: 'anton', label: 'Anton', value: "'Anton', sans-serif", category: 'display', google: 'Anton', singleCut: true },
  { id: 'bebas', label: 'Bebas Neue', value: "'Bebas Neue', sans-serif", category: 'display', google: 'Bebas Neue', singleCut: true },
  { id: 'yeseva', label: 'Yeseva One', value: "'Yeseva One', serif", category: 'display', google: 'Yeseva One', singleCut: true },
  { id: 'cinzeldec', label: 'Cinzel Decorative', value: "'Cinzel Decorative', serif", category: 'display', google: 'Cinzel Decorative', googleSpec: 'wght@400;700', singleCut: true },
  { id: 'comfortaa', label: 'Comfortaa', value: "'Comfortaa', sans-serif", category: 'display', google: 'Comfortaa', googleSpec: 'wght@400;600' },
  { id: 'poiret', label: 'Poiret One', value: "'Poiret One', sans-serif", category: 'display', google: 'Poiret One', singleCut: true },
  { id: 'fredericka', label: 'Fredericka the Great', value: "'Fredericka the Great', cursive", category: 'display', google: 'Fredericka the Great', singleCut: true },
];

export const FONT_CATEGORY_LABELS: Record<EditorFontCategory | 'all', { sq: string; en: string }> = {
  all: { sq: 'Të gjitha', en: 'All' },
  serif: { sq: 'Serif', en: 'Serif' },
  sans: { sq: 'Sans', en: 'Sans' },
  script: { sq: 'Shkrim', en: 'Script' },
  display: { sq: 'Titull', en: 'Display' },
  system: { sq: 'Sistemi', en: 'System' },
};

function googleCss2Url(fonts: EditorFont[]): string {
  const q = fonts
    .filter((f) => f.google)
    .map((f) => {
      const fam = encodeURIComponent(f.google!).replace(/%20/g, '+');
      return f.googleSpec ? `family=${fam}:${f.googleSpec}` : `family=${fam}`;
    })
    .join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

const GOOGLE_FONTS = EDITOR_FONTS.filter((f) => f.google);
export const EDITOR_FONT_STYLESHEETS = [
  googleCss2Url(GOOGLE_FONTS.filter((f) => f.category === 'serif')),
  googleCss2Url(GOOGLE_FONTS.filter((f) => f.category === 'sans')),
  googleCss2Url(GOOGLE_FONTS.filter((f) => f.category === 'script' || f.category === 'display')),
];

/** Joined URLs — tests + anything that still reads a single string. */
export const EDITOR_FONTS_STYLESHEET = EDITOR_FONT_STYLESHEETS.join(' ');

const EDITOR_FONT_STYLESHEET_ID = 'gfonts-editor';

/** Specs passed to document.fonts.load — primary faces used on covers/pages. */
const EDITOR_FONT_LOAD_SPECS = [
  '400 64px "Great Vibes"',
  '400 64px "Londrina Solid"',
  '400 64px "Dancing Script"',
  '600 64px "Dancing Script"',
  '400 64px "Pacifico"',
  '400 64px "Playfair Display"',
  '600 64px "Playfair Display"',
  'italic 400 64px "Playfair Display"',
  '300 64px "Cormorant Garamond"',
  '400 64px "Cormorant Garamond"',
  'italic 300 64px "Cormorant Garamond"',
  '300 64px "Raleway"',
  '400 64px "Raleway"',
  '300 64px "Montserrat"',
  '400 64px "Montserrat"',
];

export function fontPrimaryName(value: string): string {
  return value.split(',')[0].replace(/['"]/g, '').trim();
}

export function findEditorFont(ff?: string | null): EditorFont | undefined {
  const raw = (ff || '').trim();
  if (!raw) return undefined;
  const exact = EDITOR_FONTS.find((f) => f.value === raw);
  if (exact) return exact;
  const lower = raw.toLowerCase();
  return EDITOR_FONTS.find((f) => {
    const primary = fontPrimaryName(f.value).toLowerCase();
    return primary.length > 1 && lower.includes(primary);
  });
}

export function normalizeEditorFont(ff?: string | null): string {
  return findEditorFont(ff)?.value || 'Georgia, serif';
}

export function isEditorScriptFont(ff?: string | null): boolean {
  return findEditorFont(ff)?.category === 'script';
}

export function isEditorSingleCutFont(ff?: string | null): boolean {
  return !!findEditorFont(ff)?.singleCut;
}

export function searchEditorFonts(query: string, category: EditorFontCategory | 'all' = 'all'): EditorFont[] {
  const q = query.trim().toLowerCase();
  return EDITOR_FONTS.filter((f) => {
    if (category !== 'all' && f.category !== category) return false;
    if (!q) return true;
    return f.label.toLowerCase().includes(q) || f.id.includes(q) || f.category.includes(q);
  });
}

let fontsReady = false;
let fontsPromise: Promise<void> | null = null;
const readyListeners = new Set<() => void>();

function notifyReady() {
  fontsReady = true;
  readyListeners.forEach((fn) => {
    try { fn(); } catch { /* ignore */ }
  });
  readyListeners.clear();
}

function waitForLink(link: HTMLLinkElement): Promise<void> {
  if (link.dataset.loaded === '1') return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      link.dataset.loaded = '1';
      resolve();
    };
    link.addEventListener('load', finish, { once: true });
    link.addEventListener('error', finish, { once: true });
    requestAnimationFrame(() => {
      try { if (link.sheet) finish(); } catch { /* ignore */ }
    });
    setTimeout(finish, 3500);
  });
}

function injectStylesheet(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const links = EDITOR_FONT_STYLESHEETS.map((href, i) => {
    const id = `${EDITOR_FONT_STYLESHEET_ID}-${i}`;
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
    return waitForLink(link);
  });
  return Promise.all(links).then(() => undefined);
}

export function loadEditorFont(ff?: string | null): void {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const primary = fontPrimaryName(normalizeEditorFont(ff));
  if (!primary || primary === 'Georgia' || primary === 'Arial') return;
  void document.fonts.load(`400 64px "${primary}"`).catch(() => []);
}

/**
 * Inject the editor font stylesheet (idempotent) and resolve when the faces
 * are usable for canvas measurement. Safe to call from main.tsx on boot.
 */
export function ensureEditorFonts(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (fontsReady) return Promise.resolve();
  if (fontsPromise) return fontsPromise;

  fontsPromise = (async () => {
    await injectStylesheet();

    if (document.fonts?.load) {
      await Promise.all(
        EDITOR_FONT_LOAD_SPECS.map((spec) =>
          document.fonts.load(spec).catch(() => [] as FontFace[]),
        ),
      );
      try {
        await document.fonts.ready;
      } catch { /* ignore */ }
    }

    notifyReady();
  })();

  return fontsPromise;
}

export function areEditorFontsReady(): boolean {
  return fontsReady;
}

/** Subscribe to font-ready. Returns unsubscribe. */
export function onEditorFontsReady(cb: () => void): () => void {
  if (fontsReady) {
    cb();
    return () => {};
  }
  readyListeners.add(cb);
  void ensureEditorFonts();
  return () => { readyListeners.delete(cb); };
}

/**
 * React hook — false until webfonts are loaded, then true.
 * Use the boolean (or a derived epoch) as a Konva Text remount key so canvas
 * text remeasures with the real face instead of a fallback.
 */
export function useEditorFontsReady(): boolean {
  const [ready, setReady] = useState(fontsReady);

  useEffect(() => {
    if (fontsReady) {
      setReady(true);
      return;
    }
    return onEditorFontsReady(() => setReady(true));
  }, []);

  return ready;
}
