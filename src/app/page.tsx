'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';
import { calculateDailyCelestialData, calculateNatalChart } from '@/lib/astronomyCalculator';
import { loadProfile, saveProfile, clearProfile, type UserProfileLocal } from '@/lib/profile';
import { ZodiacImage } from '@/components/icons/ZodiacIcons';
import { translateMoonPhase } from '@/lib/translations';
import type { BirthData } from '@/lib/types';
import LandingContent from '@/components/LandingContent';

type LocationResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

const STORY_SHOWN_PREFIX = 'lumina_story_shown_';

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

function compactInsight(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 3) return cleaned;
  return sentences.slice(0, 3).join(' ');
}

const months = Array.from({ length: 12 }, (_, idx) => idx + 1);
const days = Array.from({ length: 31 }, (_, idx) => idx + 1);
const years = Array.from({ length: 100 }, (_, idx) => new Date().getFullYear() - idx);
const hours = Array.from({ length: 24 }, (_, idx) => idx);
const minutes = Array.from({ length: 60 }, (_, idx) => idx);

export default function LandingPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { data: session, status: authStatus } = useSession();
  const formRef = useRef<HTMLElement | null>(null);

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

  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [timeAccuracy, setTimeAccuracy] = useState<'exact' | 'approximate' | 'unknown'>('exact');

  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [timezone, setTimezone] = useState('UTC');
  const [submitting, setSubmitting] = useState(false);

  const [moonPhase, setMoonPhase] = useState('New Moon');
  const [moonIllumination, setMoonIllumination] = useState(0);
  const [dailyInsight, setDailyInsight] = useState('');
  const [dailyInsightLoading, setDailyInsightLoading] = useState(false);

  const canSubmit = useMemo(
    () =>
      !!day &&
      !!month &&
      !!year &&
      (timeAccuracy === 'unknown' || (!!hour && !!minute)) &&
      selectedLocationName.length > 0 &&
      latitude !== null &&
      longitude !== null,
    [day, hour, latitude, longitude, minute, month, selectedLocationName, timeAccuracy, year],
  );

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

  useEffect(() => {
    try {
      const daily = calculateDailyCelestialData();
      setMoonPhase(daily.moon.phase);
      setMoonIllumination(daily.moon.illumination);
    } catch {
      setMoonPhase('New Moon');
      setMoonIllumination(0);
    }
  }, []);

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detectedTimezone) {
      setTimezone(detectedTimezone);
    }
  }, []);

  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearchingLocation(true);
        const response = await fetch(
          `/api/geocode?q=${encodeURIComponent(query)}`,
        );
        if (!response.ok) {
          setLocationResults([]);
          return;
        }
        const payload = (await response.json()) as LocationResult[];
        setLocationResults(payload);
      } catch {
        setLocationResults([]);
      } finally {
        setSearchingLocation(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [locationQuery]);

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
          setDailyInsight(compactInsight(t.horoscopeFallback));
          return;
        }

        const payload = (await response.json()) as { horoscope?: string };
        setDailyInsight(compactInsight(payload.horoscope || t.horoscopeFallback));
      } catch {
        setDailyInsight(compactInsight(t.horoscopeFallback));
      } finally {
        setDailyInsightLoading(false);
      }
    };

    run();
  }, [existingProfile, language, showForm, t.horoscopeFallback]);

  const handleSelectLocation = async (result: LocationResult) => {
    setSelectedLocationName(result.display_name);
    setLocationQuery(result.display_name);
    const lat = Number.parseFloat(result.lat);
    const lon = Number.parseFloat(result.lon);
    setLatitude(lat);
    setLongitude(lon);
    setLocationResults([]);

    try {
      const tzResp = await fetch(`/api/timezone?lat=${lat}&lon=${lon}`);
      const tzData = (await tzResp.json()) as { timezone?: string };
      if (tzData.timezone) {
        setTimezone(tzData.timezone);
      }
    } catch {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detectedTimezone) setTimezone(detectedTimezone);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || latitude === null || longitude === null) return;

    setSubmitting(true);

    let resolvedTz = timezone;
    try {
      const tzResp = await fetch(`/api/timezone?lat=${latitude}&lon=${longitude}`);
      const tzData = (await tzResp.json()) as { timezone?: string };
      if (tzData.timezone) {
        resolvedTz = tzData.timezone;
      }
    } catch {
      // continue
    }

    const birthData: BirthData = {
      year: Number.parseInt(year, 10),
      month: Number.parseInt(month, 10) - 1,
      day: Number.parseInt(day, 10),
      hour: timeAccuracy === 'unknown' ? 12 : Number.parseInt(hour, 10),
      minute: timeAccuracy === 'unknown' ? 0 : Number.parseInt(minute, 10),
      latitude,
      longitude,
      timezone: resolvedTz,
    };

    saveProfile({
      birthData,
      name: name.trim(),
      locationName: selectedLocationName,
      timeAccuracy,
      savedAt: Date.now(),
    });

    if (session?.user) {
      try {
        const pad = (n: number) => n.toString().padStart(2, '0');
        await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birth_date: `${year}-${pad(Number(month))}-${pad(Number(day))}`,
            birth_time: timeAccuracy === 'unknown' ? '12:00' : `${pad(Number(hour))}:${pad(Number(minute))}`,
            birth_place: selectedLocationName,
            birth_latitude: latitude,
            birth_longitude: longitude,
            birth_timezone: resolvedTz,
            name: name.trim() || undefined,
          }),
        });
      } catch {
        // non blocking
      }
    }

    const key = `${STORY_SHOWN_PREFIX}${birthProfileKey(birthData)}`;
    const alreadyShown = window.localStorage.getItem(key) === '1';
    router.push(alreadyShown ? '/chart' : '/story-of-you');
  };

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
            <p className="mt-3 text-base leading-relaxed text-warmWhite">{dailyInsight || t.homeDailyFallback}</p>
          )}
        </section>

        <section className="lumina-card mt-4 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-lumina-soft">🌙 {translateMoonPhase(moonPhase, language)}</p>
            <a href="/journal" className="text-xs text-cream/65 transition hover:text-cream">
              {t.homeOpenJournal}
            </a>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-gradient-to-r from-lumina-accent-muted to-lumina-accent" style={{ width: `${Math.max(5, moonIllumination)}%` }} />
          </div>
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
    <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-3 sm:px-6">
      <header className="animate-fadeInUp text-center">
        <h1 className="font-heading text-6xl text-lumina-soft">Lumina</h1>
        <p className="mt-2 text-base text-cream">{t.homeNewTagline}</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream/70">{t.homeNewParagraph}</p>
        <button
          type="button"
          onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="lumina-button mt-6 w-full"
        >
          {t.homeBeginJourney}
        </button>
      </header>

      <section ref={formRef} className="glass-card mt-7 p-5 sm:p-6">
        <p className="lumina-section-title mb-4">{t.enterBirthDetails}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="lumina-label">
              {t.name} ({t.optional})
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="lumina-input"
              placeholder={t.homeNamePlaceholder}
              autoComplete="name"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div className="sm:col-span-3">
              <p className="lumina-label mb-2">{t.dateOfBirth}</p>
              <div className="grid grid-cols-3 gap-2">
                <select className="lumina-input" value={day} onChange={(event) => setDay(event.target.value)} required>
                  <option value="">{t.day}</option>
                  {days.map((item) => (
                    <option key={item} value={item}>
                      {String(item).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select className="lumina-input" value={month} onChange={(event) => setMonth(event.target.value)} required>
                  <option value="">{t.month}</option>
                  {months.map((item) => (
                    <option key={item} value={item}>
                      {String(item).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select className="lumina-input" value={year} onChange={(event) => setYear(event.target.value)} required>
                  <option value="">{t.year}</option>
                  {years.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="lumina-label mb-2">{t.timeOfBirth}</p>
              <div className="grid grid-cols-2 gap-2">
                <select className="lumina-input" value={hour} onChange={(event) => setHour(event.target.value)} required={timeAccuracy !== 'unknown'} disabled={timeAccuracy === 'unknown'}>
                  <option value="">{t.hour}</option>
                  {hours.map((item) => (
                    <option key={item} value={item}>
                      {String(item).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select className="lumina-input" value={minute} onChange={(event) => setMinute(event.target.value)} required={timeAccuracy !== 'unknown'} disabled={timeAccuracy === 'unknown'}>
                  <option value="">{t.minute}</option>
                  {minutes.map((item) => (
                    <option key={item} value={item}>
                      {String(item).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
              {/* Time accuracy */}
              <div className="mt-2 flex gap-1.5">
                {([
                  { value: 'exact' as const, en: 'Exact', ru: 'Точное' },
                  { value: 'approximate' as const, en: '~Approximate', ru: '~Примерное' },
                  { value: 'unknown' as const, en: 'Unknown', ru: 'Не знаю' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimeAccuracy(opt.value)}
                    className={`flex-1 rounded-lg py-1.5 text-[11px] transition ${
                      timeAccuracy === opt.value
                        ? 'bg-purple-400/20 text-purple-300 border border-purple-400/30'
                        : 'bg-white/[0.03] text-cream/40 border border-white/[0.06] hover:text-cream/60'
                    }`}
                  >
                    {language === 'ru' ? opt.ru : opt.en}
                  </button>
                ))}
              </div>
              {timeAccuracy === 'unknown' && (
                <p className="mt-1.5 text-[10px] text-amber-300/60">
                  {language === 'ru'
                    ? '⚠ Без точного времени восходящий знак и дома будут неточными'
                    : '⚠ Without exact time, Rising sign and houses will be inaccurate'}
                </p>
              )}
              {timeAccuracy === 'approximate' && (
                <p className="mt-1.5 text-[10px] text-cream/30">
                  {language === 'ru'
                    ? 'Укажите ближайшее время — Rising может отличаться на 1-2 знака'
                    : 'Enter your closest estimate — Rising may be off by 1-2 signs'}
                </p>
              )}
            </div>
          </div>

          <div className="relative">
            <label htmlFor="birth-location" className="lumina-label">
              {t.birthLocation}
            </label>
            <input
              id="birth-location"
              type="text"
              value={locationQuery}
              onChange={(event) => {
                setLocationQuery(event.target.value);
                setSelectedLocationName('');
                setLatitude(null);
                setLongitude(null);
              }}
              className="lumina-input"
              placeholder={t.searchCityOrPlace}
              autoComplete="off"
              required
            />

            {locationResults.length > 0 ? (
              <div className="absolute z-40 bottom-full mb-1 w-full max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#0f1433]/95 backdrop-blur-md">
                {locationResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    className="block min-h-11 w-full border-b border-white/5 px-3 py-3 text-left text-sm text-warmWhite transition hover:bg-white/10"
                    onClick={() => handleSelectLocation(result)}
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            ) : null}

            {searchingLocation ? <p className="mt-2 text-xs text-cream/60">...</p> : null}
          </div>

          {selectedLocationName && latitude !== null && longitude !== null ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-cream">
              <p className="text-warmWhite">
                {t.selectedLocation}: {selectedLocationName}
              </p>
              <p>
                {t.latitude}: {latitude.toFixed(4)} | {t.longitude}: {longitude.toFixed(4)}
              </p>
              <p>
                {t.timezone}: {timezone}
              </p>
            </div>
          ) : null}

          <button type="submit" disabled={!canSubmit || submitting} className="lumina-button w-full">
            {t.homeDiscoverStars}
          </button>
        </form>
      </section>
    </div>
  );
}
