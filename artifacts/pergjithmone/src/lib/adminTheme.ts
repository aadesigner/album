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
  /** Optional soft wash behind the sidebar (CSS gradient) */
  sidebarWash: string;
  accent: string;
  accentSoft: string;
  accentDeep: string;
  ink: string;
  muted: string;
  card: string;
  line: string;
  success: string;
  warn: string;
  /** Corner radius used by the shell chrome */
  radius: string;
  /** Display / headings */
  fontSerif: string;
  /** UI / body */
  fontSans: string;
  /** Human-readable type pair for the picker */
  typePair: string;
  /** Back-compat aliases used across admin pages */
  blush: string;
  blushSoft: string;
  blushDeep: string;
};

export type AdminPaletteId =
  | 'standard'
  | 'ballet'
  | 'orchid'
  | 'honey'
  | 'ink'
  | 'matcha'
  | 'merlot'
  | 'cloud';

export type AdminPalette = {
  id: AdminPaletteId;
  name: string;
  tagline: string;
  /** [bg, accent, soft] for swatch strips */
  swatches: [string, string, string];
  tokens: AdminTokens;
};

/* Distinct faces — each palette gets a unique pairing so switching themes
   changes the *voice* of the admin, not just the pink. */
const FRAUNCES = "'Fraunces', Georgia, serif";
const INSTRUMENT = "'Instrument Serif', Georgia, serif";
const LIBRE = "'Libre Baskerville', Georgia, serif";
const LORA = "'Lora', Georgia, serif";
const PLAYFAIR = "'Playfair Display', Georgia, serif";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const OUTFIT = "'Outfit', system-ui, sans-serif";
const DM_SANS = "'DM Sans', system-ui, sans-serif";
const JOSEFIN = "'Josefin Sans', system-ui, sans-serif";
const NUNITO = "'Nunito', system-ui, sans-serif";
const SPACE = "'Space Grotesk', system-ui, sans-serif";
const RALEWAY = "'Raleway', system-ui, sans-serif";
const MONTSERRAT = "'Montserrat', system-ui, sans-serif";
const INTER = "'Inter', system-ui, sans-serif";

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
    name: 'Peony',
    tagline: 'House default · soft rose',
    swatches: ['#FFF5F8', '#E25575', '#FFDCE6'],
    tokens: withAliases({
      bg: '#FFF7FA',
      sidebar: '#FFEBF1',
      sidebarHover: '#FFD9E4',
      sidebarActive: '#FFC8D8',
      sidebarText: '#9A5A6C',
      sidebarTextActive: '#3F1528',
      sidebarLine: '#F5CDD8',
      sidebarWash: 'linear-gradient(175deg, #FFE0EA 0%, #FFF0F4 38%, #FFEBF1 100%)',
      accent: '#E25575',
      accentSoft: '#FFE3EB',
      accentDeep: '#C23A58',
      ink: '#2E1420',
      muted: '#8A5A68',
      card: '#FFFFFF',
      line: '#F0D4DE',
      success: '#0F766E',
      warn: '#B45309',
      radius: '1.15rem',
      fontSerif: FRAUNCES,
      fontSans: OUTFIT,
      typePair: 'Fraunces · Outfit',
    }),
  },
  {
    id: 'ballet',
    name: 'Ballet',
    tagline: 'Tutu pink · airy',
    swatches: ['#FFF8FC', '#F06BA8', '#FCE4F1'],
    tokens: withAliases({
      bg: '#FFF9FC',
      sidebar: '#FFF0F7',
      sidebarHover: '#FCE0EF',
      sidebarActive: '#F9CDE4',
      sidebarText: '#A85888',
      sidebarTextActive: '#5C1F48',
      sidebarLine: '#F5CFE4',
      sidebarWash: 'linear-gradient(175deg, #FCE4F1 0%, #FFF5FA 45%, #FFF0F7 100%)',
      accent: '#F06BA8',
      accentSoft: '#FCE4F1',
      accentDeep: '#D9488E',
      ink: '#3A1530',
      muted: '#916078',
      card: '#FFFFFF',
      line: '#F5D6E8',
      success: '#0F766E',
      warn: '#B45309',
      radius: '1.35rem',
      fontSerif: JOSEFIN,
      fontSans: NUNITO,
      typePair: 'Josefin · Nunito',
    }),
  },
  {
    id: 'orchid',
    name: 'Orchid',
    tagline: 'Muted mauve · dreamy',
    swatches: ['#F8F4FB', '#9B7BB0', '#EDE4F5'],
    tokens: withAliases({
      bg: '#F9F5FC',
      sidebar: '#F2EAF8',
      sidebarHover: '#E8DCF2',
      sidebarActive: '#DDCEE9',
      sidebarText: '#7A6890',
      sidebarTextActive: '#352445',
      sidebarLine: '#DDD0E8',
      sidebarWash: 'linear-gradient(175deg, #EDE4F5 0%, #F7F2FB 42%, #F2EAF8 100%)',
      accent: '#9B7BB0',
      accentSoft: '#EDE4F5',
      accentDeep: '#7A5C92',
      ink: '#281C38',
      muted: '#6E6280',
      card: '#FFFFFF',
      line: '#E4DAEF',
      success: '#0F766E',
      warn: '#B45309',
      radius: '1rem',
      fontSerif: INSTRUMENT,
      fontSans: DM_SANS,
      typePair: 'Instrument · DM Sans',
    }),
  },
  {
    id: 'honey',
    name: 'Honey',
    tagline: 'Champagne · rose gold',
    swatches: ['#FBF6EE', '#C9A06A', '#F3E8D4'],
    tokens: withAliases({
      bg: '#FBF7F0',
      sidebar: '#F5ECDE',
      sidebarHover: '#EDE0CC',
      sidebarActive: '#E4D3B8',
      sidebarText: '#8A7358',
      sidebarTextActive: '#3A2C1C',
      sidebarLine: '#E5D4BC',
      sidebarWash: 'linear-gradient(175deg, #F3E8D4 0%, #FAF4EA 40%, #F5ECDE 100%)',
      accent: '#C9A06A',
      accentSoft: '#F3E8D4',
      accentDeep: '#A8824A',
      ink: '#2E2418',
      muted: '#7A6A52',
      card: '#FFFEFB',
      line: '#E8DDCE',
      success: '#0F766E',
      warn: '#B45309',
      radius: '0.85rem',
      fontSerif: LIBRE,
      fontSans: RALEWAY,
      typePair: 'Libre Baskerville · Raleway',
    }),
  },
  {
    id: 'ink',
    name: 'Ink',
    tagline: 'Editorial · rose stamp',
    swatches: ['#F4F2F1', '#D46A82', '#F5E6EA'],
    tokens: withAliases({
      bg: '#F3F1F0',
      sidebar: '#FFFFFF',
      sidebarHover: '#F5F1F0',
      sidebarActive: '#EFE8E6',
      sidebarText: '#7A7070',
      sidebarTextActive: '#1A1616',
      sidebarLine: '#E8E2E0',
      sidebarWash: 'linear-gradient(180deg, #FFFFFF 0%, #FAF8F7 100%)',
      accent: '#D46A82',
      accentSoft: '#F5E6EA',
      accentDeep: '#B84E66',
      ink: '#1A1616',
      muted: '#6E6666',
      card: '#FFFFFF',
      line: '#E4DEDC',
      success: '#0F766E',
      warn: '#B45309',
      radius: '0.65rem',
      fontSerif: PLAYFAIR,
      fontSans: INTER,
      typePair: 'Playfair · Inter',
    }),
  },
  {
    id: 'matcha',
    name: 'Matcha',
    tagline: 'Sage wash · dusty rose',
    swatches: ['#F4F6F1', '#C97B8A', '#E8EFE3'],
    tokens: withAliases({
      bg: '#F5F7F2',
      sidebar: '#EBF0E6',
      sidebarHover: '#DFE8D6',
      sidebarActive: '#D2DCC8',
      sidebarText: '#6A7A62',
      sidebarTextActive: '#2A3224',
      sidebarLine: '#D4DEC8',
      sidebarWash: 'linear-gradient(175deg, #E4EDDC 0%, #F2F5EE 40%, #EBF0E6 100%)',
      accent: '#C97B8A',
      accentSoft: '#F3E4E8',
      accentDeep: '#A85A6A',
      ink: '#243028',
      muted: '#667060',
      card: '#FFFFFF',
      line: '#DCE4D4',
      success: '#3F7A5C',
      warn: '#B45309',
      radius: '1.1rem',
      fontSerif: LORA,
      fontSans: OUTFIT,
      typePair: 'Lora · Outfit',
    }),
  },
  {
    id: 'merlot',
    name: 'Merlot',
    tagline: 'Wine blush · rich',
    swatches: ['#FBF4F5', '#A84D62', '#F3DCE2'],
    tokens: withAliases({
      bg: '#FBF5F6',
      sidebar: '#F6E8EB',
      sidebarHover: '#EED6DC',
      sidebarActive: '#E4C4CC',
      sidebarText: '#8A5866',
      sidebarTextActive: '#3A1824',
      sidebarLine: '#E8CCD4',
      sidebarWash: 'linear-gradient(175deg, #F3DCE2 0%, #FAF0F2 42%, #F6E8EB 100%)',
      accent: '#A84D62',
      accentSoft: '#F3DCE2',
      accentDeep: '#8A354C',
      ink: '#2A1218',
      muted: '#7A5460',
      card: '#FFFFFF',
      line: '#EAD4DA',
      success: '#0F766E',
      warn: '#B45309',
      radius: '0.95rem',
      fontSerif: CORMORANT,
      fontSans: MONTSERRAT,
      typePair: 'Cormorant · Montserrat',
    }),
  },
  {
    id: 'cloud',
    name: 'Cloud',
    tagline: 'Cool mist · modern',
    swatches: ['#F3F6F9', '#E07A92', '#E2EAF2'],
    tokens: withAliases({
      bg: '#F2F5F8',
      sidebar: '#E8EEF4',
      sidebarHover: '#DCE5EE',
      sidebarActive: '#CEDAE6',
      sidebarText: '#5A7084',
      sidebarTextActive: '#1C2834',
      sidebarLine: '#CDD8E4',
      sidebarWash: 'linear-gradient(175deg, #DCE6F0 0%, #F0F4F8 40%, #E8EEF4 100%)',
      accent: '#E07A92',
      accentSoft: '#F5E4E9',
      accentDeep: '#C45A72',
      ink: '#1A2430',
      muted: '#5A6C7C',
      card: '#FFFFFF',
      line: '#D4DEE8',
      success: '#0F766E',
      warn: '#B45309',
      radius: '0.75rem',
      fontSerif: SPACE,
      fontSans: DM_SANS,
      typePair: 'Space Grotesk · DM Sans',
    }),
  },
];

