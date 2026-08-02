import React from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOMeta } from '@/components/SEOMeta';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Upload, Palette, Package, ArrowRight, Star, Shield, Clock } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
};

export default function HowItWorks() {
  const { lang } = useLanguage();

  const steps = [
    {
      num: '01',
      icon: Star,
      color: '#d4a843',
      bg: '#fdf8ed',
      title: { sq: 'Zgjidhni rastin', en: 'Pick your occasion' },
      desc: {
        sq: 'Filloni me dasëm, udhëtim, familje ose çfarëdo rasti special. Çdo kategori ka modele të dizajnuara enkas për ato momente.',
        en: 'Start with wedding, travel, family or any special moment. Each category comes with layouts crafted for those exact memories.',
      },
      visual: { sq: 'Dasmë · Udhëtim · Familje · Ditëlindje · Miqësi', en: 'Wedding · Travel · Family · Birthday · Friendship' },
    },
    {
      num: '02',
      icon: Upload,
      color: '#4a90c4',
      bg: '#eef5fb',
      title: { sq: 'Ngarkoni fotot tuaja', en: 'Upload your photos' },
      desc: {
        sq: 'Shtoni fotot nga celulari ose kompjuteri. Mbështesim çdo format dhe rezolucion. Sistemi organizon fotot automatikisht.',
        en: 'Add photos from your phone or computer. We support every format and resolution. The system arranges them automatically.',
      },
      visual: { sq: 'JPG · PNG · HEIC · Tërhiqni & Lëshoni', en: 'JPG · PNG · HEIC · Drag & Drop' },
    },
    {
      num: '03',
      icon: Palette,
      color: '#8b6cc4',
      bg: '#f3eefb',
      title: { sq: 'Personalizoni çdo faqe', en: 'Personalise every page' },
      desc: {
        sq: 'Lëvizni fotot, ndryshoni tekstet, zgjidhni fontet dhe personalizoni kopertinën. Kontroll i plotë mbi çdo detaj të albumit tuaj.',
        en: 'Move photos, edit text, pick fonts, personalise the cover. Full control over every detail — the way only you would want it.',
      },
      visual: { sq: 'Tekst · Ngjyra · Fontet · Faqosjet', en: 'Text · Colors · Fonts · Layouts' },
    },
    {
      num: '04',
      icon: Package,
      color: '#3a9e6f',
      bg: '#edf7f2',
      title: { sq: 'Printim dhe Dërgim', en: 'Printing & Delivery' },
      desc: {
        sq: 'Ne printojmë albumin tuaj me letër premium 200g dhe teknologji lay-flat. Arrihet te ju i paketuar me kujdes brenda 10–16 ditësh.',
        en: 'We print your album on premium 200g paper with lay-flat binding. It arrives carefully packaged within 10–16 working days.',
      },
      visual: { sq: '200g Letër mat · Lay-flat · Kuti premium', en: '200g Matte paper · Lay-flat · Premium box' },
    },
  ];

  const qualities = [
    { label: { sq: 'Letër premium', en: 'Premium paper' }, value: '200g', desc: { sq: 'Mat, pa reflektime', en: 'Matte, glare-free' } },
    { label: { sq: 'Hapje e sheshtë', en: 'Lay-flat binding' }, value: '180°', desc: { sq: 'Asnjë buzë e bardhë', en: 'Zero white border' } },
    { label: { sq: 'Rezolucion printimi', en: 'Print resolution' }, value: '300', desc: { sq: 'DPI — të mprehta gjithmonë', en: 'DPI — always sharp' } },
    { label: { sq: 'Garanci cilësie', en: 'Quality guarantee' }, value: '30', desc: { sq: 'ditë rikthim falas', en: 'day free return' } },
  ];

  const guarantees = [
    { icon: Star,   title: { sq: 'Cilësi e garantuar',   en: 'Guaranteed quality'   }, desc: { sq: '30 ditë rikthim pa pyetje', en: '30-day no-questions return' } },
    { icon: Shield, title: { sq: 'Të dhënat tuaja private', en: 'Your data private' }, desc: { sq: 'Fotot nuk ndahen me askënd', en: 'Photos never shared with anyone' } },
    { icon: Clock,  title: { sq: 'Dërgesë e garantuar', en: 'Guaranteed delivery'    }, desc: { sq: '10–16 ditë pune, kudo në Shqipëri', en: '10–16 days, anywhere in Albania' } },
  ];

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Si Funksionon', en: 'How It Works' }}
        description={{
          sq: 'Tre hapa të thjeshtë: zgjidhni madhësinë dhe stilin, dizajnoni faqet online me editorin tonë, dhe merrni librin tuaj brenda 10–16 ditësh.',
          en: 'Three simple steps: choose your size and style, design pages online with our editor, and receive your book within 10–16 days.',
        }}
        path="/si-funksionon"
      />
      {/* ── Hero ── */}
      <section className="bg-[#faf9f7] pt-14 pb-16 md:pt-20 md:pb-24 border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-5">
            {lang === 'sq' ? 'si funksionon' : 'how it works'}
          </motion.p>
          <motion.h1 variants={fadeUp} initial="hidden" animate="show"
            className="text-4xl sm:text-5xl md:text-6xl font-serif font-medium text-neutral-900 leading-[1.1] mb-6">
            {lang === 'sq'
              ? <>Katër hapa drejt<br/>albumit të ëndrrave</>
              : <>Four steps to<br/>your dream photobook</>}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-neutral-500 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            {lang === 'sq'
              ? 'Procesi ynë është i thjeshtë, elegant dhe i dizajnuar për t\'ju dhënë produktin më cilësor të mundshëm.'
              : 'Our process is simple, elegant and designed to give you the highest quality product possible.'}
          </motion.p>
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-5">
          <div className="relative">
            {/* Vertical connector line (desktop) */}
            <div className="hidden md:block absolute left-[27px] top-12 bottom-12 w-px bg-neutral-100" aria-hidden/>

            <div className="space-y-6 md:space-y-4">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.num}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex flex-col md:flex-row gap-5 md:gap-8 items-start group"
                  >
                    {/* Step number + icon bubble */}
                    <div className="flex md:flex-col items-center gap-3 md:gap-0 shrink-0">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative z-10 transition-transform group-hover:scale-105"
                        style={{ background: step.bg, border: `1px solid ${step.color}22` }}>
                        <Icon size={22} style={{ color: step.color }}/>
                      </div>
                      <span className="md:hidden text-[11px] font-bold tracking-widest" style={{ color: step.color }}>
                        {step.num}
                      </span>
                    </div>

                    {/* Content card */}
                    <div className="flex-1 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-neutral-100 hover:border-neutral-200 transition-colors bg-white hover:shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="hidden md:inline text-[11px] font-bold tracking-widest" style={{ color: step.color }}>
                          {step.num}
                        </span>
                        <h3 className="text-xl md:text-2xl font-serif font-medium text-neutral-900">
                          {step.title[lang]}
                        </h3>
                      </div>
                      <p className="text-neutral-500 text-[15px] leading-relaxed mb-4">
                        {step.desc[lang]}
                      </p>
                      {/* Tags row */}
                      <div className="flex flex-wrap gap-2">
                        {step.visual[lang].split(' · ').map((tag, ti) => (
                          <span key={ti} className="text-[11px] px-3 py-1 rounded-full font-medium"
                            style={{ background: step.bg, color: step.color }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quality numbers ── */}
      <section className="bg-[#1a1a1a] py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-5">
          <p className="text-center text-[11px] uppercase tracking-[0.3em] text-white/30 mb-10">
            {lang === 'sq' ? 'Standardet e cilësisë' : 'Quality standards'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden">
            {qualities.map((q, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show"
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-[#1a1a1a] px-6 py-8 text-center">
                <div className="text-4xl md:text-5xl font-serif font-semibold text-white mb-1">{q.value}</div>
                <div className="text-[11px] text-white/40 uppercase tracking-widest mb-1">{q.label[lang]}</div>
                <div className="text-[12px] text-white/25">{q.desc[lang]}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Guarantees ── */}
      <section className="bg-[#faf9f7] py-16 md:py-24 border-t border-neutral-100">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-serif font-medium text-neutral-900">
              {lang === 'sq' ? 'Pse të zgjidhni Përgjithmonë?' : 'Why choose Përgjithmonë?'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {guarantees.map((g, i) => {
              const GIcon = g.icon;
              return (
                <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show"
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-7 border border-neutral-100">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center mb-4">
                    <GIcon size={18} className="text-white"/>
                  </div>
                  <h4 className="font-medium text-neutral-900 mb-2">{g.title[lang]}</h4>
                  <p className="text-[13px] text-neutral-500 leading-relaxed">{g.desc[lang]}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-white py-20 md:py-28 border-t border-neutral-100">
        <div className="max-w-xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-medium text-neutral-900 mb-4">
            {lang === 'sq' ? 'Gati për të filluar?' : 'Ready to start?'}
          </h2>
          <p className="text-neutral-500 text-[15px] mb-8">
            {lang === 'sq'
              ? 'Krijoni albumin tuaj falas. Paguani vetëm kur jeni të kënaqur.'
              : 'Create your album for free. Pay only when you\'re happy with it.'}
          </p>
          <Link href="/krijo">
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-[#1a1a1a] text-white rounded-full text-[15px] font-medium hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-900/10">
              {lang === 'sq' ? 'Krijo albumin tënd' : 'Create your photobook'}
              <ArrowRight size={16}/>
            </button>
          </Link>
          <p className="text-[12px] text-neutral-400 mt-4">
            {lang === 'sq' ? 'Pa regjistrim · Pa kartë krediti' : 'No sign-up · No credit card'}
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
