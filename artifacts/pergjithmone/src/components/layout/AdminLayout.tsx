import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, ShoppingBag, FolderOpen, Image,
  Grid, Ruler, Settings, LogOut, Menu, X, Sparkles, ExternalLink, ShieldAlert,
} from 'lucide-react';

/** Soft blush admin shell — dusty rose, charcoal, Playfair. No fuchsia/purple. */
export const ADMIN = {
  bg: '#FBF7F5',
  blush: '#C97B84',
  blushSoft: '#F3E4E6',
  blushDeep: '#A85C66',
  ink: '#2A2224',
  muted: '#8A7A7C',
  card: '#FFFFFF',
  line: '#EDE4E5',
} as const;

const navItems = [
  { href: '/heyadmin',           label: 'Dashboard',     Icon: LayoutDashboard },
  { href: '/heyadmin/porosi',    label: 'Orders',        Icon: ShoppingBag },
  { href: '/heyadmin/perdorues', label: 'Users',         Icon: Users },
  { href: '/heyadmin/kategori',  label: 'Categories',    Icon: FolderOpen },
  { href: '/heyadmin/dizajne',   label: 'Design Studio', Icon: Sparkles },
  { href: '/heyadmin/template',  label: 'Templates',     Icon: Image },
  { href: '/heyadmin/layout',    label: 'Layouts',       Icon: Grid },
  { href: '/heyadmin/madhesia',  label: 'Book Sizes',    Icon: Ruler },
  { href: '/heyadmin/siguria',   label: 'Security',      Icon: ShieldAlert },
  { href: '/heyadmin/cilesimet', label: 'Settings',      Icon: Settings },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const initials = (user?.name || (user as any)?.phone || 'A')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-full flex flex-col" style={{ background: ADMIN.card, borderRight: `1px solid ${ADMIN.line}` }}>
      <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${ADMIN.line}` }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: ADMIN.blushSoft }}
          >
            <span className="font-serif text-base font-semibold" style={{ color: ADMIN.blushDeep }}>P</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase leading-none" style={{ color: ADMIN.blush }}>
              Studio
            </p>
            <p className="text-[15px] font-serif font-semibold leading-tight mt-0.5" style={{ color: ADMIN.ink }}>
              Përgjithmonë
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl transition-colors"
            style={{ color: ADMIN.muted }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = location === href || (href !== '/heyadmin' && location.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all duration-150 relative"
              style={
                isActive
                  ? { background: ADMIN.blushSoft, color: ADMIN.blushDeep }
                  : { color: ADMIN.muted }
              }
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: ADMIN.blush }}
                />
              )}
              <Icon size={16} strokeWidth={isActive ? 2.25 : 1.75} className="shrink-0 opacity-90" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4" style={{ borderTop: `1px solid ${ADMIN.line}` }}>
        <div className="flex items-center gap-3 px-2 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: ADMIN.blushSoft, color: ADMIN.blushDeep }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: ADMIN.ink }}>{user?.name || 'Admin'}</p>
            <p className="text-[11px] truncate" style={{ color: ADMIN.muted }}>
              {(user as any)?.phone || 'Administrator'}
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3.5 py-2.5 w-full rounded-2xl text-[13px] font-medium transition-colors mb-0.5"
          style={{ color: ADMIN.muted }}
        >
          <ExternalLink size={15} />
          Back to site
        </Link>
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-2.5 px-3.5 py-2.5 w-full rounded-2xl text-[13px] font-medium transition-colors"
          style={{ color: ADMIN.blush }}
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

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: ADMIN.bg }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: ADMIN.blushSoft, borderTopColor: ADMIN.blush }}
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
          style={{ background: ADMIN.blushSoft }}
        >
          <ShieldAlert size={22} style={{ color: ADMIN.blushDeep }} />
        </div>
        <h1 className="text-2xl font-serif mb-2" style={{ color: ADMIN.ink }}>Access denied</h1>
        <p className="text-sm mb-8 max-w-xs" style={{ color: ADMIN.muted }}>
          You need admin privileges to view this page.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 text-white text-sm font-medium rounded-2xl transition-opacity hover:opacity-90"
          style={{ background: ADMIN.blush }}
        >
          Back to site
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex admin-shell" style={{ background: ADMIN.bg }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(42,34,36,0.28)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className="w-[15.5rem] fixed inset-y-0 left-0 z-30 hidden lg:block">
        <Sidebar />
      </aside>

      <aside
        className={`w-[17rem] fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ boxShadow: sidebarOpen ? '8px 0 40px rgba(42,34,36,0.08)' : undefined }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      <main className="flex-1 lg:ml-[15.5rem] min-h-[100dvh] flex flex-col min-w-0">
        <div
          className="lg:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-10 backdrop-blur-md"
          style={{ background: 'rgba(251,247,245,0.92)', borderBottom: `1px solid ${ADMIN.line}` }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2.5 rounded-xl transition-colors"
            style={{ color: ADMIN.ink }}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: ADMIN.blush }}>
              Studio
            </p>
            <p className="font-serif font-semibold text-[15px] leading-tight truncate" style={{ color: ADMIN.ink }}>
              Përgjithmonë
            </p>
          </div>
        </div>

        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
  );
}
