import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, ShoppingBag, FolderOpen, Image,
  Grid, Ruler, Settings, LogOut, Menu, X, Sparkles, ExternalLink, ShieldAlert, Check,
} from 'lucide-react';
import {
  ADMIN_PALETTES,
  DEFAULT_ADMIN_PALETTE_ID,
  applyAdminTokens,
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

function PalettePicker({ theme, paletteId, onSelect }: {
  theme: AdminTokens;
  paletteId: AdminPaletteId;
  onSelect: (id: AdminPaletteId) => void;
}) {
  return (
    <div className="px-1 mb-3">
      <p
        className="text-[10px] font-semibold tracking-[0.14em] uppercase px-2 mb-2"
        style={{ color: theme.sidebarText, opacity: 0.55 }}
      >
        Theme
      </p>
      <div className="grid grid-cols-5 gap-1.5 px-1">
        {ADMIN_PALETTES.map((p) => {
          const active = p.id === paletteId;
          return (
            <button
              key={p.id}
              type="button"
              title={p.name}
              onClick={() => onSelect(p.id)}
              className="relative aspect-square rounded-lg overflow-hidden transition-transform hover:scale-110 focus:outline-none"
              style={{
                boxShadow: active
                  ? `0 0 0 2px ${theme.sidebar}, 0 0 0 3.5px ${p.tokens.accent}`
                  : `0 0 0 1px ${theme.sidebarLine}`,
              }}
              aria-label={`Palette ${p.name}`}
              aria-pressed={active}
            >
              <span className="absolute inset-0 flex">
                <span className="w-[38%] h-full" style={{ background: p.swatches[0] }} />
                <span className="flex-1 h-full" style={{ background: p.swatches[1] }} />
                <span className="w-[28%] h-full" style={{ background: p.swatches[2] }} />
              </span>
              {active && (
                <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <Check size={10} className="text-white drop-shadow" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] px-2 mt-1.5 truncate" style={{ color: theme.sidebarText, opacity: 0.7 }}>
        {ADMIN_PALETTES.find((p) => p.id === paletteId)?.name}
      </p>
    </div>
  );
}

function Sidebar({
  onClose, theme, paletteId, onPalette,
}: {
  onClose?: () => void;
  theme: AdminTokens;
  paletteId: AdminPaletteId;
  onPalette: (id: AdminPaletteId) => void;
}) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const initials = (user?.name || (user as any)?.phone || 'A')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-full flex flex-col" style={{ background: theme.sidebar }}>
      <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.sidebarLine}` }}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: theme.accent }}
          >
            <span className="font-serif text-base font-semibold text-white">P</span>
          </div>
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold tracking-[0.16em] uppercase leading-none"
              style={{ color: theme.sidebarText, opacity: 0.75 }}
            >
              Admin
            </p>
            <p
              className="text-[15px] font-serif font-semibold leading-tight mt-0.5 truncate"
              style={{ color: theme.sidebarTextActive }}
            >
              Përgjithmonë
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: theme.sidebarText }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            <p
              className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: theme.sidebarText, opacity: 0.55 }}
            >
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, Icon }) => {
                const isActive = location === href || (href !== '/heyadmin' && location.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150"
                    style={
                      isActive
                        ? { background: theme.sidebarActive, color: theme.sidebarTextActive }
                        : { color: theme.sidebarText }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = theme.sidebarHover;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Icon
                      size={16}
                      strokeWidth={isActive ? 2.25 : 1.75}
                      className="shrink-0"
                      style={{ color: isActive ? theme.accent : undefined }}
                    />
                    <span className="truncate">{label}</span>
                    {isActive && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
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

      <div className="p-4" style={{ borderTop: `1px solid ${theme.sidebarLine}` }}>
        <PalettePicker theme={theme} paletteId={paletteId} onSelect={onPalette} />

        <div className="flex items-center gap-3 px-1 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 text-white"
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
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium transition-colors mb-0.5"
          style={{ color: theme.sidebarText }}
          onMouseEnter={(e) => { e.currentTarget.style.background = theme.sidebarHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ExternalLink size={15} />
          View site
        </Link>
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium transition-colors"
          style={{ color: theme.accent }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteId, setPaletteIdState] = useState<AdminPaletteId>(DEFAULT_ADMIN_PALETTE_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = readStoredAdminPaletteId();
    applyAdminTokens(ADMIN, getAdminPalette(id).tokens);
    setPaletteIdState(id);
    setReady(true);
  }, []);

  const setPaletteId = useCallback((id: AdminPaletteId) => {
    applyAdminTokens(ADMIN, getAdminPalette(id).tokens);
    writeStoredAdminPaletteId(id);
    setPaletteIdState(id);
  }, []);

  const theme = useMemo(() => ({ ...ADMIN }), [paletteId, ready]);

  const ctx = useMemo(
    () => ({ paletteId, setPaletteId, theme }),
    [paletteId, setPaletteId, theme],
  );

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
        <h1 className="text-2xl font-serif mb-2" style={{ color: ADMIN.ink }}>Access denied</h1>
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
        className="min-h-[100dvh] flex admin-shell"
        style={{ background: theme.bg }}
        data-admin-palette={paletteId}
      >
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 lg:hidden"
            style={{ background: 'rgba(18,20,26,0.5)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className="w-[15.75rem] fixed inset-y-0 left-0 z-30 hidden lg:block">
          <Sidebar theme={theme} paletteId={paletteId} onPalette={setPaletteId} />
        </aside>

        <aside
          className={`w-[17rem] fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-out lg:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ boxShadow: sidebarOpen ? '12px 0 40px rgba(0,0,0,0.25)' : undefined }}
        >
          <Sidebar
            theme={theme}
            paletteId={paletteId}
            onPalette={setPaletteId}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>

        <main className="flex-1 lg:ml-[15.75rem] min-h-[100dvh] flex flex-col min-w-0">
          <div
            className="lg:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-10"
            style={{ background: theme.sidebar, borderBottom: `1px solid ${theme.sidebarLine}` }}
          >
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 rounded-xl"
              style={{ color: theme.sidebarTextActive }}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-semibold tracking-[0.14em] uppercase"
                style={{ color: theme.sidebarText, opacity: 0.7 }}
              >
                Admin
              </p>
              <p
                className="font-serif font-semibold text-[15px] leading-tight truncate"
                style={{ color: theme.sidebarTextActive }}
              >
                Përgjithmonë
              </p>
            </div>
          </div>

          {/* key forces page chrome to re-read ADMIN tokens after palette change */}
          <div className="flex-1 min-w-0" key={paletteId}>{children}</div>
        </main>
      </div>
    </AdminThemeContext.Provider>
  );
}
