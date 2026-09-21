/** Admin UI color + typography palettes — persisted in localStorage, applied live. */

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
  /** Display headings (maps to --admin-font-serif) */
  fontSerif: string;
  /** UI / body (maps to --admin-font-sans) */
  fontSans: string;
  /** Back-compat aliases used across admin pages */
  blush: string;
  blushSoft: string;
  blushDeep: string;
};

export type AdminPaletteId =
  | 'standard'
  | 'blush'
  | 'lilac'
  | 'petal'
  | 'cream'
  | 'porcelain'
  | 'sakura'
  | 'powder';

export type AdminPalette = {
  id: AdminPaletteId;
  name: string;
  /** One-line vibe for the picker */
  tagline: string;
  /** Short swatch colors for the picker UI [bg, accent, soft] */
  swatches: [string, string, string];
  tokens: AdminTokens;
};

const SERIF_PLAYFAIR = "'Playfair Display', Georgia, serif";
const SERIF_CORMORANT = "'Cormorant Garamond', Georgia, serif";
const SANS_INTER = "'Inter', system-ui, sans-serif";
const SANS_RALWAY = "'Raleway', system-ui, sans-serif";
const SANS_MONTSERRAT = "'Montserrat', system-ui, sans-serif";

function withAliases(
  t: Omit<AdminTokens, 'blush' | 'blushSoft' | 'blushDeep'>,
): AdminTokens {
  return {
    ...t,
    blush: t.accent,
    blushSoft: t.accentSoft,
    blushDeep: t.accentDeep,
  };
}

export const ADMIN_PALETTES: AdminPalette[] = [
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'Soft peony · house look',
    swatches: ['#FFF6F8', '#E86B84', '#FFE8EE'],
    tokens: withAliases({
      bg: '#FFF8FA',
      sidebar: '#FFF1F5',
      sidebarHover: '#FFE4EC',
      sidebarActive: '#FFD6E2',
      sidebarText: '#9A6474',
      sidebarTextActive: '#4A2234',
      sidebarLine: '#F3D4DE',
      accent: '#E86B84',
      accentSoft: '#FFE8EE',
      accentDeep: '#C44D66',
      ink: '#3A1F2C',
      muted: '#8B6572',
      card: '#FFFFFF',
      line: '#F0D8E0',
      success: '#0F766E',
      warn: '#B45309',
      fontSerif: SERIF_PLAYFAIR,
      fontSans: SANS_INTER,
    }),
  },
  {
    id: 'blush',
    name: 'Blush',
    tagline: 'Dusty rose · warm',
    swatches: ['#FBF5F2', '#C97B88', '#F5E6E4'],
    tokens: withAliases({
      bg: '#FBF7F5',
      sidebar: '#F8EFEC',
      sidebarHover: '#F0DFDA',
      sidebarActive: '#E8D2CC',
      sidebarText: '#8F6B68',
      sidebarTextActive: '#4A2E2C',
      sidebarLine: '#E8D5D0',
      accent: '#C97B88',
      accentSoft: '#F5E6E4',
      accentDeep: '#A85A68',
      ink: '#3F2A28',
      muted: '#8A6E6A',
      card: '#FFFFFF',
      line: '#EADDD8',
      success: '#0F766E',
      warn: '#B45309',
      fontSerif: SERIF_CORMORANT,
      fontSans: SANS_RALWAY,
    }),
  },
  {
    id: 'lilac',
    name: 'Lilac',
    tagline: 'Soft violet · dreamy',
    swatches: ['#F7F4FB', '#A78BBE', '#EDE6F7'],
    tokens: withAliases({
      bg: '#F9F6FC',
      sidebar: '#F3EEF9',
      sidebarHover: '#E9E0F4',
      sidebarActive: '#DDD2EC',
      sidebarText: '#7A6A94',
      sidebarTextActive: '#3D2F55',
      sidebarLine: '#DDD0EC',
      accent: '#A78BBE',
      accentSoft: '#EDE6F7',
      accentDeep: '#8569A8',
      ink: '#2F2545',
      muted: '#716688',
      card: '#FFFFFF',
      line: '#E4DCEF',
      success: '#0F766E',
      warn: '#B45309',
      fontSerif: SERIF_PLAYFAIR,
      fontSans: SANS_INTER,
    }),
  },
  {
    id: 'petal',
    name: 'Petal',
    tagline: 'Candy pink · playful',
    swatches: ['#FFF8FB', '#EC6AA8', '#FCE7F3'],
    tokens: withAliases({
      bg: '#FFF9FC',
      sidebar: '#FFF1F7',
      sidebarHover: '#FCE4EF',
      sidebarActive: '#F9D0E4',
      sidebarText: '#A85888',
      sidebarTextActive: '#6B2148',
      sidebarLine: '#F5D0E4',
      accent: '#EC6AA8',
      accentSoft: '#FCE7F3',
      accentDeep: '#DB2777',
      ink: '#4A1D36',
      muted: '#916078',
      card: '#FFFFFF',
      line: '#F5D6E6',
      success: '#0F766E',
      warn: '#B45309',
      fontSerif: SERIF_CORMORANT,
      fontSans: SANS_MONTSERRAT,
    }),
  },
  {
    id: 'cream',
    name: 'Cream',
    tagline: 'Champagne · soft gold',
    swatches: ['#FBF7F0', '#C9A87C', '#F3EBD8'],
    tokens: withAliases({
      bg: '#FBF8F2',
      sidebar: '#F7F1E6',
      sidebarHover: '#EEE4D2',
      sidebarActive: '#E5D7BE',
      sidebarText: '#8A7A5E',
      sidebarTextActive: '#3F3424',
      sidebarLine: '#E5D7BE',
      accent: '#C9A87C',
      accentSoft: '#F3EBD8',
      accentDeep: '#A88858',
      ink: '#3A3124',
      muted: '#7A6E58',
      card: '#FFFFFF',
      line: '#E8DFD0',
      success: '#0F766E',
      warn: '#B45309',
      fontSerif: SERIF_CORMORANT,
      fontSans: SANS_RALWAY,
    }),
  },
  {
    id: 'porcelain',
    name: 'Porcelain',
    tagline: 'Clean white · whisper pink',
    swatches: ['#FAF8F7', '#E8A0B0', '#FCEEF1'],
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
      fontSerif: SERIF_PLAYFAIR,
      fontSans: SANS_INTER,
    }),
  },
  {
    id: 'sakura',
    name: 'Sakura',
    tagline: 'Cherry soft · fresh',
    swatches: ['#FFF6F4', '#E88B86', '#FFE8E4'],
    tokens: withAliases({
      bg: '#FFF8F6',
      sidebar: '#FFF2EF',
      sidebarHover: '#FFE4DE',
      sidebarActive: '#FFD5CC',
      sidebarText: '#A86B66',
      sidebarTextActive: '#5C2E2A',
      sidebarLine: '#F5D5CE',
      accent: '#E88B86',
      accentSoft: '#FFE8E4',
      accentDeep: '#D46E68',
      ink: '#3D2422',
      muted: '#8B6A66',
      card: '#FFFFFF',
      line: '#F0DCD8',
      success: '#0F766E',
      warn: '#B45309',
      fontSerif: SERIF_CORMORANT,
      fontSans: SANS_RALWAY,
    }),
  },
  {
    id: 'powder',
    name: 'Powder',
    tagline: 'Sky soft · cool calm',
    swatches: ['#F5F8FB', '#8BAFCA', '#E4EEF5'],
    tokens: withAliases({
      bg: '#F5F8FB',
      sidebar: '#EEF3F8',
      sidebarHover: '#E0EAF2',
      sidebarActive: '#D0DEEA',
      sidebarText: '#6A8094',
      sidebarTextActive: '#2A3A4A',
      sidebarLine: '#D0DEEA',
      accent: '#8BAFCA',
      accentSoft: '#E4EEF5',
      accentDeep: '#5A849E',
      ink: '#243040',
      muted: '#657888',
      card: '#FFFFFF',
      line: '#D8E2EA',
      success: '#0F766E',
      warn: '#B45309',
      fontSerif: SERIF_PLAYFAIR,
      fontSans: SANS_INTER,
    }),
  },
];

