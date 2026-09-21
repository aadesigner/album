import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, ShoppingBag, FolderOpen, Image,
  Grid, Ruler, Settings, LogOut, X, Sparkles, ExternalLink, ShieldAlert, Check, Palette,
} from 'lucide-react';
import {
  ADMIN_PALETTES,
  DEFAULT_ADMIN_PALETTE_ID,
  applyAdminTokens,
  applyAdminTypography,
  getAdminPalette,
  readStoredAdminPaletteId,
  writeStoredAdminPaletteId,
  type AdminPaletteId,
  type AdminTokens,
} from '@/lib/adminTheme';

/** Mutable theme bag — pages import this; palette switch mutates + re-renders admin shell. */
export const ADMIN: AdminTokens = { ...getAdminPalette(DEFAULT_ADMIN_PALETTE_ID).tokens };

type AdminThemeCtx = {
  paletteId: AdminPaletteId;
  setPaletteId: (id: AdminPaletteId) => void;
  theme: AdminTokens;
};

const AdminThemeContext = createContext<AdminThemeCtx>({
  paletteId: DEFAULT_ADMIN_PALETTE_ID,
  setPaletteId: () => {},
  theme: ADMIN,
});

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

const navItems = [
  { href: '/heyadmin',           label: 'Dashboard',     Icon: LayoutDashboard, group: 'Overview' },
  { href: '/heyadmin/porosi',    label: 'Orders',        Icon: ShoppingBag,     group: 'Overview' },
  { href: '/heyadmin/perdorues', label: 'Users',         Icon: Users,           group: 'Overview' },
  { href: '/heyadmin/dizajne',   label: 'Design Studio', Icon: Sparkles,        group: 'Catalog' },
  { href: '/heyadmin/kategori',  label: 'Categories',    Icon: FolderOpen,      group: 'Catalog' },
  { href: '/heyadmin/template',  label: 'Templates',     Icon: Image,           group: 'Catalog' },
  { href: '/heyadmin/layout',    label: 'Layouts',       Icon: Grid,            group: 'Catalog' },
  { href: '/heyadmin/madhesia',  label: 'Book Sizes',    Icon: Ruler,           group: 'Catalog' },
  { href: '/heyadmin/siguria',   label: 'Security',      Icon: ShieldAlert,     group: 'System' },
  { href: '/heyadmin/cilesimet', label: 'Settings',      Icon: Settings,        group: 'System' },
] as const;

const navGroups = (['Overview', 'Catalog', 'System'] as const).map((title) => ({
  title,
  items: navItems.filter((i) => i.group === title),
}));

