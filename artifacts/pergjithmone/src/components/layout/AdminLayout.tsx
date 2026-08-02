import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, ShoppingBag, FolderOpen, Image,
  Grid, SquareSquare, Settings, LogOut, Menu, X, Sparkles, ExternalLink, ShieldAlert,
} from 'lucide-react';

const navItems = [
  { href: '/heyadmin',              label: 'Dashboard',   icon: '🏠', lucide: LayoutDashboard },
  { href: '/heyadmin/porosi',       label: 'Orders',      icon: '🛍️', lucide: ShoppingBag },
  { href: '/heyadmin/perdorues',    label: 'Users',       icon: '👥', lucide: Users },
  { href: '/heyadmin/kategori',     label: 'Categories',  icon: '🗂️', lucide: FolderOpen },
  { href: '/heyadmin/template',     label: 'Templates',   icon: '🎨', lucide: Image },
  { href: '/heyadmin/layout',       label: 'Layouts',     icon: '📐', lucide: Grid },
  { href: '/heyadmin/madhesia',     label: 'Book Sizes',  icon: '📏', lucide: SquareSquare },
  { href: '/heyadmin/siguria',      label: 'Security',    icon: '🛡️', lucide: ShieldAlert },
  { href: '/heyadmin/cilesimet',    label: 'Settings',    icon: '⚙️', lucide: Settings },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const initials = (user?.name || (user as any)?.phone || 'A').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="h-full flex flex-col bg-white border-r border-rose-100">
      {/* Header */}
      <div className="px-5 py-5 border-b border-rose-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e879f9 100%)' }}>
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-rose-600 tracking-widest uppercase leading-none">Admin</p>
            <p className="text-sm font-serif font-semibold text-neutral-800 leading-tight">Përgjithmonë</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-rose-50">
            <X size={18} className="text-neutral-400" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== '/heyadmin' && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-100'
                  : 'text-neutral-500 hover:bg-rose-50/60 hover:text-rose-600'
              }`}
            >
              <span className="text-base leading-none w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-rose-100">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e879f9 100%)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-800 truncate">{user?.name || 'Admin'}</p>
            <p className="text-[11px] text-neutral-400 truncate">{(user as any)?.phone || user?.name}</p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3.5 py-2.5 w-full rounded-xl text-sm font-medium text-neutral-500 hover:bg-rose-50 hover:text-rose-600 transition-colors mb-1"
        >
          <ExternalLink size={15} />
          Back to site
        </Link>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2.5 px-3.5 py-2.5 w-full rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fdf2f8' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
          <p className="text-sm text-rose-300 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ background: '#fdf2f8' }}>
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-serif text-rose-600 mb-2">Access Denied</h1>
        <p className="text-neutral-500 mb-8">You need admin privileges to view this page.</p>
        <Link href="/" className="px-6 py-2.5 bg-rose-500 text-white rounded-full text-sm font-medium hover:bg-rose-600 transition-colors">
          Back to site
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex" style={{ background: '#fdf2f8' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - desktop */}
      <aside className="w-60 fixed inset-y-0 left-0 z-30 hidden lg:block shadow-sm">
        <Sidebar />
      </aside>

      {/* Sidebar - mobile drawer */}
      <aside className={`w-72 fixed inset-y-0 left-0 z-30 transition-transform duration-300 lg:hidden shadow-xl ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-60 min-h-screen flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-rose-100 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-rose-50">
            <Menu size={20} className="text-neutral-500" />
          </button>
          <p className="font-serif font-semibold text-neutral-800">Përgjithmonë Admin</p>
        </div>

        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
