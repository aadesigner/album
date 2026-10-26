import React, { useEffect, useState } from 'react';
import { CAT_IMG_DEFAULT, getCategoryImage, resolvePublicImageSrc } from '@/lib/categoryImages';

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

/** Category photo that still paints on iOS (no native <button> parent). */
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
  const fallback = getCategoryImage(nameAl, null, slug);
  const primary = resolvePublicImageSrc(coverImage) || fallback;
  const [src, setSrc] = useState(primary);

  useEffect(() => {
    setSrc(primary);
  }, [primary]);

  const safeBg = src.replace(/"/g, '');

  return (
    <div
      className={className}
      aria-hidden={!alt}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: '#d4cfc8',
        backgroundImage: safeBg ? `url("${safeBg}")` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        // Force a compositing layer so Safari actually paints the photo.
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
          }}
          onError={() => {
            if (src !== fallback) setSrc(fallback);
            else if (src !== CAT_IMG_DEFAULT) setSrc(CAT_IMG_DEFAULT);
          }}
        />
      ) : null}
    </div>
  );
}
