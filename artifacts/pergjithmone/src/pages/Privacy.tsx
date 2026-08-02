import React from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOMeta } from '@/components/SEOMeta';

export default function Privacy() {
  const { lang } = useLanguage();
  const sq = lang === 'sq';

  return (
    <MarketingLayout>
      <SEOMeta
        title={{ sq: 'Politika e Privatësisë', en: 'Privacy Policy' }}
        description={{
          sq: 'Politika jonë e privatësisë shpjegon se si mbledhim, përdorim dhe mbrojmë të dhënat tuaja personale në Përgjithmonë.',
          en: 'Our privacy policy explains how we collect, use and protect your personal data at Përgjithmonë.',
        }}
        path="/privacy"
      />
      <div className="max-w-3xl mx-auto px-5 py-20 md:py-28">

        {/* Header */}
        <div className="mb-14">
          <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-4">
            {sq ? 'Dokument ligjor' : 'Legal document'}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-light text-neutral-900 leading-tight mb-5">
            {sq ? 'Politika e Privatësisë' : 'Privacy Policy'}
          </h1>
          <p className="text-sm text-neutral-400">
            {sq ? 'Hyrë në fuqi:' : 'Effective:'} 1 {sq ? 'Korrik' : 'July'} 2025
          </p>
        </div>

        <div className="prose prose-neutral max-w-none space-y-10 text-[15px] leading-relaxed text-neutral-700">

          {/* Intro */}
          <section>
            <p>
              {sq
                ? 'Përgjithmonë ("ne", "nesh", "platforma jonë") respekton privatësinë tuaj dhe është e përkushtuar ndaj mbrojtjes së të dhënave tuaja personale. Kjo politikë shpjegon cilat të dhëna mbledhim, si i përdorim dhe cilat janë të drejtat tuaja.'
                : 'Përgjithmonë ("we", "us", "our platform") respects your privacy and is committed to protecting your personal data. This policy explains what data we collect, how we use it, and what rights you have.'}
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '1. Kontrollori i të Dhënave' : '1. Data Controller'}
            </h2>
            <p>
              {sq
                ? 'Kontrollori i të dhënave tuaja personale është Përgjithmonë, me seli në Tiranë, Shqipëri. Mund të na kontaktoni në '
                : 'The controller of your personal data is Përgjithmonë, headquartered in Tirana, Albania. You can contact us at '}
              <a href="mailto:info@pergjithmone.al" className="text-neutral-900 underline underline-offset-2 hover:text-neutral-600 transition-colors">
                info@pergjithmone.al
              </a>.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '2. Të Dhënat që Mbledhim' : '2. Data We Collect'}
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>{sq ? 'Të dhëna llogaritë:' : 'Account data:'}</strong>{' '}
                {sq
                  ? 'emri, adresa email, fjalëkalimi i enkriptuar.'
                  : 'name, email address, encrypted password.'}
              </li>
              <li>
                <strong>{sq ? 'Të dhëna porosie:' : 'Order data:'}</strong>{' '}
                {sq
                  ? 'adresa e dorëzimit, numri i telefonit, produktet e porositura.'
                  : 'delivery address, phone number, ordered products.'}
              </li>
              <li>
                <strong>{sq ? 'Fotografi dhe dizajne:' : 'Photos & designs:'}</strong>{' '}
                {sq
                  ? 'imazhet që ngarkoni dhe dizajnet e albumeve tuaja.'
                  : 'images you upload and your album designs.'}
              </li>
              <li>
                <strong>{sq ? 'Të dhëna teknike:' : 'Technical data:'}</strong>{' '}
                {sq
                  ? 'adresa IP, lloji i shfletuesit, faqet e vizituara, ora dhe data e aksesit.'
                  : 'IP address, browser type, pages visited, time and date of access.'}
              </li>
              <li>
                <strong>{sq ? 'Cookies:' : 'Cookies:'}</strong>{' '}
                {sq
                  ? 'cookie-t e sesionit për autentikimin dhe cookie-t funksionale për preferencat e gjuhës.'
                  : 'session cookies for authentication and functional cookies for language preferences.'}
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '3. Si i Përdorim të Dhënat' : '3. How We Use Your Data'}
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{sq ? 'Për të procesuar dhe dorëzuar porositë tuaja.' : 'To process and fulfil your orders.'}</li>
              <li>{sq ? 'Për të menaxhuar llogarinë tuaj dhe autentikimin.' : 'To manage your account and authentication.'}</li>
              <li>{sq ? 'Për t\'ju dërguar njoftime rreth statusit të porosisë.' : 'To send you notifications about order status.'}</li>
              <li>{sq ? 'Për të përmirësuar platformën dhe shërbimin tonë.' : 'To improve our platform and service.'}</li>
              <li>{sq ? 'Për të respektuar detyrimet ligjore dhe rregullatore.' : 'To comply with legal and regulatory obligations.'}</li>
            </ul>
            <p className="mt-3">
              {sq
                ? 'Ne nuk i shesim, shkëmbejmë ose ndajmë të dhënat tuaja personale me palë të treta për qëllime marketing.'
                : 'We do not sell, trade, or share your personal data with third parties for marketing purposes.'}
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '4. Baza Ligjore e Përpunimit' : '4. Legal Basis for Processing'}
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>{sq ? 'Ekzekutimi i kontratës:' : 'Contract performance:'}</strong>{' '}
                {sq ? 'procesimi i porosive dhe menaxhimi i llogarisë.' : 'processing orders and managing your account.'}
              </li>
              <li>
                <strong>{sq ? 'Interesa legjitime:' : 'Legitimate interests:'}</strong>{' '}
                {sq ? 'siguria e platformës dhe parandalimi i mashtrimit.' : 'platform security and fraud prevention.'}
              </li>
              <li>
                <strong>{sq ? 'Detyrime ligjore:' : 'Legal obligations:'}</strong>{' '}
                {sq ? 'mbajtja e regjistrimeve financiare sipas ligjit shqiptar.' : 'maintaining financial records under Albanian law.'}
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '5. Ruajtja e të Dhënave' : '5. Data Retention'}
            </h2>
            <p>
              {sq
                ? 'Të dhënat e llogarisë ruhen deri sa llogaria të fshihet. Të dhënat e porosive ruhen për 5 vjet pas blerjes për qëllime tatimore dhe ligjore. Fotografitë dhe dizajnet e albumeve fshihen 30 ditë pas dorëzimit të porosisë, nëse nuk i keni ruajtur eksplicit si projekte aktive.'
                : 'Account data is retained until the account is deleted. Order data is retained for 5 years after purchase for tax and legal purposes. Album photos and designs are deleted 30 days after order delivery, unless you have explicitly saved them as active projects.'}
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '6. Palët e Treta' : '6. Third Parties'}
            </h2>
            <p>
              {sq
                ? 'Mund të ndajmë të dhëna me ofruesit e mëposhtëm të shërbimit, vetëm në masën e nevojshme:'
                : 'We may share data with the following service providers, only to the extent necessary:'}
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <strong>{sq ? 'Ofrues hosting:' : 'Hosting provider:'}</strong>{' '}
                {sq ? 'për ruajtjen e sigurt të të dhënave.' : 'for secure data storage.'}
              </li>
              <li>
                <strong>{sq ? 'Korrierë:' : 'Couriers:'}</strong>{' '}
                {sq ? 'adresa e dorëzimit dhe numri i telefonit për kryerjen e dorëzimit.' : 'delivery address and phone number for fulfilment.'}
              </li>
              <li>
                <strong>Google reCAPTCHA:</strong>{' '}
                {sq ? 'për mbrojtjen nga robotët në formularët e hyrjes dhe regjistrimit.' : 'to protect login and registration forms from bots.'}
              </li>
            </ul>
            <p className="mt-3">
              {sq
                ? 'Të gjitha palët e treta janë të detyruara të mbrojnë të dhënat tuaja dhe t\'i përpunojnë vetëm sipas udhëzimeve tona.'
                : 'All third parties are required to protect your data and process it only according to our instructions.'}
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '7. Cookies' : '7. Cookies'}
            </h2>
            <p>
              {sq
                ? 'Përdorim vetëm cookie-t e nevojshme teknikisht: cookie-t e sesionit për autentikimin dhe cookie-t funksionale për të mbajtur mend gjuhën tuaj të preferuar. Nuk përdorim cookie-t e reklamimit ose analitikës nga palë të treta.'
                : 'We only use technically necessary cookies: session cookies for authentication and functional cookies to remember your language preference. We do not use advertising or third-party analytics cookies.'}
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '8. Të Drejtat Tuaja' : '8. Your Rights'}
            </h2>
            <p className="mb-3">
              {sq
                ? 'Sipas legjislacionit shqiptar për mbrojtjen e të dhënave personale, ju keni të drejtën:'
                : 'Under Albanian personal data protection legislation, you have the right to:'}
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>{sq ? 'Aksesoni të dhënat tuaja personale.' : 'Access your personal data.'}</li>
              <li>{sq ? 'Korrigjoni të dhëna të pasakta.' : 'Correct inaccurate data.'}</li>
              <li>{sq ? 'Fshijeni llogarinë dhe të dhënat tuaja (ku lejohet ligjërisht).' : 'Delete your account and data (where legally permissible).'}</li>
              <li>{sq ? 'Kufizoni ose kundërshtoni përpunimin.' : 'Restrict or object to processing.'}</li>
              <li>{sq ? 'Transferoni të dhënat tuaja (portabilitet).' : 'Transfer your data (portability).'}</li>
              <li>{sq ? 'Ankoheni pranë Komisionerit për të Drejtën e Informimit dhe Mbrojtjen e të Dhënave Personale (KDIMDP).' : 'Lodge a complaint with the Commissioner for the Right to Information and Protection of Personal Data (KDIMDP).'}</li>
            </ul>
            <p className="mt-3">
              {sq
                ? 'Për të ushtruar të drejtat tuaja, na kontaktoni në '
                : 'To exercise your rights, contact us at '}
              <a href="mailto:info@pergjithmone.al" className="text-neutral-900 underline underline-offset-2 hover:text-neutral-600 transition-colors">
                info@pergjithmone.al
              </a>.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '9. Siguria e të Dhënave' : '9. Data Security'}
            </h2>
            <p>
              {sq
                ? 'Marrim masa teknike dhe organizative të arsyeshme për të mbrojtur të dhënat tuaja: enkriptim TLS/HTTPS për të gjitha komunikimet, fjalëkalime të enkriptuara (bcrypt), akses i kufizuar i punonjësve dhe monitorim i vazhdueshëm i sistemit.'
                : 'We take reasonable technical and organisational measures to protect your data: TLS/HTTPS encryption for all communications, encrypted passwords (bcrypt), restricted employee access, and continuous system monitoring.'}
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="font-serif text-xl font-medium text-neutral-900 mb-3">
              {sq ? '10. Ndryshimet e Politikës' : '10. Policy Changes'}
            </h2>
            <p>
              {sq
                ? 'Mund të përditësojmë këtë politikë herë pas here. Për ndryshime materiale do t\'ju njoftojmë me email ose me një njoftim të dukshëm në platformë. Data e hyrjes në fuqi do të përditësohet në krye të faqes.'
                : 'We may update this policy from time to time. For material changes we will notify you by email or with a prominent notice on the platform. The effective date at the top of the page will be updated accordingly.'}
            </p>
          </section>

        </div>
      </div>
    </MarketingLayout>
  );
}
