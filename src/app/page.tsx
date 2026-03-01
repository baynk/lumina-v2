'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';
import { calculateDailyCelestialData, calculateNatalChart } from '@/lib/astronomyCalculator';
import { loadProfile, saveProfile, clearProfile, type UserProfileLocal } from '@/lib/profile';
import { ZodiacImage } from '@/components/icons/ZodiacIcons';
import { formatAspectDescription, translateAspectType, translateMoonPhase, translatePlanet } from '@/lib/translations';
import type { BirthData, DailyCelestialData, TransitAlert, TransitReport } from '@/lib/types';
import LandingContent from '@/components/LandingContent';
import BirthDataForm, { type BirthDataFormResult } from '@/components/BirthDataForm';

const STORY_SHOWN_PREFIX = 'lumina_story_shown_';
const planetSymbols: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
};

const signOrder = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

function getZodiacSign(month: number, day: number): string {
  const signs = [
    { sign: 'Capricorn', start: [1, 1], end: [1, 19] },
    { sign: 'Aquarius', start: [1, 20], end: [2, 18] },
    { sign: 'Pisces', start: [2, 19], end: [3, 20] },
    { sign: 'Aries', start: [3, 21], end: [4, 19] },
    { sign: 'Taurus', start: [4, 20], end: [5, 20] },
    { sign: 'Gemini', start: [5, 21], end: [6, 20] },
    { sign: 'Cancer', start: [6, 21], end: [7, 22] },
    { sign: 'Leo', start: [7, 23], end: [8, 22] },
    { sign: 'Virgo', start: [8, 23], end: [9, 22] },
    { sign: 'Libra', start: [9, 23], end: [10, 22] },
    { sign: 'Scorpio', start: [10, 23], end: [11, 21] },
    { sign: 'Sagittarius', start: [11, 22], end: [12, 21] },
    { sign: 'Capricorn', start: [12, 22], end: [12, 31] },
  ];

  const m = month + 1;
  for (const s of signs) {
    if ((m === s.start[0] && day >= s.start[1]) || (m === s.end[0] && day <= s.end[1])) {
      return s.sign;
    }
  }
  return 'Aries';
}

function birthProfileKey(birthData: BirthData): string {
  return `${birthData.year}-${birthData.month}-${birthData.day}-${birthData.hour}-${birthData.minute}-${birthData.latitude}-${birthData.longitude}`;
}

function borderByTone(tone: TransitAlert['tone']): string {
  if (tone === 'opportunity') return 'border-l-emerald-300';
  if (tone === 'challenge') return 'border-l-rose-300';
  return 'border-l-amber-300';
}

function badgeByTone(tone: TransitAlert['tone']): string {
  if (tone === 'opportunity') return 'bg-emerald-300/15 text-emerald-200';
  if (tone === 'challenge') return 'bg-rose-300/15 text-rose-200';
  return 'bg-amber-300/15 text-amber-100';
}

function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const [sentence] = cleaned.split(/(?<=[.!?])\s+/);
  return sentence || cleaned;
}

function zodiacDegrees(planet: DailyCelestialData['planets'][number] | undefined): number | null {
  if (!planet) return null;
  const signIndex = signOrder.indexOf(planet.sign);
  if (signIndex < 0) return null;
  const degrees = Number.parseFloat(planet.degrees);
  if (Number.isNaN(degrees)) return null;
  return signIndex * 30 + degrees;
}

function isMercuryRetrograde(today: DailyCelestialData, tomorrow: DailyCelestialData): boolean {
  const todayMercury = today.planets.find((item) => item.planet === 'Mercury');
  const tomorrowMercury = tomorrow.planets.find((item) => item.planet === 'Mercury');

  const todayDegrees = zodiacDegrees(todayMercury);
  const tomorrowDegrees = zodiacDegrees(tomorrowMercury);
  if (todayDegrees === null || tomorrowDegrees === null) return false;

  const delta = ((tomorrowDegrees - todayDegrees + 540) % 360) - 180;
  return delta < 0;
}

