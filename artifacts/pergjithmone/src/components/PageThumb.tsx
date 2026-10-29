import React, { useEffect, useRef, useState } from 'react';
import {
  DESIGN_W, DESIGN_H, PAPER_COLOR,
  designCatalogFace,
  type DesignDef, type EditorElement,
} from '@/lib/designs';
import { isStrokeOnlyShape, shapePathForElement } from '@/lib/shapes';
import { useEditorFontsReady, ensureEditorFonts, normalizeEditorFont, isEditorSingleCutFont } from '@/lib/editorFonts';
import { resolvePublicImageSrc } from '@/lib/categoryImages';

function thumbFontFamily(ff?: string): string {
  return normalizeEditorFont(ff);
}

function thumbFontStyle(ff?: string, fs?: string): { fontStyle: string; fontWeight: number | string } {
  const bold = !!fs?.includes('bold');
  if (isEditorSingleCutFont(ff)) return { fontStyle: 'normal', fontWeight: bold ? 700 : 400 };
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
  elements, width, height, canvasH = DESIGN_H, fit = 'width', background, priority = false,
}: {
  elements: EditorElement[] | Omit<EditorElement, 'id'>[];
  width: number;
  height: number;
  canvasH?: number;
  /** `width` = contain the full page in the box. `cover` = fill the box (may crop). */
  fit?: 'width' | 'cover';
  /** Overrides the default paper fill (use cover color for 3D books). */
  background?: string;
  /** Eager-load photos — needed for CSS 3D covers, where lazy never fires on iOS. */
  priority?: boolean;
}) {
  const fontsReady = useEditorFontsReady();
  const [paintText, setPaintText] = useState(fontsReady);
  useEffect(() => { void ensureEditorFonts(); }, []);
  useEffect(() => {
    if (fontsReady) {
      setPaintText(true);
      return;
    }
    const t = window.setTimeout(() => setPaintText(true), 180);
    return () => window.clearTimeout(t);
  }, [fontsReady]);

  const scaleW = width / DESIGN_W;
  const scaleH = height / Math.max(1, canvasH);
  // `width` used to scale only by width, so a 1px-short box cropped names/dates
  // at the cover edge. Contain (min) keeps the full builder canvas in view.
  const scale = fit === 'cover' ? Math.max(scaleW, scaleH) : Math.min(scaleW, scaleH);
  const scaledW = DESIGN_W * scale;
  const scaledH = canvasH * scale;
  const ox = (width - scaledW) / 2;
  const oy = (height - scaledH) / 2;

  return (
    <div
      data-fonts-ready={fontsReady ? '1' : '0'}
      style={{
        width, height, overflow: 'hidden', position: 'relative', flexShrink: 0,
        background: background ?? PAPER_COLOR,
      }}
    >
      <div style={{
        width: DESIGN_W, height: canvasH,
        transform: `translate(${ox}px, ${oy}px) scale(${scale})`,
        transformOrigin: 'top left',
        position: 'absolute', top: 0, left: 0,
      }}>
        {elements.map((el, i) => {
          const key = (el as EditorElement).id ?? i;
          if (el.type === 'background') {
            if (el.src) {
              return <img key={key} src={resolvePublicImageSrc(el.src) || el.src} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" style={{
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
            const zoom = Math.max(1, el.cropZoom ?? 1);
            const fx = (el.cropFocusX ?? 0.5) * 100;
            const fy = (el.cropFocusY ?? 0.5) * 100;
            return (
              <div
                key={key}
                style={{
                  position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
                  overflow: 'hidden',
                  opacity: el.opacity ?? 1,
                  mixBlendMode: (el.mixBlendMode as React.CSSProperties['mixBlendMode']) || undefined,
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
              >
                <img
                  src={resolvePublicImageSrc(el.src) || el.src}
                  alt=""
                  loading={priority ? 'eager' : 'lazy'}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  style={{
                    width: '100%', height: '100%', display: 'block',
                    objectFit: el.objectFit === 'contain' ? 'contain' : 'cover',
                    objectPosition: `${fx}% ${fy}%`,
                    transform: zoom > 1 ? `scale(${zoom})` : undefined,
                    transformOrigin: `${fx}% ${fy}%`,
                  }}
                />
              </div>
            );
          }
          if (el.type === 'placeholder') {
            return <div key={key} style={{
              position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
              background: '#E0DBD4',
            }}/>;
          }
          if (el.type === 'text') {
            const face = thumbFontStyle(el.fontFamily, el.fontStyle);
            const vAlign = el.verticalAlign || 'top';
            return (
              <div key={key} style={{
                position: 'absolute', left: el.x, top: el.y, width: el.w,
                height: Math.max(el.h, 8),
                display: 'flex',
                flexDirection: 'column',
                justifyContent: vAlign === 'middle' ? 'center' : vAlign === 'bottom' ? 'flex-end' : 'flex-start',
                overflow: 'visible',
                fontSize: el.fontSize || 18,
                fontFamily: thumbFontFamily(el.fontFamily),
                fontStyle: face.fontStyle,
                fontWeight: face.fontWeight,
                color: el.fill || '#1a1a1a',
                textAlign: (el.align || 'center') as React.CSSProperties['textAlign'],
                lineHeight: el.lineHeight ?? 1.2,
                letterSpacing: el.letterSpacing ?? 0,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                padding: 6,
                boxSizing: 'border-box',
                // Hold briefly for webfonts, then paint anyway — fonts.ready
                // can hang and used to leave Barcelona/Paris as a blank plate.
                opacity: paintText ? (el.opacity ?? 1) : 0,
                transition: paintText ? 'opacity 0.18s ease' : undefined,
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
            const strokeOnly = isStrokeOnlyShape(el.shapeKind);
            const d = shapePathForElement(el.shapeKind, el.w, el.h, el.cornerRadius);
            return (
              <svg
                key={key}
                width={el.w}
                height={el.h}
                viewBox={`0 0 ${Math.max(1, el.w)} ${Math.max(1, el.h)}`}
                style={{
                  position: 'absolute', left: el.x, top: el.y,
                  overflow: 'visible',
                  opacity: el.opacity ?? 1,
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                  transformOrigin: 'center',
                  pointerEvents: 'none',
                }}
              >
                <path
                  d={d}
                  fill={strokeOnly ? 'none' : (fill || (hasStroke ? 'none' : '#ccc'))}
                  fillRule="evenodd"
                  stroke={hasStroke || strokeOnly ? (el.strokeColor || '#1A1A1A') : 'none'}
                  strokeWidth={el.strokeWidth || (strokeOnly ? 4 : 0)}
                  strokeLinecap="round"
                />
              </svg>
            );
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
    let tries = 0;
    const apply = () => {
      const w = Math.round(el.offsetWidth || el.clientWidth || el.getBoundingClientRect().width);
      if (w > 0) {
        setWidth(w);
        return;
      }
      if (tries++ < 24) requestAnimationFrame(apply);
    };
    apply();
    const observer = new ResizeObserver(() => apply());
    observer.observe(el);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, []);

  const scale = width > 0 ? width / DESIGN_W : undefined;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        aspectRatio: `${DESIGN_W} / ${canvasH}`,
        overflow: 'hidden',
        position: 'relative',
        containerType: 'inline-size',
        ...style,
      }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: canvasH,
          position: 'absolute',
          top: 0,
          left: 0,
          transform: scale != null
            ? `scale(${scale})`
            : `scale(calc(100cqw / ${DESIGN_W}))`,
          transformOrigin: 'top left',
        }}
      >
        <PageThumb elements={elements} width={DESIGN_W} height={canvasH} canvasH={canvasH} />
      </div>
    </div>
  );
}

const MOCKUP_IMG: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
  pointerEvents: 'none',
};

/** Picker / sidebar face — live layers so it matches Design Studio. */
export function DesignCatalogThumb({
  design,
  width,
  height,
  preferMockup = false,
}: {
  design: Pick<DesignDef, 'thumbPhoto' | 'thumb' | 'elements'>;
  width: number;
  height: number;
  /** True = allow a baked mockup JPG when a design has no live layers. */
  preferMockup?: boolean;
}) {
  const face = preferMockup ? designCatalogFace(design) : { kind: 'elements' as const, elements: design.elements || [] };
  if (face.kind === 'photo') {
    return (
      <img
        src={face.src}
        alt=""
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        style={{ width, height, objectFit: 'cover', display: 'block' }}
      />
    );
  }
  if (face.elements.length > 0) {
    return <PageThumb elements={face.elements} width={width} height={height} />;
  }
  return (
    <div style={{ width, height, background: (design.thumb?.background as string) || '#ECE7E1' }} />
  );
}

export function ResponsiveDesignCatalogThumb({
  design,
  className,
  style,
  preferMockup = false,
}: {
  design: Pick<DesignDef, 'thumbPhoto' | 'thumb' | 'elements'>;
  className?: string;
  style?: React.CSSProperties;
  preferMockup?: boolean;
}) {
  const face = preferMockup ? designCatalogFace(design) : { kind: 'elements' as const, elements: design.elements || [] };
  if (face.kind === 'photo') {
    return (
      <img
        src={face.src}
        alt=""
        className={className}
        loading="lazy"
        decoding="async"
        style={{ ...MOCKUP_IMG, ...style }}
      />
    );
  }
  if (face.elements.length > 0) {
    return <ResponsivePageThumb elements={face.elements} className={className} style={style} />;
  }
  return (
    <div
      className={className}
      style={{ background: (design.thumb?.background as string) || '#ECE7E1', ...style }}
    />
  );
}
