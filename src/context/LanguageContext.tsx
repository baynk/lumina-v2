'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Language, translations } from '@/lib/translations';

type UiStrings = (typeof translations)[Language];

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: UiStrings;
};

const LANGUAGE_STORAGE_KEY = 'lumina_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'ru') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  const value = useMemo(
    () => ({ language, setLanguage, t: translations[language] }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
