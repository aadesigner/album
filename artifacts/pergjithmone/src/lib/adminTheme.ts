/** Admin UI — 6 modern one-hue skins. Accent owns the room; no second brand color. */

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
  | 'graphite'
  | 'burgundy'
  | 'navy'
  | 'sage'
  | 'copper'
  | 'pearl';

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
const INSTRUMENT = "'Instrument Serif', Georgia, serif";
const OUTFIT = "'Outfit', system-ui, sans-serif";
const DM_SANS = "'DM Sans', system-ui, sans-serif";
const RALEWAY = "'Raleway', system-ui, sans-serif";
const SPACE = "'Space Grotesk', system-ui, sans-serif";

function withAliases(
  t: Omit<AdminTokens, 'blush' | 'blushSoft' | 'blushDeep'>,
): AdminTokens {
  return { ...t, blush: t.accent, blushSoft: t.accentSoft, blushDeep: t.accentDeep };
}

/** One-hue ladder — rail, paper, cards, and lines stay in the same family. */
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

/**
 * Neutral chrome (white / grey / black) + one quiet accent.
 * Accent is for buttons, active icons, progress — not rails or page washes.
 */
export const ADMIN_PALETTES: AdminPalette[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    tagline: 'Black accent · grey UI',
    swatches: ['#FFFFFF', '#18181B', '#F4F4F5'],
    tokens: mono({
      paper: '#F7F7F8',
      card: '#FFFFFF',
      line: '#E8E8EA',
      ink: '#18181B',
      muted: '#71717A',
      accent: '#18181B',
      accentSoft: '#F0F0F1',
      accentDeep: '#09090B',
      accentOn: '#FFFFFF',
      rail: '#111113',
      railHover: '#1C1C1F',
      railActive: '#27272A',
      railText: '#A1A1AA',
      railTextActive: '#FAFAFA',
      railLine: '#27272A',
      wash: '#111113',
      stage: '#F7F7F8',
      radius: '0.75rem',
      fontSerif: INSTRUMENT,
      fontSans: SPACE,
      typePair: 'Instrument · Space Grotesk',
      shadow: '0 8px 24px rgba(9,9,11,0.04)',
    }),
  },
  {
    id: 'burgundy',
    name: 'Burgundy',
    tagline: 'Wine accent · neutral UI',
    swatches: ['#FFFFFF', '#8B2E42', '#F4F4F5'],
    tokens: mono({
      paper: '#F7F7F8',
      card: '#FFFFFF',
      line: '#E8E8EA',
      ink: '#18181B',
      muted: '#71717A',
      accent: '#8B2E42',
      accentSoft: '#F6F0F2',
      accentDeep: '#6B2032',
      accentOn: '#FFFFFF',
      rail: '#111113',
      railHover: '#1C1C1F',
      railActive: '#27272A',
      railText: '#A1A1AA',
      railTextActive: '#FAFAFA',
      railLine: '#27272A',
      wash: '#111113',
      stage: '#F7F7F8',
      radius: '0.75rem',
      fontSerif: CORMORANT,
      fontSans: RALEWAY,
      typePair: 'Cormorant · Raleway',
      shadow: '0 8px 24px rgba(9,9,11,0.04)',
    }),
  },
  {
    id: 'navy',
    name: 'Navy',
    tagline: 'Blue accent · neutral UI',
    swatches: ['#FFFFFF', '#2B4A6F', '#F4F4F5'],
    tokens: mono({
      paper: '#F7F7F8',
      card: '#FFFFFF',
      line: '#E8E8EA',
      ink: '#18181B',
      muted: '#71717A',
      accent: '#2B4A6F',
      accentSoft: '#F0F3F7',
      accentDeep: '#1C334F',
      accentOn: '#FFFFFF',
      rail: '#111113',
      railHover: '#1C1C1F',
      railActive: '#27272A',
      railText: '#A1A1AA',
      railTextActive: '#FAFAFA',
      railLine: '#27272A',
      wash: '#111113',
      stage: '#F7F7F8',
      radius: '0.75rem',
      fontSerif: INSTRUMENT,
      fontSans: DM_SANS,
      typePair: 'Instrument · DM Sans',
      shadow: '0 8px 24px rgba(9,9,11,0.04)',
    }),
  },
  {
    id: 'sage',
    name: 'Sage',
    tagline: 'Green accent · neutral UI',
    swatches: ['#FFFFFF', '#4F6B56', '#F4F4F5'],
    tokens: mono({
      paper: '#F7F7F8',
      card: '#FFFFFF',
      line: '#E8E8EA',
      ink: '#18181B',
      muted: '#71717A',
      accent: '#4F6B56',
      accentSoft: '#F1F4F1',
      accentDeep: '#3A5240',
      accentOn: '#FFFFFF',
      rail: '#111113',
      railHover: '#1C1C1F',
      railActive: '#27272A',
      railText: '#A1A1AA',
      railTextActive: '#FAFAFA',
      railLine: '#27272A',
      wash: '#111113',
      stage: '#F7F7F8',
      radius: '0.75rem',
      fontSerif: FRAUNCES,
      fontSans: OUTFIT,
      typePair: 'Fraunces · Outfit',
      shadow: '0 8px 24px rgba(9,9,11,0.04)',
    }),
  },
  {
    id: 'copper',
    name: 'Copper',
    tagline: 'Warm accent · neutral UI',
    swatches: ['#FFFFFF', '#A35C38', '#F4F4F5'],
    tokens: mono({
      paper: '#F7F7F8',
      card: '#FFFFFF',
      line: '#E8E8EA',
      ink: '#18181B',
      muted: '#71717A',
      accent: '#A35C38',
      accentSoft: '#F6F1ED',
      accentDeep: '#7E4428',
      accentOn: '#FFFFFF',
      rail: '#111113',
      railHover: '#1C1C1F',
      railActive: '#27272A',
      railText: '#A1A1AA',
      railTextActive: '#FAFAFA',
      railLine: '#27272A',
      wash: '#111113',
      stage: '#F7F7F8',
      radius: '0.75rem',
      fontSerif: FRAUNCES,
      fontSans: RALEWAY,
      typePair: 'Fraunces · Raleway',
      shadow: '0 8px 24px rgba(9,9,11,0.04)',
    }),
  },
  {
    id: 'pearl',
    name: 'Pearl',
    tagline: 'Light rail · soft grey',
    swatches: ['#FFFFFF', '#3F3F46', '#F4F4F5'],
    tokens: mono({
      paper: '#F7F7F8',
      card: '#FFFFFF',
      line: '#E8E8EA',
      ink: '#18181B',
      muted: '#71717A',
      accent: '#3F3F46',
      accentSoft: '#F0F0F1',
      accentDeep: '#27272A',
      accentOn: '#FFFFFF',
      rail: '#FFFFFF',
      railHover: '#F4F4F5',
      railActive: '#EBEBEC',
      railText: '#71717A',
      railTextActive: '#18181B',
      railLine: '#E8E8EA',
      wash: '#FFFFFF',
      stage: '#F7F7F8',
      radius: '0.75rem',
      fontSerif: INSTRUMENT,
      fontSans: DM_SANS,
      typePair: 'Instrument · DM Sans',
      shadow: '0 8px 24px rgba(9,9,11,0.04)',
    }),
  },
];

