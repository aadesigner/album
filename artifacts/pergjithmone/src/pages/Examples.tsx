import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOMeta } from '@/components/SEOMeta';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

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
      {/* Edge shading only */}
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.04) 70%, rgba(0,0,0,0.28) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: 'rotate(90deg)', whiteSpace: 'nowrap',
          fontSize: Math.max(6, Math.min(9, D * 0.38)),
          fontFamily: 'Georgia, serif', fontStyle: 'italic',
          color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em',
          maxWidth: H * 0.7, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Ana & Erjon · 2023
        </div>
      </div>
    </div>
  );
}

// ─── Pages edge ───────────────────────────────────────────────────────────────
function DemoPagesEdge({ H }: { H: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f8f8f8', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.02) 35%, rgba(0,0,0,0.02) 60%, rgba(0,0,0,0.10) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.10) 100%)' }} />
    </div>
  );
}

// ─── 3D Book demo ─────────────────────────────────────────────────────────────
function DemoBook3D({ lang }: { lang: 'sq' | 'en' }) {
  const [rotY, setRotY] = useState(-30);
  const rotYRef = useRef(-30);
  const rotXRef = useRef(13);
  const animRef = useRef<number>(0);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const W = 240, H = Math.round(240 * (DH / DW)), D = 14;
  const coverBgColor = (DEMO[1].find(e => e.type === 'background') as any)?.bgColor ?? '#1a1209';

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

  const coverEls = DEMO[1];

  return (
    <div
      style={{ perspective: '1000px', perspectiveOrigin: '50% 46%',
        height: H + 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', cursor: 'grab', userSelect: 'none' }}
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
      {/* Ground shadow */}
      <div style={{ position: 'absolute', left: '50%', bottom: 16,
        transform: 'translateX(-50%)',
        width: W * 1.1, height: 44,
        background: 'radial-gradient(ellipse, rgba(0,0,0,0.28) 0%, transparent 70%)',
        filter: 'blur(18px)', pointerEvents: 'none' }} />

      {/* Book */}
      <div style={{ position: 'relative', width: W, height: H,
        transformStyle: 'preserve-3d',
        transform: `rotateX(${rotXRef.current}deg) rotateY(${rotY}deg)`,
        transition: isDragging.current ? 'none' : undefined }}>

        {/* Front cover */}
        <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(0px)',
          borderRadius: '1px 4px 4px 1px', overflow: 'hidden',
          backfaceVisibility: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,0.7)' }}>
          <MiniPage elements={coverEls} w={W} h={H} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(118deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 28%, transparent 52%, rgba(0,0,0,0.06) 100%)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 20, pointerEvents: 'none',
            background: 'linear-gradient(to right, rgba(0,0,0,0.40), rgba(0,0,0,0.08) 55%, transparent)' }} />
          {/* Brand watermark */}
          <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 10,
              letterSpacing: '0.10em', color: 'rgba(255,255,255,0.18)' }}>përgjithmonë</span>
          </div>
        </div>

        {/* Back cover */}
        <div style={{ position: 'absolute', inset: 0,
          transform: `rotateY(180deg) translateZ(${D}px)`,
          borderRadius: '4px 1px 1px 4px', overflow: 'hidden',
          backfaceVisibility: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,0.5)' }}>
          <MiniPage elements={DEMO[8]} w={W} h={H} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(118deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 28%, transparent 52%, rgba(0,0,0,0.10) 100%)' }} />
        </div>

        {/* Spine (left) */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: D, height: H,
          transformOrigin: 'left center', transform: 'rotateY(90deg)', overflow: 'hidden' }}>
          <DemoSpine D={D} H={H} bgColor={coverBgColor} />
        </div>

        {/* Pages edge (right) */}
        <div style={{ position: 'absolute', left: W, top: 0, width: D, height: H,
          transformOrigin: 'left center', transform: 'rotateY(90deg)', overflow: 'hidden' }}>
          <DemoPagesEdge H={H} />
        </div>

        {/* Top edge */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: D,
          transformOrigin: 'top center', transform: 'rotateX(-90deg)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: '#ffffff' }}>
            <div style={{ position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.30) 0%, rgba(0,0,0,0.06) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.14) 0%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.10) 100%)' }} />
          </div>
        </div>

        {/* Bottom edge */}
        <div style={{ position: 'absolute', top: H, left: 0, width: W, height: D,
          transformOrigin: 'top center', transform: 'rotateX(-90deg)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: '#f5f5f5' }}>
            <div style={{ position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(255,255,255,0.06) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.12) 0%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.08) 100%)' }} />
          </div>
        </div>
      </div>

      {/* Drag hint */}
      <p style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center',
        fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'rgba(0,0,0,0.22)', pointerEvents: 'none' }}>
        {lang === 'sq' ? 'tërhiqni për të rrotulluar' : 'drag to rotate'}
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
          filter: 'drop-shadow(0 18px 44px rgba(0,0,0,0.65))' }}>
          <MiniPage elements={DEMO[e.pageId]} w={pgW} h={pgH} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to right, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.06) 12%, transparent 26%)' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(118deg, rgba(255,255,255,0.07) 0%, transparent 40%)' }} />
        </div>
      );
    }
    if (e.kind === 'back') {
      return (
        <div style={{ width: pgW, height: pgH, position: 'relative', flexShrink: 0,
          borderRadius: 4, overflow: 'hidden',
          filter: 'drop-shadow(0 18px 44px rgba(0,0,0,0.65))' }}>
          <MiniPage elements={DEMO[e.pageId]} w={pgW} h={pgH} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to left, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.06) 12%, transparent 26%)' }} />
        </div>
      );
    }
    // spread
    return (
      <div style={{ display: 'flex', alignItems: 'stretch',
        filter: 'drop-shadow(0 18px 44px rgba(0,0,0,0.65))' }}>
        <div style={{ width: pgW, height: pgH, position: 'relative', flexShrink: 0,
          borderRadius: '4px 0 0 4px', overflow: 'hidden' }}>
          {e.leftId ? <MiniPage elements={DEMO[e.leftId]} w={pgW} h={pgH} /> :
            <div style={{ position: 'absolute', inset: 0, background: '#F2EDE5' }} />}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to left, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 14%, transparent 30%)' }} />
        </div>
        <div style={{ width: 2, flexShrink: 0, background: 'rgba(0,0,0,0.14)' }} />
        <div style={{ width: pgW, height: pgH, position: 'relative', flexShrink: 0,
          borderRadius: '0 4px 4px 0', overflow: 'hidden' }}>
          {e.rightId ? <MiniPage elements={DEMO[e.rightId]} w={pgW} h={pgH} /> :
            <div style={{ position: 'absolute', inset: 0, background: '#F2EDE5' }} />}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to right, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 14%, transparent 30%)' }} />
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
          style={{ position: 'relative', overflow: 'hidden', touchAction: 'pan-y', maxWidth: '100%' }}
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
              initial={{ opacity: 0, x: dir * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -dir * 32 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (info.offset.x < -48 || info.velocity.x < -280) go(1);
                else if (info.offset.x > 48 || info.velocity.x > 280) go(-1);
              }}
              style={{ cursor: 'grab', touchAction: 'pan-y' }}
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

