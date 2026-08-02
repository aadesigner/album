import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useListCategories, useListBookSizes, useCreateProject, useGetAppSettings } from '@workspace/api-client-react-tsconfig';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, BookHeart, Check, BookX, Phone } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'wouter';
import { DESIGN_METAS, DESIGN_CATEGORY_LABELS, DB_CAT_TO_DESIGN_CAT, type DesignMeta } from '@/lib/designMeta';
import { DESIGNS } from '@/lib/designs';
import { ResponsivePageThumb } from '@/components/PageThumb';
import { SEOMeta } from '@/components/SEOMeta';
import { useToast } from '@/hooks/use-toast';
import { getCategoryImage } from '@/lib/categoryImages';


// ── Book size card ───────────────────────────────────────────────────────────
export function SizeCard({ size, isSelected, onClick, lang, t }: any) {
  const isSquare = size.widthCm === size.heightCm;
  // Proportional book shape — reference height 30cm
  const REF = 30;
  const bH = Math.round(72 * (size.heightCm / REF));
  const bW = Math.round(72 * (size.widthCm / REF));

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-neutral-900 shadow-xl bg-white'
          : 'ring-1 ring-neutral-200 hover:ring-neutral-400 hover:shadow-md bg-white'
      }`}
    >
      {/* Book visual */}
      <div className="flex justify-center items-end pt-8 pb-5" style={{ background: isSelected ? '#f7f5f2' : '#fafaf8' }}>
        <div className="relative flex-shrink-0" style={{ width: bW, height: bH }}>
          {/* Shadow */}
          <div style={{
            position: 'absolute', bottom: -6, left: '10%', right: '10%', height: 8,
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)',
            filter: 'blur(4px)',
          }} />
          {/* Book body */}
          <div style={{
            position: 'absolute', inset: 0,
            background: isSelected ? '#1a1a1a' : '#d4cfc8',
            borderRadius: '1px 3px 3px 1px',
            boxShadow: isSelected
              ? '2px 4px 14px rgba(0,0,0,0.32), inset -2px 0 0 rgba(255,255,255,0.06)'
              : '2px 4px 10px rgba(0,0,0,0.14), inset -2px 0 0 rgba(255,255,255,0.08)',
            transition: 'background 0.25s',
          }}>
            {/* Spine line */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.max(3, bW * 0.06),
              background: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              borderRadius: '1px 0 0 1px',
            }} />
            {/* Gloss */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(130deg, rgba(255,255,255,0.10) 0%, transparent 50%)',
              borderRadius: 'inherit',
            }} />
          </div>
          {/* Check */}
          {isSelected && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={Math.max(10, bH * 0.18)} className="text-white opacity-60" />
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pt-4 pb-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-serif text-base font-medium text-neutral-900 leading-tight">{size.label}</h3>
          <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider pt-0.5 flex-shrink-0">
            {size.widthCm} × {size.heightCm}
          </span>
        </div>

        <div className="mt-3 mb-4">
          <span className="text-2xl font-semibold text-neutral-900">{size.priceBase.toLocaleString()}</span>
          <span className="text-xs text-neutral-400 ml-1">LEK</span>
          <p className="text-[10px] text-neutral-400 mt-0.5">{size.minPages} {t('wizard.s3.basePages')}</p>
        </div>

        <div className="space-y-2 border-t border-neutral-100 pt-3">
          {[
            t('wizard.s3.paper'),
            t('wizard.s3.layflat'),
            `+${size.pricePerExtraSpread} ${t('wizard.s3.extraPage')}`,
          ].map((feat, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-neutral-300 flex-shrink-0" />
              <span className="text-[11px] text-neutral-500 leading-snug">{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Design card thumbnail ─────────────────────────────────────────────────────
function DesignCard({ design, isSelected, lang, onClick }: {
  design: DesignMeta; isSelected: boolean; lang: 'sq' | 'en'; onClick: () => void;
}) {
  // Render the *real* design elements (same data applyDesign() uses in the
  // Editor), so this preview is pixel-accurate to what the front cover, back
  // cover, and page background will actually look like once applied.
  const realDesign = useMemo(() => DESIGNS.find(d => d.id === design.id), [design.id]);
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="relative flex flex-col items-center gap-2 group focus:outline-none w-full"
    >
      <div
        className={`relative w-full overflow-hidden rounded-2xl transition-all duration-200 ${
          isSelected
            ? 'ring-2 ring-neutral-900 shadow-xl scale-[1.01]'
            : 'ring-1 ring-neutral-200 hover:ring-neutral-400 hover:shadow-lg'
        }`}
      >
        {realDesign?.thumbPhoto
          ? <div style={{ aspectRatio: '3/4', position: 'relative', overflow: 'hidden' }}>
              <img src={realDesign.thumbPhoto} alt={design.name[lang]} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}/>
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.15)' }}/>
            </div>
          : realDesign
            ? <ResponsivePageThumb elements={realDesign.elements} />
            : <div style={{ aspectRatio: '3/4', ...design.thumb }}>
                {design.thumbAccents.map((style, i) => <div key={i} style={{ position: 'absolute', ...style }} />)}
              </div>
        }

        {/* Selected state overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center shadow-md">
              <Check size={13} className="text-white" />
            </div>
          </div>
        )}
      </div>
      <span className={`text-[10px] text-center leading-tight truncate w-full px-0.5 transition-colors ${
        isSelected ? 'text-neutral-900 font-semibold' : 'text-neutral-400 group-hover:text-neutral-700'
      }`}>
        {design.name[lang]}
      </span>
    </motion.button>
  );
}

// ── Main Wizard ──────────────────────────────────────────────────────────────
export default function Wizard() {
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<number | null | 'blank'>('blank');
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const { data: categories, isLoading: loadingCat } = useListCategories();
  const { data: bookSizes, isLoading: loadingSizes } = useListBookSizes();
  const { data: settings } = useGetAppSettings();
  const createProject = useCreateProject();
  const { toast } = useToast();

  const siteSettings = settings as any;
  const bookCreationEnabled = siteSettings?.bookCreationEnabled !== false;
  const hiddenDesignIds: string[] = siteSettings?.hiddenDesignIds || [];

  // Map selected DB category → design category → filter designs
  const selectedCatName = useMemo(() => {
    if (selectedCategory === 'blank' || selectedCategory === null) return '';
    return (categories as any[])?.find((c: any) => c.id === selectedCategory)?.nameAl || '';
  }, [selectedCategory, categories]);
  const designCategoryKey = DB_CAT_TO_DESIGN_CAT[selectedCatName] || '';
  const shownDesigns = useMemo(() => {
    const base = designCategoryKey
      ? DESIGN_METAS.filter(d => d.category === designCategoryKey)
      : DESIGN_METAS;
    return hiddenDesignIds.length > 0
      ? base.filter(d => !hiddenDesignIds.includes(d.id))
      : base;
  }, [designCategoryKey, hiddenDesignIds]);
  const designCategoryLabel = designCategoryKey
    ? (DESIGN_CATEGORY_LABELS[designCategoryKey]?.[lang] || designCategoryKey)
    : (lang === 'sq' ? 'Të gjitha stilet' : 'All styles');

  const handleCategorySelect = (catId: number | 'blank') => {
    setSelectedCategory(catId);
    setSelectedDesignId(null);
    setStep(2);
  };

  const handleDesignSelect = (designId: string | null) => {
    setSelectedDesignId(designId);
    setStep(3);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const savedSize = sessionStorage.getItem('wizard_size');
    if (!savedSize) return;
    const sizeId = Number(savedSize);
    const savedDesign = sessionStorage.getItem('wizard_design') || null;
    sessionStorage.removeItem('wizard_size');
    sessionStorage.removeItem('wizard_design');
    sessionStorage.removeItem('wizard_category');
    if (savedDesign) sessionStorage.setItem('wizard_initial_design', savedDesign);
    const payload = { bookSizeId: sizeId, title: lang === 'sq' ? 'Albumi Im' : 'My Album' };
    const tryCreate = () => createProject.mutateAsync({ data: payload });
    tryCreate()
      .catch(() => new Promise((r) => setTimeout(r, 500)).then(tryCreate))
      .then(proj => setLocation(`/editor/${proj.id}`))
      .catch((e: any) => {
        console.error(e);
        const msg = e?.data?.error || e?.message;
        if (!msg) return; // silent on empty/transient failures after retry
        toast({
          title: lang === 'sq' ? 'Nuk mund të krijohet albumi' : 'Could not create photobook',
          description: msg,
          variant: 'destructive',
        });
      });
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!selectedSize) return;
    if (!isAuthenticated) {
      sessionStorage.setItem('wizard_size', String(selectedSize));
      sessionStorage.setItem('wizard_design', selectedDesignId || '');
      sessionStorage.setItem('wizard_category', String(selectedCategory));
      setLocation('/regjistrohu?next=/krijo');
      return;
    }
    const payload = { bookSizeId: selectedSize, title: lang === 'sq' ? 'Albumi Im' : 'My Album' };
    try {
      if (selectedDesignId) sessionStorage.setItem('wizard_initial_design', selectedDesignId);
      let proj;
      try {
        proj = await createProject.mutateAsync({ data: payload });
      } catch {
        await new Promise((r) => setTimeout(r, 500));
        proj = await createProject.mutateAsync({ data: payload });
      }
      setLocation(`/editor/${proj.id}`);
    } catch (e: any) {
      console.error('Failed to create project', e);
      const msg = e?.data?.error || e?.message;
      if (!msg) return;
      toast({
        title: lang === 'sq' ? 'Nuk mund të krijohet albumi' : 'Could not create photobook',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  const handleBack = () => { if (step > 1) setStep(s => s - 1); };

  const stepLabels = [t('wizard.step.category'), t('wizard.step.style'), t('wizard.step.size')];

  return (
    <AppLayout>
      <SEOMeta
        title={{ sq: 'Krijo Albumin Tënd', en: 'Create Your Photobook' }}
        description={{
          sq: 'Zgjidhni kategorinë, stilin dhe madhësinë e albumit tuaj foto, pastaj dizajnojeni online — porosi e thjeshtë, dërgesa në të gjithë Shqipërinë.',
          en: 'Choose your photobook category, style and size, then design it online — simple ordering, delivery across Albania.',
        }}
        path="/krijo"
      />
      <div style={{ background: '#f7f5f2' }} className="flex flex-col min-h-[calc(100dvh-62px)] md:min-h-[calc(100dvh-74px)]">

        {/* ── Progress header ── */}
        <div className="sticky top-[62px] md:top-[74px] z-10 bg-white/90 backdrop-blur-md border-b border-neutral-100">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center gap-0">
            {stepLabels.map((label, i) => {
              const s = i + 1;
              const isActive = step === s;
              const isDone = step > s;
              return (
                <React.Fragment key={s}>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                      isDone
                        ? 'bg-neutral-900 text-white'
                        : isActive
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-400'
                    }`}>
                      {isDone ? <Check size={10} /> : <span>{s}</span>}
                    </div>
                    <span className={`hidden sm:block text-[11px] uppercase tracking-[0.10em] font-semibold transition-colors duration-200 ${
                      isActive ? 'text-neutral-900' : isDone ? 'text-neutral-500' : 'text-neutral-300'
                    }`}>{label}</span>
                  </div>
                  {s < 3 && (
                    <div className="flex-1 mx-3 md:mx-4 h-px overflow-hidden bg-neutral-100">
                      <motion.div
                        className="h-full bg-neutral-800 origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isDone ? 1 : 0 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-6 md:py-10">

          {/* Book creation disabled notice */}
          {!bookCreationEnabled && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6 flex items-start gap-3 px-5 py-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900"
            >
              <BookX size={18} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="text-sm font-semibold mb-0.5">
                  {lang === 'sq' ? 'Krijimi i albumeve është i ndalur përkohësisht' : 'Book creation is temporarily unavailable'}
                </p>
                <p className="text-xs text-amber-700">
                  {lang === 'sq'
                    ? (siteSettings?.bookDisabledNoticeAl || 'Krijimi i albumeve është përkohësisht i ndalur.')
                    : (siteSettings?.bookDisabledNoticeEn || 'Book creation is temporarily unavailable.')}
                  {' '}
                  <a
                    href={`https://wa.me/${(siteSettings?.whatsappNumber || '+355688755833').replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="underline underline-offset-2 font-medium"
                  >
                    <Phone size={11} className="inline mr-0.5 -mt-0.5" />
                    {lang === 'sq' ? 'Na kontaktoni' : 'Contact us'}
                  </a>
                </p>
              </div>
            </motion.div>
          )}

          {/* Back */}
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] font-semibold text-neutral-400 hover:text-neutral-800 mb-6 md:mb-8 transition-colors group"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              {t('wizard.back')}
            </button>
          )}

          <AnimatePresence mode="wait">

            {/* ── STEP 1: Category ── */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <div className="mb-7 md:mb-10">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-2">01 / 03</p>
                  <h1 className="text-2xl md:text-[38px] font-serif font-medium text-neutral-900 leading-tight mb-2">
                    {t('wizard.s1.title')}
                  </h1>
                  <p className="text-neutral-500 text-sm max-w-lg leading-relaxed">{t('wizard.s1.subtitle')}</p>
                </div>

                {loadingCat ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {[1,2,3,4,5,6,7,8].map(i => (
                      <div key={i} className="rounded-2xl bg-neutral-200 animate-pulse" style={{ aspectRatio: '3/4' }} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {categories?.map((cat: any, idx: number) => {
                      const imgSrc = getCategoryImage(cat.nameAl, cat.coverImage, cat.slug);
                      return (
                        <motion.button
                          key={cat.id}
                          onClick={() => handleCategorySelect(cat.id)}
                          className="group relative rounded-2xl overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          style={{ aspectRatio: '3/4' }}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.045, duration: 0.3 }}
                          whileHover={{ y: -4, transition: { duration: 0.2 } }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <img
                            src={imgSrc}
                            alt={cat.nameAl}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                          {/* Gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent transition-opacity duration-300" />
                          {/* Hover tint */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

                          {/* Label */}
                          <div className="absolute bottom-0 left-0 right-0 p-3.5 md:p-4 text-left">
                            <span className="text-xl md:text-2xl block mb-1 leading-none">{cat.iconEmoji}</span>
                            <h3 className="text-white font-serif text-sm md:text-base font-medium leading-tight">
                              {lang === 'en' ? (cat.nameEn || cat.nameAl) : cat.nameAl}
                            </h3>
                          </div>

                          {/* Arrow chip */}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
                              <ChevronRight size={13} className="text-white" />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}

                    {/* Blank canvas */}
                    <motion.button
                      onClick={() => handleCategorySelect('blank')}
                      className="group relative rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-neutral-200 hover:border-neutral-400 bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      style={{ aspectRatio: '3/4' }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (categories?.length || 0) * 0.045, duration: 0.3 }}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-3">
                        <div className="w-11 h-11 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center group-hover:bg-neutral-900 group-hover:border-neutral-900 transition-all duration-200">
                          <BookHeart size={18} className="text-neutral-400 group-hover:text-white transition-colors duration-200" />
                        </div>
                        <p className="font-serif text-xs md:text-sm font-medium text-neutral-500 group-hover:text-neutral-800 transition-colors leading-snug text-center">
                          {t('wizard.s1.blank')}
                        </p>
                      </div>
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 2: Design Style ── */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <div className="mb-7 md:mb-10">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-2">02 / 03</p>
                  <h1 className="text-2xl md:text-[38px] font-serif font-medium text-neutral-900 leading-tight mb-2">
                    {lang === 'sq' ? 'Zgjidhni stilin tuaj' : 'Choose your design style'}
                  </h1>
                  <p className="text-neutral-500 text-sm max-w-lg leading-relaxed">
                    {lang === 'sq'
                      ? `${shownDesigns.length} stilet e gatshme — ${designCategoryLabel}. Ky dizajn do të aplikohet automatikisht në të gjitha faqet.`
                      : `${shownDesigns.length} ready-made styles — ${designCategoryLabel}. This design is applied automatically to every page.`
                    }
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                  {shownDesigns.map((design, idx) => (
                    <motion.div
                      key={design.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.025, duration: 0.28 }}
                    >
                      <DesignCard
                        design={design}
                        isSelected={selectedDesignId === design.id}
                        lang={lang as 'sq' | 'en'}
                        onClick={() => handleDesignSelect(design.id)}
                      />
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => handleDesignSelect(null)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-neutral-200 hover:border-neutral-400 text-[11px] uppercase tracking-[0.12em] text-neutral-400 hover:text-neutral-700 transition-all"
                  >
                    <BookHeart size={13} className="opacity-60" />
                    {lang === 'sq' ? 'Fillo pa dizajn' : 'Start without a design'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Size ── */}
            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <div className="mb-7 md:mb-10">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-2">03 / 03</p>
                  <h1 className="text-2xl md:text-[38px] font-serif font-medium text-neutral-900 leading-tight mb-2">
                    {t('wizard.s3.title')}
                  </h1>
                  <p className="text-neutral-500 text-sm max-w-lg leading-relaxed">{t('wizard.s3.subtitle')}</p>
                </div>

                {loadingSizes ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto">
                    {[1,2,3].map(i => <div key={i} className="h-64 bg-neutral-200 animate-pulse rounded-2xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto">
                    {bookSizes?.map((s: any, idx: number) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07, duration: 0.28 }}
                      >
                        <SizeCard
                          size={s}
                          isSelected={selectedSize === s.id}
                          onClick={() => setSelectedSize(s.id)}
                          lang={lang}
                          t={t}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Guest notice */}
                {!isAuthenticated && (
                  <motion.div
                    className="mt-8 max-w-lg mx-auto text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-[12px] text-neutral-400">
                      {lang === 'sq'
                        ? 'Do të duhet të krijoni llogari para se të vazhdoni.'
                        : "You'll need an account to continue."}
                      {' '}
                      <Link href="/regjistrohu" className="text-neutral-700 underline underline-offset-4 hover:text-neutral-900 transition-colors">
                        {lang === 'sq' ? 'Regjistrohu falas' : 'Sign up free'}
                      </Link>
                    </p>
                  </motion.div>
                )}

                {/* CTA */}
                <div className="flex justify-center mt-10 md:mt-12">
                  <motion.button
                    disabled={!selectedSize || createProject.isPending || !bookCreationEnabled}
                    onClick={handleCreate}
                    whileHover={selectedSize && bookCreationEnabled ? { scale: 1.02 } : {}}
                    whileTap={selectedSize && bookCreationEnabled ? { scale: 0.97 } : {}}
                    transition={{ duration: 0.16 }}
                    className="flex items-center gap-2.5 px-10 py-3.5 bg-neutral-900 text-white rounded-full text-[12.5px] font-semibold tracking-wide hover:bg-neutral-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                    title={!bookCreationEnabled ? (lang === 'sq' ? 'Krijimi i albumeve është i ndalur' : 'Book creation is disabled') : undefined}
                  >
                    {createProject.isPending ? (
                      <>
                        <motion.div
                          className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                        />
                        {t('wizard.s3.creating')}
                      </>
                    ) : (
                      <>
                        {t('wizard.s3.create')}
                        <ChevronRight size={15} className="opacity-70" />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}