/** v9 — neutral chrome + sparse accent. */
export const ADMIN_PALETTE_STORAGE_KEY = 'perg_admin_palette_v9';
export const DEFAULT_ADMIN_PALETTE_ID: AdminPaletteId = 'graphite';

const LEGACY_PALETTE_MAP: Record<string, AdminPaletteId> = {
  // Old → new
  atelier: 'copper',
  honey: 'copper',
  champagne: 'copper',
  cream: 'copper',
  rosecloth: 'burgundy',
  standard: 'burgundy',
  peony: 'burgundy',
  ballet: 'burgundy',
  roseate: 'burgundy',
  blush: 'burgundy',
  petal: 'burgundy',
  merlot: 'burgundy',
  orchid: 'burgundy',
  lilac: 'burgundy',
  sakura: 'burgundy',
  coral: 'burgundy',
  inkpress: 'graphite',
  ink: 'graphite',
  porcelain: 'graphite',
  midnight: 'graphite',
  classic: 'graphite',
  moss: 'sage',
  matcha: 'sage',
  slate: 'navy',
  cloud: 'navy',
  mist: 'navy',
  powder: 'pearl',
  panel: 'pearl',
};

export function getAdminPalette(id: string | null | undefined): AdminPalette {
  return ADMIN_PALETTES.find((p) => p.id === id) || ADMIN_PALETTES[0];
}

export function readStoredAdminPaletteId(): AdminPaletteId {
  try {
    const raw = localStorage.getItem(ADMIN_PALETTE_STORAGE_KEY);
    if (raw && ADMIN_PALETTES.some((p) => p.id === raw)) return raw as AdminPaletteId;
    for (const key of [
      'perg_admin_palette_v8',
      'perg_admin_palette_v7',
      'perg_admin_palette_v6',
      'perg_admin_palette_v5',
      'perg_admin_palette_v4',
      'perg_admin_palette_v3',
      'perg_admin_palette_v2',
    ]) {
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
  el.style.setProperty('--admin-card', tokens.card);
  el.style.setProperty('--admin-card-shadow', tokens.cardShadow);
}
