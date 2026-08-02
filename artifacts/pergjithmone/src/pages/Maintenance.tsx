import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookHeart } from 'lucide-react';

interface MaintenanceProps {
  messageAl?: string;
  messageEn?: string;
  whatsappNumber?: string;
}

export default function Maintenance({ messageAl, messageEn, whatsappNumber }: MaintenanceProps) {
  const { lang, setLang } = useLanguage();

  const message = lang === 'sq'
    ? (messageAl || 'Jemi duke bërë mirëmbajtje. Do të kthehemi së shpejti.')
    : (messageEn || "We're performing maintenance. We'll be back soon.");

  const wa = whatsappNumber || '+355688755833';
  const waUrl = `https://wa.me/${wa.replace(/\D/g, '')}`;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#f7f5f2' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center">
          <BookHeart size={17} className="text-white" />
        </div>
        <span className="font-serif text-xl font-medium text-neutral-900 tracking-tight">Përgjithmonë</span>
      </div>

      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center mb-8">
        <span className="text-3xl">🔧</span>
      </div>

      {/* Heading */}
      <h1 className="font-serif text-3xl md:text-4xl font-medium text-neutral-900 mb-4 max-w-md leading-tight">
        {lang === 'sq' ? 'Mirëmbajtje në progres' : 'Maintenance in progress'}
      </h1>

      {/* Message */}
      <p className="text-neutral-500 text-base max-w-sm leading-relaxed mb-10">
        {message}
      </p>

      {/* WhatsApp CTA */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2.5 px-7 py-3 bg-neutral-900 text-white rounded-full text-sm font-medium hover:bg-neutral-700 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        {lang === 'sq' ? 'Na kontaktoni' : 'Contact us'}
      </a>

      {/* Lang toggle */}
      <div className="mt-10 flex items-center gap-3">
        <button
          onClick={() => setLang('sq')}
          className={`text-xs font-medium transition-colors ${lang === 'sq' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}`}
        >
          SQ
        </button>
        <span className="text-neutral-300 text-xs">|</span>
        <button
          onClick={() => setLang('en')}
          className={`text-xs font-medium transition-colors ${lang === 'en' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
