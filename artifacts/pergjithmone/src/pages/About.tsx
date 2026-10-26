import React from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { SEOMeta } from '@/components/SEOMeta';
import { usePageFields } from '@/components/marketing/PageContent';
import { LivePageRoot } from '@/components/marketing/LivePageRoot';
import { Editable, EditableSection } from '@/components/marketing/Editable';

export default function About() {
  return (
    <LivePageRoot slug="about">
      <AboutView />
    </LivePageRoot>
  );
}

function AboutView() {
  const p = usePageFields();

  return (
    <MarketingLayout>
      <SEOMeta
        title={p.txtAll('seo.title')}
        description={p.txtAll('seo.description')}
        path="/rreth-nesh"
      />
      <div className="bg-background py-24 min-h-screen">
        <div className="container mx-auto px-4 max-w-3xl">
          <EditableSection path="hero" className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6">
              <Editable path="hero.title">{p.txt('hero.title')}</Editable>
            </h1>
            <p className="text-lg text-muted-foreground font-serif italic">
              <Editable path="hero.quote">{p.txt('hero.quote')}</Editable>
            </p>
          </EditableSection>

          <div className="prose prose-lg prose-stone mx-auto">
            <p>
              <Editable path="p1">{p.txt('p1')}</Editable>
            </p>
            <p>
              <Editable path="p2">{p.txt('p2')}</Editable>
            </p>
            <h2 className="font-serif font-medium mt-12 mb-6 text-3xl">
              <Editable path="qualityTitle">{p.txt('qualityTitle')}</Editable>
            </h2>
            <p>
              <Editable path="p3">{p.txt('p3')}</Editable>
            </p>
            <p>
              <Editable path="p4">{p.txt('p4')}</Editable>
            </p>
            <h2 className="font-serif font-medium mt-12 mb-6 text-3xl">
              <Editable path="missionTitle">{p.txt('missionTitle')}</Editable>
            </h2>
            <p>
              <Editable path="p5">{p.txt('p5')}</Editable>
            </p>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
