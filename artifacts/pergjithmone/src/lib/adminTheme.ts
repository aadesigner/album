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

export const ADMIN_PALETTES: AdminPalette[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    tagline: 'Black · grey · white',
    swatches: ['#F4F4F5', '#18181B', '#A1A1AA'],
    tokens: mono({
      paper: '#F4F4F5',
      card: '#ECECEE',
      line: '#D4D4D8',
      ink: '#18181B',
      muted: '#71717A',
      accent: '#18181B',
      accentSoft: '#E4E4E7',
      accentDeep: '#09090B',
      accentOn: '#FAFAFA',
      rail: '#09090B',
      railHover: '#18181B',
      railActive: '#27272A',
      railText: '#A1A1AA',
      railTextActive: '#FAFAFA',
      railLine: '#27272A',
      wash: 'linear-gradient(185deg, #18181B 0%, #09090B 100%)',
      stage: 'radial-gradient(800px 480px at 100% 0%, rgba(24,24,27,0.06), transparent 55%), #F4F4F5',
      radius: '0.75rem',
      fontSerif: INSTRUMENT,
      fontSans: SPACE,
      typePair: 'Instrument · Space Grotesk',
      shadow: '0 12px 32px rgba(9,9,11,0.06)',
    }),
  },
  {
    id: 'burgundy',
    name: 'Burgundy',
    tagline: 'Wine · ivory paper',
    swatches: ['#F7F1F2', '#7A1F35', '#3A101C'],
    tokens: mono({
      paper: '#F7F1F2',
      card: '#F0E4E7',
      line: '#E0C8CE',
      ink: '#2A1018',
      muted: '#8A5864',
      accent: '#7A1F35',
      accentSoft: '#EBD4DA',
      accentDeep: '#5C1528',
      accentOn: '#FFF8F9',
      rail: '#2A1018',
      railHover: '#3A1822',
      railActive: '#4A2030',
      railText: '#D4A8B4',
      railTextActive: '#FFF8F9',
      railLine: '#3E1C28',
      wash: 'linear-gradient(185deg, #3A1520 0%, #1E0C12 100%)',
      stage: 'radial-gradient(900px 520px at 0% 0%, rgba(122,31,53,0.12), transparent 55%), #F7F1F2',
      radius: '0.85rem',
      fontSerif: CORMORANT,
      fontSans: RALEWAY,
      typePair: 'Cormorant · Raleway',
      shadow: '0 14px 36px rgba(42,16,24,0.07)',
    }),
  },
  {
    id: 'navy',
    name: 'Navy',
    tagline: 'Deep blue · cool paper',
    swatches: ['#F0F3F8', '#1E3A5F', '#0F1C2E'],
    tokens: mono({
      paper: '#F0F3F8',
      card: '#E2E8F2',
      line: '#C5D0E0',
      ink: '#0F1C2E',
      muted: '#5A6E88',
      accent: '#1E3A5F',
      accentSoft: '#D4DEEC',
      accentDeep: '#14283F',
      accentOn: '#F5F8FC',
      rail: '#0F1C2E',
      railHover: '#162640',
      railActive: '#1E3454',
      railText: '#A8BCD4',
      railTextActive: '#F5F8FC',
      railLine: '#1A2C44',
      wash: 'linear-gradient(185deg, #162840 0%, #0A1420 100%)',
      stage: 'radial-gradient(900px 520px at 100% 0%, rgba(30,58,95,0.12), transparent 55%), #F0F3F8',
      radius: '0.7rem',
      fontSerif: INSTRUMENT,
      fontSans: DM_SANS,
      typePair: 'Instrument · DM Sans',
      shadow: '0 12px 32px rgba(15,28,46,0.07)',
    }),
  },
  {
    id: 'sage',
    name: 'Sage',
    tagline: 'Soft green · mist',
    swatches: ['#F2F5F0', '#4A6B52', '#1A261C'],
    tokens: mono({
      paper: '#F2F5F0',
      card: '#E4EBE2',
      line: '#C8D4C4',
      ink: '#1A261C',
      muted: '#5E7060',
      accent: '#4A6B52',
      accentSoft: '#D6E2D4',
      accentDeep: '#34503C',
      accentOn: '#F6FAF5',
      rail: '#1A261C',
      railHover: '#263428',
      railActive: '#324438',
      railText: '#B4C8B6',
      railTextActive: '#F6FAF5',
      railLine: '#2C3C30',
      wash: 'linear-gradient(185deg, #223028 0%, #121A14 100%)',
      stage: 'radial-gradient(900px 520px at 0% 0%, rgba(74,107,82,0.12), transparent 55%), #F2F5F0',
      radius: '0.9rem',
      fontSerif: FRAUNCES,
      fontSans: OUTFIT,
      typePair: 'Fraunces · Outfit',
      shadow: '0 14px 34px rgba(26,38,28,0.06)',
    }),
  },
  {
    id: 'copper',
    name: 'Copper',
    tagline: 'Warm metal · sand',
    swatches: ['#F6F1EA', '#A85C2E', '#2A1C12'],
    tokens: mono({
      paper: '#F6F1EA',
      card: '#EDE4D8',
      line: '#DBCDB8',
      ink: '#2A1C12',
      muted: '#8A7058',
      accent: '#A85C2E',
      accentSoft: '#E8D4C0',
      accentDeep: '#7E401C',
      accentOn: '#FFF9F2',
      rail: '#2A1C12',
      railHover: '#3A281A',
      railActive: '#4A3422',
      railText: '#D4B898',
      railTextActive: '#FFF9F2',
      railLine: '#3E2C1C',
      wash: 'linear-gradient(185deg, #342416 0%, #1A120C 100%)',
      stage: 'radial-gradient(900px 520px at 100% 0%, rgba(168,92,46,0.12), transparent 55%), #F6F1EA',
      radius: '0.8rem',
      fontSerif: FRAUNCES,
      fontSans: RALEWAY,
      typePair: 'Fraunces · Raleway',
      shadow: '0 14px 36px rgba(42,28,18,0.07)',
    }),
  },
  {
    id: 'pearl',
    name: 'Pearl',
    tagline: 'Soft charcoal · light rail',
    swatches: ['#FAFAF9', '#3F3F46', '#E7E5E4'],
    tokens: mono({
      paper: '#F5F5F4',
      card: '#E7E5E4',
      line: '#D6D3D1',
      ink: '#1C1917',
      muted: '#78716C',
      accent: '#3F3F46',
      accentSoft: '#D6D3D1',
      accentDeep: '#27272A',
      accentOn: '#FAFAF9',
      rail: '#FAFAF9',
      railHover: '#F0EFEE',
      railActive: '#E7E5E4',
      railText: '#78716C',
      railTextActive: '#1C1917',
      railLine: '#D6D3D1',
      wash: 'linear-gradient(180deg, #FFFFFF 0%, #F0EFEE 100%)',
      stage: 'linear-gradient(180deg, #FAFAF9 0%, #F0EFEE 100%)',
      radius: '0.65rem',
      fontSerif: INSTRUMENT,
      fontSans: DM_SANS,
      typePair: 'Instrument · DM Sans',
      shadow: '0 10px 28px rgba(28,25,23,0.05)',
    }),
  },
];

/** v7 — full skin redesign (graphite / burgundy / …). */
export const ADMIN_PALETTE_STORAGE_KEY = 'perg_admin_palette_v7';
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
