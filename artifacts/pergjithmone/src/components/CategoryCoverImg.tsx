import React, { useEffect, useState } from 'react';
import {
  getCatalogCover,
  getCategorySpine,
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
 * Paper/spine wash is always underneath. The photo sits on top and is removed
 * if it 404s — a failed <img> otherwise shows the browser's missing-icon
 * glyph in the middle of the tile.
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
  const custom = customRaw
    && !isUnusableCoverSrc(customRaw)
    && !customRaw.includes('images.unsplash.com')
    && customRaw !== catalog
    ? phoneSafeImageSrc(customRaw)
    : '';
  const preferred = custom || catalog;
  const [src, setSrc] = useState(preferred);
  const [showImg, setShowImg] = useState(!!preferred);
  const spine = getCategorySpine(slug || '');

  useEffect(() => {
    setSrc(preferred);
    setShowImg(!!preferred);
  }, [preferred]);

  return (
    <div
      className={className}
      aria-hidden={!alt}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: spine || '#d4cfc8',
        backgroundImage: `linear-gradient(165deg, ${spine || '#c4b8aa'} 0%, #d4cfc8 100%)`,
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
      }}
    >
      {showImg && src ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          decoding="async"
          loading="eager"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            border: 0,
            pointerEvents: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          onError={() => {
            if (src !== catalog && catalog) {
              setSrc(catalog);
              return;
            }
            setShowImg(false);
          }}
        />
      ) : null}
    </div>
  );
}
