'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  CalendarDays,
  ChevronRight,
  HeartHandshake,
  NotebookPen,
  Sparkles,
  Stars,
  UserRound,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { calculateDailyCelestialData, calculateNatalChart } from '@/lib/astronomyCalculator';
import { clearProfile, loadProfile, saveProfile, type UserProfileLocal } from '@/lib/profile';
import { translateMoonPhase, translatePlanet, translateSign } from '@/lib/translations';
import type { BirthData, MoonRitualResponse, TransitAlert, TransitReport } from '@/lib/types';
import BirthDataForm, { type BirthDataFormResult } from '@/components/BirthDataForm';
import MoonPhaseVisual from '@/components/MoonPhaseVisual';

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

function subtitleText(language: 'en' | 'ru'): string {
  return language === 'ru' ? 'Небо сегодня говорит тихо, но очень точно.' : 'The sky is speaking softly, but clearly today.';
}

function phaseMetaText(language: 'en' | 'ru', illumination: number): string {
  return language === 'ru' ? `${illumination}% освещённости` : `${illumination}% illuminated`;
}

function todayDate(language: 'en' | 'ru'): string {
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

function formatForecast(text: string): string {
  const trimmed = text.trim().replace(/[✦\s]+$/, '');
  return trimmed ? `${trimmed} ✦` : '';
}

function transitBorder(tone: TransitAlert['tone']): string {
  if (tone === 'opportunity') return 'border-l-[#8FD6D1]';
  if (tone === 'challenge') return 'border-l-[var(--text-accent)]';
  return 'border-l-[#C0BDD6]';
}

function transitToneLabel(language: 'en' | 'ru', tone: TransitAlert['tone']): string {
  if (language === 'ru') {
    if (tone === 'opportunity') return 'Возможность';
    if (tone === 'challenge') return 'Вызов';
    return 'Осознание';
  }

  if (tone === 'opportunity') return 'Opportunity';
  if (tone === 'challenge') return 'Challenge';
  return 'Awareness';
}

const QUICK_LINKS = {
  en: [
    { href: '/journal', label: 'Moon Journal', icon: NotebookPen, note: 'Rituals and reflections' },
    { href: '/consultation', label: 'Consultation', icon: Stars, note: 'Personal reading' },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays, note: 'Celestial timing' },
    { href: '/synastry', label: 'Synastry', icon: HeartHandshake, note: 'Relationship chemistry' },
  ],
  ru: [
    { href: '/journal', label: 'Лунный дневник', icon: NotebookPen, note: 'Ритуалы и заметки' },
    { href: '/consultation', label: 'Консультация', icon: Stars, note: 'Личный разбор' },
    { href: '/calendar', label: 'Календарь', icon: CalendarDays, note: 'Ритм неба' },
    { href: '/synastry', label: 'Синастрия', icon: HeartHandshake, note: 'Химия отношений' },
  ],
} as const;

