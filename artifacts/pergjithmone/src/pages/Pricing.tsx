import React, { useState } from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOMeta } from '@/components/SEOMeta';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Truck, ArrowRight, ChevronDown } from 'lucide-react';

const PLANS = [
  {
    key: 'square',
    name:     { sq: 'Katror',              en: 'Square'             },
    dim:      '21 × 21 cm',
    desc:     { sq: 'Perfekt për Instagram, dhurata dhe albume të përditshme.', en: 'Perfect for Instagram, gifts and everyday albums.' },
    price:    3100,
    badge:    { sq: 'Më e kërkuara',       en: 'Most popular'       },
    badgeBg:  '#1a1a1a',
    extra:    { sq: '+100 LEK / fletë shtesë', en: '+100 LEK / extra leaf' },
    features: [
      { sq: 'Kopertinë e fortë me printim cilësor', en: 'Hard cover with quality printing' },
      { sq: 'Letër premium mat 200g',               en: 'Premium matte 200g paper'         },
      { sq: 'Hapje e sheshtë (lay-flat)',            en: 'Lay-flat binding'                 },
      { sq: '24 faqe të përfshira (12 fletë)',       en: '24 pages included (12 leaves)'   },
      { sq: 'Paketim premium',                      en: 'Premium packaging'               },
    ],
  },
  {
    key: 'portrait',
    name:    { sq: 'Portret',              en: 'Portrait'           },
    dim:     '21 × 28 cm',
    desc:    { sq: 'Elegancë klasike për dasma dhe ngjarje madhështore.', en: 'Classic elegance for weddings and grand occasions.' },
    price:   3900,
    badge:   null,
    badgeBg: '',
    extra:   { sq: '+150 LEK / fletë shtesë', en: '+150 LEK / extra leaf' },
    features: [
      { sq: 'Kopertinë e fortë me printim cilësor', en: 'Hard cover with quality printing' },
      { sq: 'Letër premium mat 200g',               en: 'Premium matte 200g paper'         },
      { sq: 'Hapje e sheshtë (lay-flat)',            en: 'Lay-flat binding'                 },
      { sq: '24 faqe të përfshira (12 fletë)',       en: '24 pages included (12 leaves)'   },
      { sq: 'Paketim premium',                      en: 'Premium packaging'               },
    ],
  },
];

