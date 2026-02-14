'use client';

import { Language } from '@/lib/translations';
import { useLanguage } from '@/context/LanguageContext';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`inline-flex rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-md ${className}`}>
      {(['en', 'ru'] as Language[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          className={`min-h-8 min-w-8 sm:min-h-11 sm:min-w-11 rounded-full px-2.5 sm:px-4 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.15em] sm:tracking-[0.2em] transition ${
            language === lang
              ? 'bg-gradient-to-r from-lumina-accent-bright to-lumina-accent text-white'
              : 'text-cream hover:text-warmWhite'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
