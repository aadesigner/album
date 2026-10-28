/** Same-origin photos so admin + phones never depend on Unsplash hotlinking. */
export const CAT_IMG_BY_SLUG: Record<string, string> = {
  dasme: '/designs/wedding-spin-cover.jpg',
  udhetime: '/designs/paris-cover-thumb.jpg',
  familje: '/designs/baby-ador-cover.jpg',
  ditelindje: '/designs/baby-ador-thumb.jpg',
  miqesi: '/designs/amalfi-cover-thumb.jpg',
  festash: '/designs/santorini-cover-thumb.jpg',
};

/** Local backgrounds keyed by category nameAl from the API. */
export const CAT_IMG: Record<string, string> = {
  Dasmë: CAT_IMG_BY_SLUG.dasme,
  Udhëtime: CAT_IMG_BY_SLUG.udhetime,
  Familje: CAT_IMG_BY_SLUG.familje,
  Ditëlindje: CAT_IMG_BY_SLUG.ditelindje,
  Miqësi: CAT_IMG_BY_SLUG.miqesi,
  Festash: CAT_IMG_BY_SLUG.festash,
  // Alternate spellings / legacy
  Dasëm: CAT_IMG_BY_SLUG.dasme,
  Udhëtim: CAT_IMG_BY_SLUG.udhetime,
  Graduim: '/designs/athens-cover-thumb.jpg',
  Fëmijëri: CAT_IMG_BY_SLUG.familje,
  Fëmijë: CAT_IMG_BY_SLUG.familje,
  Natyrë: '/designs/amalfi-cover-thumb.jpg',
  Çifte: CAT_IMG_BY_SLUG.dasme,
  Dashurinë: CAT_IMG_BY_SLUG.dasme,
  Festë: CAT_IMG_BY_SLUG.festash,
  Festim: CAT_IMG_BY_SLUG.festash,
  'Kafshë shtëpie': '/designs/baby-ador-thumb.jpg',
  'Vit i ri': '/designs/prague-cover-thumb.jpg',
  Nostalgjia: '/designs/rome-cover-thumb.jpg',
  Shtatzëni: CAT_IMG_BY_SLUG.familje,
  Bebe: CAT_IMG_BY_SLUG.familje,
  Peizazh: '/designs/amalfi-cover-thumb.jpg',
  Arkitekturë: '/designs/barcelona-cover-thumb.jpg',
  Sport: '/designs/newyork-cover-thumb.jpg',
  Ushqim: '/designs/lisbon-cover-thumb.jpg',
};

export const CAT_IMG_DEFAULT = '/designs/wedding-cream-thumb.jpg';

/** Default catalog shown on the homepage even if /api/categories is slow or fails. */
export const DEFAULT_CATEGORIES = [
  { slug: 'dasme', nameAl: 'Dasmë', nameEn: 'Wedding' },
  { slug: 'udhetime', nameAl: 'Udhëtime', nameEn: 'Travel' },
  { slug: 'familje', nameAl: 'Familje', nameEn: 'Family' },
  { slug: 'ditelindje', nameAl: 'Ditëlindje', nameEn: 'Birthday' },
  { slug: 'miqesi', nameAl: 'Miqësi', nameEn: 'Friendship' },
  { slug: 'festash', nameAl: 'Festash', nameEn: 'Celebrations' },
] as const;

const CAT_SPINE: Record<string, string> = {
  dasme: '#8B6F47',
  udhetime: '#C47A30',
  familje: '#5C7A5A',
  ditelindje: '#7A5C7A',
  miqesi: '#5A6B7A',
  festash: '#8B5A5A',
};

const CAT_SUBLABEL: Record<string, { sq: string; en: string }> = {
  dasme: { sq: 'Dita juaj, e mbajtur përgjithmonë', en: 'Your day, kept forever' },
  udhetime: { sq: 'Udhëtimet tuaja, në faqe', en: 'Your travels, on the page' },
  familje: { sq: 'Momentet e vogla që bëhen të mëdha', en: 'Small moments that grow big' },
  ditelindje: { sq: 'Dhurata më e ngrohtë, e personalizuar', en: 'The warmest personalised gift' },
  miqesi: { sq: 'Miqësia që mbetet në album', en: 'Friendship that stays in the album' },
  festash: { sq: 'Festat që s’harrohen kurrë', en: 'Celebrations you never forget' },
};

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.endsWith('.local') ||
    h.endsWith('.internal')
  );
}

/** Force JPEG — `auto=format` can serve AVIF/WebP that some phones will not paint. */
export function phoneSafeImageSrc(src: string): string {
  if (!src.includes('images.unsplash.com')) return src;
  try {
    const u = new URL(src);
    u.searchParams.delete('auto');
    u.searchParams.set('fm', 'jpg');
    return u.toString();
  } catch {
    return src;
  }
}

/** True when a stored cover will not load on a real phone. */
export function isUnusableCoverSrc(src?: string | null): boolean {
  const raw = String(src || '').trim();
  if (!raw) return true;
  if (raw.startsWith('blob:') || raw.startsWith('file:')) return true;
  if (!/^https?:\/\//i.test(raw)) return false;
  try {
    const u = new URL(raw);
    return isPrivateHost(u.hostname);
  } catch {
    return true;
  }
}

/** Make stored cover URLs load on phones (relative /api path, not localhost). */
export function resolvePublicImageSrc(src?: string | null): string {
  const raw = String(src || '').trim();
  if (!raw) return '';
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      if (isPrivateHost(u.hostname)) {
        return `${u.pathname}${u.search}`;
      }
      if (u.protocol === 'http:') u.protocol = 'https:';
      return phoneSafeImageSrc(u.toString());
    }
  } catch {
    /* keep raw */
  }
  if (raw.startsWith('/uploads/')) return `/api${raw}`;
  return phoneSafeImageSrc(raw);
}

export function getCatalogCover(nameAl: string, slug?: string | null): string {
  if (slug && CAT_IMG_BY_SLUG[slug]) return phoneSafeImageSrc(CAT_IMG_BY_SLUG[slug]);
  return phoneSafeImageSrc(CAT_IMG[nameAl] || CAT_IMG_DEFAULT);
}

export function getCategoryImage(
  nameAl: string,
  coverImage?: string | null,
  slug?: string | null,
): string {
  const custom = resolvePublicImageSrc(coverImage);
  // Unsplash hotlinks 403 in admin/phones — skip them and use the local catalog.
  if (
    custom
    && !isUnusableCoverSrc(coverImage)
    && !custom.includes('images.unsplash.com')
  ) {
    return custom;
  }
  return getCatalogCover(nameAl, slug);
}

export function getCategorySpine(slug: string): string {
  return CAT_SPINE[slug] || '#8B6F47';
}

export function getCategorySublabel(slug: string): { sq: string; en: string } {
  return (
    CAT_SUBLABEL[slug] || {
      sq: 'Krijo albumin tuaj',
      en: 'Create your album',
    }
  );
}
