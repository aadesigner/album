import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import { ensureEditorFonts } from '@/lib/editorFonts';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOMeta } from '@/components/SEOMeta';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, ArrowRight, BookOpen, Layers, Package, PenLine, Sparkles, Truck } from 'lucide-react';
import {
  PhotoRiver, OpenAlbumSpread, PhoneVsAlbum, PageMosaic, SpreadRiver,
  DarkAtmosphere, PolaroidField, FilmMarquee, usePrefersReducedMotion,
  LIFE_PHOTOS, type MosaicSlot,
} from '@/components/marketing/PhotoStages';
import { usePageFields } from '@/components/marketing/PageContent';
import { LivePageRoot } from '@/components/marketing/LivePageRoot';
import { Editable, EditableSection } from '@/components/marketing/Editable';
import { usePageEditorOptional } from '@/components/marketing/PageEditorContext';

// ─── Design constants ─────────────────────────────────────────────────────────
const DW = 600;
const DH = 800;

// ─── Demo element type ────────────────────────────────────────────────────────
type DE = {
  id: string;
  type: 'background' | 'image' | 'text';
  x: number; y: number; w: number; h: number;
  bgColor?: string;
  src?: string;
  text?: string; fontSize?: number; fontFamily?: string;
  fill?: string; align?: 'left' | 'center' | 'right';
  fontStyle?: string;
};

