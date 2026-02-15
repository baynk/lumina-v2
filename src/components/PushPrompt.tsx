'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { isPushSubscribed, isPushSupported, subscribeToPush } from '@/lib/pushNotifications';

const DISMISSED_STORAGE_KEY = 'lumina_push_prompt_dismissed';

type ViewState = 'idle' | 'loading' | 'success' | 'error';

export default function PushPrompt() {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<ViewState>('idle');

  const copy = useMemo(() => {
    if (language === 'ru') {
      return {
        title: 'Получайте ежедневное чтение ✦',
        cta: 'Включить уведомления',
        dismiss: 'Скрыть',
        success: 'Уведомления включены.',
        error: 'Не удалось включить уведомления.',
      };
    }

    return {
      title: 'Get your daily reading delivered ✦',
      cta: 'Enable notifications',
      dismiss: 'Dismiss',
      success: 'Notifications enabled.',
      error: 'Could not enable notifications.',
    };
  }, [language]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isPushSupported()) {
        return;
      }

      if (window.localStorage.getItem(DISMISSED_STORAGE_KEY) === '1') {
        return;
      }

      try {
        const userResponse = await fetch('/api/user', { cache: 'no-store' });
        if (!userResponse.ok) {
          return;
        }

        const user = (await userResponse.json()) as { onboarding_completed?: boolean };
        if (!user.onboarding_completed) {
          return;
        }

        const subscribed = await isPushSubscribed();
        if (!subscribed && mounted) {
          setIsVisible(true);
        }
      } catch {
        // Fail quietly to avoid disrupting chart UI.
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, '1');
    setIsVisible(false);
  };

  const handleSubscribe = async () => {
    try {
      setState('loading');
      await subscribeToPush();
      setState('success');
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, '1');
      window.setTimeout(() => setIsVisible(false), 1200);
    } catch {
      setState('error');
    }
  };

  return (
    <section className="glass-card mb-5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-cream/90">{copy.title}</p>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-cream/50 transition hover:text-warmWhite"
        >
          {copy.dismiss}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={state === 'loading'}
          className="lumina-button w-full sm:w-auto"
        >
          {state === 'loading' ? '...' : copy.cta}
        </button>

        {state === 'success' ? <p className="text-xs text-lumina-soft">{copy.success}</p> : null}
        {state === 'error' ? <p className="text-xs text-red-300">{copy.error}</p> : null}
      </div>
    </section>
  );
}
