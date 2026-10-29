/** Admin UI color + typography palettes — persisted in localStorage, applied live.
 *  Each look is one primary hue. Structure, type, and radius carry the character. */

export type AdminTokens = {
  bg: string;
  sidebar: string;
  sidebarHover: string;
  sidebarActive: string;
  sidebarText: string;
  sidebarTextActive: string;
  sidebarLine: string;
  sidebarWash: string;
  accent: string;
  accentSoft: string;
  accentDeep: string;
  /** Type / icons sitting on an accent fill */
  accentOn: string;
  ink: string;
  muted: string;
  card: string;
  line: string;
  success: string;
  warn: string;
  radius: string;
  fontSerif: string;
  fontSans: string;
  typePair: string;
  cardShadow: string;
  /** Main canvas wash — may be a CSS gradient */
  stageWash: string;
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
  | 'cloud'
  | 'classic'
  | 'panel';

export type AdminPalette = {
  id: AdminPaletteId;
  name: string;
  tagline: string;
  /** [paper, accent, deep] */
  swatches: [string, string, string];
  tokens: AdminTokens;
};

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
    tagline: 'Rosewood rail · ivory stage',
    swatches: ['#F4ECEE', '#D24A64', '#2C141C'],
    tokens: withAliases({
      bg: '#F4ECEE',
      stageWash: 'radial-gradient(1100px 640px at 100% -10%, rgba(210,74,100,0.16), transparent 58%), #F4ECEE',
      sidebar: '#2C141C',
      sidebarHover: '#3E1C28',
      sidebarActive: '#4C2432',
      sidebarText: '#E2B4BE',
      sidebarTextActive: '#FFF6F8',
      sidebarLine: '#4A2832',
      sidebarWash: 'linear-gradient(180deg, #3A1A24 0%, #241016 100%)',
      accent: '#D24A64',
      accentSoft: '#F3DCE1',
      accentDeep: '#B8324C',
      accentOn: '#FFF7F8',
      ink: '#2A1218',
      muted: '#7A4E58',
      card: '#FFFAFB',
      line: '#E8D0D6',
      success: '#B8324C',
      warn: '#8A2840',
      radius: '1.15rem',
      fontSerif: FRAUNCES,
      fontSans: OUTFIT,
      typePair: 'Fraunces · Outfit',
      cardShadow: '0 12px 32px rgba(44,20,28,0.08)',
    }),
  },
  {
    id: 'ballet',
    name: 'Ballet',
    tagline: 'Powder pink · airy',
    swatches: ['#FFF6FA', '#EB6AA6', '#F8D4E6'],
    tokens: withAliases({
      bg: '#FFF6FA',
      stageWash: 'radial-gradient(900px 520px at 0% 0%, rgba(235,106,166,0.14), transparent 55%), #FFF6FA',
      sidebar: '#FCE8F2',
      sidebarHover: '#F6D4E6',
      sidebarActive: '#F0C0DA',
      sidebarText: '#A05078',
      sidebarTextActive: '#4A1838',
      sidebarLine: '#F3CDE0',
      sidebarWash: 'linear-gradient(180deg, #FFE4F0 0%, #FFF4F9 42%, #FCE8F2 100%)',
      accent: '#EB6AA6',
      accentSoft: '#FCE4F0',
      accentDeep: '#D14C90',
      accentOn: '#FFF8FB',
      ink: '#3A1530',
      muted: '#8A5070',
      card: '#FFFFFF',
      line: '#F5D6E6',
      success: '#D14C90',
      warn: '#A83870',
      radius: '1.5rem',
      fontSerif: JOSEFIN,
      fontSans: NUNITO,
      typePair: 'Josefin · Nunito',
      cardShadow: '0 16px 40px rgba(80,24,56,0.06)',
    }),
  },
  {
    id: 'orchid',
    name: 'Orchid',
    tagline: 'Plum rail · lilac mist',
    swatches: ['#F3EFF7', '#8B6BB0', '#1E1528'],
    tokens: withAliases({
      bg: '#F3EFF7',
      stageWash: 'radial-gradient(1000px 580px at 100% 0%, rgba(139,107,176,0.18), transparent 60%), #F3EFF7',
      sidebar: '#1E1528',
      sidebarHover: '#2C203C',
      sidebarActive: '#3A2A4C',
      sidebarText: '#C8B4DC',
      sidebarTextActive: '#F8F4FC',
      sidebarLine: '#3C2E50',
      sidebarWash: 'linear-gradient(185deg, #2A1C38 0%, #16101F 100%)',
      accent: '#8B6BB0',
      accentSoft: '#E8DCF2',
      accentDeep: '#6E528F',
      accentOn: '#F8F4FC',
      ink: '#221830',
      muted: '#6A5A7C',
      card: '#FCFAFE',
      line: '#DDD2E8',
      success: '#6E528F',
      warn: '#5A4078',
      radius: '1.05rem',
      fontSerif: INSTRUMENT,
      fontSans: DM_SANS,
      typePair: 'Instrument · DM Sans',
      cardShadow: '0 14px 36px rgba(30,20,48,0.08)',
    }),
  },
  {
    id: 'honey',
    name: 'Honey',
    tagline: 'Espresso rail · parchment',
    swatches: ['#F6F0E4', '#C4963A', '#241C14'],
    tokens: withAliases({
      bg: '#F6F0E4',
      stageWash: 'radial-gradient(980px 560px at 100% -8%, rgba(196,150,58,0.18), transparent 58%), #F6F0E4',
      sidebar: '#241C14',
      sidebarHover: '#33281C',
      sidebarActive: '#423424',
      sidebarText: '#D4C09A',
      sidebarTextActive: '#FBF6EA',
      sidebarLine: '#3C3024',
      sidebarWash: 'linear-gradient(180deg, #2E2418 0%, #1A1410 100%)',
      accent: '#C4963A',
      accentSoft: '#F0E4C8',
      accentDeep: '#A07828',
      accentOn: '#FFF8EA',
      ink: '#2A2218',
      muted: '#7A6A4C',
      card: '#FFFCFA',
      line: '#E6DCC8',
      success: '#A07828',
      warn: '#8A6420',
      radius: '0.7rem',
      fontSerif: LIBRE,
      fontSans: RALEWAY,
      typePair: 'Libre Baskerville · Raleway',
      cardShadow: '0 12px 30px rgba(40,28,12,0.08)',
    }),
  },
  {
    id: 'ink',
    name: 'Ink',
    tagline: 'Newsprint · black stamp',
    swatches: ['#EFEBE3', '#161412', '#D8D2C8'],
    tokens: withAliases({
      bg: '#EFEBE3',
      stageWash: 'linear-gradient(180deg, #F4F0E8 0%, #E8E2D8 100%)',
      sidebar: '#F7F4EE',
      sidebarHover: '#EBE6DC',
      sidebarActive: '#E0DACE',
      sidebarText: '#6A645C',
      sidebarTextActive: '#161412',
      sidebarLine: '#DDD6CC',
      sidebarWash: 'linear-gradient(180deg, #FAF7F1 0%, #F0EBE3 100%)',
      accent: '#161412',
      accentSoft: '#E4DFD6',
      accentDeep: '#000000',
      accentOn: '#F7F4EE',
      ink: '#161412',
      muted: '#6E6860',
      card: '#FBF8F2',
      line: '#D8D2C8',
      success: '#161412',
      warn: '#4A4440',
      radius: '0.4rem',
      fontSerif: PLAYFAIR,
      fontSans: INTER,
      typePair: 'Playfair · Inter',
      cardShadow: '0 8px 24px rgba(22,20,18,0.07)',
    }),
  },
  {
    id: 'matcha',
    name: 'Matcha',
    tagline: 'Moss rail · foam paper',
    swatches: ['#F0F3EA', '#5A7A48', '#1A2216'],
    tokens: withAliases({
      bg: '#F0F3EA',
      stageWash: 'radial-gradient(1000px 560px at 0% 0%, rgba(90,122,72,0.16), transparent 58%), #F0F3EA',
      sidebar: '#1A2216',
      sidebarHover: '#283322',
      sidebarActive: '#34422C',
      sidebarText: '#C4D4B4',
      sidebarTextActive: '#F4F8EE',
      sidebarLine: '#303C28',
      sidebarWash: 'linear-gradient(185deg, #24301C 0%, #141C12 100%)',
      accent: '#5A7A48',
      accentSoft: '#E0EAD4',
      accentDeep: '#3E5A32',
      accentOn: '#F4F8EE',
      ink: '#1C2418',
      muted: '#5A6A50',
      card: '#FBFCF7',
      line: '#D4DCC8',
      success: '#3E5A32',
      warn: '#4A5C28',
      radius: '1.2rem',
      fontSerif: LORA,
      fontSans: OUTFIT,
      typePair: 'Lora · Outfit',
      cardShadow: '0 14px 34px rgba(28,36,22,0.08)',
    }),
  },
  {
    id: 'merlot',
    name: 'Merlot',
    tagline: 'Wine cellar · ivory menu',
    swatches: ['#F6F0F1', '#8E3048', '#241018'],
    tokens: withAliases({
      bg: '#F6F0F1',
      stageWash: 'radial-gradient(1080px 600px at 100% 0%, rgba(142,48,72,0.16), transparent 60%), #F6F0F1',
      sidebar: '#241018',
      sidebarHover: '#361820',
      sidebarActive: '#4A202C',
      sidebarText: '#E0B4C0',
      sidebarTextActive: '#FFF6F8',
      sidebarLine: '#3C1C28',
      sidebarWash: 'linear-gradient(180deg, #32141E 0%, #1A0C12 100%)',
      accent: '#8E3048',
      accentSoft: '#F0D8DE',
      accentDeep: '#6E2038',
      accentOn: '#FFF6F8',
      ink: '#2A1218',
      muted: '#7A5460',
      card: '#FCFAFA',
      line: '#E6D4D8',
      success: '#6E2038',
      warn: '#5A182C',
      radius: '0.9rem',
      fontSerif: CORMORANT,
      fontSans: MONTSERRAT,
      typePair: 'Cormorant · Montserrat',
      cardShadow: '0 16px 40px rgba(36,16,24,0.09)',
    }),
  },
  {
    id: 'cloud',
    name: 'Cloud',
    tagline: 'Steel rail · cool paper',
    swatches: ['#EEF2F5', '#4A6F92', '#17222C'],
    tokens: withAliases({
      bg: '#EEF2F5',
      stageWash: 'radial-gradient(1000px 560px at 100% 0%, rgba(74,111,146,0.16), transparent 58%), #EEF2F5',
      sidebar: '#17222C',
      sidebarHover: '#243340',
      sidebarActive: '#304454',
      sidebarText: '#B4C8D8',
      sidebarTextActive: '#F4F8FC',
      sidebarLine: '#2C3C4A',
      sidebarWash: 'linear-gradient(185deg, #1E2C38 0%, #121A22 100%)',
      accent: '#4A6F92',
      accentSoft: '#DCE6EE',
      accentDeep: '#355676',
      accentOn: '#F4F8FC',
      ink: '#1A2430',
      muted: '#5A6C7C',
      card: '#FAFCFD',
      line: '#D4DEE6',
      success: '#355676',
      warn: '#2C4860',
      radius: '0.65rem',
      fontSerif: SPACE,
      fontSans: DM_SANS,
      typePair: 'Space Grotesk · DM Sans',
      cardShadow: '0 12px 32px rgba(24,36,48,0.08)',
    }),
  },
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Swiss black · white',
    swatches: ['#F4F4F5', '#111111', '#E4E4E7'],
    tokens: withAliases({
      bg: '#F4F4F5',
      stageWash: '#F4F4F5',
      sidebar: '#FFFFFF',
      sidebarHover: '#F4F4F5',
      sidebarActive: '#EBEBED',
      sidebarText: '#71717A',
      sidebarTextActive: '#111111',
      sidebarLine: '#E4E4E7',
      sidebarWash: '#FFFFFF',
      accent: '#111111',
      accentSoft: '#E4E4E7',
      accentDeep: '#000000',
      accentOn: '#FFFFFF',
      ink: '#111111',
      muted: '#71717A',
      card: '#FFFFFF',
      line: '#E4E4E7',
      success: '#111111',
      warn: '#52525B',
      radius: '0.35rem',
      fontSerif: INTER,
      fontSans: INTER,
      typePair: 'Inter · Inter',
      cardShadow: '0 1px 0 rgba(0,0,0,0.04), 0 8px 20px rgba(0,0,0,0.04)',
    }),
  },
  {
    id: 'panel',
    name: 'Panel',
    tagline: 'Graphite rail · pale stage',
    swatches: ['#ECECEE', '#2A2A30', '#0C0C0E'],
    tokens: withAliases({
      bg: '#ECECEE',
      stageWash: 'linear-gradient(180deg, #F2F2F4 0%, #E6E6E8 100%)',
      sidebar: '#0C0C0E',
      sidebarHover: '#1A1A1E',
      sidebarActive: '#2A2A30',
      sidebarText: '#A8A8B0',
      sidebarTextActive: '#F6F6F8',
      sidebarLine: '#222226',
      sidebarWash: 'linear-gradient(180deg, #141416 0%, #0A0A0C 100%)',
      accent: '#2A2A30',
      accentSoft: '#E4E4E8',
      accentDeep: '#111114',
      accentOn: '#F6F6F8',
      ink: '#141416',
      muted: '#6A6A72',
      card: '#FAFAFB',
      line: '#DCDCE0',
      success: '#2A2A30',
      warn: '#52525A',
      radius: '0.45rem',
      fontSerif: SPACE,
      fontSans: INTER,
      typePair: 'Space Grotesk · Inter',
      cardShadow: '0 10px 28px rgba(12,12,14,0.08)',
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
  el.style.setProperty('--admin-accent-on', tokens.accentOn);
  el.style.setProperty('--admin-bg', tokens.bg);
  el.style.setProperty('--admin-ink', tokens.ink);
  el.style.setProperty('--admin-line', tokens.line);
  el.style.setProperty('--admin-card-shadow', tokens.cardShadow);
}
