import React from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { SEOMeta } from '@/components/SEOMeta';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Helmet } from 'react-helmet-async';
import { usePageFields } from '@/components/marketing/PageContent';
import { LivePageRoot } from '@/components/marketing/LivePageRoot';
import { Editable, EditableSection } from '@/components/marketing/Editable';

export default function FAQ() {
  return (
    <LivePageRoot slug="faq">
      <FaqView />
    </LivePageRoot>
  );
}

function FaqView() {
  const p = usePageFields();
  const items = p.list('items');

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((_, i) => ({
      '@type': 'Question',
      name: p.txt(`items.${i}.q`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: p.txt(`items.${i}.a`),
      },
    })),
  };

  return (
    <MarketingLayout>
      <SEOMeta
        title={p.txtAll('seo.title')}
        description={p.txtAll('seo.description')}
        path="/faq"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <div className="bg-background py-24 min-h-[80vh]">
        <div className="container mx-auto px-4 max-w-3xl">
          <EditableSection path="hero" className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6">
              <Editable path="hero.title">{p.txt('hero.title')}</Editable>
            </h1>
            <p className="text-lg text-muted-foreground">
              <Editable path="hero.body">{p.txt('hero.body')}</Editable>
            </p>
          </EditableSection>

          <Editable path="items" kind="slider" as="div">
            <Accordion type="single" collapsible className="w-full">
              {items.map((_, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b border-border py-2">
                  <AccordionTrigger className="text-left font-serif text-lg hover:no-underline hover:text-foreground/80">
                    <Editable path={`items.${i}.q`}>{p.txt(`items.${i}.q`)}</Editable>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base pb-6 leading-relaxed">
                    <Editable path={`items.${i}.a`}>{p.txt(`items.${i}.a`)}</Editable>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Editable>

          <EditableSection path="still" className="mt-16 p-8 bg-secondary border border-border rounded-3xl text-center">
            <h3 className="text-xl font-serif font-medium mb-2">
              <Editable path="still.title">{p.txt('still.title')}</Editable>
            </h3>
            <p className="text-muted-foreground mb-6">
              <Editable path="still.body">{p.txt('still.body')}</Editable>
            </p>
            <a href="/kontakt" className="text-foreground underline underline-offset-4 font-medium">
              <Editable path="still.link">{p.txt('still.link')}</Editable>
            </a>
          </EditableSection>
        </div>
      </div>
    </MarketingLayout>
  );
}