export const ADMIN_PALETTE_STORAGE_KEY = 'perg_admin_palette_v4';
export const DEFAULT_ADMIN_PALETTE_ID: AdminPaletteId = 'standard';

const LEGACY_PALETTE_MAP: Record<string, AdminPaletteId> = {
  peony: 'standard',
  roseate: 'ballet',
  blush: 'ballet',
  petal: 'ballet',
  lilac: 'orchid',
  champagne: 'honey',
  cream: 'honey',
  porcelain: 'ink',
  sakura: 'merlot',
  mist: 'cloud',
  powder: 'cloud',
  coral: 'merlot',
  midnight: 'ink',
};

export function getAdminPalette(id: string | null | undefined): AdminPalette {
  return ADMIN_PALETTES.find((p) => p.id === id) || ADMIN_PALETTES[0];
}

export function readStoredAdminPaletteId(): AdminPaletteId {
  try {
    const raw = localStorage.getItem(ADMIN_PALETTE_STORAGE_KEY);
    if (raw && ADMIN_PALETTES.some((p) => p.id === raw)) return raw as AdminPaletteId;
    for (const key of ['perg_admin_palette_v3', 'perg_admin_palette_v2']) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      const mapped =
        LEGACY_PALETTE_MAP[legacy] ||
        (ADMIN_PALETTES.some((p) => p.id === legacy) ? (legacy as AdminPaletteId) : null);
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

export function applyAdminTokens(target: AdminTokens, tokens: AdminTokens): void {
  (Object.keys(tokens) as (keyof AdminTokens)[]).forEach((k) => {
    target[k] = tokens[k];
  });
}

export function applyAdminTypography(el: HTMLElement | null, tokens: AdminTokens): void {
  if (!el) return;
  el.style.setProperty('--admin-font-serif', tokens.fontSerif);
  el.style.setProperty('--admin-font-sans', tokens.fontSans);
  el.style.setProperty('--admin-radius', tokens.radius);
  el.style.setProperty('--admin-accent', tokens.accent);
  el.style.setProperty('--admin-accent-soft', tokens.accentSoft);
  el.style.setProperty('--admin-bg', tokens.bg);
  el.style.setProperty('--admin-ink', tokens.ink);
  el.style.setProperty('--admin-line', tokens.line);
}