const FAQS = [
  {
    q: { sq: 'Sa faqe mund të shtoj?',                         en: 'How many pages can I add?'                         },
    a: { sq: 'Çdo format fillon me 24 faqe. Mund të shtoni sa fletë dëshironi me çmim shtesë për çdo 2 faqe.',
          en: 'Every format starts with 24 pages. You can add as many leaves as you want at an extra charge per 2 pages.' },
  },
  {
    q: { sq: 'Sa kohë zgjat dërgesa?',                          en: 'How long does delivery take?'                      },
    a: { sq: 'Albumi arrin tek ju brenda 10–16 ditësh pune pasi të keni vendosur porosinë. Dërgojmë kudo në Shqipëri.',
          en: 'Your album arrives within 10–16 working days after placing your order. We deliver anywhere in Albania.' },
  },
  {
    q: { sq: 'A mund ta kthej albumin nëse nuk jam i/e kënaqur?', en: 'Can I return the album if I\'m not satisfied?'   },
    a: { sq: '30 ditë garanci cilësie. Nëse ka ndonjë problem me printimin, e zëvendësojmë falas.',
          en: '30-day quality guarantee. If there\'s any printing issue, we replace it for free.' },
  },
  {
    q: { sq: 'Si paguaj?',                                      en: 'How do I pay?'                                     },
    a: { sq: 'Paguani me kartë kredie/debiti ose me para në dorë gjatë dorëzimit (Cash on Delivery).',
          en: 'Pay by credit/debit card or cash on delivery (COD).' },
  },
  {
    q: { sq: 'A ka dërgim falas?',                              en: 'Is there free delivery?'                           },
    a: { sq: 'Dërgim falas për porosi mbi 5,000 LEK. Kostoja e dërgimit llogaritet sipas qytetit tuaj.',
          en: 'Free delivery on orders over 5,000 LEK. Delivery cost is calculated based on your city.' },
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] font-medium text-neutral-800">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
          <ChevronDown size={18} className="text-neutral-400"/>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="faq-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-[14px] text-neutral-500 leading-relaxed pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Pricing() {
  const { lang } = useLanguage();

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Çmimet', en: 'Pricing' }}
        description={{
          sq: 'Çmime transparente për libra foto premium — nga 2,900 lekë. Letër mat 200g, lidhje lay-flat, printim galerie. Dërgesa falas mbi 5,000 lekë.',
          en: 'Transparent pricing for premium photo books — from 2,900 lek. Matte 200g paper, lay-flat binding, gallery-quality printing. Free delivery over 5,000 lek.',
        }}
        path="/cmime"
      />
      <div className="bg-[#f7f4f0] min-h-screen">

        {/* ── Hero ── */}
        <div className="bg-white border-b border-neutral-100 py-14 md:py-20">
          <div className="max-w-2xl mx-auto px-5 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-5">
              {lang === 'sq' ? '— çmimet' : '— pricing'}
            </p>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-neutral-900 mb-5">
              {lang === 'sq' ? 'Çmime të qarta, pa surpriza' : 'Clear pricing, no surprises'}
            </h1>
            <p className="text-neutral-500 text-[15px] max-w-md mx-auto leading-relaxed">
              {lang === 'sq'
                ? 'Cilësi premium pa kompromise. Çmime transparente, pa kosto të fshehura.'
                : 'Premium quality without compromise. Transparent pricing, no hidden costs.'}
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-5">

          {/* ── Plan cards ── */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white rounded-3xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-md transition-shadow relative"
              >
                {/* Popular badge */}
                {plan.badge && (
                  <div className="absolute top-0 right-0 px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold text-white rounded-bl-2xl"
                    style={{ background: plan.badgeBg }}>
                    {plan.badge[lang]}
                  </div>
                )}

                <div className="p-7 md:p-8">
                  {/* Header */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="text-xl font-serif font-medium text-neutral-900">{plan.name[lang]}</h3>
                      <span className="text-sm text-neutral-400 font-mono">{plan.dim}</span>
                    </div>
                    <p className="text-neutral-500 text-[13px] leading-relaxed">{plan.desc[lang]}</p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-4xl font-semibold text-neutral-900 font-serif tabular-nums">
                      {plan.price.toLocaleString()}
                    </span>
                    <span className="text-neutral-400 text-sm">LEK</span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-6 pb-6 border-b border-neutral-100">
                    <Plus size={11} className="text-neutral-300 shrink-0"/>
                    <span className="text-[12px] text-neutral-400">{plan.extra[lang]}</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={9} className="text-white" strokeWidth={3}/>
                        </div>
                        <span className="text-[13px] text-neutral-600">{f[lang]}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/krijo">
                    <button className="w-full py-3.5 rounded-2xl bg-[#1a1a1a] text-white text-[14px] font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2">
                      {lang === 'sq' ? 'Krijo albumin tënd' : 'Create your photobook'}
                      <ArrowRight size={14}/>
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Delivery card ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-7 md:p-8">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center shrink-0">
                <Truck size={22} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[17px] font-medium text-neutral-900 mb-1">
                  {lang === 'sq' ? 'Dërgesa kudo në Shqipëri' : 'Delivery anywhere in Albania'}
                </h3>
                <p className="text-[13px] text-neutral-500 leading-relaxed">
                  {lang === 'sq'
                    ? 'Brenda 10–16 ditësh pune me korrier. Kostoja llogaritet sipas qytetit tuaj në momentin e porosisë.'
                    : 'Within 10–16 working days by courier. Cost is calculated based on your city at the time of ordering.'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#f7f4f0] rounded-full text-[13px] font-medium text-neutral-700">
                  {lang === 'sq' ? '✦ Falas mbi 5,000 LEK' : '✦ Free over 5,000 LEK'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Quality promise ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="grid grid-cols-3 gap-3 md:gap-4"
          >
            {[
              { num: '200g', label: { sq: 'letër mat premium', en: 'premium matte paper' }, sub: { sq: 'pa reflektime', en: 'glare-free' } },
              { num: '300', label: { sq: 'DPI printim', en: 'DPI printing' }, sub: { sq: 'gjithmonë të mprehta', en: 'always sharp' } },
              { num: '30d', label: { sq: 'garanci cilësie', en: 'quality guarantee' }, sub: { sq: 'rikthim falas', en: 'free returns' } },
            ].map((q, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 md:p-6 border border-neutral-100 text-center">
                <div className="text-2xl md:text-3xl font-serif font-semibold text-neutral-900 mb-1">{q.num}</div>
                <div className="text-[11px] text-neutral-500 leading-tight">{q.label[lang]}</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">{q.sub[lang]}</div>
              </div>
            ))}
          </motion.div>

          {/* ── FAQ ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-7 md:p-10"
          >
            <h2 className="text-xl md:text-2xl font-serif font-medium text-neutral-900 mb-6">
              {lang === 'sq' ? 'Pyetjet e shpeshta' : 'Frequently asked questions'}
            </h2>
            <div>
              {FAQS.map((faq, i) => (
                <FaqItem key={i} q={faq.q[lang]} a={faq.a[lang]}/>
              ))}
            </div>
            <p className="text-[13px] text-neutral-400 mt-6 pt-5 border-t border-neutral-50">
              {lang === 'sq' ? 'Keni pyetje të tjera? ' : 'More questions? '}
              <a href="mailto:info@pergjithmone.al" className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
                info@pergjithmone.al
              </a>
            </p>
          </motion.div>

        </div>

        {/* ── Bottom CTA ── */}
        <div className="bg-[#1a1a1a] py-16 md:py-20 text-center">
          <div className="max-w-md mx-auto px-5">
            <h2 className="text-2xl md:text-3xl font-serif font-medium text-white mb-4">
              {lang === 'sq' ? 'Gati të filloni?' : 'Ready to start?'}
            </h2>
            <p className="text-white/50 text-[14px] mb-8">
              {lang === 'sq'
                ? 'Krijoni albumin tuaj tani. Paguani vetëm kur jeni të kënaqur.'
                : 'Create your album now. Pay only when you\'re satisfied.'}
            </p>
            <Link href="/krijo">
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#1a1a1a] rounded-full text-[15px] font-medium hover:bg-neutral-100 transition-colors">
                {lang === 'sq' ? 'Krijo albumin tënd' : 'Create your photobook'}
                <ArrowRight size={16}/>
              </button>
            </Link>
          </div>
        </div>

      </div>
    </MarketingLayout>
  );
}
