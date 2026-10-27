import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { SEOMeta } from '@/components/SEOMeta';
import {
  useListCategories, useListBookSizes, useGetAppSettings,
  useCreateProject, useAddProjectPage, getProject,
} from '@workspace/api-client-react-tsconfig';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, UploadCloud, X, Check, ChevronRight, ArrowLeft, ArrowRight,
  Loader2, ImageOff, Wand2, LayoutTemplate, Palette, BookOpen, PartyPopper,
  Plus, Minus,
} from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { resolveDesignCategory, resolveDesignCategoryFromQuery } from '@/lib/designMeta';
import { DESIGNS } from '@/lib/designs';
import { generateAlbum, suggestInnerPageCount } from '@/lib/albumGenerator';
import { uploadImageToApi } from '@/lib/uploadImage';
import { pendingBooksLimitMessage } from '@/lib/projectErrors';
import { SizeCard } from './Wizard';
import { CategoryCoverImg, coverPressable } from '@/components/CategoryCoverImg';

// Minimum photos required before generation is allowed. Kept as a single
// named constant so the UI copy, validation, and progress bar all agree.
const MIN_PHOTOS = 25;
const MAX_PHOTOS = 40;

// Cap on simultaneous in-flight uploads. Firing all 25-80 photos at once
// against a single-file endpoint has no backpressure and tends to trip
// network/proxy limits — a small pool keeps things fast without flooding.
const UPLOAD_CONCURRENCY = 5;

type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';
interface PhotoItem {
  id: string;
  file?: File;
  previewUrl: string;
  status: UploadStatus;
  url?: string;
}

const SS_KEY = 'albumai_pending';

// Fixed generation stages, each paired with an icon, so the loading screen
// can render a real stepper instead of a single line of changing text.
const GEN_STAGES = [
  { key: 'project', icon: BookOpen,        sq: 'Duke krijuar projektin',  en: 'Creating your project' },
  { key: 'pages',    icon: LayoutTemplate,  sq: 'Duke shtuar faqet',       en: 'Adding your pages' },
  { key: 'design',   icon: Palette,         sq: 'Duke dizajnuar çdo faqe', en: 'Designing every page' },
  { key: 'save',     icon: Sparkles,        sq: 'Duke ruajtur albumin',   en: 'Saving your album' },
] as const;

const INK = '#2A2218';
const PAPER = '#f7f4f0';
const DARK = '#110e0c';

const STAGE_PHOTOS = [
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500&q=82&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=500&q=82&fit=crop',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&q=82&fit=crop',
  'https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=500&q=82&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&q=82&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=500&q=82&fit=crop',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=500&q=82&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=82&fit=crop',
];

function L(lang: 'sq' | 'en', sq: string, en: string) {
  return lang === 'sq' ? sq : en;
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

function FilmMarquee() {
  const strip = [...STAGE_PHOTOS, ...STAGE_PHOTOS];
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
            className="h-[72px] w-[54px] sm:h-[88px] sm:w-[66px] object-cover rounded-[2px] opacity-80"
          />
        ))}
      </div>
    </div>
  );
}

function Polaroid({
  src, className, tilt, delay, reduced,
}: { src: string; className: string; tilt: string; delay: string; reduced: boolean }) {
  return (
    <div
      className={`${reduced ? '' : 'ai-polaroid'} absolute z-[1] bg-white p-[5px] pb-5 shadow-[0_18px_40px_rgba(0,0,0,0.35)] ${className}`}
      style={{ ['--tilt' as string]: tilt, animationDelay: delay, transform: `rotate(${tilt})` }}
    >
      <img src={src} alt="" className="block w-full aspect-[3/4] object-cover" />
    </div>
  );
}

function DarkroomHero({ lang }: { lang: 'sq' | 'en' }) {
  const reduced = usePrefersReducedMotion();
  return (
    <section className="relative overflow-hidden text-[#f3eee7]" style={{ background: DARK }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '180px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-[42%] w-[70%] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(232,196,150,0.28) 0%, transparent 68%)' }}
      />
      {!reduced && (
        <div
          aria-hidden
          className="ai-develop-sweep pointer-events-none absolute inset-y-[8%] left-0 w-[38%] z-[2]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,244,220,0.16), transparent)' }}
        />
      )}

      <Polaroid src={STAGE_PHOTOS[0]} className="top-[7%] left-[2%] sm:left-[5%] w-[68px] sm:w-[100px]" tilt="-13deg" delay="0s" reduced={reduced} />
      <Polaroid src={STAGE_PHOTOS[1]} className="top-[9%] right-[2%] sm:right-[6%] w-[62px] sm:w-[88px]" tilt="10deg" delay="0.7s" reduced={reduced} />
      <Polaroid src={STAGE_PHOTOS[2]} className="hidden md:block top-[38%] left-[2%] w-[78px]" tilt="7deg" delay="1.2s" reduced={reduced} />
      <Polaroid src={STAGE_PHOTOS[3]} className="hidden md:block top-[42%] right-[3%] w-[86px]" tilt="-8deg" delay="1.8s" reduced={reduced} />
      <Polaroid src={STAGE_PHOTOS[4]} className="bottom-[22%] left-[8%] sm:left-[14%] w-[56px] sm:w-[72px]" tilt="-6deg" delay="0.4s" reduced={reduced} />
      <Polaroid src={STAGE_PHOTOS[5]} className="bottom-[20%] right-[8%] sm:right-[15%] w-[58px] sm:w-[76px]" tilt="8deg" delay="1.4s" reduced={reduced} />

      <div className="relative z-10 max-w-3xl mx-auto px-5 pt-16 pb-12 sm:pt-20 md:pt-24 md:pb-16 text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="text-[10px] sm:text-[11px] uppercase tracking-[0.38em] text-white/40 mb-6"
        >
          {L(lang, 'album me AI · dhomë e errët', 'album with AI · darkroom')}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-[clamp(2.15rem,6.4vw,4.1rem)] font-medium leading-[1.08] mb-5"
        >
          {L(lang, 'Hidhini fotot. Albumi niset vetë.', 'Drop the photos. The album starts itself.')}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="text-white/55 text-[15px] md:text-[16px] leading-relaxed max-w-lg mx-auto mb-8"
        >
          {L(
            lang,
            `Zgjidhni kujtimin. Vendosni ${MIN_PHOTOS}–${MAX_PHOTOS} foto. Ne i radhitim në faqe — pastaj i prekni ju, para printimit.`,
            `Pick the memory. Lay ${MIN_PHOTOS}–${MAX_PHOTOS} photos. We place them on the pages — then you touch them, before we print.`,
          )}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="#fillo"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[13px] font-semibold bg-white text-[#110e0c] hover:bg-[#f3eee7] transition-colors"
          >
            {L(lang, 'Hidhi fotot këtu', 'Drop photos here')}
            <ArrowRight size={14} />
          </a>
          <Link href="/krijo">
            <span className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[13px] font-semibold border border-white/20 text-white/80 hover:bg-white/5 transition-colors">
              {L(lang, 'Ose përgatiteni vetë', 'Or design it yourself')}
            </span>
          </Link>
        </motion.div>
        <p className="mt-8 text-[10px] uppercase tracking-[0.22em] text-white/30">
          {L(lang, `${MIN_PHOTOS}–${MAX_PHOTOS} foto  ·  i njëjti editor  ·  letër 200g`, `${MIN_PHOTOS}–${MAX_PHOTOS} photos  ·  the same editor  ·  200g paper`)}
        </p>
      </div>
      <FilmMarquee />
    </section>
  );
}