// ─── Curated album showcase ────────────────────────────────────────────────────
// Mini two-page spread previews — shows actual photobook layouts
const ALBUMS = [
  {
    title: { sq: 'Ana & Erjon', en: 'Ana & Erjon' },
    category: { sq: 'Dasmë', en: 'Wedding' },
    pages: 48,
    leftId: 2, rightId: 3,
    spine: '#5C3D2A',
  },
  {
    title: { sq: 'Kujtime · Ana & Erjon', en: 'Memories · Ana & Erjon' },
    category: { sq: 'Familje', en: 'Family' },
    pages: 36,
    leftId: 4, rightId: 5,
    spine: '#3A5240',
  },
  {
    title: { sq: 'Ana & Erjon · Vera në Jug', en: 'Ana & Erjon · Summer in the South' },
    category: { sq: 'Udhëtim', en: 'Travel' },
    pages: 32,
    leftId: 6, rightId: 7,
    spine: '#2D4D5C',
  },
];

function AlbumCard({ album, lang }: { album: typeof ALBUMS[0]; lang: 'sq' | 'en' }) {
  const pgW = 130;
  const pgH = Math.round(pgW * (DH / DW));

  return (
    <Link href="/krijo">
      <div className="group cursor-pointer" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Spread preview */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.22)) drop-shadow(0 3px 8px rgba(0,0,0,0.14))',
          transition: 'filter 0.3s',
        }}
          className="group-hover:[filter:drop-shadow(0_16px_40px_rgba(0,0,0,0.30))_drop-shadow(0_4px_12px_rgba(0,0,0,0.18))]">
          {/* Left page */}
          <div style={{ width: pgW, height: pgH, position: 'relative', flexShrink: 0,
            borderRadius: '3px 0 0 3px', overflow: 'hidden',
            outline: '1px solid rgba(0,0,0,0.10)' }}>
            <MiniPage elements={DEMO[album.leftId]} w={pgW} h={pgH} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(to left, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.05) 18%, transparent 36%)' }} />
          </div>
          {/* Spine */}
          <div style={{ width: 4, flexShrink: 0, background: album.spine,
            boxShadow: 'inset -1px 0 3px rgba(0,0,0,0.4), inset 1px 0 3px rgba(0,0,0,0.4)' }} />
          {/* Right page */}
          <div style={{ width: pgW, height: pgH, position: 'relative', flexShrink: 0,
            borderRadius: '0 3px 3px 0', overflow: 'hidden',
            outline: '1px solid rgba(0,0,0,0.10)' }}>
            <MiniPage elements={DEMO[album.rightId]} w={pgW} h={pgH} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(to right, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.05) 18%, transparent 36%)' }} />
          </div>
        </div>

        {/* Metadata */}
        <div>
          <p style={{ fontSize: 10, color: '#B0A898', textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 3 }}>
            {album.category[lang]}
          </p>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a',
            fontFamily: 'Georgia, serif', marginBottom: 2, lineHeight: 1.3 }}>
            {album.title[lang]}
          </p>
          <p style={{ fontSize: 11, color: '#C0B8B0' }}>
            {album.pages} {lang === 'sq' ? 'faqe' : 'pages'}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const STATS = [
  { value: '1,000+', label: { sq: 'albume të printuara', en: 'albums printed' } },
  { value: '99%',    label: { sq: 'klientë të kënaqur',  en: 'happy customers' } },
  { value: '200g',   label: { sq: 'letër premium mat',   en: 'premium paper'   } },
];

