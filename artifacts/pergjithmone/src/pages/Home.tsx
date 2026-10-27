import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOMeta } from '@/components/SEOMeta';
import { Link } from 'wouter';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useListCategories, useGetAppSettings } from '@workspace/api-client-react-tsconfig';
import {
  CAT_IMG_BY_SLUG,
  DEFAULT_CATEGORIES,
  getCategoryImage,
  getCategorySpine,
  getCategorySublabel,
} from '@/lib/categoryImages';
import {
  DESIGNS, DESIGN_W, DESIGN_H, designFrontElements,
  buildDesignCatalog, parseCustomDesigns, type DesignDef,
} from '@/lib/designs';
import { PageThumb, ResponsivePageThumb } from '@/components/PageThumb';
import { CategoryCoverImg } from '@/components/CategoryCoverImg';
import { ensureEditorFonts } from '@/lib/editorFonts';
import { usePageFields } from '@/components/marketing/PageContent';
import { LivePageRoot } from '@/components/marketing/LivePageRoot';
import { Editable, EditableSection } from '@/components/marketing/Editable';

// ── Hero + album starter (CSS 3D book — no WebGL) ─────────────────────────────

type AlbumStyle = {
  key: string;
  label: { sq: string; en: string };
  line: { sq: string; en: string };
  designId: string;
  spine: string;
  img: string;
  /** Light hero base — paper white with a hint of the cover */
  wash: string;
  ambient: string;
  /** Soft paper wash for the starter section */
  paper: string;
  ink: string;
};

const ALBUM_STYLES: AlbumStyle[] = [
  {
    key: 'dasme',
    label: { sq: 'Dasmë', en: 'Wedding' },
    line: {
      sq: 'Një ditë. Një libër. Për gjithmonë.',
      en: 'One day. One book. Forever yours.',
    },
    designId: 'cream-names',
    spine: '#8B6F47',
    img: CAT_IMG_BY_SLUG.dasme,
    wash: '#F7F3EE',
    ambient: '#E8D5C4',
    paper: '#F3EDE6',
    ink: '#2A2218',
  },
  {
    key: 'udhetime',
    label: { sq: 'Udhëtime', en: 'Travel' },
    line: {
      sq: 'Shkoni larg. Mbajini afër.',
      en: 'Go far. Keep it close.',
    },
    designId: 'paris-pink',
    spine: '#C45A78',
    img: CAT_IMG_BY_SLUG.udhetime,
    wash: '#F8F3F5',
    ambient: '#F0D0DA',
    paper: '#F8E8EE',
    ink: '#3A1828',
  },
  {
    key: 'familje',
    label: { sq: 'Familje', en: 'Family' },
    line: {
      sq: 'Vitet e vogla. Libër i madh.',
      en: 'Little years. Big book.',
    },
    designId: 'baby-ador',
    spine: '#6A8490',
    img: CAT_IMG_BY_SLUG.familje,
    wash: '#F4F6F7',
    ambient: '#D4E0E4',
    paper: '#E8EEF0',
    ink: '#1E2A30',
  },
  {
    key: 'miqesi',
    label: { sq: 'Miqësi', en: 'Friendship' },
    line: {
      sq: 'Miqësia që nuk zbehet.',
      en: 'Friendship that doesn’t fade.',
    },
    designId: 'friends-forever',
    spine: '#1A3A42',
    img: CAT_IMG_BY_SLUG.miqesi,
    wash: '#F3F6F7',
    ambient: '#D0E0E4',
    paper: '#E4EEF0',
    ink: '#142428',
  },
  {
    key: 'festash',
    label: { sq: 'Festash', en: 'Celebrate' },
    line: {
      sq: 'Festa mbaron. Libri mbetet.',
      en: 'The party ends. The book stays.',
    },
    designId: 'birthday-bloom',
    spine: '#C45A72',
    img: CAT_IMG_BY_SLUG.festash,
    wash: '#F8F3F4',
    ambient: '#F0D4DA',
    paper: '#F6E6EA',
    ink: '#2A1418',
  },
];

/** Wider Unsplash crop for full-bleed hero BGs. */
function heroBgUrl(src: string): string {
  try {
    const u = new URL(src);
    if (!u.hostname.includes('unsplash.com')) return src;
    u.searchParams.set('w', '1600');
    u.searchParams.set('q', '75');
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'crop');
    return u.toString();
  } catch {
    return src;
  }
}

function useLiveDesign(id: string): DesignDef | undefined {
  const { data: settings } = useGetAppSettings();
  return useMemo(() => {
    const catalog = buildDesignCatalog(
      (settings as any)?.designOverrides,
      parseCustomDesigns((settings as any)?.customDesigns),
    );
    return catalog.find(d => d.id === id) ?? DESIGNS.find(d => d.id === id);
  }, [id, settings]);
}

const HERO_CYCLE_MS = 3800;

function createAlbumCta(lang: 'sq' | 'en', label: string): string {
  return lang === 'sq' ? `Krijo Album ${label}` : `Create ${label} album`;
}

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

