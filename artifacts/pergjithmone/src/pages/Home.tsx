import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOMeta } from '@/components/SEOMeta';
import { Link } from 'wouter';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useListCategories } from '@workspace/api-client-react-tsconfig';
import {
  CAT_IMG,
  CAT_IMG_BY_SLUG,
  DEFAULT_CATEGORIES,
  getCategoryImage,
  getCategorySpine,
  getCategorySublabel,
} from '@/lib/categoryImages';
import { DESIGNS, designFrontElements } from '@/lib/designs';
import { PageThumb } from '@/components/PageThumb';
import { ensureEditorFonts } from '@/lib/editorFonts';

// ── Hero + album starter (CSS 3D book — no WebGL) ─────────────────────────────

type AlbumStyle = {
  key: string;
  label: { sq: string; en: string };
  line: { sq: string; en: string };
  designId: string;
  spine: string;
  img: string;
  ambient: string;
};

const ALBUM_STYLES: AlbumStyle[] = [
  {
    key: 'dasme',
    label: { sq: 'Dasmë', en: 'Wedding' },
    line: { sq: 'Një ditë. Një libër. Përgjithmonë.', en: 'One day. One book. Forever.' },
    designId: 'cream-names',
    spine: '#8B6F47',
    img: CAT_IMG_BY_SLUG.dasme,
    ambient: '#2a1810',
  },
  {
    key: 'udhetime',
    label: { sq: 'Udhëtime', en: 'Travel' },
    line: { sq: 'Aventurat tuaja, në faqe.', en: 'Your adventures, on the page.' },
    designId: 'paris-pink',
    spine: '#2A4A20',
    img: CAT_IMG_BY_SLUG.udhetime,
    ambient: '#101810',
  },
  {
    key: 'familje',
    label: { sq: 'Familje', en: 'Family' },
    line: { sq: 'Momentet e vogla, të mëdha.', en: 'Small moments, made lasting.' },
    designId: 'baby-ador',
    spine: '#5C7A5A',
    img: CAT_IMG_BY_SLUG.familje,
    ambient: '#141816',
  },
  {
    key: 'miqesi',
    label: { sq: 'Miqësi', en: 'Friendship' },
    line: { sq: 'Historia juaj e dashurisë.', en: 'Your love story, bound.' },
    designId: 'the-wedding-of',
    spine: '#1A2040',
    img: CAT_IMG.Çifte,
    ambient: '#0e1220',
  },
  {
    key: 'festash',
    label: { sq: 'Festash', en: 'Celebrate' },
    line: { sq: 'Festat që nuk harrohen.', en: 'Celebrations you keep.' },
    designId: 'birthday-bloom',
    spine: '#5C4030',
    img: CAT_IMG_BY_SLUG.festash,
    ambient: '#1a1210',
  },
];

const HERO_CYCLE_MS = 5200;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/** Lightweight CSS 3D photobook — one DOM book, cover image swaps (carousel reshaped). */
function LivingAlbumBook({
  style,
  size = 'hero',
  interactive = true,
}: {
  style: AlbumStyle;
  size?: 'hero' | 'starter';
  interactive?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotY = useSpring(useTransform(mx, [-1, 1], interactive && !reduced ? [-14, 18] : [-8, 8]), {
    stiffness: 120, damping: 22, mass: 0.4,
  });
  const rotX = useSpring(useTransform(my, [-1, 1], interactive && !reduced ? [8, -8] : [4, -2]), {
    stiffness: 120, damping: 22, mass: 0.4,
  });

  const coverEls = useMemo(() => {
    const d = DESIGNS.find(x => x.id === style.designId);
    return d ? designFrontElements(d) : [];
  }, [style.designId]);

  const [coverSize, setCoverSize] = useState({ w: 0, h: 0 });
  const coverFaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = coverFaceRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w > 0 && h > 0) setCoverSize({ w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { void ensureEditorFonts(); }, []);

  useEffect(() => {
    for (const el of coverEls) {
      if ((el.type === 'image' || el.type === 'background') && el.src) {
        const img = new Image();
        img.src = el.src;
      }
    }
  }, [coverEls]);

  const d = size === 'hero' ? 22 : 16;
  const maxW = size === 'hero' ? 280 : 200;
  const maxH = size === 'hero' ? 372 : 266;

  const onMove = (e: React.MouseEvent) => {
    if (!interactive || reduced || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative mx-auto"
      style={{
        width: `min(${size === 'hero' ? 42 : 48}vw, ${maxW}px)`,
        height: `min(${size === 'hero' ? 56 : 64}vw, ${maxH}px)`,
        maxWidth: maxW,
        maxHeight: maxH,
        perspective: 1100,
        touchAction: 'manipulation',
      }}
    >
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 bottom-[-7%] w-[78%] h-[11%] rounded-[100%] blur-xl opacity-45"
        style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%)' }}
      />
      <motion.div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          rotateY: rotY,
          rotateX: rotX,
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: -d, top: 0,
            width: d, height: '100%',
            transformOrigin: 'right center',
            transform: 'rotateY(-90deg)',
            background: `linear-gradient(to right, ${style.spine}66, ${style.spine})`,
            borderRadius: '2px 0 0 2px',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              writingMode: 'vertical-rl',
              fontSize: size === 'hero' ? 8 : 7,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.32)',
              fontWeight: 600,
            }}>
              përgjithmonë
            </span>
          </div>
        </div>

        <div
          ref={coverFaceRef}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '0 4px 4px 0',
            overflow: 'hidden',
            boxShadow: '10px 22px 44px rgba(0,0,0,0.32), 2px 4px 12px rgba(0,0,0,0.18)',
            background: (DESIGNS.find(x => x.id === style.designId)?.thumb?.background as string) || '#1a1410',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={style.designId}
              initial={reduced ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'absolute', inset: 0 }}
            >
              {coverEls.length > 0 && coverSize.w > 0 ? (
                <PageThumb elements={coverEls} width={coverSize.w} height={coverSize.h} />
              ) : coverEls.length === 0 ? (
                <img
                  src={style.img}
                  alt=""
                  draggable={false}
                  loading="eager"
                  decoding="async"
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover', display: 'block',
                  }}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: -d, top: '2%',
            width: d, height: '96%',
            transformOrigin: 'left center',
            transform: 'rotateY(90deg)',
            background: 'linear-gradient(to left, #c8c4bc, #ebe6de)',
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute', left: 1, right: 1,
              top: `${(i / 8) * 100}%`, height: 1,
              background: 'rgba(0,0,0,0.07)',
            }} />
          ))}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, rgba(0,0,0,0.2), transparent 50%)',
          }} />
        </div>
      </motion.div>
    </div>
  );
}

