'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4">
      <div className="glass-card w-full p-8 text-center animate-fadeInUp">
        <p className="mb-3 text-4xl">✦</p>
        <h1 className="mb-3 font-heading text-2xl text-lumina-soft">
          {language === 'ru' ? 'Оплата прошла успешно' : 'Payment successful'}
        </h1>
        <p className="mb-4 text-sm text-cream/70">
          {language === 'ru' ? 'Добро пожаловать в Lumina Premium ✦' : 'Welcome to Lumina Premium ✦'}
        </p>
        <p className="text-xs text-cream/50">
          {language === 'ru'
            ? 'Сейчас вы будете перенаправлены на главную страницу.'
            : 'You will be redirected to the home page in 3 seconds.'}
        </p>
        {sessionId && <p className="mt-4 text-[10px] text-cream/30">session: {sessionId}</p>}
      </div>
    </div>
  );
}
