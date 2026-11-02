import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'wouter';
import { useGetAppSettings } from '@workspace/api-client-react-tsconfig';
import { Instagram } from 'lucide-react';
import { ChromeLock } from './ChromeLock';
import { fillBackground, webThemeFromSettings, type WebThemeConfig } from '@/lib/webTheme';

const INSTAGRAM_URL = 'https://www.instagram.com/pergjithmone.al/';
const TIKTOK_URL = 'https://www.tiktok.com/@pergjithmone.al';

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82c-.9-.85-1.4-2.04-1.4-3.32h-3.02v13.5c0 1.44-1.17 2.6-2.6 2.6a2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 2.6-2.6c.26 0 .51.04.75.11V10.5a5.62 5.62 0 0 0-.75-.05 5.62 5.62 0 0 0-5.62 5.62A5.62 5.62 0 0 0 9.58 21.7a5.62 5.62 0 0 0 5.62-5.62V8.7a8.63 8.63 0 0 0 5.02 1.6V7.28c-1.28 0-2.47-.5-3.32-1.4z"/>
    </svg>
  );
}

function SocialLink({
  href, label, children, theme,
}: {
  href: string; label: string; children: React.ReactNode; theme: WebThemeConfig;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center justify-center rounded-full transition-colors duration-150"
      style={{ width: 36, height: 36, background: `${theme.footerText}10`, color: theme.footerMuted }}
      onMouseEnter={e => { e.currentTarget.style.background = `${theme.footerText}22`; e.currentTarget.style.color = theme.footerText; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${theme.footerText}10`; e.currentTarget.style.color = theme.footerMuted; }}
    >
      {children}
    </a>
  );
}

const PRODUCT = [
  { href: '/si-funksionon', sq: 'Si funksionon', en: 'How it works' },
  { href: '/shembuj', sq: 'Shembuj', en: 'Examples' },
  { href: '/cmime', sq: 'Çmimet', en: 'Pricing' },
];
const COMPANY = [
  { href: '/rreth-nesh', sq: 'Rreth nesh', en: 'About us' },
  { href: '/kontakt', sq: 'Kontakt', en: 'Contact' },
  { href: '/faq', sq: 'FAQ', en: 'FAQ' },
];
const LEGAL = [
  { href: '/terms', sq: 'Termat & Kushtet', en: 'Terms & Conditions' },
  { href: '/privacy', sq: 'Privatësia', en: 'Privacy Policy' },
];

function LinkCol({
  title, items, lang, theme, darkHover,
}: {
  title: string;
  items: { href: string; sq: string; en: string }[];
  lang: 'sq' | 'en';
  theme: WebThemeConfig;
  darkHover?: boolean;
}) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-[0.22em] mb-5" style={{ color: theme.footerMuted }}>
        {title}
      </p>
      <ul className="space-y-3.5">
        {items.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-[14.5px] transition-colors duration-150"
              style={{ color: darkHover ? theme.footerMuted : `${theme.footerText}66` }}
              onMouseEnter={(e) => { e.currentTarget.style.color = theme.footerText; }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = darkHover ? theme.footerMuted : `${theme.footerText}66`;
              }}
            >
              {lang === 'sq' ? l.sq : l.en}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const { lang } = useLanguage();
  const year = new Date().getFullYear();
  const { data: settings } = useGetAppSettings();
  const s = settings as any;
  const siteName = s?.siteName || 'Përgjithmonë';
  const tagline = lang === 'sq'
    ? (s?.siteTaglineAl || 'Albume fotografike premium · Shqipëri')
    : (s?.siteTaglineEn || 'Premium photo albums · Albania');
  const theme = useMemo(() => webThemeFromSettings(s), [s]);
  const bg = fillBackground(theme.footerBgMode, theme.footerBg, theme.footerBgTo);
  const style = theme.footerStyle;

  const socials = (
    <div className="flex items-center justify-center gap-3">
      <SocialLink href={INSTAGRAM_URL} label="Instagram" theme={theme}>
        <Instagram size={17} strokeWidth={1.75} />
      </SocialLink>
      <SocialLink href={TIKTOK_URL} label="TikTok" theme={theme}>
        <TikTokIcon size={16} />
      </SocialLink>
    </div>
  );

  if (style === 'slim') {
    return (
      <footer style={{ background: bg, color: theme.footerText, paddingBottom: 'var(--admin-chrome-offset, 0px)', position: 'relative' }}>
        <ChromeLock />
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[13px] font-semibold tracking-tight">{siteName}</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[12.5px]" style={{ color: theme.footerMuted }}>
            {[...PRODUCT, ...COMPANY.slice(0, 1)].map((l) => (
              <Link key={l.href} href={l.href} className="hover:opacity-100 opacity-90 transition-opacity">
                {lang === 'sq' ? l.sq : l.en}
              </Link>
            ))}
          </div>
          {socials}
        </div>
      </footer>
    );
  }

  if (style === 'band') {
    return (
      <footer style={{ paddingBottom: 'var(--admin-chrome-offset, 0px)', position: 'relative' }}>
        <ChromeLock />
        <div className="px-5 md:px-10 py-12 text-center" style={{ background: bg, color: theme.footerText }}>
          <p className="font-serif italic leading-none" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300 }}>
            {siteName}
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.26em]" style={{ color: theme.footerMuted }}>{tagline}</p>
          <div className="mt-6 flex justify-center">{socials}</div>
        </div>
        <div
          className="max-w-7xl mx-auto px-5 md:px-10 py-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]"
          style={{ background: '#FFFEFB', color: '#5A534C' }}
        >
          {[...PRODUCT, ...COMPANY, ...LEGAL].slice(0, 6).map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-neutral-900 transition-colors">
              {lang === 'sq' ? l.sq : l.en}
            </Link>
          ))}
        </div>
      </footer>
    );
  }

  if (style === 'magazine') {
    return (
      <footer style={{ background: bg, color: theme.footerText, paddingBottom: 'var(--admin-chrome-offset, 0px)', position: 'relative' }}>
        <ChromeLock />
        <div className="max-w-7xl mx-auto px-5 md:px-10 pt-16 pb-10">
          <div className="md:flex md:items-end md:justify-between gap-8 mb-12">
            <p
              className="font-serif leading-[0.92] tracking-tight"
              style={{ fontSize: 'clamp(42px, 8vw, 88px)', fontWeight: 500 }}
            >
              {siteName}
            </p>
            <div className="mt-6 md:mt-0">{socials}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-10 mb-10">
            <LinkCol title={lang === 'sq' ? 'Produkt' : 'Product'} items={PRODUCT} lang={lang} theme={theme} />
            <LinkCol title={lang === 'sq' ? 'Kompania' : 'Company'} items={COMPANY} lang={lang} theme={theme} />
            <LinkCol title={lang === 'sq' ? 'Ligjore' : 'Legal'} items={LEGAL} lang={lang} theme={theme} />
          </div>
          <p className="text-[12.5px]" style={{ color: theme.footerMuted }}>
            © {year} {siteName} · {lang === 'sq' ? 'Të gjitha të drejtat e rezervuara' : 'All rights reserved'}
          </p>
        </div>
      </footer>
    );
  }

  if (style === 'light') {
    return (
      <footer style={{ background: bg, color: theme.footerText, paddingBottom: 'var(--admin-chrome-offset, 0px)', position: 'relative' }}>
        <ChromeLock />
        <div className="max-w-7xl mx-auto px-5 md:px-10 pt-14 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <p className="font-serif text-2xl mb-2" style={{ color: theme.footerText }}>{siteName}</p>
              <p className="text-[12.5px] leading-relaxed mb-5" style={{ color: theme.footerMuted }}>{tagline}</p>
              {socials}
            </div>
            <LinkCol title={lang === 'sq' ? 'Produkt' : 'Product'} items={PRODUCT} lang={lang} theme={theme} darkHover />
            <LinkCol title={lang === 'sq' ? 'Kompania' : 'Company'} items={COMPANY} lang={lang} theme={theme} darkHover />
            <LinkCol title={lang === 'sq' ? 'Ligjore' : 'Legal'} items={LEGAL} lang={lang} theme={theme} darkHover />
          </div>
          <div
            className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6 text-[12.5px]"
            style={{ borderTop: `1px solid ${theme.footerMuted}33`, color: theme.footerMuted }}
          >
            <p>© {year} {siteName}</p>
            <p>Made with ♥ in Albania</p>
          </div>
        </div>
      </footer>
    );
  }

  // classic (dark spotlight)
  return (
    <footer style={{ background: bg, color: theme.footerText, paddingBottom: 'var(--admin-chrome-offset, 0px)', position: 'relative' }}>
      <ChromeLock />
      <div className="max-w-7xl mx-auto px-5 md:px-10 pt-14 pb-10">
        <div className="text-center mb-7">
          <p
            className="font-serif leading-none tracking-tight"
            style={{ fontSize: 'clamp(30px, 4.5vw, 52px)', fontStyle: 'italic', fontWeight: 300, color: theme.footerText }}
          >
            {siteName}
            <span style={{ fontSize: '0.38em', color: theme.footerMuted, marginLeft: '0.08em' }}>.al</span>
          </p>
          <p className="mt-3 text-[11.5px] uppercase tracking-[0.26em]" style={{ color: theme.footerMuted }}>
            {tagline}
          </p>
          <div className="mt-6 flex justify-center">{socials}</div>
        </div>

        <div className="flex items-center justify-center gap-5 mb-10">
          <span className="flex-1 max-w-[120px] h-px" style={{ background: `${theme.footerText}14` }} />
          <span style={{ color: theme.footerAccent, fontSize: 10 }}>◆</span>
          <span className="flex-1 max-w-[120px] h-px" style={{ background: `${theme.footerText}14` }} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-10 mb-12">
          <LinkCol title={lang === 'sq' ? 'Produkt' : 'Product'} items={PRODUCT} lang={lang} theme={theme} />
          <LinkCol title={lang === 'sq' ? 'Kompania' : 'Company'} items={COMPANY} lang={lang} theme={theme} />
          <LinkCol title={lang === 'sq' ? 'Ligjore' : 'Legal'} items={LEGAL} lang={lang} theme={theme} />
        </div>

        <div
          className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: `1px solid ${theme.footerText}12` }}
        >
          <p style={{ fontSize: 12.5, color: theme.footerMuted }}>
            © {year} {siteName} ·{' '}
            {lang === 'sq' ? 'Të gjitha të drejtat e rezervuara' : 'All rights reserved'}
          </p>
          <p style={{ fontSize: 12.5, color: theme.footerMuted }}>
            Made with ♥ in Albania
          </p>
        </div>
      </div>
    </footer>
  );
}
