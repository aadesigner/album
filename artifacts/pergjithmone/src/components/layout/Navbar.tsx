import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';

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
  const [scrolled, setScrolled] = React.useState(false);
  const [loc] = useLocation();

  React.useEffect(() => { setIsOpen(false); }, [loc]);
  React.useEffect(() => {
    let raf: number;
    const fn = () => { raf = requestAnimationFrame(() => setScrolled(window.scrollY > 6)); };
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => { window.removeEventListener('scroll', fn); cancelAnimationFrame(raf); };
  }, []);

  const navLinks = [
    { href: '/si-funksionon', label: t('nav.howItWorks') },
    { href: '/shembuj',       label: t('nav.examples')   },
    { href: '/cmime',         label: t('nav.pricing')    },
    { href: '/album-ai',      label: lang === 'sq' ? 'Album me AI' : 'AI Album' },
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
          className="max-w-7xl mx-auto px-4 md:px-10 h-[46px] md:h-[74px] flex items-center justify-between"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0 z-50">
            <img
              src="/logo-full.png"
              alt="Përgjithmonë"
              className="w-[128px] h-[24px] md:w-[148px] md:h-[28px]"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          </Link>

          {/* Desktop center nav */}
          <div className="hidden md:flex items-center gap-9">
            {navLinks.map(item => {
              const active = loc === item.href;
              return (
                <Link key={item.href} href={item.href} className="group relative py-2">
                  <span className={`text-[10.5px] uppercase tracking-[0.14em] font-medium transition-colors duration-200 ${
                    active ? 'text-neutral-900' : 'text-neutral-400 group-hover:text-neutral-800'
                  }`}>
                    {item.label}
                  </span>
                  {/* active line */}
                  <span className="absolute bottom-0 left-0 h-px bg-neutral-900 transition-all duration-300"
                    style={{ width: active ? '100%' : '0%' }} aria-hidden />
                  {/* hover line (only when not active) */}
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

            {/* Thin divider */}
            <span className="h-4 w-px bg-neutral-200 shrink-0" aria-hidden />

            {isAuthenticated ? (
              <div className="flex items-center gap-5">
                <Link
                  href="/projektet"
                  className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  {t('nav.myProjects')}
                </Link>
                <Link
                  href="/profili"
                  className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  {t('nav.profile')}
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    href="/heyadmin"
                    className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-neutral-400 hover:text-neutral-900 transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => logout()}
                  className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-neutral-400 hover:text-neutral-800 transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/hyr"
                  className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link href="/krijo">
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white text-[10.5px] uppercase tracking-[0.16em] font-semibold rounded-full hover:bg-neutral-700 active:scale-95 transition-all duration-150">
                    {lang === 'sq' ? 'Krijo Album' : 'Create Book'}
                    <span className="opacity-60 text-[12px] leading-none">↗</span>
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: animated hamburger */}
          <button
            onClick={() => setIsOpen(v => !v)}
            className="flex md:hidden flex-col justify-center items-end gap-[5px] w-10 h-10 -translate-x-1.5"
            aria-label="Toggle menu"
          >
            <span
              className="block h-px bg-neutral-900 transition-all duration-300 origin-right"
              style={{
                width: isOpen ? '20px' : '20px',
                transform: isOpen ? 'rotate(-45deg) translateY(-4px)' : 'none',
              }}
            />
            <span
              className="block h-px bg-neutral-900 transition-all duration-200"
              style={{ width: '14px', opacity: isOpen ? 0 : 1 }}
            />
            <span
              className="block h-px bg-neutral-900 transition-all duration-300 origin-right"
              style={{
                width: isOpen ? '20px' : '20px',
                transform: isOpen ? 'rotate(45deg) translateY(4px)' : 'none',
              }}
            />
          </button>
        </div>
      </nav>

      {/* ── Mobile panel — drops down below nav ── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(6px)', animation: 'navFadeIn 0.18s ease' }}
            onClick={() => setIsOpen(false)}
          />

          {/* Floating panel */}
          <div
            className="fixed z-50 md:hidden"
            style={{
              top: 50 + 8,
              left: 16,
              right: 16,
              background: '#ffffff',
              borderRadius: 20,
              boxShadow: '0 24px 80px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              animation: 'navSlideIn 0.2s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
              {/* Nav links */}
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

              {/* Auth */}
              <div className="px-2 pb-2">
                {isAuthenticated ? (
                  <>
                    <Link href="/projektet" onClick={() => setIsOpen(false)}>
                      <div className="flex items-center justify-between px-4 py-3.5 rounded-xl text-neutral-700 hover:bg-neutral-50">
                        <span className="text-[14px] font-medium">{t('nav.myProjects')}</span>
                        <span className="text-xs opacity-40">↗</span>
                      </div>
                    </Link>
                    <Link href="/porositë" onClick={() => setIsOpen(false)}>
                      <div className="flex items-center justify-between px-4 py-3.5 rounded-xl text-neutral-700 hover:bg-neutral-50">
                        <span className="text-[14px] font-medium">{t('nav.myOrders')}</span>
                        <span className="text-xs opacity-40">↗</span>
                      </div>
                    </Link>
                    <Link href="/profili" onClick={() => setIsOpen(false)}>
                      <div className="flex items-center justify-between px-4 py-3.5 rounded-xl text-neutral-700 hover:bg-neutral-50">
                        <span className="text-[14px] font-medium">{t('nav.profile')}</span>
                        <span className="text-xs opacity-40">↗</span>
                      </div>
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/heyadmin" onClick={() => setIsOpen(false)}>
                        <div className="flex items-center justify-between px-4 py-3.5 rounded-xl text-neutral-700 hover:bg-neutral-50">
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

              {/* Language */}
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