/** CSS 3D photobook — angled to show spine, page block, gloss, idle float. */
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
  const [hovering, setHovering] = useState(false);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Base pose faces left so the spine + page edge read as a real book.
  const baseYaw = size === 'hero' ? -36 : -18;
  const basePitch = size === 'hero' ? 10 : 5;
  const rotY = useSpring(
    useTransform(mx, [-1, 1], [baseYaw - 10, baseYaw + 20]),
    { stiffness: 130, damping: 22, mass: 0.4 },
  );
  const rotX = useSpring(
    useTransform(my, [-1, 1], [basePitch + 6, basePitch - 8]),
    { stiffness: 130, damping: 22, mass: 0.4 },
  );

  const liveDesign = useLiveDesign(style.designId);
  const coverEls = useMemo(
    () => (liveDesign ? designFrontElements(liveDesign) : []),
    [liveDesign],
  );

  const [coverSize, setCoverSize] = useState({ w: 0, h: 0 });
  const coverFaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = coverFaceRef.current;
    if (!el) return;
    let tries = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      // Use untransformed layout size (offset*) so thumbs aren't skewed by 3D rotate.
      const w = Math.round(el.offsetWidth || r.width);
      const h = Math.round(el.offsetHeight || r.height);
      if (w > 0 && h > 0) {
        setCoverSize({ w, h });
        return;
      }
      if (tries++ < 24) requestAnimationFrame(measure);
    };
    measure();
    const ro = new ResizeObserver(() => {
      tries = 0;
      measure();
    });
    ro.observe(el);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [style.designId, size]);

  useEffect(() => { void ensureEditorFonts(); }, []);

  useEffect(() => {
    for (const el of coverEls) {
      if ((el.type === 'image' || el.type === 'background') && el.src) {
        const img = new Image();
        img.src = el.src;
      }
    }
  }, [coverEls]);

  const spineD = size === 'hero' ? 18 : 12;
  const pageBlock = size === 'hero' ? 10 : 7;
  const maxW = size === 'hero' ? 380 : 220;

  const onMove = (e: React.MouseEvent) => {
    if (!interactive || reduced || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
    setHovering(false);
  };

  const coverBg = (liveDesign?.thumb?.background as string) || '#1a1410';
  const usePointerTilt = interactive && !reduced && hovering;
  const idleClass = size === 'hero' ? 'book-idle-yaw' : 'book-idle-yaw-starter';

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={onLeave}
      className={`relative mx-auto ${!reduced ? 'book-float' : ''}`}
      style={{
        // Exact catalog aspect — stops paper letterboxing under the cover art
        width: `min(${size === 'hero' ? '70vw' : '48vw'}, ${maxW}px)`,
        aspectRatio: `${DESIGN_W} / ${DESIGN_H}`,
        maxWidth: maxW,
        perspective: size === 'hero' ? 1800 : 1100,
        perspectiveOrigin: '42% 45%',
        touchAction: 'manipulation',
        paddingTop: size === 'hero' ? 18 : 10,
        paddingLeft: spineD * 0.55,
        paddingRight: pageBlock * 0.7,
      }}
    >
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 bottom-[-10%] w-[92%] h-[16%] rounded-[100%] blur-2xl opacity-60"
        style={{ background: size === 'hero'
          ? 'radial-gradient(ellipse, rgba(42, 34, 24, 0.16), transparent 72%)'
          : 'radial-gradient(ellipse, rgba(0,0,0,0.7), transparent 72%)' }}
      />

      <div
        className={!usePointerTilt && !reduced ? idleClass : undefined}
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: reduced
            ? `rotateY(${baseYaw}deg) rotateX(${basePitch}deg)`
            : undefined,
        }}
      >
        <motion.div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            rotateY: usePointerTilt ? rotY : 0,
            rotateX: usePointerTilt ? rotX : 0,
          }}
        >
          {/* Spine (left edge — facing viewer when yawed) */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: -spineD, top: 0,
              width: spineD, height: '100%',
              transformOrigin: 'right center',
              transform: 'rotateY(-90deg)',
              background: `linear-gradient(to right, ${style.spine}33, ${style.spine}, ${style.spine}aa)`,
              borderRadius: '3px 0 0 3px',
              boxShadow: 'inset -2px 0 5px rgba(0,0,0,0.35)',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0.05))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                writingMode: 'vertical-rl',
                fontSize: size === 'hero' ? 8 : 6,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.38)',
                fontWeight: 600,
              }}>
                përgjithmonë
              </span>
            </div>
          </div>

          {/* Page stack (right edge depth) — few leaves for a slim album */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              right: -pageBlock, top: '1.5%',
              width: pageBlock, height: '97%',
              transformOrigin: 'left center',
              transform: 'rotateY(90deg)',
              background: 'linear-gradient(to left, #b0aaa0, #f7f3eb 55%, #ebe6dc)',
              boxShadow: '2px 0 8px rgba(0,0,0,0.14)',
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{
                position: 'absolute', left: 0, right: 0,
                top: `${(i / 7) * 100}%`, height: 1,
                background: i % 2 === 0 ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.04)',
              }} />
            ))}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.28), transparent 60%)',
            }} />
          </div>

          {/* Cover face */}
          <div
            ref={coverFaceRef}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '0 5px 5px 0',
              overflow: 'hidden',
              boxShadow:
                '18px 28px 56px rgba(0,0,0,0.5), 6px 12px 22px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.14)',
              background: coverBg,
              transform: 'translateZ(1px)',
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={style.designId}
                initial={reduced ? { opacity: 1 } : { opacity: 0, rotateY: 16, scale: 1.04 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, rotateY: -12, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'absolute', inset: 0, transformOrigin: 'left center' }}
              >
                {coverEls.length > 0 && coverSize.w > 0 ? (
                  <PageThumb
                    elements={coverEls}
                    width={coverSize.w}
                    height={coverSize.h}
                    fit="width"
                    background={coverBg}
                  />
                ) : (
                  <img
                    src={style.img}
                    alt=""
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover', display: 'block',
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(115deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.04) 26%, transparent 46%), linear-gradient(to left, rgba(0,0,0,0.22), transparent 14%)',
              }}
            />
            {!reduced && (
              <div
                aria-hidden
                className="hero-sheen pointer-events-none absolute inset-y-0 w-[38%] opacity-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                }}
              />
            )}
          </div>

          {/* Back board */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '0 5px 5px 0',
              background: `linear-gradient(135deg, ${style.spine}ee, #14110e)`,
              transform: `translateZ(-${pageBlock + 2}px)`,
              boxShadow: 'inset 0 0 24px rgba(0,0,0,0.4)',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

function HeroAlbum({ lang }: { lang: 'sq' | 'en' }) {
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const p = usePageFields();
  const style = ALBUM_STYLES[idx];
  const liveLabel = (i: number) => p.txt(`styles.${i}.label`) || ALBUM_STYLES[i].label[lang];
  const liveLine = (i: number) => p.txt(`styles.${i}.line`) || ALBUM_STYLES[i].line[lang];
  const wallpaper = p.img(`styles.${idx}.wallpaper`, style.img);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (reduced || paused) return;
    const t = window.setTimeout(() => {
      setIdx(i => (i + 1) % ALBUM_STYLES.length);
    }, HERO_CYCLE_MS);
    return () => clearTimeout(t);
  }, [idx, reduced, paused]);

  // Prefetch next cover layout + hero background
  useEffect(() => {
    const next = ALBUM_STYLES[(idx + 1) % ALBUM_STYLES.length];
    const bg = new Image();
    bg.src = heroBgUrl(p.img(`styles.${(idx + 1) % ALBUM_STYLES.length}.wallpaper`, next.img));
    const d = DESIGNS.find(x => x.id === next.designId);
    const els = d ? designFrontElements(d) : [];
    // Builtin prefetch only — live overrides load with the settings query.
    for (const el of els) {
      if ((el.type === 'image' || el.type === 'background') && el.src) {
        const img = new Image();
        img.src = el.src;
      }
    }
  }, [idx]);

  useEffect(() => {
    for (const s of ALBUM_STYLES) {
      const img = new Image();
      img.src = heroBgUrl(s.img);
    }
  }, []);

  const go = (d: number) => {
    setIdx(i => (i + d + ALBUM_STYLES.length) % ALBUM_STYLES.length);
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        minHeight: 'min(100svh, 960px)',
        background: style.wash,
        transition: 'background-color 0.7s ease',
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
      {/* Atmosphere photo — soft texture behind the book, not a competing full-bleed */}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={`bg-${style.key}`}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <Editable path={`styles.${idx}.wallpaper`} kind="image" as="div" className="absolute inset-0">
          <img
            src={heroBgUrl(wallpaper)}
            alt=""
            decoding="async"
            fetchPriority="high"
            className={`absolute inset-0 h-full w-full object-cover ${reduced ? '' : 'hero-kenburns'}`}
            style={{
              objectPosition: '68% 35%',
              opacity: 0.42,
              filter: 'saturate(0.55) brightness(1.22) contrast(0.92)',
            }}
          />
          </Editable>
        </motion.div>
      </AnimatePresence>

      {/* Paper veil — bright left for type, airy right so the book sits on white */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            linear-gradient(105deg,
              ${style.wash} 0%,
              ${style.wash}f5 22%,
              ${style.wash}d8 40%,
              ${style.wash}88 56%,
              ${style.wash}33 74%,
              transparent 100%
            ),
            linear-gradient(to top, ${style.wash} 0%, ${style.wash}aa 16%, transparent 40%),
            radial-gradient(52% 48% at 82% 40%, ${style.ambient}66 0%, transparent 72%)
          `,
          transition: 'background 0.7s ease',
        }}
      />

      {/* Soft paper glow near the book — ties cover color into the room */}
      {!reduced && (
        <>
          <div
            aria-hidden
            className="hero-orb-a pointer-events-none absolute top-[4%] right-[-8%] w-[58%] h-[74%] rounded-full opacity-70 blur-3xl"
            style={{
              background: `radial-gradient(circle, #ffffff 0%, ${style.paper} 38%, transparent 70%)`,
              transition: 'background 0.7s ease',
            }}
          />
          <div
            aria-hidden
            className="hero-orb-b pointer-events-none absolute bottom-[-20%] left-[-12%] w-[52%] h-[52%] rounded-full opacity-50 blur-3xl"
            style={{
              background: `radial-gradient(circle, ${style.ambient} 0%, transparent 68%)`,
              transition: 'background 0.7s ease',
            }}
          />
          {[
            { t: '18%', l: '22%', d: '0s', s: 2 },
            { t: '28%', l: '68%', d: '1.4s', s: 3 },
            { t: '46%', l: '14%', d: '2.1s', s: 2 },
            { t: '62%', l: '78%', d: '0.7s', s: 2 },
            { t: '34%', l: '48%', d: '2.8s', s: 1 },
            { t: '72%', l: '36%', d: '1.1s', s: 2 },
            { t: '22%', l: '86%', d: '3.2s', s: 3 },
            ].map((spark, i) => (
            <span
              key={i}
              aria-hidden
              className="hero-dust pointer-events-none absolute rounded-full"
              style={{
                top: spark.t,
                left: spark.l,
                width: spark.s,
                height: spark.s,
                background: style.spine,
                animationDelay: spark.d,
                boxShadow: `0 0 ${spark.s * 4}px ${style.spine}88`,
              }}
            />
          ))}
        </>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '180px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-10 pt-6 pb-16 md:pt-16 md:pb-20 min-h-[inherit] flex flex-col justify-center">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-6 md:gap-8 lg:gap-12 md:items-center">
          {/* Copy — headline first, brand second */}
          <div className="order-2 md:order-1 md:col-start-1 text-center md:text-left">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mb-4 md:mb-5 text-[10px] md:text-[11px] tracking-[0.34em] uppercase"
              style={{ color: `${style.ink}7a` }}
            >
              ✦ <Editable path="hero.eyebrow">{p.txt('hero.eyebrow')}</Editable>
            </motion.p>

            <h1 className="font-serif text-[clamp(2.15rem,6.4vw,4.35rem)] leading-[0.98] tracking-[-0.03em] font-medium mb-2 md:mb-3" style={{ color: style.ink }}>
              <Editable path="hero.headline">
              {p.txt('hero.headline').split(' ').map((word, i, words) => (
                <motion.span
                  key={`${word}-${i}`}
                  initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, delay: 0.08 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className={`inline-block${i < words.length - 1 ? ' mr-[0.22em]' : ''}`}
                >
                  {word}
                </motion.span>
              ))}
              </Editable>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={`font-serif text-[clamp(1.35rem,3.1vw,2.15rem)] leading-none tracking-[-0.01em] mb-3 md:mb-4 ${reduced ? '' : 'hero-word-shine'}`}
              style={{
                backgroundImage: `linear-gradient(90deg, ${style.ink}55, ${style.spine}, ${style.ink}55)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              <Editable path="hero.brand">{p.txt('hero.brand')}</Editable>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto md:mx-0 mb-4 md:mb-5 h-px w-16 origin-center md:origin-left"
              style={{ background: `linear-gradient(90deg, ${style.ink}00, ${style.spine}aa, ${style.ink}00)` }}
            />

            <div className="relative mb-4 md:mb-6 min-h-[1.5em]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={style.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="text-[14px] md:text-[16px] leading-snug font-serif italic"
                  style={{ color: `${style.ink}99` }}
                >
                  <Editable path={`styles.${idx}.line`}>{liveLine(idx)}</Editable>
                </motion.p>
              </AnimatePresence>
            </div>

            <p
              className="hidden md:block text-[15px] max-w-sm mx-auto md:mx-0 leading-relaxed mb-8"
              style={{ color: `${style.ink}99` }}
            >
              <Editable path="hero.sub">{p.txt('hero.sub')}</Editable>
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 md:gap-3">
              <Link href={`/krijo?category=${encodeURIComponent(style.key)}&design=${encodeURIComponent(style.designId)}`}>
                <motion.button
                  whileHover={reduced ? undefined : { scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden px-8 md:px-9 py-3.5 md:py-4 rounded-full text-[12.5px] md:text-[13px] font-semibold tracking-[0.04em]"
                  style={{
                    background: style.ink,
                    color: '#fff',
                    boxShadow: `0 14px 36px ${style.ink}22, 0 0 0 1px ${style.ink}14`,
                  }}
                >
                  {!reduced && (
                    <span
                      aria-hidden
                      className="hero-sheen pointer-events-none absolute inset-y-0 w-[42%] opacity-0"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                      }}
                    />
                  )}
                  <Editable path="hero.cta">{p.txt('hero.cta')}</Editable>
                </motion.button>
              </Link>
              <Link href="/shembuj">
                <button
                  className="px-6 py-3.5 text-[12.5px] border rounded-full transition-colors backdrop-blur-sm"
                  style={{
                    color: style.ink,
                    borderColor: `${style.ink}22`,
                    background: 'rgba(255,255,255,0.55)',
                  }}
                >
                  <Editable path="hero.secondaryCta">{p.txt('hero.secondaryCta')}</Editable>
                </button>
              </Link>
            </div>

            <div className="mt-7 md:mt-11 flex flex-wrap items-center justify-center md:justify-start gap-x-0.5 gap-y-0.5 max-w-md mx-auto md:mx-0">
              {ALBUM_STYLES.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={liveLabel(i)}
                  aria-current={i === idx}
                  className="relative h-7 md:h-8 px-2 md:px-2.5 text-[9px] md:text-[10px] tracking-[0.12em] uppercase transition-colors"
                  style={{
                    color: i === idx ? style.ink : `${style.ink}55`,
                  }}
                >
                  <Editable path={`styles.${i}.label`}>{liveLabel(i)}</Editable>
                  {i === idx && (
                    <motion.span
                      layoutId="hero-style-underline"
                      className="absolute left-2 right-2 md:left-2.5 md:right-2.5 bottom-0.5 md:bottom-1 h-px"
                      style={{ background: style.spine }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 3D book — first on mobile so the hero reads as one composition */}
          <div className="order-1 md:order-2 md:col-start-2 md:row-start-1 flex flex-col items-center justify-center pt-8 pb-3 md:py-0 md:pl-2">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 56, scale: 0.84, rotate: 4 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[78%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                style={{
                  background: `radial-gradient(circle, #ffffffcc 0%, ${style.ambient}88 42%, transparent 72%)`,
                  transition: 'background 0.7s ease',
                }}
              />
              <LivingAlbumBook style={style} size="hero" />
            </motion.div>
            <div className="mt-3 flex items-center gap-4 md:hidden">
              <button
                type="button"
                onClick={() => go(-1)}
                className="w-8 h-8 rounded-full text-base leading-none"
                style={{ border: `1px solid ${style.ink}22`, color: `${style.ink}99` }}
                aria-label="Previous"
              >‹</button>
              <span
                className="text-[10px] tracking-[0.2em] tabular-nums"
                style={{ color: `${style.ink}55` }}
              >
                {String(idx + 1).padStart(2, '0')} / {String(ALBUM_STYLES.length).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => go(1)}
                className="w-8 h-8 rounded-full text-base leading-none"
                style={{ border: `1px solid ${style.ink}22`, color: `${style.ink}99` }}
                aria-label="Next"
              >›</button>
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: `radial-gradient(120% 80% at 50% 42%, transparent 55%, ${style.wash}cc 100%)`,
        }}
      />

      <div
        className={`pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-1.5 ${reduced ? '' : 'hero-scroll-cue'}`}
        style={{ color: `${style.ink}66` }}
      >
        <span className="text-[9px] tracking-[0.32em] uppercase">
          <Editable path="hero.explore">{p.txt('hero.explore')}</Editable>
        </span>
        <span aria-hidden className="block h-7 w-px" style={{ background: `${style.ink}44` }} />
      </div>
    </section>
  );
}

