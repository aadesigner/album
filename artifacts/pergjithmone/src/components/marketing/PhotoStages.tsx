import React, { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export const DARK = '#1a1410';
export const INK = '#2A2218';
export const PAPER = '#f7f4f0';

const u = (id: string, extra = '') =>
  `https://images.unsplash.com/photo-${id}?w=900&q=84&fit=crop${extra}`;

/** Wedding — ceremony, rings, bride, reception. Not friends, not travel. */
export const WEDDING_PHOTOS = [
  u('1519741497674-611481863552'),
  u('1519225421980-715cb0215aed', '&crop=top'),
  u('1511285560929-80b456fea0bc'),
  u('1465495976277-4387d4b0b4c6'),
  u('1606800052052-a08af7148866'),
  u('1520854221256-17451cc331bf'),
  u('1537633552985-df8429e8048b', '&crop=top'),
  u('1516589178581-6cd7833ae3b2'),
];

/** Travel — landscapes, roads, sea, cities. */
export const TRAVEL_PHOTOS = [
  u('1476514525535-07fb3b4ae5f1'),
  u('1469854523086-cc02fe5d8800'),
  u('1500530855697-b586d89ba3ee'),
  u('1507525428034-b723cf961d3e'),
  u('1501785888041-af3ef285b470'),
  u('1523906834658-6e24ef2386f9'),
  u('1502602898657-3e91760cbb34'),
  u('1470071459604-3b5ec3a7fe05'),
];

/** Family — parents, children, home life. Not a wedding, not a landscape. */
export const FAMILY_PHOTOS = [
  u('1581952976147-5a2d15560349', '&crop=top'),
  u('1503454537195-1dcabb73ffb9'),
  u('1511895426328-dc8714191300'),
  u('1519689680058-324335c77eba'),
  u('1555252333-9f8e92e65df9'),
  u('1581952976147-5a2d15560349'),
];

/** Friendship — groups of friends. Never a wedding dress. */
export const FRIEND_PHOTOS = [
  u('1529156069898-49953e39b3ac', '&crop=top'),
  u('1511632765486-a01980e01a18'),
  u('1511988617509-a57c8a288659'),
  u('1529156069898-49953e39b3ac'),
];

/** Celebrations — concert, balloons, sparklers. */
export const PARTY_PHOTOS = [
  u('1492684223066-81342ee5ff30'),
  u('1530103862676-de8c9debad1d'),
  u('1467810563316-b5476525c0f9'),
  u('1492684223066-81342ee5ff30', '&crop=entropy'),
];

export const STAGE_PHOTOS = [
  WEDDING_PHOTOS[1],
  WEDDING_PHOTOS[7],
  TRAVEL_PHOTOS[0],
  FAMILY_PHOTOS[0],
  FRIEND_PHOTOS[0],
  WEDDING_PHOTOS[3],
  WEDDING_PHOTOS[2],
  TRAVEL_PHOTOS[3],
];

/** Mixed river — unique shots, no repeats across the first 24. */
export const LIFE_PHOTOS = [
  ...WEDDING_PHOTOS,
  ...TRAVEL_PHOTOS,
  ...FAMILY_PHOTOS,
  ...FRIEND_PHOTOS.slice(0, 4),
  ...PARTY_PHOTOS,
];

export const EXAMPLES_RIVER = [
  WEDDING_PHOTOS[0], TRAVEL_PHOTOS[1], FAMILY_PHOTOS[2], FRIEND_PHOTOS[1],
  PARTY_PHOTOS[0], TRAVEL_PHOTOS[4], WEDDING_PHOTOS[4], FAMILY_PHOTOS[1],
  TRAVEL_PHOTOS[5], FRIEND_PHOTOS[2], WEDDING_PHOTOS[5], TRAVEL_PHOTOS[2],
  FAMILY_PHOTOS[3], PARTY_PHOTOS[1], WEDDING_PHOTOS[2], TRAVEL_PHOTOS[6],
  FRIEND_PHOTOS[0], FAMILY_PHOTOS[4], WEDDING_PHOTOS[6], TRAVEL_PHOTOS[3],
  PARTY_PHOTOS[2], WEDDING_PHOTOS[3], FAMILY_PHOTOS[0], TRAVEL_PHOTOS[7],
  WEDDING_PHOTOS[7], TRAVEL_PHOTOS[0], FAMILY_PHOTOS[1], FRIEND_PHOTOS[2],
  u('1503220317375-aaad61436b1b'),
  u('1499856871958-5b9627545d1a'),
  u('1528360983277-13d401cdc186'),
  u('1583422409516-2895a77efded'),
  u('1500534314209-a25ddb2bd429'),
  u('1469474968028-56623f02e42e'),
  u('1441974231531-c6227db76b6e'),
  u('1519681393784-d120267933ba'),
  u('1506905925346-21bda4d32df4'),
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

export function DarkAtmosphere({
  photo, reduced, tone = 'warm',
}: { photo?: string; reduced?: boolean; tone?: 'warm' | 'cool' }) {
  const wash = tone === 'cool'
    ? 'radial-gradient(110% 70% at 50% -10%, #2a3340 0%, #1a2028 42%, #12151a 100%)'
    : 'radial-gradient(110% 70% at 50% -10%, #3a2c24 0%, #241c16 42%, #1a1410 100%)';
  const orbA = tone === 'cool'
    ? 'radial-gradient(circle, rgba(120,150,180,0.22) 0%, transparent 68%)'
    : 'radial-gradient(circle, rgba(212,168,112,0.28) 0%, transparent 68%)';
  const orbB = tone === 'cool'
    ? 'radial-gradient(circle, rgba(70,90,110,0.28) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(140,72,64,0.22) 0%, transparent 70%)';
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: wash }}
      />
      {photo && (
        <img
          src={photo}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: tone === 'cool' ? 0.18 : 0.28,
            filter: 'blur(36px) saturate(0.55) brightness(0.72)',
            transform: 'scale(1.18)',
          }}
        />
      )}
      <div
        aria-hidden
        className={`${reduced ? '' : 'ai-orb-a'} pointer-events-none absolute -top-[12%] left-[8%] h-[58%] w-[52%] rounded-full opacity-70 blur-3xl`}
        style={{ background: orbA }}
      />
      <div
        aria-hidden
        className={`${reduced ? '' : 'ai-orb-b'} pointer-events-none absolute -bottom-[18%] right-[-8%] h-[62%] w-[58%] rounded-full opacity-60 blur-3xl`}
        style={{ background: orbB }}
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
          background: tone === 'cool'
            ? 'radial-gradient(ellipse at 50% 42%, transparent 28%, rgba(8,10,14,0.58) 100%)'
            : 'radial-gradient(ellipse at 50% 42%, transparent 28%, rgba(12,8,6,0.55) 100%)',
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

