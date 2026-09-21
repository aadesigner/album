/** Admin UI color palettes — persisted in localStorage, applied live. */

export type AdminTokens = {
  bg: string;
  sidebar: string;
  sidebarHover: string;
  sidebarActive: string;
  sidebarText: string;
  sidebarTextActive: string;
  /** Hairline rules inside the sidebar / mobile bar */
  sidebarLine: string;
  accent: string;
  accentSoft: string;
  accentDeep: string;
  ink: string;
  muted: string;
  card: string;
  line: string;
  success: string;
  warn: string;
  /** Back-compat aliases used across admin pages */
  blush: string;
  blushSoft: string;
  blushDeep: string;
};

export type AdminPaletteId =
  | 'peony'
  | 'roseate'
  | 'lilac'
  | 'petal'
  | 'champagne'
  | 'porcelain'
  | 'sakura'
  | 'mist'
  | 'coral'
  | 'midnight';

export type AdminPalette = {
  id: AdminPaletteId;
  name: string;
  /** Short swatch colors for the picker UI */
  swatches: [string, string, string];
  tokens: AdminTokens;
};

function withAliases(t: Omit<AdminTokens, 'blush' | 'blushSoft' | 'blushDeep'>): AdminTokens {
  return {
    ...t,
    blush: t.accent,
    blushSoft: t.accentSoft,
    blushDeep: t.accentDeep,
  };
}

