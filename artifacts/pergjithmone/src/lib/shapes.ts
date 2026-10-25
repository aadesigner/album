/** Cover decoration kinds — kept as strings so older saves still load. */
export type ShapeKind =
  | 'rect'
  | 'circle'
  | 'line'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'heart'
  | 'arch'
  | 'ring';

export const SHAPE_KINDS: ShapeKind[] = [
  'rect', 'circle', 'line', 'triangle', 'diamond', 'star', 'heart', 'arch', 'ring',
];

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  rect: 'Rectangle',
  circle: 'Circle',
  line: 'Line',
  triangle: 'Triangle',
  diamond: 'Diamond',
  star: 'Star',
  heart: 'Heart',
  arch: 'Arch',
  ring: 'Ring',
};

export const STROKE_ONLY_SHAPES = new Set<string>(['line', 'ring']);
export const KEEP_RATIO_SHAPES = new Set<string>(['circle', 'star', 'heart', 'diamond', 'ring']);

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

/** SVG path in local 0,0 → w,h. Ring uses evenodd. */
export function shapeSvgPath(kind: string | undefined, w: number, h: number): string {
  const ww = Math.max(1, w);
  const hh = Math.max(1, h);
  switch (kind) {
    case 'circle': {
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
      return starPoints(ww / 2, hh / 2, or, ir);
    }
    case 'heart':
      return [
        `M ${(ww / 2).toFixed(2)} ${(hh * 0.34).toFixed(2)}`,
        `C ${(ww * 0.18).toFixed(2)} ${(hh * 0.02).toFixed(2)}, 0 ${(hh * 0.28).toFixed(2)}, ${(ww / 2).toFixed(2)} ${(hh * 0.96).toFixed(2)}`,
        `C ${ww.toFixed(2)} ${(hh * 0.28).toFixed(2)}, ${(ww * 0.82).toFixed(2)} ${(hh * 0.02).toFixed(2)}, ${(ww / 2).toFixed(2)} ${(hh * 0.34).toFixed(2)}`,
        'Z',
      ].join(' ');
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
    case 'rect':
    default: {
      const r = 0;
      if (r <= 0) return `M 0 0 H ${ww.toFixed(2)} V ${hh.toFixed(2)} H 0 Z`;
      return roundedRectPath(ww, hh, r);
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
  if (kind === 'circle') return shapeSvgPath('circle', w, h);
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
  rect:     { kind: 'rect',     w: 280, h: 160, fill: '#1A1A1A', opacity: 0.9,  strokeWidth: 0, cornerRadius: 0 },
  circle:   { kind: 'circle',   w: 200, h: 200, fill: '#1A1A1A', opacity: 0.9,  strokeWidth: 0 },
  line:     { kind: 'line',     w: 360, h: 24,  fill: 'transparent', opacity: 1, strokeColor: '#1A1A1A', strokeWidth: 4 },
  triangle: { kind: 'triangle', w: 200, h: 180, fill: '#1A1A1A', opacity: 0.9,  strokeWidth: 0 },
  diamond:  { kind: 'diamond',  w: 180, h: 180, fill: '#1A1A1A', opacity: 0.9,  strokeWidth: 0 },
  star:     { kind: 'star',     w: 200, h: 200, fill: '#C9A227', opacity: 0.95, strokeWidth: 0 },
  heart:    { kind: 'heart',    w: 200, h: 180, fill: '#C97B84', opacity: 0.95, strokeWidth: 0 },
  arch:     { kind: 'arch',     w: 280, h: 160, fill: '#1A1A1A', opacity: 0.88, strokeWidth: 0 },
  ring:     { kind: 'ring',     w: 200, h: 200, fill: '#1A1A1A', opacity: 0.9,  strokeWidth: 0 },
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
