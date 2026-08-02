import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type Language = 'sq' | 'en';

interface Translations {
  [key: string]: {
    sq: string;
    en: string;
  }
}

const translations: Translations = {
  // Nav
  'nav.home': { sq: 'Kryefaqja', en: 'Home' },
  'nav.howItWorks': { sq: 'Si funksionon', en: 'How it works' },
  'nav.examples': { sq: 'Shembuj', en: 'Examples' },
  'nav.pricing': { sq: 'Çmime', en: 'Pricing' },
  'nav.faq': { sq: 'FAQ', en: 'FAQ' },
  'nav.about': { sq: 'Rreth Nesh', en: 'About us' },
  'nav.contact': { sq: 'Kontakt', en: 'Contact' },
  'nav.login': { sq: 'Hyr', en: 'Log in' },
  'nav.register': { sq: 'Regjistrohu', en: 'Sign up' },
  'nav.myProjects': { sq: 'Projektet e mia', en: 'My Projects' },
  'nav.myOrders': { sq: 'Porositë', en: 'My Orders' },
  'nav.profile': { sq: 'Profili Im', en: 'My Profile' },
  'nav.admin': { sq: 'Admin', en: 'Admin' },
  'nav.logout': { sq: 'Dil', en: 'Log out' },

  // Hero
  'hero.title': { sq: 'Kujtimet tuaja, përgjithmonë', en: 'Your memories, forever kept' },
  'hero.subtitle': { sq: 'Krijo albumin tënd fotografik me cilësi galerie.', en: 'Create your personalised photobook with gallery quality.' },
  'hero.cta': { sq: 'Krijo Albumin Tënd', en: 'Create Your Photobook' },

  // Steps
  'steps.choose': { sq: '1. Zgjidh stilin', en: '1. Choose style' },
  'steps.design': { sq: '2. Shto fotot', en: '2. Add photos' },
  'steps.order': { sq: '3. Porosit', en: '3. Order' },

  // Auth
  'auth.email': { sq: 'Emaili', en: 'Email' },
  'auth.password': { sq: 'Fjalëkalimi', en: 'Password' },
  'auth.login': { sq: 'Hyr', en: 'Log in' },
  'auth.register': { sq: 'Regjistrohu', en: 'Sign up' },
  'auth.forgotPassword': { sq: 'Keni harruar fjalëkalimin?', en: 'Forgot password?' },
  'auth.name': { sq: 'Emri dhe Mbiemri', en: 'Full Name' },
  'auth.noAccount': { sq: 'Nuk keni llogari?', en: "Don't have an account?" },
  'auth.hasAccount': { sq: 'Keni tashmë llogari?', en: 'Already have an account?' },

  // Projects & Orders
  'projects.empty': { sq: 'Nuk keni asnjë projekt.', en: 'You have no projects yet.' },
  'projects.new': { sq: 'Krijo Projekt të Ri', en: 'Create New Project' },
  'orders.empty': { sq: 'Nuk keni asnjë porosi.', en: 'You have no orders yet.' },

  // Wizard – Step labels
  'wizard.step.category': { sq: 'Kategoria', en: 'Category' },
  'wizard.step.style': { sq: 'Stili', en: 'Style' },
  'wizard.step.size': { sq: 'Madhësia', en: 'Size' },
  'wizard.back': { sq: 'Mbrapa', en: 'Back' },

  // Wizard – Step 1
  'wizard.s1.title': { sq: 'Për çfarë rasti është ky album?', en: 'What is this album for?' },
  'wizard.s1.subtitle': { sq: 'Zgjidhni kategorinë dhe ne do t\'ju tregojmë stilet përkatëse.', en: 'Choose a category and we\'ll show you matching styles.' },
  'wizard.s1.blank': { sq: 'Faqe e Bardhë', en: 'Blank Canvas' },
  'wizard.s1.blankDesc': { sq: 'Dizajnoni gjithçka vetë', en: 'Design everything yourself' },

  // Wizard – Step 2
  'wizard.s2.title': { sq: 'Zgjidhni një Stil', en: 'Choose a Style' },
  'wizard.s2.subtitle': { sq: 'Çdo stil vjen me ngjyra, shkronja dhe paraqitje të gatshme. Gjithçka mund të ndryshohet.', en: 'Each style comes with colours, fonts and layouts ready to go. Everything can be changed.' },
  'wizard.s2.blankTitle': { sq: 'Faqe e Bardhë', en: 'Blank Canvas' },
  'wizard.s2.blankDesc': { sq: 'Keni zgjedhur të filloni nga e para pa dizajn të gatshëm.', en: 'You\'ve chosen to start from scratch with no pre-made design.' },
  'wizard.s2.blankContinue': { sq: 'Vazhdo pa Stil', en: 'Continue without a Style' },
  'wizard.s2.noStyles': { sq: 'Nuk ka stile për këtë kategori.', en: 'No styles found for this category.' },
  'wizard.s2.continueBlank': { sq: 'Vazhdo me faqe të bardhë', en: 'Continue with blank pages' },
  'wizard.s2.colors': { sq: 'Ngjyrat', en: 'Colours' },
  'wizard.s2.fonts': { sq: 'Shkronjat', en: 'Fonts' },

  // Wizard – Step 3
  'wizard.s3.title': { sq: 'Zgjidhni Madhësinë', en: 'Choose Your Size' },
  'wizard.s3.subtitle': { sq: 'Madhësia nuk mund të ndryshohet pasi të keni krijuar albumin.', en: 'The size cannot be changed after you create the album.' },
  'wizard.s3.basePages': { sq: 'faqe bazë të përfshira', en: 'base pages included' },
  'wizard.s3.extraPage': { sq: 'LEK / fletë shtesë', en: 'LEK / extra sheet' },
  'wizard.s3.paper': { sq: 'Letër premium mat 200g', en: 'Premium matte 200g paper' },
  'wizard.s3.layflat': { sq: 'Hapje e sheshtë (layflat)', en: 'Lay-flat binding' },
  'wizard.s3.create': { sq: 'Krijo Albumin', en: 'Create Album' },
  'wizard.s3.creating': { sq: 'Duke krijuar...', en: 'Creating...' },

  // Editor
  'editor.autoSave': { sq: 'Ruajtur automatikisht', en: 'Auto-saved' },
  'editor.saving': { sq: 'Duke ruajtur...', en: 'Saving...' },
  'editor.generatePdf': { sq: 'Gjenero PDF', en: 'Generate PDF' },
  'editor.download': { sq: 'Shkarko PDF', en: 'Download PDF' },
  'editor.order': { sq: 'Porosit', en: 'Order' },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Only Albania + Kosovo auto-select Albanian. Everyone else gets English.
const ALBANIAN_COUNTRIES = new Set(['AL', 'XK']);

function langFromCountry(country: string): Language {
  return ALBANIAN_COUNTRIES.has(country.toUpperCase()) ? 'sq' : 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default English until geo resolves so international visitors never flash Albanian.
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('pergjithmone_lang');
    if (saved === 'sq' || saved === 'en') {
      // User has an explicit preference — respect it, no geo needed
      setLangState(saved);
      return;
    }

    // No preference saved: Cloudflare country via /api/geo (handled on the
    // frontend edge so CF-IPCountry is available even when the API is separate).
    const base = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '';
    fetch(`${base}/api/geo`, { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then((data: { country?: string }) => {
        const country = (data.country || '').toUpperCase();
        if (country && country !== 'XX' && country !== 'T1') {
          setLangState(langFromCountry(country));
          return;
        }
        // Geo inconclusive — English for everyone except Albanian browser locale
        const browserLang = navigator.language.toLowerCase();
        setLangState(browserLang.startsWith('sq') ? 'sq' : 'en');
      })
      .catch(() => {
        const browserLang = navigator.language.toLowerCase();
        setLangState(browserLang.startsWith('sq') ? 'sq' : 'en');
      });
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('pergjithmone_lang', newLang);
  }, []);

  const t = useCallback((key: string) => {
    if (!translations[key]) {
      console.warn(`Missing translation key: ${key}`);
      return key;
    }
    return translations[key][lang];
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