export const ADMIN_PALETTES: AdminPalette[] = [
  {
    id: 'peony',
    name: 'Peony',
    swatches: ['#FFF5F7', '#E85A7A', '#FFE4EC'],
    tokens: withAliases({
      bg: '#FFF7F9',
      sidebar: '#FFF0F4',
      sidebarHover: '#FFE0E8',
      sidebarActive: '#FFD0DC',
      sidebarText: '#9A5A6E',
      sidebarTextActive: '#5C2438',
      sidebarLine: '#F5D0DA',
      accent: '#E85A7A',
      accentSoft: '#FFE4EC',
      accentDeep: '#C43D5C',
      ink: '#3D1F2A',
      muted: '#8B6572',
      card: '#FFFFFF',
      line: '#F3D6DE',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
  {
    id: 'roseate',
    name: 'Roseate',
    swatches: ['#FBF4F1', '#C97B84', '#F3E4E0'],
    tokens: withAliases({
      bg: '#FBF6F3',
      sidebar: '#F8EEEA',
      sidebarHover: '#F0DDD6',
      sidebarActive: '#E8CFC6',
      sidebarText: '#8F6B66',
      sidebarTextActive: '#4A2E2A',
      sidebarLine: '#E8D5CE',
      accent: '#C97B84',
      accentSoft: '#F5E4E6',
      accentDeep: '#A85A64',
      ink: '#3F2A28',
      muted: '#8A6E6A',
      card: '#FFFFFF',
      line: '#EADDD8',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
  {
    id: 'lilac',
    name: 'Lilac',
    swatches: ['#F7F4FB', '#9B7EBD', '#EDE6F7'],
    tokens: withAliases({
      bg: '#F8F5FC',
      sidebar: '#F3EEF9',
      sidebarHover: '#E8DFF3',
      sidebarActive: '#DDD0EC',
      sidebarText: '#7A6A94',
      sidebarTextActive: '#3D2F55',
      sidebarLine: '#DDD0EC',
      accent: '#9B7EBD',
      accentSoft: '#EDE6F7',
      accentDeep: '#7A5FA0',
      ink: '#2F2545',
      muted: '#716688',
      card: '#FFFFFF',
      line: '#E4DCEF',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
  {
    id: 'petal',
    name: 'Petal',
    swatches: ['#FFF8FB', '#F472B6', '#FCE7F3'],
    tokens: withAliases({
      bg: '#FFF9FC',
      sidebar: '#FFF1F7',
      sidebarHover: '#FCE4EF',
      sidebarActive: '#F9D0E4',
      sidebarText: '#A85888',
      sidebarTextActive: '#6B2148',
      sidebarLine: '#F5D0E4',
      accent: '#EC4899',
      accentSoft: '#FCE7F3',
      accentDeep: '#DB2777',
      ink: '#4A1D36',
      muted: '#916078',
      card: '#FFFFFF',
      line: '#F5D6E6',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
  {
    id: 'champagne',
    name: 'Champagne',
    swatches: ['#FBF7F0', '#C4A574', '#F3EBD8'],
    tokens: withAliases({
      bg: '#FBF8F2',
      sidebar: '#F7F1E6',
      sidebarHover: '#EEE4D2',
      sidebarActive: '#E5D7BE',
      sidebarText: '#8A7A5E',
      sidebarTextActive: '#3F3424',
      sidebarLine: '#E5D7BE',
      accent: '#C4A574',
      accentSoft: '#F3EBD8',
      accentDeep: '#A68654',
      ink: '#3A3124',
      muted: '#7A6E58',
      card: '#FFFFFF',
      line: '#E8DFD0',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
  {
    id: 'porcelain',
    name: 'Porcelain',
    swatches: ['#FFFFFF', '#E8A0B0', '#F4F1EF'],
    tokens: withAliases({
      bg: '#F7F5F3',
      sidebar: '#FFFFFF',
      sidebarHover: '#F5F0EE',
      sidebarActive: '#F0E8E6',
      sidebarText: '#8A7A78',
      sidebarTextActive: '#3A2E2C',
      sidebarLine: '#EDE6E3',
      accent: '#E8A0B0',
      accentSoft: '#FCEEF1',
      accentDeep: '#D48496',
      ink: '#2C2422',
      muted: '#7A6E6C',
      card: '#FFFFFF',
      line: '#E8E2DF',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
  {
    id: 'sakura',
    name: 'Sakura',
    swatches: ['#FFF5F3', '#F0908A', '#FFE8E4'],
    tokens: withAliases({
      bg: '#FFF8F6',
      sidebar: '#FFF2EF',
      sidebarHover: '#FFE4DE',
      sidebarActive: '#FFD5CC',
      sidebarText: '#A86B66',
      sidebarTextActive: '#5C2E2A',
      sidebarLine: '#F5D5CE',
      accent: '#F0908A',
      accentSoft: '#FFE8E4',
      accentDeep: '#D46E68',
      ink: '#3D2422',
      muted: '#8B6A66',
      card: '#FFFFFF',
      line: '#F0DCD8',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
  {
    id: 'mist',
    name: 'Mist',
    swatches: ['#F4F7FA', '#7BA3C4', '#E4EEF5'],
    tokens: withAliases({
      bg: '#F5F8FB',
      sidebar: '#EEF3F8',
      sidebarHover: '#E0EAF2',
      sidebarActive: '#D0DEEA',
      sidebarText: '#6A8094',
      sidebarTextActive: '#2A3A4A',
      sidebarLine: '#D0DEEA',
      accent: '#7BA3C4',
      accentSoft: '#E4EEF5',
      accentDeep: '#5A849E',
      ink: '#243040',
      muted: '#657888',
      card: '#FFFFFF',
      line: '#D8E2EA',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
  {
    id: 'coral',
    name: 'Coral open',
    swatches: ['#FFF6F4', '#E85A6B', '#FFE6E2'],
    tokens: withAliases({
      bg: '#FFF8F6',
      sidebar: '#FFF1EE',
      sidebarHover: '#FFE2DC',
      sidebarActive: '#FFD2C8',
      sidebarText: '#A85A58',
      sidebarTextActive: '#5C2428',
      sidebarLine: '#F5D0C8',
      accent: '#E85A6B',
      accentSoft: '#FCE8EB',
      accentDeep: '#C43D4E',
      ink: '#3A1E22',
      muted: '#8B5E62',
      card: '#FFFFFF',
      line: '#F0D8D4',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
  {
    id: 'midnight',
    name: 'Midnight',
    swatches: ['#12141A', '#E85A7A', '#EEF0F4'],
    tokens: withAliases({
      bg: '#EEF0F4',
      sidebar: '#12141A',
      sidebarHover: '#1C1F28',
      sidebarActive: '#262B36',
      sidebarText: '#9AA3B2',
      sidebarTextActive: '#FFFFFF',
      sidebarLine: 'rgba(255,255,255,0.08)',
      accent: '#E85A7A',
      accentSoft: '#FCE8EB',
      accentDeep: '#C43D5C',
      ink: '#12141A',
      muted: '#5A6370',
      card: '#FFFFFF',
      line: '#DDE1E8',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
];

/** Bumped so older dark-only palette ids fall back cleanly. */
export const ADMIN_PALETTE_STORAGE_KEY = 'perg_admin_palette_v2';
export const DEFAULT_ADMIN_PALETTE_ID: AdminPaletteId = 'peony';

export function getAdminPalette(id: string | null | undefined): AdminPalette {
  return ADMIN_PALETTES.find((p) => p.id === id) || ADMIN_PALETTES[0];
}

export function readStoredAdminPaletteId(): AdminPaletteId {
  try {
    const raw = localStorage.getItem(ADMIN_PALETTE_STORAGE_KEY);
    if (raw && ADMIN_PALETTES.some((p) => p.id === raw)) return raw as AdminPaletteId;
  } catch {
    // private mode / SSR
  }
  return DEFAULT_ADMIN_PALETTE_ID;
}

export function writeStoredAdminPaletteId(id: AdminPaletteId): void {
  try {
    localStorage.setItem(ADMIN_PALETTE_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

/** Apply palette tokens onto a shared ADMIN object (in-place) so all pages pick them up on re-render. */
export function applyAdminTokens(target: AdminTokens, tokens: AdminTokens): void {
  (Object.keys(tokens) as (keyof AdminTokens)[]).forEach((k) => {
    target[k] = tokens[k];
  });
}
