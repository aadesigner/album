import React from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { SEOMeta } from '@/components/SEOMeta';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Upload, Palette, Package, ArrowRight, Star, Shield, Clock } from 'lucide-react';
import { PageContentProvider, usePageFields } from '@/components/marketing/PageContent';
import { Editable, EditableSection } from '@/components/marketing/Editable';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
};

const STEP_META = [
  { num: '01', icon: Star, color: '#d4a843', bg: '#fdf8ed' },
  { num: '02', icon: Upload, color: '#4a90c4', bg: '#eef5fb' },
  { num: '03', icon: Palette, color: '#8b6cc4', bg: '#f3eefb' },
  { num: '04', icon: Package, color: '#3a9e6f', bg: '#edf7f2' },
];
const WHY_ICONS = [Star, Shield, Clock];

export default function HowItWorks() {
  return (
    <PageContentProvider slug="how-it-works">
      <HowItWorksView />
    </PageContentProvider>
  );
}

function HowItWorksView() {
  const p = usePageFields();

  return (
    <MarketingLayout>
      <SEOMeta
        title={p.txtAll('seo.title')}
        description={p.txtAll('seo.description')}
        path="/si-funksionon"
      />
      {/* ── Hero ── */}
      <EditableSection path="hero" className="bg-[#faf9f7] pt-14 pb-16 md:pt-20 md:pb-24 border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-5">
            <Editable path="hero.kicker">{p.txt('hero.kicker')}</Editable>
          </motion.p>
          <motion.h1 variants={fadeUp} initial="hidden" animate="show"
            className="text-4xl sm:text-5xl md:text-6xl font-serif font-medium text-neutral-900 leading-[1.1] mb-6">
            <Editable path="hero.title">{p.txt('hero.title')}</Editable>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-neutral-500 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            <Editable path="hero.body">{p.txt('hero.body')}</Editable>
          </motion.p>
        </div>
      </EditableSection>

      {/* ── Steps ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-5">
          <div className="relative">
            {/* Vertical connector line (desktop) */}
            <div className="hidden md:block absolute left-[27px] top-12 bottom-12 w-px bg-neutral-100" aria-hidden/>

            <div className="space-y-6 md:space-y-4">
              {STEP_META.map((step, idx) => {
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
                          <Editable path={`steps.${idx}.title`}>{p.txt(`steps.${idx}.title`)}</Editable>
                        </h3>
                      </div>
                      <p className="text-neutral-500 text-[15px] leading-relaxed mb-4">
                        <Editable path={`steps.${idx}.desc`}>{p.txt(`steps.${idx}.desc`)}</Editable>
                      </p>
                      <Editable path={`steps.${idx}.visual`} as="div" className="flex flex-wrap gap-2">
                        {p.txt(`steps.${idx}.visual`).split(' · ').map((tag, ti) => (
                          <span key={ti} className="text-[11px] px-3 py-1 rounded-full font-medium"
                            style={{ background: step.bg, color: step.color }}>
                            {tag}
                          </span>
                        ))}
                      </Editable>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quality numbers ── */}
      <EditableSection path="quality" className="bg-[#1a1a1a] py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-5">
          <p className="text-center text-[11px] uppercase tracking-[0.3em] text-white/30 mb-10">
            <Editable path="quality.kicker">{p.txt('quality.kicker')}</Editable>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden">
            {p.list('quality.items').map((_, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show"
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-[#1a1a1a] px-6 py-8 text-center">
                <div className="text-4xl md:text-5xl font-serif font-semibold text-white mb-1">
                  <Editable path={`quality.items.${i}.value`}>{p.txt(`quality.items.${i}.value`)}</Editable>
                </div>
                <div className="text-[11px] text-white/40 uppercase tracking-widest mb-1">
                  <Editable path={`quality.items.${i}.label`}>{p.txt(`quality.items.${i}.label`)}</Editable>
                </div>
                <div className="text-[12px] text-white/25">
                  <Editable path={`quality.items.${i}.desc`}>{p.txt(`quality.items.${i}.desc`)}</Editable>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </EditableSection>

      {/* ── Guarantees ── */}
      <EditableSection path="why" className="bg-[#faf9f7] py-16 md:py-24 border-t border-neutral-100">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-serif font-medium text-neutral-900">
              <Editable path="why.title">{p.txt('why.title')}</Editable>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {p.list('why.items').map((_, i) => {
              const GIcon = WHY_ICONS[i] || Star;
              return (
                <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show"
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-7 border border-neutral-100">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center mb-4">
                    <GIcon size={18} className="text-white"/>
                  </div>
                  <h4 className="font-medium text-neutral-900 mb-2">
                    <Editable path={`why.items.${i}.title`}>{p.txt(`why.items.${i}.title`)}</Editable>
                  </h4>
                  <p className="text-[13px] text-neutral-500 leading-relaxed">
                    <Editable path={`why.items.${i}.desc`}>{p.txt(`why.items.${i}.desc`)}</Editable>
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </EditableSection>

      {/* ── Final CTA ── */}
      <EditableSection path="cta" className="bg-white py-20 md:py-28 border-t border-neutral-100">
        <div className="max-w-xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-medium text-neutral-900 mb-4">
            <Editable path="cta.title">{p.txt('cta.title')}</Editable>
          </h2>
          <p className="text-neutral-500 text-[15px] mb-8">
            <Editable path="cta.body">{p.txt('cta.body')}</Editable>
          </p>
          <Link href="/krijo">
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-[#1a1a1a] text-white rounded-full text-[15px] font-medium hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-900/10">
              <Editable path="cta.button">{p.txt('cta.button')}</Editable>
              <ArrowRight size={16}/>
            </button>
          </Link>
          <p className="text-[12px] text-neutral-400 mt-4">
            <Editable path="cta.note">{p.txt('cta.note')}</Editable>
          </p>
        </div>
      </EditableSection>
    </MarketingLayout>
  );
}