/** Compact theme menu — dropdown (desktop sticky) / dropup (mobile). */
function ThemeSwitcher({
  theme,
  paletteId,
  onSelect,
  placement = 'dropdown',
}: {
  theme: AdminTokens;
  paletteId: AdminPaletteId;
  onSelect: (id: AdminPaletteId) => void;
  placement?: 'dropdown' | 'dropup';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = ADMIN_PALETTES.find((p) => p.id === paletteId) || ADMIN_PALETTES[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const panelPos = placement === 'dropup'
    ? 'bottom-full mb-2 right-0 origin-bottom-right'
    : 'top-full mt-2 right-0 origin-top-right';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Theme: ${active.name}`}
        className="group flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-2xl transition-all active:scale-[0.98] focus:outline-none"
        style={{
          background: theme.card,
          border: `1px solid ${theme.line}`,
          boxShadow: open
            ? `0 8px 28px rgba(40,20,30,0.10), 0 0 0 1px ${theme.accent}33`
            : '0 4px 16px rgba(40,20,30,0.06)',
        }}
      >
        <span
          className="w-7 h-7 rounded-xl overflow-hidden shrink-0 flex shadow-inner"
          style={{ boxShadow: `inset 0 0 0 1px ${theme.line}` }}
        >
          <span className="w-[34%] h-full" style={{ background: active.swatches[0] }} />
          <span className="flex-1 h-full" style={{ background: active.swatches[1] }} />
          <span className="w-[28%] h-full" style={{ background: active.swatches[2] }} />
        </span>
        <span className="hidden sm:flex flex-col items-start min-w-0 leading-none">
          <span
            className="text-[9px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: theme.muted, opacity: 0.85 }}
          >
            Theme
          </span>
          <span
            className="text-[12px] font-semibold truncate max-w-[5.5rem] mt-0.5"
            style={{ color: theme.ink, fontFamily: theme.fontSerif }}
          >
            {active.name}
          </span>
        </span>
        <Palette size={14} className="sm:hidden shrink-0" style={{ color: theme.accent }} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Admin themes"
          className={`absolute z-50 w-[min(17.5rem,calc(100vw-1.5rem))] rounded-2xl overflow-hidden ${panelPos}`}
          style={{
            background: theme.card,
            border: `1px solid ${theme.line}`,
            boxShadow: '0 18px 48px rgba(40,16,28,0.14), 0 2px 8px rgba(40,16,28,0.06)',
            animation: 'adminThemeIn 160ms ease-out',
          }}
        >
          <div
            className="px-3.5 pt-3.5 pb-2.5"
            style={{ borderBottom: `1px solid ${theme.line}` }}
          >
            <p
              className="text-[10px] font-semibold tracking-[0.16em] uppercase"
              style={{ color: theme.muted }}
            >
              Color & type
            </p>
            <p
              className="text-[15px] font-semibold mt-0.5 leading-tight"
              style={{ color: theme.ink, fontFamily: theme.fontSerif }}
            >
              Pick a look
            </p>
          </div>

          <div className="p-2 max-h-[min(22rem,55vh)] overflow-y-auto overscroll-contain">
            {ADMIN_PALETTES.map((p) => {
              const isActive = p.id === paletteId;
              const isStandard = p.id === 'standard';
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onSelect(p.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors"
                  style={{
                    background: isActive ? p.tokens.accentSoft : 'transparent',
                    boxShadow: isActive ? `inset 0 0 0 1px ${p.tokens.accent}44` : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = theme.bg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isActive ? p.tokens.accentSoft : 'transparent';
                  }}
                >
                  <span
                    className="w-9 h-9 rounded-xl overflow-hidden shrink-0 flex"
                    style={{
                      boxShadow: isActive
                        ? `0 0 0 2px ${theme.card}, 0 0 0 3.5px ${p.tokens.accent}`
                        : `0 0 0 1px ${theme.line}`,
                    }}
                  >
                    <span className="w-[36%] h-full" style={{ background: p.swatches[0] }} />
                    <span className="flex-1 h-full" style={{ background: p.swatches[1] }} />
                    <span className="w-[26%] h-full" style={{ background: p.swatches[2] }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="text-[13px] font-semibold truncate"
                        style={{ color: theme.ink, fontFamily: p.tokens.fontSerif }}
                      >
                        {p.name}
                      </span>
                      {isStandard && (
                        <span
                          className="text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: p.tokens.accent, color: '#fff' }}
                        >
                          Default
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] truncate mt-0.5" style={{ color: theme.muted }}>
                      {p.tagline}
                    </span>
                  </span>
                  {isActive && (
                    <Check size={14} strokeWidth={2.75} className="shrink-0" style={{ color: p.tokens.accent }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes adminThemeIn {
          from { opacity: 0; transform: translateY(${placement === 'dropup' ? '6px' : '-6px'}) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function Sidebar({
  onClose, theme, variant = 'desktop',
}: {
  onClose?: () => void;
  theme: AdminTokens;
  variant?: 'desktop' | 'mobile';
}) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isMobile = variant === 'mobile';
  const initials = (user?.name || (user as any)?.phone || 'A')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="h-full flex flex-col relative overflow-hidden"
      style={{
        background: theme.sidebar,
        fontFamily: theme.fontSans,
        ...(isMobile ? {
          backgroundImage: `linear-gradient(165deg, ${theme.accentSoft} 0%, ${theme.sidebar} 42%, ${theme.sidebar} 100%)`,
        } : {}),
      }}
    >
      {isMobile && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 w-44 h-44 rounded-full blur-3xl opacity-50"
          style={{ background: theme.accent }}
        />
      )}

      <div
        className={`relative flex items-center justify-between ${isMobile ? 'px-5 pt-[max(1.1rem,env(safe-area-inset-top))] pb-4' : 'px-5 py-5'}`}
        style={{ borderBottom: `1px solid ${theme.sidebarLine}` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`${isMobile ? 'w-11 h-11 rounded-2xl shadow-sm' : 'w-9 h-9 rounded-xl'} flex items-center justify-center shrink-0`}
            style={{ background: theme.accent }}
          >
            <span
              className={`font-semibold text-white ${isMobile ? 'text-lg' : 'text-base'}`}
              style={{ fontFamily: theme.fontSerif }}
            >
              P
            </span>
          </div>
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold tracking-[0.18em] uppercase leading-none"
              style={{ color: theme.sidebarText, opacity: 0.7 }}
            >
              Admin
            </p>
            <p
              className={`font-semibold leading-tight mt-1 truncate ${isMobile ? 'text-[17px]' : 'text-[15px]'}`}
              style={{ color: theme.sidebarTextActive, fontFamily: theme.fontSerif }}
            >
              Përgjithmonë
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-10 h-10 rounded-2xl flex items-center justify-center transition-transform active:scale-95"
            style={{
              color: theme.sidebarTextActive,
              background: theme.card,
              border: `1px solid ${theme.sidebarLine}`,
              boxShadow: '0 4px 14px rgba(40,20,30,0.06)',
            }}
            aria-label="Close menu"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        )}
      </div>

      <nav className={`relative flex-1 overflow-y-auto overscroll-contain ${isMobile ? 'py-5 px-4' : 'py-4 px-3'}`}>
        {navGroups.map((group) => (
          <div key={group.title} className={isMobile ? 'mb-5' : 'mb-4'}>
            <p
              className={`font-semibold tracking-[0.16em] uppercase ${isMobile ? 'px-3 mb-2 text-[10px]' : 'px-3 mb-1.5 text-[10px]'}`}
              style={{ color: theme.sidebarText, opacity: 0.5 }}
            >
              {group.title}
            </p>
            <div className={isMobile ? 'space-y-1' : 'space-y-0.5'}>
              {group.items.map(({ href, label, Icon }) => {
                const isActive = location === href || (href !== '/heyadmin' && location.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`flex items-center gap-3 font-medium transition-all duration-200 ${
                      isMobile
                        ? 'px-3.5 py-[0.85rem] rounded-2xl text-[14px]'
                        : 'px-3 py-2.5 rounded-xl text-[13px]'
                    }`}
                    style={
                      isActive
                        ? {
                            background: theme.card,
                            color: theme.sidebarTextActive,
                            boxShadow: isMobile
                              ? `0 6px 20px rgba(40,20,30,0.07), inset 0 0 0 1px ${theme.sidebarLine}`
                              : undefined,
                            borderLeft: isMobile ? `3px solid ${theme.accent}` : undefined,
                            paddingLeft: isMobile ? '0.8rem' : undefined,
                          }
                        : { color: theme.sidebarText }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = theme.sidebarHover;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span
                      className={`flex items-center justify-center shrink-0 ${isMobile ? 'w-9 h-9 rounded-xl' : ''}`}
                      style={isMobile ? {
                        background: isActive ? theme.accentSoft : 'transparent',
                        color: isActive ? theme.accent : theme.sidebarText,
                      } : undefined}
                    >
                      <Icon
                        size={isMobile ? 17 : 16}
                        strokeWidth={isActive ? 2.35 : 1.75}
                        className="shrink-0"
                        style={!isMobile && isActive ? { color: theme.accent } : undefined}
                      />
                    </span>
                    <span className="truncate flex-1">{label}</span>
                    {isActive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: theme.accent }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={`relative ${isMobile ? 'p-4 pb-[max(1rem,env(safe-area-inset-bottom))]' : 'p-4'}`}
        style={{ borderTop: `1px solid ${theme.sidebarLine}` }}
      >
        <div
          className={`flex items-center gap-3 mb-3 ${isMobile ? 'p-3 rounded-2xl' : 'px-1'}`}
          style={isMobile ? {
            background: theme.card,
            border: `1px solid ${theme.sidebarLine}`,
            boxShadow: '0 4px 16px rgba(40,20,30,0.04)',
          } : undefined}
        >
          <div
            className={`${isMobile ? 'w-10 h-10' : 'w-9 h-9'} rounded-full flex items-center justify-center text-xs font-semibold shrink-0 text-white`}
            style={{ background: theme.accent }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: theme.sidebarTextActive }}>
              {user?.name || 'Admin'}
            </p>
            <p className="text-[11px] truncate" style={{ color: theme.sidebarText, opacity: 0.7 }}>
              {(user as any)?.phone || 'Administrator'}
            </p>
          </div>
        </div>

        <div className={isMobile ? 'grid grid-cols-2 gap-2' : ''}>
          <Link
            href="/"
            className={`flex items-center justify-center gap-2 font-medium transition-colors ${
              isMobile
                ? 'px-3 py-3 rounded-2xl text-[13px]'
                : 'px-3 py-2.5 w-full rounded-xl text-[13px] mb-0.5'
            }`}
            style={
              isMobile
                ? { color: theme.sidebarTextActive, background: theme.card, border: `1px solid ${theme.sidebarLine}` }
                : { color: theme.sidebarText }
            }
            onMouseEnter={(e) => {
              if (!isMobile) e.currentTarget.style.background = theme.sidebarHover;
            }}
            onMouseLeave={(e) => {
              if (!isMobile) e.currentTarget.style.background = 'transparent';
            }}
          >
            <ExternalLink size={15} />
            View site
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className={`flex items-center justify-center gap-2 font-medium transition-colors ${
              isMobile
                ? 'px-3 py-3 rounded-2xl text-[13px] text-white'
                : 'px-3 py-2.5 w-full rounded-xl text-[13px]'
            }`}
            style={isMobile ? { background: theme.accent } : { color: theme.accent }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/** Premium hamburger → X morph for the mobile top bar. */
function MenuToggle({ open, onClick, theme }: {
  open: boolean;
  onClick: () => void;
  theme: AdminTokens;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      className="relative w-11 h-11 rounded-2xl flex items-center justify-center transition-transform active:scale-95 shrink-0"
      style={{
        background: open ? theme.accent : theme.card,
        color: open ? '#fff' : theme.sidebarTextActive,
        border: open ? 'none' : `1px solid ${theme.sidebarLine}`,
        boxShadow: open
          ? `0 8px 22px ${theme.accent}55`
          : '0 4px 16px rgba(40,20,30,0.07)',
      }}
    >
      <span className="relative w-[18px] h-[14px] block">
        <span
          className="absolute left-0 right-0 h-[1.75px] rounded-full transition-all duration-300 ease-out"
          style={{
            background: 'currentColor',
            top: open ? '6px' : '1px',
            transform: open ? 'rotate(45deg)' : 'none',
          }}
        />
        <span
          className="absolute left-0 right-0 top-[6px] h-[1.75px] rounded-full transition-all duration-300 ease-out"
          style={{
            background: 'currentColor',
            opacity: open ? 0 : 1,
            transform: open ? 'scaleX(0)' : 'scaleX(1)',
          }}
        />
        <span
          className="absolute left-0 right-0 h-[1.75px] rounded-full transition-all duration-300 ease-out"
          style={{
            background: 'currentColor',
            top: open ? '6px' : '11px',
            transform: open ? 'rotate(-45deg)' : 'none',
          }}
        />
      </span>
    </button>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteId, setPaletteIdState] = useState<AdminPaletteId>(DEFAULT_ADMIN_PALETTE_ID);
  const [ready, setReady] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = readStoredAdminPaletteId();
    const palette = getAdminPalette(id);
    applyAdminTokens(ADMIN, palette.tokens);
    setPaletteIdState(id);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyAdminTypography(shellRef.current, ADMIN);
  }, [paletteId, ready]);

  // Close drawer on route change (mobile).
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [sidebarOpen]);

  const setPaletteId = useCallback((id: AdminPaletteId) => {
    const palette = getAdminPalette(id);
    applyAdminTokens(ADMIN, palette.tokens);
    writeStoredAdminPaletteId(id);
    setPaletteIdState(id);
    applyAdminTypography(shellRef.current, palette.tokens);
  }, []);

  const theme = useMemo(() => ({ ...ADMIN }), [paletteId, ready]);

  const ctx = useMemo(
    () => ({ paletteId, setPaletteId, theme }),
    [paletteId, setPaletteId, theme],
  );

  const currentLabel = useMemo(() => {
    const match = navItems.find(
      (i) => location === i.href || (i.href !== '/heyadmin' && location.startsWith(i.href)),
    );
    return match?.label || 'Dashboard';
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: ADMIN.bg }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: ADMIN.line, borderTopColor: ADMIN.accent }}
          />
          <p className="text-sm font-medium" style={{ color: ADMIN.muted }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center" style={{ background: ADMIN.bg }}>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: ADMIN.accentSoft }}
        >
          <ShieldAlert size={22} style={{ color: ADMIN.accentDeep }} />
        </div>
        <h1 className="text-2xl mb-2" style={{ color: ADMIN.ink, fontFamily: ADMIN.fontSerif }}>Access denied</h1>
        <p className="text-sm mb-8 max-w-xs" style={{ color: ADMIN.muted }}>
          You need admin privileges to view this page.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 text-white text-sm font-medium rounded-xl transition-opacity hover:opacity-90"
          style={{ background: ADMIN.accent }}
        >
          Back to site
        </Link>
      </div>
    );
  }

  return (
    <AdminThemeContext.Provider value={ctx}>
      <div
        ref={shellRef}
        className="min-h-[100dvh] flex admin-shell"
        style={{
          background: theme.bg,
          fontFamily: theme.fontSans,
          ['--admin-font-serif' as string]: theme.fontSerif,
          ['--admin-font-sans' as string]: theme.fontSans,
        }}
        data-admin-palette={paletteId}
      >
        {/* Desktop: left rail (no theme picker) */}
        <aside className="w-[15.75rem] fixed inset-y-0 left-0 z-30 hidden lg:block">
          <Sidebar theme={theme} variant="desktop" />
        </aside>

        {/* Mobile: dimmed backdrop */}
        <div
          className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            background: 'rgba(28, 16, 24, 0.42)',
            backdropFilter: sidebarOpen ? 'blur(6px)' : undefined,
            WebkitBackdropFilter: sidebarOpen ? 'blur(6px)' : undefined,
          }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden={!sidebarOpen}
        />

        {/* Mobile: premium right drawer */}
        <aside
          className={`fixed inset-y-0 right-0 z-50 w-[min(20.5rem,88vw)] lg:hidden transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{
            boxShadow: sidebarOpen ? '-18px 0 50px rgba(40,16,28,0.18)' : undefined,
            borderTopLeftRadius: '1.5rem',
            borderBottomLeftRadius: '1.5rem',
            overflow: 'hidden',
          }}
          aria-hidden={!sidebarOpen}
        >
          <Sidebar
            theme={theme}
            onClose={() => setSidebarOpen(false)}
            variant="mobile"
          />
        </aside>

        <main className="flex-1 lg:ml-[15.75rem] min-h-[100dvh] flex flex-col min-w-0 relative">
          {/* Desktop: sticky theme control, top-right — floats so pages keep full width */}
          <div
            className="hidden lg:block fixed z-40"
            style={{
              top: '1rem',
              right: '1.25rem',
            }}
          >
            <ThemeSwitcher
              theme={theme}
              paletteId={paletteId}
              onSelect={setPaletteId}
              placement="dropdown"
            />
          </div>

          {/* Mobile top bar — brand + page, theme dropup, menu */}
          <header
            className="lg:hidden sticky top-0 z-30 px-3.5 pt-[max(0.55rem,env(safe-area-inset-top))] pb-2.5"
            style={{
              background: `linear-gradient(180deg, ${theme.sidebar} 0%, ${theme.bg}ee 100%)`,
              borderBottom: `1px solid ${theme.sidebarLine}`,
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-semibold text-sm shadow-sm"
                  style={{ background: theme.accent, fontFamily: theme.fontSerif }}
                >
                  P
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[9px] font-semibold tracking-[0.16em] uppercase leading-none"
                    style={{ color: theme.sidebarText, opacity: 0.65 }}
                  >
                    Admin
                  </p>
                  <p
                    className="font-semibold text-[15px] leading-tight truncate mt-0.5"
                    style={{ color: theme.sidebarTextActive, fontFamily: theme.fontSerif }}
                  >
                    {currentLabel}
                  </p>
                </div>
              </div>

              <ThemeSwitcher
                theme={theme}
                paletteId={paletteId}
                onSelect={setPaletteId}
                placement="dropdown"
              />

              <MenuToggle
                open={sidebarOpen}
                onClick={() => setSidebarOpen((v) => !v)}
                theme={theme}
              />
            </div>
          </header>

          {/* key forces page chrome to re-read ADMIN tokens after palette change */}
          <div
            className="flex-1 min-w-0 admin-content"
            key={paletteId}
            style={{
              fontFamily: theme.fontSans,
            }}
          >
            <style>{`
              .admin-shell .font-serif,
              .admin-content h1,
              .admin-content h2,
              .admin-content h3 {
                font-family: var(--admin-font-serif, ${theme.fontSerif}) !important;
              }
            `}</style>
            {children}
          </div>
        </main>
      </div>
    </AdminThemeContext.Provider>
  );
}