export default function LandingPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { data: session, status: authStatus } = useSession();
  const formRef = useRef<HTMLDivElement | null>(null);
  const referralAcceptInFlight = useRef(false);

  const [existingProfile, setExistingProfile] = useState<UserProfileLocal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  const [moonPhase, setMoonPhase] = useState('New Moon');
  const [moonIllumination, setMoonIllumination] = useState(0);
  const [moonSign, setMoonSign] = useState('Aries');
  const [dailyInsight, setDailyInsight] = useState('');
  const [dailyInsightLoading, setDailyInsightLoading] = useState(false);
  const [moonRitual, setMoonRitual] = useState<MoonRitualResponse | null>(null);
  const [moonRitualLoading, setMoonRitualLoading] = useState(false);
  const [transitReport, setTransitReport] = useState<TransitReport | null>(null);
  const [transitLoading, setTransitLoading] = useState(false);

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
        setTransitReport(null);
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
      setMoonSign(dailyToday.moon.sign);
    } catch {
      setMoonPhase('New Moon');
      setMoonIllumination(0);
      setMoonSign('Aries');
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

  useEffect(() => {
    if (!existingProfile || showForm) return;

    let cancelled = false;

    const run = async () => {
      setTransitLoading(true);
      try {
        const response = await fetch('/api/transits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birthData: existingProfile.birthData, language }),
        });

        if (!response.ok) {
          if (!cancelled) setTransitReport(null);
          return;
        }

        const payload = (await response.json()) as TransitReport;
        if (!cancelled) setTransitReport(payload);
      } catch {
        if (!cancelled) setTransitReport(null);
      } finally {
        if (!cancelled) setTransitLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [existingProfile, language, showForm]);

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
      ? 'Мягко настрой внимание на том, что просит нежности, границ и честного присутствия.'
      : 'Set your attention on what wants tenderness, boundaries, and honest presence.';

    return {
      profileFallbackName: language === 'ru' ? 'друг' : 'friend',
      startFresh: language === 'ru' ? 'Не ты? Начать заново' : 'Not you? Start fresh',
      moonMeta: phaseMetaText(language, moonIllumination),
      ritualFallbackSummary,
      ritualButton: language === 'ru' ? 'Открыть ритуал' : 'Open ritual',
      energyLabel: language === 'ru' ? 'Энергия дня' : "Energy of the day",
      forecastLabel: language === 'ru' ? 'Прогноз на сегодня' : 'Daily forecast',
      quickLabel: language === 'ru' ? 'Быстрый доступ' : 'Quick access',
      transitLabel: language === 'ru' ? 'ТРАНЗИТЫ ДНЯ' : 'TRANSITS TODAY',
      transitEmpty: language === 'ru' ? 'Сегодня небо спокойно: важных предупреждений нет.' : 'The sky is quiet today. No major alerts need your attention.',
      heroLabel: language === 'ru' ? 'Сегодня' : 'Today',
    };
  }, [language, moonIllumination]);

  const greeting = useMemo(() => {
    const now = new Date();
    const name = firstName(existingProfile?.name || session?.user?.name, homeCopy.profileFallbackName);
    return `${greetingForHour(language, now.getHours())}, ${name}`;
  }, [existingProfile?.name, homeCopy.profileFallbackName, language, session?.user?.name]);

  const transitHighlights = useMemo(() => {
    return (transitReport?.activeTransits || []).slice(0, 3);
  }, [transitReport]);

  const energyText = useMemo(() => {
    const fallback = language === 'ru'
      ? 'День просит мягкой концентрации и доверия к внутреннему ритму.'
      : 'The day asks for soft focus and trust in your inner rhythm.';

    const source = dailyInsight || moonRitual?.summary || '';
    const normalized = source.replace(/\s+/g, ' ').trim();
    return normalized || fallback;
  }, [dailyInsight, language, moonRitual?.summary]);

  const forecastText = useMemo(() => {
    return formatForecast(dailyInsight || t.homeDailyFallback);
  }, [dailyInsight, t.homeDailyFallback]);

  useEffect(() => {
    if (checkingProfile || existingProfile) return;
    router.replace('/onboarding');
  }, [checkingProfile, existingProfile, router]);

  if (checkingProfile || !existingProfile) {
    return (
      <div className="lumina-screen flex min-h-screen items-center justify-center">
        <p className="font-heading text-3xl text-text-primary">lumina✦</p>
      </div>
    );
  }

  if (existingProfile && !showForm) {
    const ritualSummary = moonRitual?.summary || homeCopy.ritualFallbackSummary;
    const quickLinks = QUICK_LINKS[language];

    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-void)]">
        <div className="celestial-gradient" aria-hidden="true" />
        <div className="star-field" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-safe sm:px-6 lg:max-w-5xl lg:pb-10">
          <header className="pb-6 pt-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="font-heading text-[26px] font-medium tracking-[0.5px] text-text-primary"
              aria-label="Lumina"
            >
              lumina<span className="align-top text-lg text-[var(--wordmark-sparkle)]">✦</span>
            </button>
          </header>

          <section className="animate-stagger-1">
            <p className="lumina-label">{homeCopy.heroLabel}</p>
            <h1 className="mt-3 font-heading text-[34px] leading-[1.02] text-text-primary">
              {greeting}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {subtitleText(language)}
            </p>
          </section>

          <div className="mt-6 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-6">
          <section className="glass-card lumina-orb-shell p-6 animate-stagger-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="badge">{todayDate(language)}</p>
                <p className="mt-4 font-heading text-[18px] italic text-text-secondary">
                  {translateMoonPhase(moonPhase, language)}
                </p>
              </div>
              {natalChart ? (
                <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-badge)] sm:block">
                  {language === 'ru'
                    ? `Солнце в ${translateSign(natalChart.zodiacSign, language)}`
                    : `Sun in ${translateSign(natalChart.zodiacSign, language)}`}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col items-center text-center">
              <div className="animate-float">
                <MoonPhaseVisual illumination={moonIllumination} phase={moonPhase} />
              </div>
              <h2 className="mt-4 font-heading text-[36px] leading-none text-text-primary">
                {translateSign(moonSign, language)}
              </h2>
              <p className="mt-3 text-sm text-text-secondary">
                {translateMoonPhase(moonPhase, language)} · {homeCopy.moonMeta}
              </p>
              <div className="mt-5 w-full rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left">
                <p className="lumina-label">{homeCopy.energyLabel}</p>
                <p className="mt-2 max-w-prose whitespace-pre-line text-[15px] leading-[1.75] text-text-primary">
                  {energyText}
                </p>
              </div>
            </div>
          </section>

          <div className="mt-8 space-y-8 lg:mt-0">
          <section className="animate-stagger-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="lumina-label">{homeCopy.transitLabel}</p>
              <Link href="/transits" className="text-[11px] uppercase tracking-[0.18em] text-text-secondary transition hover:text-text-primary">
                {language === 'ru' ? 'Все' : 'All'}
              </Link>
            </div>

            <div className="space-y-3">
              {transitLoading ? (
                <>
                  <div className="glass-card p-4"><div className="skeleton h-20 w-full" /></div>
                  <div className="glass-card p-4"><div className="skeleton h-20 w-full" /></div>
                </>
              ) : transitHighlights.length ? (
                transitHighlights.map((item) => (
                  <Link
                    key={item.id}
                    href="/transits"
                    className={`glass-card block border-l-[3px] ${transitBorder(item.tone)} p-4 transition`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {translatePlanet(item.transitPlanet, language)} {language === 'ru' ? 'к' : 'to'} {translatePlanet(item.natalPlanet, language)}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                          {item.aiInterpretation || item.description}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-badge)]">
                        {transitToneLabel(language, item.tone)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="glass-card p-4">
                  <p className="text-sm leading-relaxed text-text-secondary">{homeCopy.transitEmpty}</p>
                </div>
              )}
            </div>
          </section>

          <section className="glass-card mt-8 p-6 animate-stagger-4 lg:mt-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="lumina-label">{homeCopy.forecastLabel}</p>
                <h2 className="mt-3 font-heading text-[28px] leading-[1.06] text-text-primary">
                  {language === 'ru' ? 'Для твоего сердца' : 'For your heart'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => router.push('/journal')}
                className="profile-btn h-11 w-11 shrink-0"
                aria-label={t.homeMoonJournalCta}
              >
                <NotebookPen size={17} strokeWidth={1.7} />
              </button>
            </div>

            {dailyInsightLoading ? (
              <div className="mt-5 space-y-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-11/12" />
                <div className="skeleton h-4 w-9/12" />
              </div>
            ) : (
              <p className="mt-5 max-w-prose whitespace-pre-line text-[15px] leading-[1.8] text-text-secondary">
                {forecastText}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="lumina-label">{moonRitualLoading ? t.moonPhase : t.moonRitualTitle}</p>
                <p className="mt-1 text-sm text-text-secondary">{ritualSummary}</p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/journal')}
                className="lumina-btn-primary inline-flex min-h-12 items-center justify-center gap-2 self-start whitespace-nowrap px-5 text-[11px] tracking-[0.18em] sm:self-auto"
              >
                <span>{homeCopy.ritualButton}</span>
                <ChevronRight size={15} strokeWidth={1.7} />
              </button>
            </div>
          </section>
          </div>
          </div>

          <section className="mt-8 animate-stagger-5">
            <p className="lumina-label mb-3">{homeCopy.quickLabel}</p>
            <div className="grid auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-4">
              {quickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href} className="glass-card flex h-full min-h-[164px] flex-col justify-between p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-heading text-[20px] leading-[1.05] text-text-primary">{item.label}</p>
                        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.note}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-2 text-text-primary">
                        <Icon size={18} strokeWidth={1.7} />
                      </span>
                    </div>
                    <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-badge)]">
                      {language === 'ru' ? 'Открыть' : 'Open'}
                      <ChevronRight size={14} strokeWidth={1.7} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="mt-8 pb-2 text-center">
            <button
              type="button"
              onClick={handleStartFresh}
              className="mx-auto flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-text-muted transition hover:text-text-secondary"
            >
              <Sparkles size={14} strokeWidth={1.5} />
              <span>{homeCopy.startFresh}</span>
            </button>
          </div>
        </div>

      </div>
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
            className="lumina-btn-primary mt-6 w-full lg:hidden"
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
