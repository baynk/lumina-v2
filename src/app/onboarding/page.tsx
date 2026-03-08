'use client';

import { startTransition, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Search } from 'lucide-react';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import AnalyzingSteps from '@/components/onboarding/AnalyzingSteps';
import ScrollWheelPicker from '@/components/ui/ScrollWheelPicker';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile, saveProfile } from '@/lib/profile';
import type { BirthData } from '@/lib/types';

type PlaceResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

type TimeAccuracy = 'exact' | 'approximate' | 'unknown';

type SelectedPlace = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

const TOTAL_STEPS = 5;
const YEARS = Array.from({ length: 86 }, (_, index) => 2025 - index);
const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1));

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function isValidBirthDate(year: number, monthIndex: number, day: number) {
  const candidate = new Date(Date.UTC(year, monthIndex, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === monthIndex &&
    candidate.getUTCDate() === day
  );
}

function ctaClasses(disabled = false) {
  return `inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-sm font-semibold transition ${
    disabled ? 'opacity-40' : 'opacity-100'
  }`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { language, t } = useLanguage();

  const [step, setStep] = useState(1);
  const [monthIndex, setMonthIndex] = useState(0);
  const [dayIndex, setDayIndex] = useState(0);
  const [yearIndex, setYearIndex] = useState(25);
  const [hourIndex, setHourIndex] = useState(12);
  const [minuteIndex, setMinuteIndex] = useState(0);
  const [timeAccuracy, setTimeAccuracy] = useState<TimeAccuracy>('exact');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const monthNames = language === 'ru' ? MONTHS_RU : MONTHS_EN;
  const analyzingItems = useMemo(
    () => [
      t.onboardingAnalyzingPlanets,
      t.onboardingAnalyzingAscendant,
      t.onboardingAnalyzingAspects,
      t.onboardingAnalyzingComplete,
    ],
    [t.onboardingAnalyzingAscendant, t.onboardingAnalyzingAspects, t.onboardingAnalyzingComplete, t.onboardingAnalyzingPlanets]
  );

  useEffect(() => {
    const existingProfile = loadProfile();
    if (existingProfile) {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    const year = YEARS[yearIndex] ?? 2000;
    const maxDay = daysInMonth(year, monthIndex);
    if (dayIndex + 1 > maxDay) {
      setDayIndex(maxDay - 1);
    }
  }, [dayIndex, monthIndex, yearIndex]);

  useEffect(() => {
    if (timeAccuracy !== 'unknown') return;
    setHourIndex(12);
    setMinuteIndex(0);
  }, [timeAccuracy]);

  useEffect(() => {
    const query = placeQuery.trim();
    if (step !== 4 || query.length < 2 || selectedPlace?.name === query) {
      setPlaceResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setSearchingPlaces(true);
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          setPlaceResults([]);
          return;
        }
        const results = (await response.json()) as PlaceResult[];
        setPlaceResults(results);
      } catch {
        setPlaceResults([]);
      } finally {
        setSearchingPlaces(false);
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [placeQuery, selectedPlace?.name, step]);

  useEffect(() => {
    if (step !== 5) return;

    setCompletedCount(0);
    setProgress(0);

    const total = analyzingItems.length;
    const timers = analyzingItems.map((_, index) =>
      window.setTimeout(() => {
        setCompletedCount(index + 1);
        setProgress(Math.round(((index + 1) / total) * 100));
      }, 900 + index * 1200)
    );

    const finishTimer = window.setTimeout(() => {
      router.replace('/chart');
    }, 900 + total * 1200 + 700);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(finishTimer);
    };
  }, [analyzingItems, router, step]);

  const handleBack = () => {
    setErrorMessage('');
    setPlaceResults([]);
    startTransition(() => setStep((current) => Math.max(1, current - 1)));
  };

  const nextStep = () => {
    setErrorMessage('');
    startTransition(() => setStep((current) => Math.min(TOTAL_STEPS, current + 1)));
  };

  const handleSelectPlace = async (result: PlaceResult) => {
    const latitude = Number.parseFloat(result.lat);
    const longitude = Number.parseFloat(result.lon);
    let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    setPlaceQuery(result.display_name);
    setSelectedPlace({
      name: result.display_name,
      latitude,
      longitude,
      timezone,
    });
    setPlaceResults([]);

    try {
      const response = await fetch(`/api/timezone?lat=${latitude}&lon=${longitude}`);
      const payload = (await response.json()) as { timezone?: string };
      if (payload.timezone) {
        timezone = payload.timezone;
        setSelectedPlace({
          name: result.display_name,
          latitude,
          longitude,
          timezone,
        });
      }
    } catch {
      // Keep detected timezone fallback.
    }
  };

  const persistProfile = async () => {
    const year = YEARS[yearIndex] ?? 2000;
    const day = dayIndex + 1;

    if (!selectedPlace) {
      setErrorMessage(language === 'ru' ? 'Выберите город рождения' : 'Select your birth city');
      return;
    }

    if (!isValidBirthDate(year, monthIndex, day)) {
      setErrorMessage(language === 'ru' ? 'Проверь дату рождения' : 'Please check your birth date');
      return;
    }

    const birthData: BirthData = {
      year,
      month: monthIndex,
      day,
      hour: timeAccuracy === 'unknown' ? 12 : hourIndex,
      minute: timeAccuracy === 'unknown' ? 0 : minuteIndex,
      latitude: selectedPlace.latitude,
      longitude: selectedPlace.longitude,
      timezone: selectedPlace.timezone,
    };

    saveProfile({
      birthData,
      name: '',
      locationName: selectedPlace.name,
      timeAccuracy,
      savedAt: Date.now(),
    });

    if (!session?.user) {
      nextStep();
      return;
    }

    setSubmitting(true);
    try {
      const pad = (value: number) => String(value).padStart(2, '0');
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birth_date: `${birthData.year}-${pad(birthData.month + 1)}-${pad(birthData.day)}`,
          birth_time: `${pad(birthData.hour)}:${pad(birthData.minute)}`,
          birth_place: selectedPlace.name,
          birth_latitude: birthData.latitude,
          birth_longitude: birthData.longitude,
          birth_timezone: birthData.timezone,
        }),
      });
    } catch {
      // Local profile remains the fallback.
    } finally {
      setSubmitting(false);
      nextStep();
    }
  };

  const sharedButtonStyle = {
    backgroundImage: 'linear-gradient(135deg, #C8A96E, #E8D5B5)',
    color: '#0E0D14',
  } as const;

  return (
    <div className="lumina-orb-shell min-h-screen bg-[#0E0D14]" data-lang={language}>
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-0">
        <OnboardingHeader
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          onBack={step > 1 ? handleBack : undefined}
          showLanguageToggle={step === 1}
        />

        <div className="flex flex-1 flex-col px-5 pb-8 sm:px-8">
          {step === 1 ? (
            <section className="flex flex-1 flex-col items-center justify-center text-center">
              <span className="font-heading text-xl text-[#C8A96E]">✦</span>
              <h1 className="mt-5 font-heading text-[48px] leading-[0.95] text-[#F0EBE3]">
                {t.onboardingWelcomeTitle}
              </h1>
              <p className="mt-4 text-sm text-[#9A9298]">{t.onboardingWelcomeSubtitle}</p>
              <button
                type="button"
                onClick={nextStep}
                className={`${ctaClasses()} mt-12`}
                style={sharedButtonStyle}
              >
                {t.onboardingBegin}
              </button>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="flex flex-1 flex-col">
              <div className="pt-4">
                <h2 className="font-heading text-[38px] leading-none text-[#F0EBE3]">
                  {language === 'ru' ? 'Дата рождения' : 'Birth date'}
                </h2>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-3">
                <ScrollWheelPicker items={monthNames} selectedIndex={monthIndex} onChange={setMonthIndex} ariaLabel={t.month} />
                <ScrollWheelPicker items={DAYS} selectedIndex={dayIndex} onChange={setDayIndex} ariaLabel={t.day} />
                <ScrollWheelPicker items={YEARS.map(String)} selectedIndex={yearIndex} onChange={setYearIndex} ariaLabel={t.year} />
              </div>
              <div className="mt-8 rounded-2xl bg-[#1A1822] p-4">
                <p className="text-sm font-semibold text-[#F0EBE3]">{t.onboardingWhy}</p>
                <p className="mt-2 text-sm leading-6 text-[#9A9298]">{t.onboardingBirthDateWhy}</p>
              </div>
              {errorMessage ? <p className="mt-4 text-sm text-[#C87B8A]">{errorMessage}</p> : null}
              <div className="mt-auto pt-8">
                <button
                  type="button"
                  onClick={() => {
                    const year = YEARS[yearIndex] ?? 2000;
                    const day = dayIndex + 1;
                    if (!isValidBirthDate(year, monthIndex, day)) {
                      setErrorMessage(language === 'ru' ? 'Проверь дату рождения' : 'Please check your birth date');
                      return;
                    }
                    nextStep();
                  }}
                  className={ctaClasses()}
                  style={sharedButtonStyle}
                >
                  {t.onboardingContinue}
                </button>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="flex flex-1 flex-col">
              <div className="pt-4">
                <h2 className="font-heading text-[38px] leading-none text-[#F0EBE3]">
                  {language === 'ru' ? 'Время рождения' : 'Birth time'}
                </h2>
              </div>
              <div className={`mt-10 grid grid-cols-2 gap-3 transition-opacity ${timeAccuracy === 'unknown' ? 'opacity-40' : 'opacity-100'}`}>
                <ScrollWheelPicker items={HOURS} selectedIndex={hourIndex} onChange={setHourIndex} ariaLabel={t.hour} />
                <ScrollWheelPicker items={MINUTES} selectedIndex={minuteIndex} onChange={setMinuteIndex} ariaLabel={t.minute} />
              </div>
              <div className="mt-8 grid grid-cols-3 gap-2">
                {([
                  { value: 'exact', label: t.onboardingTimeExact },
                  { value: 'approximate', label: t.onboardingTimeApproximate },
                  { value: 'unknown', label: t.onboardingTimeUnknown },
                ] as const).map((option) => {
                  const active = timeAccuracy === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTimeAccuracy(option.value)}
                      className="min-h-11 rounded-full border px-3 text-xs transition"
                      style={{
                        borderColor: active ? 'rgba(200,169,110,0.35)' : 'rgba(240,235,227,0.06)',
                        backgroundColor: active ? 'rgba(200,169,110,0.12)' : '#1A1822',
                        color: active ? '#F0EBE3' : '#9A9298',
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-sm text-[#9A9298]">{t.onboardingTimeReassurance}</p>
              <div className="mt-auto pt-8">
                <button type="button" onClick={nextStep} className={ctaClasses()} style={sharedButtonStyle}>
                  {t.onboardingContinue}
                </button>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="flex flex-1 flex-col">
              <div className="pt-4">
                <h2 className="font-heading text-[38px] leading-none text-[#F0EBE3]">
                  {language === 'ru' ? 'Место рождения' : 'Birth place'}
                </h2>
              </div>
              <div className="relative mt-10">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#756D73]" size={18} />
                <input
                  value={placeQuery}
                  onChange={(event) => {
                    setPlaceQuery(event.target.value);
                    setSelectedPlace(null);
                  }}
                  placeholder={t.onboardingPlacePlaceholder}
                  className="h-14 w-full rounded-2xl border border-white/[0.06] bg-[#1A1822] pl-12 pr-4 text-sm text-[#F0EBE3] outline-none placeholder:text-[#756D73]"
                />
              </div>

              {searchingPlaces ? <p className="mt-3 text-sm text-[#756D73]">{language === 'ru' ? 'Ищем...' : 'Searching...'}</p> : null}

              {placeResults.length ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1A1822]">
                  {placeResults.map((result) => (
                    <button
                      key={result.place_id}
                      type="button"
                      onClick={() => handleSelectPlace(result)}
                      className="block w-full border-b border-white/[0.06] px-4 py-3 text-left text-sm text-[#F0EBE3] last:border-b-0"
                    >
                      {result.display_name}
                    </button>
                  ))}
                </div>
              ) : null}

              {selectedPlace ? (
                <div className="mt-4 rounded-2xl bg-[#1A1822] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#756D73]">{language === 'ru' ? 'Выбрано' : 'Selected'}</p>
                  <p className="mt-2 text-sm leading-6 text-[#F0EBE3]">{selectedPlace.name}</p>
                </div>
              ) : null}

              {errorMessage ? <p className="mt-4 text-sm text-[#C87B8A]">{errorMessage}</p> : null}

              <div className="mt-auto pt-8">
                <button
                  type="button"
                  disabled={!selectedPlace || submitting}
                  onClick={persistProfile}
                  className={ctaClasses(!selectedPlace || submitting)}
                  style={sharedButtonStyle}
                >
                  {t.onboardingContinue}
                </button>
              </div>
            </section>
          ) : null}

          {step === 5 ? (
            <section className="flex flex-1 flex-col justify-center">
              <div className="rounded-[16px] bg-[#1A1822] p-5">
                <h2 className="font-heading text-[38px] leading-none text-[#F0EBE3]">{t.onboardingAnalyzingTitle}</h2>
                <p className="mt-3 text-sm text-[#9A9298]">{t.onboardingAnalyzingSubtitle}</p>
                <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-[#23202E]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      backgroundImage: 'linear-gradient(135deg, #C8A96E, #E8D5B5)',
                    }}
                  />
                </div>
                <p className="mt-3 text-right text-sm text-[#C8A96E]">{progress}%</p>
              </div>

              <div className="mt-6">
                <AnalyzingSteps items={analyzingItems} completedCount={completedCount} />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
