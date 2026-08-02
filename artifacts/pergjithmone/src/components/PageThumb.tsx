import React, { useEffect, useRef, useState } from 'react';
import { DESIGN_W, DESIGN_H, PAPER_COLOR, type EditorElement } from '@/lib/designs';

// ─────────────────────────────────────────────────────────────────────────────
// Scaled page thumbnail — renders actual page elements at thumb size.
// This is the single rendering path used everywhere a design/page preview is
// shown (Editor spread navigator, Editor's Designs panel, Wizard's design
// picker) so previews are always pixel-accurate to what gets applied to the
// real photobook — never a hand-drawn approximation.
// ─────────────────────────────────────────────────────────────────────────────

export const PageThumb = React.memo(function PageThumb({
  elements, width, height, canvasH = DESIGN_H,
}: { elements: EditorElement[] | Omit<EditorElement, 'id'>[]; width: number; height: number; canvasH?: number }) {
  const scale = width / DESIGN_W;
  // Sort so backgrounds are behind images, which are behind text/shapes
  const sorted = [...elements].sort((a, b) => {
    const z: Record<string, number> = { background: 0, placeholder: 1, image: 2, shape: 3, text: 4 };
    return (z[a.type] ?? 2) - (z[b.type] ?? 2);
  });
  return (
    <div style={{ width, height, overflow: 'hidden', position: 'relative', flexShrink: 0, background: PAPER_COLOR }}>
      <div style={{
        width: DESIGN_W, height: canvasH,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        position: 'absolute', top: 0, left: 0,
      }}>
        {sorted.map((el, i) => {
          const key = (el as EditorElement).id ?? i;
          if (el.type === 'background') {
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
              objectFit: 'cover', display: 'block', pointerEvents: 'none',
            }}/>;
          }
          if (el.type === 'placeholder') {
            return <div key={key} style={{
              position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
              background: '#E0DBD4',
            }}/>;
          }
          if (el.type === 'text') {
            return <div key={key} style={{
              position: 'absolute', left: el.x, top: el.y, width: el.w, height: Math.max(el.h, 8),
              background: el.fill ? `${el.fill}66` : 'rgba(0,0,0,0.12)',
              borderRadius: 1,
            }}/>;
          }
          if (el.type === 'shape') {
            return <div key={key} style={{
              position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
              background: el.fill || el.bgColor || '#ccc',
              borderRadius: el.shapeKind === 'circle' ? '50%' : (el.cornerRadius ?? 0),
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
