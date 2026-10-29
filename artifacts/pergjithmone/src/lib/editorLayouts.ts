import {
  DESIGN_W,
  LAYOUTS,
  LAYOUT_CATEGORY_LABELS,
  RETIRED_LAYOUT_IDS,
  type EditorElement,
  type LayoutDef,
  type LayoutZone,
} from './designs';

export function parseAdminLayoutZones(json: string): LayoutZone[] {
  try {
    const parsed = JSON.parse(json);
    const raw = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.cells)
        ? parsed.cells
        : Array.isArray(parsed?.zones)
          ? parsed.zones
          : [];
    return raw
      .map((c: { x?: unknown; y?: unknown; w?: unknown; h?: unknown; type?: unknown; rotation?: unknown }) => {
        const rotation = Number(c.rotation);
        return {
          x: Number(c.x) || 0,
          y: Number(c.y) || 0,
          w: Math.max(0.05, Number(c.w) || 0.2),
          h: Math.max(0.05, Number(c.h) || 0.2),
          type: String(c.type || '').toLowerCase() === 'text' ? 'text' : 'photo',
          ...(Number.isFinite(rotation) && Math.abs(rotation) > 0.2 ? { rotation } : {}),
        };
      })
      .filter((c: LayoutZone) => c.w > 0 && c.h > 0);
  } catch {
    return [];
  }
}

/** Matches Konva text padding in the editor / PDF / page thumbs. */
export const LAYOUT_TEXT_PADDING = 6;

/**
 * Layout builder CSS rotates around the box center (`transform-origin: center`).
 * Konva rotates around the top-left of the group. Convert so inserted zones
 * land where the admin placed them.
 */
export function layoutZoneCanvasRect(
  z: LayoutZone,
  canvasH: number,
): { x: number; y: number; w: number; h: number; rotation: number } {
  const w = z.w * DESIGN_W;
  const h = z.h * canvasH;
  const x0 = z.x * DESIGN_W;
  const y0 = z.y * canvasH;
  const rotation = z.rotation ?? 0;
  if (Math.abs(rotation) < 0.2) {
    return { x: x0, y: y0, w, h, rotation: 0 };
  }
  const rad = (rotation * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 2;
  return {
    x: x0 + cx - (Math.cos(rad) * cx - Math.sin(rad) * cy),
    y: y0 + cy - (Math.sin(rad) * cx + Math.cos(rad) * cy),
    w,
    h,
    rotation,
  };
}

/** Fit ~2 lines of 1.2 line-height inside the zone (after Konva padding). */
export function layoutTextFontSize(boxH: number): number {
  const inner = Math.max(20, boxH - LAYOUT_TEXT_PADDING * 2);
  return Math.max(14, Math.min(56, Math.round(inner / 2.2)));
}

export function layoutPlaceholderText(lang: 'sq' | 'en' = 'en'): string {
  return lang === 'sq' ? 'Shto tekstin tënd...' : 'Your text here...';
}

/** Map a saved layout zone onto the live editor canvas. */
export function layoutZoneToElement(
  z: LayoutZone,
  canvasH: number,
  opts: { id: string; lang?: 'sq' | 'en'; text?: string },
): EditorElement {
  const rect = layoutZoneCanvasRect(z, canvasH);
  if (z.type === 'photo') {
    return { id: opts.id, type: 'placeholder', ...rect };
  }
  return {
    id: opts.id,
    type: 'text',
    ...rect,
    text: opts.text ?? layoutPlaceholderText(opts.lang),
    fontSize: layoutTextFontSize(rect.h),
    fontFamily: 'Georgia, serif',
    fill: '#1a1a1a',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
  };
}

function parseSavedCategory(json: string): string | null {
  try {
    const parsed = JSON.parse(json);
    return typeof parsed?.category === 'string' ? parsed.category : null;
  } catch {
    return null;
  }
}

function categoryForZones(zones: LayoutZone[], saved?: string | null): string {
  if (saved && LAYOUT_CATEGORY_LABELS[saved]) return saved;
  const photos = zones.filter((z) => z.type === 'photo').length;
  if (photos <= 1) return '1 Photo';
  if (photos === 2) return '2 Photos';
  if (photos === 3) return '3 Photos';
  return '4 Photos';
}

export function mergeEditorLayouts(
  dbLayouts: {
    slug: string;
    nameAl: string;
    nameEn: string;
    gridDefinitionJson: string;
    isActive: boolean;
  }[] | undefined,
): LayoutDef[] {
  const byId = new Map<string, LayoutDef>(LAYOUTS.map((l) => [l.id, l]));
  for (const row of dbLayouts || []) {
    if (!row.isActive || RETIRED_LAYOUT_IDS.has(row.slug)) continue;
    const zones = parseAdminLayoutZones(row.gridDefinitionJson);
    if (!zones.length) continue;
    byId.set(row.slug, {
      id: row.slug,
      category: categoryForZones(zones, parseSavedCategory(row.gridDefinitionJson)),
      label: { sq: row.nameAl, en: row.nameEn },
      zones,
    });
  }
  return [...byId.values()].filter(
    (l) => !RETIRED_LAYOUT_IDS.has(l.id) && !!LAYOUT_CATEGORY_LABELS[l.category],
  );
}
