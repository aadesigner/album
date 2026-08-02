import { Helmet } from 'react-helmet-async';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGetAppSettings } from '@workspace/api-client-react';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://pergjithmone.al';
const DEFAULT_OG = `${SITE_URL}/og-default.jpg`;

interface SEOMetaProps {
  /** Page title — appended with " | Përgjithmonë" automatically */
  title?: { sq: string; en: string } | string;
  description: { sq: string; en: string };
  /** Canonical path, e.g. "/shembuj". Defaults to current pathname. */
  path?: string;
  /** Custom OG image URL per language. Falls back to DEFAULT_OG. */
  ogImage?: { sq: string; en: string } | string;
  /** Set to true for auth/private pages to block indexing */
  noIndex?: boolean;
  /** Schema.org type — defaults to 'WebPage' */
  schemaType?: string;
}

export function SEOMeta({
  title,
  description,
  path,
  ogImage,
  noIndex = false,
  schemaType = 'WebPage',
}: SEOMetaProps) {
  const { lang } = useLanguage();
  const { data: settings } = useGetAppSettings();
  const siteName = (settings as any)?.siteName || 'Përgjithmonë';

  const rawTitle = typeof title === 'string' ? title : title?.[lang];
  const fullTitle = rawTitle
    ? `${rawTitle} | ${siteName}`
    : `${siteName} — Libra Foto Premium`;

  const desc =
    typeof description === 'string' ? description : description[lang];

  const resolveUrl = (url: string) =>
    url.startsWith('/') ? `${SITE_URL}${url}` : url;
  const ogImg = resolveUrl(
    typeof ogImage === 'string'
      ? ogImage
      : ogImage?.[lang] ?? DEFAULT_OG,
  );

  const canonicalPath = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const canonical = `${SITE_URL}${canonicalPath}`;
  const hrefLang = lang === 'sq' ? 'sq' : 'en';

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: fullTitle,
    description: desc,
    url: canonical,
    inLanguage: hrefLang,
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: SITE_URL,
    },
  });

  return (
    <Helmet>
      {/* ── Core ── */}
      <html lang={hrefLang} />
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noIndex
        ? <meta name="robots" content="noindex, nofollow" />
        : <meta name="robots" content="index, follow" />
      }
      <link rel="canonical" href={canonical} />

      {/* ── Open Graph ── */}
      <meta property="og:type"        content="website" />
      <meta property="og:site_name"   content={siteName} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url"         content={canonical} />
      <meta property="og:image"       content={ogImg} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale"      content={lang === 'sq' ? 'sq_AL' : 'en_US'} />

      {/* ── Twitter / X ── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image"       content={ogImg} />

      {/* ── Schema.org ── */}
      <script type="application/ld+json">{schema}</script>
    </Helmet>
  );
}
