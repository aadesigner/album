/** Admin UI — one-hue atelier skins. Structure + type carry character; never two brand hues. */

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
  stageWash: string;
  blush: string;
  blushSoft: string;
  blushDeep: string;
};

export type AdminPaletteId =
  | 'atelier'
  | 'rosecloth'
  | 'inkpress'
  | 'moss'
  | 'merlot'
  | 'slate';

export type AdminPalette = {
  id: AdminPaletteId;
  name: string;
  tagline: string;
  /** Single accent chip for the switcher */
  swatches: [string, string, string];
  tokens: AdminTokens;
};

const FRAUNCES = "'Fraunces', Georgia, serif";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const LIBRE = "'Libre Baskerville', Georgia, serif";
const INSTRUMENT = "'Instrument Serif', Georgia, serif";
const OUTFIT = "'Outfit', system-ui, sans-serif";
const DM_SANS = "'DM Sans', system-ui, sans-serif";
const RALEWAY = "'Raleway', system-ui, sans-serif";
const MONTSERRAT = "'Montserrat', system-ui, sans-serif";

function withAliases(
  t: Omit<AdminTokens, 'blush' | 'blushSoft' | 'blushDeep'>,
): AdminTokens {
  return { ...t, blush: t.accent, blushSoft: t.accentSoft, blushDeep: t.accentDeep };
}

/** Build a mono ladder from one accent — sidebar/stage stay in-family. */
function mono(opts: {
  paper: string;
  card: string;
  line: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentDeep: string;
  accentOn: string;
  rail: string;
  railHover: string;
  railActive: string;
  railText: string;
  railTextActive: string;
  railLine: string;
  wash: string;
  stage: string;
  radius: string;
  fontSerif: string;
  fontSans: string;
  typePair: string;
  shadow: string;
}): AdminTokens {
  return withAliases({
    bg: opts.paper,
    stageWash: opts.stage,
    sidebar: opts.rail,
    sidebarHover: opts.railHover,
    sidebarActive: opts.railActive,
    sidebarText: opts.railText,
    sidebarTextActive: opts.railTextActive,
    sidebarLine: opts.railLine,
    sidebarWash: opts.wash,
    accent: opts.accent,
    accentSoft: opts.accentSoft,
    accentDeep: opts.accentDeep,
    accentOn: opts.accentOn,
    ink: opts.ink,
    muted: opts.muted,
    card: opts.card,
    line: opts.line,
    success: opts.accentDeep,
    warn: opts.accentDeep,
    radius: opts.radius,
    fontSerif: opts.fontSerif,
    fontSans: opts.fontSans,
    typePair: opts.typePair,
    cardShadow: opts.shadow,
  });
}

