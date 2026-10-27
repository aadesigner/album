import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageEditorOptional } from '@/components/marketing/PageEditorContext';

/** Blocks clicks on shared site chrome while the page visual editor is on. */
export function ChromeLock() {
  const editor = usePageEditorOptional();
  const { lang } = useLanguage();
  if (!editor) return null;
  return (
    <div
      data-site-chrome-lock
      aria-hidden
      className="absolute inset-0 z-[70]"
      style={{ cursor: 'not-allowed' }}
      title={lang === 'sq'
        ? 'Shiriti i njoftimit, navigimi dhe footer nuk ndryshohen këtu. Përdor Cilësimet.'
        : 'The offer bar, navigation, and footer are not edited here. Use Settings.'}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
}
