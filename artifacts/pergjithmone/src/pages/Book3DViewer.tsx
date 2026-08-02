import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────
interface EditorElement {
  id: string; type: 'background'|'shape'|'placeholder'|'image'|'text';
  x: number; y: number; w: number; h: number; rotation: number;
  bgColor?: string; bgGradientFrom?: string; bgGradientTo?: string;
  bgGradientDir?: 'tb'|'lr'|'diag';
  fill?: string; shapeKind?: 'rect'|'circle'; opacity?: number;
  strokeColor?: string; strokeWidth?: number; cornerRadius?: number;
  src?: string; text?: string; fontSize?: number; fontFamily?: string;
  fontStyle?: string; align?: 'left'|'center'|'right'; fontWeight?: string;
}
interface PageDef { dbId: number; role: string; pageNumber?: number }
interface SpreadDef {
  id: string; navLabel: string; isSolo: boolean;
  left: PageDef | null; right: PageDef | null;
}

const DESIGN_W = 600;
const DESIGN_H = 800;

// ─── Color helpers — used to tint the 3D viewer's ambient background and the
// browse-mode "stage" so they harmonize with the user's chosen cover color,
// instead of a fixed neutral gradient that can clash with (or wash out
// controls against) any given design. ────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  if (!ca || !cb) return a;
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
function hexToRgba(hex: string, alpha: number): string {
  const c = hexToRgb(hex);
  if (!c) return `rgba(20,16,12,${alpha})`;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}
function relLuminance(hex: string): number {
  const c = hexToRgb(hex);
  if (!c) return 1;
  const [r, g, b] = [c.r, c.g, c.b].map(v => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ─── Mini page renderer ───────────────────────────────────────────────────────
function PageMiniRender({ elements, w, h, paperColor = '#F2EDE5', canvasH = DESIGN_H }: {
  elements: EditorElement[]; w: number; h: number; paperColor?: string; canvasH?: number;
}) {
  const scX = w / DESIGN_W;
  const scY = h / canvasH;

  const bg = elements.find(e => e.type === 'background');
  const shapes = elements.filter(e => e.type === 'shape');
  const imgs = elements.filter(e => e.type === 'image');
  const txts = elements.filter(e => e.type === 'text');
  const phs = elements.filter(e => e.type === 'placeholder');

  const getBg = () => {
    if (!bg) return paperColor;
    if (bg.bgGradientFrom) {
      const dir = bg.bgGradientDir === 'lr' ? 'to right'
        : bg.bgGradientDir === 'diag' ? '135deg'
        : 'to bottom';
      return `linear-gradient(${dir}, ${bg.bgGradientFrom}, ${bg.bgGradientTo || '#fff'})`;
    }
    return bg.bgColor || paperColor;
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: getBg(), overflow: 'hidden', userSelect: 'none' }}>
      {shapes.map((el, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: el.x * scX, top: el.y * scY,
          width: el.w * scX, height: el.h * scY,
          background: el.fill === 'transparent' ? 'transparent' : (el.fill || 'transparent'),
          borderRadius: el.shapeKind === 'circle' ? '50%' : (el.cornerRadius ? el.cornerRadius * scX : 0),
          border: el.strokeColor && el.strokeWidth ? `${el.strokeWidth * scX}px solid ${el.strokeColor}` : undefined,
          opacity: el.opacity ?? 1,
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          transformOrigin: 'center',
        }} />
      ))}
      {phs.map((el, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: el.x * scX, top: el.y * scY,
          width: el.w * scX, height: el.h * scY,
          background: 'rgba(200,190,180,0.35)', borderRadius: 2,
        }} />
      ))}
      {imgs.map((el, i) => (
        <img key={i} src={el.src} draggable={false} alt="" style={{
          position: 'absolute',
          left: el.x * scX, top: el.y * scY,
          width: el.w * scX, height: el.h * scY,
          objectFit: 'cover',
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          transformOrigin: 'center',
        }} />
      ))}
      {txts.map((el, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: el.x * scX, top: el.y * scY,
          width: el.w * scX,
          // fontSize is a width-relative scalar (see designs.ts DESIGN_W/DESIGN_H
          // doc) — scale by scX, not scY, so text stays proportional on
          // non-3:4 books where scX and scY differ.
          fontSize: (el.fontSize || 18) * scX,
          fontFamily: el.fontFamily || 'Georgia, serif',
          fontStyle: el.fontStyle?.includes('italic') ? 'italic' : 'normal',
          fontWeight: el.fontStyle?.includes('bold') ? '700' : '400',
          color: el.fill || '#333',
          textAlign: (el.align || 'center') as any,
          lineHeight: 1.3,
          overflow: 'hidden',
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          transformOrigin: 'top left',
          padding: 2 * scX,
          whiteSpace: 'pre-wrap',
        }}>{el.text}</div>
      ))}
    </div>
  );
}

