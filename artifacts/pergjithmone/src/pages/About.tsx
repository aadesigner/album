import React from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOMeta } from '@/components/SEOMeta';

export default function About() {
  const { lang } = useLanguage();

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Rreth Nesh', en: 'About Us' }}
        description={{
          sq: 'Mësoni rreth Përgjithmonë — kompanisë shqiptare që sjell kujtimet tuaja në jetë me libra foto premium të shtypura me cilësi galerie.',
          en: 'Learn about Përgjithmonë — the Albanian company bringing your memories to life with premium, gallery-quality photo books.',
        }}
        path="/rreth-nesh"
      />
      <div className="bg-background py-24 min-h-screen">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6">
              {lang === 'sq' ? 'Rreth Nesh' : 'About Us'}
            </h1>
            <p className="text-lg text-muted-foreground font-serif italic">
              {lang === 'sq'
                ? '"Ne besojmë se disa kujtime janë shumë të çmuara për të mbetur në një telefon."'
                : '"We believe some memories are too precious to stay on a phone."'}
            </p>
          </div>

          <div className="prose prose-lg prose-stone mx-auto">
            <p>
              {lang === 'sq'
                ? "Përgjithmonë lindi nga një dëshirë e thjeshtë: të kthejmë fotot tona dixhitale në objekte fizike, të prekshme dhe të bukura që mund t'i shfletojmë me familjen tonë."
                : 'Përgjithmonë was born from a simple desire: to turn our digital photos into physical, tangible and beautiful objects that we can browse through with our family.'}
            </p>
            <p>
              {lang === 'sq'
                ? "Në një botë ku ne bëjmë qindra foto çdo ditë, fotot më të rëndësishme shpesh humbasin në galeritë tona pafund. Ne krijuam këtë platformë për t'ju dhënë një mjet të thjeshtë por të fuqishëm për të kuruar këto momente dhe për t'i kthyer ato në art."
                : 'In a world where we take hundreds of photos every day, the most important ones often get lost in our endless galleries. We built this platform to give you a simple but powerful tool to curate those moments and turn them into art.'}
            </p>
            <h2 className="font-serif font-medium mt-12 mb-6 text-3xl">
              {lang === 'sq' ? 'Cilësia si Prioritet' : 'Quality First'}
            </h2>
            <p>
              {lang === 'sq'
                ? 'Nuk bëjmë kompromise kur bëhet fjalë për cilësinë. Letra që përdorim është zgjedhur me kujdes për të ofruar ngjyra të pasura dhe një ndjesi premium në prekje. Kopertinat tona janë të forta, të punuara për të rezistuar gjatë ndër vite.'
                : 'We make no compromises when it comes to quality. The paper we use has been carefully selected to deliver rich colours and a premium feel to the touch. Our covers are hard, crafted to last for years to come.'}
            </p>
            <p>
              {lang === 'sq'
                ? 'Çdo album printohet dhe lidhet me vëmendje maksimale ndaj detajeve, sepse ne e dimë që brenda tij ndodhen kujtimet tuaja më të dashura.'
                : 'Every album is printed and bound with the utmost attention to detail, because we know that inside it live your most precious memories.'}
            </p>
            <h2 className="font-serif font-medium mt-12 mb-6 text-3xl">
              {lang === 'sq' ? 'Misioni Ynë' : 'Our Mission'}
            </h2>
            <p>
              {lang === 'sq'
                ? 'Të jemi shtëpia e memories shqiptare. Duam që çdo familje të ketë mundësinë të krijojë arkivën e saj vizuale, me albume që kalojnë nga brezi në brez.'
                : 'To be the home of Albanian memory. We want every family to have the opportunity to create their own visual archive, with albums that pass from generation to generation.'}
            </p>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