function HeroAlbum({ lang }: { lang: 'sq' | 'en' }) {
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const style = ALBUM_STYLES[idx];
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (reduced || paused) return;
    const t = window.setTimeout(() => {
      setIdx(i => (i + 1) % ALBUM_STYLES.length);
    }, HERO_CYCLE_MS);
    return () => clearTimeout(t);
  }, [idx, reduced, paused]);

  // Prefetch next cover's layout assets
  useEffect(() => {
    const next = ALBUM_STYLES[(idx + 1) % ALBUM_STYLES.length];
    const d = DESIGNS.find(x => x.id === next.designId);
    const els = d ? designFrontElements(d) : [];
    for (const el of els) {
      if ((el.type === 'image' || el.type === 'background') && el.src) {
        const img = new Image();
        img.src = el.src;
      }
    }
  }, [idx]);

  const go = (d: number) => {
    setIdx(i => (i + d + ALBUM_STYLES.length) % ALBUM_STYLES.length);
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        minHeight: 'min(100svh, 920px)',
        background: `radial-gradient(120% 80% at 70% 40%, ${style.ambient} 0%, #0a0908 55%, #060504 100%)`,
        transition: reduced ? undefined : 'background 0.9s ease',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!swipeRef.current) return;
        const dx = e.changedTouches[0].clientX - swipeRef.current.x;
        const dy = e.changedTouches[0].clientY - swipeRef.current.y;
        swipeRef.current = null;
        if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy)) return;
        go(dx < 0 ? 1 : -1);
      }}
    >
      {/* Atmosphere — CSS only, no extra images */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(ellipse 60% 50% at 75% 45%, ${style.spine}55, transparent 70%)`,
          transition: reduced ? undefined : 'background 0.9s ease',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '180px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-10 pt-8 pb-12 md:pt-16 md:pb-20 min-h-[inherit] flex flex-col justify-center">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-6 md:gap-8 md:items-center">
          {/* Brand — always first */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 md:col-start-1 font-serif text-[clamp(2.75rem,9vw,4.75rem)] leading-[0.95] tracking-[-0.02em] text-white text-center md:text-left"
          >
            Përgjithmonë
          </motion.p>

          {/* Dominant 3D book — second on mobile so it sits in first viewport */}
          <div className="order-2 md:order-none md:col-start-2 md:row-start-1 md:row-span-2 flex flex-col items-center justify-center py-1 md:py-0">
            <LivingAlbumBook style={style} size="hero" />
            <div className="mt-5 flex items-center gap-4 md:hidden">
              <button
                type="button"
                onClick={() => go(-1)}
                className="w-9 h-9 rounded-full border border-white/20 text-white/70 text-lg leading-none"
                aria-label="Previous"
              >‹</button>
              <span className="text-[10px] tracking-[0.2em] text-white/35 tabular-nums">
                {String(idx + 1).padStart(2, '0')} / {String(ALBUM_STYLES.length).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => go(1)}
                className="w-9 h-9 rounded-full border border-white/20 text-white/70 text-lg leading-none"
                aria-label="Next"
              >›</button>
            </div>
          </div>

          {/* Headline + CTA */}
          <div className="order-3 md:col-start-1 text-center md:text-left">
            <div className="h-[3.2em] md:h-[3.6em] relative mb-3 md:mb-4 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h1
                  key={style.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-0 md:inset-x-auto top-0 font-serif text-[clamp(1.35rem,3.4vw,2rem)] text-white/88 leading-[1.2] font-medium"
                >
                  {style.line[lang]}
                </motion.h1>
              </AnimatePresence>
            </div>

            <p className="text-[13px] md:text-[14.5px] text-white/50 max-w-md mx-auto md:mx-0 leading-relaxed mb-6 md:mb-8">
              {lang === 'sq'
                ? 'Albume fotografike premium — dizajnoni online, printohen me cilësi galerie, mbërrijnë në derën tuaj.'
                : 'Premium photo books — design online, printed at gallery quality, delivered to your door.'}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <Link href={`/krijo?category=${encodeURIComponent(style.key)}&design=${encodeURIComponent(style.designId)}`}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-3.5 bg-white text-[#12100e] rounded-full text-[12.5px] font-semibold shadow-xl shadow-black/25"
                >
                  {lang === 'sq' ? 'krijo albumin' : 'create your book'}
                </motion.button>
              </Link>
              <Link href="/shembuj">
                <button className="px-6 py-3.5 text-white/70 text-[12.5px] border border-white/20 rounded-full hover:border-white/40 hover:text-white transition-colors">
                  {lang === 'sq' ? 'shiko shembuj' : 'see examples'}
                </button>
              </Link>
            </div>

            <div className="mt-8 md:mt-10 flex flex-wrap items-center justify-center md:justify-start gap-x-1 gap-y-1">
              {ALBUM_STYLES.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={s.label[lang]}
                  aria-current={i === idx}
                  className="relative h-8 px-2.5 text-[10px] tracking-[0.14em] uppercase transition-colors"
                  style={{ color: i === idx ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.28)' }}
                >
                  {s.label[lang]}
                  {i === idx && (
                    <motion.span
                      layoutId="hero-style-underline"
                      className="absolute left-2.5 right-2.5 bottom-1 h-px bg-white/70"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AlbumStarter({ lang }: { lang: 'sq' | 'en' }) {
  const [idx, setIdx] = useState(0);
  const style = ALBUM_STYLES[idx];
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const child = el.children[idx] as HTMLElement | undefined;
    if (!child) return;
    const left = child.offsetLeft - (el.clientWidth - child.clientWidth) / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [idx]);

  const href = `/krijo?category=${encodeURIComponent(style.key)}&design=${encodeURIComponent(style.designId)}`;

  return (
    <section className="relative bg-[#f3efe9] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] w-[55%] h-[55%] rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, ${style.spine}33, transparent 70%)` }}
      />

      <div className="relative max-w-7xl mx-auto px-5 md:px-10 pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-center">
          {/* Book preview */}
          <div className="flex justify-center lg:justify-start">
            <LivingAlbumBook style={style} size="starter" interactive={false} />
          </div>

          {/* Starter controls */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-neutral-400 mb-3">
              {lang === 'sq' ? 'filloni këtu' : 'start here'}
            </p>
            <h2 className="font-serif text-[clamp(1.75rem,3.5vw,2.75rem)] text-neutral-900 font-medium leading-[1.15] mb-3">
              {lang === 'sq' ? 'Çfarë po krijoni sot?' : 'What are you creating today?'}
            </h2>
            <p className="text-[14px] text-neutral-500 max-w-md leading-relaxed mb-7">
              {lang === 'sq'
                ? 'Zgjidhni një moment — albumi hapet me stilin e duhur. Pastaj shtoni fotot tuaja.'
                : 'Pick a moment — your book opens with the right style. Then add your photos.'}
            </p>

            {/* Occasion rail — snap carousel of choices, not a pill dump */}
            <div
              ref={railRef}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 mb-8 -mx-1 px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {ALBUM_STYLES.map((s, i) => {
                const active = i === idx;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setIdx(i)}
                    className="snap-center shrink-0 text-left transition-all"
                    style={{
                      width: 118,
                      padding: '14px 12px',
                      borderRadius: 14,
                      border: active ? '1px solid rgba(26,26,26,0.55)' : '1px solid rgba(26,26,26,0.1)',
                      background: active ? '#1a1a1a' : 'rgba(255,255,255,0.55)',
                      color: active ? '#fff' : '#1a1a1a',
                      boxShadow: active ? '0 10px 28px rgba(0,0,0,0.12)' : 'none',
                    }}
                  >
                    <span
                      className="block w-7 h-1 rounded-full mb-3"
                      style={{ background: s.spine, opacity: active ? 1 : 0.7 }}
                    />
                    <span className="block font-serif text-[15px] leading-tight mb-1">
                      {s.label[lang]}
                    </span>
                    <span
                      className="block text-[10px] leading-snug"
                      style={{ color: active ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.38)' }}
                    >
                      {s.line[lang]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href={href}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-3.5 bg-[#1a1a1a] text-white rounded-full text-[12.5px] font-semibold"
                >
                  {lang === 'sq'
                    ? `krijo · ${style.label.sq}`
                    : `create · ${style.label.en}`}
                </motion.button>
              </Link>
              <Link href="/krijo">
                <button className="px-5 py-3.5 text-[12px] text-neutral-500 hover:text-neutral-800 transition-colors tracking-wide">
                  {lang === 'sq' ? 'shfletoni të gjitha →' : 'browse all styles →'}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────────

type HomeCategoryCard = {
  key: string;
  label: { sq: string; en: string };
  sublabel: { sq: string; en: string };
  img: string;
  spine: string;
  badge: { sq: string; en: string } | null;
  pages: { sq: string; en: string };
};

const MATERIALS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="5" width="20" height="18" rx="1.5"/>
        <path d="M9 5V23M9 5C9 5 10 7 12 7h11"/>
        <path d="M13 12h6M13 16h4"/>
      </svg>
    ),
    title: { sq: 'Letër mat 200g', en: 'Matte 200g paper' },
    desc: { sq: 'Cilësi premium, pa pasqyrim', en: 'Premium quality, no glare' },
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 23V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16"/>
        <path d="M5 23h18"/>
        <path d="M14 5v18"/>
        <path d="M5 13h9M19 13h4"/>
      </svg>
    ),
    title: { sq: 'Lidhje layflat', en: 'Lay-flat binding' },
    desc: { sq: 'Hapje e plotë, pa humbje imazhi', en: 'Full open, no image loss' },
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="14" cy="14" r="5"/>
        <path d="M14 3v3M14 22v3M3 14h3M22 14h3"/>
        <path d="M6.22 6.22l2.12 2.12M19.66 19.66l2.12 2.12M19.66 6.22l-2.12 2.12M6.22 19.66l2.12 2.12"/>
      </svg>
    ),
    title: { sq: 'Printim CMYK', en: 'CMYK printing' },
    desc: { sq: 'Ngjyra të gjalla, të sakta', en: 'Vivid, accurate colours' },
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 10H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h20a1 1 0 0 0 1-1V11a1 1 0 0 0-1-1h-2"/>
        <path d="M18 10l-4-5-4 5"/>
        <path d="M14 5v13"/>
      </svg>
    ),
    title: { sq: 'Kuti mbrojtëse', en: 'Protective box' },
    desc: { sq: 'Dërgesë e sigurt, gjithmonë', en: 'Safe delivery, always' },
  },
];

