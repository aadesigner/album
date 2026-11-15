import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, ShoppingBag, FolderOpen, Image,
  Grid, Ruler, Settings, LogOut, X, Sparkles, ExternalLink, ShieldAlert, Check, Palette,
  FileText, Sticker, ChevronDown, Paintbrush, Search,
} from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
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
import { AdminStickyNotes } from '@/components/admin/AdminStickyNotes';
import { AdminCommandSearch, type AdminSearchEntry } from '@/components/admin/AdminCommandSearch';

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
  { href: '/heyadmin/elemente',  label: 'Text / Elements', Icon: Sticker,       group: 'Catalog' },
  { href: '/heyadmin/kategori',  label: 'Categories',    Icon: FolderOpen,      group: 'Catalog' },
  { href: '/heyadmin/template',  label: 'Templates',     Icon: Image,           group: 'Catalog' },
  { href: '/heyadmin/layout',    label: 'Layouts',       Icon: Grid,            group: 'Catalog' },
  { href: '/heyadmin/madhesia',  label: 'Book Sizes',    Icon: Ruler,           group: 'Catalog' },
  { href: '/heyadmin/site',      label: 'Site pages',    Icon: FileText,        group: 'Website' },
  { href: '/heyadmin/tema',      label: 'Web Theme',     Icon: Paintbrush,      group: 'Website' },
  { href: '/heyadmin/siguria',   label: 'Security',      Icon: ShieldAlert,     group: 'System' },
  { href: '/heyadmin/cilesimet', label: 'Settings',      Icon: Settings,        group: 'System' },
] as const;

type NavGroupTitle = typeof navItems[number]['group'];

const NAV_GROUP_ORDER: NavGroupTitle[] = ['Overview', 'Catalog', 'Website', 'System'];

const navGroups = NAV_GROUP_ORDER.map((title) => ({
  title,
  items: navItems.filter((i) => i.group === title),
}));

