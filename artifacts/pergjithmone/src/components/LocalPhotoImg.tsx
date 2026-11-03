import React, { useEffect, useState } from 'react';
import { isLocalPhotoSrc, resolveDisplayUrl } from '@/lib/localPhotoStore';

/** <img> that resolves `local-photo:` IndexedDB blobs (and normal URLs). */
export function LocalPhotoImg({
  src,
  alt = '',
  className,
  draggable = false,
  style,
}: {
  src: string;
  alt?: string;
  className?: string;
  draggable?: boolean;
  style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(() => (isLocalPhotoSrc(src) ? '' : src));

  useEffect(() => {
    let cancelled = false;
    if (!isLocalPhotoSrc(src)) {
      setDisplay(src);
      return;
    }
    setDisplay('');
    void resolveDisplayUrl(src).then((url) => {
      if (!cancelled) setDisplay(url || '');
    });
    return () => { cancelled = true; };
  }, [src]);

  if (!display) {
    return (
      <span
        className={className}
        style={{
          ...style,
          display: 'block',
          background: 'linear-gradient(135deg,#EDE7DE,#D9D0C4)',
        }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={display}
      alt={alt}
      className={className}
      style={style}
      draggable={draggable}
    />
  );
}
