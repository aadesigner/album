import React, { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export const DARK = '#1a1410';
export const INK = '#2A2218';
export const PAPER = '#f7f4f0';

export const STAGE_PHOTOS = [
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=84&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=84&fit=crop',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=84&fit=crop',
  'https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=800&q=84&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=84&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=84&fit=crop',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=84&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=84&fit=crop',
];

export const LIFE_PHOTOS = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=900&q=84&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=900&q=84&fit=crop',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=84&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=900&q=84&fit=crop',
];

const GRAIN =
  'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")';

export function usePrefersReducedMotion() {
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

export function DarkAtmosphere({ photo, reduced }: { photo?: string; reduced?: boolean }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(110% 70% at 50% -10%, #3a2c24 0%, #241c16 42%, #1a1410 100%)',
        }}
      />
      {photo && (
        <img
          src={photo}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: 0.28,
            filter: 'blur(36px) saturate(0.55) brightness(0.72)',
            transform: 'scale(1.18)',
          }}
        />
      )}
      <div
        aria-hidden
        className={`${reduced ? '' : 'ai-orb-a'} pointer-events-none absolute -top-[12%] left-[8%] h-[58%] w-[52%] rounded-full opacity-70 blur-3xl`}
        style={{ background: 'radial-gradient(circle, rgba(212,168,112,0.28) 0%, transparent 68%)' }}
      />
      <div
        aria-hidden
        className={`${reduced ? '' : 'ai-orb-b'} pointer-events-none absolute -bottom-[18%] right-[-8%] h-[62%] w-[58%] rounded-full opacity-60 blur-3xl`}
        style={{ background: 'radial-gradient(circle, rgba(140,72,64,0.22) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.11]"
        style={{ backgroundImage: GRAIN, backgroundSize: '180px' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 42%, transparent 28%, rgba(12,8,6,0.55) 100%)',
        }}
      />
    </>
  );
}

export function PolaroidPrint({
  src, className, tilt, delay, reduced,
}: { src: string; className: string; tilt: string; delay: string; reduced: boolean }) {
  return (
    <div
      className={`${reduced ? '' : 'ai-polaroid'} absolute z-[1] bg-[#f3eee7] p-[3px] shadow-[0_18px_40px_rgba(0,0,0,0.35)] ${className}`}
      style={{ ['--tilt' as string]: tilt, animationDelay: delay, transform: `rotate(${tilt})` }}
    >
      <img src={src} alt="" className="block w-full aspect-[3/4] object-cover" />
    </div>
  );
}

export function PolaroidField({ reduced, photos = STAGE_PHOTOS }: { reduced: boolean; photos?: string[] }) {
  const p = photos;
  return (
    <>
      <PolaroidPrint src={p[0]} className="top-[7%] left-[2%] sm:left-[5%] w-[68px] sm:w-[100px]" tilt="-13deg" delay="0s" reduced={reduced} />
      <PolaroidPrint src={p[1]} className="top-[9%] right-[2%] sm:right-[6%] w-[62px] sm:w-[88px]" tilt="10deg" delay="0.7s" reduced={reduced} />
      <PolaroidPrint src={p[2]} className="hidden md:block top-[38%] left-[2%] w-[78px]" tilt="7deg" delay="1.2s" reduced={reduced} />
      <PolaroidPrint src={p[3]} className="hidden md:block top-[42%] right-[3%] w-[86px]" tilt="-8deg" delay="1.8s" reduced={reduced} />
      <PolaroidPrint src={p[4]} className="bottom-[18%] left-[8%] sm:left-[14%] w-[56px] sm:w-[72px]" tilt="-6deg" delay="0.4s" reduced={reduced} />
      <PolaroidPrint src={p[5]} className="bottom-[16%] right-[8%] sm:right-[15%] w-[58px] sm:w-[76px]" tilt="8deg" delay="1.4s" reduced={reduced} />
    </>
  );
}

