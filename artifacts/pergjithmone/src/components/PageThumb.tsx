import React, { useEffect, useRef, useState } from 'react';
import { DESIGN_W, DESIGN_H, PAPER_COLOR, type EditorElement } from '@/lib/designs';
import { useEditorFontsReady, ensureEditorFonts } from '@/lib/editorFonts';

function thumbFontFamily(ff?: string): string {
  const raw = (ff || 'Georgia, serif').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('great vibes')) return "'Great Vibes', cursive";
  if (lower.includes('londrina')) return "'Londrina Solid', cursive";
  if (lower.includes('dancing')) return "'Dancing Script', cursive";
  if (lower.includes('pacifico')) return "'Pacifico', cursive";
  if (lower.includes('playfair')) return "'Playfair Display', serif";
  if (lower.includes('cormorant')) return "'Cormorant Garamond', serif";
  if (lower.includes('raleway')) return "'Raleway', sans-serif";
  if (lower.includes('montserrat')) return "'Montserrat', sans-serif";
  return raw;
}

function thumbFontStyle(ff?: string, fs?: string): { fontStyle: string; fontWeight: number | string } {
  const family = thumbFontFamily(ff).toLowerCase();
  const isScript = /great vibes|dancing script|pacifico|londrina/.test(family);
  const bold = !!fs?.includes('bold');
  if (isScript) return { fontStyle: 'normal', fontWeight: bold ? 700 : 400 };
  return {
    fontStyle: fs?.includes('italic') ? 'italic' : 'normal',
    fontWeight: bold ? 700 : 400,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scaled page thumbnail — renders actual page elements at thumb size.
// Paint order matches PDF / Konva: element array order (no type-bucket sort).
// ─────────────────────────────────────────────────────────────────────────────

export const PageThumb = React.memo(function PageThumb({
  elements, width, height, canvasH = DESIGN_H,
}: { elements: EditorElement[] | Omit<EditorElement, 'id'>[]; width: number; height: number; canvasH?: number }) {
  const fontsReady = useEditorFontsReady();
  useEffect(() => { void ensureEditorFonts(); }, []);

  const scale = width / DESIGN_W;
  return (
    <div
      data-fonts-ready={fontsReady ? '1' : '0'}
      style={{ width, height, overflow: 'hidden', position: 'relative', flexShrink: 0, background: PAPER_COLOR }}
    >
      <div style={{
        width: DESIGN_W, height: canvasH,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        position: 'absolute', top: 0, left: 0,
      }}>
        {elements.map((el, i) => {
          const key = (el as EditorElement).id ?? i;
          if (el.type === 'background') {
            if (el.src) {
              return <img key={key} src={el.src} alt="" loading="lazy" style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover',
                objectPosition: `${(el.cropFocusX ?? 0.5) * 100}% ${(el.cropFocusY ?? 0.5) * 100}%`,
                display: 'block', pointerEvents: 'none',
              }}/>;
            }
            let bg = el.bgColor || PAPER_COLOR;
            if (el.bgGradientFrom && el.bgGradientTo) {
              const dir = el.bgGradientDir === 'lr' ? 'to right' : el.bgGradientDir === 'diag' ? '135deg' : 'to bottom';
              bg = `linear-gradient(${dir},${el.bgGradientFrom},${el.bgGradientTo})`;
            }
            return <div key={key} style={{ position: 'absolute', inset: 0, background: bg }}/>;
          }
          if (el.type === 'image' && el.src) {
            return <img key={key} src={el.src} alt="" loading="lazy" style={{
              position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
              objectFit: 'cover',
              objectPosition: `${(el.cropFocusX ?? 0.5) * 100}% ${(el.cropFocusY ?? 0.5) * 100}%`,
              display: 'block', pointerEvents: 'none',
              opacity: el.opacity ?? 1,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              transformOrigin: 'top left',
            }}/>;
          }
          if (el.type === 'placeholder') {
            return <div key={key} style={{
              position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
              background: '#E0DBD4',
            }}/>;
          }
          if (el.type === 'text') {
            const face = thumbFontStyle(el.fontFamily, el.fontStyle);
            return (
              <div key={key} style={{
                position: 'absolute', left: el.x, top: el.y, width: el.w,
                height: Math.max(el.h, 8), overflow: 'hidden',
                fontSize: el.fontSize || 18,
                fontFamily: thumbFontFamily(el.fontFamily),
                fontStyle: face.fontStyle,
                fontWeight: face.fontWeight,
                color: el.fill || '#1a1a1a',
                textAlign: (el.align || 'center') as React.CSSProperties['textAlign'],
                lineHeight: el.lineHeight ?? 1.2,
                letterSpacing: el.letterSpacing ?? 0,
                whiteSpace: 'pre-wrap',
                padding: 6,
                boxSizing: 'border-box',
                // Hold text until webfonts land — avoids Great Vibes FOUT on hero/wedding covers.
                opacity: fontsReady ? (el.opacity ?? 1) : 0,
                transition: fontsReady ? 'opacity 0.18s ease' : undefined,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                transformOrigin: 'top left',
              }}>
                {el.text}
              </div>
            );
          }
          if (el.type === 'shape') {
            const fill = el.fill && el.fill !== 'transparent' ? el.fill : (el.bgColor && el.bgColor !== 'transparent' ? el.bgColor : undefined);
            const hasStroke = !!(el.strokeColor && (el.strokeWidth ?? 0) > 0);
            return <div key={key} style={{
              position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
              background: fill || (hasStroke ? 'transparent' : '#ccc'),
              borderRadius: el.shapeKind === 'circle' ? '50%' : (el.cornerRadius ?? 0),
              border: hasStroke ? `${el.strokeWidth}px solid ${el.strokeColor}` : undefined,
              boxSizing: 'border-box',
              opacity: el.opacity ?? 1,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              transformOrigin: 'center',
            }}/>;
          }
          return null;
        })}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Responsive variant — fills its parent's width and derives height from the
// DESIGN_W/DESIGN_H aspect ratio. Use inside fluid grids (e.g. the Wizard's
// design picker) where the card size isn't known ahead of time.
// ─────────────────────────────────────────────────────────────────────────────

export function ResponsivePageThumb({
  elements, className, style, canvasH = DESIGN_H,
}: { elements: EditorElement[] | Omit<EditorElement, 'id'>[]; className?: string; style?: React.CSSProperties; canvasH?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', aspectRatio: `${DESIGN_W} / ${canvasH}`, ...style }}>
      {width > 0 && <PageThumb elements={elements} width={width} height={width * (canvasH / DESIGN_W)} canvasH={canvasH} />}
    </div>
  );
}
