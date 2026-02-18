'use client';

import { Language } from '@/lib/translations';
import { useLanguage } from '@/context/LanguageContext';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`inline-flex rounded-full border border-white/15 bg-white/5 p-0.5 backdrop-blur-md ${className}`}>
      {(['en', 'ru'] as Language[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          className={`min-h-7 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition ${
            language === lang
              ? 'bg-gradient-to-r from-lumina-accent-bright to-lumina-accent text-white'
              : 'text-cream/60 hover:text-warmWhite'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