function ChaosToOrder({ lang }: { lang: 'sq' | 'en' }) {
  const pile = STAGE_PHOTOS.slice(0, 6);
  return (
    <section className="py-16 md:py-24 overflow-hidden" style={{ background: DARK }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/35 mb-3">
              {L(lang, 'nga rrëmuja, te radha', 'from the pile, into order')}
            </p>
            <h2 className="font-serif text-[clamp(1.85rem,3.4vw,2.8rem)] font-medium leading-[1.12] text-[#f3eee7] mb-4">
              {L(lang, 'Galeria është e mbushur. Albumi merr frymë.', 'The gallery is crowded. The album can breathe.')}
            </h2>
            <p className="text-white/50 text-[15px] leading-relaxed max-w-md">
              {L(
                lang,
                'Nuk i ngjisim të gjitha fotot në një faqe. E para bëhet kopertina. Të tjerat gjejnë vend — me hapësirë, jo me kolazh.',
                'We do not glue every photo onto one page. The first becomes the cover. The rest find a place — with air, not collage.',
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 items-end">
            <div className="relative h-[240px] sm:h-[280px]" aria-hidden>
              {pile.map((src, i) => (
                <motion.img
                  key={src}
                  src={src}
                  alt=""
                  className="absolute left-1/2 top-1/2 w-[88px] h-[118px] object-cover rounded-[2px] border border-white/80 shadow-xl"
                  style={{ zIndex: i }}
                  initial={{ x: '-50%', y: '-50%', rotate: 0, opacity: 0 }}
                  whileInView={{ x: `calc(-50% + ${(i - 2.5) * 10}px)`, y: `calc(-50% + ${(i % 3) * 8}px)`, rotate: (i - 2.5) * 9, opacity: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 160, damping: 16 }}
                />
              ))}
              <p className="absolute -bottom-1 left-0 right-0 text-center text-[10px] uppercase tracking-[0.18em] text-white/30">
                {L(lang, 'në telefon', 'on the phone')}
              </p>
            </div>
            <div aria-hidden>
              <div className="grid grid-cols-3 gap-1.5 bg-[#f7f4f0] p-2.5 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                {pile.map((src, i) => (
                  <motion.img
                    key={`g-${src}`}
                    src={src}
                    alt=""
                    className={`w-full object-cover ${i === 0 ? 'col-span-2 aspect-[4/3]' : 'aspect-square'}`}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ delay: 0.25 + i * 0.07, duration: 0.4 }}
                  />
                ))}
              </div>
              <p className="mt-2 text-center text-[10px] uppercase tracking-[0.18em] text-white/30">
                {L(lang, 'në album', 'in the album')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SlottingDemo({ lang }: { lang: 'sq' | 'en' }) {
  const slots = [
    { src: STAGE_PHOTOS[0], label: { sq: 'Kopertina', en: 'Cover' }, className: 'col-span-2 row-span-2' },
    { src: STAGE_PHOTOS[1], label: { sq: 'Faqja 02', en: 'Page 02' }, className: '' },
    { src: STAGE_PHOTOS[2], label: { sq: 'Faqja 03', en: 'Page 03' }, className: '' },
    { src: STAGE_PHOTOS[3], label: { sq: 'Faqja 04', en: 'Page 04' }, className: 'col-span-2' },
  ];
  return (
    <section className="py-16 md:py-24 bg-[#f7f4f0]">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
              {L(lang, 'si i vendosim', 'how we place them')}
            </p>
            <h2 className="font-serif text-[clamp(1.85rem,3.4vw,2.8rem)] font-medium leading-[1.12] mb-4" style={{ color: INK }}>
              {L(lang, 'E para hap. E fundit mbyll. Të tjerat gjejnë faqe.', 'The first opens. The last closes. The rest find a page.')}
            </h2>
            <p className="text-neutral-500 text-[15px] leading-relaxed mb-6">
              {L(
                lang,
                'Tërhiqini fotot në rendin e historisë. Ne zgjedhim paraqitjen dhe paletën. Ju i ndryshoni në editor para se të printojmë.',
                'Drag the photos into story order. We pick layout and palette. You change anything in the editor before we print.',
              )}
            </p>
            <a href="#fillo" className="inline-flex items-center gap-2 text-[13px] font-semibold" style={{ color: INK }}>
              {L(lang, 'Provojeni me fotot tuaja', 'Try it with your photos')}
              <ArrowRight size={14} />
            </a>
          </div>
          <div className="relative">
            <div className="grid grid-cols-4 grid-rows-3 gap-2 aspect-[4/3] bg-white p-3 rounded-sm shadow-[0_24px_60px_rgba(42,34,24,0.12)]">
              {slots.map((s, i) => (
                <motion.div
                  key={s.label.en}
                  className={`relative overflow-hidden bg-neutral-100 ${s.className}`}
                  initial={{ opacity: 0, scale: 0.86, y: 24 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: 0.12 + i * 0.16, type: 'spring', stiffness: 180, damping: 18 }}
                >
                  <img src={s.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute bottom-1.5 left-1.5 text-[9px] uppercase tracking-[0.16em] text-white/90 drop-shadow">
                    {L(lang, s.label.sq, s.label.en)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WizardRail({ step, lang }: { step: 1 | 2 | 3; lang: 'sq' | 'en' }) {
  const items = [
    { n: '01', sq: 'Kujtimi', en: 'Memory' },
    { n: '02', sq: 'Fotot', en: 'Photos' },
    { n: '03', sq: 'Albumi', en: 'Album' },
  ];
  return (
    <ol className="flex items-center justify-center gap-0 mb-8 md:mb-10">
      {items.map((it, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const on = step === n;
        const done = step > n;
        return (
          <React.Fragment key={it.n}>
            <li className="flex flex-col items-center gap-1 min-w-[68px]">
              <span className={`font-serif text-[13px] ${on || done ? 'text-[#2A2218]' : 'text-neutral-300'}`}>{it.n}</span>
              <span className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${on ? 'text-[#2A2218]' : done ? 'text-neutral-500' : 'text-neutral-300'}`}>
                {lang === 'sq' ? it.sq : it.en}
              </span>
            </li>
            {i < 2 && (
              <div className={`h-px w-8 md:w-16 mb-3 ${step > n ? 'bg-[#2A2218]' : 'bg-neutral-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

export default function AlbumAI() {
  const { t, lang } = useLanguage();
  const { isAuthenticated, getToken } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const sizeTouchedRef = useRef(false);
  const [generating, setGenerating] = useState(false);
  const [genStageIndex, setGenStageIndex] = useState(0);
  const [genDone, setGenDone] = useState(false);
  const [genReveal, setGenReveal] = useState(false);
  const [revealPhotos, setRevealPhotos] = useState<string[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const resumedRef = useRef(false);

  const { data: categories, isLoading: loadingCat } = useListCategories();
  const { data: bookSizes } = useListBookSizes();
  const { data: settings } = useGetAppSettings();
  const createProject = useCreateProject();
  const addProjectPage = useAddProjectPage();

  const siteSettings = settings as any;
  const bookCreationEnabled = siteSettings?.bookCreationEnabled !== false;

  const doneCount = photos.filter(p => p.status === 'done').length;
  const uploadingCount = photos.filter(p => p.status === 'uploading').length;
  const errorCount = photos.filter(p => p.status === 'error').length;
  const canGenerate = doneCount >= MIN_PHOTOS && categoryId !== null && uploadingCount === 0 && bookCreationEnabled;

  // Auto-pick the smallest size whose minPages fits the desired inner-page
  // count for the current photo tally — same heuristic used at generation
  // time, but surfaced here so the user can see and override it up front.
  const recommendedSize = React.useMemo(() => {
    const desiredInner = Math.max(4, Math.round(doneCount / 2));
    const sizes = ((bookSizes as any[]) || []).slice().sort((a, b) => a.minPages - b.minPages);
    return sizes.filter(s => s.minPages <= desiredInner).pop() || sizes[0] || null;
  }, [bookSizes, doneCount]);

  // Keep the selection pinned to the recommendation as photo count changes,
  // unless the user has explicitly picked a different size.
  useEffect(() => {
    if (sizeTouchedRef.current) return;
    if (recommendedSize) setSelectedSizeId(recommendedSize.id);
  }, [recommendedSize]);

  const selectedSize = ((bookSizes as any[]) || []).find(s => s.id === selectedSizeId) || recommendedSize || null;

  // ── Upload handling ──────────────────────────────────────────────────────
  // A small worker pool: items are pushed onto a queue and drained up to
  // UPLOAD_CONCURRENCY at a time, instead of firing every fetch at once.
  const uploadQueueRef = useRef<PhotoItem[]>([]);
  const activeUploadsRef = useRef(0);

  const uploadOne = useCallback(async (item: PhotoItem) => {
    if (!item.file) return;
    setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, status: 'uploading' } : p));
    try {
      const url = await uploadImageToApi(item.file, getToken());
      setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, status: 'done', url } : p));
    } catch (e) {
      console.error('Photo upload failed', e);
      setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error' } : p));
    }
  }, [getToken]);

  // Pulls queued items until the concurrency cap is hit; each finished slot
  // re-triggers itself so the queue keeps draining without ever exceeding
  // UPLOAD_CONCURRENCY simultaneous requests.
  const pumpQueue = useCallback(() => {
    while (activeUploadsRef.current < UPLOAD_CONCURRENCY && uploadQueueRef.current.length > 0) {
      const item = uploadQueueRef.current.shift()!;
      activeUploadsRef.current += 1;
      uploadOne(item).finally(() => {
        activeUploadsRef.current -= 1;
        pumpQueue();
      });
    }
  }, [uploadOne]);

  const enqueueUpload = useCallback((item: PhotoItem) => {
    uploadQueueRef.current.push(item);
    pumpQueue();
  }, [pumpQueue]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const imgFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!imgFiles.length) return;
    setPhotos(prev => {
      const room = MAX_PHOTOS - prev.length;
      const toAdd = imgFiles.slice(0, Math.max(0, room)).map(file => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending' as UploadStatus,
      }));
      // Queue uploads for the newly added items (outside setState, next tick);
      // the pool drains them at UPLOAD_CONCURRENCY at a time.
      setTimeout(() => toAdd.forEach(item => enqueueUpload(item)), 0);
      return [...prev, ...toAdd];
    });
  }, [enqueueUpload]);

  const removePhoto = useCallback((id: string) => {
    setPhotos(prev => {
      const item = prev.find(p => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  }, []);

  const movePhoto = useCallback((from: number, to: number) => {
    setPhotos((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);
  const dragPhotoIndex = useRef<number | null>(null);

  const retryPhoto = useCallback((id: string) => {
    setPhotos(prev => {
      const item = prev.find(p => p.id === id);
      if (item) setTimeout(() => enqueueUpload(item), 0);
      return prev;
    });
  }, [enqueueUpload]);

  // Aggregate retry for when several uploads fail at once (e.g. a network
  // blip mid-batch) — re-queues every item currently in 'error' status.
  const retryAllFailed = useCallback(() => {
    setPhotos(prev => {
      const failed = prev.filter(p => p.status === 'error');
      setTimeout(() => failed.forEach(item => enqueueUpload(item)), 0);
      return prev;
    });
  }, [enqueueUpload]);

  useEffect(() => () => { photos.forEach(p => URL.revokeObjectURL(p.previewUrl)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generation ───────────────────────────────────────────────────────────
  const runGeneration = useCallback(async (catId: number, photoUrls: string[], sizeId: number) => {
    setGenerating(true);
    setGenDone(false);
    setGenReveal(false);
    setRevealPhotos(photoUrls.slice(0, 12));
    setGenStageIndex(0);
    setGenError(null);
    try {
      const cat = (categories as any[])?.find((c: any) => c.id === catId);
      const designCategoryKey =
        resolveDesignCategory(cat)
        || resolveDesignCategoryFromQuery(cat?.slug, null, DESIGNS)
        || 'Modern';

      if (!photoUrls.length) {
        throw new Error('NO_PHOTOS');
      }

      setGenStageIndex(0); // project
      const chosenSize = ((bookSizes as any[]) || []).find(s => s.id === sizeId);
      if (!chosenSize) throw new Error('No album sizes available');
      // Opening + closing heroes, then ~1.55 photos/page so spreads stay airy
      // and each image is used once.
      const desiredInner = suggestInnerPageCount(photoUrls.length, 4);
      const finalInner = Math.max(desiredInner, chosenSize.minPages);

      const project = await createProject.mutateAsync({
        data: { bookSizeId: chosenSize.id, title: lang === 'sq' ? 'Albumi im me AI' : 'My AI Album' },
      });

      setGenStageIndex(1); // pages
      let fresh = await getProject(project.id);
      let innerPages = (fresh.pages as any[]).filter(p => p.pageType === 'inner');
      let maxPageNumber = Math.max(0, ...(fresh.pages as any[]).map(p => p.pageNumber ?? 0));
      const missing = finalInner - innerPages.length;
      if (missing > 0) {
        for (let i = 0; i < missing; i++) {
          maxPageNumber += 1;
          await addProjectPage.mutateAsync({
            projectId: project.id,
            data: { pageNumber: maxPageNumber, pageType: 'inner' },
          });
        }
        fresh = await getProject(project.id);
        innerPages = (fresh.pages as any[]).filter(p => p.pageType === 'inner');
      }
      innerPages = innerPages.slice().sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));

      setGenStageIndex(2); // design
      // Tiny delay so the "designing" stage is visible even on fast machines,
      // and so rapid retries never collide on the same Math.random stream feel.
      await new Promise(r => setTimeout(r, 280 + Math.floor(Math.random() * 220)));
      const album = generateAlbum(designCategoryKey, photoUrls, innerPages.length, lang as 'sq' | 'en', {
        widthCm: Number(chosenSize.widthCm), heightCm: Number(chosenSize.heightCm),
      });

      const frontCoverPage = (fresh.pages as any[]).find(p => p.pageType === 'front_cover');
      const insideCoverPage = (fresh.pages as any[]).find(
        p => p.pageType === 'inside_cover' || p.pageType === 'inside_front_cover',
      );
      const insideBackPage = (fresh.pages as any[]).find(
        p => p.pageType === 'inside_back_cover',
      );
      const backCoverPage = (fresh.pages as any[]).find(p => p.pageType === 'back_cover');

      setGenStageIndex(3); // save
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const patchPage = async (pageId: number, elements: any[], attempts = 3) => {
        let lastErr: Error | null = null;
        for (let attempt = 0; attempt < attempts; attempt++) {
          try {
            const r = await fetch(`/api/projects/${project.id}/pages/${pageId}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ contentJson: JSON.stringify(elements) }),
            });
            if (!r.ok) {
              const body = await r.text().catch(() => '');
              throw new Error(`PATCH ${pageId} failed (${r.status}): ${body.slice(0, 160)}`);
            }
            return;
          } catch (err: any) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            await new Promise(r => setTimeout(r, 350 * (attempt + 1)));
          }
        }
        throw lastErr ?? new Error('Failed to save a page');
      };

      const patches: Promise<void>[] = [];
      if (frontCoverPage) patches.push(patchPage(frontCoverPage.id, album.frontCover));
      if (insideCoverPage) patches.push(patchPage(insideCoverPage.id, album.insideCover));
      if (insideBackPage) patches.push(patchPage(insideBackPage.id, album.insideCover));
      if (backCoverPage) patches.push(patchPage(backCoverPage.id, album.backCover));
      innerPages.forEach((page, i) => {
        if (album.innerPages[i]) patches.push(patchPage(page.id, album.innerPages[i]));
      });

      // Save in small batches so a single slow page doesn't time everything out.
      const BATCH = 6;
      for (let i = 0; i < patches.length; i += BATCH) {
        await Promise.all(patches.slice(i, i + BATCH));
      }

      sessionStorage.removeItem(SS_KEY);
      setGenDone(true);
      setGenReveal(true);
      // Reveal collage plays, then hand off to the editor.
      await new Promise(r => setTimeout(r, 2400));
      setLocation(`/editor/${project.id}`);
    } catch (e: any) {
      console.error('Album generation failed', e);
      const isAuthError = e?.message?.includes('401') || /token|unauthor/i.test(String(e?.message ?? ''));
      const isLimitError = e?.data?.code === 'PENDING_BOOKS_LIMIT_REACHED';
      const isNoPhotos = e?.message === 'NO_PHOTOS';
      setGenError(isLimitError
        ? pendingBooksLimitMessage(lang, Number(e?.data?.limit) || 10)
        : isNoPhotos
        ? (lang === 'sq'
          ? 'Ngarko të paktën disa foto përpara se të krijosh albumin.'
          : 'Upload some photos before generating your album.')
        : isAuthError
        ? (lang === 'sq'
          ? 'Sesioni ka skaduar. Hyr përsëri dhe provo sërish.'
          : 'Your session expired. Please log in again and retry.')
        : (lang === 'sq'
          ? 'Krijimi i albumit dështoi. Provoni përsëri.'
          : 'Album generation failed. Please try again.'));
      setGenerating(false);
      setGenDone(false);
      setGenReveal(false);
    }
  }, [categories, bookSizes, createProject, addProjectPage, getToken, lang, setLocation]);

  // Step 2 "Continue" → move to the size-confirmation step instead of
  // generating immediately, so the user sees (and can change) the size/price
  // before the project is created.
  const handleContinueToSize = useCallback(() => {
    if (!canGenerate || categoryId === null || generating) return;
    if (!isAuthenticated) {
      const donePhotos = photos
        .filter(p => p.status === 'done' && p.url)
        .map(p => ({ id: p.id, url: p.url }));
      sessionStorage.setItem(SS_KEY, JSON.stringify({ categoryId, photos: donePhotos }));
      setLocation('/regjistrohu?next=/album-ai');
      return;
    }
    setStep(3);
  }, [canGenerate, categoryId, generating, isAuthenticated, photos, setLocation]);

  const handleGenerate = useCallback(() => {
    if (!canGenerate || categoryId === null || generating || !selectedSize) return;
    const photoUrls = photos.filter(p => p.status === 'done' && p.url).map(p => p.url!);
    runGeneration(categoryId, photoUrls, selectedSize.id);
  }, [canGenerate, categoryId, photos, generating, runGeneration, selectedSize]);

  // Category pick and photo upload both work for a signed-out visitor —
  // uploads hit an anonymous endpoint — so we let them browse the whole
  // flow first and only ask them to register once they try to move past
  // the upload step, with everything they've already done preserved.
  const handleCategorySelect = useCallback((catId: number) => {
    setCategoryId(catId);
    setStep(2);
  }, []);

  // Resume after a login/register redirect: restore the chosen category
  // AND the already-uploaded photos (by URL — no need to re-upload), then
  // jump straight to the size step so nothing has to be redone.
  useEffect(() => {
    if (!isAuthenticated || resumedRef.current) return;
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return;
    resumedRef.current = true;
    sessionStorage.removeItem(SS_KEY);
    try {
      const { categoryId: catId, photos: savedPhotos } = JSON.parse(raw);
      if (typeof catId === 'number') setCategoryId(catId);
      if (Array.isArray(savedPhotos) && savedPhotos.length > 0) {
        setPhotos(savedPhotos.map((p: any) => ({
          id: p.id,
          previewUrl: p.url,
          status: 'done' as UploadStatus,
          url: p.url,
        })));
      }
      setStep(3);
    } catch (e) { console.error('Failed to resume album selection', e); }
  }, [isAuthenticated]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Album me AI — Përgjithmonë', en: 'AI Album — Përgjithmonë' }}
        description={{
          sq: 'Ngarkoni 25–40 foto. Ne i kthejmë në një album me kopertinë të fortë, letër mat 200g dhe hapje të sheshtë — pastaj e rregulloni në të njëjtin editor para printimit.',
          en: 'Upload 25–40 photos. We turn them into a hardcover album on matte 200g paper with lay-flat spreads — then you refine it in the same editor before we print.',
        }}
        path="/album-ai"
      />

      <div style={{ background: PAPER }} className="min-h-[calc(100dvh-48px)] md:min-h-[calc(100dvh-54px)]">

        <DarkroomHero lang={lang} />

        {!bookCreationEnabled && (
          <div className="max-w-3xl mx-auto px-4 mb-6">
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm">
              {lang === 'sq' ? 'Krijimi i albumeve është përkohësisht i ndalur.' : 'Album creation is temporarily unavailable.'}
            </div>
          </div>
        )}

        <div id="fillo" className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
          <div className="rounded-[1.75rem] border border-neutral-200/80 bg-white/75 shadow-[0_18px_50px_rgba(42,34,24,0.06)] px-4 py-8 sm:px-8 md:px-10 md:py-11">
          {!generating && <WizardRail step={step} lang={lang} />}
          {step > 1 && !generating && (
            <button
              onClick={() => setStep(s => (s - 1) as 1 | 2)}
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] font-semibold text-neutral-400 hover:text-neutral-800 mb-6 transition-colors group"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              {lang === 'sq' ? 'Kthehu' : 'Back'}
            </button>
          )}

          <AnimatePresence mode="wait">
            {generating ? (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="relative flex flex-col items-center justify-center py-16 md:py-20 text-center overflow-hidden min-h-[420px]"
              >
                {/* Soft vignette + drifting orbs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <motion.div
                    className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(23,23,23,0.06) 0%, transparent 68%)' }}
                    animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.9, 0.55] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="absolute left-1/2 top-1/2 rounded-full"
                      style={{
                        width: 200 + i * 100, height: 200 + i * 100,
                        marginLeft: -(100 + i * 50), marginTop: -(100 + i * 50),
                        border: '1px solid rgba(23,23,23,0.07)',
                      }}
                      animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                      transition={{ duration: 18 + i * 7, repeat: Infinity, ease: 'linear' }}
                    />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {genReveal ? (
                    <motion.div
                      key="reveal"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative z-10 w-full max-w-lg mx-auto"
                    >
                      {/* Photo bloom — user's photos fan in before the editor opens */}
                      <div className="relative h-56 md:h-64 mb-8">
                        {(revealPhotos.length ? revealPhotos : photos.filter(p => p.previewUrl).slice(0, 9).map(p => p.previewUrl))
                          .slice(0, 9)
                          .map((src, i) => {
                            const angle = (i - 4) * 7;
                            const x = (i - 4) * 28;
                            const y = Math.abs(i - 4) * 4;
                            return (
                              <motion.div
                                key={`${src}-${i}`}
                                className="absolute left-1/2 top-1/2 w-20 h-28 md:w-24 md:h-32 rounded-lg overflow-hidden shadow-lg border border-white/80"
                                style={{ zIndex: i }}
                                initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-40%', rotate: 0 }}
                                animate={{
                                  opacity: 1,
                                  scale: 1,
                                  x: `calc(-50% + ${x}px)`,
                                  y: `calc(-50% + ${y}px)`,
                                  rotate: angle,
                                }}
                                transition={{
                                  type: 'spring',
                                  stiffness: 220,
                                  damping: 18,
                                  delay: 0.05 + i * 0.06,
                                }}
                              >
                                <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                              </motion.div>
                            );
                          })}
                      </div>

                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.35 }}
                        className="mx-auto w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mb-4 shadow-md"
                      >
                        <PartyPopper size={22} className="text-white" />
                      </motion.div>
                      <motion.h2
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="font-serif text-xl md:text-2xl font-medium text-neutral-900 mb-2"
                      >
                        {L(lang, 'Albumi juaj është gati', 'Your album is ready')}
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55 }}
                        className="text-sm text-neutral-500"
                      >
                        {lang === 'sq' ? 'Duke hapur editorin…' : 'Opening the editor…'}
                      </motion.p>
                    </motion.div>
                  ) : genDone ? (
                    <motion.div
                      key="done"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                      className="relative z-10 flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-6">
                        <PartyPopper size={26} className="text-white" />
                      </div>
                      <h2 className="font-serif text-xl font-medium text-neutral-900 mb-6">
                        {L(lang, 'Albumi u përgatit.', 'Your album is ready.')}
                      </h2>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="working"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative z-10 flex flex-col items-center w-full"
                    >
                      {/* Mini photo orbit while designing */}
                      <div className="relative w-28 h-28 mb-6">
                        <motion.div
                          className="absolute inset-0 rounded-full flex items-center justify-center shadow-xl"
                          style={{ background: INK }}
                          animate={{ rotate: [0, -5, 5, 0] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Wand2 size={26} className="text-white" />
                        </motion.div>
                        {photos.filter(p => p.status === 'done' && (p.url || p.previewUrl)).slice(0, 6).map((p, i) => {
                          const a = (i / 6) * Math.PI * 2;
                          const r = 58;
                          return (
                            <motion.img
                              key={p.id}
                              src={p.previewUrl}
                              alt=""
                              className="absolute w-9 h-9 rounded-md object-cover border-2 border-white shadow-md"
                              style={{ left: '50%', top: '50%', marginLeft: -18, marginTop: -18 }}
                              initial={{ opacity: 0, scale: 0.4 }}
                              animate={{
                                opacity: 1,
                                scale: 1,
                                x: Math.cos(a) * r,
                                y: Math.sin(a) * r,
                              }}
                              transition={{ delay: i * 0.08, type: 'spring', stiffness: 200, damping: 16 }}
                              draggable={false}
                            />
                          );
                        })}
                      </div>

                      <h2 className="font-serif text-xl font-medium mb-2" style={{ color: INK }}>
                        {L(lang, 'Duke përgatitur albumin tuaj…', 'Preparing your album…')}
                      </h2>
                      <p className="text-sm text-neutral-500 mb-8 max-w-xs">
                        {L(
                          lang,
                          'Po zgjedhim kopertinën, paraqitjen dhe vendosim fotot — gati për t’i prekur në editor.',
                          'Choosing the cover, the layouts and placing your photos — ready to touch in the editor.',
                        )}
                      </p>

                      {/* Stage stepper */}
                      <div className="flex items-center gap-1.5">
                        {GEN_STAGES.map((stg, i) => {
                          const StageIcon = stg.icon;
                          const state = genDone || i < genStageIndex ? 'done' : i === genStageIndex ? 'active' : 'pending';
                          return (
                            <React.Fragment key={stg.key}>
                              <div className="flex flex-col items-center gap-1.5 w-[76px]">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors duration-300 ${
                                    state === 'done' ? 'bg-neutral-900 border-neutral-900 text-white'
                                      : state === 'active' ? 'bg-white border-neutral-900 text-neutral-900'
                                      : 'bg-white border-neutral-200 text-neutral-300'
                                  }`}
                                >
                                  {state === 'done' ? <Check size={13} /> : state === 'active'
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <StageIcon size={13} />}
                                </div>
                                <span className={`text-[9.5px] uppercase tracking-[0.06em] leading-tight text-center ${
                                  state === 'pending' ? 'text-neutral-300' : 'text-neutral-500'
                                }`}>
                                  {lang === 'sq' ? stg.sq : stg.en}
                                </span>
                              </div>
                              {i < GEN_STAGES.length - 1 && (
                                <div className={`h-px w-4 -mt-4 transition-colors duration-300 ${
                                  i < genStageIndex || genDone ? 'bg-neutral-900' : 'bg-neutral-200'
                                }`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : step === 1 ? (
              <motion.div
                key="s1"
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl md:text-2xl font-serif font-medium leading-tight mb-2 text-center" style={{ color: INK }}>
                  {L(lang, 'Cili kujtim do të bëhet album?', 'Which memory becomes the album?')}
                </h2>
                <p className="text-sm text-neutral-500 text-center mb-7 max-w-md mx-auto">
                  {L(lang, 'Paleta, shkronjat dhe kopertina ndjekin historinë që zgjidhni — dasmë, udhëtim, familje.', 'Palette, type and cover follow the story you pick — wedding, travel, family.')}
                </p>

                {loadingCat ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="rounded-2xl bg-neutral-200 animate-pulse" style={{ aspectRatio: '3/4' }} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categories?.map((cat: any, i: number) => {
                      return (
                        <motion.div
                          key={cat.id}
                          {...coverPressable(() => handleCategorySelect(cat.id), lang === 'en' ? (cat.nameEn || cat.nameAl) : cat.nameAl)}
                          className="group relative w-full rounded-2xl overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                          style={{ aspectRatio: '3/4', minHeight: 168, WebkitTransform: 'translateZ(0)' }}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.4 }}
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <CategoryCoverImg
                            nameAl={cat.nameAl}
                            coverImage={cat.coverImage}
                            slug={cat.slug}
                            alt={cat.nameAl}
                            className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent" />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ring-1 ring-inset ring-white/40 rounded-2xl" />
                          <div className="absolute bottom-0 left-0 right-0 p-3.5 text-left">
                            <span className="text-xl block mb-1 leading-none">{cat.iconEmoji}</span>
                            <h3 className="text-white font-serif text-sm font-medium leading-tight">
                              {lang === 'en' ? (cat.nameEn || cat.nameAl) : cat.nameAl}
                            </h3>
                          </div>
                          <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <ChevronRight size={13} className="text-white" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : step === 2 ? (
              <motion.div
                key="s2"
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl md:text-2xl font-serif font-medium leading-tight mb-2 text-center" style={{ color: INK }}>
                  {L(lang, 'Vendosni fotot në rendin e historisë', 'Lay the photos in story order')}
                </h2>
                <p className="text-sm text-neutral-500 text-center mb-6 max-w-md mx-auto">
                  {L(
                    lang,
                    `Të paktën ${MIN_PHOTOS} foto. E para bëhet kopertina, e fundit e mbyll albumin. Tërhiqini për t’i rregulluar.`,
                    `At least ${MIN_PHOTOS} photos. The first becomes the cover, the last closes the album. Drag to reorder.`,
                  )}
                </p>

                {genError && (
                  <div className="mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm text-center">
                    {genError}
                  </div>
                )}

                {errorCount > 0 && (
                  <div className="mb-4 flex flex-wrap items-center justify-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm text-center">
                    <span>
                      {lang === 'sq'
                        ? (errorCount === 1
                          ? '1 foto dështoi të ngarkohej.'
                          : `${errorCount} foto dështuan të ngarkohen.`)
                        : (errorCount === 1
                          ? '1 photo failed to upload.'
                          : `${errorCount} photos failed to upload.`)}
                    </span>
                    <button
                      onClick={retryAllFailed}
                      className="px-3 py-1 rounded-full bg-red-700 text-white text-[11px] uppercase tracking-[0.08em] font-semibold hover:bg-red-800 active:scale-95 transition-all"
                    >
                      {lang === 'sq' ? 'Provo përsëri' : 'Retry all'}
                    </button>
                  </div>
                )}

                {/* Dropzone */}
                <div
                  onDragOver={e => { if (bookCreationEnabled) { e.preventDefault(); setDragActive(true); } }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={bookCreationEnabled ? handleDrop : undefined}
                  onClick={() => bookCreationEnabled && photos.length < MAX_PHOTOS && fileInputRef.current?.click()}
                  aria-disabled={!bookCreationEnabled}
                  className={`rounded-[1.35rem] border-2 border-dashed transition-colors duration-150 flex flex-col items-center justify-center text-center py-12 px-6 mb-6 ${
                    !bookCreationEnabled ? 'cursor-not-allowed opacity-50 border-neutral-200 bg-neutral-50'
                      : photos.length >= MAX_PHOTOS ? 'cursor-default border-neutral-200 bg-[#f7f4f0]'
                      : dragActive ? 'cursor-pointer border-[#2A2218] bg-[#f7f4f0]' : 'cursor-pointer border-neutral-300 bg-[#f7f4f0]/60 hover:border-[#2A2218]/50'
                  }`}
                >
                  <input
                    ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    disabled={!bookCreationEnabled}
                    onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
                  />
                  <UploadCloud size={28} className="text-neutral-400 mb-3" />
                  <p className="text-sm font-medium text-neutral-700 mb-1">
                    {photos.length >= MAX_PHOTOS
                      ? (lang === 'sq' ? `Ke arritur limitin e ${MAX_PHOTOS} fotove` : `You've reached the ${MAX_PHOTOS}-photo limit`)
                      : (lang === 'sq' ? 'Ngarko fotot këtu, ose kliko për t\'i zgjedhur' : 'Drag photos here, or click to browse')}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {lang === 'sq' ? `JPG/PNG · deri në ${MAX_PHOTOS} foto` : `JPG/PNG · up to ${MAX_PHOTOS} photos`}
                  </p>
                </div>

                {/* Progress + count */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm font-semibold ${doneCount >= MIN_PHOTOS ? 'text-emerald-600' : 'text-neutral-500'}`}>
                    {doneCount} / {MIN_PHOTOS} {lang === 'sq' ? 'foto të ngarkuara' : 'photos uploaded'}
                    {uploadingCount > 0 && (
                      <span className="text-neutral-400 font-normal"> · {uploadingCount} {lang === 'sq' ? 'duke u ngarkuar...' : 'uploading...'}</span>
                    )}
                  </span>
                  {photos.length > 0 && (
                    <button
                      onClick={() => { photos.forEach(p => URL.revokeObjectURL(p.previewUrl)); setPhotos([]); }}
                      className="text-[11px] uppercase tracking-[0.1em] text-neutral-400 hover:text-neutral-800"
                    >
                      {lang === 'sq' ? 'Fshi të gjitha' : 'Clear all'}
                    </button>
                  )}
                </div>
                <div className="h-1.5 rounded-full bg-neutral-200 overflow-hidden mb-6">
                  <motion.div
                    className="h-full bg-neutral-900"
                    animate={{ width: `${Math.min(100, (doneCount / MIN_PHOTOS) * 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Thumbnails — order is the album story */}
                {photos.length > 0 && (
                  <>
                    <p className="text-[11px] text-neutral-500 mb-3">
                      {lang === 'sq'
                        ? 'E para është kopertina, e fundit kapaku i pasëm. Tërhiq fotot për t\'i rregulluar.'
                        : 'The first photo is the cover, the last is the back. Drag to reorder.'}
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mb-8">
                      {photos.map((p, index) => {
                        const isCover = index === 0;
                        const isBack = photos.length >= 3 && index === photos.length - 1;
                        return (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={() => { dragPhotoIndex.current = index; }}
                            onDragOver={(e) => { e.preventDefault(); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (dragPhotoIndex.current != null) movePhoto(dragPhotoIndex.current, index);
                              dragPhotoIndex.current = null;
                            }}
                            onDragEnd={() => { dragPhotoIndex.current = null; }}
                            className="relative rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
                            style={{ aspectRatio: '1/1' }}
                            title={
                              isCover
                                ? (lang === 'sq' ? 'Kopertina' : 'Cover')
                                : isBack
                                  ? (lang === 'sq' ? 'Kapaku i pasëm' : 'Back cover')
                                  : undefined
                            }
                          >
                            <img src={p.previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                            {p.status === 'uploading' && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Loader2 size={16} className="text-white animate-spin" />
                              </div>
                            )}
                            {p.status === 'error' && (
                              <button
                                onClick={() => retryPhoto(p.id)}
                                className="absolute inset-0 bg-red-900/60 flex flex-col items-center justify-center text-white"
                                title={lang === 'sq' ? 'Kliko për të riprovuar' : 'Click to retry'}
                              >
                                <ImageOff size={14} />
                              </button>
                            )}
                            <span className="absolute bottom-1 left-1 px-1.5 h-4 rounded bg-black/65 text-white text-[9px] font-semibold leading-4">
                              {isCover ? (lang === 'sq' ? 'Kopertinë' : 'Cover') : isBack ? (lang === 'sq' ? 'Pas' : 'Back') : index + 1}
                            </span>
                            {p.status === 'done' && (
                              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Check size={9} className="text-white" />
                              </div>
                            )}
                            <button
                              onClick={() => removePhoto(p.id)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={handleContinueToSize}
                    disabled={!canGenerate}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-neutral-900 text-white text-[12px] uppercase tracking-[0.16em] font-semibold hover:bg-neutral-700 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-900"
                  >
                    {L(lang, 'Vazhdo te albumi', 'Continue to the album')}
                    <ChevronRight size={15} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="s3"
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl md:text-2xl font-serif font-medium leading-tight mb-2 text-center" style={{ color: INK }}>
                  {L(lang, 'Si do ta mbani në dorë?', 'How will you hold it?')}
                </h2>
                <p className="text-sm text-neutral-500 text-center mb-6 max-w-md mx-auto">
                  {L(
                    lang,
                    `Nga ${doneCount} fotot tuaja, kemi zgjedhur madhësinë që i rri më mirë. Ndryshojeni nëse dëshironi — çmimi ndjek faqet, jo AI-në.`,
                    `From your ${doneCount} photos, we chose the size that fits. Change it if you like — price follows pages, not AI.`,
                  )}
                </p>

                {genError && (
                  <div className="mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm text-center max-w-md mx-auto">
                    {genError}
                  </div>
                )}

                {!bookSizes ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 max-w-xl mx-auto">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-neutral-200 animate-pulse rounded-2xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 max-w-xl mx-auto">
                    {((bookSizes as any[]) || []).slice().sort((a, b) => a.minPages - b.minPages).map((s: any, idx: number) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06, duration: 0.28 }}
                        className="relative"
                      >
                        {recommendedSize && s.id === recommendedSize.id && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[9px] uppercase tracking-[0.1em] font-semibold whitespace-nowrap">
                            {lang === 'sq' ? 'E rekomanduar' : 'Recommended'}
                          </span>
                        )}
                        <SizeCard
                          size={s}
                          isSelected={selectedSizeId === s.id}
                          onClick={() => { sizeTouchedRef.current = true; setSelectedSizeId(s.id); }}
                          lang={lang}
                          t={t}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate || !selectedSize}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-neutral-900 text-white text-[12px] uppercase tracking-[0.16em] font-semibold hover:bg-neutral-700 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-900"
                  >
                    <Wand2 size={15} />
                    {L(lang, 'Krijo albumin', 'Create the album')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>

        {!generating && (
          <>
            <ChaosToOrder lang={lang} />
            <SlottingDemo lang={lang} />

            <section className="py-16 md:py-24 bg-white">
              <div className="max-w-5xl mx-auto px-5 md:px-8 grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-start">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                    {L(lang, 'para se të hidhni fotot', 'before you drop the photos')}
                  </p>
                  <h2 className="font-serif text-[clamp(1.85rem,3.2vw,2.7rem)] font-medium leading-[1.12] mb-4" style={{ color: INK }}>
                    {L(lang, 'Mbetet i juaji. Printojmë vetëm kur thoni po.', 'It stays yours. We print only when you say yes.')}
                  </h2>
                  <p className="text-neutral-500 text-[15px] leading-relaxed">
                    {L(
                      lang,
                      'AI e niset. Ju e mbyllni në editor. I njëjti printim, e njëjta letër 200g, kudo në Shqipëri.',
                      'AI starts it. You finish it in the editor. The same print, the same 200g paper, anywhere in Albania.',
                    )}
                  </p>
                </div>
                <div className="space-y-px bg-neutral-200/80">
                  {[
                    {
                      q: { sq: 'A mbetet albumi i redaktueshëm?', en: 'Does the album stay editable?' },
                      a: {
                        sq: 'Po. Hapet direkt në editorin tonë. Ndryshoni çdo faqe, foto, tekst apo kornizë para se të porositeni.',
                        en: 'Yes. It opens in our editor. Change any page, photo, caption or frame before you order.',
                      },
                    },
                    {
                      q: { sq: 'Sa foto duhen?', en: 'How many photos do I need?' },
                      a: {
                        sq: `Të paktën ${MIN_PHOTOS}, deri në ${MAX_PHOTOS}. E para është kopertina, e fundit kapaku i pasëm.`,
                        en: `At least ${MIN_PHOTOS}, up to ${MAX_PHOTOS}. The first is the cover, the last is the back.`,
                      },
                    },
                    {
                      q: { sq: 'A kushton më shumë sepse e nisi AI?', en: 'Does it cost more because AI started it?' },
                      a: {
                        sq: 'Jo. Çmimi varet nga madhësia dhe faqet — i njëjti printim, qoftë me AI apo me editor.',
                        en: 'No. Price follows size and pages — the same print, whether AI or the editor started it.',
                      },
                    },
                    {
                      q: { sq: 'Po nëse nuk më pëlqen paraqitja?', en: 'What if I do not like the layout?' },
                      a: {
                        sq: 'Ndryshojeni faqe për faqe, ose ngarkoni sërish. Printojmë vetëm kur jeni të kënaqur.',
                        en: 'Change it page by page, or upload again. We print only when you are happy.',
                      },
                    },
                  ].map((item, i) => (
                    <div key={item.q.en} className="bg-white overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#f7f4f0]/80 transition-colors"
                      >
                        <span className="font-serif text-[17px]" style={{ color: INK }}>
                          {L(lang, item.q.sq, item.q.en)}
                        </span>
                        {openFaq === i
                          ? <Minus size={15} className="text-neutral-400 shrink-0" />
                          : <Plus size={15} className="text-neutral-400 shrink-0" />}
                      </button>
                      <AnimatePresence initial={false}>
                        {openFaq === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                          >
                            <p className="px-5 pb-4 text-[13.5px] text-neutral-500 leading-relaxed">
                              {L(lang, item.a.sq, item.a.en)}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden py-20 md:py-28" style={{ background: PAPER }}>
              <div className="relative max-w-xl mx-auto px-5 text-center">
                <div className="relative h-28 mb-8" aria-hidden>
                  {STAGE_PHOTOS.slice(0, 5).map((src, i) => (
                    <motion.img
                      key={src}
                      src={src}
                      alt=""
                      className="absolute left-1/2 top-0 w-[72px] h-[96px] object-cover rounded-[2px] border-2 border-white shadow-lg"
                      style={{ zIndex: i }}
                      initial={{ x: '-50%', y: 20, rotate: 0, opacity: 0 }}
                      whileInView={{ x: `calc(-50% + ${(i - 2) * 22}px)`, y: Math.abs(i - 2) * 6, rotate: (i - 2) * 8, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07, type: 'spring', stiffness: 200, damping: 16 }}
                    />
                  ))}
                </div>
                <h2 className="font-serif text-[clamp(1.9rem,3.6vw,2.9rem)] font-medium leading-[1.12] mb-4" style={{ color: INK }}>
                  {L(lang, 'Hidhi. Ne i radhitim.', 'Drop them. We place them.')}
                </h2>
                <p className="text-neutral-500 text-[15px] leading-relaxed mb-8">
                  {L(
                    lang,
                    'Filloni falas. Paguani kur jeni të kënaqur — kartë ose para në dorëzim.',
                    'Start free. Pay when you are happy — card or cash on delivery.',
                  )}
                </p>
                <a
                  href="#fillo"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[13px] font-semibold text-white"
                  style={{ background: INK }}
                >
                  {L(lang, 'Hidhi fotot këtu', 'Drop photos here')}
                  <ArrowRight size={15} />
                </a>
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400 mt-5">
                  {L(lang, 'Nga 3.100 LEK · dërgesë 10–16 ditë', 'From 3,100 LEK · 10–16 day delivery')}
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </MarketingLayout>
  );
}