function AlbumStarter({ lang }: { lang: 'sq' | 'en' }) {
  const [idx, setIdx] = useState(0);
  const p = usePageFields();
  const style = ALBUM_STYLES[idx];
  const href = `/krijo?category=${encodeURIComponent(style.key)}&design=${encodeURIComponent(style.designId)}`;
  const { data: settings } = useGetAppSettings();
  const liveLabel = (i: number) => p.txt(`styles.${i}.label`) || ALBUM_STYLES[i].label[lang];
  const liveLine = (i: number) => p.txt(`styles.${i}.line`) || ALBUM_STYLES[i].line[lang];

  const coverElsById = useMemo(() => {
    const catalog = buildDesignCatalog(
      (settings as any)?.designOverrides,
      parseCustomDesigns((settings as any)?.customDesigns),
    );
    const map: Record<string, ReturnType<typeof designFrontElements>> = {};
    for (const s of ALBUM_STYLES) {
      const d = catalog.find(x => x.id === s.designId) ?? DESIGNS.find(x => x.id === s.designId);
      map[s.designId] = d ? designFrontElements(d) : [];
    }
    return map;
  }, [settings]);

  return (
    <section
      className="relative overflow-x-clip"
      style={{
        background: `linear-gradient(180deg, ${style.paper} 0%, #F7F4EF 52%, #F3EFE9 100%)`,
        transition: 'background 0.5s ease',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${style.spine}55, transparent)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[70%] h-[50%] rounded-full blur-3xl opacity-40"
        style={{
          background: `radial-gradient(circle, ${style.spine}22, transparent 70%)`,
          transition: 'background 0.5s ease',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-5 md:px-10 pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="text-center mb-10 md:mb-12">
          <h2
            className="font-serif text-[clamp(1.9rem,4.2vw,2.75rem)] font-medium leading-[1.12] tracking-[-0.02em] mb-3"
            style={{ color: style.ink }}
          >
            <Editable path="starter.title">{p.txt('starter.title')}</Editable>
          </h2>
          <p
            className="text-[14px] md:text-[15px] leading-relaxed max-w-md mx-auto"
            style={{ color: `${style.ink}90` }}
          >
            <Editable path="starter.sub">{p.txt('starter.sub')}</Editable>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-10 md:gap-14 md:items-center">
          {/* Live preview — larger on desktop */}
          <div className="flex flex-col items-center order-2 md:order-1">
            <LivingAlbumBook style={style} size="starter" interactive={false} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={style.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="mt-5 text-[13px] md:text-[14px] text-center max-w-[16rem] leading-snug"
                style={{ color: `${style.ink}88` }}
              >
                <Editable path={`styles.${idx}.line`}>{liveLine(idx)}</Editable>
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Style selection — bigger cards */}
          <div className="order-1 md:order-2">
            <div
              role="listbox"
              aria-label={p.txt('starter.title')}
              className="flex md:grid md:grid-cols-5 gap-3.5 md:gap-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory pt-2 pb-3 md:pt-0 md:pb-0 -mx-1 px-1 scrollbar-thin"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {ALBUM_STYLES.map((s, i) => {
                const active = i === idx;
                const els = coverElsById[s.designId] || [];
                return (
                  <div
                    key={s.key}
                    role="option"
                    aria-selected={active}
                    tabIndex={0}
                    onClick={() => setIdx(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIdx(i);
                      }
                    }}
                    className="group flex flex-col items-center gap-2.5 shrink-0 snap-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-md w-[132px] md:w-auto cursor-pointer"
                    style={{ ['--tw-ring-color' as string]: style.ink }}
                  >
                    <div
                      className="relative overflow-hidden w-[132px] h-[176px] md:w-full md:h-auto md:aspect-[3/4]"
                      style={{
                        borderRadius: 5,
                        boxShadow: active
                          ? `0 14px 32px ${s.spine}45, 0 0 0 2px ${style.ink}`
                          : '0 4px 16px rgba(0,0,0,0.10)',
                        opacity: active ? 1 : 0.72,
                        transform: active ? 'translateY(-2px)' : 'none',
                        transition: 'box-shadow 0.22s ease, opacity 0.22s ease, transform 0.22s ease',
                      }}
                    >
                      {els.length > 0 ? (
                        <ResponsivePageThumb
                          elements={els}
                          className="absolute inset-0"
                          style={{ background: String(s.spine) }}
                        />
                      ) : (
                        <div className="absolute inset-0" style={{ background: s.spine }} />
                      )}
                    </div>
                    <span
                      className="text-[12px] md:text-[12.5px] tracking-[0.03em] leading-tight text-center px-0.5"
                      style={{
                        color: active ? style.ink : `${style.ink}78`,
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      <Editable path={`styles.${i}.label`}>{liveLabel(i)}</Editable>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 md:mt-10 flex flex-col items-stretch md:items-start gap-3">
              <Link href={href} className="w-full md:w-auto">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="w-full md:w-auto px-9 py-4 text-white text-[13px] font-semibold rounded-full"
                  style={{
                    background: style.ink,
                    boxShadow: `0 12px 28px ${style.spine}35`,
                  }}
                >
                  {createAlbumCta(lang, liveLabel(idx))}
                </motion.button>
              </Link>
              <Link
                href="/krijo"
                className="text-[13px] text-center md:text-left underline underline-offset-4 decoration-black/15 hover:decoration-black/40 self-center md:self-start"
                style={{ color: `${style.ink}75` }}
              >
                <Editable path="starter.browse">{p.txt('starter.browse')}</Editable>
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
    title: { sq: 'Lidhje e sheshtë', en: 'Lay-flat binding' },
    desc: { sq: 'Hapet fare, pa humbje të fotos', en: 'Full open, no image loss' },
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
  const [canTilt, setCanTilt] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const apply = () => setCanTilt(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canTilt) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    y.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <Link href={`/krijo?category=${encodeURIComponent(cat.key)}`} className="block w-full">
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer select-none w-full"
        style={canTilt ? { perspective: '900px' } : undefined}
      >
        <motion.div
          style={canTilt ? { rotateY, rotateX, transformStyle: 'preserve-3d' } : undefined}
          whileHover={canTilt ? { scale: 1.015 } : undefined}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="group relative rounded-2xl overflow-hidden"
        >
          {/* Image */}
          <div
            className={`relative overflow-hidden ${featured ? 'aspect-[3/4] md:aspect-auto md:h-full' : 'aspect-[3/4]'}`}
            style={featured ? { minHeight: 360 } : { minHeight: 220 }}
          >
            <CategoryCoverImg
              nameAl={cat.label.sq}
              coverImage={cat.img}
              slug={cat.key}
              alt={cat.label[lang]}
              className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
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
                  {lang === 'sq' ? `Krijo Album ${cat.label.sq}` : `Create ${cat.label.en}`}
                </span>
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
                  <span className="text-white text-[11px] font-semibold">{lang === 'sq' ? 'nga 3.100 LEK' : 'from 3,100 LEK'}</span>
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

function AIAlbumPromo() {
  const p = usePageFields();
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
              ✦ <Editable path="ai.badge">{p.txt('ai.badge')}</Editable>
            </div>
            <h2 className="text-2xl md:text-[32px] font-serif font-medium text-white leading-tight mb-3">
              <Editable path="ai.title">{p.txt('ai.title')}</Editable>
            </h2>
            <p className="text-white/50 text-[13.5px] leading-relaxed">
              <Editable path="ai.body">{p.txt('ai.body')}</Editable>
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end justify-center gap-3 shrink-0">
            <Link href="/album-ai">
              <button className="px-8 py-3.5 bg-white text-[#141311] rounded-full text-[12.5px] font-semibold hover:bg-neutral-100 active:scale-[0.97] transition-all shadow-xl shadow-black/30">
                <Editable path="ai.cta">{p.txt('ai.cta')}</Editable>
              </button>
            </Link>
            <p className="text-white/30 text-[11px]">
              <Editable path="ai.note">{p.txt('ai.note')}</Editable>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <LivePageRoot slug="home">
      <HomeView />
    </LivePageRoot>
  );
}

function HomeView() {
  const { lang } = useLanguage();
  const p = usePageFields();
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
      badge: i === 0 ? { sq: 'më i shituri', en: 'bestseller' } : null,
      pages: { sq: '30–80 faqe', en: '30–80 pages' },
    }));
  }, [apiCategories]);

  const tickerItems = [
    ...p.list('ticker').map((_, i) => p.txt(`ticker.${i}`)),
    '✦',
  ];

  const steps = p.list('process.steps').map((_, i) => ({
    n: String(i + 1).padStart(2, '0'),
    titlePath: `process.steps.${i}.title`,
    descPath: `process.steps.${i}.desc`,
    detailPath: `process.steps.${i}.detail`,
  }));

  return (
    <MarketingLayout>
      <SEOMeta
        title={p.txtAll('seo.title')}
        description={p.txtAll('seo.description')}
        path="/"
        ogImage={{ sq: '/og-home-sq.jpg', en: '/og-home-en.jpg' }}
        schemaType="WebSite"
      />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <EditableSection path="hero">
        <HeroAlbum lang={lang} />
      </EditableSection>

      {/* ── 3D BOOK SHOWCASE ─────────────────────────────────────────── */}
      <EditableSection path="starter">
        <AlbumStarter lang={lang} />
      </EditableSection>

      {/* ── TICKER ───────────────────────────────────────────────────── */}
      <Editable path="ticker" kind="slider" as="div" className="bg-[#f7f4f0] border-y border-neutral-200/70 py-3.5 overflow-hidden">
        <Ticker items={tickerItems} />
      </Editable>

      {/* ── AI ALBUM PROMO ───────────────────────────────────────────── */}
      <EditableSection path="ai">
        <AIAlbumPromo />
      </EditableSection>

      {/* ── CATEGORY SECTION ─────────────────────────────────────────── */}
      <EditableSection path="categories" className="py-20 md:py-28 bg-[#f7f4f0]">
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
                  <Editable path="categories.kicker">{p.txt('categories.kicker')}</Editable>
                </p>
                <h2 className="text-4xl md:text-5xl font-serif font-medium text-neutral-900 leading-tight">
                  <Editable path="categories.title">{p.txt('categories.title')}</Editable>
                </h2>
              </div>
              <Link
                href="/krijo"
                className="hidden md:flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-neutral-400 hover:text-neutral-900 transition-colors group shrink-0 mb-2"
              >
                <span><Editable path="categories.all">{p.txt('categories.all')}</Editable></span>
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
                className="snap-center shrink-0 w-[72vw] max-w-[260px]"
                style={{ touchAction: 'pan-x' }}
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
      </EditableSection>

      {/* ── SPREAD PREVIEW ───────────────────────────────────────────── */}
      <EditableSection path="spread" className="py-20 md:py-28 bg-white border-t border-neutral-100 overflow-hidden">
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
                <Editable path="spread.kicker">{p.txt('spread.kicker')}</Editable>
              </p>
              <h2 className="text-4xl font-serif font-medium text-neutral-900 leading-tight mb-5">
                <Editable path="spread.title">{p.txt('spread.title')}</Editable>
              </h2>
              <p className="text-neutral-500 text-[14px] leading-relaxed mb-8 max-w-sm">
                <Editable path="spread.body">{p.txt('spread.body')}</Editable>
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-xs">
                {p.list('spread.stats').map((_, i) => (
                  <div key={i} className="bg-[#f7f4f0] rounded-xl p-4 border border-neutral-100">
                    <p className="text-2xl font-serif font-medium text-neutral-900">
                      <Editable path={`spread.stats.${i}.num`}>{p.txt(`spread.stats.${i}.num`)}</Editable>
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      <Editable path={`spread.stats.${i}.label`}>{p.txt(`spread.stats.${i}.label`)}</Editable>
                    </p>
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
                    <Editable path="spread.photos.a" kind="image" as="div" className="w-full h-full col-span-1">
                    <img
                      src={p.img('spread.photos.a', 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80&fit=crop')}
                      className="w-full h-full object-cover rounded-sm"
                      alt=""
                    />
                    </Editable>
                    <div className="flex flex-col gap-2">
                      <Editable path="spread.photos.b" kind="image" as="div" className="w-full flex-1">
                      <img
                        src={p.img('spread.photos.b', 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=300&q=80&fit=crop')}
                        className="w-full h-full object-cover rounded-sm"
                        alt=""
                      />
                      </Editable>
                      <Editable path="spread.photos.c" kind="image" as="div" className="w-full flex-1">
                      <img
                        src={p.img('spread.photos.c', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=80&fit=crop')}
                        className="w-full h-full object-cover rounded-sm"
                        alt=""
                      />
                      </Editable>
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
                  <Editable path="spread.photos.d" kind="image" as="div" className="w-full flex-1">
                  <img
                    src={p.img('spread.photos.d', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80&fit=crop')}
                    className="w-full h-full object-cover rounded-sm"
                    alt=""
                  />
                  </Editable>
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
                  <Editable path="spread.tag">{p.txt('spread.tag')}</Editable>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </EditableSection>

      {/* ── MATERIALS ────────────────────────────────────────────────── */}
      <EditableSection path="materials" className="py-20 bg-[#f7f4f0] border-t border-neutral-200/70">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="flex items-center justify-between mb-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400">
              <Editable path="materials.kicker">{p.txt('materials.kicker')}</Editable>
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
                <h4 className="font-medium text-[13px] text-neutral-900 mb-1">
                  <Editable path={`materials.items.${i}.title`}>{p.txt(`materials.items.${i}.title`) || m.title[lang]}</Editable>
                </h4>
                <p className="text-[12px] text-neutral-400 leading-relaxed">
                  <Editable path={`materials.items.${i}.desc`}>{p.txt(`materials.items.${i}.desc`) || m.desc[lang]}</Editable>
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </EditableSection>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <EditableSection path="process" className="py-20 md:py-28 bg-white border-t border-neutral-100">
        <div className="max-w-5xl mx-auto px-5 md:px-10">
          <div className="text-center mb-14">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">
              <Editable path="process.kicker">{p.txt('process.kicker')}</Editable>
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-medium text-neutral-900">
              <Editable path="process.title">{p.txt('process.title')}</Editable>
            </h2>
          </div>

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
                        <Editable path={step.titlePath}>{p.txt(step.titlePath)}</Editable>
                      </h3>
                      <svg
                        width="16" height="16" viewBox="0 0 16 16"
                        className={`shrink-0 transition-transform duration-200 text-neutral-400 ${activeStep === i ? 'rotate-45' : ''}`}
                        fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                      >
                        <path d="M8 3v10M3 8h10"/>
                      </svg>
                    </div>
                    <p className="text-neutral-400 text-[13px] mt-1.5">
                      <Editable path={step.descPath}>{p.txt(step.descPath)}</Editable>
                    </p>
                    <AnimatePresence>
                      {activeStep === i && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden text-[13px] text-neutral-600 leading-relaxed mt-3 max-w-xl"
                        >
                          <Editable path={step.detailPath}>{p.txt(step.detailPath)}</Editable>
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
                <Editable path="process.cta">{p.txt('process.cta')}</Editable>
              </button>
            </Link>
            <span className="text-[12px] text-neutral-400">
              <Editable path="process.note">{p.txt('process.note')}</Editable>
            </span>
          </div>
        </div>
      </EditableSection>

      {/* ── TESTIMONIAL ──────────────────────────────────────────────── */}
      <EditableSection path="testimonial" className="py-24 md:py-32 bg-[#1a1a1a] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-white/[0.02] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-white/[0.02] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="max-w-3xl mx-auto px-5 md:px-10 text-center relative z-10">
          <div className="flex justify-center mb-8">
            <span className="text-white/20 font-serif text-5xl leading-none">"</span>
          </div>
          <blockquote className="text-2xl md:text-[32px] font-serif font-light leading-snug text-white/88 mb-10">
            <Editable path="testimonial.quote" as="span">{p.txt('testimonial.quote')}</Editable>
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <Editable path="testimonial.photo" kind="image" as="div">
            <img
              src={p.img('testimonial.photo', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&fit=crop&crop=face')}
              className="w-10 h-10 rounded-full object-cover opacity-70"
              alt=""
            />
            </Editable>
            <div className="text-left">
              <p className="text-white/65 text-[13px] font-medium">
                <Editable path="testimonial.name">{p.txt('testimonial.name')}</Editable>
              </p>
              <p className="text-white/28 text-[11px] mt-0.5">
                <Editable path="testimonial.place">{p.txt('testimonial.place')}</Editable>
              </p>
            </div>
          </div>
        </div>
      </EditableSection>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <EditableSection path="cta" className="py-24 md:py-32 bg-[#f7f4f0] border-t border-neutral-200 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
          <span className="font-serif text-[320px] font-medium text-neutral-900 leading-none">P</span>
        </div>

        <div className="max-w-xl mx-auto px-5 text-center relative z-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-5">
            <Editable path="cta.kicker">{p.txt('cta.kicker')}</Editable>
          </p>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-neutral-900 leading-tight mb-5">
            <Editable path="cta.title">{p.txt('cta.title')}</Editable>
          </h2>
          <p className="text-neutral-500 text-[14px] leading-relaxed mb-10 max-w-sm mx-auto">
            <Editable path="cta.body">{p.txt('cta.body')}</Editable>
          </p>
          <Link href="/krijo">
            <motion.button
              className="px-10 py-4 bg-[#1a1a1a] text-white rounded-full text-[13px] font-medium hover:bg-neutral-800 transition-colors shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Editable path="cta.button">{p.txt('cta.button')}</Editable>
            </motion.button>
          </Link>
          <p className="mt-5 text-[11px] text-neutral-400">
            <Editable path="cta.note">{p.txt('cta.note')}</Editable>
          </p>
        </div>
      </EditableSection>

    </MarketingLayout>
  );
}
