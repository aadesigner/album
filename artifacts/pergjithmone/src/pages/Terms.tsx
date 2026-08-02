import React from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOMeta } from '@/components/SEOMeta';

export default function Terms() {
  const { lang } = useLanguage();
  const sq = lang === 'sq';

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Termat & Kushtet', en: 'Terms & Conditions' }}
        description={{
          sq: 'Lexoni termat dhe kushtet e shërbimit të Përgjithmonë — informacion mbi porositë, anulimin, kthimet dhe politikat tona ligjore.',
          en: 'Read the terms and conditions of Përgjithmonë — information about orders, cancellation, returns and our legal policies.',
        }}
        path="/terms"
      />
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-28">

        {/* Header */}
        <div className="mb-14">
          <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-4">
            {sq ? 'Dokument ligjor' : 'Legal document'}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-light text-neutral-900 leading-tight mb-5">
            {sq ? 'Termat & Kushtet' : 'Terms & Conditions'}
          </h1>
          <p className="text-sm text-neutral-400">
            {sq ? 'Hyrë në fuqi:' : 'Effective:'} 1 {sq ? 'Korrik' : 'July'} 2025
          </p>
        </div>

        <div className="prose prose-neutral max-w-none space-y-10 text-[15px] leading-relaxed text-neutral-700">

          {/* 1 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '1. Pranimi i Kushteve' : '1. Acceptance of Terms'}
            </h2>
            <p>
              {sq
                ? 'Duke aksesuar ose duke përdorur platformën Përgjithmonë (faqja web dhe shërbimet e lidhura me të), ju pranoni të jeni i/e lidhur me këto Terma dhe Kushte. Nëse nuk pajtoheni, ju lutemi mos e përdorni platformën.'
                : 'By accessing or using the Përgjithmonë platform (the website and related services), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the platform.'}
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '2. Shërbimi' : '2. The Service'}
            </h2>
            <p>
              {sq
                ? 'Përgjithmonë ofron një platformë online për krijimin, personalizimin dhe porosinë e albumeve fotografike të printuara me cilësi premium. Ne rezervojmë të drejtën të ndryshojmë, pezullojmë ose ndërpresim çdo aspekt të shërbimit në çdo kohë.'
                : 'Përgjithmonë provides an online platform for creating, customising, and ordering premium-quality printed photo books. We reserve the right to modify, suspend, or discontinue any aspect of the service at any time.'}
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '3. Llogaritë e Përdoruesve' : '3. User Accounts'}
            </h2>
            <p>
              {sq
                ? 'Për të aksesuar funksionalitetet e plotë të platformës, duhet të krijoni një llogari. Ju jeni përgjegjës për ruajtjen e konfidencialitetit të kredencialeve tuaja dhe për të gjitha aktivitetet që ndodhin nën llogarinë tuaj. Ju lutemi na njoftoni menjëherë për çdo akses të paautorizuar.'
                : 'To access the full functionality of the platform, you must create an account. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. Please notify us immediately of any unauthorised access.'}
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '4. Pronësia Intelektuale dhe Përmbajtja' : '4. Intellectual Property & Content'}
            </h2>
            <p>
              {sq
                ? 'Ju mbani të gjitha të drejtat mbi fotografitë dhe materialet që ngarkoni. Duke i ngarkuar ato, ju na jepni një licencë të kufizuar dhe jo-ekskluzive për t\'i përpunuar dhe printuar si pjesë e porosisë suaj. Dizajnet, modelet dhe kodin e platformës i takojnë Përgjithmonë ose licensuesve të saj.'
                : 'You retain all rights to the photos and materials you upload. By uploading them, you grant us a limited, non-exclusive licence to process and print them as part of your order. The platform\'s designs, templates, and code belong to Përgjithmonë or its licensors.'}
            </p>
            <p className="mt-3">
              {sq
                ? 'Nuk lejohet ngarkimi i përmbajtjes që shkel të drejtat e autorit, është ofenduese, ilegale ose cenon privatësinë e personave të tjerë.'
                : 'You may not upload content that infringes copyright, is offensive, illegal, or violates the privacy of others.'}
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '5. Porositë dhe Pagesat' : '5. Orders & Payments'}
            </h2>
            <p>
              {sq
                ? 'Çmimet janë të listuara në faqen tonë dhe përfshijnë TVSH-në sipas legjislacionit shqiptar. Pasi të konfirmoni një porosi, ajo kalon menjëherë në prodhim dhe ndryshimet nuk janë më të mundura. Pagesa kryhet me para në dorëzim (Cash on Delivery) nga korrieri.'
                : 'Prices are listed on our website and include VAT in accordance with Albanian legislation. Once you confirm an order it immediately enters production and changes are no longer possible. Payment is made in cash on delivery (COD) via courier.'}
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '6. Dërgesa dhe Dorëzimi' : '6. Shipping & Delivery'}
            </h2>
            <p>
              {sq
                ? 'Dërgojmë brenda territorit të Shqipërisë. Afati i zakonshëm i dorëzimit është 3–5 ditë pune pas konfirmimit të porosisë. Vonesa të shkaktuara nga faktorë jashtë kontrollit tonë (ngjarje natyrore, greva, probleme doganore) nuk janë në përgjegjësinë tonë.'
                : 'We deliver within the territory of Albania. The usual delivery timeframe is 3–5 working days after order confirmation. Delays caused by factors outside our control (natural events, strikes, customs issues) are not our responsibility.'}
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '7. Kthimet dhe Rimbursimet' : '7. Returns & Refunds'}
            </h2>
            <p>
              {sq
                ? 'Për shkak se çdo album prodhohet me porosi sipas dizajnit tuaj personal, produktet e personalizuara nuk kthehen, përveç rasteve kur dëmtohen gjatë transportit ose kur ka gabime printimi nga ana jonë. Në rast defekti, na kontaktoni brenda 7 ditëve nga marrja e produktit me fotografi si provë.'
                : 'Because every album is produced to order based on your personal design, personalised products are non-returnable unless damaged during shipping or due to printing errors on our part. In the event of a defect, contact us within 7 days of receipt with photographic evidence.'}
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '8. Kufizimi i Përgjegjësisë' : '8. Limitation of Liability'}
            </h2>
            <p>
              {sq
                ? 'Përgjithmonë nuk mban përgjegjësi për dëme indirekte, aksidentale ose të veçanta që rrjedhin nga përdorimi i platformës. Përgjegjësia jonë totale ndaj jush, për çfarëdo arsye, nuk do të kalojë shumën që keni paguar për porosinë përkatëse.'
                : 'Përgjithmonë is not liable for indirect, incidental, or special damages arising from the use of the platform. Our total liability to you, for any reason, shall not exceed the amount you paid for the relevant order.'}
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '9. Ndryshimet e Termave' : '9. Changes to Terms'}
            </h2>
            <p>
              {sq
                ? 'Ne mund të përditësojmë këto terma herë pas here. Ndryshimet hyjnë në fuqi menjëherë pas publikimit. Vazhdimi i përdorimit të platformës pas ndryshimeve nënkupton pranimin e termave të reja.'
                : 'We may update these terms from time to time. Changes take effect immediately upon publication. Continued use of the platform after changes implies acceptance of the new terms.'}
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '10. Ligji i Zbatueshëm' : '10. Governing Law'}
            </h2>
            <p>
              {sq
                ? 'Këto Terma dhe Kushte rregullohen nga legjislacioni i Republikës së Shqipërisë. Çdo mosmarrëveshje do t\'i nënshtrohet juridiksionit ekskluziv të gjykatave kompetente shqiptare.'
                : 'These Terms and Conditions are governed by the laws of the Republic of Albania. Any dispute shall be subject to the exclusive jurisdiction of the competent Albanian courts.'}
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '11. Na Kontaktoni' : '11. Contact Us'}
            </h2>
            <p>
              {sq
                ? 'Për çdo pyetje rreth këtyre termave, na dërgoni email në '
                : 'For any questions about these terms, email us at '}
              <a href="mailto:info@pergjithmone.al" className="text-neutral-900 underline underline-offset-2 hover:text-neutral-600 transition-colors">
                info@pergjithmone.al
              </a>.
            </p>
          </section>

        </div>
      </div>
    </MarketingLayout>
  );
}
