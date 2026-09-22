import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import { ChevronDown, FolderOpen, UserRound, Shield, LogOut } from 'lucide-react';
import type { User } from '@workspace/api-client-react-tsconfig';

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

/** Soft paper-stone monogram — matches site ink/paper, not a loud accent. */
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
  return (
    <div className="hidden md:block bg-[#1a1a1a] text-white text-[10px] md:text-[11px] py-1.5 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 md:gap-8">
        <span className="tracking-wide opacity-80 whitespace-nowrap">
          {lang === 'sq' ? '🚚 Dërgesë e Shpejtë' : '🚚 Fast Delivery'}
        </span>
        <span className="opacity-30 select-none">·</span>
        <span className="tracking-wide opacity-80 whitespace-nowrap">
          {lang === 'sq' ? '✦ 30 Ditë Garanci' : '✦ 30 Day Guarantee'}
        </span>
      </div>
    </div>
  );
}

export function Navbar() {
  const { lang, setLang, t } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [loc] = useLocation();
  const accountRef = React.useRef<HTMLDivElement>(null);

  const name = userDisplayName(user);
  const initials = userInitials(user);

  React.useEffect(() => {
    setIsOpen(false);
    setAccountOpen(false);
  }, [loc]);

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

  const navLinks = [
    { href: '/si-funksionon', label: t('nav.howItWorks') },
    { href: '/shembuj',       label: t('nav.examples')   },
    { href: '/cmime',         label: t('nav.pricing')    },
    { href: '/album-ai',      label: lang === 'sq' ? 'Album me AI' : 'AI Album' },
  ];

  const accountLinks = [
    { href: '/projektet', label: t('nav.myProjects') },
    { href: '/profili', label: t('nav.profile') },
    ...(user?.role === 'admin' ? [{ href: '/heyadmin', label: 'Admin' }] : []),
  ];

  return (
    <>
      {/* ── Sticky bar ── */}
      <nav
        className="sticky top-0 z-50 w-full transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.09)' : '1px solid rgba(0,0,0,0.06)',
          boxShadow: scrolled ? '0 2px 28px rgba(0,0,0,0.07)' : 'none',
        }}
      >
        <div
          className="max-w-7xl mx-auto px-4 md:px-10 h-[64px] md:h-[72px] flex items-center justify-between"
        >
          {/* Logo — cropped wordmark (logo-full.png is a padded 500² square) */}
          <Link href="/" className="flex items-center shrink-0 z-50">
            <img
              src="/logo-nav.png"
              alt="Përgjithmonë"
              className="h-[44px] md:h-[52px] w-auto"
              style={{ objectFit: 'contain', objectPosition: 'left center', display: 'block' }}
            />
          </Link>

          {/* Desktop center nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map(item => {
              const active = loc === item.href;
              return (
                <Link key={item.href} href={item.href} className="group relative py-1.5">
                  <span className={`text-[10px] uppercase tracking-[0.14em] font-medium transition-colors duration-200 ${
                    active ? 'text-neutral-900' : 'text-neutral-400 group-hover:text-neutral-800'
                  }`}>
                    {item.label}
                  </span>
                  <span className="absolute bottom-0 left-0 h-px bg-neutral-900 transition-all duration-300"
                    style={{ width: active ? '100%' : '0%' }} aria-hidden />
                  {!active && (
                    <span className="absolute bottom-0 left-0 h-px bg-neutral-200 w-0 group-hover:w-full transition-all duration-300" aria-hidden />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-5">
            {/* Language toggle pill */}
            <div className="flex items-center gap-0.5 bg-neutral-100 rounded-full p-0.5">
              {([
                { code: 'sq' as const, flag: 'https://flagcdn.com/20x15/al.png', label: 'SQ' },
                { code: 'en' as const, flag: 'https://flagcdn.com/20x15/gb.png', label: 'EN' },
              ]).map(({ code, flag, label }) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className="transition-all duration-200 rounded-full px-2.5 py-1 flex items-center gap-1.5"
                  style={{
                    background: lang === code ? '#fff' : 'transparent',
                    boxShadow: lang === code ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <img src={flag} alt={code} style={{ width: 16, height: 12, objectFit: 'cover', borderRadius: 1, display: 'block' }} />
                  <span className={`text-[10px] font-semibold tracking-wider transition-colors ${lang === code ? 'text-neutral-800' : 'text-neutral-400'}`}>{label}</span>
                </button>
              ))}
            </div>

            <span className="h-4 w-px bg-neutral-200 shrink-0" aria-hidden />

            {isAuthenticated ? (
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
                  onMouseEnter={e => {
                    if (!accountOpen) e.currentTarget.style.background = 'rgba(58,52,46,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (!accountOpen) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <AccountMonogram initials={initials} size={30} />
                  <span className="text-[12px] font-medium text-neutral-800 truncate leading-none tracking-[-0.01em]">
                    {name}
                  </span>
                  <ChevronDown
                    size={13}
                    strokeWidth={2}
                    className={`shrink-0 transition-transform duration-200 ${
                      accountOpen ? 'rotate-180 text-neutral-600' : 'text-neutral-400 group-hover:text-neutral-500'
                    }`}
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
                            <p className="text-[11px] text-neutral-400 truncate mt-1 tracking-wide">
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
                              onMouseEnter={e => {
                                if (!active) e.currentTarget.style.background = 'rgba(58,52,46,0.04)';
                              }}
                              onMouseLeave={e => {
                                if (!active) e.currentTarget.style.background = 'transparent';
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
                                  fontSize: 12.5,
                                  fontWeight: active ? 600 : 500,
                                  letterSpacing: '0.01em',
                                }}
                              >
                                {item.label}
                              </span>
                              {active && (
                                <span
                                  aria-hidden
                                  style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    background: '#3A342E',
                                  }}
                                />
                              )}
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
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(138,90,74,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <LogOut size={15} strokeWidth={1.75} style={{ color: '#A87868', flexShrink: 0 }} />
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t('nav.logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/hyr"
                  className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  {t('nav.login')}
                </Link>
                <Link href="/krijo">
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white text-[10.5px] uppercase tracking-[0.16em] font-semibold rounded-full hover:bg-neutral-700 active:scale-95 transition-all duration-150 cursor-pointer">
                    {lang === 'sq' ? 'Krijo Album' : 'Create Book'}
                    <span className="opacity-60 text-[12px] leading-none">↗</span>
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            onClick={() => setIsOpen(v => !v)}
            className="flex md:hidden flex-col justify-center items-center gap-[5px] w-11 h-11 -mr-1"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <span
              className="block h-[1.5px] bg-neutral-900 rounded-full transition-all duration-300"
              style={{
                width: 18,
                transform: isOpen ? 'translateY(6.5px) rotate(45deg)' : 'none',
              }}
            />
            <span
              className="block h-[1.5px] bg-neutral-900 rounded-full transition-all duration-200"
              style={{ width: 18, opacity: isOpen ? 0 : 1 }}
            />
            <span
              className="block h-[1.5px] bg-neutral-900 rounded-full transition-all duration-300"
              style={{
                width: 18,
                transform: isOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
              }}
            />
          </button>
        </div>
      </nav>

      {/* ── Mobile panel ── */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(6px)', animation: 'navFadeIn 0.18s ease' }}
            onClick={() => setIsOpen(false)}
          />

          <div
            className="fixed z-50 md:hidden"
            style={{
              top: 56,
              left: 12,
              right: 12,
              background: '#ffffff',
              borderRadius: 18,
              boxShadow: '0 20px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              animation: 'navSlideIn 0.2s cubic-bezier(0.32,0.72,0,1)',
              maxHeight: 'min(78dvh, 560px)',
              overflowY: 'auto',
            }}
          >
              <div className="px-2 pt-3 pb-1">
                {navLinks.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                    <div
                      className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
                        loc === item.href
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100'
                      }`}
                    >
                      <span className="text-[14px] font-medium">{item.label}</span>
                      <span className="text-xs opacity-40">↗</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mx-4 my-2 border-t border-neutral-100" />

              <div className="px-2 pb-2">
                {isAuthenticated ? (
                  <>
                    {/* Account header */}
                    <div className="flex items-center gap-3 px-4 py-3 mb-1">
                      <AccountMonogram initials={initials} size={36} />
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
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">{user.email}</p>
                        )}
                      </div>
                    </div>

                    <Link href="/projektet" onClick={() => setIsOpen(false)}>
                      <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                        loc === '/projektet' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
                      }`}>
                        <span className="text-[14px] font-medium">{t('nav.myProjects')}</span>
                        <span className="text-xs opacity-40">↗</span>
                      </div>
                    </Link>
                    <Link href="/porositë" onClick={() => setIsOpen(false)}>
                      <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                        loc === '/porositë' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
                      }`}>
                        <span className="text-[14px] font-medium">{t('nav.myOrders')}</span>
                        <span className="text-xs opacity-40">↗</span>
                      </div>
                    </Link>
                    <Link href="/profili" onClick={() => setIsOpen(false)}>
                      <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                        loc === '/profili' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
                      }`}>
                        <span className="text-[14px] font-medium">{t('nav.profile')}</span>
                        <span className="text-xs opacity-40">↗</span>
                      </div>
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/heyadmin" onClick={() => setIsOpen(false)}>
                        <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                          loc.startsWith('/heyadmin') ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
                        }`}>
                          <span className="text-[14px] font-medium">Admin</span>
                          <span className="text-xs opacity-40">↗</span>
                        </div>
                      </Link>
                    )}
                    <button
                      onClick={() => { logout(); setIsOpen(false); }}
                      className="w-full text-left px-4 py-3.5 rounded-xl text-red-500 hover:bg-red-50 active:bg-red-100 text-[14px] font-medium transition-colors mt-1"
                    >
                      {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 px-2">
                    <Link href="/hyr" onClick={() => setIsOpen(false)} className="flex-1 min-w-0">
                      <div className="flex items-center justify-center px-3 py-3.5 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 h-full">
                        <span className="text-[13px] font-medium">{t('nav.login')}</span>
                      </div>
                    </Link>
                    <Link href="/krijo" onClick={() => setIsOpen(false)} className="flex-1 min-w-0">
                      <div className="flex items-center justify-center gap-1.5 px-3 py-3.5 rounded-xl bg-neutral-900 text-white h-full">
                        <span className="text-[13px] font-semibold truncate">
                          {lang === 'sq' ? 'Krijo Album' : 'Create Album'}
                        </span>
                        <span className="opacity-60 shrink-0">↗</span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              <div className="px-4 pb-4 pt-1 flex gap-2">
                {([
                  { code: 'sq' as const, flag: 'https://flagcdn.com/20x15/al.png', name: 'Shqip' },
                  { code: 'en' as const, flag: 'https://flagcdn.com/20x15/gb.png', name: 'English' },
                ]).map(l => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`flex-1 py-2.5 text-[12px] font-medium rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      lang === l.code
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                    }`}
                  >
                    <img src={l.flag} alt={l.code} style={{ width: 20, height: 15, objectFit: 'cover', borderRadius: 1, display: 'block', opacity: lang === l.code ? 1 : 0.7 }} />
                    {l.name}
                  </button>
                ))}
              </div>
          </div>
        </>
      )}
    </>
  );
}