export function FilmMarquee({ photos = LIFE_PHOTOS }: { photos?: string[] }) {
  const strip = [...photos, ...photos];
  return (
    <div className="relative overflow-hidden border-t border-white/10" aria-hidden>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-[#110e0c] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-[#110e0c] to-transparent" />
      <div className="ai-film flex w-max gap-1.5 py-3 pl-1.5">
        {strip.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            className="block h-[84px] w-[64px] sm:h-[104px] sm:w-[78px] object-cover rounded-[2px] opacity-85"
          />
        ))}
      </div>
    </div>
  );
}

export function PhotoRiver({ photos = LIFE_PHOTOS }: { photos?: string[] }) {
  const a = [...photos, ...photos];
  const b = [...photos.slice(6), ...photos.slice(0, 6), ...photos.slice(6), ...photos.slice(0, 6)];
  return (
    <div className="relative py-5 md:py-7 overflow-hidden" style={{ background: DARK }} aria-hidden>
      <DarkAtmosphere photo={photos[4]} />
      <div className="relative z-[1]">
        <div className="ai-film-slow flex w-max gap-2 md:gap-2.5 mb-2 md:mb-2.5">
          {a.map((src, i) => (
            <img
              key={`a-${i}`}
              src={src}
              alt=""
              className="block h-32 sm:h-44 md:h-56 w-auto aspect-[4/5] object-cover rounded-[2px]"
            />
          ))}
        </div>
        <div className="ai-film-rev flex w-max gap-2 md:gap-2.5">
          {b.map((src, i) => (
            <img
              key={`b-${i}`}
              src={src}
              alt=""
              className="block h-28 sm:h-40 md:h-48 w-auto aspect-[5/4] object-cover rounded-[2px] opacity-90"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export type SpreadAlbum = {
  cover: string;
  a: string;
  b: string;
  c: string;
  by: { sq: string; en: string };
};

export const DEFAULT_SPREADS: SpreadAlbum[] = [
  { cover: LIFE_PHOTOS[0], a: LIFE_PHOTOS[1], b: LIFE_PHOTOS[2], c: LIFE_PHOTOS[3], by: { sq: 'Ana & Erjon · Dasmë', en: 'Ana & Erjon · Wedding' } },
  { cover: LIFE_PHOTOS[4], a: LIFE_PHOTOS[5], b: LIFE_PHOTOS[6], c: LIFE_PHOTOS[7], by: { sq: 'Familja · Tiranë', en: 'Family · Tirana' } },
  { cover: LIFE_PHOTOS[8], a: LIFE_PHOTOS[9], b: LIFE_PHOTOS[10], c: LIFE_PHOTOS[11], by: { sq: 'Vera në jug', en: 'Summer in the south' } },
  { cover: LIFE_PHOTOS[12], a: LIFE_PHOTOS[13], b: LIFE_PHOTOS[14], c: LIFE_PHOTOS[15], by: { sq: 'Miqësi', en: 'Friendship' } },
];

export function OpenAlbumSpread({
  lang,
  kicker,
  title,
  spreads = DEFAULT_SPREADS,
}: {
  lang: 'sq' | 'en';
  kicker: ReactNode;
  title: ReactNode;
  spreads?: SpreadAlbum[];
}) {
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(() => setIdx(i => (i + 1) % spreads.length), 3400);
    return () => window.clearInterval(t);
  }, [reduced, spreads.length]);
  const s = spreads[idx] ?? spreads[0];
  return (
    <section className="relative py-16 md:py-24 overflow-hidden" style={{ background: DARK }}>
      <DarkAtmosphere photo={LIFE_PHOTOS[8]} reduced={reduced} />
      <div className="relative z-[1] max-w-5xl mx-auto px-5 md:px-8 text-center mb-8 md:mb-12">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/35 mb-3">{kicker}</p>
        <h2 className="font-serif text-[clamp(1.85rem,3.4vw,2.8rem)] font-medium leading-[1.12] text-[#f3eee7]">
          {title}
        </h2>
      </div>
      <div className="relative z-[1] max-w-[920px] mx-auto px-4" style={{ perspective: 1600 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={s.by.en}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex aspect-[3/2] items-stretch shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              className="relative w-[46%] min-h-0 overflow-hidden bg-[#1a1209]"
              style={{ transform: 'rotateY(5deg)', transformOrigin: 'right center' }}
            >
              <img src={s.cover} alt="" className={`${reduced ? '' : 'ai-ken'} absolute inset-0 w-full h-full object-cover`} />
              <p className="absolute bottom-4 left-3 right-3 font-serif italic text-white/90 text-[12px] sm:text-[14px] text-center drop-shadow">
                {lang === 'sq' ? s.by.sq : s.by.en}
              </p>
            </div>
            <div className="w-px bg-black/30 shrink-0" />
            <div
              className="relative w-[54%] min-h-0 overflow-hidden bg-[#f6f1ea]"
              style={{ transform: 'rotateY(-5deg)', transformOrigin: 'left center' }}
            >
              <div className="absolute inset-[4.5%] grid grid-rows-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-[4.5%] min-h-0">
                <div className="relative min-h-0 overflow-hidden">
                  <img src={s.a} alt="" className={`${reduced ? '' : 'ai-ken'} absolute inset-0 w-full h-full object-cover`} />
                </div>
                <div className="grid grid-cols-2 gap-[5%] min-h-0">
                  <div className="relative min-h-0 overflow-hidden">
                    <img src={s.b} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <div className="relative min-h-0 overflow-hidden">
                    <img src={s.c} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="flex justify-center gap-2 mt-6">
          {spreads.map((sp, i) => (
            <button
              key={sp.by.en}
              type="button"
              aria-label={lang === 'sq' ? sp.by.sq : sp.by.en}
              onClick={() => setIdx(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 22 : 8,
                background: i === idx ? '#f3eee7' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PhoneVsAlbum({
  kicker,
  title,
  body,
  pileLabel,
  albumLabel,
  photos = LIFE_PHOTOS,
}: {
  kicker: ReactNode;
  title: ReactNode;
  body: ReactNode;
  pileLabel: string;
  albumLabel: string;
  photos?: string[];
}) {
  const pile = photos.slice(0, 8);
  const page = photos.slice(0, 6);
  return (
    <section className="relative py-16 md:py-24 overflow-hidden" style={{ background: DARK }}>
      <DarkAtmosphere photo={photos[6]} />
      <div className="relative z-[1] max-w-6xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/35 mb-3">{kicker}</p>
            <h2 className="font-serif text-[clamp(1.85rem,3.4vw,2.8rem)] font-medium leading-[1.12] text-[#f3eee7] mb-4">
              {title}
            </h2>
            <p className="text-white/50 text-[15px] leading-relaxed max-w-md">{body}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            <figure className="m-0" aria-hidden>
              <div className="relative aspect-[4/5]">
                {pile.map((src, i) => (
                  <motion.img
                    key={src}
                    src={src}
                    alt=""
                    className="absolute left-1/2 top-1/2 w-[46%] h-[58%] object-cover rounded-[2px] border border-white/70 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
                    style={{ zIndex: i }}
                    initial={{ x: '-50%', y: '-50%', rotate: 0, opacity: 0 }}
                    whileInView={{
                      x: `calc(-50% + ${(i - 3.5) * 10}%)`,
                      y: `calc(-50% + ${(i % 4) * 6 - 8}%)`,
                      rotate: (i - 3.5) * 8,
                      opacity: 1,
                    }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 160, damping: 16 }}
                  />
                ))}
              </div>
              <figcaption className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-white/30">
                {pileLabel}
              </figcaption>
            </figure>
            <figure className="m-0" aria-hidden>
              <div className="relative aspect-[4/5] rounded-[2px] shadow-[0_24px_60px_rgba(0,0,0,0.4)] overflow-hidden bg-[#1a120c]">
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-[3px] p-[3px]">
                  {page.map((src, i) => (
                    <motion.div
                      key={`g-${src}`}
                      className={`relative overflow-hidden ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ delay: 0.2 + i * 0.08, duration: 0.45 }}
                    >
                      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    </motion.div>
                  ))}
                </div>
              </div>
              <figcaption className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-white/30">
                {albumLabel}
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

export type MosaicSlot = {
  src: string;
  label: { sq: string; en: string };
  className: string;
};

export const DEFAULT_MOSAIC: MosaicSlot[] = [
  { src: LIFE_PHOTOS[0], label: { sq: 'Kopertina', en: 'Cover' }, className: 'col-span-2 row-span-2' },
  { src: LIFE_PHOTOS[1], label: { sq: 'Faqja 02', en: 'Page 02' }, className: '' },
  { src: LIFE_PHOTOS[2], label: { sq: 'Faqja 03', en: 'Page 03' }, className: '' },
  { src: LIFE_PHOTOS[5], label: { sq: 'Faqja 04', en: 'Page 04' }, className: '' },
  { src: LIFE_PHOTOS[6], label: { sq: 'Faqja 05', en: 'Page 05' }, className: '' },
  { src: LIFE_PHOTOS[9], label: { sq: 'Faqja 06', en: 'Page 06' }, className: '' },
];

export function PageMosaic({
  lang,
  kicker,
  title,
  body,
  cta,
  slots = DEFAULT_MOSAIC,
}: {
  lang: 'sq' | 'en';
  kicker: ReactNode;
  title: ReactNode;
  body: ReactNode;
  cta?: ReactNode;
  slots?: MosaicSlot[];
}) {
  return (
    <section className="py-16 md:py-24 bg-[#f7f4f0]">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-14 items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">{kicker}</p>
            <h2 className="font-serif text-[clamp(1.85rem,3.4vw,2.8rem)] font-medium leading-[1.12] mb-4" style={{ color: INK }}>
              {title}
            </h2>
            <p className="text-neutral-500 text-[15px] leading-relaxed mb-6">{body}</p>
            {cta}
          </div>
          <div className="relative">
            <div className="relative aspect-[4/5] sm:aspect-[5/4] rounded-[2px] shadow-[0_28px_70px_rgba(42,34,24,0.14)] overflow-hidden bg-[#2A2218]">
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-[3px] p-[3px]">
                {slots.map((s, i) => (
                  <motion.div
                    key={`${s.label.en}-${i}`}
                    className={`relative overflow-hidden bg-[#1a1410] ${s.className}`}
                    initial={{ opacity: 0, scale: 0.88, y: 28 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 180, damping: 18 }}
                  >
                    <img src={s.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 text-[9px] uppercase tracking-[0.16em] text-white/90 drop-shadow">
                      {lang === 'sq' ? s.label.sq : s.label.en}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SpreadRiver({ kicker, photos = LIFE_PHOTOS }: { kicker: ReactNode; photos?: string[] }) {
  const pages = [
    [photos[0], photos[1]],
    [photos[2], photos[3]],
    [photos[4], photos[5]],
    [photos[6], photos[8]],
    [photos[9], photos[10]],
    [photos[12], photos[13]],
    [photos[14], photos[15]],
    [photos[7], photos[11]],
  ];
  const strip = [...pages, ...pages];
  return (
    <section className="py-12 md:py-16 overflow-hidden bg-white">
      <p className="text-center text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-8">{kicker}</p>
      <div className="ai-film-slow flex w-max gap-4 md:gap-5 px-2" aria-hidden>
        {strip.map((pair, i) => (
          <div
            key={i}
            className="flex w-[240px] sm:w-[300px] md:w-[360px] aspect-[8/5] bg-[#2A2218] p-[3px] shadow-[0_16px_40px_rgba(42,34,24,0.1)]"
          >
            <div className="relative w-1/2 min-h-0 overflow-hidden">
              <img src={pair[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="w-px bg-black/40 shrink-0" />
            <div className="relative w-1/2 min-h-0 overflow-hidden">
              <img src={pair[1]} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