export const ADMIN_PALETTES: AdminPalette[] = [
  {
    id: 'atelier',
    name: 'Atelier',
    tagline: 'Parchment · one gold',
    swatches: ['#F5EFE4', '#B8893A', '#2A2118'],
    tokens: mono({
      paper: '#F5EFE4',
      card: '#FFFBF5',
      line: '#E4D7C4',
      ink: '#2A2118',
      muted: '#8A7358',
      accent: '#B8893A',
      accentSoft: '#F0E4CC',
      accentDeep: '#8F6A28',
      accentOn: '#FFF9EF',
      rail: '#2A2118',
      railHover: '#3A2E22',
      railActive: '#4A3A2A',
      railText: '#D4C0A0',
      railTextActive: '#FFF8EC',
      railLine: '#3E3226',
      wash: 'linear-gradient(185deg, #32281E 0%, #1E1812 100%)',
      stage: 'radial-gradient(900px 520px at 100% -8%, rgba(184,137,58,0.14), transparent 55%), #F5EFE4',
      radius: '0.85rem',
      fontSerif: LIBRE,
      fontSans: RALEWAY,
      typePair: 'Libre Baskerville · Raleway',
      shadow: '0 14px 36px rgba(42,33,24,0.07)',
    }),
  },
  {
    id: 'rosecloth',
    name: 'Rosecloth',
    tagline: 'Cloth rose · one tone',
    swatches: ['#F6EEEF', '#B85A6E', '#2A161C'],
    tokens: mono({
      paper: '#F6EEEF',
      card: '#FFF9FA',
      line: '#E8D4D8',
      ink: '#2A161C',
      muted: '#8A5A66',
      accent: '#B85A6E',
      accentSoft: '#F0DCE2',
      accentDeep: '#8E3E52',
      accentOn: '#FFF7F9',
      rail: '#2A161C',
      railHover: '#3C2028',
      railActive: '#4E2A34',
      railText: '#E0B4C0',
      railTextActive: '#FFF6F8',
      railLine: '#40242C',
      wash: 'linear-gradient(185deg, #341A22 0%, #1E1014 100%)',
      stage: 'radial-gradient(900px 520px at 0% 0%, rgba(184,90,110,0.12), transparent 55%), #F6EEEF',
      radius: '1rem',
      fontSerif: FRAUNCES,
      fontSans: OUTFIT,
      typePair: 'Fraunces · Outfit',
      shadow: '0 14px 36px rgba(42,22,28,0.07)',
    }),
  },
  {
    id: 'inkpress',
    name: 'Inkpress',
    tagline: 'Newsprint · black stamp',
    swatches: ['#F2EFE9', '#1A1816', '#D8D2C8'],
    tokens: mono({
      paper: '#F2EFE9',
      card: '#FBFAF7',
      line: '#DDD6CC',
      ink: '#1A1816',
      muted: '#6E6860',
      accent: '#1A1816',
      accentSoft: '#E6E0D6',
      accentDeep: '#000000',
      accentOn: '#F7F4EE',
      rail: '#F7F4EE',
      railHover: '#EBE6DC',
      railActive: '#E0DACE',
      railText: '#6A645C',
      railTextActive: '#1A1816',
      railLine: '#DDD6CC',
      wash: 'linear-gradient(180deg, #FAF7F1 0%, #F0EBE3 100%)',
      stage: 'linear-gradient(180deg, #F6F3ED 0%, #EDE8E0 100%)',
      radius: '0.45rem',
      fontSerif: INSTRUMENT,
      fontSans: DM_SANS,
      typePair: 'Instrument · DM Sans',
      shadow: '0 10px 28px rgba(26,24,22,0.06)',
    }),
  },
  {
    id: 'moss',
    name: 'Moss',
    tagline: 'Studio green · foam paper',
    swatches: ['#F0F3EA', '#5A7A48', '#1A2216'],
    tokens: mono({
      paper: '#F0F3EA',
      card: '#FBFCF7',
      line: '#D4DCC8',
      ink: '#1C2418',
      muted: '#5A6A50',
      accent: '#5A7A48',
      accentSoft: '#E0EAD4',
      accentDeep: '#3E5A32',
      accentOn: '#F4F8EE',
      rail: '#1A2216',
      railHover: '#283322',
      railActive: '#34422C',
      railText: '#C4D4B4',
      railTextActive: '#F4F8EE',
      railLine: '#303C28',
      wash: 'linear-gradient(185deg, #24301C 0%, #141C12 100%)',
      stage: 'radial-gradient(900px 520px at 0% 0%, rgba(90,122,72,0.14), transparent 55%), #F0F3EA',
      radius: '0.95rem',
      fontSerif: CORMORANT,
      fontSans: OUTFIT,
      typePair: 'Cormorant · Outfit',
      shadow: '0 14px 34px rgba(28,36,22,0.07)',
    }),
  },
  {
    id: 'merlot',
    name: 'Merlot',
    tagline: 'Wine cellar · ivory',
    swatches: ['#F6F0F1', '#8E3048', '#241018'],
    tokens: mono({
      paper: '#F6F0F1',
      card: '#FCFAFA',
      line: '#E6D4D8',
      ink: '#2A1218',
      muted: '#7A5460',
      accent: '#8E3048',
      accentSoft: '#F0D8DE',
      accentDeep: '#6E2038',
      accentOn: '#FFF6F8',
      rail: '#241018',
      railHover: '#361820',
      railActive: '#4A202C',
      railText: '#E0B4C0',
      railTextActive: '#FFF6F8',
      railLine: '#3C1C28',
      wash: 'linear-gradient(180deg, #32141E 0%, #1A0C12 100%)',
      stage: 'radial-gradient(900px 520px at 100% 0%, rgba(142,48,72,0.12), transparent 55%), #F6F0F1',
      radius: '0.8rem',
      fontSerif: CORMORANT,
      fontSans: MONTSERRAT,
      typePair: 'Cormorant · Montserrat',
      shadow: '0 16px 40px rgba(36,16,24,0.08)',
    }),
  },
  {
    id: 'slate',
    name: 'Slate',
    tagline: 'Cool steel · one grey-blue',
    swatches: ['#EEF1F4', '#4A6074', '#172028'],
    tokens: mono({
      paper: '#EEF1F4',
      card: '#FAFBFC',
      line: '#D4DCE4',
      ink: '#172028',
      muted: '#5A6C7C',
      accent: '#4A6074',
      accentSoft: '#DCE4EC',
      accentDeep: '#354858',
      accentOn: '#F4F8FC',
      rail: '#172028',
      railHover: '#243340',
      railActive: '#304454',
      railText: '#B4C4D4',
      railTextActive: '#F4F8FC',
      railLine: '#2C3C4A',
      wash: 'linear-gradient(185deg, #1E2C38 0%, #121A22 100%)',
      stage: 'radial-gradient(900px 520px at 100% 0%, rgba(74,96,116,0.12), transparent 55%), #EEF1F4',
      radius: '0.65rem',
      fontSerif: INSTRUMENT,
      fontSans: DM_SANS,
      typePair: 'Instrument · DM Sans',
      shadow: '0 12px 32px rgba(24,36,48,0.07)',
    }),
  },
];