/** Overlapping printed pages — examples hero, not polaroids. */
export function PrintedPageStack({ photos }: { photos: string[] }) {
  const shots = photos.slice(0, 4);
  const phone = [
    { w: '54%', left: '4%', top: '10%', rot: -8, z: 2 },
    { w: '54%', left: '40%', top: '18%', rot: 9, z: 3 },
  ];
  const desktop = [
    { w: '58%', left: '8%', top: '2%', rot: -8, z: 3 },
    { w: '42%', left: '50%', top: '-2%', rot: 9, z: 2 },
    { w: '40%', left: '-2%', top: '48%', rot: -5, z: 1 },
    { w: '46%', left: '46%', top: '44%', rot: 6, z: 4 },
  ];
  const frame = (src: string, i: number, layout: typeof phone) => (
    <div
      key={`${src}-${i}`}
      className="absolute overflow-hidden bg-[#ebe4db] p-[6px] shadow-[0_18px_40px_rgba(0,0,0,0.38)]"
      style={{
        width: layout[i].w,
        aspectRatio: '3 / 4',
        left: layout[i].left,
        top: layout[i].top,
        transform: `rotate(${layout[i].rot}deg)`,
        zIndex: layout[i].z,
      }}
    >
      <img src={src} alt="" referrerPolicy="no-referrer" decoding="async" className="block h-full w-full object-cover" />
    </div>
  );
  return (
    <>
      <div className="relative h-[210px] sm:hidden max-w-[280px] mx-auto" aria-hidden>
        {shots.slice(0, 2).map((src, i) => frame(src, i, phone))}
      </div>
      <div className="relative hidden sm:block h-[400px] md:h-[480px] max-w-[420px] mx-auto" aria-hidden>
        {shots.map((src, i) => frame(src, i, desktop))}
      </div>
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

export function PhotoRiver({
  photos = LIFE_PHOTOS,
  rows = 2,
  size = 'lg',
  tone = 'warm',
}: {
  photos?: string[];
  rows?: 1 | 2;
  size?: 'md' | 'lg';
  tone?: 'warm' | 'cool';
}) {
  const a = [...photos, ...photos];
  const b = [...photos.slice(6), ...photos.slice(0, 6), ...photos.slice(6), ...photos.slice(0, 6)];
  const h = size === 'md'
    ? 'h-28 sm:h-36 md:h-44'
    : 'h-32 sm:h-44 md:h-56';
  return (
    <div className="relative py-5 md:py-7 overflow-hidden" style={{ background: DARK }} aria-hidden>
      <DarkAtmosphere photo={photos[4]} tone={tone} />
      <div className="relative z-[1]">
        <div className="ai-film-slow flex w-max gap-2 md:gap-2.5">
          {a.map((src, i) => (
            <img
              key={`a-${i}`}
              src={src}
              alt=""
              className={`block ${h} w-auto aspect-[4/5] object-cover rounded-[2px]`}
            />
          ))}
        </div>
        {rows === 2 && (
          <div className="ai-film-rev flex w-max gap-2 md:gap-2.5 mt-2 md:mt-2.5">
            {b.map((src, i) => (
              <img
                key={`b-${i}`}
                src={src}
                alt=""
                className="block h-28 sm:h-40 md:h-48 w-auto aspect-[5/4] object-cover rounded-[2px] opacity-90"
              />
            ))}
          </div>
        )}
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
  { cover: WEDDING_PHOTOS[0], a: WEDDING_PHOTOS[2], b: WEDDING_PHOTOS[4], c: WEDDING_PHOTOS[3], by: { sq: 'Ana & Erjon · Dasmë', en: 'Ana & Erjon · Wedding' } },
  { cover: FAMILY_PHOTOS[0], a: FAMILY_PHOTOS[1], b: FAMILY_PHOTOS[2], c: FAMILY_PHOTOS[3], by: { sq: 'Familja · Tiranë', en: 'Family · Tirana' } },
  { cover: TRAVEL_PHOTOS[3], a: TRAVEL_PHOTOS[1], b: TRAVEL_PHOTOS[4], c: TRAVEL_PHOTOS[5], by: { sq: 'Vera në jug', en: 'Summer in the south' } },
  { cover: FRIEND_PHOTOS[0], a: FRIEND_PHOTOS[1], b: FRIEND_PHOTOS[2], c: FRIEND_PHOTOS[3], by: { sq: 'Miqësi', en: 'Friendship' } },
];

export const EXAMPLES_SPREADS: SpreadAlbum[] = [
  { cover: WEDDING_PHOTOS[1], a: WEDDING_PHOTOS[0], b: WEDDING_PHOTOS[5], c: WEDDING_PHOTOS[6], by: { sq: 'Ana & Erjon · Dasmë, Sarandë', en: 'Ana & Erjon · Wedding, Saranda' } },
  { cover: TRAVEL_PHOTOS[5], a: TRAVEL_PHOTOS[0], b: TRAVEL_PHOTOS[2], c: TRAVEL_PHOTOS[6], by: { sq: 'Udhëtim · Venecia', en: 'Travel · Venice' } },
  { cover: FAMILY_PHOTOS[2], a: FAMILY_PHOTOS[0], b: FAMILY_PHOTOS[1], c: FAMILY_PHOTOS[4], by: { sq: 'Familja · Durrës', en: 'Family · Durrës' } },
  { cover: FRIEND_PHOTOS[1], a: FRIEND_PHOTOS[0], b: FRIEND_PHOTOS[3], c: FRIEND_PHOTOS[2], by: { sq: 'Miqësi · Tiranë', en: 'Friendship · Tirana' } },
  { cover: PARTY_PHOTOS[1], a: PARTY_PHOTOS[0], b: PARTY_PHOTOS[2], c: PARTY_PHOTOS[3], by: { sq: 'Ditëlindje · Vlorë', en: 'Birthday · Vlorë' } },
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
