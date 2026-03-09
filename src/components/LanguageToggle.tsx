'use client';

import { Language } from '@/lib/translations';
import { useLanguage } from '@/context/LanguageContext';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`lumina-pill inline-flex p-0.5 ${className}`}>
      {(['en', 'ru'] as Language[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          className={`min-h-7 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition ${
            language === lang
              ? 'bg-gradient-to-r from-[#C0BDD6] via-[#FDFBF7] to-[#C8A4A4] text-[#0B0814] shadow-[0_8px_20px_rgba(7,6,12,0.22)]'
              : 'text-cream/60 hover:text-warmWhite'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