// ─── Demo page content ────────────────────────────────────────────────────────
// 8 page IDs: 1=cover, 2-7=inner pages, 8=back
const DEMO: Record<number, DE[]> = {
  // Cover — full-bleed wedding, elegant title (keeps dark dramatic look)
  1: [
    { id:'bg', type:'background', x:0,y:0,w:DW,h:DH, bgColor:'#1a1209' },
    { id:'i1', type:'image', x:0,y:0,w:DW,h:DH,
      src:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=82&fit=crop&crop=center' },
    { id:'t1', type:'text', x:40,y:630,w:520,h:55,
      text:'Ana & Erjon', fill:'rgba(255,255,255,0.95)',
      fontFamily:'Georgia, serif', fontSize:32, align:'center', fontStyle:'italic' },
    { id:'t2', type:'text', x:40,y:688,w:520,h:28,
      text:'12 Qershor 2023  ·  Sarandë', fill:'rgba(255,255,255,0.48)',
      fontFamily:'Georgia, serif', fontSize:12, align:'center' },
  ],

  // Spread 1 — left: top photo + 2 bottom photos · white background
  2: [
    { id:'bg', type:'background', x:0,y:0,w:DW,h:DH, bgColor:'#ffffff' },
    { id:'i1', type:'image', x:24,y:24,w:552,h:422,
      src:'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=900&q=82&fit=crop&crop=center' },
    { id:'i2', type:'image', x:24,y:460,w:264,h:316,
      src:'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=82&fit=crop' },
    { id:'i3', type:'image', x:312,y:460,w:264,h:316,
      src:'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&q=82&fit=crop&crop=top' },
  ],

  // Spread 1 — right: full-bleed couple portrait with white margin
  3: [
    { id:'bg', type:'background', x:0,y:0,w:DW,h:DH, bgColor:'#ffffff' },
    { id:'i1', type:'image', x:24,y:24,w:552,h:752,
      src:'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=900&q=82&fit=crop&crop=center' },
  ],

  // Spread 2 — left: quote page · clean white
  4: [
    { id:'bg', type:'background', x:0,y:0,w:DW,h:DH, bgColor:'#ffffff' },
    { id:'rule1', type:'text', x:200,y:260,w:200,h:20,
      text:'────────────', fill:'rgba(0,0,0,0.13)',
      fontFamily:'Georgia, serif', fontSize:11, align:'center' },
    { id:'t1', type:'text', x:70,y:300,w:460,h:160,
      text:'"Çdo foto është një moment\nqë kohës ia kemi shpëtuar"',
      fill:'#111111', fontFamily:'Georgia, serif', fontSize:22,
      align:'center', fontStyle:'italic' },
    { id:'t2', type:'text', x:70,y:510,w:460,h:30,
      text:'— Ana & Erjon', fill:'#aaaaaa',
      fontFamily:'Georgia, serif', fontSize:13, align:'center' },
    { id:'rule2', type:'text', x:200,y:560,w:200,h:20,
      text:'────────────', fill:'rgba(0,0,0,0.13)',
      fontFamily:'Georgia, serif', fontSize:11, align:'center' },
  ],

  // Spread 2 — right: 2 photos stacked · white background
  5: [
    { id:'bg', type:'background', x:0,y:0,w:DW,h:DH, bgColor:'#ffffff' },
    { id:'i1', type:'image', x:24,y:24,w:552,h:372,
      src:'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=900&q=82&fit=crop' },
    { id:'i2', type:'image', x:24,y:408,w:552,h:368,
      src:'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=900&q=82&fit=crop' },
  ],

  // Spread 3 — left: full-bleed landscape (dramatic, keeps dark)
  6: [
    { id:'bg', type:'background', x:0,y:0,w:DW,h:DH, bgColor:'#1a1a1a' },
    { id:'i1', type:'image', x:0,y:0,w:DW,h:DH,
      src:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=82&fit=crop&crop=center' },
    { id:'t1', type:'text', x:30,y:680,w:540,h:34,
      text:'Ana & Erjon · Sarandë', fill:'rgba(255,255,255,0.55)',
      fontFamily:'Georgia, serif', fontSize:12, align:'center' },
  ],

  // Spread 3 — right: 4-grid of photos · white background
  7: [
    { id:'bg', type:'background', x:0,y:0,w:DW,h:DH, bgColor:'#ffffff' },
    { id:'i1', type:'image', x:18,y:18,w:274,h:378,
      src:'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&q=80&fit=crop' },
    { id:'i2', type:'image', x:308,y:18,w:274,h:378,
      src:'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=600&q=80&fit=crop' },
    { id:'i3', type:'image', x:18,y:410,w:274,h:372,
      src:'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80&fit=crop' },
    { id:'i4', type:'image', x:308,y:410,w:274,h:372,
      src:'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=80&fit=crop&crop=center' },
  ],

  // Back cover — dark & elegant, echoes the front cover instead of plain white
  8: [
    { id:'bg', type:'background', x:0,y:0,w:DW,h:DH, bgColor:'#1a1209' },
    { id:'rule1', type:'text', x:220,y:328,w:160,h:20,
      text:'────────', fill:'rgba(255,255,255,0.22)',
      fontFamily:'Georgia, serif', fontSize:11, align:'center' },
    { id:'monogram', type:'text', x:100,y:352,w:400,h:70,
      text:'A & E', fill:'rgba(255,255,255,0.85)',
      fontFamily:'Georgia, serif', fontSize:42, align:'center', fontStyle:'italic' },
    { id:'rule2', type:'text', x:220,y:438,w:160,h:20,
      text:'────────', fill:'rgba(255,255,255,0.22)',
      fontFamily:'Georgia, serif', fontSize:11, align:'center' },
    { id:'date', type:'text', x:40,y:468,w:520,h:26,
      text:'12 Qershor 2023  ·  Sarandë', fill:'rgba(255,255,255,0.32)',
      fontFamily:'Georgia, serif', fontSize:11, align:'center' },
    { id:'brand', type:'text', x:0,y:700,w:DW,h:36,
      text:'përgjithmonë', fill:'rgba(255,255,255,0.28)',
      fontFamily:'Georgia, serif', fontSize:15, align:'center', fontStyle:'italic' },
  ],
};

// ─── Demo spread definitions ──────────────────────────────────────────────────
const DemoPagesContext = createContext<Record<number, DE[]>>(DEMO);

function overlayDemo(p: ReturnType<typeof usePageFields>): Record<number, DE[]> {
  const clone = JSON.parse(JSON.stringify(DEMO)) as Record<number, DE[]>;
  const setImg = (page: number, id: string, path: string) => {
    const el = clone[page]?.find((e) => e.id === id);
    if (el && el.type === 'image') el.src = p.img(path, el.src || '');
  };
  const setText = (page: number, id: string, path: string) => {
    const el = clone[page]?.find((e) => e.id === id);
    if (el && el.type === 'text') el.text = p.txt(path) || el.text;
  };
  setImg(1, 'i1', 'photos.cover');
  setText(1, 't1', 'demo.coverTitle');
  setText(1, 't2', 'demo.coverSub');
  setImg(2, 'i1', 'photos.p2a');
  setImg(2, 'i2', 'photos.p2b');
  setImg(2, 'i3', 'photos.p2c');
  setImg(3, 'i1', 'photos.p3');
  setText(4, 't1', 'demo.quote');
  setText(4, 't2', 'demo.quoteBy');
  setImg(5, 'i1', 'photos.p5a');
  setImg(5, 'i2', 'photos.p5b');
  setImg(6, 'i1', 'photos.p6');
  setImg(7, 'i1', 'photos.p7');
  return clone;
}

function useDemoPages() {
  return useContext(DemoPagesContext);
}

const DEMO_SPREADS = [
  { id: 'cover',      isSolo: true,  left: null,            right: { dbId: 1, role: 'cover'      } },
  { id: 'sp1',        isSolo: false, left: { dbId: 2 },     right: { dbId: 3 }                    },
  { id: 'sp2',        isSolo: false, left: { dbId: 4 },     right: { dbId: 5 }                    },
  { id: 'sp3',        isSolo: false, left: { dbId: 6 },     right: { dbId: 7 }                    },
  { id: 'back-cover', isSolo: true,  left: { dbId: 8, role: 'back-cover' }, right: null           },
];

// ─── Mini page renderer ────────────────────────────────────────────────────────
function MiniPage({ elements, w, h }: { elements: DE[]; w: number; h: number }) {
  const sx = w / DW, sy = h / DH;
  const bg = elements.find(e => e.type === 'background');
  const imgs = elements.filter(e => e.type === 'image');
  const txts = elements.filter(e => e.type === 'text');

  const bgStyle = bg?.bgColor || '#F2EDE5';

  return (
    <div style={{ position: 'absolute', inset: 0, background: bgStyle, overflow: 'hidden' }}>
      {imgs.map((el, i) => (
        <img key={i} src={el.src} draggable={false} alt=""
          style={{
            position: 'absolute',
            left: el.x * sx, top: el.y * sy,
            width: el.w * sx, height: el.h * sy,
            objectFit: 'cover',
          }}
        />
      ))}
      {txts.map((el, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: el.x * sx, top: el.y * sy,
          width: el.w * sx,
          fontSize: (el.fontSize || 16) * sy,
          fontFamily: el.fontFamily || 'Georgia, serif',
          fontStyle: el.fontStyle?.includes('italic') ? 'italic' : 'normal',
          color: el.fill || '#333',
          textAlign: el.align || 'center',
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          padding: `0 ${4 * sx}px`,
        }}>{el.text}</div>
      ))}
    </div>
  );
}

