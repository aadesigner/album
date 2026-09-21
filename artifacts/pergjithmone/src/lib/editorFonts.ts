import { useEffect, useState } from 'react';

/**
 * Album / editor webfonts. Loaded once for Editor (Konva), Design Studio,
 * PageThumb, Wizard previews, and 3D viewer — canvas text does NOT auto-update
 * when a font finishes downloading, so callers must wait (or re-render) on ready.
 */
export const EDITOR_FONTS_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Dancing+Script:wght@400;600&family=Great+Vibes&family=Pacifico&family=Londrina+Solid&family=Raleway:wght@300;400&family=Montserrat:wght@300;400&display=swap';

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

let fontsReady = false;
let fontsPromise: Promise<void> | null = null;
const readyListeners = new Set<() => void>();

function notifyReady() {
  fontsReady = true;
  readyListeners.forEach(fn => {
    try { fn(); } catch { /* ignore */ }
  });
  readyListeners.clear();
}

function injectStylesheet(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const existing = document.getElementById(EDITOR_FONT_STYLESHEET_ID) as HTMLLinkElement | null;
  if (existing) {
    if (existing.dataset.loaded === '1') return Promise.resolve();
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        existing.dataset.loaded = '1';
        resolve();
      };
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', finish, { once: true });
      requestAnimationFrame(() => {
        try {
          if (existing.sheet) finish();
        } catch { /* ignore */ }
      });
      // Safety: never block UI forever if events were missed.
      setTimeout(finish, 2500);
    });
  }

  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      link.dataset.loaded = '1';
      resolve();
    };
    const link = document.createElement('link');
    link.id = EDITOR_FONT_STYLESHEET_ID;
    link.rel = 'stylesheet';
    link.href = EDITOR_FONTS_STYLESHEET;
    link.onload = finish;
    link.onerror = finish;
    document.head.appendChild(link);
    setTimeout(finish, 2500);
  });
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
        EDITOR_FONT_LOAD_SPECS.map(spec =>
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