export default function Examples() {
  const { lang } = useLanguage();

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Shembuj Librash Foto', en: 'Photo Book Examples' }}
        description={{
          sq: 'Shikoni koleksionin e librave foto të realizuara me Përgjithmonë — dasma, udhëtime, familje dhe shumë më tepër.',
          en: 'Browse our collection of photo books made with Përgjithmonë — weddings, travel, family and much more.',
        }}
        path="/shembuj"
      />
      <div>

        {/* ── Header ── */}
        <div className="bg-white border-b border-neutral-100">
          <div className="max-w-6xl mx-auto px-5 pt-10 pb-8 md:pt-14 md:pb-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="max-w-lg">
                <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                  {lang === 'sq' ? 'shembuj · demonstrim' : 'examples · live demo'}
                </p>
                <h1 className="text-3xl md:text-4xl font-serif font-medium text-neutral-900 leading-[1.1] mb-3">
                  {lang === 'sq' ? 'Shikoni çfarë mund të krijoni' : 'See what you can create'}
                </h1>
                <p className="text-neutral-400 text-[13px] leading-relaxed">
                  {lang === 'sq'
                    ? 'Eksploroni librin 3D dhe shfletoni faqe reale — rrotulloni, sodisni, frymëzohuni.'
                    : 'Explore the 3D demo book and browse real page layouts — spin it, page through it, get inspired.'}
                </p>
              </div>
              {/* Stats — scroll horizontally on very small screens */}
              <div className="flex gap-6 md:gap-8 shrink-0 overflow-x-auto pb-1 md:pb-0">
                {STATS.map((s, i) => (
                  <div key={i} className="flex flex-col items-start md:items-end shrink-0">
                    <div className="text-2xl md:text-3xl font-serif font-semibold text-neutral-900">{s.value}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 whitespace-nowrap">{s.label[lang]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 3D Demo section — warm off-white ── */}
        <div style={{ background: 'linear-gradient(160deg, #faf9f6 0%, #f3f1ec 55%, #f8f6f2 100%)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ position: 'relative' }}>
            {/* Subtle centre glow */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255,220,150,0.07) 0%, transparent 70%)' }} />

            <div className="max-w-6xl mx-auto px-5 py-10 md:py-16">

              {/* Album byline */}
              <p className="text-center mb-8 md:mb-10" style={{ fontSize: 10, letterSpacing: '0.28em',
                textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)', fontFamily: 'Georgia, serif' }}>
                {lang === 'sq' ? 'Ana & Erjon · Dasmë 2023' : 'Ana & Erjon · Wedding 2023'}
              </p>

              <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-14">

                {/* 3D Book */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  <DemoBook3D lang={lang} />
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px self-stretch" style={{ background: 'rgba(0,0,0,0.08)' }} />
                <div className="block lg:hidden w-16 h-px" style={{ background: 'rgba(0,0,0,0.10)' }} />

                {/* Spread browser */}
                <div className="flex-1 w-full max-w-xl">
                  <p className="text-center mb-5" style={{ fontSize: 10,
                    letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.30)' }}>
                    {lang === 'sq' ? 'shfletoni faqet' : 'browse the pages'}
                  </p>
                  <SpreadBrowserDemo lang={lang} />
                </div>
              </div>

              {/* CTA */}
              <div className="flex justify-center mt-10 md:mt-12">
                <Link href="/krijo">
                  <button
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full border text-[13px] font-medium transition-all duration-150 active:scale-[0.97]"
                    style={{ background: '#1a1a1a', borderColor: '#1a1a1a', color: '#fff' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#333'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a'; }}
                  >
                    {lang === 'sq' ? 'krijoni albumin tuaj' : 'create your own album'}
                    <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Spread gallery ── */}
        <div className="bg-white border-t border-neutral-100 py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-5">
            <div className="mb-10 md:mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-2">
                  {lang === 'sq' ? 'paraqitje reale' : 'real layouts'}
                </p>
                <h2 className="text-2xl md:text-3xl font-serif font-medium text-neutral-900">
                  {lang === 'sq' ? 'Faqe të dizajnuara me kujdes' : 'Pages designed with care'}
                </h2>
              </div>
              <Link href="/krijo" className="shrink-0">
                <span className="text-[12px] text-neutral-500 hover:text-neutral-900 transition-colors underline underline-offset-4">
                  {lang === 'sq' ? 'fillo albumin tënd →' : 'start your album →'}
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
              {ALBUMS.map((album, i) => (
                <AlbumCard key={i} album={album} lang={lang} />
              ))}
            </div>

            <p className="text-center text-[12px] text-neutral-400 mt-10 leading-relaxed max-w-sm mx-auto">
              {lang === 'sq'
                ? 'Çdo album është unik — i dizajnuar plotësisht nga ju me editorin tonë online.'
                : 'Every album is unique — designed entirely by you with our online editor.'}
            </p>
          </div>
        </div>

        {/* ── Testimonials ── */}
        <div className="bg-[#f8f7f4] border-t border-neutral-100 py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-5">
            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-10">
              {lang === 'sq' ? 'çfarë thonë klientët' : 'what customers say'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {[
                { text: { sq: '"Albumi doli saktësisht ashtu si e imagjinova. Cilësia e letrës është e mahnitshme."', en: '"The album turned out exactly as I imagined. The paper quality is stunning."' }, name: 'Ana M.', occasion: { sq: 'Dasmë', en: 'Wedding' } },
                { text: { sq: '"Procesi ishte shumë i lehtë. E rekomandoj me zemër të plotë."', en: '"The process was so easy. I wholeheartedly recommend it for any occasion."' }, name: 'Erjon B.', occasion: { sq: 'Udhëtim', en: 'Travel' } },
                { text: { sq: '"Dhurata më e bukur që mund t\'i bësh dikujt. Mbeti pa fjalë."', en: '"The most beautiful gift you can give. They were absolutely speechless."' }, name: 'Mirela K.', occasion: { sq: 'Ditëlindje', en: 'Birthday' } },
              ].map((t, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 md:p-6 border border-neutral-100 shadow-sm">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, s) => (
                      <span key={s} style={{ color: '#D4A853', fontSize: 11 }}>★</span>
                    ))}
                  </div>
                  <p className="text-[13px] text-neutral-600 leading-relaxed mb-5 italic">{t.text[lang]}</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-[12px] font-semibold text-neutral-500 shrink-0">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-neutral-800 leading-tight">{t.name}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{t.occasion[lang]}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="bg-[#1a1a1a] py-14 md:py-20 text-center">
          <div className="max-w-md mx-auto px-5">
            <h2 className="text-2xl md:text-3xl font-serif font-medium text-white mb-4">
              {lang === 'sq' ? 'Krijoni albumin tuaj sot' : 'Create your album today'}
            </h2>
            <p className="text-white/50 text-[14px] mb-8">
              {lang === 'sq'
                ? 'Filloni falas. Paguani vetëm kur jeni plotësisht të kënaqur.'
                : 'Start free. Pay only when you\'re completely satisfied.'}
            </p>
            <Link href="/krijo">
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#1a1a1a] rounded-full text-[15px] font-medium hover:bg-neutral-100 transition-colors">
                {lang === 'sq' ? 'fillo tani' : 'start now'}
                <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        </div>

      </div>
    </MarketingLayout>
  );
}