export default function LandingPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { data: session, status: authStatus } = useSession();
  const formRef = useRef<HTMLDivElement | null>(null);

  const [existingProfile, setExistingProfile] = useState<UserProfileLocal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window !== 'undefined') {
      return !new URLSearchParams(window.location.search).get('start');
    }
    return true;
  });
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Skip landing if ?start=true is in the URL (e.g. from /chart "Get started")
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('start')) {
      setShowLanding(false);
    }
  }, []);

  // Form state now lives in BirthDataForm component

  const [moonPhase, setMoonPhase] = useState('New Moon');
  const [moonIllumination, setMoonIllumination] = useState(0);
  const [isMercuryRx, setIsMercuryRx] = useState(false);
  const [dailyInsight, setDailyInsight] = useState('');
  const [dailyInsightLoading, setDailyInsightLoading] = useState(false);
  const [activeTransits, setActiveTransits] = useState<TransitAlert[]>([]);
  const [activeTransitsLoading, setActiveTransitsLoading] = useState(false);

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
          // fall through to local profile
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

  // Clear personalized state on sign-out
  useEffect(() => {
    const handler = () => {
      const p = loadProfile();
      if (!p) {
        setExistingProfile(null);
        setDailyInsight('');
        setActiveTransits([]);
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
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dailyTomorrow = calculateDailyCelestialData(tomorrow);

      setMoonPhase(dailyToday.moon.phase);
      setMoonIllumination(dailyToday.moon.illumination);
      setIsMercuryRx(isMercuryRetrograde(dailyToday, dailyTomorrow));
    } catch {
      setMoonPhase('New Moon');
      setMoonIllumination(0);
      setIsMercuryRx(false);
    }
  }, []);

  useEffect(() => {
    if (!existingProfile || showForm) return;

    const run = async () => {
      setDailyInsightLoading(true);
      try {
        const natalChart = calculateNatalChart(existingProfile.birthData);
        const dailyData = calculateDailyCelestialData();
        const response = await fetch('/api/horoscope', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ natalChart, dailyData, language }),
        });

        if (!response.ok) {
          setDailyInsight(t.horoscopeFallback);
          return;
        }

        const payload = (await response.json()) as { horoscope?: string };
        setDailyInsight((payload.horoscope || t.horoscopeFallback).trim());
      } catch {
        setDailyInsight(t.horoscopeFallback);
      } finally {
        setDailyInsightLoading(false);
      }
    };

    run();
  }, [existingProfile, language, showForm, t.horoscopeFallback]);

  useEffect(() => {
    if (!existingProfile || showForm) {
      setActiveTransits([]);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setActiveTransitsLoading(true);
      try {
        const response = await fetch('/api/transits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birthData: existingProfile.birthData, language }),
        });

        if (!response.ok) throw new Error('Failed');
        const payload = (await response.json()) as TransitReport;
        if (!cancelled) setActiveTransits(payload.activeTransits.slice(0, 3));
      } catch {
        if (!cancelled) setActiveTransits([]);
      } finally {
        if (!cancelled) setActiveTransitsLoading(false);
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
      } catch {
        // non blocking
      }
    }

    const key = `${STORY_SHOWN_PREFIX}${birthProfileKey(data.birthData)}`;
    const alreadyShown = window.localStorage.getItem(key) === '1';
    router.push(alreadyShown ? '/chart' : '/story-of-you');
  }, [router, session]);

  const handleStartFresh = useCallback(() => {
    const msg = language === 'ru'
      ? 'Вы уверены? Текущие данные профиля будут удалены.'
      : 'Are you sure? Your current profile data will be cleared.';
    if (!window.confirm(msg)) return;
    clearProfile();
    setExistingProfile(null);
    setShowForm(true);
  }, [language]);

  const todayFormatted = useMemo(() => {
    const now = new Date();
    if (language === 'ru') {
      return now.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    return now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [language]);

  if (checkingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-heading text-3xl text-lumina-soft">Lumina</p>
      </div>
    );
  }

  if (existingProfile && !showForm) {
    const sunSign = getZodiacSign(existingProfile.birthData.month, existingProfile.birthData.day);
    const nameLabel = existingProfile.name || (language === 'ru' ? 'друг' : 'friend');

    const featureCards = [
      { href: '/chart', icon: '✦', title: t.homeFeatureChartTitle, description: t.homeFeatureChartDesc },
      { href: '/synastry', icon: '💫', title: t.homeFeatureCompatibilityTitle, description: t.homeFeatureCompatibilityDesc },
      { href: '/transits', icon: '🔮', title: t.homeFeatureTransitsTitle, description: t.homeFeatureTransitsDesc },
      { href: '/consultation', icon: '🌙', title: t.homeFeatureConsultationTitle, description: t.homeFeatureConsultationDesc },
    ];

    return (
      <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-3 sm:px-6">
        <header className="animate-fadeInUp">
          <p className="lumina-section-title">{t.today}</p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-4xl text-lumina-soft">{t.homeGreeting.replace('{name}', nameLabel)}</h1>
              <p className="mt-1 text-sm text-cream/60">{todayFormatted}</p>
              {isMercuryRx ? (
                <p className="mt-2 inline-flex rounded-full border border-amber-300/35 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-100">
                  {t.homeMercuryRetrogradeBadge}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
              <ZodiacImage sign={sunSign} size={64} className="opacity-90" />
            </div>
          </div>
        </header>

        <section className="glass-card mt-6 p-5 sm:p-6">
          <p className="lumina-section-title">{t.homeDailyInsight}</p>
          {dailyInsightLoading ? (
            <div className="mt-3 space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-10/12" />
            </div>
          ) : (
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-warmWhite">{dailyInsight || t.homeDailyFallback}</p>
          )}
        </section>

        <section className="glass-card mt-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="lumina-section-title">{t.homeActiveTransitsTitle}</p>
            <button type="button" onClick={() => router.push('/transits')} className="text-xs text-cream/70 transition hover:text-cream">
              {t.homeViewAllTransits}
            </button>
          </div>

          {activeTransitsLoading ? (
            <div className="mt-3 space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-10/12" />
            </div>
          ) : activeTransits.length ? (
            <div className="mt-3 space-y-2">
              {activeTransits.map((item) => {
                const fallback = formatAspectDescription(
                  {
                    type: item.aspect,
                    planet1: item.transitPlanet,
                    sign1: item.transitSign,
                    planet2: item.natalPlanet,
                    sign2: item.natalSign,
                  },
                  language
                );

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push('/transits')}
                    className={`lumina-card w-full border-l-4 p-3 text-left transition hover:border-lumina-accent/35 ${borderByTone(item.tone)}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-lumina-soft">
                      <span>{planetSymbols[item.transitPlanet] || '✦'}</span>
                      <span>{translatePlanet(item.transitPlanet, language)}</span>
                      <span className="text-cream/50">{translateAspectType(item.aspect, language).toLowerCase()}</span>
                      <span>{planetSymbols[item.natalPlanet] || '✦'}</span>
                      <span>{translatePlanet(item.natalPlanet, language)}</span>
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${badgeByTone(item.tone)}`}>{item.priority}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-warmWhite">{firstSentence(item.aiInterpretation || fallback || item.description)}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-cream/70">{t.homeNoActiveTransits}</p>
          )}
        </section>

        <section className="lumina-card mt-4 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-lumina-soft">🌙 {translateMoonPhase(moonPhase, language)}</p>
            <p className="text-xs text-cream/60">{moonIllumination}%</p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-gradient-to-r from-lumina-accent-muted to-lumina-accent" style={{ width: `${Math.max(5, moonIllumination)}%` }} />
          </div>
          <button
            type="button"
            onClick={() => router.push('/journal')}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-lumina-soft transition hover:border-lumina-accent/35 hover:text-warmWhite"
          >
            <span>{t.homeMoonJournalCta}</span>
            <span aria-hidden>→</span>
          </button>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          {featureCards.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className="lumina-card min-h-[124px] p-4 text-left transition hover:border-lumina-accent/35"
            >
              <span className="text-lg">{item.icon}</span>
              <p className="mt-2 text-sm font-medium text-warmWhite">{item.title}</p>
              <p className="mt-1 text-[11px] text-cream/55">{item.description}</p>
            </button>
          ))}
        </section>

        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={() => router.push('/chart')} className="text-sm text-lumina-soft transition hover:text-warmWhite">
            {t.homeFullReading}
          </button>
          <button type="button" onClick={handleStartFresh} className="text-xs text-cream/45 transition hover:text-cream">
            {t.notYouStartFresh}
          </button>
        </div>
      </div>
    );
  }

  // New visitor: show full practitioner landing page
  if (showLanding && !existingProfile && !session?.user) {
    return (
      <LandingContent
        onCtaClick={() => setShowLanding(false)}
        onConsultationClick={() => router.push('/consultation')}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-3 sm:px-6">
      {/* Desktop: split layout. Mobile: stacked */}
      <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:min-h-[80vh]">
        {/* Left: Hero / value prop */}
        <header className="animate-fadeInUp text-center lg:text-left">
          <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl text-lumina-soft">Lumina</h1>
          <p className="mt-3 text-base lg:text-lg text-cream">{t.homeNewTagline}</p>
          <p className="mx-auto mt-3 max-w-md text-sm lg:text-[15px] leading-relaxed text-cream/60 lg:mx-0">
            {t.homeNewParagraph}
          </p>

          {/* Trust signals — desktop only */}
          <div className="mt-8 hidden lg:flex items-center gap-6 text-cream/30">
            <div>
              <p className="text-[11px] font-heading text-[#A78BFA]/50">JPL DE421</p>
              <p className="mt-0.5 text-[10px]">{language === 'ru' ? 'Эфемериды космических агентств' : 'Space-agency ephemeris'}</p>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <p className="text-[11px] font-heading text-[#A78BFA]/50">{language === 'ru' ? '10 планет' : '10 Planets'}</p>
              <p className="mt-0.5 text-[10px]">{language === 'ru' ? 'Полный небесный чертёж' : 'Complete celestial blueprint'}</p>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <p className="text-[11px] font-heading text-[#A78BFA]/50">{language === 'ru' ? 'Бесплатно' : 'Free'}</p>
              <p className="mt-0.5 text-[10px]">{language === 'ru' ? '60 секунд · Без регистрации' : '60 seconds · No signup'}</p>
            </div>
          </div>

          {/* Mobile: CTA to scroll to form */}
          <button
            type="button"
            onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="lumina-button mt-6 w-full lg:hidden"
          >
            {t.homeBeginJourney}
          </button>
        </header>

        {/* Right: Form */}
        <div ref={formRef} className="mt-7 lg:mt-0 max-w-md mx-auto lg:mx-0 lg:ml-auto">
          <BirthDataForm onComplete={handleFormComplete} />
        </div>
      </div>
    </div>
  );
}
