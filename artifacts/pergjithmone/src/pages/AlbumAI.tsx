import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SEOMeta } from '@/components/SEOMeta';
import {
  useListCategories, useListBookSizes, useGetAppSettings,
  useCreateProject, useAddProjectPage, getProject,
} from '@workspace/api-client-react-tsconfig';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, UploadCloud, X, Check, ChevronRight, ArrowLeft,
  Loader2, ImageOff, Wand2, LayoutTemplate, Palette, BookOpen, PartyPopper,
  Clock, Images, PenLine, Truck, Plus, Minus,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { resolveDesignCategory } from '@/lib/designMeta';
import { generateAlbum, suggestInnerPageCount } from '@/lib/albumGenerator';
import { compressImageFile } from '@/lib/imageCompression';
import { pendingBooksLimitMessage } from '@/lib/projectErrors';
import { SizeCard } from './Wizard';
import { getCategoryImage } from '@/lib/categoryImages';

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
      const compressed = await compressImageFile(item.file);
      const token = getToken();
      const fd = new FormData();
      fd.append('file', compressed);
      const r = await fetch('/api/uploads/image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      if (!data.url) throw new Error('No URL returned');
      setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, status: 'done', url: data.url } : p));
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
      const designCategoryKey = resolveDesignCategory(cat);

      if (!photoUrls.length) {
        throw new Error('NO_PHOTOS');
      }

      setGenStageIndex(0); // project
      const chosenSize = ((bookSizes as any[]) || []).find(s => s.id === sizeId);
      if (!chosenSize) throw new Error('No book sizes available');
      // ~1.75 photos/page so the planner can use clean 1–2 photo layouts
      // without wrapping the same image across pages.
      const desiredInner = suggestInnerPageCount(photoUrls.length, 4);
      const finalInner = Math.max(desiredInner, chosenSize.minPages);

      const project = await createProject.mutateAsync({
        data: { bookSizeId: chosenSize.id, title: lang === 'sq' ? 'Albumi Im AI' : 'My AI Album' },
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
    <AppLayout>
      <SEOMeta
        title={{ sq: 'Krijo Album me AI', en: 'AI Photobook Maker' }}
        description={{
          sq: 'Ngarko fotot e tua dhe lëri sistemin tonë të krijojë automatikisht një album foto të plotë — struktura, ngjyrat dhe dizajni zgjidhen për ty, gati për t\'u redaktuar.',
          en: 'Upload your photos and let our system automatically build a complete photobook — layouts, colors, and design chosen for you, ready to fine-tune.',
        }}
        path="/album-ai"
      />

      <div style={{ background: '#f7f5f2' }} className="min-h-[calc(100dvh-42px)] md:min-h-[calc(100dvh-64px)]">

        {/* ── Hero ── */}
        <div className="relative max-w-4xl mx-auto px-4 md:px-8 pt-12 md:pt-16 pb-6 text-center overflow-hidden">
          {/* Ambient floating sparkles */}
          <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
            {[
              { top: '8%', left: '8%', size: 12, delay: 0 },
              { top: '18%', left: '88%', size: 9, delay: 0.6 },
              { top: '62%', left: '4%', size: 10, delay: 1.2 },
              { top: '70%', left: '92%', size: 13, delay: 0.3 },
              { top: '4%', left: '48%', size: 8, delay: 0.9 },
            ].map((s, i) => (
              <motion.div
                key={i}
                className="absolute text-neutral-300"
                style={{ top: s.top, left: s.left }}
                animate={{ opacity: [0.15, 0.55, 0.15], y: [0, -8, 0] }}
                transition={{ duration: 3.4, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
              >
                <Sparkles size={s.size} />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 text-white text-[10px] uppercase tracking-[0.16em] font-semibold mb-5"
          >
            <Sparkles size={12} /> {lang === 'sq' ? 'E Re' : 'New'}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
            className="relative text-3xl md:text-[48px] font-serif font-medium text-neutral-900 leading-tight mb-4"
          >
            {lang === 'sq' ? <>Album Foto në Sekonda <span className="relative inline-block whitespace-nowrap">me AI
              <svg className="absolute left-0 -bottom-1.5 w-full" height="10" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden>
                <path d="M2 7 Q 100 -2 198 7" stroke="#d4a574" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
            </span></> : <>Your Photobook, Built by <span className="relative inline-block whitespace-nowrap">AI
              <svg className="absolute left-0 -bottom-1.5 w-full" height="10" viewBox="0 0 60 10" preserveAspectRatio="none" aria-hidden>
                <path d="M2 7 Q 30 -2 58 7" stroke="#d4a574" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
            </span> in Seconds</>}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-neutral-500 text-sm md:text-base max-w-xl mx-auto leading-relaxed"
          >
            {lang === 'sq'
              ? 'Zgjidh kategorinë, ngarko fotot e tua — sistemi zgjedh automatikisht strukturën, ngjyrat dhe dekorimet për çdo faqe. Redakto lirshëm më pas.'
              : 'Pick a category, upload your photos — our system automatically chooses the layout, colors, and decorations for every page. Fine-tune anything afterwards.'}
          </motion.p>

          {/* Trust chips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}
            className="flex flex-wrap items-center justify-center gap-2.5 mt-7"
          >
            {[
              { icon: Clock, label: lang === 'sq' ? 'Gati brenda minutash' : 'Ready within minutes' },
              { icon: Images, label: lang === 'sq' ? `Deri ${MAX_PHOTOS} foto` : `Up to ${MAX_PHOTOS} photos` },
              { icon: PenLine, label: lang === 'sq' ? 'Redaktueshëm plotësisht' : 'Fully editable after' },
            ].map((chip, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm text-[11.5px] font-medium text-neutral-600">
                <chip.icon size={13} className="text-neutral-400" /> {chip.label}
              </span>
            ))}
          </motion.div>

          {/* How it works */}
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mt-8 mb-2 text-[11px] uppercase tracking-[0.1em] text-neutral-400">
            {[
              lang === 'sq' ? '1. Zgjidh kategorinë' : '1. Choose category',
              lang === 'sq' ? '2. Ngarko fotot' : '2. Upload photos',
              lang === 'sq' ? '3. Redakto & porosit' : '3. Edit & order',
            ].map((s, i) => (
              <React.Fragment key={i}>
                <span className="font-semibold text-neutral-600">{s}</span>
                {i < 2 && <ChevronRight size={12} className="opacity-40" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {!bookCreationEnabled && (
          <div className="max-w-3xl mx-auto px-4 mb-6">
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm">
              {lang === 'sq' ? 'Krijimi i albumeve është përkohësisht i ndalur.' : 'Book creation is temporarily unavailable.'}
            </div>
          </div>
        )}

        {/* ── Steps ── */}
        <div className="max-w-3xl mx-auto px-4 md:px-8 pb-16">
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
                        {lang === 'sq' ? 'Albumi yt është gati' : 'Your album is ready'}
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
                        {lang === 'sq' ? 'Albumi u krijua!' : 'Your album is ready!'}
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
                          className="absolute inset-0 rounded-full bg-neutral-900 flex items-center justify-center shadow-xl"
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

                      <h2 className="font-serif text-xl font-medium text-neutral-900 mb-2">
                        {lang === 'sq' ? 'Duke krijuar albumin tënd...' : 'Building your album...'}
                      </h2>
                      <p className="text-sm text-neutral-500 mb-8 max-w-xs">
                        {lang === 'sq'
                          ? 'Po zgjedhim kopertinat, layout-et dhe vendosim fotot — çdo herë ndryshe.'
                          : 'Picking covers, layouts and placing your photos — different every time.'}
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
                <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-2 text-center">01 / 03</p>
                <h2 className="text-xl md:text-2xl font-serif font-medium text-neutral-900 leading-tight mb-6 text-center">
                  {lang === 'sq' ? 'Çfarë albumi po krijon?' : 'What kind of album are you making?'}
                </h2>

                {loadingCat ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="rounded-2xl bg-neutral-200 animate-pulse" style={{ aspectRatio: '3/4' }} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categories?.map((cat: any, i: number) => {
                      const imgSrc = getCategoryImage(cat.nameAl, cat.coverImage, cat.slug);
                      return (
                        <motion.button
                          key={cat.id}
                          onClick={() => handleCategorySelect(cat.id)}
                          className="group relative rounded-2xl overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          style={{ aspectRatio: '3/4' }}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.4 }}
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <img src={imgSrc} alt={cat.nameAl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
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
                        </motion.button>
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
                <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-2 text-center">02 / 03</p>
                <h2 className="text-xl md:text-2xl font-serif font-medium text-neutral-900 leading-tight mb-2 text-center">
                  {lang === 'sq' ? 'Ngarko fotot e tua' : 'Upload your photos'}
                </h2>
                <p className="text-sm text-neutral-500 text-center mb-6">
                  {lang === 'sq'
                    ? `Të paktën ${MIN_PHOTOS} foto për një album të plotë dhe të larmishëm.`
                    : `At least ${MIN_PHOTOS} photos for a full, varied album.`}
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
                  className={`rounded-2xl border-2 border-dashed transition-colors duration-150 flex flex-col items-center justify-center text-center py-10 px-6 mb-6 ${
                    !bookCreationEnabled ? 'cursor-not-allowed opacity-50 border-neutral-200 bg-neutral-50'
                      : photos.length >= MAX_PHOTOS ? 'cursor-default border-neutral-200 bg-neutral-50'
                      : dragActive ? 'cursor-pointer border-neutral-800 bg-neutral-100' : 'cursor-pointer border-neutral-300 bg-white hover:border-neutral-500'
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

                {/* Thumbnails */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mb-8">
                    {photos.map(p => (
                      <div key={p.id} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '1/1' }}>
                        <img src={p.previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
                    ))}
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={handleContinueToSize}
                    disabled={!canGenerate}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-neutral-900 text-white text-[12px] uppercase tracking-[0.16em] font-semibold hover:bg-neutral-700 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-900"
                  >
                    {lang === 'sq' ? 'Vazhdo' : 'Continue'}
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
                <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-2 text-center">03 / 03</p>
                <h2 className="text-xl md:text-2xl font-serif font-medium text-neutral-900 leading-tight mb-2 text-center">
                  {lang === 'sq' ? 'Zgjidh madhësinë e albumit' : 'Choose your album size'}
                </h2>
                <p className="text-sm text-neutral-500 text-center mb-6 max-w-md mx-auto">
                  {lang === 'sq'
                    ? `Bazuar në ${doneCount} fotot e tua, kemi zgjedhur madhësinë më të përshtatshme. Mund ta ndryshosh nëse dëshiron.`
                    : `Based on your ${doneCount} photos, we picked the best-fitting size. Feel free to change it.`}
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
                    {lang === 'sq' ? 'Krijo albumin tim' : 'Generate my album'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Explanation sections ── */}
        {!generating && (
          <>
            {/* How it works, in detail */}
            <section className="border-t border-neutral-200/70 bg-white">
              <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20">
                <div className="text-center max-w-lg mx-auto mb-12">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-2">
                    {lang === 'sq' ? 'Si funksionon' : 'How it works'}
                  </p>
                  <h2 className="text-2xl md:text-[32px] font-serif font-medium text-neutral-900 leading-tight">
                    {lang === 'sq' ? 'Nga fotot te albumi, në tre hapa' : 'From photos to a finished album in three steps'}
                  </h2>
                </div>

                <div className="grid sm:grid-cols-3 gap-6 md:gap-8">
                  {[
                    {
                      icon: LayoutTemplate,
                      title: { sq: 'Zgjidh kategorinë', en: 'Choose a category' },
                      desc: {
                        sq: 'Dasmë, udhëtim, familje apo ditëlindje — çdo kategori ka paletën, shkronjat dhe dekorimet e veta të gatshme.',
                        en: 'Wedding, travel, family or birthday — each category comes with its own ready-made palette, fonts and decorations.',
                      },
                    },
                    {
                      icon: UploadCloud,
                      title: { sq: 'Ngarko fotot e tua', en: 'Upload your photos' },
                      desc: {
                        sq: `Të paktën ${MIN_PHOTOS}, deri në ${MAX_PHOTOS} foto. Ngarkohen direkt nga telefoni ose kompjuteri, pa asnjë rregullim manual.`,
                        en: `At least ${MIN_PHOTOS}, up to ${MAX_PHOTOS} photos. Upload straight from your phone or computer — no manual sorting needed.`,
                      },
                    },
                    {
                      icon: Wand2,
                      title: { sq: 'AI dizajnon, ti redakton', en: 'AI designs, you fine-tune' },
                      desc: {
                        sq: 'Sistemi rregullon çdo faqe automatikisht — paraqitje, radhitje dhe dekorime. Pastaj hap editorin dhe ndrysho çka të duash.',
                        en: 'The system lays out every page automatically — layout, ordering and decorations. Then open the editor and change anything you like.',
                      },
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ delay: i * 0.08, duration: 0.45 }}
                      className="relative text-center sm:text-left"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-neutral-900 flex items-center justify-center mb-4 mx-auto sm:mx-0">
                        <item.icon size={18} className="text-white" />
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-300 font-semibold mb-1.5">
                        0{i + 1}
                      </p>
                      <h3 className="font-serif text-lg font-medium text-neutral-900 mb-2">
                        {lang === 'sq' ? item.title.sq : item.title.en}
                      </h3>
                      <p className="text-[13.5px] text-neutral-500 leading-relaxed">
                        {lang === 'sq' ? item.desc.sq : item.desc.en}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* Why let AI build it */}
            <section style={{ background: '#f7f5f2' }}>
              <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20">
                <div className="text-center max-w-lg mx-auto mb-12">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-2">
                    {lang === 'sq' ? 'Përse AI' : 'Why AI'}
                  </p>
                  <h2 className="text-2xl md:text-[32px] font-serif font-medium text-neutral-900 leading-tight">
                    {lang === 'sq' ? 'E njëjta cilësi, pa orë pune' : 'Same quality, none of the manual work'}
                  </h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
                  {[
                    {
                      icon: Clock,
                      title: { sq: 'Shpejtësi e vërtetë', en: 'Genuinely fast' },
                      desc: {
                        sq: 'Zakonisht duhen orë të tëra për të radhitur fotot faqe për faqe. Me AI, albumi yt është gati brenda pak minutash.',
                        en: 'Arranging photos page by page usually takes hours. With AI, your album is ready within a few minutes.',
                      },
                    },
                    {
                      icon: Palette,
                      title: { sq: 'Dizajn i menduar', en: 'Thoughtful design' },
                      desc: {
                        sq: 'Ngjyrat, shkronjat dhe dekorimet zgjidhen sipas kategorisë që ke zgjedhur, jo në mënyrë të rastësishme.',
                        en: 'Colors, fonts and decorations are chosen to match your category, not applied at random.',
                      },
                    },
                    {
                      icon: PenLine,
                      title: { sq: 'Ende në kontroll tënd', en: 'You stay in control' },
                      desc: {
                        sq: 'Rezultati i AI-së është vetëm pika e nisjes. Hape editorin dhe ndrysho çdo faqe, foto apo tekst siç dëshiron.',
                        en: 'The AI result is just a starting point. Open the editor and change any page, photo or text however you like.',
                      },
                    },
                    {
                      icon: Truck,
                      title: { sq: 'E njëjta cilësi printimi', en: 'Same print quality' },
                      desc: {
                        sq: 'Albumi yt printohet me letër mat 200g dhe lidhje layflat — pikërisht si çdo album i krijuar manualisht.',
                        en: 'Your album is printed on matte 200g paper with lay-flat binding — exactly like a manually designed one.',
                      },
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ delay: i * 0.06, duration: 0.4 }}
                      className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-neutral-200/70"
                    >
                      <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                        <item.icon size={16} className="text-neutral-700" />
                      </div>
                      <div>
                        <h3 className="font-serif text-[15px] font-medium text-neutral-900 mb-1">
                          {lang === 'sq' ? item.title.sq : item.title.en}
                        </h3>
                        <p className="text-[13px] text-neutral-500 leading-relaxed">
                          {lang === 'sq' ? item.desc.sq : item.desc.en}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section className="border-t border-neutral-200/70 bg-white">
              <div className="max-w-2xl mx-auto px-4 md:px-8 py-16 md:py-20">
                <div className="text-center mb-10">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-2">
                    {lang === 'sq' ? 'Pyetje' : 'FAQ'}
                  </p>
                  <h2 className="text-2xl md:text-[32px] font-serif font-medium text-neutral-900 leading-tight">
                    {lang === 'sq' ? 'Pyetje të shpeshta' : 'Frequently asked questions'}
                  </h2>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      q: { sq: 'A mund ta redaktoj albumin pasi ta krijojë AI?', en: 'Can I edit the album after AI creates it?' },
                      a: {
                        sq: 'Po, plotësisht. Pas krijimit, albumi hapet direkt në editorin tonë ku mund të ndryshosh çdo faqe, foto, tekst apo dekorim.',
                        en: 'Yes, completely. Once created, the album opens directly in our editor where you can change any page, photo, text or decoration.',
                      },
                    },
                    {
                      q: { sq: 'Sa foto duhen për një album?', en: 'How many photos do I need?' },
                      a: {
                        sq: `Të paktën ${MIN_PHOTOS} foto për një album të plotë e të larmishëm, deri në ${MAX_PHOTOS} foto në total.`,
                        en: `At least ${MIN_PHOTOS} photos for a full, varied album, up to ${MAX_PHOTOS} photos total.`,
                      },
                    },
                    {
                      q: { sq: 'A ndryshon çmimi nëse e krijoj me AI?', en: 'Does it cost more to create it with AI?' },
                      a: {
                        sq: 'Jo. Çmimi varet vetëm nga madhësia dhe numri i faqeve të albumit, jo nga mënyra se si e krijove — manualisht apo me AI.',
                        en: 'No. Price only depends on the book size and page count, not on whether you built it manually or with AI.',
                      },
                    },
                    {
                      q: { sq: 'Po nëse nuk më pëlqen dizajni i gjeneruar?', en: 'What if I don\'t like the generated design?' },
                      a: {
                        sq: 'Mund ta rigjenerosh me foto të tjera ose ta redaktosh lirshëm çdo faqe në editor derisa të jesh i/e kënaqur.',
                        en: 'You can regenerate it with different photos, or freely edit any page in the editor until you\'re happy with it.',
                      },
                    },
                  ].map((item, i) => (
                    <div key={i} className="rounded-xl border border-neutral-200/70 overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-neutral-50 transition-colors"
                      >
                        <span className="font-medium text-[14px] text-neutral-800">
                          {lang === 'sq' ? item.q.sq : item.q.en}
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
                              {lang === 'sq' ? item.a.sq : item.a.en}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
