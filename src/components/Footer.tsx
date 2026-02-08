'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return <footer className="relative z-10 py-6 text-center text-xs tracking-wider text-cream/40">{t.madeWithLove}</footer>;
}