// ── Category illustration (SVG, inline) ───────────────────────────────────────
// Evokes photobooks, polaroids, botanical sprigs — minimal line art

function CategoryIllustration() {
  return (
    <svg
      viewBox="0 0 520 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="w-full h-auto"
      style={{ maxHeight: 100 }}
    >
      {/* Open book (center) */}
      <g transform="translate(200,18)">
        <path d="M60 80 Q60 8 0 8 Q60 8 60 8 L60 80Z" stroke="#1a1a1a" strokeWidth="1.2" fill="#faf8f5"/>
        <path d="M60 80 Q60 8 120 8 Q60 8 60 8 L60 80Z" stroke="#1a1a1a" strokeWidth="1.2" fill="#faf8f5"/>
        <line x1="60" y1="10" x2="60" y2="80" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
        {/* Left page lines */}
        <line x1="20" y1="30" x2="54" y2="30" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round" opacity="0.4"/>
        <line x1="20" y1="40" x2="54" y2="40" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round" opacity="0.4"/>
        <line x1="20" y1="50" x2="48" y2="50" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round" opacity="0.4"/>
        {/* Right page image placeholder */}
        <rect x="68" y="22" width="36" height="28" rx="1.5" stroke="#1a1a1a" strokeWidth="0.8" fill="#ede9e2" opacity="0.8"/>
        <line x1="68" y1="60" x2="100" y2="60" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round" opacity="0.4"/>
        <line x1="68" y1="70" x2="88" y2="70" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round" opacity="0.4"/>
      </g>

      {/* Polaroid (left) */}
      <g transform="translate(60,22)">
        <rect x="0" y="0" width="64" height="74" rx="2" fill="#fefefe" stroke="#1a1a1a" strokeWidth="1.2"/>
        <rect x="7" y="7" width="50" height="44" rx="1" fill="#e8e4dc" stroke="#1a1a1a" strokeWidth="0.7"/>
        {/* tiny mountain in polaroid */}
        <polyline points="12,40 25,22 38,35 44,28 57,40" stroke="#1a1a1a" strokeWidth="0.8" fill="none" opacity="0.6"/>
        <line x1="12" y1="58" x2="52" y2="58" stroke="#1a1a1a" strokeWidth="0.7" opacity="0.35"/>
        <line x1="20" y1="65" x2="44" y2="65" stroke="#1a1a1a" strokeWidth="0.7" opacity="0.35"/>
      </g>

      {/* Botanical sprig (left-side) */}
      <g transform="translate(10,10)" opacity="0.6">
        <path d="M20 100 C20 70 15 50 25 20" stroke="#5C7A5A" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
        <path d="M25 55 Q8 45 5 30" stroke="#5C7A5A" strokeWidth="1" strokeLinecap="round" fill="none"/>
        <path d="M22 40 Q38 28 42 14" stroke="#5C7A5A" strokeWidth="1" strokeLinecap="round" fill="none"/>
        <ellipse cx="5" cy="29" rx="6" ry="4" transform="rotate(-30 5 29)" fill="#5C7A5A" opacity="0.5"/>
        <ellipse cx="42" cy="14" rx="6" ry="4" transform="rotate(20 42 14)" fill="#5C7A5A" opacity="0.5"/>
        <ellipse cx="14" cy="72" rx="5" ry="3.5" transform="rotate(-10 14 72)" fill="#5C7A5A" opacity="0.35"/>
      </g>

      {/* Polaroid (right, tilted) */}
      <g transform="translate(386,10) rotate(8)">
        <rect x="0" y="0" width="56" height="66" rx="2" fill="#fefefe" stroke="#1a1a1a" strokeWidth="1.2"/>
        <rect x="6" y="6" width="44" height="38" rx="1" fill="#e8e0d8" stroke="#1a1a1a" strokeWidth="0.7"/>
        {/* tiny heart in polaroid */}
        <path d="M22 20 C22 16 16 16 16 21 C16 26 22 30 22 30 C22 30 28 26 28 21 C28 16 22 16 22 20Z" fill="#c4a0a0" opacity="0.6"/>
        <line x1="8" y1="52" x2="48" y2="52" stroke="#1a1a1a" strokeWidth="0.7" opacity="0.35"/>
        <line x1="14" y1="58" x2="42" y2="58" stroke="#1a1a1a" strokeWidth="0.7" opacity="0.35"/>
      </g>

      {/* Botanical sprig (right) */}
      <g transform="translate(460,5)" opacity="0.6">
        <path d="M15 110 C15 80 20 55 10 25" stroke="#8B6F47" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
        <path d="M10 60 Q28 48 30 35" stroke="#8B6F47" strokeWidth="1" strokeLinecap="round" fill="none"/>
        <path d="M13 45 Q-4 35 -6 20" stroke="#8B6F47" strokeWidth="1" strokeLinecap="round" fill="none"/>
        <ellipse cx="30" cy="34" rx="6" ry="4" transform="rotate(25 30 34)" fill="#8B6F47" opacity="0.5"/>
        <ellipse cx="-6" cy="20" rx="6" ry="4" transform="rotate(-20 -6 20)" fill="#8B6F47" opacity="0.5"/>
      </g>

      {/* Ribbon bookmark (far right of book) */}
      <g transform="translate(352,8)">
        <rect x="0" y="0" width="14" height="50" rx="1" fill="#c4a0a0" opacity="0.7"/>
        <polygon points="0,50 7,42 14,50" fill="#c4a0a0" opacity="0.7"/>
      </g>

      {/* Camera (small, lower left of open book area) */}
      <g transform="translate(172,48)" opacity="0.5">
        <rect x="0" y="6" width="36" height="26" rx="3" stroke="#1a1a1a" strokeWidth="1.1" fill="#f5f2ec"/>
        <path d="M10 6 L12 1 L24 1 L26 6" stroke="#1a1a1a" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <circle cx="18" cy="19" r="7" stroke="#1a1a1a" strokeWidth="1" fill="none"/>
        <circle cx="18" cy="19" r="4" stroke="#1a1a1a" strokeWidth="0.7" fill="none"/>
        <circle cx="28" cy="12" r="2" stroke="#1a1a1a" strokeWidth="0.7" fill="#e8e4dc"/>
      </g>
    </svg>
  );
}

