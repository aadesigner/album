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
  Clock, Images, PenLine, Truck, Plus, Minus, Layers, Package,
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
const DARK = '#1a1714';

const HERO_PHOTOS = [
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=84&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=700&q=84&fit=crop',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=84&fit=crop',
  'https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=600&q=84&fit=crop&crop=top',
];

function L(lang: 'sq' | 'en', sq: string, en: string) {
  return lang === 'sq' ? sq : en;
}

function HeroSpread({ lang }: { lang: 'sq' | 'en' }) {
  const fly = [
    { src: HERO_PHOTOS[0], x: -42, y: -38, r: -16, delay: 0.05 },
    { src: HERO_PHOTOS[1], x: 46, y: -42, r: 12, delay: 0.18 },
    { src: HERO_PHOTOS[2], x: -38, y: 36, r: 9, delay: 0.3 },
    { src: HERO_PHOTOS[3], x: 44, y: 34, r: -11, delay: 0.42 },
  ];
  return (
    <div className="relative w-full max-w-[520px] mx-auto h-[320px] sm:h-[400px] lg:h-[460px]" aria-hidden>
      {fly.map((f) => (
        <motion.img
          key={f.src}
          src={f.src}
          alt=""
          className="absolute z-0 w-[72px] h-[96px] sm:w-[88px] sm:h-[118px] object-cover rounded-sm border border-white"
          initial={{ opacity: 0, scale: 0.7, x: `${f.x}%`, y: `${f.y}%`, rotate: f.r * 1.6, left: '50%', top: '50%' }}
          animate={{
            opacity: [0, 1, 1, 0.35],
            scale: [0.7, 1, 1, 0.92],
            x: [`${f.x}%`, `${f.x * 0.55}%`, `${f.x * 0.22}%`, `${f.x * 0.08}%`],
            y: [`${f.y}%`, `${f.y * 0.55}%`, `${f.y * 0.18}%`, `${f.y * 0.05}%`],
            rotate: [f.r * 1.6, f.r, f.r * 0.3, 0],
          }}
          transition={{ duration: 2.8, delay: f.delay, ease: [0.22, 1, 0.36, 1], times: [0, 0.28, 0.62, 1] }}
          style={{ marginLeft: -44, marginTop: -56, boxShadow: '0 10px 24px rgba(42,34,24,0.12)' }}
        />
      ))}
      <motion.div
        className="absolute inset-0 z-10 flex items-center justify-center"
        style={{ perspective: 1600 }}
        initial={{ opacity: 0, y: 28, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="flex w-[86%] max-w-[420px]"
          style={{ transformStyle: 'preserve-3d', transformOrigin: 'center center' }}
          animate={{ rotateY: [-8, -4, -8], rotateX: [3, 2, 3] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="relative w-[48%] aspect-[3/4] overflow-hidden rounded-l-[4px] bg-[#1a1209]"
            style={{ boxShadow: '0 18px 40px rgba(42,34,24,0.14)', transform: 'rotateY(7deg)', transformOrigin: 'right center' }}>
            <img src={HERO_PHOTOS[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <p className="absolute bottom-3 left-2 right-2 font-serif italic text-white/90 text-[11px] text-center">
              Ana & Erjon
            </p>
          </div>
          <div className="w-px bg-black/10 shrink-0" />
          <div className="relative w-[52%] aspect-[3/4] overflow-hidden rounded-r-[4px] bg-[#faf8f4] p-[7%]"
            style={{ boxShadow: '0 18px 40px rgba(42,34,24,0.1)', transform: 'rotateY(-7deg)', transformOrigin: 'left center' }}>
            <div className="grid grid-rows-[1.15fr_0.85fr] gap-[7%] h-full">
              <img src={HERO_PHOTOS[1]} alt="" className="w-full h-full object-cover" />
              <div className="grid grid-cols-2 gap-[8%]">
                <img src={HERO_PHOTOS[2]} alt="" className="w-full h-full object-cover" />
                <img src={HERO_PHOTOS[3]} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
      <p className="absolute bottom-0 left-0 right-0 text-center text-[10px] uppercase tracking-[0.22em] text-neutral-400">
        {L(lang, 'Fotot bien në faqe · pastaj i rregulloni', 'Photos land on the pages · then you edit')}
      </p>
    </div>
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

        <section className="relative overflow-hidden border-b border-neutral-200/70">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage: `url(${HERO_PHOTOS[0]})`,
              backgroundSize: 'cover',
              backgroundPosition: '72% 28%',
              filter: 'saturate(0.75) brightness(1.14)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(105deg, ${PAPER}f0 0%, ${PAPER}c4 28%, ${PAPER}66 52%, transparent 82%), linear-gradient(to top, ${PAPER} 0%, ${PAPER}88 18%, transparent 42%)`,
            }}
          />
          <div className="relative max-w-6xl mx-auto px-5 md:px-8 pt-10 pb-10 md:pt-16 md:pb-16">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-center">
              <div className="order-2 lg:order-1">
                <motion.p
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-5"
                >
                  {L(lang, 'studio · album me AI', 'studio · album with AI')}
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="font-serif text-[clamp(2.05rem,4.6vw,3.45rem)] font-medium leading-[1.12] mb-5 overflow-visible"
                  style={{ color: INK }}
                >
                  {L(lang, 'Ngarkoni fotot. Ne i kthejmë në album.', 'Upload your photos. We turn them into an album.')}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="text-neutral-500 text-[15px] md:text-[16px] leading-relaxed max-w-xl mb-8"
                >
                  {L(
                    lang,
                    `Zgjidhni kujtimin, vendosni ${MIN_PHOTOS}–${MAX_PHOTOS} foto në rendin e historisë. Sistemi ynë zgjedh kopertinën, paraqitjen dhe paletën — pastaj hapet i njëjti editor, gati për t’i prekur me dorë para printimit.`,
                    `Choose the memory, lay ${MIN_PHOTOS}–${MAX_PHOTOS} photos in story order. We pick the cover, layouts and palette — then the same editor opens, ready for your hand before we print.`,
                  )}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
                  className="flex flex-wrap items-center gap-3 mb-10"
                >
                  <a
                    href="#fillo"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[13px] font-semibold text-white"
                    style={{ background: INK }}
                  >
                    {L(lang, 'Fillo me fotot e tua', 'Start with your photos')}
                    <ArrowRight size={14} />
                  </a>
                  <Link href="/krijo">
                    <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[13px] font-semibold border border-neutral-300 bg-white/70" style={{ color: INK }}>
                      {L(lang, 'Dizajno vetë', 'Design it yourself')}
                    </span>
                  </Link>
                </motion.div>
                <div className="grid grid-cols-3 gap-px bg-neutral-200/80 rounded-2xl overflow-hidden max-w-lg">
                  {[
                    { value: `${MIN_PHOTOS}–${MAX_PHOTOS}`, label: L(lang, 'foto në album', 'photos in the album') },
                    { value: L(lang, 'Editori', 'Editor'), label: L(lang, 'i njëjti, pas AI', 'the same, after AI') },
                    { value: '200g', label: L(lang, 'letër mat lay-flat', 'matte lay-flat paper') },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/70 px-3 py-4 md:px-4 md:py-5">
                      <p className="font-serif text-lg md:text-[1.35rem]" style={{ color: INK }}>{s.value}</p>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-400 mt-1 leading-snug">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <motion.div
                className="order-1 lg:order-2"
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.55 }}
              >
                <HeroSpread lang={lang} />
              </motion.div>
            </div>
          </div>
        </section>

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
            <section className="bg-white border-t border-neutral-100 py-16 md:py-24">
              <div className="max-w-6xl mx-auto px-5 md:px-8">
                <div className="max-w-xl mb-10 md:mb-14">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                    {L(lang, 'rituali', 'the ritual')}
                  </p>
                  <h2 className="font-serif text-3xl md:text-4xl font-medium leading-tight mb-4" style={{ color: INK }}>
                    {L(lang, 'Tre gjeste, një album i vërtetë', 'Three gestures, one real album')}
                  </h2>
                  <p className="text-neutral-500 text-[15px] leading-relaxed">
                    {L(
                      lang,
                      'Nuk është një kolazh i rastësishëm. Është i njëjti album që printojmë nga editori — vetëm se faqet nisin të rregulluara.',
                      'This is not a random collage. It is the same album we print from the editor — only the pages start already arranged.',
                    )}
                  </p>
                </div>
                <div className="grid sm:grid-cols-3 gap-5 md:gap-6">
                  {[
                    {
                      icon: BookOpen,
                      title: { sq: 'Zgjidhni kujtimin', en: 'Choose the memory' },
                      desc: {
                        sq: 'Dasmë, udhëtim, familje, miqësi ose festë. Paleta dhe kopertina ndjekin atë histori, jo një stil të përgjithshëm.',
                        en: 'Wedding, travel, family, friendship or a celebration. Palette and cover follow that story, not a generic look.',
                      },
                    },
                    {
                      icon: Images,
                      title: { sq: 'Vendosni fotot', en: 'Lay the photos' },
                      desc: {
                        sq: `E para bëhet kopertina, e fundit kapaku i pasëm. Çdo foto përdoret një herë — faqet mbeten të ajrosura, jo të mbushura.`,
                        en: 'The first becomes the cover, the last the back. Each photo is used once — spreads stay airy, never cramped.',
                      },
                    },
                    {
                      icon: PenLine,
                      title: { sq: 'Ne e nisim, ju e mbyllni', en: 'We start it, you finish it' },
                      desc: {
                        sq: 'Hapet i njëjti editor. Ndryshoni paraqitjen, tekstin, kornizat — pastaj e printojmë me letër mat 200g.',
                        en: 'The same editor opens. Change layout, type, frames — then we print it on matte 200g paper.',
                      },
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title.en}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ delay: i * 0.08, duration: 0.45 }}
                      className="rounded-[1.35rem] border border-neutral-100 bg-[#f7f4f0] p-6 md:p-7"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-5 text-white" style={{ background: INK }}>
                        <item.icon size={16} />
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2">0{i + 1}</p>
                      <h3 className="font-serif text-xl mb-2" style={{ color: INK }}>
                        {L(lang, item.title.sq, item.title.en)}
                      </h3>
                      <p className="text-[14px] text-neutral-500 leading-relaxed">
                        {L(lang, item.desc.sq, item.desc.en)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            <section className="py-16 md:py-24 border-t border-neutral-200/70">
              <div className="max-w-6xl mx-auto px-5 md:px-8">
                <div className="max-w-xl mb-10 md:mb-14">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                    {L(lang, 'çfarë vendosim', 'what we place')}
                  </p>
                  <h2 className="font-serif text-3xl md:text-4xl font-medium leading-tight mb-4" style={{ color: INK }}>
                    {L(lang, 'Jo një generator. Një studio që njeh albumin.', 'Not a generator. A studio that knows albums.')}
                  </h2>
                  <p className="text-neutral-500 text-[15px] leading-relaxed">
                    {L(
                      lang,
                      'Sistemi ynë punon me të njëjtat paraqitje, fonte dhe paleta që përdorni në editor — të prerë për Përgjithmonë, jo për çdo aplikacion foto.',
                      'Our system uses the same layouts, fonts and palettes you use in the editor — cut for Përgjithmonë, not for every photo app.',
                    )}
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
                  {[
                    {
                      icon: BookOpen,
                      title: { sq: 'Kopertina nga fotoja e parë', en: 'Cover from the first photo' },
                      desc: {
                        sq: 'Historia hapet me foton që vendosni të parën. E fundit e mbyll kapakun e pasëm — si një album i vërtetë.',
                        en: 'The story opens with the photo you place first. The last one closes the back cover — like a real album.',
                      },
                    },
                    {
                      icon: LayoutTemplate,
                      title: { sq: 'Paraqitje të ajrosura', en: 'Airy layouts' },
                      desc: {
                        sq: 'Faqet nuk mbushen me kolazhe. Çdo foto merr hapësirë, me hapje lay-flat që nuk e humb imazhin në mes.',
                        en: 'Pages are not stuffed with collages. Each photo gets room, with lay-flat spreads that do not lose the image in the gutter.',
                      },
                    },
                    {
                      icon: Palette,
                      title: { sq: 'Paletë sipas kujtimit', en: 'A palette for the memory' },
                      desc: {
                        sq: 'Dasma merr krem dhe ar; udhëtimi dritë dhe peizazh; familja ngrohtësi. Jo ngjyra të rastësishme.',
                        en: 'Wedding gets cream and gold; travel, light and landscape; family, warmth. Not random colours.',
                      },
                    },
                    {
                      icon: Clock,
                      title: { sq: 'Minuta, jo mbrëmje', en: 'Minutes, not an evening' },
                      desc: {
                        sq: 'Radhitja faqe për faqe zakonisht merr orë. Këtu niset brenda minutash — pastaj e prekni ju.',
                        en: 'Arranging page by page usually takes hours. Here it starts within minutes — then you touch it.',
                      },
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title.en}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ delay: i * 0.06, duration: 0.4 }}
                      className="rounded-2xl bg-white/80 border border-neutral-100 p-6 md:p-7"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-white" style={{ background: INK }}>
                        <item.icon size={16} />
                      </div>
                      <h3 className="font-serif text-xl mb-2" style={{ color: INK }}>
                        {L(lang, item.title.sq, item.title.en)}
                      </h3>
                      <p className="text-[14px] text-neutral-500 leading-relaxed">
                        {L(lang, item.desc.sq, item.desc.en)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white py-16 md:py-24 border-t border-neutral-100">
              <div className="max-w-6xl mx-auto px-5 md:px-8">
                <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                    {L(lang, 'dy rrugë, i njëjti printim', 'two paths, the same print')}
                  </p>
                  <h2 className="font-serif text-3xl md:text-4xl font-medium leading-tight" style={{ color: INK }}>
                    {L(lang, 'Ju mbeteni autori. Printimi nuk ndryshon.', 'You remain the author. The print does not change.')}
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                  <div className="rounded-[1.5rem] border border-neutral-800 p-7 md:p-9 flex flex-col text-white" style={{ background: DARK }}>
                    <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mb-5">
                      <Sparkles size={18} />
                    </div>
                    <h3 className="font-serif text-2xl mb-3">{L(lang, 'Nisni me AI', 'Start with AI')}</h3>
                    <p className="text-[14px] leading-relaxed text-white/60 mb-8">
                      {L(
                        lang,
                        `Ngarkoni ${MIN_PHOTOS}+ foto. Ne zgjedhim paraqitjen dhe paletën. Pastaj e rregulloni çdo faqe para se të printojmë.`,
                        `Upload ${MIN_PHOTOS}+ photos. We choose layout and palette. Then you fine-tune every page before we print.`,
                      )}
                    </p>
                    <a href="#fillo" className="mt-auto inline-flex items-center gap-2 text-[13px] font-semibold">
                      {L(lang, 'Fillo këtu', 'Begin here')}
                      <ArrowRight size={14} />
                    </a>
                  </div>
                  <div className="rounded-[1.5rem] border border-neutral-100 bg-[#f7f4f0] p-7 md:p-9 flex flex-col">
                    <div className="w-11 h-11 rounded-full bg-white border border-neutral-200 flex items-center justify-center mb-5">
                      <PenLine size={18} style={{ color: INK }} />
                    </div>
                    <h3 className="font-serif text-2xl mb-3" style={{ color: INK }}>
                      {L(lang, 'Dizajnoni çdo faqe', 'Design every page')}
                    </h3>
                    <p className="text-[14px] leading-relaxed text-neutral-500 mb-8">
                      {L(
                        lang,
                        'Zgjidhni stilin, madhësinë dhe paraqitjen. Vendosni fotot dhe tekstin — pikërisht si një album i vërtetë, faqe dyshe.',
                        'Pick style, size and layout. Place photos and type — like a real album, spread by spread.',
                      )}
                    </p>
                    <Link href="/krijo" className="mt-auto">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold" style={{ color: INK }}>
                        {L(lang, 'Hap editorin', 'Open the editor')}
                        <ArrowRight size={14} />
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-16 md:py-24 border-t border-neutral-200/70">
              <div className="max-w-6xl mx-auto px-5 md:px-8">
                <div className="max-w-xl mb-10 md:mb-14">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                    {L(lang, 'çfarë pret në kuti', 'what arrives in the box')}
                  </p>
                  <h2 className="font-serif text-3xl md:text-4xl font-medium leading-tight mb-4" style={{ color: INK }}>
                    {L(lang, 'I njëjti objekt. Asnjë shkurtim sepse e nisi AI.', 'The same object. No shortcut because AI started it.')}
                  </h2>
                  <p className="text-neutral-500 text-[15px] leading-relaxed">
                    {L(
                      lang,
                      'Letër galerie, hapje e sheshtë, kopertinë e fortë dhe dërgesë e kujdesshme në Shqipëri — si çdo album i dizajnuar me dorë.',
                      'Gallery paper, lay-flat opening, hardcover and careful delivery across Albania — like every album designed by hand.',
                    )}
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                  {[
                    { icon: Layers, title: { sq: 'Letër mat 200g', en: 'Matte 200g paper' }, desc: { sq: 'E butë, pa shkëlqim. Ngjyrat qëndrojnë të pasura në dritë ditore.', en: 'Soft, no glare. Colours stay rich in daylight.' } },
                    { icon: BookOpen, title: { sq: 'Hapje e sheshtë', en: 'Lay-flat binding' }, desc: { sq: 'Faqja dyshe hapet fare — asnjë foto nuk humbet në mes.', en: 'The spread opens fully — no photo lost in the gutter.' } },
                    { icon: Package, title: { sq: 'Kopertinë e fortë', en: 'Hardcover' }, desc: { sq: 'E menduar të rrijë në tryezë dhe në raft, jo vetëm në telefon.', en: 'Meant to live on a table and a shelf, not only on a phone.' } },
                    { icon: Truck, title: { sq: 'Kuti & dërgesë', en: 'Box & delivery' }, desc: { sq: '10–16 ditë në Shqipëri. Mund të paguani edhe në dorëzim.', en: '10–16 days in Albania. Cash on delivery too.' } },
                  ].map((item) => (
                    <div key={item.title.en} className="rounded-2xl bg-white/80 border border-neutral-100 p-6">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-white" style={{ background: INK }}>
                        <item.icon size={16} />
                      </div>
                      <h3 className="font-serif text-lg mb-2" style={{ color: INK }}>{L(lang, item.title.sq, item.title.en)}</h3>
                      <p className="text-[13.5px] text-neutral-500 leading-relaxed">{L(lang, item.desc.sq, item.desc.en)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white border-t border-neutral-100 py-16 md:py-24">
              <div className="max-w-2xl mx-auto px-5 md:px-8">
                <p className="text-center text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
                  {L(lang, 'pyetje nga shtëpia', 'questions from home')}
                </p>
                <h2 className="text-center font-serif text-3xl md:text-4xl font-medium leading-tight mb-10" style={{ color: INK }}>
                  {L(lang, 'Para se të ngarkoni fotot', 'Before you upload the photos')}
                </h2>
                <div className="space-y-2.5">
                  {[
                    {
                      q: { sq: 'A mbetet albumi i redaktueshëm?', en: 'Does the album stay editable?' },
                      a: {
                        sq: 'Po. Sapo lidhet, hapet direkt në editorin tonë. Ndryshoni çdo faqe, foto, tekst apo kornizë para se të porositeni.',
                        en: 'Yes. Once bound, it opens in our editor. Change any page, photo, caption or frame before you order.',
                      },
                    },
                    {
                      q: { sq: 'Sa foto duhen?', en: 'How many photos do I need?' },
                      a: {
                        sq: `Të paktën ${MIN_PHOTOS} për një album të plotë, deri në ${MAX_PHOTOS}. E para është kopertina, e fundit kapaku i pasëm.`,
                        en: `At least ${MIN_PHOTOS} for a full album, up to ${MAX_PHOTOS}. The first is the cover, the last is the back.`,
                      },
                    },
                    {
                      q: { sq: 'A kushton më shumë sepse e nisi AI?', en: 'Does it cost more because AI started it?' },
                      a: {
                        sq: 'Jo. Çmimi varet nga madhësia dhe faqet — i njëjti printim, e njëjta letër, qoftë me AI apo me editor.',
                        en: 'No. Price follows size and pages — the same print, the same paper, whether AI or the editor started it.',
                      },
                    },
                    {
                      q: { sq: 'Po nëse nuk më pëlqen paraqitja?', en: 'What if I do not like the layout?' },
                      a: {
                        sq: 'Ndryshojeni faqe për faqe në editor, ose ngarkoni sërish fotot. Printojmë vetëm kur jeni të kënaqur.',
                        en: 'Change it page by page in the editor, or upload again. We print only when you are happy.',
                      },
                    },
                  ].map((item, i) => (
                    <div key={item.q.en} className="rounded-xl border border-neutral-200/70 overflow-hidden bg-[#f7f4f0]/50">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/70 transition-colors"
                      >
                        <span className="font-medium text-[14px]" style={{ color: INK }}>
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

            <section className="py-16 md:py-24 text-center" style={{ background: DARK }}>
              <div className="max-w-lg mx-auto px-5">
                <h2 className="font-serif text-3xl md:text-4xl font-medium text-white mb-4 leading-tight">
                  {L(lang, 'Albumi juaj, i nisur nga fotot', 'Your album, started from the photos')}
                </h2>
                <p className="text-white/50 text-[15px] leading-relaxed mb-8">
                  {L(
                    lang,
                    'Filloni falas. Paguani kur jeni të kënaqur — kartë ose para në dorëzim, kudo në Shqipëri.',
                    'Start free. Pay when you are happy — card or cash on delivery, anywhere in Albania.',
                  )}
                </p>
                <a
                  href="#fillo"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white rounded-full text-[14px] font-semibold hover:bg-neutral-100 transition-colors"
                  style={{ color: DARK }}
                >
                  {L(lang, 'Ngarko fotot', 'Upload photos')}
                  <ArrowRight size={16} />
                </a>
                <p className="text-white/35 text-[11px] uppercase tracking-[0.16em] mt-5">
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
