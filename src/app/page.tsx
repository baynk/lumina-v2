'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile, saveProfile, clearProfile, type UserProfileLocal } from '@/lib/profile';
import { ZodiacImage } from '@/components/icons/ZodiacIcons';
import { calculateDailyCelestialData } from '@/lib/astronomyCalculator';
import { translateMoonPhase } from '@/lib/translations';
import type { BirthData, MoonRitualResponse } from '@/lib/types';

type LocationResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

const STORY_SHOWN_PREFIX = 'lumina_story_shown_';
const JOURNAL_PREFIX = 'lumina_moon_journal_';

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

function phaseMode(phase: string): 'new' | 'waxing' | 'full' | 'waning' {
  const normalized = phase.toLowerCase();
  if (normalized.includes('new')) return 'new';
  if (normalized.includes('full')) return 'full';
  if (normalized.includes('waxing') || normalized.includes('first')) return 'waxing';
  return 'waning';
}

function phaseFallback(phase: string, language: 'en' | 'ru'): MoonRitualResponse {
  const mode = phaseMode(phase);

  if (language === 'ru') {
    if (mode === 'new') {
      return {
        title: 'Ритуал Новолуния',
        summary: 'Время задавать намерение и выбирать новый фокус.',
        prompts: [
          'Какое намерение я выбираю на этот лунный цикл?',
          'Какой маленький шаг сделаю в ближайшие 24 часа?',
          'Какая поддержка поможет мне держать фокус?',
        ],
      };
    }

    if (mode === 'waxing') {
      return {
        title: 'Ритуал Растущей Луны',
        summary: 'Время действовать, укреплять мотивацию и наращивать темп.',
        prompts: [
          'Что уже начинает расти в моей жизни?',
          'Где мне добавить дисциплины на этой неделе?',
          'Как я отмечу даже маленький прогресс?',
        ],
      };
    }

    if (mode === 'full') {
      return {
        title: 'Ритуал Полнолуния',
        summary: 'Время увидеть результат, отпраздновать и отпустить лишнее.',
        prompts: [
          'Чем я горжусь в этом цикле?',
          'Что я готов(а) отпустить уже сейчас?',
          'Какое чувство хочу забрать с собой дальше?',
        ],
      };
    }

    return {
      title: 'Ритуал Убывающей Луны',
      summary: 'Время для замедления, рефлексии и восстановления энергии.',
      prompts: [
        'Что в моей жизни просит завершения?',
        'Какой урок этого цикла самый важный?',
        'Что поможет мне мягко восстановить ресурс?',
      ],
    };
  }

  if (mode === 'new') {
    return {
      title: 'New Moon Ritual',
      summary: 'Set intention and choose one clear focus for this lunar cycle.',
      prompts: [
        'What intention do I want to plant right now?',
        'What small action can I take in the next 24 hours?',
        'What support helps me stay aligned?',
      ],
    };
  }

  if (mode === 'waxing') {
    return {
      title: 'Waxing Moon Ritual',
      summary: 'Build momentum, take action, and stay consistent with your vision.',
      prompts: [
        'What is already growing in my life?',
        'Where do I need stronger discipline this week?',
        'How will I celebrate small progress?',
      ],
    };
  }

  if (mode === 'full') {
    return {
      title: 'Full Moon Ritual',
      summary: 'Acknowledge what has bloomed, release what feels heavy.',
      prompts: [
        'What result am I ready to celebrate?',
        'What am I willing to release today?',
        'What truth feels clear now?',
      ],
    };
  }

  return {
    title: 'Waning Moon Ritual',
    summary: 'Slow down, reflect, and clear emotional clutter.',
    prompts: [
      'What chapter is ready to close?',
      'What did this cycle teach me?',
      'How can I recover energy with intention?',
    ],
  };
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

  const [existingProfile, setExistingProfile] = useState<UserProfileLocal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');

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
  const [moonRitual, setMoonRitual] = useState<MoonRitualResponse | null>(null);
  const [ritualLoading, setRitualLoading] = useState(false);
  const [journalText, setJournalText] = useState('');
  const [journalSaved, setJournalSaved] = useState(false);

  const todayJournalKey = useMemo(() => `${JOURNAL_PREFIX}${new Date().toISOString().slice(0, 10)}`, []);

  const canSubmit = useMemo(
    () =>
      !!day &&
      !!month &&
      !!year &&
      !!hour &&
      !!minute &&
      selectedLocationName.length > 0 &&
      latitude !== null &&
      longitude !== null,
    [day, hour, latitude, longitude, minute, month, selectedLocationName, year],
  );

  const sunSignForRitual = useMemo(() => {
    if (existingProfile) {
      return getZodiacSign(existingProfile.birthData.month, existingProfile.birthData.day);
    }

    if (month && day) {
      return getZodiacSign(Number.parseInt(month, 10) - 1, Number.parseInt(day, 10));
    }

    return 'Aries';
  }, [day, existingProfile, month]);

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
          // fallback below
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
    const savedJournal = window.localStorage.getItem(todayJournalKey);
    if (savedJournal) setJournalText(savedJournal);
  }, [todayJournalKey]);

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
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
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
    const run = async () => {
      setRitualLoading(true);
      try {
        const response = await fetch('/api/moon-ritual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moonPhase, sunSign: sunSignForRitual, language }),
        });

        if (!response.ok) {
          setMoonRitual(phaseFallback(moonPhase, language));
          return;
        }

        const payload = (await response.json()) as MoonRitualResponse;
        setMoonRitual(payload);
      } catch {
        setMoonRitual(phaseFallback(moonPhase, language));
      } finally {
        setRitualLoading(false);
      }
    };

    run();
  }, [language, moonPhase, sunSignForRitual]);

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
      hour: Number.parseInt(hour, 10),
      minute: Number.parseInt(minute, 10),
      latitude,
      longitude,
      timezone: resolvedTz,
    };

    saveProfile({
      birthData,
      name: name.trim(),
      locationName: selectedLocationName,
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
            birth_time: `${pad(Number(hour))}:${pad(Number(minute))}`,
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
    clearProfile();
    setExistingProfile(null);
    setShowForm(true);
  }, []);

  const saveJournal = () => {
    window.localStorage.setItem(todayJournalKey, journalText);
    setJournalSaved(true);
    window.setTimeout(() => setJournalSaved(false), 1800);
  };

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

    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <section className="w-full max-w-md text-center animate-fadeInUp">
          <p className="mb-2 font-heading text-5xl text-lumina-soft sm:text-6xl">Lumina</p>
          <p className="mb-8 text-sm text-cream/60">{todayFormatted}</p>

          <div className="glass-card mb-6 p-8">
            <p className="mb-1 text-lg text-lumina-soft">
              {t.welcomeBack}
              {existingProfile.name ? ',' : ''}
            </p>
            {existingProfile.name ? <p className="mb-6 font-heading text-2xl text-warmWhite">{existingProfile.name}</p> : null}

            <div className="mb-6 flex justify-center">
              <ZodiacImage sign={sunSign} size={120} className="opacity-90" />
            </div>

            <button type="button" onClick={() => router.push('/chart')} className="lumina-button mb-3 w-full">
              {t.viewTodaysReading} ✨
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => router.push('/synastry')}
                className="min-h-11 rounded-full border border-white/15 px-3 text-xs text-cream transition hover:text-warmWhite"
              >
                {t.synastryTitle}
              </button>
              <button
                type="button"
                onClick={() => router.push('/transits')}
                className="min-h-11 rounded-full border border-white/15 px-3 text-xs text-cream transition hover:text-warmWhite"
              >
                {t.transitsTitle}
              </button>
            </div>
          </div>

          <section className="glass-card mb-4 p-5 text-left">
            <p className="lumina-label">{t.moonPhase}</p>
            <p className="mt-2 text-lg text-lumina-soft">
              {translateMoonPhase(moonPhase, language)} · {moonIllumination}%
            </p>
            {ritualLoading ? (
              <div className="mt-4 space-y-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-11/12" />
                <div className="skeleton h-4 w-9/12" />
              </div>
            ) : (
              <>
                <p className="mt-3 text-sm text-cream/85">{moonRitual?.summary}</p>
                <ul className="mt-3 space-y-1 text-sm text-warmWhite">
                  {(moonRitual?.prompts || []).slice(0, 3).map((prompt, idx) => (
                    <li key={`${prompt}-${idx}`}>• {prompt}</li>
                  ))}
                </ul>
              </>
            )}
            <textarea
              value={journalText}
              onChange={(event) => setJournalText(event.target.value)}
              className="lumina-input mt-4 min-h-24"
              placeholder={t.moonJournalPlaceholder}
            />
            <button type="button" onClick={saveJournal} className="mt-3 min-h-11 rounded-full border border-white/20 px-4 text-sm text-cream hover:text-warmWhite">
              {journalSaved ? t.moonJournalSaved : t.moonJournalSave}
            </button>
          </section>

          <button type="button" onClick={handleStartFresh} className="text-sm text-cream/50 transition hover:text-cream">
            {t.notYouStartFresh}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <section className="w-full max-w-xl animate-fadeInUp">
        <header className="mb-8 text-center">
          <p className="font-heading text-5xl text-lumina-soft sm:text-6xl">Lumina</p>
          <p className="mt-3 text-base text-cream">{t.tagline}</p>
          <p className="mt-1.5 text-sm text-cream/50">{language === 'ru' ? 'Твой персональный гид по звёздам' : 'Your personal guide to the stars'}</p>
        </header>

        <section className="glass-card mb-5 p-5 sm:p-6">
          <p className="lumina-label">{t.moonRitualTitle}</p>
          <p className="mt-2 text-lg text-lumina-soft">
            {translateMoonPhase(moonPhase, language)} · {moonIllumination}%
          </p>
          {ritualLoading ? (
            <div className="mt-4 space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-9/12" />
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-cream/85">{moonRitual?.summary}</p>
              <ul className="mt-2 space-y-1 text-sm text-warmWhite">
                {(moonRitual?.prompts || []).slice(0, 3).map((prompt, idx) => (
                  <li key={`${prompt}-${idx}`}>• {prompt}</li>
                ))}
              </ul>
            </>
          )}
          <textarea
            value={journalText}
            onChange={(event) => setJournalText(event.target.value)}
            className="lumina-input mt-4 min-h-24"
            placeholder={t.moonJournalPlaceholder}
          />
          <button type="button" onClick={saveJournal} className="mt-3 min-h-11 rounded-full border border-white/20 px-4 text-sm text-cream hover:text-warmWhite">
            {journalSaved ? t.moonJournalSaved : t.moonJournalSave}
          </button>
        </section>

        <form onSubmit={handleSubmit} className="glass-card space-y-6 p-6 sm:p-8">
          <div>
            <label htmlFor="name" className="lumina-label">
              {t.name} ({t.optional})
            </label>
            <input id="name" type="text" value={name} onChange={(event) => setName(event.target.value)} className="lumina-input" placeholder={t.name} autoComplete="name" />
          </div>

          <div>
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

          <div>
            <p className="lumina-label mb-2">{t.timeOfBirth}</p>
            <div className="grid grid-cols-2 gap-2">
              <select className="lumina-input" value={hour} onChange={(event) => setHour(event.target.value)} required>
                <option value="">{t.hour}</option>
                {hours.map((item) => (
                  <option key={item} value={item}>
                    {String(item).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <select className="lumina-input" value={minute} onChange={(event) => setMinute(event.target.value)} required>
                <option value="">{t.minute}</option>
                {minutes.map((item) => (
                  <option key={item} value={item}>
                    {String(item).padStart(2, '0')}
                  </option>
                ))}
              </select>
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
              <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0f1433]/95 backdrop-blur-md">
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

            {searchingLocation ? <p className="mt-2 text-xs text-cream">...</p> : null}
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
            {t.discoverYourChart}
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={() => router.push('/chart')} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-cream hover:text-warmWhite">
            {t.yourCelestialBlueprint}
          </button>
          <button type="button" onClick={() => router.push('/synastry')} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-cream hover:text-warmWhite">
            {t.synastryTitle}
          </button>
          <button type="button" onClick={() => router.push('/transits')} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-cream hover:text-warmWhite">
            {t.transitsTitle}
          </button>
          <button type="button" onClick={() => router.push('/consultation')} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-cream hover:text-warmWhite">
            {t.consultationTitle}
          </button>
        </div>
      </section>
    </div>
  );
}
