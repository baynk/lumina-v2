'use client';

import { signIn } from 'next-auth/react';

type BlurGateProps = {
  children: React.ReactNode;
  language: 'en' | 'ru';
};

export default function BlurGate({ children, language }: BlurGateProps) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-[#0a0e27]/60 backdrop-blur-[2px]">
        <p className="px-4 text-center font-heading text-xl text-cream/90">
          {language === 'ru' ? 'Войдите, чтобы увидеть полную карту' : 'Sign in to unlock your full chart'}
        </p>
        <button onClick={() => signIn('google', { callbackUrl: '/chart' })} className="lumina-button mt-4">
          {language === 'ru' ? 'Войти через Google' : 'Continue with Google'}
        </button>
        <p className="mt-3 px-6 text-center text-xs text-cream/40">
          {language === 'ru'
            ? 'Ваши данные уже сохранены — вход занимает 3 секунды'
            : 'Your birth data is already saved — signing in takes 3 seconds'}
        </p>
      </div>
    </div>
  );
}