// ── Horizontal ticker ──────────────────────────────────────────────────────────

function Ticker({ items }: { items: string[] }) {
  const all = [...items, ...items, ...items];
  return (
    <div className="overflow-hidden flex whitespace-nowrap">
      <motion.div
        className="flex gap-8 pr-8"
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{ duration: 22, ease: 'linear', repeat: Infinity }}
      >
        {all.map((item, i) => (
          <span key={i} className="text-xs uppercase tracking-[0.18em] text-neutral-400 font-medium shrink-0">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Category card (editorial style) ───────────────────────────────────────────

function CategoryCard({
  cat,
  lang,
  featured = false,
}: {
  cat: HomeCategoryCard;
  lang: 'sq' | 'en';
  featured?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateY = useSpring(useTransform(x, [-1, 1], [-3, 3]), { stiffness: 280, damping: 28 });
  const rotateX = useSpring(useTransform(y, [-1, 1], [2.5, -2.5]), { stiffness: 280, damping: 28 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    y.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <Link href={`/krijo?category=${encodeURIComponent(cat.key)}`}>
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer select-none"
        style={{ perspective: '900px' }}
      >
        <motion.div
          style={{ rotateY, rotateX, transformStyle: 'preserve-3d' }}
          whileHover={{ scale: 1.015 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="group relative rounded-2xl overflow-hidden"
        >
          {/* Image */}
          <div
            className={`relative overflow-hidden ${featured ? 'aspect-[3/4] md:aspect-auto md:h-full' : 'aspect-[3/4]'}`}
            style={featured ? { minHeight: 360 } : {}}
          >
            <img
              src={cat.img}
              alt={cat.label[lang]}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            {/* Spine accent bar */}
            <div
              className="absolute top-0 left-0 bottom-0 w-[5px]"
              style={{ background: cat.spine }}
            />

            {/* Badge */}
            {cat.badge && (
              <div
                className="absolute top-4 left-6 text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-sm"
                style={{ background: cat.spine, color: '#fff' }}
              >
                {cat.badge[lang]}
              </div>
            )}

            {/* Info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
              <p className="text-white/50 text-[10px] uppercase tracking-[0.18em] mb-1.5">{cat.pages[lang]}</p>
              <h3 className={`text-white font-serif font-medium leading-tight ${featured ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>
                {cat.label[lang]}
              </h3>
              <p className="text-white/60 text-[12px] mt-1.5 leading-snug">{cat.sublabel[lang]}</p>

              {/* CTA row */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-white/80 text-[11px] font-medium uppercase tracking-widest group-hover:text-white transition-colors">
                  {lang === 'sq' ? 'Krijo →' : 'Create →'}
                </span>
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
                  <span className="text-white text-[11px] font-semibold">nga 3,100 LEK</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Link>
  );
}

// ── Main Home Page ─────────────────────────────────────────────────────────────

// ── AI Album promo banner ────────────────────────────────────────────────────

function AIAlbumPromo({ lang }: { lang: 'sq' | 'en' }) {
  return (
    <section className="relative overflow-hidden bg-[#141311] py-16 md:py-20">
      {/* Ambient sparkle field */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        {[
          { top: '15%', left: '6%', size: 14, delay: 0 },
          { top: '70%', left: '12%', size: 9, delay: 0.8 },
          { top: '20%', left: '92%', size: 11, delay: 1.4 },
          { top: '75%', left: '88%', size: 15, delay: 0.4 },
          { top: '45%', left: '50%', size: 8, delay: 1.1 },
        ].map((s, i) => (
          <motion.span
            key={i}
            className="absolute block rounded-full"
            style={{ top: s.top, left: s.left, width: s.size, height: s.size, background: 'radial-gradient(circle, rgba(255,255,255,0.5), transparent 70%)' }}
            animate={{ opacity: [0.15, 0.6, 0.15], scale: [0.85, 1.1, 0.85] }}
            transition={{ duration: 3.6, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
          />
        ))}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06), transparent 60%)' }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-5 md:px-10">
        <motion.div
          className="flex flex-col md:flex-row items-center md:items-stretch justify-between gap-8 md:gap-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center md:text-left max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/85 text-[10px] uppercase tracking-[0.2em] font-semibold mb-4">
              ✦ {lang === 'sq' ? 'E re · me AI' : 'New · powered by AI'}
            </div>
            <h2 className="text-2xl md:text-[32px] font-serif font-medium text-white leading-tight mb-3">
              {lang === 'sq'
                ? <>Ngarko fotot, dhe le AI-në<br className="hidden md:block" /> të krijojë albumin</>
                : <>Upload your photos, let AI<br className="hidden md:block" /> build the album</>}
            </h2>
            <p className="text-white/50 text-[13.5px] leading-relaxed">
              {lang === 'sq'
                ? 'Zgjidh një kategori, ngarko 25+ foto — sistemi zgjedh vetë strukturën, ngjyrat dhe dizajnin e çdo faqeje. Redakto lirshëm më pas.'
                : 'Pick a category, upload 25+ photos — our system automatically chooses the layout, colors, and design of every page. Fine-tune anything afterwards.'}
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end justify-center gap-3 shrink-0">
            <Link href="/album-ai">
              <button className="px-8 py-3.5 bg-white text-[#141311] rounded-full text-[12.5px] font-semibold hover:bg-neutral-100 active:scale-[0.97] transition-all shadow-xl shadow-black/30">
                {lang === 'sq' ? 'provo albumin me AI' : 'try the AI album maker'}
              </button>
            </Link>
            <p className="text-white/30 text-[11px]">
              {lang === 'sq' ? 'Gati për sekonda' : 'Ready in seconds'}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  const { lang } = useLanguage();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const { data: apiCategories } = useListCategories();

  // Prefer live API list; fall back to seeded defaults so images always show.
  const categories = useMemo<HomeCategoryCard[]>(() => {
    const source = apiCategories?.length
      ? apiCategories.map(c => ({
          slug: c.slug,
          nameAl: c.nameAl,
          nameEn: c.nameEn,
          coverImage: c.coverImage,
        }))
      : DEFAULT_CATEGORIES.map(c => ({ ...c, coverImage: null as string | null }));

    return source.map((cat, i) => ({
      key: cat.slug,
      label: { sq: cat.nameAl, en: cat.nameEn },
      sublabel: getCategorySublabel(cat.slug),
      img: getCategoryImage(cat.nameAl, cat.coverImage, cat.slug),
      spine: getCategorySpine(cat.slug),
      badge: i === 0 ? { sq: 'bestseller', en: 'bestseller' } : null,
      pages: { sq: '30–80 faqe', en: '30–80 pages' },
    }));
  }, [apiCategories]);

  const tickerItems = [
    lang === 'sq' ? 'letër mat 200g' : 'matte 200g paper',
    lang === 'sq' ? 'hapje e sheshtë' : 'lay-flat binding',
    lang === 'sq' ? 'printim premium' : 'premium printing',
    lang === 'sq' ? 'dërgim në 10–16 ditë' : '10–16 day delivery',
    lang === 'sq' ? 'dizajn profesional' : 'professional design',
    lang === 'sq' ? 'garanci 30 ditë' : '30-day guarantee',
    '✦',
  ];

  const steps = [
    {
      n: '01',
      title: { sq: 'Zgjidhni stilin', en: 'Choose a style' },
      desc: { sq: 'Zgjidhni madhësinë dhe temën vizuale. 5 stile të ndryshme me ngjyra dhe shkronja të gatshme.', en: 'Pick your size and visual theme. 5 styles with ready-made colours and fonts.' },
      detail: {
        sq: 'Nga dasmë deri te udhëtim, kemi stile për çdo moment. Çdo stil ka 4–6 variante ngjyrash dhe 3 madhësi albumesh (20×20, 30×30, A4).',
        en: 'From weddings to travel, we have styles for every occasion. Each style has 4–6 colour variants and 3 book sizes (20×20, 30×30, A4).',
      },
    },
    {
      n: '02',
      title: { sq: 'Ngarkoni fotot', en: 'Upload your photos' },
      desc: { sq: 'Dizajnoni çdo faqe me editorin tonë intuitiv. Tërhiqni fotot dhe rregulloni si dëshironi.', en: 'Design every page with our editor. Drag photos and arrange freely.' },
      detail: {
        sq: 'Ngarko direktamente nga telefoni ose kompjuteri. Editoni tekstin, zgjidhni paraqitjet dhe shto dekorime. Punoni në çdo pajisje.',
        en: 'Upload directly from your phone or computer. Edit text, choose layouts and add decorations. Works on any device.',
      },
    },
    {
      n: '03',
      title: { sq: 'Porositni dhe merrni', en: 'Order and receive' },
      desc: { sq: 'Printuar dhe dërguar direkt në derën tuaj brenda 10–16 ditësh pune.', en: 'Printed and delivered straight to your door within 10–16 working days.' },
      detail: {
        sq: 'Printim me cilësi galerie, letër mat 200g, lidhje layflat. Dërgim i sigurt me kuti mbrojtëse. Garanci 30 ditë kthim.',
        en: 'Gallery-quality printing, matte 200g paper, lay-flat binding. Safe delivery with protective box. 30-day return guarantee.',
      },
    },
  ];

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Libra Foto Premium', en: 'Premium Photo Books' }}
        description={{
          sq: 'Ktheni kujtimet tuaja në libra foto të bukur, të shtypur me cilësi galerie. Dizajnoni vetë online. Dërgesa në të gjithë Shqipërinë.',
          en: 'Turn your memories into beautiful, gallery-quality photo books. Design online, printed and delivered across Albania.',
        }}
        path="/"
        ogImage={{ sq: '/og-home-sq.jpg', en: '/og-home-en.jpg' }}
        schemaType="WebSite"
      />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <HeroAlbum lang={lang} />

      {/* ── 3D BOOK SHOWCASE ─────────────────────────────────────────── */}
      <AlbumStarter lang={lang} />

      {/* ── TICKER ───────────────────────────────────────────────────── */}
      <div className="bg-[#f7f4f0] border-y border-neutral-200/70 py-3.5 overflow-hidden">
        <Ticker items={tickerItems} />
      </div>

      {/* ── AI ALBUM PROMO ───────────────────────────────────────────── */}
      <AIAlbumPromo lang={lang} />

      {/* ── CATEGORY SECTION ─────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#f7f4f0]">
        <div className="max-w-7xl mx-auto px-5 md:px-10">

          {/* Section header with illustration */}
          <div className="mb-14 md:mb-16 relative">
            {/* Illustration strip — sits above the heading */}
            <div className="mb-8 opacity-90 pointer-events-none select-none">
              <CategoryIllustration />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-neutral-400 mb-3">
                  {lang === 'sq' ? 'koleksionet tona' : 'our collections'}
                </p>
                <h2 className="text-4xl md:text-5xl font-serif font-medium text-neutral-900 leading-tight">
                  {lang === 'sq' ? (
                    <>Albume për çdo<br />moment të veçantë</>
                  ) : (
                    <>A book for every<br />special moment</>
                  )}
                </h2>
              </div>
              <Link
                href="/krijo"
                className="hidden md:flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-neutral-400 hover:text-neutral-900 transition-colors group shrink-0 mb-2"
              >
                <span>{lang === 'sq' ? 'të gjitha' : 'all collections'}</span>
                <svg width="16" height="8" viewBox="0 0 16 8" className="transition-transform group-hover:translate-x-1">
                  <path d="M0 4h14M11 1l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Mobile: swipeable category cards */}
          <div
            className="flex md:hidden gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-5 px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
          >
            {categories.map((cat) => (
              <div
                key={cat.key}
                className="snap-center shrink-0"
                style={{ width: 'min(72vw, 260px)', touchAction: 'pan-x' }}
              >
                <CategoryCard cat={cat} lang={lang} />
              </div>
            ))}
          </div>

          {/* Desktop grid */}
          <div className="hidden md:grid grid-cols-3 gap-5">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.55 }}
              >
                <CategoryCard cat={cat} lang={lang} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPREAD PREVIEW ───────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-white border-t border-neutral-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="grid md:grid-cols-2 gap-14 md:gap-20 items-center">
            {/* Text side */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">
                {lang === 'sq' ? 'si duket brenda' : "what's inside"}
              </p>
              <h2 className="text-4xl font-serif font-medium text-neutral-900 leading-tight mb-5">
                {lang === 'sq' ? (
                  <>Çdo faqe, një histori<br />e treguar me kujdes</>
                ) : (
                  <>Every page, a story<br />told with care</>
                )}
              </h2>
              <p className="text-neutral-500 text-[14px] leading-relaxed mb-8 max-w-sm">
                {lang === 'sq'
                  ? 'Dizajnoni çdo faqe dyshe si dëshironi — dy faqe krah e krah, si një libër i vërtetë. Zgjidhni paraqitjen, shtoni fotot dhe tekstin tuaj.'
                  : 'Design each spread exactly as you want — two pages side by side, like a real book. Pick a layout, add your photos and text.'}
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-xs">
                {[
                  { num: '9+', label: lang === 'sq' ? 'paraqitje faqesh' : 'page layouts' },
                  { num: '20+', label: lang === 'sq' ? 'dizajne të gatshme' : 'premade designs' },
                  { num: '∞', label: lang === 'sq' ? 'foto për faqe' : 'photos per page' },
                  { num: '3', label: lang === 'sq' ? 'madhësi albumesh' : 'book sizes' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#f7f4f0] rounded-xl p-4 border border-neutral-100">
                    <p className="text-2xl font-serif font-medium text-neutral-900">{stat.num}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Visual spread mockup */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative"
            >
              <div
                className="relative rounded-lg overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                style={{ aspectRatio: '16/9' }}
              >
                {/* Left page */}
                <div className="absolute inset-y-0 left-0 w-1/2 bg-[#f9f6f1] flex flex-col p-5 md:p-7">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <img
                      src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80&fit=crop"
                      className="w-full h-full object-cover rounded-sm col-span-1"
                      alt=""
                    />
                    <div className="flex flex-col gap-2">
                      <img
                        src="https://images.unsplash.com/photo-1606800052052-a08af7148866?w=300&q=80&fit=crop"
                        className="w-full flex-1 object-cover rounded-sm"
                        alt=""
                      />
                      <img
                        src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=80&fit=crop"
                        className="w-full flex-1 object-cover rounded-sm"
                        alt=""
                      />
                    </div>
                  </div>
                  <p className="text-[8px] text-neutral-300 mt-3 uppercase tracking-widest text-center">6</p>
                </div>

                {/* Spine */}
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3 z-10"
                  style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.10), rgba(0,0,0,0.03), rgba(0,0,0,0.10))' }}
                />

                {/* Right page */}
                <div className="absolute inset-y-0 right-0 w-1/2 bg-white flex flex-col p-5 md:p-7">
                  <img
                    src="https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=600&q=80&fit=crop"
                    className="w-full flex-1 object-cover rounded-sm"
                    alt=""
                  />
                  <div className="mt-3">
                    <div className="h-1.5 bg-neutral-100 rounded-full w-3/4 mb-1.5" />
                    <div className="h-1 bg-neutral-100 rounded-full w-1/2" />
                  </div>
                  <p className="text-[8px] text-neutral-300 mt-3 uppercase tracking-widest text-center">7</p>
                </div>
              </div>

              {/* Floating tag */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-5 py-2 shadow-lg border border-neutral-100 whitespace-nowrap">
                <p className="text-xs font-medium text-neutral-600">
                  {lang === 'sq' ? 'Faqja 6–7 · pamje e plotë' : 'Page 6–7 · full spread view'}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── MATERIALS ────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#f7f4f0] border-t border-neutral-200/70">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="flex items-center justify-between mb-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400">
              {lang === 'sq' ? 'çfarë e bën të veçantë' : 'what makes it special'}
            </p>
            <div className="h-px flex-1 bg-neutral-200 ml-8 hidden md:block" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {MATERIALS.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl p-6 border border-neutral-100 hover:shadow-md transition-shadow group"
              >
                <div className="mb-5 opacity-75 group-hover:opacity-100 transition-opacity">{m.icon}</div>
                <h4 className="font-medium text-[13px] text-neutral-900 mb-1">{m.title[lang]}</h4>
                <p className="text-[12px] text-neutral-400 leading-relaxed">{m.desc[lang]}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-white border-t border-neutral-100">
        <div className="max-w-5xl mx-auto px-5 md:px-10">
          <div className="text-center mb-14">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">
              {lang === 'sq' ? 'procesi' : 'the process'}
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-medium text-neutral-900">
              {lang === 'sq' ? 'Tre hapa deri tek albumi juaj' : 'Three steps to your photobook'}
            </h2>
          </div>

          {/* Accordion-style steps */}
          <div className="divide-y divide-neutral-100 border-y border-neutral-100">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <button
                  className="w-full text-left py-6 flex items-start gap-6 group"
                  onClick={() => setActiveStep(activeStep === i ? null : i)}
                >
                  <span className="font-serif text-[13px] text-neutral-300 mt-0.5 shrink-0 w-7">{step.n}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-serif text-xl font-medium text-neutral-900 group-hover:text-neutral-600 transition-colors">
                        {step.title[lang]}
                      </h3>
                      <svg
                        width="16" height="16" viewBox="0 0 16 16"
                        className={`shrink-0 transition-transform duration-200 text-neutral-400 ${activeStep === i ? 'rotate-45' : ''}`}
                        fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                      >
                        <path d="M8 3v10M3 8h10"/>
                      </svg>
                    </div>
                    <p className="text-neutral-400 text-[13px] mt-1.5">{step.desc[lang]}</p>
                    <AnimatePresence>
                      {activeStep === i && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden text-[13px] text-neutral-600 leading-relaxed mt-3 max-w-xl"
                        >
                          {step.detail[lang]}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-4">
            <Link href="/krijo">
              <button className="px-8 py-3.5 bg-[#1a1a1a] text-white rounded-full text-[13px] font-medium hover:bg-neutral-800 transition-colors shadow-sm">
                {lang === 'sq' ? 'fillo tani — falas' : 'start now — free'}
              </button>
            </Link>
            <span className="text-[12px] text-neutral-400">
              {lang === 'sq' ? 'Pa kartë krediti' : 'No credit card required'}
            </span>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ──────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-[#1a1a1a] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-white/[0.02] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-white/[0.02] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="max-w-3xl mx-auto px-5 md:px-10 text-center relative z-10">
          <div className="flex justify-center mb-8">
            <span className="text-white/20 font-serif text-5xl leading-none">"</span>
          </div>
          <blockquote className="text-2xl md:text-[32px] font-serif font-light leading-snug text-white/88 mb-10">
            {lang === 'sq'
              ? '"Cilësia e letrës dhe printimit është thjesht fantastike. Është vërtet një libër që do të qëndrojë përgjithmonë në familjen tonë."'
              : '"The paper and print quality is simply fantastic. Truly a book that will stay in our family forever."'}
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&fit=crop&crop=face"
              className="w-10 h-10 rounded-full object-cover opacity-70"
              alt=""
            />
            <div className="text-left">
              <p className="text-white/65 text-[13px] font-medium">Era M.</p>
              <p className="text-white/28 text-[11px] mt-0.5">Tiranë, Shqipëri</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-[#f7f4f0] border-t border-neutral-200 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
          <span className="font-serif text-[320px] font-medium text-neutral-900 leading-none">P</span>
        </div>

        <div className="max-w-xl mx-auto px-5 text-center relative z-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-5">
            {lang === 'sq' ? '— fillo sot' : '— start today'}
          </p>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-neutral-900 leading-tight mb-5">
            {lang === 'sq' ? (
              <>Fotot tuaja meritojnë<br />të jenë kujtim</>
            ) : (
              <>Your photos deserve<br />to become a memory</>
            )}
          </h2>
          <p className="text-neutral-500 text-[14px] leading-relaxed mb-10 max-w-sm mx-auto">
            {lang === 'sq'
              ? 'Pa regjistrim. Pa kartë krediti. Filloni falas dhe porositni vetëm kur jeni gati.'
              : "No registration. No credit card. Start free and only order when you're ready."}
          </p>
          <Link href="/krijo">
            <motion.button
              className="px-10 py-4 bg-[#1a1a1a] text-white rounded-full text-[13px] font-medium hover:bg-neutral-800 transition-colors shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {lang === 'sq' ? 'krijo albumin tënd falas →' : 'create your photobook free →'}
            </motion.button>
          </Link>
          <p className="mt-5 text-[11px] text-neutral-400">
            {lang === 'sq' ? 'Nga 3,100 LEK · Dërgim falas mbi 5,000 LEK' : 'From 3,100 LEK · Free delivery over 5,000 LEK'}
          </p>
        </div>
      </section>

    </MarketingLayout>
  );
}
