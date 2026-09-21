import type { EditorElement } from './designs';
import { DESIGN_W } from './designs';

export type CoverBgMode = 'color' | 'gradient' | 'photo';

export function coverBgMode(bg?: EditorElement | null): CoverBgMode {
  if (bg?.src) return 'photo';
  if (bg?.bgGradientFrom) return 'gradient';
  return 'color';
}

/** Patch / create the page background element for outside covers. */
export function applyCoverBackground(
  els: EditorElement[],
  canvasH: number,
  patch: {
    mode: CoverBgMode;
    bgColor?: string;
    bgGradientFrom?: string;
    bgGradientTo?: string;
    bgGradientDir?: 'tb' | 'lr' | 'diag';
    src?: string | null;
  },
): EditorElement[] {
  const idx = els.findIndex(e => e.type === 'background');
  const existing = idx >= 0 ? els[idx] : null;

  let nextBg: EditorElement;
  if (patch.mode === 'color') {
    nextBg = {
      id: existing?.id ?? `bg-${Date.now()}`,
      type: 'background',
      x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0,
      bgColor: patch.bgColor ?? existing?.bgColor ?? '#FFFFFF',
    };
  } else if (patch.mode === 'gradient') {
    const from = patch.bgGradientFrom ?? existing?.bgGradientFrom ?? existing?.bgColor ?? '#1A1A1A';
    const to = patch.bgGradientTo ?? existing?.bgGradientTo ?? '#444444';
    const dir = patch.bgGradientDir ?? existing?.bgGradientDir ?? 'tb';
    nextBg = {
      id: existing?.id ?? `bg-${Date.now()}`,
      type: 'background',
      x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0,
      bgColor: from,
      bgGradientFrom: from,
      bgGradientTo: to,
      bgGradientDir: dir,
    };
  } else {
    // Photo: keep a solid fallback color under the image; never keep gradients.
    nextBg = {
      id: existing?.id ?? `bg-${Date.now()}`,
      type: 'background',
      x: 0, y: 0, w: DESIGN_W, h: canvasH, rotation: 0,
      bgColor: existing?.bgColor ?? '#1A1A1A',
      src: patch.src === null || patch.src === undefined || patch.src === ''
        ? undefined
        : patch.src,
    };
  }

  if (idx < 0) return [nextBg, ...els];
  return els.map((e, i) => (i === idx ? nextBg : e));
}

/** Round-trip safe: fields that must not linger after a mode switch. */
export function coverBgPersistsClean(els: EditorElement[]): boolean {
  const bg = els.find(e => e.type === 'background');
  if (!bg) return true;
  if (bg.src) {
    return !bg.bgGradientFrom && !bg.bgGradientTo;
  }
  if (bg.bgGradientFrom) {
    return !bg.src && !!bg.bgGradientTo;
  }
  return !bg.src && !bg.bgGradientFrom;
}
