/** Admin UI color palettes — persisted in localStorage, applied live. */

export type AdminTokens = {
  bg: string;
  sidebar: string;
  sidebarHover: string;
  sidebarActive: string;
  sidebarText: string;
  sidebarTextActive: string;
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
  | 'coral'
  | 'ocean'
  | 'forest'
  | 'midnight'
  | 'copper'
  | 'ink'
  | 'slate';

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
    id: 'coral',
    name: 'Coral',
    swatches: ['#12141A', '#E85A6B', '#EEF0F4'],
    tokens: withAliases({
      bg: '#EEF0F4',
      sidebar: '#12141A',
      sidebarHover: '#1C1F28',
      sidebarActive: '#262B36',
      sidebarText: '#9AA3B2',
      sidebarTextActive: '#FFFFFF',
      accent: '#E85A6B',
      accentSoft: '#FCE8EB',
      accentDeep: '#C43D4E',
      ink: '#12141A',
      muted: '#5A6370',
      card: '#FFFFFF',
      line: '#DDE1E8',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
  {
    id: 'ocean',
    name: 'Ocean',
    swatches: ['#0B1C24', '#0D9488', '#E8F1F4'],
    tokens: withAliases({
      bg: '#E8F1F4',
      sidebar: '#0B1C24',
      sidebarHover: '#123040',
      sidebarActive: '#1A3D4F',
      sidebarText: '#8FA8B3',
      sidebarTextActive: '#FFFFFF',
      accent: '#0D9488',
      accentSoft: '#D5F5F0',
      accentDeep: '#0F766E',
      ink: '#0B1C24',
      muted: '#4F6670',
      card: '#FFFFFF',
      line: '#C9D9DF',
      success: '#059669',
      warn: '#D97706',
    }),
  },
  {
    id: 'forest',
    name: 'Forest',
    swatches: ['#14201A', '#3D8B6E', '#EAEFEA'],
    tokens: withAliases({
      bg: '#EAEFEA',
      sidebar: '#14201A',
      sidebarHover: '#1C2E24',
      sidebarActive: '#264033',
      sidebarText: '#95A89C',
      sidebarTextActive: '#FFFFFF',
      accent: '#3D8B6E',
      accentSoft: '#DCEEE5',
      accentDeep: '#2F6B54',
      ink: '#14201A',
      muted: '#54665C',
      card: '#FFFFFF',
      line: '#CDD8CF',
      success: '#15803D',
      warn: '#B45309',
    }),
  },
  {
    id: 'midnight',
    name: 'Midnight',
    swatches: ['#0A0C12', '#5B8DEF', '#E9ECF3'],
    tokens: withAliases({
      bg: '#E9ECF3',
      sidebar: '#0A0C12',
      sidebarHover: '#141824',
      sidebarActive: '#1E2433',
      sidebarText: '#8B93A7',
      sidebarTextActive: '#FFFFFF',
      accent: '#5B8DEF',
      accentSoft: '#E0E9FB',
      accentDeep: '#3B6FD4',
      ink: '#0A0C12',
      muted: '#5A6275',
      card: '#FFFFFF',
      line: '#D0D5E0',
      success: '#0F766E',
      warn: '#D97706',
    }),
  },
  {
    id: 'copper',
    name: 'Copper',
    swatches: ['#1A1512', '#C47A3A', '#F2EEE9'],
    tokens: withAliases({
      bg: '#F2EEE9',
      sidebar: '#1A1512',
      sidebarHover: '#2A221C',
      sidebarActive: '#3A2F27',
      sidebarText: '#A8988C',
      sidebarTextActive: '#FFFFFF',
      accent: '#C47A3A',
      accentSoft: '#F5E6D8',
      accentDeep: '#A35F28',
      ink: '#1A1512',
      muted: '#6B5E54',
      card: '#FFFFFF',
      line: '#E0D8CF',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
  {
    id: 'ink',
    name: 'Ink',
    swatches: ['#000000', '#E11D48', '#F4F4F5'],
    tokens: withAliases({
      bg: '#F4F4F5',
      sidebar: '#000000',
      sidebarHover: '#171717',
      sidebarActive: '#262626',
      sidebarText: '#A3A3A3',
      sidebarTextActive: '#FFFFFF',
      accent: '#E11D48',
      accentSoft: '#FFE4E8',
      accentDeep: '#BE123C',
      ink: '#09090B',
      muted: '#52525B',
      card: '#FFFFFF',
      line: '#E4E4E7',
      success: '#059669',
      warn: '#D97706',
    }),
  },
  {
    id: 'slate',
    name: 'Slate',
    swatches: ['#1E293B', '#64748B', '#F1F5F9'],
    tokens: withAliases({
      bg: '#F1F5F9',
      sidebar: '#1E293B',
      sidebarHover: '#273548',
      sidebarActive: '#334155',
      sidebarText: '#94A3B8',
      sidebarTextActive: '#FFFFFF',
      accent: '#64748B',
      accentSoft: '#E2E8F0',
      accentDeep: '#475569',
      ink: '#0F172A',
      muted: '#64748B',
      card: '#FFFFFF',
      line: '#E2E8F0',
      success: '#0F766E',
      warn: '#B45309',
    }),
  },
];

export const ADMIN_PALETTE_STORAGE_KEY = 'perg_admin_palette_v1';
export const DEFAULT_ADMIN_PALETTE_ID: AdminPaletteId = 'coral';

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
