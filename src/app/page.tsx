'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronRight, Sparkles, UserRound } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { calculateDailyCelestialData, calculateNatalChart } from '@/lib/astronomyCalculator';
import { clearProfile, loadProfile, saveProfile, type UserProfileLocal } from '@/lib/profile';
import { translateMoonPhase, translateSignGenitive } from '@/lib/translations';
import type { BirthData, MoonRitualResponse } from '@/lib/types';
import LandingContent from '@/components/LandingContent';
import BirthDataForm, { type BirthDataFormResult } from '@/components/BirthDataForm';

const STORY_SHOWN_PREFIX = 'lumina_story_shown_';
const REFERRAL_CODE_STORAGE_KEY = 'lumina_referral_code';
const REFERRAL_CLAIMED_PREFIX = 'lumina_referral_claimed_';

function birthProfileKey(birthData: BirthData): string {
  return `${birthData.year}-${birthData.month}-${birthData.day}-${birthData.hour}-${birthData.minute}-${birthData.latitude}-${birthData.longitude}`;
}

function firstName(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0] || fallback;
}

function greetingForHour(language: 'en' | 'ru', hour: number): string {
  if (language === 'ru') {
    if (hour < 5) return 'Доброй ночи';
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  }

  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function badgeText(language: 'en' | 'ru', sign: string): string {
  if (language === 'ru') {
    return `✦ СОЛНЦЕ В ${translateSignGenitive(sign).toUpperCase()}`;
  }

  return `✦ SUN IN ${sign.toUpperCase()}`;
}

function subtitleText(language: 'en' | 'ru'): string {
  return language === 'ru' ? 'Звезды выстроились для тебя.' : 'The stars are aligned for you.';
}

function phaseMetaText(language: 'en' | 'ru', illumination: number): string {
  return language === 'ru' ? `${illumination}% освещённости` : `${illumination}% illuminated`;
}

export default function LandingPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { data: session, status: authStatus } = useSession();
  const formRef = useRef<HTMLDivElement | null>(null);
  const referralAcceptInFlight = useRef(false);

  const [existingProfile, setExistingProfile] = useState<UserProfileLocal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window !== 'undefined') {
      return !new URLSearchParams(window.location.search).get('start');
    }
    return true;
  });
  const [checkingProfile, setCheckingProfile] = useState(true);

  const [moonPhase, setMoonPhase] = useState('New Moon');
  const [moonIllumination, setMoonIllumination] = useState(0);
  const [dailyInsight, setDailyInsight] = useState('');
  const [dailyInsightLoading, setDailyInsightLoading] = useState(false);
  const [moonRitual, setMoonRitual] = useState<MoonRitualResponse | null>(null);
  const [moonRitualLoading, setMoonRitualLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('start')) {
      setShowLanding(false);
    }
  }, []);

  useEffect(() => {
    const refCode = new URLSearchParams(window.location.search).get('ref');
    if (!refCode) return;
    window.localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, refCode.trim().toUpperCase());
  }, []);

  useEffect(() => {
    if (authStatus === 'loading') return;

    async function checkProfile() {
      if (session?.user) {
        try {
          const res = await fetch('/api/user');
          if (res.ok) {
            const serverProfile = await res.json();
            if (serverProfile.onboarding_completed && serverProfile.birth_date) {
              const [y, m, d] = serverProfile.birth_date.split('-').map(Number);
              const [h, min] = serverProfile.birth_time.split(':').map(Number);
              const localProfile: UserProfileLocal = {
                birthData: {
                  year: y,
                  month: m - 1,
                  day: d,
                  hour: h,
                  minute: min,
                  latitude: serverProfile.birth_latitude,
                  longitude: serverProfile.birth_longitude,
                  timezone: serverProfile.birth_timezone,
                },
                name: serverProfile.name || '',
                locationName: serverProfile.birth_place || '',
                savedAt: Date.now(),
              };
              saveProfile(localProfile);
              setExistingProfile(localProfile);
              setCheckingProfile(false);
              return;
            }
          }
        } catch {
          // Fall back to local profile below.
        }
      }

      const profile = loadProfile();
      if (profile) {
        setExistingProfile(profile);
      }
      setCheckingProfile(false);
    }

    checkProfile();
  }, [session, authStatus]);

  const attemptReferralAccept = useCallback(async () => {
    if (!session?.user || referralAcceptInFlight.current) return;

    const storedCode = window.localStorage.getItem(REFERRAL_CODE_STORAGE_KEY)?.trim().toUpperCase();
    if (!storedCode) return;

    const userId = (session.user as Record<string, unknown>).id as string | undefined;
    if (userId && window.localStorage.getItem(`${REFERRAL_CLAIMED_PREFIX}${userId}`) === '1') {
      return;
    }

    referralAcceptInFlight.current = true;
    try {
      const response = await fetch('/api/referral/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: storedCode }),
      });

      if (response.ok) {
        window.localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
        if (userId) {
          window.localStorage.setItem(`${REFERRAL_CLAIMED_PREFIX}${userId}`, '1');
        }
        return;
      }

      if ([400, 404, 409].includes(response.status)) {
        window.localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
      }
    } catch {
      // Keep the code for later retries on transient failures.
    } finally {
      referralAcceptInFlight.current = false;
    }
  }, [session]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !existingProfile) return;
    attemptReferralAccept();
  }, [attemptReferralAccept, authStatus, existingProfile]);

  useEffect(() => {
    const handler = () => {
      const profile = loadProfile();
      if (!profile) {
        setExistingProfile(null);
        setDailyInsight('');
        setMoonRitual(null);
      }
    };

    window.addEventListener('lumina-profile-changed', handler);
    window.addEventListener('lumina-auth-signed-out', handler);

    return () => {
      window.removeEventListener('lumina-profile-changed', handler);
      window.removeEventListener('lumina-auth-signed-out', handler);
    };
  }, []);

  useEffect(() => {
    try {
      const dailyToday = calculateDailyCelestialData();
      setMoonPhase(dailyToday.moon.phase);
      setMoonIllumination(dailyToday.moon.illumination);
    } catch {
      setMoonPhase('New Moon');
      setMoonIllumination(0);
    }
  }, []);

  const natalChart = useMemo(() => {
    if (!existingProfile) return null;

    try {
      return calculateNatalChart(existingProfile.birthData);
    } catch {
      return null;
    }
  }, [existingProfile]);

  useEffect(() => {
    if (!existingProfile || !natalChart || showForm) return;

    let cancelled = false;

    const run = async () => {
      setDailyInsightLoading(true);
      try {
        const dailyData = calculateDailyCelestialData();
        const response = await fetch('/api/horoscope', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ natalChart, dailyData, language }),
        });

        if (!response.ok) {
          if (!cancelled) setDailyInsight(t.horoscopeFallback);
          return;
        }

        const payload = (await response.json()) as { horoscope?: string };
        if (!cancelled) {
          setDailyInsight((payload.horoscope || t.horoscopeFallback).trim());
        }
      } catch {
        if (!cancelled) setDailyInsight(t.horoscopeFallback);
      } finally {
        if (!cancelled) setDailyInsightLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [existingProfile, language, natalChart, showForm, t.horoscopeFallback]);

  useEffect(() => {
    if (!existingProfile || !natalChart || showForm) {
      setMoonRitual(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setMoonRitualLoading(true);
      try {
        const response = await fetch('/api/moon-ritual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moonPhase,
            sunSign: natalChart.zodiacSign,
            language,
          }),
        });

        const payload = (await response.json()) as MoonRitualResponse;
        if (!cancelled) setMoonRitual(payload);
      } catch {
        if (!cancelled) setMoonRitual(null);
      } finally {
        if (!cancelled) setMoonRitualLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [existingProfile, language, moonPhase, natalChart, showForm]);

  const handleFormComplete = useCallback(async (data: BirthDataFormResult) => {
    saveProfile({
      birthData: data.birthData,
      name: data.name,
      locationName: data.locationName,
      timeAccuracy: data.timeAccuracy,
      savedAt: Date.now(),
    });

    if (session?.user) {
      try {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const bd = data.birthData;
        await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birth_date: `${bd.year}-${pad(bd.month + 1)}-${pad(bd.day)}`,
            birth_time: data.timeAccuracy === 'unknown' ? '12:00' : `${pad(bd.hour)}:${pad(bd.minute)}`,
            birth_place: data.locationName,
            birth_latitude: bd.latitude,
            birth_longitude: bd.longitude,
            birth_timezone: bd.timezone,
            name: data.name || undefined,
          }),
        });

        await attemptReferralAccept();
      } catch {
        // Non-blocking save failure.
      }
    }

    const key = `${STORY_SHOWN_PREFIX}${birthProfileKey(data.birthData)}`;
    const alreadyShown = window.localStorage.getItem(key) === '1';
    router.push(alreadyShown ? '/chart' : '/story-of-you');
  }, [attemptReferralAccept, router, session]);

  const handleStartFresh = useCallback(() => {
    const message = language === 'ru'
      ? 'Вы уверены? Текущие данные профиля будут удалены.'
      : 'Are you sure? Your current profile data will be cleared.';

    if (!window.confirm(message)) return;
    clearProfile();
    setExistingProfile(null);
    setShowForm(true);
  }, [language]);

  const homeCopy = useMemo(() => {
    const ritualFallbackSummary = language === 'ru'
      ? 'Мягко настрой своё внимание на то, что просит тишины, заботы и осознанного движения.'
      : 'Set your attention on what wants quiet, care, and one intentional next move.';

    return {
      insightTitle: language === 'ru' ? 'Послание на сегодня' : 'A message for today',
      ritualOverline: language === 'ru' ? 'Лунный ритуал' : 'Moon Ritual',
      ritualButton: language === 'ru' ? 'Открыть ритуал' : 'Open ritual',
      profileFallbackName: language === 'ru' ? 'друг' : 'friend',
      startFresh: language === 'ru' ? 'Не ты? Начать заново' : 'Not you? Start fresh',
      moonMeta: phaseMetaText(language, moonIllumination),
      ritualFallbackSummary,
    };
  }, [language, moonIllumination]);

  const greeting = useMemo(() => {
    const now = new Date();
    const name = firstName(existingProfile?.name || session?.user?.name, homeCopy.profileFallbackName);
    return `${greetingForHour(language, now.getHours())}, ${name}`;
  }, [existingProfile?.name, homeCopy.profileFallbackName, language, session?.user?.name]);

  const phaseShadowStyle = useMemo(() => {
    const illumination = Math.max(0, Math.min(100, moonIllumination));
    const width = `${100 - illumination}%`;
    const waxing = moonPhase.toLowerCase().includes('waxing');
    const full = moonPhase.toLowerCase().includes('full');

    if (full) {
      return { opacity: 0 };
    }

    return waxing
      ? { top: 0, right: 0, bottom: 0, width }
      : { top: 0, bottom: 0, left: 0, width };
  }, [moonIllumination, moonPhase]);

  useEffect(() => {
    if (checkingProfile || existingProfile) return;
    router.replace('/onboarding');
  }, [checkingProfile, existingProfile, router]);

  if (checkingProfile) {
    return (
      <div className="lumina-screen flex min-h-screen items-center justify-center">
        <p className="font-heading text-3xl text-text-primary">lumina✦</p>
      </div>
    );
  }

  if (existingProfile && !showForm) {
    const ritualSummary = moonRitual?.summary || homeCopy.ritualFallbackSummary;
    const ritualTitle = moonRitual?.title || homeCopy.ritualOverline;

    return (
      <div className="px-0 pb-24 sm:px-6 sm:pb-28">
        <section className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden bg-bg-base sm:mt-6 sm:min-h-[calc(100dvh-3rem)] sm:rounded-[36px] sm:border sm:border-bg-frame">
          <div className="aura aura-violet left-1/2 top-10 h-[380px] w-[380px] -translate-x-[62%]" aria-hidden="true" />
          <div className="aura aura-indigo left-1/2 top-[24rem] h-[360px] w-[360px] -translate-x-[8%] [animation-delay:-5s]" aria-hidden="true" />
          <div className="aura aura-blue left-1/2 bottom-12 h-[400px] w-[400px] -translate-x-[74%] [animation-delay:-2s]" aria-hidden="true" />

          <div className="relative z-10 flex min-h-screen flex-col px-6 pb-[100px] pt-10 sm:min-h-[calc(100dvh-3rem)]">
            <header className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="font-heading text-[26px] font-medium tracking-[0.5px] text-text-primary"
                aria-label="Lumina"
              >
                lumina<span className="align-top text-lg text-[var(--wordmark-sparkle)]">✦</span>
              </button>
              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="profile-btn"
                aria-label={language === 'ru' ? 'Открыть профиль' : 'Open profile'}
              >
                <UserRound size={18} strokeWidth={1.5} />
              </button>
            </header>

            <div className="mt-8 text-center">
              <h1 className="font-heading text-[32px] font-medium leading-[1.1] text-text-primary">
                {greeting}
              </h1>
              <p className="mt-2 font-heading text-[18px] italic text-text-secondary">
                {subtitleText(language)}
              </p>
            </div>

            <div className="mt-10 flex flex-col items-center">
              <div className="moon">
                <div
                  className="absolute rounded-full bg-[linear-gradient(180deg,rgba(11,8,20,0.96),rgba(20,17,33,0.92))] transition-all duration-300"
                  style={phaseShadowStyle}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-6 text-sm font-light text-text-secondary">
                {translateMoonPhase(moonPhase, language)}
              </p>
              <p className="mt-1 text-[13px] font-light text-text-muted">
                {homeCopy.moonMeta}
              </p>
              {natalChart ? <div className="badge mt-5">{badgeText(language, natalChart.zodiacSign)}</div> : null}
            </div>

            <div className="mt-8 space-y-4">
              <article className="glass-card p-[26px]">
                <p className="lumina-section-title">{t.homeDailyInsight}</p>
                <h2 className="font-heading text-[28px] font-normal text-text-primary">
                  {homeCopy.insightTitle}
                </h2>
                {dailyInsightLoading ? (
                  <div className="space-y-2 pt-1">
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-11/12" />
                    <div className="skeleton h-4 w-10/12" />
                  </div>
                ) : (
                  <p className="whitespace-pre-line font-body text-[15px] font-light leading-[1.6] text-text-secondary">
                    {dailyInsight || t.homeDailyFallback}
                  </p>
                )}
              </article>

              <div className="py-1 text-center font-body text-sm tracking-[0.45em] text-text-secondary/40">
                ✦ ✦ ✦
              </div>

              <article className="glass-card p-[26px]">
                <p className="lumina-section-title">
                  {moonRitualLoading ? translateMoonPhase(moonPhase, language) : homeCopy.ritualOverline}
                </p>
                <h2 className="font-heading text-[28px] font-normal text-text-primary">
                  {ritualTitle}
                </h2>
                <p className="font-body text-[15px] font-light leading-[1.6] text-text-secondary">
                  {ritualSummary}
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/journal')}
                  className="lumina-button mt-2 flex w-full items-center justify-center gap-2 px-4 py-4 text-[14px]"
                >
                  <span>{homeCopy.ritualButton}</span>
                  <ChevronRight size={16} strokeWidth={1.7} />
                </button>
              </article>
            </div>

            <div className="mt-auto pt-6">
              <button
                type="button"
                onClick={handleStartFresh}
                className="mx-auto flex items-center gap-2 font-body text-[11px] uppercase tracking-[0.22em] text-text-muted transition-colors duration-300 hover:text-text-secondary"
              >
                <Sparkles size={14} strokeWidth={1.5} />
                <span>{homeCopy.startFresh}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (showLanding && !existingProfile && !session?.user) {
    return (
      <LandingContent
        onCtaClick={() => setShowLanding(false)}
        onConsultationClick={() => router.push('/consultation')}
      />
    );
  }

  if (!existingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <p className="text-sm text-text-secondary">
          {language === 'ru' ? 'Переходим к онбордингу...' : 'Redirecting to onboarding...'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-3 sm:px-6">
      <div className="lg:grid lg:min-h-[80vh] lg:grid-cols-2 lg:items-center lg:gap-16">
        <header className="animate-fadeInUp text-center lg:text-left">
          <h1 className="font-heading text-5xl text-lumina-soft sm:text-6xl lg:text-7xl">Lumina</h1>
          <p className="mt-3 text-base text-cream lg:text-lg">{t.homeNewTagline}</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream/60 lg:mx-0 lg:text-[15px]">
            {t.homeNewParagraph}
          </p>

          <button
            type="button"
            onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="lumina-button mt-6 w-full lg:hidden"
          >
            {t.homeBeginJourney}
          </button>
        </header>

        <div ref={formRef} className="mx-auto mt-7 max-w-md lg:mx-0 lg:ml-auto lg:mt-0">
          <BirthDataForm onComplete={handleFormComplete} />
        </div>
      </div>
    </div>
  );
}
