import React, { useEffect, useState } from 'react';
import {
  CAT_IMG_DEFAULT,
  getCatalogCover,
  isUnusableCoverSrc,
  phoneSafeImageSrc,
  resolvePublicImageSrc,
} from '@/lib/categoryImages';

/** Keyboard + click handlers for photo tiles — iOS will not paint <img> inside <button>. */
export function coverPressable(onClick: () => void, label?: string) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    onClick,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
  };
}

/**
 * Category photo that still paints on iOS.
 * Catalog Unsplash is always the CSS fallback. The uploaded cover sits on top
 * and falls back if it 404s, hangs behind opacity:0, or is a localhost URL.
 */
export function CategoryCoverImg({
  nameAl,
  coverImage,
  slug,
  alt,
  className,
}: {
  nameAl: string;
  coverImage?: string | null;
  slug?: string | null;
  alt: string;
  className?: string;
}) {
  const catalog = getCatalogCover(nameAl, slug);
  const customRaw = resolvePublicImageSrc(coverImage);
  const custom = customRaw && !isUnusableCoverSrc(coverImage) && customRaw !== catalog
    ? phoneSafeImageSrc(customRaw)
    : '';
  const [src, setSrc] = useState(custom || catalog);

  useEffect(() => {
    setSrc(custom || catalog);
  }, [custom, catalog]);

  const safeCatalog = catalog.replace(/"/g, '');

  return (
    <div
      className={className}
      aria-hidden={!alt}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: '#d4cfc8',
        backgroundImage: safeCatalog ? `url("${safeCatalog}")` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          decoding="async"
          loading="eager"
          fetchPriority="high"
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            border: 0,
            pointerEvents: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            opacity: 1,
          }}
          onError={() => {
            if (src !== catalog) setSrc(catalog);
            else if (src !== CAT_IMG_DEFAULT) setSrc(phoneSafeImageSrc(CAT_IMG_DEFAULT));
          }}
        />
      ) : null}
    </div>
  );
}
