import React from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOMeta } from '@/components/SEOMeta';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Helmet } from 'react-helmet-async';

export default function FAQ() {
  const { lang } = useLanguage();

  const faqs = [
    {
      q: {
        sq: 'Sa kohë duhet për të marrë albumin tim?',
        en: 'How long does it take to receive my album?',
      },
      a: {
        sq: 'Pas konfirmimit të porosisë, procesi i printimit kërkon 2–3 ditë pune. Dërgesa merr 1–2 ditë shtesë për qytetet brenda Shqipërisë.',
        en: 'After order confirmation, the printing process takes 2–3 working days. Delivery takes an additional 1–2 days for cities within Albania.',
      },
    },
    {
      q: {
        sq: 'Çfarë cilësi letre përdorni?',
        en: 'What quality paper do you use?',
      },
      a: {
        sq: 'Ne përdorim letër premium mat prej 200g. Është një letër luksoze, e butë në prekje, që thekson ngjyrat pa krijuar reflekse shqetësuese.',
        en: 'We use premium matte 200g paper. It is a luxurious, soft-to-the-touch paper that enhances colours without any distracting glare.',
      },
    },
    {
      q: {
        sq: 'A mund të ndryshoj albumin pasi ta kem porositur?',
        en: 'Can I change my album after ordering?',
      },
      a: {
        sq: 'Pasi të klikoni butonin "Porosit" dhe të konfirmoni dizajnin përfundimtar, albumi kalon menjëherë në procesin e printimit. Për këtë arsye, ndryshimet pas këtij hapi nuk janë të mundura.',
        en: 'Once you click the "Order" button and confirm your final design, the album immediately enters the printing process. Changes after this point are therefore not possible.',
      },
    },
    {
      q: {
        sq: 'Si mund të paguaj?',
        en: 'How can I pay?',
      },
      a: {
        sq: "Për momentin ofrojmë pagesë në dorëzim (Cash on Delivery). Pasi t'ju mbërrijë albumi nga korrieri, ju mund t'ia paguani shumën.",
        en: 'We currently offer payment on delivery (Cash on Delivery). Once the courier delivers your album, you pay the amount.',
      },
    },
    {
      q: {
        sq: 'Sa faqe mund të ketë maksimalisht një album?',
        en: 'What is the maximum number of pages an album can have?',
      },
      a: {
        sq: 'Albumet tona bazë vijnë me 24 faqe (12 fletë). Ju mund të shtoni deri në 100 faqe (50 fletë) me një kosto shtesë për fletë.',
        en: 'Our base albums come with 24 pages (12 leaves). You can add up to 100 pages (50 leaves) at an additional cost per leaf.',
      },
    },
  ];

  // FAQPage structured data — makes questions eligible for a rich "People also ask"
  // snippet in Google search results. Reflects whichever language is active.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q[lang],
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a[lang],
      },
    })),
  };

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Pyetje të Shpeshta', en: 'Frequently Asked Questions' }}
        description={{
          sq: 'Gjeni përgjigjet për pyetjet tuaja rreth librave foto Përgjithmonë — porosi, dërgesa, cilësia e printimit dhe garancitë tona.',
          en: 'Find answers to your questions about Përgjithmonë photo books — orders, delivery, print quality and our guarantees.',
        }}
        path="/faq"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <div className="bg-background py-24 min-h-[80vh]">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6">
              {lang === 'sq' ? 'Pyetje të Shpeshta' : 'Frequently Asked Questions'}
            </h1>
            <p className="text-lg text-muted-foreground">
              {lang === 'sq'
                ? 'Gjeni përgjigjet për pyetjet më të zakonshme rreth Përgjithmonë.'
                : 'Find answers to the most common questions about Përgjithmonë.'}
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b border-border py-2">
                <AccordionTrigger className="text-left font-serif text-lg hover:no-underline hover:text-foreground/80">
                  {faq.q[lang]}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base pb-6 leading-relaxed">
                  {faq.a[lang]}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-16 p-8 bg-secondary border border-border rounded-3xl text-center">
            <h3 className="text-xl font-serif font-medium mb-2">
              {lang === 'sq' ? 'Keni ende pyetje?' : 'Still have questions?'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {lang === 'sq'
                ? "Jemi këtu për t'ju ndihmuar me çdo paqartësi."
                : 'We are here to help with anything you need.'}
            </p>
            <a href="/kontakt" className="text-foreground underline underline-offset-4 font-medium">
              {lang === 'sq' ? 'Na kontaktoni' : 'Contact us'}
            </a>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
