import React, { useEffect, useState } from 'react';
import { CAT_IMG_DEFAULT, getCategoryImage, resolvePublicImageSrc } from '@/lib/categoryImages';

/** Category photo that still paints on iOS (bg + img) and falls back if the upload URL is dead. */
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
    <span
      className={className}
      style={{
        display: 'block',
        backgroundColor: '#d4cfc8',
        backgroundImage: safeBg ? `url("${safeBg}")` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
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
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => {
            if (src !== fallback) setSrc(fallback);
            else if (src !== CAT_IMG_DEFAULT) setSrc(CAT_IMG_DEFAULT);
          }}
        />
      ) : null}
    </span>
  );
}