const ADMIN_SEARCH_ENTRIES: AdminSearchEntry[] = navItems.map((i) => ({
  href: i.href,
  label: i.label,
  group: i.group,
  Icon: i.Icon,
  keywords: [i.label, i.group, i.href.replace('/heyadmin/', '').replace(/\//g, ' ')],
}));

const SIDEBAR_OPEN_KEY = 'admin-nav-open-groups';

/** Catalog stays expanded so Design Studio / Categories / Layouts stay one click away. */
const PINNED_OPEN_GROUPS: NavGroupTitle[] = ['Catalog'];

function readOpenGroups(activeGroup: NavGroupTitle): Record<NavGroupTitle, boolean> {
  const base: Record<NavGroupTitle, boolean> = {
    Overview: false,
    Catalog: true,
    Website: false,
    System: false,
  };
  base[activeGroup] = true;
  for (const g of PINNED_OPEN_GROUPS) base[g] = true;
  try {
    const raw = sessionStorage.getItem(SIDEBAR_OPEN_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<NavGroupTitle, boolean>>;
    for (const g of NAV_GROUP_ORDER) {
      if (typeof parsed[g] === 'boolean') base[g] = parsed[g]!;
    }
    base[activeGroup] = true;
    for (const g of PINNED_OPEN_GROUPS) base[g] = true;
  } catch { /* ignore */ }
  return base;
}

function groupForLocation(location: string): NavGroupTitle {
  const match = navItems.find(
    (i) => location === i.href || (i.href !== '/heyadmin' && location.startsWith(i.href)),
  );
  return match?.group ?? 'Overview';
}

type AdminPulse = {
  pending: number;
  pendingRevenue: number;
  confirmed: number;
  printing: number;
  shipped: number;
  todayOrders: number;
  todayVisitors: number;
};

function useAdminPulse(enabled = true) {
  return useQuery({
    queryKey: ['admin-pulse'],
    enabled,
    queryFn: async () => {
      const r = await authFetch('/api/admin/stats/pulse');
      if (!r.ok) throw new Error('Failed to load pulse');
      return r.json() as Promise<AdminPulse>;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** Compact theme menu — dropdown (desktop) / dropup (mobile). Live type + color cards. */
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
    ? 'bottom-full mb-2.5 right-0 origin-bottom-right'
    : 'top-full mt-2.5 right-0 origin-top-right';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Theme: ${active.name}`}
        className="group flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 transition-all active:scale-[0.98] focus:outline-none"
        style={{
          background: theme.card,
          border: `1px solid ${theme.line}`,
          borderRadius: theme.radius,
          boxShadow: open
            ? `0 10px 32px rgba(40,20,30,0.12), 0 0 0 1px ${theme.accent}40`
            : theme.cardShadow,
        }}
      >
        <span
          className="relative w-8 h-8 overflow-hidden shrink-0 flex items-center justify-center"
          style={{
            borderRadius: `calc(${theme.radius} - 4px)`,
            background: active.tokens.accent,
            color: active.tokens.accentOn,
            fontFamily: active.tokens.fontSerif,
            boxShadow: `inset 0 0 0 1px ${theme.line}`,
          }}
        >
          <span className="text-[12px] font-semibold leading-none">Aa</span>
        </span>
        <span className="hidden sm:flex flex-col items-start min-w-0 leading-none gap-1">
          <span
            className="text-[12.5px] font-semibold truncate max-w-[6.5rem]"
            style={{ color: theme.ink, fontFamily: theme.fontSerif }}
          >
            {active.name}
          </span>
          <span
            className="text-[9px] font-medium tracking-[0.02em] truncate max-w-[6.5rem]"
            style={{ color: theme.muted, fontFamily: theme.fontSans }}
          >
            {active.tokens.typePair.split(' · ')[0]}
          </span>
        </span>
        <Palette size={14} className="sm:hidden shrink-0" style={{ color: theme.accent }} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Admin themes"
          className={`absolute z-50 w-[min(20.5rem,calc(100vw-1.25rem))] overflow-hidden ${panelPos}`}
          style={{
            background: theme.card,
            border: `1px solid ${theme.line}`,
            borderRadius: `calc(${theme.radius} + 0.35rem)`,
            boxShadow: '0 24px 56px rgba(40,16,28,0.16), 0 4px 12px rgba(40,16,28,0.06)',
            animation: 'adminThemeIn 180ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <div
            className="relative px-4 pt-4 pb-3 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${theme.accentSoft} 0%, ${theme.card} 70%)`,
              borderBottom: `1px solid ${theme.line}`,
            }}
          >
            <p
              className="text-[10px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: theme.muted }}
            >
              Studio look
            </p>
            <p
              className="text-[18px] font-semibold mt-1 leading-none"
              style={{ color: theme.ink, fontFamily: theme.fontSerif }}
            >
              Color & type
            </p>
            <p className="text-[11px] mt-1.5" style={{ color: theme.muted, fontFamily: theme.fontSans }}>
              Each look has its own voice
            </p>
          </div>

          <div className="p-2.5 grid grid-cols-2 gap-2 max-h-[min(26rem,58vh)] overflow-y-auto overscroll-contain">
            {ADMIN_PALETTES.map((p) => {
              const isActive = p.id === paletteId;
              const isStandard = p.id === DEFAULT_ADMIN_PALETTE_ID;
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
                  className="relative text-left transition-transform active:scale-[0.98] focus:outline-none overflow-hidden"
                  style={{
                    background: p.tokens.bg,
                    borderRadius: p.tokens.radius,
                    border: isActive
                      ? `1.5px solid ${p.tokens.accent}`
                      : `1px solid ${p.tokens.line}`,
                    boxShadow: isActive
                      ? `0 8px 22px ${p.tokens.accent}28, inset 0 0 0 1px ${p.tokens.accent}22`
                      : '0 2px 8px rgba(40,20,30,0.04)',
                  }}
                >
                  <div
                    className="h-12 flex items-end justify-between px-2.5 pb-1.5 pt-2"
                    style={{
                      background: p.tokens.accent,
                    }}
                  >
                    <span
                      className="text-[22px] leading-none font-semibold"
                      style={{ color: p.tokens.accentOn, fontFamily: p.tokens.fontSerif }}
                    >
                      Aa
                    </span>
                    {isActive && (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: p.tokens.accentOn, color: p.tokens.accent }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                    {isStandard && !isActive && (
                      <span
                        className="text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5"
                        style={{
                          background: p.tokens.accentOn,
                          color: p.tokens.accent,
                          borderRadius: '999px',
                        }}
                      >
                        Default
                      </span>
                    )}
                  </div>
                  <div className="px-2.5 pt-2 pb-2.5">
                    <p
                      className="text-[13px] font-semibold leading-tight truncate"
                      style={{ color: p.tokens.ink, fontFamily: p.tokens.fontSerif }}
                    >
                      {p.name}
                    </p>
                    <p
                      className="text-[10px] mt-0.5 truncate leading-snug"
                      style={{ color: p.tokens.muted, fontFamily: p.tokens.fontSans }}
                    >
                      {p.tokens.typePair}
                    </p>
                    <div
                      className="h-1.5 mt-2 rounded-full"
                      style={{ background: p.tokens.accent }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes adminThemeIn {
          from { opacity: 0; transform: translateY(${placement === 'dropup' ? '8px' : '-8px'}) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function Sidebar({
  onClose, theme, variant = 'desktop', onOpenSearch,
}: {
  onClose?: () => void;
  theme: AdminTokens;
  variant?: 'desktop' | 'mobile';
  onOpenSearch?: () => void;
}) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { data: pulse } = useAdminPulse();
  const isMobile = variant === 'mobile';
  const activeGroup = groupForLocation(location);
  const [openGroups, setOpenGroups] = useState<Record<NavGroupTitle, boolean>>(() =>
    readOpenGroups(activeGroup),
  );

  useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      if (!next[activeGroup]) { next[activeGroup] = true; changed = true; }
      for (const g of PINNED_OPEN_GROUPS) {
        if (!next[g]) { next[g] = true; changed = true; }
      }
      if (!changed) return prev;
      try { sessionStorage.setItem(SIDEBAR_OPEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [activeGroup]);

  const toggleGroup = (title: NavGroupTitle) => {
    // Pinned groups (Catalog) stay open — only collapse other sections.
    if (PINNED_OPEN_GROUPS.includes(title)) return;
    setOpenGroups((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      for (const g of PINNED_OPEN_GROUPS) next[g] = true;
      try { sessionStorage.setItem(SIDEBAR_OPEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

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
      }}
    >
      <div
        className={`relative flex items-center gap-3 ${isMobile ? 'px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3' : 'px-4 pt-5 pb-4'}`}
      >
        <div
          className="w-9 h-9 flex items-center justify-center shrink-0 text-[15px] font-semibold"
          style={{ background: theme.accent, color: theme.accentOn, borderRadius: 12 }}
        >
          P
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold truncate leading-tight" style={{ color: theme.sidebarTextActive }}>
            Përgjithmonë
          </p>
          <p className="text-[11px] truncate mt-0.5" style={{ color: theme.sidebarText, opacity: 0.7 }}>
            Admin
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-9 h-9 flex items-center justify-center shrink-0"
            style={{ color: theme.sidebarTextActive, background: theme.sidebarHover, borderRadius: 10 }}
            aria-label="Close menu"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        )}
      </div>

      <div className={`relative ${isMobile ? 'px-3' : 'px-3'}`}>
        <button
          type="button"
          onClick={() => {
            onOpenSearch?.();
            if (onClose && isMobile) onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
          style={{
            borderRadius: 12,
            background: theme.sidebarHover,
            color: theme.sidebarText,
            border: `1px solid ${theme.sidebarLine}`,
          }}
          aria-label="Search admin pages"
        >
          <Search size={15} strokeWidth={2} className="shrink-0 opacity-70" />
          <span className="flex-1 text-[13px] truncate opacity-80">Search…</span>
          <kbd
            className="hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded-md"
            style={{ background: theme.sidebarActive, color: theme.sidebarTextActive }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className={`relative flex-1 overflow-y-auto overscroll-contain ${isMobile ? 'py-3 px-3' : 'py-3 px-2.5'}`}>
        {navGroups.map((group) => {
          const open = openGroups[group.title];
          const groupHasActive = group.items.some(
            (i) => location === i.href || (i.href !== '/heyadmin' && location.startsWith(i.href)),
          );
          const pendingInGroup = group.items.some((i) => i.href === '/heyadmin/porosi')
            ? (pulse?.pending || 0)
            : 0;
          return (
            <div key={group.title} className="mb-3">
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                aria-expanded={open}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  color: groupHasActive ? theme.sidebarTextActive : theme.sidebarText,
                  opacity: 0.85,
                  cursor: PINNED_OPEN_GROUPS.includes(group.title) ? 'default' : 'pointer',
                }}
              >
                <span className="flex-1 text-left truncate">{group.title}</span>
                {!!pendingInGroup && !open && (
                  <span
                    className="min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center text-[9px] font-bold rounded-full"
                    style={{ background: theme.accent, color: theme.accentOn }}
                  >
                    {pendingInGroup > 99 ? '99+' : pendingInGroup}
                  </span>
                )}
                <ChevronDown
                  size={13}
                  strokeWidth={2.25}
                  className="shrink-0 transition-transform duration-200 opacity-60"
                  style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                />
              </button>
              <div
                className="overflow-hidden transition-[grid-template-rows] duration-200"
                style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr' }}
              >
                <div className="min-h-0">
                  <div className="space-y-0.5 pt-0.5">
                    {group.items.map(({ href, label, Icon }) => {
                      const isActive = location === href || (href !== '/heyadmin' && location.startsWith(href));
                      const badge = href === '/heyadmin/porosi' ? pulse?.pending : 0;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={onClose}
                          className={`flex items-center gap-2.5 px-2.5 font-medium transition-colors ${
                            isMobile ? 'py-2.5 text-[13.5px]' : 'py-2 text-[13px]'
                          }`}
                          style={{
                            borderRadius: 10,
                            background: isActive ? theme.sidebarActive : 'transparent',
                            color: isActive ? theme.sidebarTextActive : theme.sidebarText,
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.background = theme.sidebarHover;
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Icon
                            size={16}
                            strokeWidth={isActive ? 2.2 : 1.7}
                            className="shrink-0"
                            style={{ color: isActive ? theme.accent : undefined, opacity: isActive ? 1 : 0.75 }}
                          />
                          <span className="truncate flex-1">{label}</span>
                          {!!badge && (
                            <span
                              className="min-w-[1.2rem] h-[1.2rem] px-1 flex items-center justify-center text-[10px] font-bold rounded-full shrink-0"
                              style={{ background: theme.accent, color: theme.accentOn }}
                            >
                              {badge > 99 ? '99+' : badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div
        className={`relative ${isMobile ? 'p-3 pb-[max(0.85rem,env(safe-area-inset-bottom))]' : 'p-3'}`}
        style={{ borderTop: `1px solid ${theme.sidebarLine}` }}
      >
        {pulse && (
          <div
            className="mb-3 px-2.5 py-2 rounded-[10px]"
            style={{ background: theme.sidebarHover, color: theme.sidebarText }}
          >
            <p className="text-[11px] leading-snug">
              <span className="font-semibold" style={{ color: theme.sidebarTextActive }}>{pulse.todayVisitors}</span>
              {' '}today
              <span className="opacity-40"> · </span>
              <span className="font-semibold" style={{ color: theme.sidebarTextActive }}>{pulse.pending}</span>
              {' '}to print
            </p>
          </div>
        )}
        <div className="flex items-center gap-2.5 px-1 mb-3">
          <div
            className="w-9 h-9 flex items-center justify-center text-[11px] font-semibold shrink-0 rounded-full"
            style={{ background: theme.accent, color: theme.accentOn }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: theme.sidebarTextActive }}>
              {user?.name || 'Admin'}
            </p>
            <p className="text-[11px] truncate" style={{ color: theme.sidebarText, opacity: 0.7 }}>
              {(user as any)?.phone || 'Administrator'}
            </p>
          </div>
        </div>

        <div className={isMobile ? 'grid grid-cols-2 gap-2' : 'space-y-0.5'}>
          <Link
            href="/"
            className={`flex items-center gap-2 font-medium transition-colors ${
              isMobile ? 'justify-center px-3 py-2.5 text-[13px]' : 'px-2.5 py-2 w-full text-[13px]'
            }`}
            style={{ borderRadius: 10, color: theme.sidebarText }}
            onMouseEnter={(e) => { e.currentTarget.style.background = theme.sidebarHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ExternalLink size={15} />
            View site
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className={`flex items-center gap-2 font-medium transition-colors ${
              isMobile ? 'justify-center px-3 py-2.5 text-[13px]' : 'px-2.5 py-2 w-full text-[13px]'
            }`}
            style={{ borderRadius: 10, color: theme.sidebarText }}
            onMouseEnter={(e) => { e.currentTarget.style.background = theme.sidebarHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
function MenuToggle({ open, onClick, theme, badge = 0 }: {
  open: boolean;
  onClick: () => void;
  theme: AdminTokens;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      className="relative w-11 h-11 flex items-center justify-center transition-transform active:scale-95 shrink-0"
      style={{
        background: open ? theme.accent : theme.card,
        color: open ? theme.accentOn : theme.ink,
        border: open ? 'none' : `1px solid ${theme.line}`,
        borderRadius: theme.radius,
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
      {!open && badge > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[1.05rem] h-[1.05rem] px-1 flex items-center justify-center text-[9px] font-bold text-white"
          style={{ background: theme.accent, color: theme.accentOn, borderRadius: '999px', boxShadow: `0 0 0 2px ${theme.card}` }}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: pulse } = useAdminPulse(user?.role === 'admin');
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

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

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

  const hideThemeSwitcher =
    location === '/heyadmin/dizajne' || location.startsWith('/heyadmin/dizajne/')
    || location === '/heyadmin/site' || location.startsWith('/heyadmin/site/');

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
          background: theme.stageWash || theme.bg,
          fontFamily: theme.fontSans,
          ['--admin-font-serif' as string]: theme.fontSerif,
          ['--admin-font-sans' as string]: theme.fontSans,
          ['--admin-radius' as string]: theme.radius,
          ['--admin-accent' as string]: theme.accent,
          ['--admin-accent-soft' as string]: theme.accentSoft,
          ['--admin-accent-deep' as string]: theme.accentDeep,
          ['--admin-accent-on' as string]: theme.accentOn,
          ['--admin-bg' as string]: theme.bg,
          ['--admin-ink' as string]: theme.ink,
          ['--admin-line' as string]: theme.line,
        }}
        data-admin-palette={paletteId}
      >
        {/* Desktop: left rail */}
        <aside
          className="w-[15rem] fixed inset-y-0 left-0 z-20 hidden lg:block"
          style={{ borderRight: `1px solid ${theme.sidebarLine}`, boxShadow: `4px 0 24px ${theme.accent}14` }}
        >
          <Sidebar theme={theme} variant="desktop" onOpenSearch={() => setSearchOpen(true)} />
        </aside>

        <AdminCommandSearch
          theme={theme}
          entries={ADMIN_SEARCH_ENTRIES}
          open={searchOpen}
          onOpenChange={setSearchOpen}
          hideTrigger
        />

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
          className={`fixed inset-y-0 right-0 z-50 w-[min(18.5rem,88vw)] lg:hidden transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
            onOpenSearch={() => setSearchOpen(true)}
          />
        </aside>

        <main className="flex-1 lg:ml-[15rem] min-h-[100dvh] flex flex-col min-w-0 relative">
          {/* Desktop: sticky theme control, top-right — floats so pages keep full width */}
          {!hideThemeSwitcher && (
            <div
              className="hidden lg:block fixed"
              style={{
                top: '1rem',
                right: '1.25rem',
                zIndex: 25,
              }}
            >
              <ThemeSwitcher
                theme={theme}
                paletteId={paletteId}
                onSelect={setPaletteId}
                placement="dropdown"
              />
            </div>
          )}

          {/* Mobile top bar */}
          <header
            className="lg:hidden sticky top-0 z-20 px-3.5 pt-[max(0.55rem,env(safe-area-inset-top))] pb-2.5"
            style={{
              background: theme.card,
              borderBottom: `1px solid ${theme.line}`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="min-w-0">
                  <p className="font-semibold text-[1.05rem] leading-tight truncate" style={{ color: theme.ink }}>
                    {currentLabel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 flex items-center justify-center shrink-0"
                style={{
                  color: theme.ink,
                  background: theme.card,
                  border: `1px solid ${theme.line}`,
                  borderRadius: theme.radius,
                }}
                aria-label="Search admin pages"
              >
                <Search size={16} strokeWidth={2} />
              </button>

              {!hideThemeSwitcher && (
                <ThemeSwitcher
                  theme={theme}
                  paletteId={paletteId}
                  onSelect={setPaletteId}
                  placement="dropdown"
                />
              )}

              <MenuToggle
                open={sidebarOpen}
                onClick={() => setSidebarOpen((v) => !v)}
                theme={theme}
                badge={pulse?.pending || 0}
              />
            </div>
          </header>

          <div
            className="flex-1 min-w-0 admin-content relative"
            key={paletteId}
            style={{ fontFamily: theme.fontSans }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.22]"
              style={{
                backgroundImage: `radial-gradient(${theme.accent}40 0.55px, transparent 0.7px)`,
                backgroundSize: '11px 11px',
                maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.45), transparent 78%)',
                WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.45), transparent 78%)',
              }}
            />
            <style>{`
              .admin-shell {
                --admin-font-serif: ${theme.fontSerif};
                --admin-font-sans: ${theme.fontSans};
                --admin-radius: ${theme.radius};
              }
              .admin-shell,
              .admin-content {
                font-family: var(--admin-font-sans) !important;
              }
              .admin-shell .font-serif,
              .admin-content h1,
              .admin-content h2,
              .admin-content h3,
              .admin-content .font-serif {
                font-family: var(--admin-font-serif) !important;
              }
            `}</style>
            {/* No z-index here — overlays must portal / use z≥100 so they cover the rail + theme chip */}
            <div className="relative">{children}</div>
          </div>

          <AdminStickyNotes />
        </main>
      </div>
    </AdminThemeContext.Provider>
  );
}