// ─── Pages-edge face (plain white) ───────────────────────────────────────────
function PagesEdgeFace({ W, H, D, pageCount }: { W: number; H: number; D: number; pageCount: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#FAFAF8', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.02) 35%, rgba(0,0,0,0.02) 60%, rgba(0,0,0,0.10) 100%)',
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.10) 100%)' }} />
    </div>
  );
}

// ─── Spine face ───────────────────────────────────────────────────────────────
function SpineFace({ title, D, H, bgColor }: { title: string; D: number; H: number; bgColor: string }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: bgColor,
      overflow: 'hidden',
    }}>
      {/* Edge shading only — no texture */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.06) 30%, rgba(0,0,0,0.04) 70%, rgba(0,0,0,0.28) 100%)',
      }} />
      {/* Brand text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          transform: 'rotate(90deg)',
          whiteSpace: 'nowrap',
          fontSize: Math.max(6, Math.min(10, D * 0.38)),
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.08em',
          maxWidth: H * 0.75,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{title || 'Përgjithmonë'}</div>
      </div>
    </div>
  );
}

// ─── Browse item types ────────────────────────────────────────────────────────
type BrowseItem =
  | { kind: 'cover'; page: PageDef; label: string }
  | { kind: 'spread'; spread: SpreadDef; label: string }
  | { kind: 'back'; page: PageDef; label: string };

// ─── Spread browser ───────────────────────────────────────────────────────────
function SpreadBrowser({
  items, pagesContent, lang, canvasH = DESIGN_H,
}: {
  items: BrowseItem[];
  pagesContent: Record<number, EditorElement[]>;
  lang: 'sq' | 'en';
  canvasH?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  const go = (d: number) => {
    const next = idx + d;
    if (next < 0 || next >= items.length) return;
    setDir(d);
    setIdx(next);
  };

  const item = items[idx];

  // Responsive page width
  const [pgW, setPgW] = useState(200);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const avail = containerRef.current.clientWidth - 120;
      const half = Math.min(Math.floor(avail / 2), 260);
      setPgW(Math.max(100, half));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  const pgH = Math.round(pgW * (canvasH / DESIGN_W));

  // Keyboard navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [idx]); // eslint-disable-line

  const renderSoloPage = (page: PageDef, showSpineLeft: boolean) => {
    const els = pagesContent[page.dbId] ?? [];
    const spineGrad = showSpineLeft
      ? 'linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.18) 28%, transparent 55%)'
      : 'linear-gradient(to left, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.18) 28%, transparent 55%)';
    const borderRad = showSpineLeft ? '0 4px 4px 0' : '4px 0 0 4px';
    const spineEl = (
      <div style={{
        width: 10, flexShrink: 0, alignSelf: 'stretch',
        background: showSpineLeft
          ? 'linear-gradient(to right, #0f0a06 0%, #2a1409 45%, #1a0c07 100%)'
          : 'linear-gradient(to left, #0f0a06 0%, #2a1409 45%, #1a0c07 100%)',
        boxShadow: showSpineLeft
          ? 'inset -2px 0 6px rgba(0,0,0,0.4)'
          : 'inset 2px 0 6px rgba(0,0,0,0.4)',
      }} />
    );
    const pageEl = (
      <div style={{
        width: pgW, height: pgH, position: 'relative', flexShrink: 0,
        borderRadius: borderRad, overflow: 'hidden',
        boxShadow: showSpineLeft
          ? '6px 0 30px rgba(0,0,0,0.50), 0 8px 32px rgba(0,0,0,0.40)'
          : '-6px 0 30px rgba(0,0,0,0.50), 0 8px 32px rgba(0,0,0,0.40)',
      }}>
        <PageMiniRender elements={els} w={pgW} h={pgH} canvasH={canvasH} />
        {/* Gloss */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(125deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(0,0,0,0.05) 100%)`,
        }} />
        {/* Spine shadow on page */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', background: spineGrad,
        }} />
      </div>
    );
    return (
      <div style={{
        display: 'flex', alignItems: 'stretch',
        filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.60))',
        perspective: 1400, transformStyle: 'preserve-3d',
      }}>
        <div style={{ transform: `rotateY(${showSpineLeft ? 10 : -10}deg)`, transformOrigin: showSpineLeft ? 'left center' : 'right center', display: 'flex' }}>
          {showSpineLeft ? spineEl : null}
          {pageEl}
          {!showSpineLeft ? spineEl : null}
        </div>
      </div>
    );
  };

  const renderSpread = (spread: SpreadDef) => {
    const leftEls = spread.left ? (pagesContent[spread.left.dbId] ?? []) : [];
    const rightEls = spread.right ? (pagesContent[spread.right.dbId] ?? []) : [];
    const isInsideCover = spread.left?.role === 'locked_left';
    const isInsideBackCover = spread.right?.role === 'locked_right';
    return (
      <div style={{
        display: 'flex', alignItems: 'stretch',
        filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.60))',
        perspective: 1400, transformStyle: 'preserve-3d',
      }}>
        {/* Left page — tilted back slightly like an open book, hinged at the spine */}
        <div style={{
          width: pgW, height: pgH, position: 'relative', flexShrink: 0,
          borderRadius: '4px 0 0 4px', overflow: 'hidden',
          outline: '1px solid rgba(255,255,255,0.06)',
          transform: 'rotateY(12deg)',
          transformOrigin: 'right center',
        }}>
          {spread.left ? (
            isInsideCover ? (
              <div style={{ position: 'absolute', inset: 0, background: '#1a1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{lang === 'sq' ? 'brendia e kopertinës' : 'inside cover'}</span>
              </div>
            ) : (
              <PageMiniRender elements={leftEls} w={pgW} h={pgH} canvasH={canvasH} />
            )
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: '#F2EDE5' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to left, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.10) 18%, transparent 38%)' }} />
        </div>
        {/* Spine strip */}
        <div style={{
          width: 6, flexShrink: 0,
          background: 'linear-gradient(to right, #1a0e06 0%, #2e1709 40%, #1a0e06 100%)',
          boxShadow: 'inset -1px 0 4px rgba(0,0,0,0.5), inset 1px 0 4px rgba(0,0,0,0.5), 0 0 10px rgba(0,0,0,0.4)',
          zIndex: 1,
        }} />
        {/* Right page — mirrored tilt so the spread reads as one open book */}
        <div style={{
          width: pgW, height: pgH, position: 'relative', flexShrink: 0,
          borderRadius: '0 4px 4px 0', overflow: 'hidden',
          outline: '1px solid rgba(255,255,255,0.06)',
          transform: 'rotateY(-12deg)',
          transformOrigin: 'left center',
        }}>
          {spread.right ? (
            isInsideBackCover ? (
              <div style={{ position: 'absolute', inset: 0, background: '#1a1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{lang === 'sq' ? 'brendia e kopertinës së pasme' : 'inside back cover'}</span>
              </div>
            ) : (
              <PageMiniRender elements={rightEls} w={pgW} h={pgH} canvasH={canvasH} />
            )
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: '#F2EDE5' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to right, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.10) 18%, transparent 38%)' }} />
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center gap-7 px-4 overflow-hidden select-none">

      {/* Label */}
      <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'Georgia, serif' }}>
        {item?.label}
      </p>

      {/* Pages + arrows */}
      <div className="flex items-center gap-5 md:gap-7">
        <button onClick={() => go(-1)} disabled={idx === 0} style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0, border: 'none',
          background: idx === 0 ? 'rgba(10,8,6,0.28)' : 'rgba(10,8,6,0.62)',
          color: idx === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: idx === 0 ? 'default' : 'pointer', transition: 'all 0.15s',
          outline: idx === 0 ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.16)',
          boxShadow: idx === 0 ? 'none' : '0 4px 16px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(2px)',
        }}>
          <ChevronLeft size={19} />
        </button>

        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: dir * 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -dir * 36 }}
              transition={{ duration: 0.20, ease: 'easeOut' }}
            >
              {item?.kind === 'cover' && renderSoloPage(item.page, true)}
              {item?.kind === 'back'  && renderSoloPage(item.page, false)}
              {item?.kind === 'spread' && renderSpread(item.spread)}
            </motion.div>
          </AnimatePresence>
        </div>

        <button onClick={() => go(1)} disabled={idx >= items.length - 1} style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0, border: 'none',
          background: idx >= items.length - 1 ? 'rgba(10,8,6,0.28)' : 'rgba(10,8,6,0.62)',
          color: idx >= items.length - 1 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: idx >= items.length - 1 ? 'default' : 'pointer', transition: 'all 0.15s',
          outline: idx >= items.length - 1 ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.16)',
          boxShadow: idx >= items.length - 1 ? 'none' : '0 4px 16px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(2px)',
        }}>
          <ChevronRight size={19} />
        </button>
      </div>

      {/* Dot pagination */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 320 }}>
        {items.map((_, i) => (
          <button key={i} onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }} style={{
            width: i === idx ? 18 : 5, height: 5, borderRadius: 3, border: 'none', padding: 0, cursor: 'pointer',
            background: i === idx ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.2s',
          }} />
        ))}
      </div>

      {/* Keyboard hint */}
      <p style={{ color: 'rgba(255,255,255,0.14)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        {lang === 'sq' ? '← → tastet e shigjetave' : '← → arrow keys'}
      </p>
    </div>
  );
}

// ─── 3D Book ─────────────────────────────────────────────────────────────────
export function Book3DViewer({
  project, pagesContent, spreads, onClose, lang, canvasH = DESIGN_H,
}: {
  project: any;
  pagesContent: Record<number, EditorElement[]>;
  spreads: SpreadDef[];
  onClose: () => void;
  lang: 'sq' | 'en';
  canvasH?: number;
}) {
  const [rotY, setRotY] = useState(-28);
  const [rotX, setRotX] = useState(14);
  const [autoRotate, setAutoRotate] = useState(true);
  const [hint, setHint] = useState(true);
  const [browseMode, setBrowseMode] = useState(false);

  const rotYRef = useRef(-28);
  const rotXRef = useRef(14);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Book dimensions — scale to screen
  const W = 270;
  const H = Math.round(W * (canvasH / DESIGN_W)); // ≈ 360 for 3:4 books
  const D = Math.max(8, Math.min(28, Math.round((project.pageCount || 20) * 0.45)));

  // Auto-rotation
  useEffect(() => {
    const tick = () => {
      if (!isDragging.current && autoRotate && !browseMode) {
        rotYRef.current += 0.28;
        setRotY(rotYRef.current);
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animRef.current);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [autoRotate, browseMode]);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 3200);
    return () => clearTimeout(t);
  }, []);

  const pauseAuto = useCallback(() => {
    setAutoRotate(false);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setAutoRotate(true), 3500);
  }, []);

  // Mouse / touch
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (browseMode) return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    pauseAuto(); e.preventDefault();
  }, [pauseAuto, browseMode]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || browseMode) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    rotYRef.current += dx * 0.55;
    rotXRef.current = Math.min(28, Math.max(-18, rotXRef.current - dy * 0.28));
    setRotY(rotYRef.current);
    setRotX(rotXRef.current);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [browseMode]);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (browseMode) return;
    isDragging.current = true;
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    pauseAuto();
  }, [pauseAuto, browseMode]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || browseMode) return;
    const dx = e.touches[0].clientX - lastPos.current.x;
    const dy = e.touches[0].clientY - lastPos.current.y;
    rotYRef.current += dx * 0.55;
    rotXRef.current = Math.min(28, Math.max(-18, rotXRef.current - dy * 0.28));
    setRotY(rotYRef.current);
    setRotX(rotXRef.current);
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, [browseMode]);

  const onTouchEnd = useCallback(() => { isDragging.current = false; }, []);

  // ── Extract page content ────────────────────────────────────────────────────
  const frontCoverSpread = spreads.find(s => s.id === 'cover');
  const backCoverSpread  = spreads.find(s => s.id === 'back-cover');
  const coverPage  = frontCoverSpread?.right ?? null;
  const backPage   = backCoverSpread?.left   ?? null;
  const coverEls   = coverPage ? (pagesContent[coverPage.dbId] ?? []) : [];
  const backEls    = backPage  ? (pagesContent[backPage.dbId]  ?? []) : [];
  const coverBg    = coverEls.find(e => e.type === 'background');
  const spineColor = (coverBg as any)?.bgColor || (coverBg as any)?.bgGradientFrom || '#1a1209';

  // ── Theme derived from the cover color — makes the room and the browse
  // stage blend with whatever design the user picked, instead of a fixed
  // neutral backdrop that can clash with (or wash out) any given cover. ─────
  const themeColor = /^#[0-9a-f]{6}$/i.test(spineColor) ? spineColor : '#4a3f33';
  const ambientBase = ['#f5f1ea', '#eee7db', '#f2ede4'];
  const ambientBlend = ambientBase.map(c => mixHex(c, themeColor, 0.22));
  const isDarkAmbient = relLuminance(ambientBlend[1]) < 0.55;
  const ink = {
    strong: isDarkAmbient ? 'rgba(255,255,255,0.86)' : 'rgba(0,0,0,0.72)',
    mid: isDarkAmbient ? 'rgba(255,255,255,0.58)' : 'rgba(0,0,0,0.42)',
    faint: isDarkAmbient ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.30)',
    faintest: isDarkAmbient ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)',
    btnBg: isDarkAmbient ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)',
    btnBgActive: isDarkAmbient ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.10)',
    outline: isDarkAmbient ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)',
  };
  const ambientGradient = `linear-gradient(170deg, ${ambientBlend[0]} 0%, ${ambientBlend[1]} 45%, ${ambientBlend[2]} 100%)`;
  const vignette = isDarkAmbient
    ? 'radial-gradient(ellipse 80% 60% at 50% 52%, rgba(255,255,255,0.08) 0%, transparent 70%)'
    : 'radial-gradient(ellipse 80% 60% at 50% 52%, rgba(255,255,255,0.55) 0%, transparent 70%)';
  // ── Browse items: front cover → inner spreads → back cover ─────────────────
  const browseItems: BrowseItem[] = [
    ...(coverPage ? [{ kind: 'cover' as const, page: coverPage, label: lang === 'sq' ? 'Kopertina' : 'Front Cover' }] : []),
    ...spreads
      .filter(s => !s.isSolo)
      .map((s, i) => ({ kind: 'spread' as const, spread: s, label: lang === 'sq' ? `Faqet ${i + 1}` : `Spread ${i + 1}` })),
    ...(backPage ? [{ kind: 'back' as const, page: backPage, label: lang === 'sq' ? 'Kopertina e Pasme' : 'Back Cover' }] : []),
  ];

  const title = project?.title || (lang === 'sq' ? 'Fotolibri' : 'Photobook');
  const pageCount = project?.pageCount ?? spreads.length * 2;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{
        background: ambientGradient,
        transition: 'background 0.4s ease',
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Soft center vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: vignette,
      }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 flex-shrink-0">
        <div className="min-w-0">
          <p className="font-serif text-sm md:text-base truncate" style={{ color: ink.strong, fontStyle: 'italic' }}>
            {title}
          </p>
          <AnimatePresence mode="wait">
            {browseMode ? (
              <motion.p key="browse-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] mt-0.5" style={{ color: ink.faint, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                {lang === 'sq' ? `${browseItems.length} faqe · ${pageCount} gjithsej` : `${browseItems.length} pages · ${pageCount} total`}
              </motion.p>
            ) : hint ? (
              <motion.p key="hint" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-[10px] mt-0.5" style={{ color: ink.faint, letterSpacing: '0.08em' }}>
                {lang === 'sq' ? 'tërhiqe për të rrotulluar' : 'drag to rotate'}
              </motion.p>
            ) : (
              <motion.p key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-[10px] mt-0.5" style={{ color: ink.faintest, letterSpacing: '0.08em' }}>
                {lang === 'sq' ? `${pageCount} faqe · ${D}mm shpinë` : `${pageCount} pages · ${D}mm spine`}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset */}
          {!browseMode && (
            <button
              onClick={() => { rotYRef.current = -28; rotXRef.current = 14; setRotY(-28); setRotX(14); setAutoRotate(true); }}
              title={lang === 'sq' ? 'Rivendos pamjen' : 'Reset view'}
              style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                background: ink.btnBg, color: ink.mid,
                outline: `1px solid ${ink.outline}`, transition: 'all 0.15s',
              }}
            >
              <RotateCcw size={13} />
            </button>
          )}

          {/* Browse / 3D toggle */}
          <button
            onClick={() => setBrowseMode(v => !v)}
            style={{
              height: 34, padding: '0 16px', borderRadius: 20, border: 'none',
              background: browseMode ? ink.btnBgActive : ink.btnBg,
              color: ink.strong, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', outline: `1px solid ${ink.outline}`, transition: 'all 0.15s',
              letterSpacing: '0.02em',
            }}
          >
            {browseMode
              ? (lang === 'sq' ? 'Pamje 3D' : '3D View')
              : (lang === 'sq' ? 'Shfleto Faqet' : 'Browse Pages')}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              background: ink.btnBg, color: ink.mid,
              outline: `1px solid ${ink.outline}`, transition: 'all 0.15s',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main */}
      <AnimatePresence mode="wait">
        {browseMode ? (
          <motion.div key="browse" className="relative z-10 flex-1 flex flex-col overflow-hidden p-3 md:p-5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}>
            {/* Renders directly on the viewer's ambient background — no extra
                dark "stage" layered on top of it. */}
            <div style={{ flex: 1, borderRadius: 24, overflow: 'hidden', position: 'relative' }}>
              <SpreadBrowser items={browseItems} pagesContent={pagesContent} lang={lang} canvasH={canvasH} />
            </div>
          </motion.div>
        ) : (
          <motion.div key="3d" className="relative z-10 flex-1 flex items-center justify-center"
            style={{ perspective: '1200px', perspectiveOrigin: '50% 46%' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}>

            {/* Ground shadow — cast beneath the book */}
            <div style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: 'translateX(-50%)',
              marginTop: H * 0.52 + D * 0.4,
              width: W * 1.15,
              height: 56,
              background: `radial-gradient(ellipse, ${hexToRgba(themeColor, 0.30)} 0%, transparent 70%)`,
              filter: 'blur(18px)',
              pointerEvents: 'none',
            }} />

            {/* Book wrapper */}
            <div
              style={{
                position: 'relative',
                width: W, height: H,
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                cursor: isDragging.current ? 'grabbing' : 'grab',
              }}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
            >

              {/* ── FRONT COVER ── z = 0 (front face) */}
              <div style={{
                position: 'absolute', inset: 0,
                transform: 'translateZ(0px)',
                borderRadius: '1px 4px 4px 1px',
                overflow: 'hidden',
                backfaceVisibility: 'hidden',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.7)',
              }}>
                {coverEls.length > 0
                  ? <PageMiniRender elements={coverEls} w={W} h={H} canvasH={canvasH} />
                  : <div style={{ position: 'absolute', inset: 0, background: '#2a1f15' }} />
                }
                {/* Gloss highlight */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(118deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 30%, transparent 55%, rgba(0,0,0,0.06) 100%)',
                }} />
                {/* Spine-side shadow */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: 22, pointerEvents: 'none',
                  background: 'linear-gradient(to right, rgba(0,0,0,0.42), rgba(0,0,0,0.10) 60%, transparent)',
                }} />
                {/* Brand watermark */}
                <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: Math.max(8, W * 0.042),
                    letterSpacing: '0.10em', color: 'rgba(255,255,255,0.18)' }}>përgjithmonë</span>
                </div>
              </div>

              {/* ── BACK COVER ── rotateY(180deg) then translateZ(D) in local space = z=-D in world */}
              <div style={{
                position: 'absolute', inset: 0,
                transform: `rotateY(180deg) translateZ(${D}px)`,
                borderRadius: '4px 1px 1px 4px',
                overflow: 'hidden',
                backfaceVisibility: 'hidden',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
              }}>
                {backEls.length > 0
                  ? <PageMiniRender elements={backEls} w={W} h={H} canvasH={canvasH} />
                  : <div style={{ position: 'absolute', inset: 0, background: spineColor,
                      backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,0.04) 0%, transparent 50%, rgba(0,0,0,0.18) 100%)' }} />
                }
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(to left, rgba(255,255,255,0.07) 0%, transparent 35%, rgba(0,0,0,0.10) 100%)',
                }} />
              </div>

              {/* ── SPINE (left face) ── pivot at left edge, rotateY(90deg) → face extends z=[0,−D] at x=0 */}
              <div style={{
                position: 'absolute',
                left: 0, top: 0, width: D, height: H,
                transformOrigin: 'left center',
                transform: 'rotateY(90deg)',
                overflow: 'hidden',
              }}>
                <SpineFace title={title} D={D} H={H} bgColor={spineColor} />
              </div>

              {/* ── PAGES EDGE (right face) ── pivot at left edge (x=W), same rotation */}
              <div style={{
                position: 'absolute',
                left: W, top: 0, width: D, height: H,
                transformOrigin: 'left center',
                transform: 'rotateY(90deg)',
                overflow: 'hidden',
              }}>
                <PagesEdgeFace W={D} H={H} D={D} pageCount={project?.pageCount || 30} />
              </div>

              {/* ── TOP EDGE ── */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, width: W, height: D,
                transformOrigin: 'top center',
                transform: 'rotateX(-90deg)',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: '#F8F6F2' }}>
                  <div style={{ position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.08) 100%)' }} />
                  <div style={{ position: 'absolute', inset: 0,
                    background: 'linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.14) 100%)' }} />
                </div>
              </div>

              {/* ── BOTTOM EDGE ── */}
              <div style={{
                position: 'absolute',
                top: H, left: 0, width: W, height: D,
                transformOrigin: 'top center',
                transform: 'rotateX(-90deg)',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: '#F0EEE8' }}>
                  <div style={{ position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(255,255,255,0.04) 100%)' }} />
                  <div style={{ position: 'absolute', inset: 0,
                    background: 'linear-gradient(to right, rgba(0,0,0,0.16) 0%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.12) 100%)' }} />
                </div>
              </div>

            </div>{/* /book wrapper */}

          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="relative z-10 flex-shrink-0 pb-6 px-6 flex items-center justify-center">
        {!browseMode && (
          <p style={{ color: ink.faintest, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            {lang === 'sq'
              ? <>{pageCount} faqe &nbsp;·&nbsp; {spreads.filter(s => !s.isSolo).length} fletë</>
              : <>{pageCount} pages &nbsp;·&nbsp; {spreads.filter(s => !s.isSolo).length} spreads</>}
          </p>
        )}
      </div>
    </div>
  );
}
