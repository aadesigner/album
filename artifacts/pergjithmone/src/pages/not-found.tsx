import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'wouter';

export default function NotFound() {
  // LanguageContext may not be available if this renders outside the provider,
  // so we default gracefully.
  let lang: 'sq' | 'en' = 'sq';
  try {
    const ctx = useLanguage();
    lang = ctx.lang;
  } catch {
    // outside provider — use default
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f7f4f0]">
      <div className="text-center px-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">404</p>
        <h1 className="text-4xl md:text-5xl font-serif font-medium text-neutral-900 mb-4">
          {lang === 'sq' ? 'Faqja nuk u gjet' : 'Page not found'}
        </h1>
        <p className="text-neutral-500 text-[15px] mb-10">
          {lang === 'sq'
            ? 'Faqja që kërkoni nuk ekziston ose është zhvendosur.'
            : 'The page you are looking for does not exist or has been moved.'}
        </p>
        <Link href="/">
          <button className="px-7 py-3 bg-[#1a1a1a] text-white rounded-full text-[13px] font-medium hover:bg-neutral-800 transition-colors">
            {lang === 'sq' ? '← Kthehu në fillim' : '← Back to home'}
          </button>
        </Link>
      </div>
    </div>
  );
}