// ─── Spine face ───────────────────────────────────────────────────────────────
function DemoSpine({ D, H, bgColor }: { D: number; H: number; bgColor: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: bgColor, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.04) 40%, rgba(0,0,0,0.12) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: 'rotate(90deg)', whiteSpace: 'nowrap',
          fontSize: Math.max(5, Math.min(8, D * 0.55)),
          fontFamily: 'Georgia, serif', fontStyle: 'italic',
          color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em',
          maxWidth: H * 0.7, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Ana & Erjon · 2023
        </div>
      </div>
    </div>
  );
}

// ─── Pages edge — slim block, few leaf lines (not a thick magazine stack) ─────
function DemoPagesEdge() {
  const leaves = 5;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f4f0e8', overflow: 'hidden' }}>
      {Array.from({ length: leaves }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0,
          top: `${((i + 0.5) / leaves) * 100}%`, height: 1,
          background: i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.03)',
        }} />
      ))}
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.12) 0%, transparent 55%, rgba(0,0,0,0.06) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 14%, transparent 86%, rgba(0,0,0,0.06) 100%)' }} />
    </div>
  );
}

// ─── 3D Book demo ─────────────────────────────────────────────────────────────
function DemoBook3D({ lang, size = 260 }: { lang: 'sq' | 'en'; size?: number }) {
  const [rotY, setRotY] = useState(-14);
  const rotYRef = useRef(-14);
  const rotXRef = useRef(3);
  const animRef = useRef<number>(0);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pages = useDemoPages();
  const p = usePageFields();

  const W = size, H = Math.round(size * (DH / DW)), D = 6;
  const coverBgColor = (pages[1].find(e => e.type === 'background') as any)?.bgColor ?? '#1a1209';

  useEffect(() => {
    const tick = () => {
      if (!isDragging.current) {
        rotYRef.current += 0.20;
        setRotY(rotYRef.current);
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animRef.current);
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
    };
  }, []);

  const pauseAuto = useCallback(() => {
    isDragging.current = true;
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => { isDragging.current = false; }, 3000);
  }, []);

  const coverEls = pages[1];

  return (
    <div
      style={{ perspective: '1800px', perspectiveOrigin: '50% 48%',
        height: H + 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', cursor: 'grab', userSelect: 'none', width: '100%' }}
      onMouseMove={e => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        rotYRef.current += dx * 0.5;
        setRotY(rotYRef.current);
        lastPos.current = { x: e.clientX, y: e.clientY };
      }}
      onMouseDown={e => { isDragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; pauseAuto(); }}
      onMouseUp={() => pauseAuto()}
      onMouseLeave={() => { isDragging.current = false; }}
      onTouchStart={e => { isDragging.current = true; lastPos.current = { x: e.touches[0].clientX, y: 0 }; pauseAuto(); }}
      onTouchMove={e => {
        const dx = e.touches[0].clientX - lastPos.current.x;
        rotYRef.current += dx * 0.5;
        setRotY(rotYRef.current);
        lastPos.current = { x: e.touches[0].clientX, y: 0 };
      }}
      onTouchEnd={() => pauseAuto()}
    >
      {/* Book */}
      <div style={{ position: 'relative', width: W, height: H,
        transformStyle: 'preserve-3d',
        transform: `rotateX(${rotXRef.current}deg) rotateY(${rotY}deg)`,
        transition: isDragging.current ? 'none' : undefined }}>

        {/* Front cover */}
        <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(0px)',
          borderRadius: '1px 4px 4px 1px', overflow: 'hidden',
          backfaceVisibility: 'hidden', boxShadow: '0 18px 40px rgba(42,34,24,0.12)' }}>
          <MiniPage elements={coverEls} w={W} h={H} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(118deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 30%, transparent 55%)' }} />
          <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 10,
              letterSpacing: '0.10em', color: 'rgba(255,255,255,0.18)' }}>përgjithmonë</span>
          </div>
        </div>

        {/* Back cover */}
        <div style={{ position: 'absolute', inset: 0,
          transform: `rotateY(180deg) translateZ(${D}px)`,
          borderRadius: '4px 1px 1px 4px', overflow: 'hidden',
          backfaceVisibility: 'hidden' }}>
          <MiniPage elements={pages[8]} w={W} h={H} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(118deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.06) 100%)' }} />
        </div>

        {/* Spine (left) */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: D, height: H,
          transformOrigin: 'left center', transform: 'rotateY(90deg)', overflow: 'hidden' }}>
          <DemoSpine D={D} H={H} bgColor={coverBgColor} />
        </div>

        {/* Pages edge (right) */}
        <div style={{ position: 'absolute', left: W, top: 0, width: D, height: H,
          transformOrigin: 'left center', transform: 'rotateY(90deg)', overflow: 'hidden' }}>
          <DemoPagesEdge />
        </div>

        {/* Top edge */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: D,
          transformOrigin: 'top center', transform: 'rotateX(-90deg)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: '#faf8f4' }}>
            <div style={{ position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.08) 0%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.06) 100%)' }} />
          </div>
        </div>

        {/* Bottom edge */}
        <div style={{ position: 'absolute', top: H, left: 0, width: W, height: D,
          transformOrigin: 'top center', transform: 'rotateX(-90deg)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: '#f2efe8' }}>
            <div style={{ position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.07) 0%, rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.05) 100%)' }} />
          </div>
        </div>
      </div>

      {/* Drag hint */}
      <p style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center',
        fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'rgba(0,0,0,0.22)', pointerEvents: 'none' }}>
        <Editable path="demo.rotate">{p.txt('demo.rotate')}</Editable>
      </p>
    </div>
  );
}

