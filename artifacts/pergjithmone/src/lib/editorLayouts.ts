import {
  LAYOUTS,
  LAYOUT_CATEGORY_LABELS,
  RETIRED_LAYOUT_IDS,
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
      .map((c: { x?: unknown; y?: unknown; w?: unknown; h?: unknown; type?: unknown; rotation?: unknown }) => ({
        x: Number(c.x) || 0,
        y: Number(c.y) || 0,
        w: Math.max(0.05, Number(c.w) || 0.2),
        h: Math.max(0.05, Number(c.h) || 0.2),
        type: c.type === 'text' ? 'text' : 'photo',
        ...(typeof c.rotation === 'number' ? { rotation: c.rotation } : {}),
      }))
      .filter((c: LayoutZone) => c.w > 0 && c.h > 0);
  } catch {
    return [];
  }
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
