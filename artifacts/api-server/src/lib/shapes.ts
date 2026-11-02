/** Cover decoration kinds — kept as strings so older saves still load. */
export type ShapeKind =
  | 'rect'
  | 'circle'
  | 'oval'
  | 'line'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'burst'
  | 'heart'
  | 'heart_outline'
  | 'arrow'
  | 'chevron'
  | 'banner'
  | 'flower'
  | 'leaf'
  | 'sparkle'
  | 'arch'
  | 'ring'
  | 'frame'
  | 'flourish';

export const SHAPE_KINDS: ShapeKind[] = [
  'rect', 'circle', 'oval', 'line',
  'heart', 'heart_outline', 'star', 'burst', 'sparkle',
  'arrow', 'chevron', 'banner', 'flourish',
  'flower', 'leaf', 'arch', 'ring', 'frame',
  'triangle', 'diamond',
];

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  rect: 'Rectangle',
  circle: 'Circle',
  oval: 'Oval',
  line: 'Line',
  triangle: 'Triangle',
  diamond: 'Diamond',
  star: 'Star',
  burst: 'Burst',
  heart: 'Heart',
  heart_outline: 'Heart line',
  arrow: 'Arrow',
  chevron: 'Chevron',
  banner: 'Banner',
  flower: 'Flower',
  leaf: 'Leaf',
  sparkle: 'Sparkle',
  arch: 'Arch',
  ring: 'Ring',
  frame: 'Frame',
  flourish: 'Flourish',
};

export const STROKE_ONLY_SHAPES = new Set<string>([
  'line', 'ring', 'heart_outline', 'flourish', 'frame',
]);
export const KEEP_RATIO_SHAPES = new Set<string>([
  'circle', 'oval', 'star', 'burst', 'heart', 'heart_outline',
  'diamond', 'ring', 'flower', 'sparkle', 'leaf',
]);

export function isShapeKind(v: unknown): v is ShapeKind {
  return typeof v === 'string' && (SHAPE_KINDS as string[]).includes(v);
}

export function isStrokeOnlyShape(kind?: string): boolean {
  return STROKE_ONLY_SHAPES.has(kind || '');
}

