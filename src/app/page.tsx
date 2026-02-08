'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile, saveProfile, clearProfile, type UserProfileLocal } from '@/lib/profile';
import { ZodiacImage } from '@/components/icons/ZodiacIcons';
import type { BirthData } from '@/lib/types';

type LocationResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

// Simple zodiac sign calculation from month/day
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
  // month is 0-indexed from birthData
  const m = month + 1;
  for (const s of signs) {
    if (
      (m === s.start[0] && day >= s.start[1]) ||
      (m === s.end[0] && day <= s.end[1])
    ) {
      return s.sign;
    }
  }
  return 'Aries';
}

const months = Array.from({ length: 12 }, (_, idx) => idx + 1);
const days = Array.from({ length: 31 }, (_, idx) => idx + 1);
const years = Array.from({ length: 100 }, (_, idx) => new Date().getFullYear() - idx);
const hours = Array.from({ length: 24 }, (_, idx) => idx);
const minutes = Array.from({ length: 60 }, (_, idx) => idx);

export default function LandingPage() {
  const router = useRouter();
  const { language, t } = useLanguage();

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

  useEffect(() => {
    const profile = loadProfile();
    if (profile) {
      setExistingProfile(profile);
    }
    setCheckingProfile(false);
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

  const handleSelectLocation = (result: LocationResult) => {
    setSelectedLocationName(result.display_name);
    setLocationQuery(result.display_name);
    setLatitude(Number.parseFloat(result.lat));
    setLongitude(Number.parseFloat(result.lon));
    setLocationResults([]);
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detectedTimezone) setTimezone(detectedTimezone);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || latitude === null || longitude === null) return;

    setSubmitting(true);

    const birthData: BirthData = {
      year: Number.parseInt(year, 10),
      month: Number.parseInt(month, 10) - 1,
      day: Number.parseInt(day, 10),
      hour: Number.parseInt(hour, 10),
      minute: Number.parseInt(minute, 10),
      latitude,
      longitude,
      timezone,
    };

    saveProfile({
      birthData,
      name: name.trim(),
      locationName: selectedLocationName,
      savedAt: Date.now(),
    });

    router.push('/chart');
  };

  const handleStartFresh = useCallback(() => {
    clearProfile();
    setExistingProfile(null);
    setShowForm(true);
  }, []);

  // Format today's date
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

  // Welcome back screen for returning users
  if (existingProfile && !showForm) {
    const sunSign = getZodiacSign(existingProfile.birthData.month, existingProfile.birthData.day);

    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <section className="w-full max-w-md text-center animate-fadeInUp">
          <p className="font-heading text-5xl text-lumina-soft sm:text-6xl mb-2">Lumina</p>
          <p className="text-sm text-cream/60 mb-8">{todayFormatted}</p>

          <div className="glass-card p-8 mb-6">
            <p className="text-lg text-lumina-soft mb-1">{t.welcomeBack}{existingProfile.name ? ',' : ''}</p>
            {existingProfile.name && (
              <p className="font-heading text-2xl text-warmWhite mb-6">{existingProfile.name}</p>
            )}

            <div className="flex justify-center mb-6">
              <ZodiacImage sign={sunSign} size={120} className="opacity-90" />
            </div>

            <button
              type="button"
              onClick={() => router.push('/chart')}
              className="lumina-button w-full mb-4"
            >
              {t.viewTodaysReading} ✨
            </button>
          </div>

          <button
            type="button"
            onClick={handleStartFresh}
            className="text-sm text-cream/50 hover:text-cream transition"
          >
            {t.notYouStartFresh}
          </button>
        </section>
      </div>
    );
  }

  // Birth data entry form (existing + new users)
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
        <LanguageToggle />
      </div>

      <section className="w-full max-w-xl animate-fadeInUp">
        <header className="mb-8 text-center">
          <p className="font-heading text-5xl text-lumina-soft sm:text-6xl">Lumina</p>
          <p className="mt-3 text-base text-cream">{t.tagline}</p>
          <p className="mt-1.5 text-sm text-cream/50">
            {language === 'ru' ? 'Твой персональный гид по звёздам' : 'Your personal guide to the stars'}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="glass-card space-y-6 p-6 sm:p-8">
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
              placeholder={t.name}
              autoComplete="name"
            />
          </div>

          <div>
            <p className="lumina-label mb-2">{t.dateOfBirth}</p>
            <div className="grid grid-cols-3 gap-2">
              <select className="lumina-input" value={day} onChange={(event) => setDay(event.target.value)} required>
                <option value="">{t.day}</option>
                {days.map((item) => (
                  <option key={item} value={item}>{String(item).padStart(2, '0')}</option>
                ))}
              </select>
              <select className="lumina-input" value={month} onChange={(event) => setMonth(event.target.value)} required>
                <option value="">{t.month}</option>
                {months.map((item) => (
                  <option key={item} value={item}>{String(item).padStart(2, '0')}</option>
                ))}
              </select>
              <select className="lumina-input" value={year} onChange={(event) => setYear(event.target.value)} required>
                <option value="">{t.year}</option>
                {years.map((item) => (
                  <option key={item} value={item}>{item}</option>
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
                  <option key={item} value={item}>{String(item).padStart(2, '0')}</option>
                ))}
              </select>
              <select className="lumina-input" value={minute} onChange={(event) => setMinute(event.target.value)} required>
                <option value="">{t.minute}</option>
                {minutes.map((item) => (
                  <option key={item} value={item}>{String(item).padStart(2, '0')}</option>
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

            {locationResults.length > 0 && (
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
            )}

            {searchingLocation && <p className="mt-2 text-xs text-cream">...</p>}
          </div>

          {selectedLocationName && latitude !== null && longitude !== null && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-cream">
              <p className="text-warmWhite">{t.selectedLocation}: {selectedLocationName}</p>
              <p>{t.latitude}: {latitude.toFixed(4)} | {t.longitude}: {longitude.toFixed(4)}</p>
              <p>{t.timezone}: {timezone}</p>
            </div>
          )}

          <button type="submit" disabled={!canSubmit || submitting} className="lumina-button w-full">
            {t.discoverYourChart}
          </button>
        </form>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-lg text-lumina-soft">✦</p>
            <p className="mt-1 text-xs font-semibold text-cream/80">
              {language === 'ru' ? 'Точные расчёты' : 'Precise Calculations'}
            </p>
            <p className="mt-0.5 text-[10px] text-cream/40">astronomy-engine</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-lg text-lumina-soft">✧</p>
            <p className="mt-1 text-xs font-semibold text-cream/80">
              {language === 'ru' ? 'AI-инсайты' : 'AI Insights'}
            </p>
            <p className="mt-0.5 text-[10px] text-cream/40">Gemini</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-lg text-lumina-soft">◇</p>
            <p className="mt-1 text-xs font-semibold text-cream/80">
              {language === 'ru' ? 'Приватность' : 'Your Data Stays Private'}
            </p>
            <p className="mt-0.5 text-[10px] text-cream/40">localStorage</p>
          </div>
        </div>
      </section>
    </div>
  );
}