export const ADMIN_PALETTE_STORAGE_KEY = 'perg_admin_palette_v5';
export const DEFAULT_ADMIN_PALETTE_ID: AdminPaletteId = 'atelier';

const LEGACY_PALETTE_MAP: Record<string, AdminPaletteId> = {
  standard: 'rosecloth',
  peony: 'rosecloth',
  ballet: 'rosecloth',
  roseate: 'rosecloth',
  blush: 'rosecloth',
  petal: 'rosecloth',
  orchid: 'merlot',
  lilac: 'merlot',
  honey: 'atelier',
  champagne: 'atelier',
  cream: 'atelier',
  ink: 'inkpress',
  porcelain: 'inkpress',
  midnight: 'inkpress',
  classic: 'inkpress',
  matcha: 'moss',
  merlot: 'merlot',
  sakura: 'merlot',
  coral: 'merlot',
  cloud: 'slate',
  mist: 'slate',
  powder: 'slate',
  panel: 'slate',
};

export function getAdminPalette(id: string | null | undefined): AdminPalette {
  return ADMIN_PALETTES.find((p) => p.id === id) || ADMIN_PALETTES[0];
}

export function readStoredAdminPaletteId(): AdminPaletteId {
  try {
    const raw = localStorage.getItem(ADMIN_PALETTE_STORAGE_KEY);
    if (raw && ADMIN_PALETTES.some((p) => p.id === raw)) return raw as AdminPaletteId;
    for (const key of ['perg_admin_palette_v4', 'perg_admin_palette_v3', 'perg_admin_palette_v2']) {
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
  el.style.setProperty('--admin-accent-deep', tokens.accentDeep);
  el.style.setProperty('--admin-accent-on', tokens.accentOn);
  el.style.setProperty('--admin-bg', tokens.bg);
  el.style.setProperty('--admin-ink', tokens.ink);
  el.style.setProperty('--admin-line', tokens.line);
  el.style.setProperty('--admin-card-shadow', tokens.cardShadow);
}