// ─── Spread browser for demo ──────────────────────────────────────────────────
type BrowseEntry =
  | { kind: 'cover'; pageId: number; label: { sq: string; en: string } }
  | { kind: 'spread'; leftId: number | null; rightId: number | null; label: { sq: string; en: string } }
  | { kind: 'back'; pageId: number; label: { sq: string; en: string } };

const BROWSE_ENTRIES: BrowseEntry[] = [
  { kind: 'cover',  pageId: 1, label: { sq: 'Kopertina', en: 'Front Cover' } },
  { kind: 'spread', leftId: 2, rightId: 3, label: { sq: 'Dasma', en: 'The Wedding' } },
  { kind: 'spread', leftId: 4, rightId: 5, label: { sq: 'Kujtime', en: 'Memories' } },
  { kind: 'spread', leftId: 6, rightId: 7, label: { sq: 'Udhëtimi', en: 'The Journey' } },
  { kind: 'back',   pageId: 8, label: { sq: 'Kopertina e pasme', en: 'Back Cover' } },
];

function SpreadBrowserDemo({ lang }: { lang: 'sq' | 'en' }) {
  const pages = useDemoPages();
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const entry = BROWSE_ENTRIES[idx];
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const idxRef = useRef(idx);
  idxRef.current = idx;

  // Responsive page size
  const containerRef = useRef<HTMLDivElement>(null);
  const [pgW, setPgW] = useState(160);
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const avail = containerRef.current.clientWidth - 100;
      setPgW(Math.max(100, Math.min(220, Math.floor(avail / 2))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  const pgH = Math.round(pgW * (DH / DW));

  const go = useCallback((d: number) => {
    const next = idxRef.current + d;
    if (next < 0 || next >= BROWSE_ENTRIES.length) return;
    setDir(d); setIdx(next);
  }, []);

  const renderEntry = (e: BrowseEntry) => {
    if (e.kind === 'cover') {
      return (
        <div style={{ width: pgW, height: pgH, position: 'relative', flexShrink: 0,
          borderRadius: 4, overflow: 'hidden',
          boxShadow: '0 14px 32px rgba(42,34,24,0.12)' }}>
          <MiniPage elements={pages[e.pageId]} w={pgW} h={pgH} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(118deg, rgba(255,255,255,0.08) 0%, transparent 42%)' }} />
        </div>
      );
    }
    if (e.kind === 'back') {
      return (
        <div style={{ width: pgW, height: pgH, position: 'relative', flexShrink: 0,
          borderRadius: 4, overflow: 'hidden',
          boxShadow: '0 14px 32px rgba(42,34,24,0.12)' }}>
          <MiniPage elements={pages[e.pageId]} w={pgW} h={pgH} />
        </div>
      );
    }
    // spread
    return (
      <div style={{ display: 'flex', alignItems: 'stretch',
        boxShadow: '0 14px 32px rgba(42,34,24,0.12)' }}>
        <div style={{ width: pgW, height: pgH, position: 'relative', flexShrink: 0,
          borderRadius: '4px 0 0 4px', overflow: 'hidden' }}>
          {e.leftId ? <MiniPage elements={pages[e.leftId]} w={pgW} h={pgH} /> :
            <div style={{ position: 'absolute', inset: 0, background: '#F2EDE5' }} />}
        </div>
        <div style={{ width: 2, flexShrink: 0, background: 'rgba(0,0,0,0.14)' }} />
        <div style={{ width: pgW, height: pgH, position: 'relative', flexShrink: 0,
          borderRadius: '0 4px 4px 0', overflow: 'hidden' }}>
          {e.rightId ? <MiniPage elements={pages[e.rightId]} w={pgW} h={pgH} /> :
            <div style={{ position: 'absolute', inset: 0, background: '#F2EDE5' }} />}
        </div>
      </div>
    );
  };

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
    background: disabled ? 'transparent' : 'rgba(0,0,0,0.06)',
    color: disabled ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer', transition: 'all 0.15s',
    outline: disabled ? 'none' : '1px solid rgba(0,0,0,0.10)',
  });

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Label */}
      <p style={{ color: 'rgba(0,0,0,0.32)', fontSize: 10,
        letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'Georgia, serif' }}>
        {entry.label[lang]}
      </p>

      {/* Pages + arrows — swipe left/right on the page area (mobile) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'center' }}>
        <button style={btnStyle(idx === 0)} onClick={() => go(-1)} disabled={idx === 0}>
          <ChevronLeft size={16} />
        </button>

        <div
          style={{ position: 'relative', overflow: 'visible', touchAction: 'pan-y', maxWidth: '100%', perspective: 1400 }}
          onTouchStart={(e) => {
            swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
          }}
          onTouchEnd={(e) => {
            if (!swipeRef.current) return;
            const dx = e.changedTouches[0].clientX - swipeRef.current.x;
            const dy = e.changedTouches[0].clientY - swipeRef.current.y;
            const dt = Math.max(1, Date.now() - swipeRef.current.t);
            swipeRef.current = null;
            if (Math.abs(dx) <= Math.abs(dy) * 1.1) return;
            const vel = Math.abs(dx) / dt;
            if (Math.abs(dx) < 36 && vel < 0.3) return;
            if (dx < 0) go(1);
            else go(-1);
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={idx}
              initial={{ opacity: 0, rotateY: dir * 55, scale: 0.96 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, rotateY: -dir * 40, scale: 0.98 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (info.offset.x < -48 || info.velocity.x < -280) go(1);
                else if (info.offset.x > 48 || info.velocity.x > 280) go(-1);
              }}
              style={{ cursor: 'grab', touchAction: 'pan-y', transformStyle: 'preserve-3d' }}
            >
              {renderEntry(entry)}
            </motion.div>
          </AnimatePresence>
        </div>

        <button style={btnStyle(idx >= BROWSE_ENTRIES.length - 1)} onClick={() => go(1)} disabled={idx >= BROWSE_ENTRIES.length - 1}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {BROWSE_ENTRIES.map((_, i) => (
          <button key={i} onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }} style={{
            width: i === idx ? 18 : 5, height: 5, borderRadius: 3,
            border: 'none', padding: 0, cursor: 'pointer',
            background: i === idx ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.14)',
            transition: 'all 0.2s',
          }} />
        ))}
      </div>
    </div>
  );
}

const OCCASION_META = [
  { slug: 'dasme', spine: '#8B6F47' },
  { slug: 'udhetime', spine: '#C47A30' },
  { slug: 'familje', spine: '#5C7A5A' },
  { slug: 'miqesi', spine: '#5A6B7A' },
  { slug: 'festash', spine: '#8B5A5A' },
] as const;

const CRAFT_ICONS = [Layers, BookOpen, Package, Truck];

function OccasionCard({ index }: { index: number }) {
  const p = usePageFields();
  const meta = OCCASION_META[index] ?? OCCASION_META[0];
  const href = `/krijo?category=${encodeURIComponent(meta.slug)}`;
  return (
    <Link href={href} className="group block h-full">
      <motion.article
        whileHover={{ y: -8, rotateX: 2, rotateY: -3 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{ transformStyle: 'preserve-3d', perspective: 900 }}
        className="h-full flex flex-col bg-white overflow-hidden rounded-[1.35rem] border border-neutral-100 shadow-[0_10px_32px_rgba(40,32,24,0.07)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          <Editable path={`occasions.items.${index}.photo`} kind="image" as="div" className="absolute inset-0">
            <img
              src={p.img(`occasions.items.${index}.photo`)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          </Editable>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute top-0 left-0 bottom-0 w-[5px]" style={{ background: meta.spine }} />
          <p className="absolute top-4 left-6 text-[10px] uppercase tracking-[0.2em] text-white/80">
            <Editable path={`occasions.items.${index}.category`}>{p.txt(`occasions.items.${index}.category`)}</Editable>
          </p>
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="font-serif text-[22px] leading-tight text-white font-medium">
              <Editable path={`occasions.items.${index}.title`}>{p.txt(`occasions.items.${index}.title`)}</Editable>
            </h3>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5 pt-4">
          <p className="text-[13px] leading-relaxed text-neutral-500 mb-4">
            <Editable path={`occasions.items.${index}.line`}>{p.txt(`occasions.items.${index}.line`)}</Editable>
          </p>
          <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] font-semibold text-neutral-800">
            <Editable path="occasions.cta">{p.txt('occasions.cta')}</Editable>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </motion.article>
    </Link>
  );
}

export default function Examples() {
  return (
    <LivePageRoot slug="examples">
      <ExamplesView />
    </LivePageRoot>
  );
}

const EXAMPLES_MOSAIC: MosaicSlot[] = [
  { src: LIFE_PHOTOS[0], label: { sq: 'Kopertina', en: 'Cover' }, className: 'col-span-2 row-span-2' },
  { src: LIFE_PHOTOS[12], label: { sq: 'Dasma', en: 'Wedding' }, className: '' },
  { src: LIFE_PHOTOS[6], label: { sq: 'Jugu', en: 'South' }, className: '' },
  { src: LIFE_PHOTOS[7], label: { sq: 'Familja', en: 'Family' }, className: '' },
  { src: LIFE_PHOTOS[1], label: { sq: 'Vallëzimi', en: 'Dance' }, className: '' },
  { src: LIFE_PHOTOS[15], label: { sq: 'Mbrapa', en: 'Back' }, className: '' },
];

function ExamplesView() {
  const { lang } = useLanguage();
  const p = usePageFields();
  const pages = useMemo(() => overlayDemo(p), [p]);
  const editor = usePageEditorOptional();
  const reduced = usePrefersReducedMotion();
  useEffect(() => { void ensureEditorFonts(); }, []);
  const photoKeys = ['cover', 'p2a', 'p2b', 'p2c', 'p3', 'p5a', 'p5b', 'p6', 'p7', 'back'] as const;
  const occasionCount = Math.max(p.list('occasions.items').length, OCCASION_META.length);

  return (
    <DemoPagesContext.Provider value={pages}>
    <MarketingLayout>
      <SEOMeta
        title={p.txtAll('seo.title')}
        description={p.txtAll('seo.description')}
        path="/shembuj"
      />
      <div className="bg-[#f7f4f0]">

        <EditableSection path="hero" className="relative overflow-hidden text-[#f3eee7]" style={{ background: '#1a1410' }}>
          <DarkAtmosphere photo={LIFE_PHOTOS[0]} reduced={reduced} />
          {!reduced && (
            <div
              aria-hidden
              className="ai-develop-sweep pointer-events-none absolute inset-y-[8%] left-0 w-[38%] z-[2]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,244,220,0.18), transparent)' }}
            />
          )}
          <PolaroidField reduced={reduced} />
          <div className="relative z-10 max-w-3xl mx-auto px-5 pt-16 pb-12 sm:pt-20 md:pt-24 md:pb-16 text-center">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.38em] text-white/40 mb-6">
              <Editable path="hero.kicker">{p.txt('hero.kicker')}</Editable>
            </p>
            <h1 className="font-serif text-[clamp(2.15rem,6.4vw,4.1rem)] font-medium leading-[1.08] mb-5">
              <Editable path="hero.title">{p.txt('hero.title')}</Editable>
            </h1>
            <p className="text-white/55 text-[15px] md:text-[16px] leading-relaxed max-w-lg mx-auto mb-8">
              <Editable path="hero.body">{p.txt('hero.body')}</Editable>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <a
                href="#albumi-demo"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[13px] font-semibold bg-white text-[#110e0c] hover:bg-[#f3eee7] transition-colors"
              >
                <Editable path="hero.cta">{p.txt('hero.cta')}</Editable>
              </a>
              <Link href="/krijo">
                <span className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[13px] font-semibold border border-white/20 text-white/80 hover:bg-white/5 transition-colors">
                  <Editable path="hero.secondaryCta">{p.txt('hero.secondaryCta')}</Editable>
                  <ArrowRight size={14} />
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-px max-w-lg mx-auto bg-white/10 overflow-hidden rounded-sm">
              {p.list('stats').map((_, i) => (
                <div key={i} className="bg-white/[0.04] px-3 py-4">
                  <p className="font-serif text-lg md:text-xl text-[#f3eee7]">
                    <Editable path={`stats.${i}.value`}>{p.txt(`stats.${i}.value`)}</Editable>
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/35 mt-1 leading-snug">
                    <Editable path={`stats.${i}.label`}>{p.txt(`stats.${i}.label`)}</Editable>
                  </p>
                </div>
              ))}
            </div>
          </div>
          <FilmMarquee />
        </EditableSection>

        <PhotoRiver />

        <div id="albumi-demo">
        <EditableSection path="demo" className="relative border-b border-neutral-200/70">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 70% 50% at 28% 40%, rgba(255,255,255,0.75) 0%, transparent 70%)' }}
          />
          <div className="relative max-w-6xl mx-auto px-5 py-14 md:py-20">
            <div className="text-center mb-10 md:mb-12">
              <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                <Editable path="demo.byline">{p.txt('demo.byline')}</Editable>
              </p>
              <p className="text-[13px] text-neutral-500">
                <Editable path="demo.caption">{p.txt('demo.caption')}</Editable>
              </p>
            </div>

            <div className="flex justify-center mb-10 md:mb-14">
              <Editable path="photos.cover" kind="image" as="div">
                <DemoBook3D lang={lang} size={280} />
              </Editable>
            </div>

            <div className="w-full max-w-3xl mx-auto">
              <p className="text-center mb-6 text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                <Editable path="demo.browse">{p.txt('demo.browse')}</Editable>
              </p>
              <SpreadBrowserDemo lang={lang} />
            </div>

            {editor && (
              <div className="flex flex-wrap justify-center gap-2 mt-8">
                {photoKeys.map((key) => (
                  <Editable key={key} path={`photos.${key}`} kind="image" as="div" className="w-12 h-12 overflow-hidden rounded">
                    <img src={p.img(`photos.${key}`)} alt="" className="w-full h-full object-cover" />
                  </Editable>
                ))}
              </div>
            )}

            <div className="flex justify-center mt-10 md:mt-12">
              <Link href="/krijo?category=dasme&design=cream-names">
                <button
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[13px] font-semibold text-white transition-transform active:scale-[0.97]"
                  style={{ background: '#2A2218' }}
                >
                  <Editable path="demo.cta">{p.txt('demo.cta')}</Editable>
                  <ArrowRight size={14} />
                </button>
              </Link>
            </div>
          </div>
        </EditableSection>
        </div>

        <EditableSection path="spread">
          <OpenAlbumSpread
            lang={lang}
            kicker={<Editable path="spread.kicker">{p.txt('spread.kicker')}</Editable>}
            title={<Editable path="spread.title">{p.txt('spread.title')}</Editable>}
          />
        </EditableSection>

        <EditableSection path="life">
          <PhoneVsAlbum
            kicker={<Editable path="life.kicker">{p.txt('life.kicker')}</Editable>}
            title={<Editable path="life.title">{p.txt('life.title')}</Editable>}
            body={<Editable path="life.body">{p.txt('life.body')}</Editable>}
            pileLabel={p.txt('life.pile')}
            albumLabel={p.txt('life.album')}
          />
        </EditableSection>

        <EditableSection path="gallery">
          <PageMosaic
            lang={lang}
            kicker={<Editable path="gallery.kicker">{p.txt('gallery.kicker')}</Editable>}
            title={<Editable path="gallery.title">{p.txt('gallery.title')}</Editable>}
            body={<Editable path="gallery.note">{p.txt('gallery.note')}</Editable>}
            slots={EXAMPLES_MOSAIC}
            cta={
              <Link href="/krijo" className="inline-flex items-center gap-2 text-[13px] font-semibold" style={{ color: '#2A2218' }}>
                <Editable path="gallery.link">{p.txt('gallery.link')}</Editable>
                <ArrowRight size={14} />
              </Link>
            }
          />
        </EditableSection>

        <EditableSection path="occasions" className="bg-white py-16 md:py-24 border-b border-neutral-100">
          <div className="max-w-6xl mx-auto px-5">
            <div className="max-w-xl mb-10 md:mb-14">
              <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                <Editable path="occasions.kicker">{p.txt('occasions.kicker')}</Editable>
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium text-[#2A2218] leading-tight mb-4">
                <Editable path="occasions.title">{p.txt('occasions.title')}</Editable>
              </h2>
              <p className="text-neutral-500 text-[15px] leading-relaxed">
                <Editable path="occasions.body">{p.txt('occasions.body')}</Editable>
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {Array.from({ length: occasionCount }).map((_, i) => (
                <OccasionCard key={i} index={i} />
              ))}
            </div>
          </div>
        </EditableSection>

        <EditableSection path="craft" className="py-16 md:py-24 border-b border-neutral-200/70">
          <div className="max-w-6xl mx-auto px-5">
            <div className="max-w-xl mb-10 md:mb-14">
              <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                <Editable path="craft.kicker">{p.txt('craft.kicker')}</Editable>
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium text-[#2A2218] leading-tight mb-4">
                <Editable path="craft.title">{p.txt('craft.title')}</Editable>
              </h2>
              <p className="text-neutral-500 text-[15px] leading-relaxed">
                <Editable path="craft.body">{p.txt('craft.body')}</Editable>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {p.list('craft.items').map((_, i) => {
                const Icon = CRAFT_ICONS[i] ?? Layers;
                return (
                  <div key={i} className="rounded-2xl bg-white/80 border border-neutral-100 p-6 md:p-7">
                    <div className="w-10 h-10 rounded-full bg-[#2A2218] text-white flex items-center justify-center mb-4">
                      <Icon size={16} />
                    </div>
                    <h3 className="font-serif text-xl text-[#2A2218] mb-2">
                      <Editable path={`craft.items.${i}.title`}>{p.txt(`craft.items.${i}.title`)}</Editable>
                    </h3>
                    <p className="text-[14px] leading-relaxed text-neutral-500">
                      <Editable path={`craft.items.${i}.desc`}>{p.txt(`craft.items.${i}.desc`)}</Editable>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </EditableSection>

        <EditableSection path="paths" className="bg-white py-16 md:py-24 border-b border-neutral-100">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
              <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                <Editable path="paths.kicker">{p.txt('paths.kicker')}</Editable>
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium text-[#2A2218] leading-tight">
                <Editable path="paths.title">{p.txt('paths.title')}</Editable>
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4 md:gap-5">
              <div className="rounded-[1.5rem] border border-neutral-100 bg-[#f7f4f0] p-7 md:p-9 flex flex-col">
                <div className="w-11 h-11 rounded-full bg-white border border-neutral-200 flex items-center justify-center mb-5">
                  <PenLine size={18} className="text-[#2A2218]" />
                </div>
                <h3 className="font-serif text-2xl text-[#2A2218] mb-3">
                  <Editable path="paths.designTitle">{p.txt('paths.designTitle')}</Editable>
                </h3>
                <p className="text-[14px] leading-relaxed text-neutral-500 mb-8">
                  <Editable path="paths.designBody">{p.txt('paths.designBody')}</Editable>
                </p>
                <Link href="/krijo" className="mt-auto">
                  <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#2A2218]">
                    <Editable path="paths.designCta">{p.txt('paths.designCta')}</Editable>
                    <ArrowRight size={14} />
                  </span>
                </Link>
              </div>
              <div className="rounded-[1.5rem] border border-neutral-800 bg-[#1a1714] p-7 md:p-9 flex flex-col text-white">
                <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mb-5">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-serif text-2xl mb-3">
                  <Editable path="paths.aiTitle">{p.txt('paths.aiTitle')}</Editable>
                </h3>
                <p className="text-[14px] leading-relaxed text-white/60 mb-8">
                  <Editable path="paths.aiBody">{p.txt('paths.aiBody')}</Editable>
                </p>
                <Link href="/album-ai" className="mt-auto">
                  <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-white">
                    <Editable path="paths.aiCta">{p.txt('paths.aiCta')}</Editable>
                    <ArrowRight size={14} />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </EditableSection>

        <EditableSection path="pages">
          <SpreadRiver kicker={<Editable path="pages.kicker">{p.txt('pages.kicker')}</Editable>} />
        </EditableSection>

        <EditableSection path="quotes" className="py-16 md:py-24 border-b border-neutral-200/70">
          <div className="max-w-6xl mx-auto px-5">
            <p className="text-center text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-10 md:mb-14">
              <Editable path="quotes.kicker">{p.txt('quotes.kicker')}</Editable>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {p.list('quotes.items').map((_, i) => (
                <blockquote key={i} className="md:pt-2">
                  <p className="font-serif text-[18px] md:text-[19px] leading-relaxed text-[#2A2218] mb-6">
                    <Editable path={`quotes.items.${i}.text`}>{p.txt(`quotes.items.${i}.text`)}</Editable>
                  </p>
                  <footer>
                    <p className="text-[13px] font-medium text-[#2A2218]">
                      <Editable path={`quotes.items.${i}.name`}>{p.txt(`quotes.items.${i}.name`)}</Editable>
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400 mt-1">
                      <Editable path={`quotes.items.${i}.occasion`}>{p.txt(`quotes.items.${i}.occasion`)}</Editable>
                    </p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </EditableSection>

        <EditableSection path="cta" className="relative overflow-hidden py-20 md:py-28 text-center" style={{ background: '#1a1410' }}>
          <DarkAtmosphere photo={LIFE_PHOTOS[4]} />
          <div className="relative z-10 max-w-lg mx-auto px-5">
            <h2 className="font-serif text-[clamp(1.85rem,3.4vw,2.8rem)] font-medium text-[#f3eee7] mb-4 leading-[1.12]">
              <Editable path="cta.title">{p.txt('cta.title')}</Editable>
            </h2>
            <p className="text-white/50 text-[15px] leading-relaxed mb-8">
              <Editable path="cta.body">{p.txt('cta.body')}</Editable>
            </p>
            <Link href="/krijo">
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#1a1410] rounded-full text-[14px] font-semibold hover:bg-[#f3eee7] transition-colors">
                <Editable path="cta.button">{p.txt('cta.button')}</Editable>
                <ArrowRight size={16} />
              </button>
            </Link>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.18em] mt-5">
              <Editable path="cta.note">{p.txt('cta.note')}</Editable>
            </p>
          </div>
        </EditableSection>

      </div>
    </MarketingLayout>
    </DemoPagesContext.Provider>
  );
}
