import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import {
  ChevronDown, FolderOpen, UserRound, Shield, LogOut, X,
  Sparkles, Images, CircleDollarSign, Wand2, Package, ArrowUpRight,
} from 'lucide-react';
import { useGetAppSettings, type User } from '@workspace/api-client-react-tsconfig';
import { offerBarCopy, parseOfferBar } from '@/lib/offerBar';
import { fillBackground, webThemeFromSettings, type WebThemeConfig } from '@/lib/webTheme';
import { OfferBarStrip } from './OfferBarStrip';
import { ChromeLock } from './ChromeLock';
import { usePageEditorOptional } from '@/components/marketing/PageEditorContext';

function userDisplayName(user: User | null | undefined): string {
  const name = user?.name?.trim();
  if (name) return name;
  const email = user?.email?.trim();
  if (email) return email.split('@')[0] || email;
  return 'Account';
}

function userInitials(user: User | null | undefined): string {
  const name = user?.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const email = user?.email?.trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

function AccountMonogram({
  initials,
  size = 32,
}: {
  initials: string;
  size?: number;
}) {
  const fontSize = size <= 32 ? 10.5 : 12;
  return (
    <span
      aria-hidden
      className="flex items-center justify-center shrink-0 font-semibold tracking-[0.06em]"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 40 ? 12 : 9,
        fontSize,
        color: '#3A342E',
        background: 'linear-gradient(160deg, #F3EEE6 0%, #E5DED4 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(58,52,46,0.10)',
      }}
    >
      {initials}
    </span>
  );
}

export function AnnouncementBar() {
  const { lang } = useLanguage();
  const { data: settings } = useGetAppSettings();
  const offer = parseOfferBar(settings as Record<string, unknown> | undefined);
  const copy = offerBarCopy(offer, lang);

  if (!offer.enabled || !copy.text) return null;

  return (
    <div role="region" aria-label={lang === 'sq' ? 'Ofertë' : 'Offer'} className="relative">
      <ChromeLock />
      <OfferBarStrip
        text={copy.text}
        button={copy.button}
        href={offer.href}
        bg={offer.bg}
        textColor={offer.textColor}
        buttonBg={offer.buttonBg}
        buttonText={offer.buttonText}
      />
    </div>
  );
}

type NavLink = { href: string; label: string };