/** Bumped when palette ids / shape change (v2 → v3: Standard + typography). */
export const ADMIN_PALETTE_STORAGE_KEY = 'perg_admin_palette_v3';
export const DEFAULT_ADMIN_PALETTE_ID: AdminPaletteId = 'standard';

/** Map legacy stored ids onto the new set. */
const LEGACY_PALETTE_MAP: Record<string, AdminPaletteId> = {
  peony: 'standard',
  roseate: 'blush',
  champagne: 'cream',
  mist: 'powder',
  coral: 'sakura',
  midnight: 'porcelain',
};

export function getAdminPalette(id: string | null | undefined): AdminPalette {
  return ADMIN_PALETTES.find((p) => p.id === id) || ADMIN_PALETTES[0];
}

export function readStoredAdminPaletteId(): AdminPaletteId {
  try {
    const raw = localStorage.getItem(ADMIN_PALETTE_STORAGE_KEY);
    if (raw && ADMIN_PALETTES.some((p) => p.id === raw)) return raw as AdminPaletteId;
    // Migrate from v2 key if present
    const legacy = localStorage.getItem('perg_admin_palette_v2');
    if (legacy) {
      const mapped = LEGACY_PALETTE_MAP[legacy] || (ADMIN_PALETTES.some((p) => p.id === legacy) ? legacy as AdminPaletteId : null);
      if (mapped) {
        localStorage.setItem(ADMIN_PALETTE_STORAGE_KEY, mapped);
        return mapped;
      }
    }
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

/** Push typography CSS vars onto the admin shell element. */
export function applyAdminTypography(el: HTMLElement | null, tokens: AdminTokens): void {
  if (!el) return;
  el.style.setProperty('--admin-font-serif', tokens.fontSerif);
  el.style.setProperty('--admin-font-sans', tokens.fontSans);
}