function starPoints(cx: number, cy: number, or: number, ir: number, n = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? or : ir;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`;
}

/** Map a path authored in a fixed viewBox into element w×h. */
function scalePath(
  viewW: number,
  viewH: number,
  w: number,
  h: number,
  commands: string,
): string {
  const sx = w / viewW;
  const sy = h / viewH;
  return commands.replace(
    /(-?\d*\.?\d+)[,\s]+(-?\d*\.?\d+)/g,
    (_, x: string, y: string) => `${(Number(x) * sx).toFixed(2)} ${(Number(y) * sy).toFixed(2)}`,
  );
}

/** Classic scrapbook heart (filled). */
function heartFilled(w: number, h: number): string {
  // Authored in 100×92 — fuller lobes, sharp tip.
  return scalePath(100, 92, w, h, [
    'M 50 86',
    'C 20 64, 2 46, 2 28',
    'C 2 12, 14 2, 28 2',
    'C 38 2, 46 8, 50 18',
    'C 54 8, 62 2, 72 2',
    'C 86 2, 98 12, 98 28',
    'C 98 46, 80 64, 50 86',
    'Z',
  ].join(' '));
}

/** Open heart stroke — scrapbook outline. */
function heartOutline(w: number, h: number): string {
  return scalePath(100, 92, w, h, [
    'M 50 82',
    'C 22 62, 6 46, 6 29',
    'C 6 15, 16 6, 29 6',
    'C 38 6, 45 11, 50 20',
    'C 55 11, 62 6, 71 6',
    'C 84 6, 94 15, 94 29',
    'C 94 46, 78 62, 50 82',
  ].join(' '));
}

/** SVG path in local 0,0 → w,h. Ring/frame use evenodd. */
export function shapeSvgPath(kind: string | undefined, w: number, h: number): string {
  const ww = Math.max(1, w);
  const hh = Math.max(1, h);
  switch (kind) {
    case 'circle':
    case 'oval': {
      const rx = ww / 2;
      const ry = hh / 2;
      return `M ${rx.toFixed(2)} 0 A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${rx.toFixed(2)} ${hh.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${rx.toFixed(2)} 0 Z`;
    }
    case 'line':
      return `M 0 ${(hh / 2).toFixed(2)} L ${ww.toFixed(2)} ${(hh / 2).toFixed(2)}`;
    case 'triangle':
      return `M ${(ww / 2).toFixed(2)} 0 L ${ww.toFixed(2)} ${hh.toFixed(2)} L 0 ${hh.toFixed(2)} Z`;
    case 'diamond':
      return `M ${(ww / 2).toFixed(2)} 0 L ${ww.toFixed(2)} ${(hh / 2).toFixed(2)} L ${(ww / 2).toFixed(2)} ${hh.toFixed(2)} L 0 ${(hh / 2).toFixed(2)} Z`;
    case 'star': {
      const or = Math.min(ww, hh) / 2;
      const ir = or * 0.42;
      return starPoints(ww / 2, hh / 2, or, ir, 5);
    }
    case 'burst': {
      const or = Math.min(ww, hh) / 2;
      const ir = or * 0.55;
      return starPoints(ww / 2, hh / 2, or, ir, 8);
    }
    case 'heart':
      return heartFilled(ww, hh);
    case 'heart_outline':
      return heartOutline(ww, hh);
    case 'arrow': {
      const mid = hh / 2;
      const head = Math.min(ww * 0.38, hh);
      const shaftTop = hh * 0.32;
      const shaftBot = hh * 0.68;
      const neck = Math.max(0, ww - head);
      return [
        `M 0 ${shaftTop.toFixed(2)}`,
        `L ${neck.toFixed(2)} ${shaftTop.toFixed(2)}`,
        `L ${neck.toFixed(2)} 0`,
        `L ${ww.toFixed(2)} ${mid.toFixed(2)}`,
        `L ${neck.toFixed(2)} ${hh.toFixed(2)}`,
        `L ${neck.toFixed(2)} ${shaftBot.toFixed(2)}`,
        `L 0 ${shaftBot.toFixed(2)}`,
        'Z',
      ].join(' ');
    }
    case 'chevron': {
      const tip = ww * 0.42;
      return [
        `M 0 0`,
        `L ${tip.toFixed(2)} ${(hh / 2).toFixed(2)}`,
        `L 0 ${hh.toFixed(2)}`,
        `L ${(ww * 0.28).toFixed(2)} ${hh.toFixed(2)}`,
        `L ${ww.toFixed(2)} ${(hh / 2).toFixed(2)}`,
        `L ${(ww * 0.28).toFixed(2)} 0`,
        'Z',
      ].join(' ');
    }
    case 'banner': {
      const notch = Math.min(hh * 0.42, ww * 0.14);
      return [
        `M 0 0`,
        `L ${ww.toFixed(2)} 0`,
        `L ${ww.toFixed(2)} ${hh.toFixed(2)}`,
        `L ${(ww / 2).toFixed(2)} ${(hh - notch).toFixed(2)}`,
        `L 0 ${hh.toFixed(2)}`,
        'Z',
      ].join(' ');
    }
    case 'flower': {
      const cx = ww / 2;
      const cy = hh / 2;
      const R = Math.min(ww, hh) / 2;
      const petalR = R * 0.38;
      const ring = R * 0.55;
      const petals: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 6;
        const px = cx + Math.cos(a) * ring;
        const py = cy + Math.sin(a) * ring;
        petals.push(
          `M ${px.toFixed(2)} ${(py - petalR).toFixed(2)} A ${petalR.toFixed(2)} ${petalR.toFixed(2)} 0 1 1 ${px.toFixed(2)} ${(py + petalR).toFixed(2)} A ${petalR.toFixed(2)} ${petalR.toFixed(2)} 0 1 1 ${px.toFixed(2)} ${(py - petalR).toFixed(2)} Z`,
        );
      }
      const cr = R * 0.28;
      petals.push(
        `M ${cx.toFixed(2)} ${(cy - cr).toFixed(2)} A ${cr.toFixed(2)} ${cr.toFixed(2)} 0 1 1 ${cx.toFixed(2)} ${(cy + cr).toFixed(2)} A ${cr.toFixed(2)} ${cr.toFixed(2)} 0 1 1 ${cx.toFixed(2)} ${(cy - cr).toFixed(2)} Z`,
      );
      return petals.join(' ');
    }
    case 'leaf': {
      return scalePath(80, 100, ww, hh, [
        'M 40 2',
        'C 68 22, 78 48, 70 72',
        'C 62 90, 48 98, 40 98',
        'C 32 98, 18 90, 10 72',
        'C 2 48, 12 22, 40 2',
        'Z',
      ].join(' '));
    }
    case 'sparkle': {
      const cx = ww / 2;
      const cy = hh / 2;
      const long = Math.min(ww, hh) / 2;
      const mid = long * 0.22;
      const short = long * 0.12;
      // 4-point sparkle (diamond cross)
      return [
        `M ${cx.toFixed(2)} 0`,
        `L ${(cx + short).toFixed(2)} ${(cy - mid).toFixed(2)}`,
        `L ${ww.toFixed(2)} ${cy.toFixed(2)}`,
        `L ${(cx + short).toFixed(2)} ${(cy + mid).toFixed(2)}`,
        `L ${cx.toFixed(2)} ${hh.toFixed(2)}`,
        `L ${(cx - short).toFixed(2)} ${(cy + mid).toFixed(2)}`,
        `L 0 ${cy.toFixed(2)}`,
        `L ${(cx - short).toFixed(2)} ${(cy - mid).toFixed(2)}`,
        'Z',
      ].join(' ');
    }
    case 'arch':
      return `M 0 ${hh.toFixed(2)} L 0 ${(hh * 0.55).toFixed(2)} A ${(ww / 2).toFixed(2)} ${(hh * 0.55).toFixed(2)} 0 0 1 ${ww.toFixed(2)} ${(hh * 0.55).toFixed(2)} L ${ww.toFixed(2)} ${hh.toFixed(2)} Z`;
    case 'ring': {
      const cx = ww / 2;
      const cy = hh / 2;
      const rx = ww / 2;
      const ry = hh / 2;
      const irx = rx * 0.58;
      const iry = ry * 0.58;
      return [
        `M ${cx.toFixed(2)} 0 A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${cx.toFixed(2)} ${hh.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${cx.toFixed(2)} 0 Z`,
        `M ${cx.toFixed(2)} ${(cy - iry).toFixed(2)} A ${irx.toFixed(2)} ${iry.toFixed(2)} 0 1 0 ${cx.toFixed(2)} ${(cy + iry).toFixed(2)} A ${irx.toFixed(2)} ${iry.toFixed(2)} 0 1 0 ${cx.toFixed(2)} ${(cy - iry).toFixed(2)} Z`,
      ].join(' ');
    }
    case 'frame': {
      const inset = Math.min(ww, hh) * 0.14;
      const outer = roundedRectPath(ww, hh, Math.min(ww, hh) * 0.06);
      const iw = ww - inset * 2;
      const ih = hh - inset * 2;
      const ir = Math.min(iw, ih) * 0.05;
      const innerPath = [
        `M ${(inset + ir).toFixed(2)} ${inset.toFixed(2)}`,
        `H ${(inset + iw - ir).toFixed(2)}`,
        `Q ${(inset + iw).toFixed(2)} ${inset.toFixed(2)} ${(inset + iw).toFixed(2)} ${(inset + ir).toFixed(2)}`,
        `V ${(inset + ih - ir).toFixed(2)}`,
        `Q ${(inset + iw).toFixed(2)} ${(inset + ih).toFixed(2)} ${(inset + iw - ir).toFixed(2)} ${(inset + ih).toFixed(2)}`,
        `H ${(inset + ir).toFixed(2)}`,
        `Q ${inset.toFixed(2)} ${(inset + ih).toFixed(2)} ${inset.toFixed(2)} ${(inset + ih - ir).toFixed(2)}`,
        `V ${(inset + ir).toFixed(2)}`,
        `Q ${inset.toFixed(2)} ${inset.toFixed(2)} ${(inset + ir).toFixed(2)} ${inset.toFixed(2)}`,
        'Z',
      ].join(' ');
      return `${outer} ${innerPath}`;
    }
    case 'flourish': {
      // Decorative S-curve with end curls — stroke-only scrapbook flourish
      return scalePath(120, 40, ww, hh, [
        'M 4 28',
        'C 18 8, 36 4, 52 14',
        'C 68 24, 82 34, 100 22',
        'C 110 16, 116 10, 116 8',
      ].join(' '));
    }
    case 'rect':
    default: {
      return `M 0 0 H ${ww.toFixed(2)} V ${hh.toFixed(2)} H 0 Z`;
    }
  }
}

export function roundedRectPath(w: number, h: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r <= 0) return `M 0 0 H ${w} V ${h} H 0 Z`;
  return [
    `M ${r} 0`,
    `H ${w - r}`,
    `Q ${w} 0 ${w} ${r}`,
    `V ${h - r}`,
    `Q ${w} ${h} ${w - r} ${h}`,
    `H ${r}`,
    `Q 0 ${h} 0 ${h - r}`,
    `V ${r}`,
    `Q 0 0 ${r} 0`,
    'Z',
  ].join(' ');
}

export function shapePathForElement(kind: string | undefined, w: number, h: number, cornerRadius?: number): string {
  if ((kind || 'rect') === 'rect' && (cornerRadius || 0) > 0) {
    return roundedRectPath(w, h, cornerRadius || 0);
  }
  return shapeSvgPath(kind, w, h);
}

export interface ShapePreset {
  kind: ShapeKind;
  w: number;
  h: number;
  fill: string;
  opacity: number;
  strokeColor?: string;
  strokeWidth: number;
  cornerRadius?: number;
}

export const SHAPE_PRESETS: Record<ShapeKind, ShapePreset> = {
  rect:          { kind: 'rect',          w: 280, h: 160, fill: '#1A1A1A', opacity: 1, strokeWidth: 0, cornerRadius: 0 },
  circle:        { kind: 'circle',        w: 200, h: 200, fill: '#1A1A1A', opacity: 1, strokeWidth: 0 },
  oval:          { kind: 'oval',          w: 220, h: 160, fill: '#1A1A1A', opacity: 1, strokeWidth: 0 },
  line:          { kind: 'line',          w: 360, h: 24,  fill: 'transparent', opacity: 1, strokeColor: '#1A1A1A', strokeWidth: 4 },
  triangle:      { kind: 'triangle',      w: 200, h: 180, fill: '#1A1A1A', opacity: 1, strokeWidth: 0 },
  diamond:       { kind: 'diamond',       w: 180, h: 180, fill: '#1A1A1A', opacity: 1, strokeWidth: 0 },
  star:          { kind: 'star',          w: 200, h: 200, fill: '#C9A227', opacity: 1, strokeWidth: 0 },
  burst:         { kind: 'burst',         w: 200, h: 200, fill: '#C9A227', opacity: 1, strokeWidth: 0 },
  heart:         { kind: 'heart',         w: 200, h: 184, fill: '#C97B84', opacity: 1, strokeWidth: 0 },
  heart_outline: { kind: 'heart_outline', w: 200, h: 184, fill: 'transparent', opacity: 1, strokeColor: '#C97B84', strokeWidth: 5 },
  arrow:         { kind: 'arrow',         w: 260, h: 110, fill: '#1A1A1A', opacity: 1, strokeWidth: 0 },
  chevron:       { kind: 'chevron',       w: 160, h: 140, fill: '#1A1A1A', opacity: 1, strokeWidth: 0 },
  banner:        { kind: 'banner',        w: 300, h: 120, fill: '#A83442', opacity: 1, strokeWidth: 0 },
  flower:        { kind: 'flower',        w: 200, h: 200, fill: '#C97B84', opacity: 1, strokeWidth: 0 },
  leaf:          { kind: 'leaf',          w: 140, h: 200, fill: '#3D6B4F', opacity: 1, strokeWidth: 0 },
  sparkle:       { kind: 'sparkle',       w: 140, h: 140, fill: '#C9A227', opacity: 1, strokeWidth: 0 },
  arch:          { kind: 'arch',          w: 280, h: 160, fill: '#1A1A1A', opacity: 1, strokeWidth: 0 },
  ring:          { kind: 'ring',          w: 200, h: 200, fill: '#1A1A1A', opacity: 1, strokeWidth: 0 },
  frame:         { kind: 'frame',         w: 240, h: 240, fill: '#1A1A1A', opacity: 1, strokeWidth: 0 },
  flourish:      { kind: 'flourish',      w: 320, h: 70,  fill: 'transparent', opacity: 1, strokeColor: '#1A1A1A', strokeWidth: 3 },
};

export function newShapeElement(kind: ShapeKind, pageH: number, pageW = 600): {
  type: 'shape';
  shapeKind: ShapeKind;
  x: number; y: number; w: number; h: number; rotation: number;
  fill: string; opacity: number;
  strokeColor?: string; strokeWidth: number; cornerRadius?: number;
} {
  const p = SHAPE_PRESETS[kind];
  return {
    type: 'shape',
    shapeKind: kind,
    x: Math.round((pageW - p.w) / 2),
    y: Math.round((pageH - p.h) / 2),
    w: p.w,
    h: p.h,
    rotation: 0,
    fill: p.fill,
    opacity: p.opacity,
    strokeColor: p.strokeColor,
    strokeWidth: p.strokeWidth,
    cornerRadius: p.cornerRadius,
  };
}