function LangToggle({
  theme,
  inverted,
  compact,
}: {
  theme: WebThemeConfig;
  inverted?: boolean;
  compact?: boolean;
}) {
  const { lang, setLang } = useLanguage();
  return (
    <div
      className="flex items-center gap-0.5 rounded-full p-0.5"
      style={{ background: inverted ? `${theme.navText}18` : `${theme.navText}0F` }}
    >
      {([
        { code: 'sq' as const, flag: 'https://flagcdn.com/20x15/al.png', label: 'SQ' },
        { code: 'en' as const, flag: 'https://flagcdn.com/20x15/gb.png', label: 'EN' },
      ]).map(({ code, flag, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className="transition-all duration-200 rounded-full px-2.5 py-1 flex items-center gap-1.5"
          style={{
            background: lang === code ? (inverted ? theme.navAccent : '#fff') : 'transparent',
            boxShadow: lang === code && !inverted ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            padding: compact ? '4px 8px' : undefined,
          }}
        >
          <img src={flag} alt={code} style={{ width: 16, height: 12, objectFit: 'cover', borderRadius: 1, display: 'block' }} />
          <span
            className="text-[11.5px] font-semibold tracking-wider transition-colors"
            style={{ color: lang === code ? (inverted ? theme.navAccentOn : theme.navText) : theme.navMuted }}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

function AccountDropdown({
  theme,
  name,
  initials,
  accountOpen,
  setAccountOpen,
  accountRef,
  accountLinks,
  loc,
  logout,
  t,
}: {
  theme: WebThemeConfig;
  name: string;
  initials: string;
  accountOpen: boolean;
  setAccountOpen: React.Dispatch<React.SetStateAction<boolean>>;
  accountRef: React.RefObject<HTMLDivElement | null>;
  accountLinks: NavLink[];
  loc: string;
  logout: () => void;
  t: (k: string) => string;
}) {
  const { user } = useAuth();
  return (
    <div className="relative" ref={accountRef}>
      <button
        type="button"
        onClick={() => setAccountOpen(v => !v)}
        aria-expanded={accountOpen}
        aria-haspopup="menu"
        className="group flex items-center gap-2.5 cursor-pointer max-w-[200px] outline-none"
        style={{
          padding: '4px 6px 4px 4px',
          borderRadius: 10,
          background: accountOpen ? 'rgba(58,52,46,0.05)' : 'transparent',
          transition: 'background 0.18s ease',
        }}
      >
        <AccountMonogram initials={initials} size={30} />
        <span
          className="text-[13px] font-medium truncate leading-none tracking-[-0.01em]"
          style={{ color: theme.navText }}
        >
          {name}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`shrink-0 transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`}
          style={{ color: theme.navMuted }}
          aria-hidden
        />
      </button>

      {accountOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[60] overflow-hidden"
          style={{
            marginTop: 10,
            width: 248,
            background: '#FFFEFB',
            borderRadius: 14,
            border: '1px solid rgba(40,32,20,0.08)',
            boxShadow: '0 18px 40px rgba(40,32,20,0.10), 0 2px 8px rgba(40,32,20,0.04)',
            animation: 'navFadeIn 0.15s ease',
          }}
        >
          <div className="px-4 pt-4 pb-3.5">
            <div className="flex items-center gap-3">
              <AccountMonogram initials={initials} size={40} />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate leading-tight"
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: 15,
                    fontWeight: 500,
                    color: '#1C1916',
                  }}
                >
                  {name}
                </p>
                {user?.email && (
                  <p className="text-[12px] text-neutral-400 truncate mt-1 tracking-wide">
                    {user.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(40,32,20,0.07)', margin: '0 12px' }} />

          <div className="py-2 px-2">
            {accountLinks.map(item => {
              const active = loc === item.href || (item.href === '/heyadmin' && loc.startsWith('/heyadmin'));
              const Icon =
                item.href === '/projektet' ? FolderOpen :
                item.href === '/profili' ? UserRound :
                Shield;
              return (
                <Link key={item.href} href={item.href} onClick={() => setAccountOpen(false)}>
                  <div
                    role="menuitem"
                    className="flex items-center gap-2.5 cursor-pointer transition-colors"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 9,
                      background: active ? 'rgba(58,52,46,0.06)' : 'transparent',
                      color: active ? '#1C1916' : '#4A453E',
                    }}
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.75}
                      style={{ color: active ? '#3A342E' : '#9A9288', flexShrink: 0 }}
                    />
                    <span
                      className="flex-1"
                      style={{
                        fontSize: 13.5,
                        fontWeight: active ? 600 : 500,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div style={{ height: 1, background: 'rgba(40,32,20,0.07)', margin: '0 12px' }} />

          <div className="px-2 py-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setAccountOpen(false); logout(); }}
              className="w-full flex items-center gap-2.5 cursor-pointer transition-colors"
              style={{
                padding: '10px 12px',
                borderRadius: 9,
                color: '#8A5A4A',
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
              }}
            >
              <LogOut size={15} strokeWidth={1.75} style={{ color: '#A87868', flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateCta({
  theme,
  lang,
  variant,
}: {
  theme: WebThemeConfig;
  lang: 'sq' | 'en';
  variant: 'pill' | 'block' | 'text' | 'chip' | 'glow';
}) {
  const label = lang === 'sq' ? 'Krijo Album' : 'Create Book';
  if (variant === 'text') {
    return (
      <Link href="/krijo">
        <span
          className="text-[13px] font-medium underline underline-offset-[5px] decoration-1 cursor-pointer"
          style={{ color: theme.navAccent }}
        >
          {label} →
        </span>
      </Link>
    );
  }
  if (variant === 'block') {
    return (
      <Link href="/krijo">
        <button
          type="button"
          className="px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] active:scale-[0.98] transition-transform cursor-pointer"
          style={{ background: theme.navAccent, color: theme.navAccentOn, borderRadius: 4 }}
        >
          {label}
        </button>
      </Link>
    );
  }
  if (variant === 'chip') {
    return (
      <Link href="/krijo">
        <span
          className="inline-flex px-3.5 py-1.5 text-[12px] font-semibold rounded-full cursor-pointer"
          style={{ background: theme.navAccent, color: theme.navAccentOn }}
        >
          {lang === 'sq' ? 'Krijo' : 'Create'}
        </span>
      </Link>
    );
  }
  if (variant === 'glow') {
    return (
      <Link href="/krijo">
        <button
          type="button"
          className="px-4 py-2 text-[11px] font-semibold rounded-full uppercase tracking-[0.12em] cursor-pointer"
          style={{
            background: theme.navAccent,
            color: theme.navAccentOn,
            boxShadow: `0 0 0 1px ${theme.navAccent}55, 0 8px 24px ${theme.navAccent}33`,
          }}
        >
          {label}
        </button>
      </Link>
    );
  }
  return (
    <Link href="/krijo">
      <button
        type="button"
        className="flex items-center gap-1.5 px-5 py-2.5 text-[12px] uppercase tracking-[0.14em] font-semibold rounded-full active:scale-95 transition-all duration-150 cursor-pointer"
        style={{ background: theme.navAccent, color: theme.navAccentOn }}
      >
        {label}
        <span className="opacity-60 text-[13px] leading-none">↗</span>
      </button>
    </Link>
  );
}

function Hamburger({
  open,
  onToggle,
  color,
}: {
  open: boolean;
  onToggle: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex md:hidden flex-col justify-center items-center gap-[5px] w-11 h-11 -mr-1"
      aria-label="Toggle menu"
      aria-expanded={open}
    >
      <span
        className="block h-[1.5px] rounded-full transition-all duration-300"
        style={{ width: 18, background: color, transform: open ? 'translateY(6.5px) rotate(45deg)' : 'none' }}
      />
      <span
        className="block h-[1.5px] rounded-full transition-all duration-200"
        style={{ width: 18, background: color, opacity: open ? 0 : 1 }}
      />
      <span
        className="block h-[1.5px] rounded-full transition-all duration-300"
        style={{ width: 18, background: color, transform: open ? 'translateY(-6.5px) rotate(-45deg)' : 'none' }}
      />
    </button>
  );
}

function navIconFor(href: string) {
  if (href === '/si-funksionon') return Sparkles;
  if (href === '/shembuj') return Images;
  if (href === '/cmime') return CircleDollarSign;
  if (href === '/album-ai') return Wand2;
  if (href === '/projektet') return FolderOpen;
  if (href === '/porositë') return Package;
  if (href === '/profili') return UserRound;
  if (href === '/heyadmin') return Shield;
  return ArrowUpRight;
}

/** Full-height premium slide-over — replaces the old floating dropdown sheet. */
function MobileSidebar({
  isOpen,
  setIsOpen,
  navLinks,
  loc,
  isAuthenticated,
  name,
  initials,
  user,
  logout,
  t,
  lang,
  setLang,
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  navLinks: NavLink[];
  loc: string;
  isAuthenticated: boolean;
  name: string;
  initials: string;
  user: User | null | undefined;
  logout: () => void;
  t: (k: string) => string;
  lang: 'sq' | 'en';
  setLang: (l: 'sq' | 'en') => void;
}) {
  const [visible, setVisible] = React.useState(false);
  const [entered, setEntered] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setVisible(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        cancelAnimationFrame(id);
        document.body.style.overflow = prev;
      };
    }
    setEntered(false);
    const t = window.setTimeout(() => setVisible(false), 320);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  if (!visible) return null;

  const accountItems: NavLink[] = isAuthenticated
    ? [
        { href: '/projektet', label: t('nav.myProjects') },
        { href: '/porositë', label: t('nav.myOrders') },
        { href: '/profili', label: t('nav.profile') },
        ...(user?.role === 'admin' ? [{ href: '/heyadmin', label: 'Admin' }] : []),
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[70] md:hidden" aria-modal="true" role="dialog">
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 border-0 cursor-pointer"
        style={{
          background: entered ? 'rgba(20,16,12,0.42)' : 'rgba(20,16,12,0)',
          backdropFilter: entered ? 'blur(8px)' : 'blur(0px)',
          WebkitBackdropFilter: entered ? 'blur(8px)' : 'blur(0px)',
          transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
        }}
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <aside
        className="absolute top-0 right-0 h-full flex flex-col"
        style={{
          width: 'min(100vw - 48px, 360px)',
          background: 'linear-gradient(165deg, #FFFEFB 0%, #F7F1E8 48%, #F3EEE6 100%)',
          boxShadow: '-24px 0 64px rgba(40,32,20,0.18)',
          transform: entered ? 'translateX(0)' : 'translateX(104%)',
          transition: 'transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="min-w-0">
            <p
              className="leading-none tracking-tight"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontStyle: 'italic',
                fontSize: 26,
                fontWeight: 500,
                color: '#1C1916',
              }}
            >
              Përgjithmonë
            </p>
            <p
              className="mt-2 text-[10px] uppercase tracking-[0.22em]"
              style={{ color: '#9A9288' }}
            >
              {lang === 'sq' ? 'Menuja' : 'Menu'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer"
            style={{
              borderRadius: 12,
              background: 'rgba(28,25,22,0.05)',
              color: '#3A342E',
              border: '1px solid rgba(40,32,20,0.08)',
            }}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="mx-5 h-px" style={{ background: 'rgba(40,32,20,0.08)' }} />

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: '#9A9288' }}>
            {lang === 'sq' ? 'Eksploro' : 'Explore'}
          </p>
          <ul className="space-y-1">
            {navLinks.map((item, i) => {
              const active = loc === item.href;
              const Icon = navIconFor(item.href);
              return (
                <li
                  key={item.href}
                  style={{
                    opacity: entered ? 1 : 0,
                    transform: entered ? 'translateX(0)' : 'translateX(12px)',
                    transition: `opacity 0.28s ease ${80 + i * 40}ms, transform 0.28s ease ${80 + i * 40}ms`,
                  }}
                >
                  <Link href={item.href} onClick={() => setIsOpen(false)}>
                    <div
                      className="flex items-center gap-3.5 px-3.5 py-3.5 cursor-pointer"
                      style={{
                        borderRadius: 14,
                        background: active ? '#1C1916' : 'transparent',
                        color: active ? '#FFFEFB' : '#2A241E',
                      }}
                    >
                      <span
                        className="w-9 h-9 flex items-center justify-center shrink-0"
                        style={{
                          borderRadius: 11,
                          background: active ? 'rgba(255,254,251,0.12)' : 'rgba(28,25,22,0.05)',
                        }}
                      >
                        <Icon size={16} strokeWidth={1.75} style={{ color: active ? '#F0E6D8' : '#6A6258' }} />
                      </span>
                      <span
                        className="flex-1 min-w-0"
                        style={{
                          fontFamily: 'Georgia, "Times New Roman", serif',
                          fontSize: 18,
                          fontWeight: active ? 600 : 500,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {item.label}
                      </span>
                      <ArrowUpRight
                        size={15}
                        strokeWidth={1.75}
                        style={{ opacity: active ? 0.55 : 0.28, color: active ? '#FFFEFB' : '#6A6258' }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {isAuthenticated && (
            <>
              <p className="px-3 mt-6 mb-2 text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: '#9A9288' }}>
                {lang === 'sq' ? 'Llogaria' : 'Account'}
              </p>
              <div
                className="mx-1 mb-2 flex items-center gap-3 px-3.5 py-3"
                style={{
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.65)',
                  border: '1px solid rgba(40,32,20,0.06)',
                }}
              >
                <AccountMonogram initials={initials} size={40} />
                <div className="min-w-0">
                  <p
                    className="truncate leading-tight"
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: 15,
                      fontWeight: 500,
                      color: '#1C1916',
                    }}
                  >
                    {name}
                  </p>
                  {user?.email && (
                    <p className="text-[11px] truncate mt-0.5" style={{ color: '#9A9288' }}>{user.email}</p>
                  )}
                </div>
              </div>
              <ul className="space-y-0.5">
                {accountItems.map(item => {
                  const active = loc === item.href || (item.href === '/heyadmin' && loc.startsWith('/heyadmin'));
                  const Icon = navIconFor(item.href);
                  return (
                    <li key={item.href}>
                      <Link href={item.href} onClick={() => setIsOpen(false)}>
                        <div
                          className="flex items-center gap-3 px-3.5 py-3 cursor-pointer"
                          style={{
                            borderRadius: 12,
                            background: active ? 'rgba(28,25,22,0.06)' : 'transparent',
                            color: '#2A241E',
                          }}
                        >
                          <Icon size={16} strokeWidth={1.75} style={{ color: '#6A6258' }} />
                          <span className="flex-1 text-[15px] font-medium">{item.label}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => { logout(); setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-3.5 py-3 cursor-pointer text-left"
                    style={{ borderRadius: 12, color: '#8A5A4A', background: 'transparent', border: 'none' }}
                  >
                    <LogOut size={16} strokeWidth={1.75} style={{ color: '#A87868' }} />
                    <span className="text-[15px] font-medium">{t('nav.logout')}</span>
                  </button>
                </li>
              </ul>
            </>
          )}
        </nav>

        {/* Footer actions */}
        <div
          className="px-5 pt-3 pb-5 shrink-0"
          style={{ borderTop: '1px solid rgba(40,32,20,0.08)', background: 'rgba(255,254,251,0.72)' }}
        >
          {!isAuthenticated && (
            <div className="flex gap-2 mb-3">
              <Link href="/hyr" onClick={() => setIsOpen(false)} className="flex-1 min-w-0">
                <div
                  className="flex items-center justify-center py-3.5 cursor-pointer"
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(40,32,20,0.12)',
                    color: '#2A241E',
                    background: '#FFFEFB',
                  }}
                >
                  <span className="text-[14px] font-medium">{t('nav.login')}</span>
                </div>
              </Link>
              <Link href="/krijo" onClick={() => setIsOpen(false)} className="flex-[1.35] min-w-0">
                <div
                  className="flex items-center justify-center gap-1.5 py-3.5 cursor-pointer"
                  style={{ borderRadius: 14, background: '#1C1916', color: '#FFFEFB' }}
                >
                  <span className="text-[14px] font-semibold truncate">
                    {lang === 'sq' ? 'Krijo Album' : 'Create Album'}
                  </span>
                  <ArrowUpRight size={14} strokeWidth={2} className="opacity-60 shrink-0" />
                </div>
              </Link>
            </div>
          )}

          {isAuthenticated && (
            <Link href="/krijo" onClick={() => setIsOpen(false)} className="block mb-3">
              <div
                className="flex items-center justify-center gap-2 py-3.5 cursor-pointer"
                style={{ borderRadius: 14, background: '#1C1916', color: '#FFFEFB' }}
              >
                <span className="text-[14px] font-semibold">
                  {lang === 'sq' ? 'Krijo Album' : 'Create Album'}
                </span>
                <ArrowUpRight size={14} strokeWidth={2} className="opacity-60" />
              </div>
            </Link>
          )}

          <div className="flex gap-2">
            {([
              { code: 'sq' as const, flag: 'https://flagcdn.com/20x15/al.png', name: 'Shqip' },
              { code: 'en' as const, flag: 'https://flagcdn.com/20x15/gb.png', name: 'English' },
            ]).map(l => {
              const on = lang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className="flex-1 py-2.5 text-[13px] font-medium flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    borderRadius: 12,
                    border: on ? '1px solid #1C1916' : '1px solid rgba(40,32,20,0.10)',
                    background: on ? '#1C1916' : 'transparent',
                    color: on ? '#FFFEFB' : '#6A6258',
                  }}
                >
                  <img
                    src={l.flag}
                    alt={l.code}
                    style={{ width: 18, height: 13, objectFit: 'cover', borderRadius: 1, display: 'block', opacity: on ? 1 : 0.75 }}
                  />
                  {l.name}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

export function Navbar() {
  const { lang, setLang, t } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const editing = !!usePageEditorOptional();
  const [isOpen, setIsOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [loc] = useLocation();
  const accountRef = React.useRef<HTMLDivElement>(null);
  const { data: appSettings } = useGetAppSettings();
  const theme = useMemo(
    () => webThemeFromSettings(appSettings as Record<string, unknown> | undefined),
    [appSettings],
  );
  const navBg = fillBackground(theme.navBgMode, theme.navBg, theme.navBgTo);
  const style = theme.navStyle;

  const name = userDisplayName(user);
  const initials = userInitials(user);

  React.useEffect(() => {
    setIsOpen(false);
    setAccountOpen(false);
  }, [loc]);

  React.useEffect(() => {
    if (!editing) return;
    setIsOpen(false);
    setAccountOpen(false);
  }, [editing]);

  React.useEffect(() => {
    let raf: number;
    const fn = () => { raf = requestAnimationFrame(() => setScrolled(window.scrollY > 6)); };
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => { window.removeEventListener('scroll', fn); cancelAnimationFrame(raf); };
  }, []);

  React.useEffect(() => {
    if (!accountOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  const navLinks: NavLink[] = [
    { href: '/si-funksionon', label: t('nav.howItWorks') },
    { href: '/shembuj',       label: t('nav.examples')   },
    { href: '/cmime',         label: t('nav.pricing')    },
    { href: '/album-ai',      label: lang === 'sq' ? 'Album me AI' : 'AI Album' },
  ];

  const accountLinks: NavLink[] = [
    { href: '/projektet', label: t('nav.myProjects') },
    { href: '/profili', label: t('nav.profile') },
    ...(user?.role === 'admin' ? [{ href: '/heyadmin', label: 'Admin' }] : []),
  ];

  const accountProps = {
    theme,
    name,
    initials,
    accountOpen,
    setAccountOpen,
    accountRef,
    accountLinks,
    loc,
    logout,
    t,
  };

  const authRight = isAuthenticated ? (
    <AccountDropdown {...accountProps} />
  ) : (
    <div className="flex items-center gap-4">
      <Link
        href="/hyr"
        className="font-medium transition-colors cursor-pointer text-[12px] uppercase tracking-[0.12em]"
        style={{ color: theme.navMuted }}
      >
        {t('nav.login')}
      </Link>
      <CreateCta theme={theme} lang={lang} variant="pill" />
    </div>
  );

  const mobile = (
    <MobileSidebar
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      navLinks={navLinks}
      loc={loc}
      isAuthenticated={isAuthenticated}
      name={name}
      initials={initials}
      user={user}
      logout={logout}
      t={t}
      lang={lang}
      setLang={setLang}
    />
  );

  // ── Editorial masthead: two-row newspaper header ─────────────────────────
  if (style === 'editorial') {
    return (
      <>
        <nav
          className="sticky top-0 z-50 w-full"
          data-nav-style="editorial"
          style={{
            background: navBg,
            boxShadow: scrolled ? '0 2px 20px rgba(40,32,20,0.08)' : `inset 0 -1px 0 ${theme.navMuted}28`,
          }}
        >
          <ChromeLock />
          {/* Utility row */}
          <div
            className="hidden md:flex items-center justify-between px-6 lg:px-10 py-1.5 text-[11px]"
            style={{ borderBottom: `1px solid ${theme.navMuted}22`, color: theme.navMuted }}
          >
            <span className="tracking-[0.18em] uppercase">{lang === 'sq' ? 'Albume premium' : 'Premium albums'}</span>
            <div className="flex items-center gap-4">
              <LangToggle theme={theme} compact />
              {!isAuthenticated && (
                <Link href="/hyr" className="hover:opacity-80" style={{ color: theme.navText }}>
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
          {/* Brand row */}
          <div className="max-w-7xl mx-auto px-4 md:px-10 flex items-end justify-between gap-4 h-[72px] md:h-[88px] pb-3 md:pb-4">
            <Link href="/" className="shrink-0 z-50">
              <span
                className="leading-none tracking-tight block"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontStyle: 'italic',
                  fontSize: 'clamp(26px, 3.2vw, 36px)',
                  fontWeight: 500,
                  color: theme.navText,
                }}
              >
                Përgjithmonë
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6 pb-1">
              {navLinks.map((item, i) => {
                const active = loc === item.href;
                return (
                  <React.Fragment key={item.href}>
                    {i > 0 && <span style={{ color: theme.navMuted, opacity: 0.45 }}>·</span>}
                    <Link href={item.href}>
                      <span
                        style={{
                          fontFamily: 'Georgia, "Times New Roman", serif',
                          fontSize: 14,
                          color: active ? theme.navText : theme.navMuted,
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="hidden md:flex items-center gap-5 pb-0.5">
              {isAuthenticated ? <AccountDropdown {...accountProps} /> : <CreateCta theme={theme} lang={lang} variant="text" />}
            </div>
            <Hamburger open={isOpen} onToggle={() => setIsOpen(v => !v)} color={theme.navText} />
          </div>
        </nav>
        {mobile}
      </>
    );
  }

  // ── Floating glass island ────────────────────────────────────────────────
  if (style === 'glass') {
    return (
      <>
        <div className="sticky top-0 z-50 w-full pointer-events-none" data-nav-style="glass">
          <ChromeLock />
          <div className="px-3 md:px-6 pt-3 md:pt-4">
            <nav
              className="pointer-events-auto max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 md:px-5 h-[56px] md:h-[60px]"
              style={{
                background: theme.navBgMode === 'gradient'
                  ? fillBackground('gradient', `${theme.navBg}d0`, `${theme.navBgTo}b8`)
                  : `${theme.navBg}d0`,
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                borderRadius: 18,
                border: `1px solid ${theme.navText}18`,
                boxShadow: scrolled
                  ? '0 16px 40px rgba(0,0,0,0.35)'
                  : '0 8px 28px rgba(0,0,0,0.22)',
              }}
            >
              <Link href="/" className="shrink-0">
                <span className="text-[12px] md:text-[13px] font-semibold tracking-[0.16em] uppercase" style={{ color: theme.navText }}>
                  Përgjithmonë
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                {navLinks.map(item => {
                  const active = loc === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <span
                        className="text-[11px] tracking-[0.1em] uppercase transition-opacity"
                        style={{ color: active ? theme.navText : theme.navMuted, opacity: active ? 1 : 0.85 }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="hidden md:flex items-center gap-4">
                <LangToggle theme={theme} inverted />
                {isAuthenticated ? <AccountDropdown {...accountProps} /> : <CreateCta theme={theme} lang={lang} variant="glow" />}
              </div>
              <Hamburger open={isOpen} onToggle={() => setIsOpen(v => !v)} color={theme.navText} />
            </nav>
          </div>
        </div>
        {mobile}
      </>
    );
  }

  // ── Chip rail ────────────────────────────────────────────────────────────
  if (style === 'pills') {
    return (
      <>
        <nav
          className="sticky top-0 z-50 w-full transition-shadow duration-300"
          data-nav-style="pills"
          style={{
            background: navBg,
            boxShadow: scrolled ? '0 2px 24px rgba(40,32,20,0.07)' : 'none',
          }}
        >
          <ChromeLock />
          <div className="max-w-7xl mx-auto px-4 md:px-10 flex items-center justify-between gap-3 h-[68px] md:h-[76px]">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <Link href="/" className="shrink-0">
                <span
                  className="inline-flex px-3.5 py-1.5 text-[13px] font-semibold rounded-full"
                  style={{ background: theme.navAccent, color: theme.navAccentOn }}
                >
                  Përgjithmonë
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-1.5 ml-1">
                {navLinks.map(item => {
                  const active = loc === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <span
                        className="px-3.5 py-1.5 text-[12px] font-medium rounded-full transition-colors"
                        style={{
                          background: active ? `${theme.navText}14` : 'transparent',
                          color: active ? theme.navText : theme.navMuted,
                        }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <LangToggle theme={theme} />
              {isAuthenticated ? <AccountDropdown {...accountProps} /> : (
                <>
                  <Link href="/hyr" className="text-[12px] font-medium" style={{ color: theme.navMuted }}>
                    {t('nav.login')}
                  </Link>
                  <CreateCta theme={theme} lang={lang} variant="chip" />
                </>
              )}
            </div>
            <Hamburger open={isOpen} onToggle={() => setIsOpen(v => !v)} color={theme.navText} />
          </div>
        </nav>
        {mobile}
      </>
    );
  }

  // ── Command bar (solid) ──────────────────────────────────────────────────
  if (style === 'solid') {
    return (
      <>
        <nav
          className="sticky top-0 z-50 w-full"
          data-nav-style="solid"
          style={{
            background: navBg,
            boxShadow: scrolled ? '0 8px 28px rgba(0,0,0,0.28)' : 'none',
          }}
        >
          <ChromeLock />
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between gap-4 h-[58px] md:h-[64px]">
            <div className="flex items-center gap-4 md:gap-6 min-w-0">
              <Link href="/" className="shrink-0">
                <span className="text-[14px] font-bold tracking-wide" style={{ color: theme.navText }}>
                  Përgjithmonë
                </span>
              </Link>
              <span className="hidden md:block w-px h-5 shrink-0" style={{ background: `${theme.navText}28` }} aria-hidden />
              <div className="hidden md:flex items-center gap-5">
                {navLinks.map(item => {
                  const active = loc === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <span
                        className="text-[12.5px] font-medium"
                        style={{
                          color: active ? theme.navText : theme.navMuted,
                          borderBottom: active ? `2px solid ${theme.navAccent}` : '2px solid transparent',
                          paddingBottom: 2,
                        }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <LangToggle theme={theme} inverted />
              {isAuthenticated ? <AccountDropdown {...accountProps} /> : (
                <>
                  <Link href="/hyr" className="text-[12px] font-medium" style={{ color: theme.navMuted }}>
                    {t('nav.login')}
                  </Link>
                  <CreateCta theme={theme} lang={lang} variant="block" />
                </>
              )}
            </div>
            <Hamburger open={isOpen} onToggle={() => setIsOpen(v => !v)} color={theme.navText} />
          </div>
        </nav>
        {mobile}
      </>
    );
  }

  // ── Classic (primary) — original site menu ───────────────────────────────
  return (
    <>
      <nav
        className="sticky top-0 z-50 w-full transition-all duration-300"
        data-nav-style="classic"
        style={{
          background: navBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: scrolled ? '0 2px 28px rgba(0,0,0,0.07)' : 'none',
        }}
      >
        <ChromeLock />
        <div className="max-w-7xl mx-auto px-4 md:px-10 flex items-center justify-between h-[64px] md:h-[72px]">
          <Link href="/" className="flex items-center shrink-0 z-50">
            <img
              src="/logo-nav.png"
              alt="Përgjithmonë"
              className="h-[30px] md:h-[36px] w-auto"
              style={{ objectFit: 'contain', objectPosition: 'left center', display: 'block' }}
            />
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map(item => {
              const active = loc === item.href;
              return (
                <Link key={item.href} href={item.href} className="group relative py-1.5">
                  <span
                    className="text-[12px] uppercase tracking-[0.12em] font-medium transition-colors duration-200"
                    style={{ color: active ? theme.navText : theme.navMuted }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="absolute bottom-0 left-0 h-px transition-all duration-300"
                    style={{ width: active ? '100%' : '0%', background: theme.navText }}
                    aria-hidden
                  />
                  {!active && (
                    <span
                      className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-300"
                      style={{ background: `${theme.navMuted}66` }}
                      aria-hidden
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-5">
            <LangToggle theme={theme} />
            <span className="h-4 w-px shrink-0" style={{ background: `${theme.navMuted}55` }} aria-hidden />
            {authRight}
          </div>

          <Hamburger open={isOpen} onToggle={() => setIsOpen(v => !v)} color={theme.navText} />
        </div>
      </nav>
      {mobile}
    </>
  );
}
