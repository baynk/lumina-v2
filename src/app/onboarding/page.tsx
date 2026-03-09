'use client';

import { startTransition, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Calendar, Check, Compass, Heart, Moon, Orbit, Search, Sparkles, Sun, Waves } from 'lucide-react';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import ScrollWheelPicker from '@/components/ui/ScrollWheelPicker';
import { useLanguage } from '@/context/LanguageContext';
import { calculateNatalChart } from '@/lib/astronomyCalculator';
import { loadProfile, saveProfile } from '@/lib/profile';
import { translateSign } from '@/lib/translations';
import type { BirthData } from '@/lib/types';

type PlaceResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

type TimeAccuracy = 'exact' | 'approximate' | 'unknown';
type Gender = 'she' | 'he' | 'neutral' | null;

type SelectedPlace = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

const SIGN_DESCRIPTIONS: Record<string, { en: string; ru: string }> = {
  Aries: { en: 'Bold, energetic, pioneering', ru: 'Смелый, энергичный, первопроходец' },
  Taurus: { en: 'Grounded, sensual, reliable', ru: 'Надёжный, чувственный, стабильный' },
  Gemini: { en: 'Curious, versatile, expressive', ru: 'Любознательный, разносторонний, общительный' },
  Cancer: { en: 'Intuitive, nurturing, protective', ru: 'Чуткий, заботливый, защищающий' },
  Leo: { en: 'Radiant, confident, magnetic', ru: 'Яркий, уверенный, притягательный' },
  Virgo: { en: 'Precise, thoughtful, devoted', ru: 'Точный, вдумчивый, преданный' },
  Libra: { en: 'Harmonious, fair, elegant', ru: 'Гармоничный, справедливый, элегантный' },
  Scorpio: { en: 'Intense, perceptive, powerful', ru: 'Страстный, проницательный, сильный' },
  Sagittarius: { en: 'Adventurous, optimistic, free', ru: 'Дерзкий, оптимистичный, свободный' },
  Capricorn: { en: 'Ambitious, disciplined, wise', ru: 'Целеустремлённый, дисциплинированный, мудрый' },
  Aquarius: { en: 'Original, independent, visionary', ru: 'Самобытный, независимый, дальновидный' },
  Pisces: { en: 'Intuitive, empathetic, dreamy', ru: 'Интуитивный, чуткий, мечтательный' },
};

const TOTAL_STEPS = 12;
const YEARS = Array.from({ length: 86 }, (_, index) => new Date().getFullYear() - index);
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
  return `lumina-btn-primary inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-sm font-medium tracking-[0.18em] transition ${
    disabled ? 'opacity-40' : 'opacity-100'
  }`;
}

function cardClasses(active = false) {
  return `glass-card w-full text-left transition-all duration-300 ${
    active ? 'border-white/[0.12] bg-white/[0.03]' : ''
  }`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { language, t } = useLanguage();

  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<Gender>(null);
  const [goals, setGoals] = useState<Set<string>>(new Set());
  const [selectedEnergy, setSelectedEnergy] = useState<string | null>(null);
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
  const [analysisProgress, setAnalysisProgress] = useState<number[]>([]);
  const [factIndex, setFactIndex] = useState(0);
  const [factVisible, setFactVisible] = useState(true);
  const [bigThreeSigns, setBigThreeSigns] = useState<{ sun: string; moon: string; rising: string } | null>(null);
  const [bigThreeVisible, setBigThreeVisible] = useState([false, false, false]);

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
  const analyzingFacts = useMemo(
    () => [t.onboardingAnalyzingFact1, t.onboardingAnalyzingFact2, t.onboardingAnalyzingFact3],
    [t.onboardingAnalyzingFact1, t.onboardingAnalyzingFact2, t.onboardingAnalyzingFact3]
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
    if (step !== 10 || query.length < 2 || selectedPlace?.name === query) {
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
    if (step !== 11) return;

    setAnalysisProgress(new Array(analyzingItems.length).fill(0));
    setFactIndex(0);
    setFactVisible(true);

    const timeouts: number[] = [];
    const intervals: number[] = [];

    analyzingItems.forEach((_, itemIndex) => {
      const startDelay = itemIndex * 1000;
      timeouts.push(
        window.setTimeout(() => {
          let current = 0;
          const interval = window.setInterval(() => {
            current += 5;
            setAnalysisProgress((prev) => {
              const next = [...prev];
              next[itemIndex] = Math.min(100, current);
              return next;
            });
            if (current >= 100) {
              window.clearInterval(interval);
            }
          }, 45);
          intervals.push(interval);
        }, startDelay)
      );
    });

    const factInterval = window.setInterval(() => {
      setFactVisible(false);
      const switchTimeout = window.setTimeout(() => {
        setFactIndex((current) => (current + 1) % analyzingFacts.length);
        setFactVisible(true);
      }, 220);
      timeouts.push(switchTimeout);
    }, 2000);

    const finishTimer = window.setTimeout(() => {
      setStep(12);
    }, analyzingItems.length * 1000 + 1600);

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
      intervals.forEach((interval) => window.clearInterval(interval));
      window.clearInterval(factInterval);
      window.clearTimeout(finishTimer);
    };
  }, [analyzingFacts.length, analyzingItems, step]);

  useEffect(() => {
    if (step !== 12 || !selectedPlace) return;

    const year = YEARS[yearIndex] ?? 2000;
    const day = dayIndex + 1;
    if (!isValidBirthDate(year, monthIndex, day)) return;

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

    const natalChart = calculateNatalChart(birthData);
    const moonPlanet = natalChart.planets.find((planet) => planet.planet === 'Moon');

    setBigThreeSigns({
      sun: natalChart.zodiacSign,
      moon: moonPlanet?.sign ?? natalChart.zodiacSign,
      rising: natalChart.risingSign,
    });
    setBigThreeVisible([false, false, false]);

    const timers = [0, 1, 2].map((index) =>
      window.setTimeout(() => {
        setBigThreeVisible((current) => {
          const next = [...current];
          next[index] = true;
          return next;
        });
      }, 200 + index * 300)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dayIndex, hourIndex, minuteIndex, monthIndex, selectedPlace, step, timeAccuracy, yearIndex]);

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

  const featureCards = [
    { icon: Moon, label: t.onboardingFeatureCardForecast },
    { icon: Sun, label: t.onboardingFeatureCardChart },
    { icon: Calendar, label: t.onboardingFeatureCardMoon },
    { icon: Heart, label: t.onboardingFeatureCardCompat },
  ];
  const goalCards = [
    { key: 'path', icon: Compass, title: t.onboardingGoalPath, description: t.onboardingGoalPathDesc },
    { key: 'relationships', icon: Heart, title: t.onboardingGoalRelationships, description: t.onboardingGoalRelationshipsDesc },
    { key: 'rhythms', icon: Moon, title: t.onboardingGoalRhythms, description: t.onboardingGoalRhythmsDesc },
    { key: 'future', icon: Sparkles, title: t.onboardingGoalFuture, description: t.onboardingGoalFutureDesc },
  ];
  const energyOptions = [
    { key: 'overthinking', icon: Orbit, label: t.onboardingEnergyOverthinking },
    { key: 'mood-swings', icon: Waves, label: t.onboardingEnergyMoodSwings },
    { key: 'focus', icon: Compass, label: t.onboardingEnergyFocus },
    { key: 'motivation', icon: Sparkles, label: t.onboardingEnergyMotivation },
  ];
  const featureScreens = [
    {
      title: t.onboardingFeatureForecastTitle,
      subtitle: t.onboardingFeatureForecastSubtitle,
      cta: t.onboardingFeatureForecastCta,
      preview: (
        <div className="glass-card w-full max-w-[200px] p-5 text-left text-[#FDFBF7] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <Moon className="text-[#C8A4A4]" size={28} strokeWidth={1.5} />
          <p className="mt-4 font-heading text-[28px] leading-none">
            {language === 'ru' ? 'Луна в Рыбах' : 'Moon in Pisces'}
          </p>
          <p className="mt-4 text-xs leading-5 text-[#8D8B9F]">
            {language === 'ru'
              ? 'Вечер зовет выбирать мягко и слышать то, что шепчет сердце.'
              : 'The evening asks for softer choices and attention to what the heart is quietly saying.'}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#8D8B9F]">
            {language === 'ru'
              ? 'Интуиция ясна, когда ты не торопишься назвать ее вслух.'
              : 'Intuition gets clearer when you do not rush to explain it out loud.'}
          </p>
        </div>
      ),
    },
    {
      title: t.onboardingFeatureChartTitle,
      subtitle: t.onboardingFeatureChartSubtitle,
      cta: t.onboardingFeatureChartCta,
      preview: (
        <div className="relative flex h-[190px] w-[190px] items-center justify-center">
          <svg viewBox="0 0 190 190" className="h-full w-full">
            <circle cx="95" cy="95" r="78" stroke="rgba(192,189,214,0.2)" strokeWidth="2" fill="none" />
            <circle cx="95" cy="95" r="52" stroke="rgba(192,189,214,0.14)" strokeWidth="2" fill="none" />
            <line x1="95" y1="17" x2="95" y2="173" stroke="rgba(192,189,214,0.14)" strokeWidth="1.5" />
            <line x1="17" y1="95" x2="173" y2="95" stroke="rgba(192,189,214,0.14)" strokeWidth="1.5" />
            <line x1="40" y1="40" x2="150" y2="150" stroke="rgba(192,189,214,0.14)" strokeWidth="1.5" />
            <line x1="150" y1="40" x2="40" y2="150" stroke="rgba(192,189,214,0.14)" strokeWidth="1.5" />
            {[
              [95, 28],
              [137, 52],
              [152, 102],
              [120, 142],
              [65, 150],
              [36, 88],
            ].map(([cx, cy], index) => (
              <circle key={`${cx}-${cy}-${index}`} cx={cx} cy={cy} r="5" fill="#C8A4A4" />
            ))}
          </svg>
        </div>
      ),
    },
    {
      title: t.onboardingFeatureCompatTitle,
      subtitle: t.onboardingFeatureCompatSubtitle,
      cta: t.onboardingFeatureCompatCta,
      preview: (
        <div className="flex items-center justify-center gap-5 text-[#FDFBF7]">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/[0.08] bg-[#141121] text-4xl">
              ♌
          </div>
          <Heart className="text-[#C8A4A4]" size={28} strokeWidth={1.5} />
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/[0.08] bg-[#141121] text-4xl">
            ♒
          </div>
        </div>
      ),
    },
  ];
  const birthDateTitle =
    gender === 'she'
      ? t.onboardingBirthDateTitleFemale
      : gender === 'he'
        ? t.onboardingBirthDateTitleMale
        : t.onboardingBirthDateTitleNeutral;
  const birthPlaceTitle =
    gender === 'she'
      ? t.onboardingBirthPlaceTitleFemale
      : gender === 'he'
        ? t.onboardingBirthPlaceTitleMale
        : t.onboardingBirthPlaceTitleNeutral;
  const bigThreeCards = bigThreeSigns
    ? [
        { label: t.onboardingBigThreeSun, sign: bigThreeSigns.sun },
        { label: t.onboardingBigThreeMoon, sign: bigThreeSigns.moon },
        { label: t.onboardingBigThreeRising, sign: bigThreeSigns.rising },
      ]
    : [];

  return (
    <div className="lumina-screen lumina-orb-shell" data-lang={language}>
      <div className="aura aura-violet left-1/2 top-10 h-[380px] w-[380px] -translate-x-[62%]" />
      <div className="aura aura-indigo left-1/2 top-[24rem] h-[360px] w-[360px] -translate-x-[8%] [animation-delay:-5s]" />
      <div className="aura aura-blue left-1/2 bottom-12 h-[400px] w-[400px] -translate-x-[74%] [animation-delay:-2s]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-0">
        <OnboardingHeader
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          onBack={step > 1 ? handleBack : undefined}
          showLanguageToggle={step === 1}
        />

        <div className="flex flex-1 flex-col px-6 pb-8">
          {step === 1 ? (
            <section className="animate-fadeInUp flex flex-1 flex-col items-center justify-center text-center">
              <p className="font-body text-[11px] font-medium uppercase tracking-[2px] text-[#C8A4A4]">
                {language === 'ru' ? 'Ваш путь начинается' : 'Your path begins'}
              </p>
              <h1 className="mt-5 font-heading text-[48px] leading-[0.95] text-[#FDFBF7]">
                {t.onboardingWelcomeTitle}
              </h1>
              <p className="mt-4 max-w-[300px] text-sm leading-6 text-[#8D8B9F]">{t.onboardingWelcomeSubtitle}</p>
              <div className="mt-8 grid w-full grid-cols-2 gap-3">
                {featureCards.map((card) => (
                  <div key={card.label} className="glass-card rounded-[28px] p-4 text-left">
                    <card.icon className="text-[#8D8B9F]" size={20} strokeWidth={1.5} />
                    <p className="mt-4 text-sm leading-5 text-[#FDFBF7]">{card.label}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={nextStep}
                className={`${ctaClasses()} mt-10`}
              >
                {t.onboardingBeginJourney}
              </button>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="animate-fadeInUp flex flex-1 flex-col pt-4">
              <p className="lumina-label">{language === 'ru' ? 'Тон вашего пространства' : 'Tone of your space'}</p>
              <h2 className="mt-3 font-heading text-[38px] leading-none text-[#FDFBF7]">
                {t.onboardingGenderTitle}
              </h2>
              <div className="mt-10 flex flex-col gap-3">
                {([
                  { value: 'she', label: t.onboardingGenderShe },
                  { value: 'he', label: t.onboardingGenderHe },
                  { value: 'neutral', label: t.onboardingGenderNeutral },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setGender(option.value);
                      startTransition(() => setStep(3));
                    }}
                    className={`${cardClasses()} min-h-14 rounded-full px-5 py-4 text-base text-[#8D8B9F] hover:text-[#FDFBF7]`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="animate-fadeInUp flex flex-1 flex-col pt-4">
              <p className="lumina-label">{language === 'ru' ? 'Настрой намерение' : 'Set the intention'}</p>
              <h2 className="mt-3 max-w-[280px] font-heading text-[38px] leading-none text-[#FDFBF7]">
                {t.onboardingGoalsTitle}
              </h2>
              <div className="mt-8 space-y-3">
                {goalCards.map((goal) => {
                  const active = goals.has(goal.key);
                  return (
                    <button
                      key={goal.key}
                      type="button"
                      onClick={() =>
                        setGoals((current) => {
                          const next = new Set(current);
                          if (next.has(goal.key)) {
                            next.delete(goal.key);
                          } else {
                            next.add(goal.key);
                          }
                          return next;
                        })
                      }
                      className={`${cardClasses(active)} flex items-start gap-4 rounded-[28px] p-4`}
                      style={{
                        borderColor: active ? 'rgba(200,164,164,0.6)' : 'rgba(253,251,247,0.04)',
                        backgroundColor: active ? 'rgba(200,164,164,0.18)' : undefined,
                        boxShadow: active ? '0 0 20px rgba(200,164,164,0.15)' : 'none',
                      }}
                    >
                      <div className="mt-0.5 flex shrink-0 items-start gap-3">
                        <goal.icon className={active ? 'text-[#FDFBF7]' : 'text-[#8D8B9F]'} size={18} strokeWidth={1.5} />
                        <span
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border transition ${
                            active ? 'border-[#C8A4A4] bg-[#C8A4A4] text-[#FDFBF7]' : 'border-white/[0.12] bg-transparent text-transparent'
                          }`}
                          aria-hidden="true"
                        >
                          <Check size={12} strokeWidth={2.4} />
                        </span>
                      </div>
                      <span className="block">
                        <span className="block text-sm text-[#FDFBF7]">{goal.title}</span>
                        <span className="mt-1 block text-sm leading-5 text-[#8D8B9F]">{goal.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto pt-8">
                <button type="button" onClick={nextStep} className={ctaClasses()}>
                  {t.onboardingContinue}
                </button>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="animate-fadeInUp flex flex-1 flex-col pt-4">
              <p className="lumina-label">{language === 'ru' ? 'Прислушайтесь к себе' : 'Listen inward'}</p>
              <h2 className="mt-3 max-w-[280px] font-heading text-[38px] leading-none text-[#FDFBF7]">
                {t.onboardingEnergyTitle}
              </h2>
              <div className="mt-10 flex flex-col gap-3">
                {energyOptions.map((option) => {
                  const active = selectedEnergy === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setSelectedEnergy(option.key);
                        startTransition(() => setStep(5));
                      }}
                      className={`${cardClasses(active)} flex min-h-14 items-center gap-3 rounded-full px-5 text-left text-base`}
                      style={{
                        borderColor: active ? 'rgba(200,164,164,0.6)' : 'rgba(253,251,247,0.04)',
                        backgroundColor: active ? 'rgba(200,164,164,0.18)' : undefined,
                        boxShadow: active ? '0 0 20px rgba(200,164,164,0.15)' : 'none',
                        color: active ? '#FDFBF7' : '#8D8B9F',
                      }}
                    >
                      <option.icon
                        className={active ? 'text-[#FDFBF7]' : 'text-[#8D8B9F]'}
                        size={18}
                        strokeWidth={1.5}
                      />
                      <span>{option.label}</span>
                      <span
                        className={`ml-auto flex h-5 w-5 items-center justify-center rounded-full border transition ${
                          active ? 'border-[#C8A4A4] bg-[#C8A4A4] text-[#FDFBF7]' : 'border-white/[0.12] bg-transparent text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        <Check size={12} strokeWidth={2.4} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {[5, 6, 7].includes(step) ? (
            <section className="animate-fadeInUp flex flex-1 flex-col items-center justify-center text-center">
              <p className="lumina-label">{language === 'ru' ? 'Что раскрывается дальше' : 'What unfolds next'}</p>
              <h2 className="mt-3 font-heading text-[36px] leading-none text-[#FDFBF7]">
                {featureScreens[step - 5]?.title}
              </h2>
              <p className="mt-3 max-w-[300px] text-sm leading-6 text-[#8D8B9F]">{featureScreens[step - 5]?.subtitle}</p>
              <div className="glass-card mx-auto mb-8 mt-8 flex h-[340px] w-[240px] items-center justify-center rounded-[32px]">
                {featureScreens[step - 5]?.preview}
              </div>
              <button type="button" onClick={nextStep} className={ctaClasses()}>
                {featureScreens[step - 5]?.cta}
              </button>
            </section>
          ) : null}

          {step === 8 ? (
            <section className="animate-fadeInUp flex flex-1 flex-col">
              <div className="pt-4">
                <p className="lumina-label">{language === 'ru' ? 'Шаг 8 · Дата рождения' : 'Step 8 · Birth date'}</p>
                <h2 className="mt-3 font-heading text-[38px] leading-none text-[#FDFBF7]">{birthDateTitle}</h2>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-3">
                <ScrollWheelPicker items={monthNames} selectedIndex={monthIndex} onChange={setMonthIndex} ariaLabel={t.month} circular />
                <ScrollWheelPicker items={DAYS} selectedIndex={dayIndex} onChange={setDayIndex} ariaLabel={t.day} />
                <ScrollWheelPicker items={YEARS.map(String)} selectedIndex={yearIndex} onChange={setYearIndex} ariaLabel={t.year} />
              </div>
              <div className="glass-card mt-8 rounded-[28px] p-4">
                <p className="lumina-label">{t.onboardingWhy}</p>
                <p className="mt-3 text-sm leading-6 text-[#8D8B9F]">{t.onboardingBirthDateWhyAnswer}</p>
              </div>
              {errorMessage ? <p className="mt-4 text-sm text-[#C8A4A4]">{errorMessage}</p> : null}
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
                >
                  {t.onboardingContinue}
                </button>
              </div>
            </section>
          ) : null}

          {step === 9 ? (
            <section className="animate-fadeInUp flex flex-1 flex-col">
              <div className="pt-4">
                <p className="lumina-label">{language === 'ru' ? 'Шаг 9 · Время рождения' : 'Step 9 · Birth time'}</p>
                <h2 className="mt-3 font-heading text-[38px] leading-none text-[#FDFBF7]">
                  {t.onboardingBirthTimeTitleShort}
                </h2>
              </div>
              <div
                className={`mt-10 grid grid-cols-2 gap-3 transition-opacity ${
                  timeAccuracy === 'unknown' ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <ScrollWheelPicker items={HOURS} selectedIndex={hourIndex} onChange={setHourIndex} ariaLabel={t.hour} circular />
                <ScrollWheelPicker items={MINUTES} selectedIndex={minuteIndex} onChange={setMinuteIndex} ariaLabel={t.minute} circular />
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
                      className="glass-card min-h-11 rounded-full px-3 text-xs transition"
                      style={{
                        borderColor: active ? 'rgba(200,164,164,0.32)' : 'rgba(253,251,247,0.04)',
                        backgroundColor: active ? 'rgba(200,164,164,0.1)' : undefined,
                        color: active ? '#FDFBF7' : '#8D8B9F',
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-sm leading-6 text-[#8D8B9F]">{t.onboardingBirthTimeReassurance}</p>
              <div className="mt-auto pt-8">
                <button type="button" onClick={nextStep} className={ctaClasses()}>
                  {t.onboardingContinue}
                </button>
              </div>
            </section>
          ) : null}

          {step === 10 ? (
            <section className="animate-fadeInUp flex flex-1 flex-col">
              <div className="pt-4">
                <p className="lumina-label">{language === 'ru' ? 'Шаг 10 · Место рождения' : 'Step 10 · Birth place'}</p>
                <h2 className="mt-3 font-heading text-[38px] leading-none text-[#FDFBF7]">{birthPlaceTitle}</h2>
              </div>
              <div className="relative mt-10">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8D8B9F]" size={18} />
                <input
                  value={placeQuery}
                  onChange={(event) => {
                    setPlaceQuery(event.target.value);
                    setSelectedPlace(null);
                  }}
                  placeholder={t.onboardingPlacePlaceholder}
                  className="lumina-input h-14 rounded-[24px] pl-12 pr-4"
                />
              </div>

              {searchingPlaces ? <p className="mt-3 text-sm text-[#8D8B9F]">{language === 'ru' ? 'Ищем место, где началась ваша история...' : 'Searching for the place where your story began...'}</p> : null}

              {placeResults.length ? (
                <div className="glass-card mt-3 overflow-hidden rounded-[28px]">
                  {placeResults.map((result) => (
                    <button
                      key={result.place_id}
                      type="button"
                      onClick={() => handleSelectPlace(result)}
                      className="block w-full border-b border-white/[0.06] px-4 py-3 text-left text-sm text-[#FDFBF7] last:border-b-0"
                    >
                      {result.display_name}
                    </button>
                  ))}
                </div>
              ) : null}

              {selectedPlace ? (
                <div className="glass-card mt-4 rounded-[28px] p-4">
                  <p className="lumina-label">{language === 'ru' ? 'Выбрано' : 'Selected'}</p>
                  <p className="mt-2 text-sm leading-6 text-[#FDFBF7]">{selectedPlace.name}</p>
                </div>
              ) : null}

              {errorMessage ? <p className="mt-4 text-sm text-[#C8A4A4]">{errorMessage}</p> : null}

              <div className="mt-auto pt-8">
                <button
                  type="button"
                  disabled={!selectedPlace || submitting}
                  onClick={persistProfile}
                  className={ctaClasses(!selectedPlace || submitting)}
                >
                  {t.onboardingContinue}
                </button>
              </div>
            </section>
          ) : null}

          {step === 11 ? (
            <section className="animate-fadeInUp flex flex-1 flex-col justify-center">
              <div className="glass-card rounded-[28px] p-5">
                <p className="lumina-label">{language === 'ru' ? 'Идет настройка карты' : 'Calibrating your chart'}</p>
                <h2 className="mt-3 font-heading text-[38px] leading-none text-[#FDFBF7]">{t.onboardingAnalyzingTitle}</h2>
                <p className="mt-3 text-sm leading-6 text-[#8D8B9F]">{t.onboardingAnalyzingSubtitle}</p>
                <div className="mt-8 space-y-5">
                  {analyzingItems.map((item, index) => (
                    <div key={item}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#FDFBF7]">{item}</span>
                        <span className="text-[#C8A4A4]">{analysisProgress[index] ?? 0}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#23202E]">
                        <div
                          className="h-full rounded-full transition-[width] duration-200"
                          style={{
                            width: `${analysisProgress[index] ?? 0}%`,
                            backgroundImage: 'linear-gradient(135deg, rgba(200,164,164,0.95), rgba(192,189,214,0.92))',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card mt-6 rounded-[28px] px-5 py-4">
                <p
                  className={`text-sm leading-6 text-[#B7AEB4] transition-opacity duration-300 ${
                    factVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {analyzingFacts[factIndex]}
                </p>
              </div>
            </section>
          ) : null}

          {step === 12 ? (
            <section className="animate-fadeInUp flex flex-1 flex-col justify-center">
              <div className="text-center">
                <p className="lumina-label">{language === 'ru' ? 'Ваши три светила' : 'Your three lights'}</p>
                <h2 className="mt-3 font-heading text-[36px] leading-none text-[#FDFBF7]">
                  {t.onboardingBigThreeTitle}
                </h2>
              </div>
              <div className="mt-8 space-y-4">
                {bigThreeCards.map((card, index) => {
                  const description = SIGN_DESCRIPTIONS[card.sign]?.[language] ?? '';
                  return (
                    <div
                      key={card.label}
                      className={`glass-card rounded-[28px] p-5 transition-all duration-500 ${
                        bigThreeVisible[index] ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                      }`}
                    >
                      <p className="lumina-label">{card.label}</p>
                      <p className="mt-1 font-heading text-[28px] text-[#FDFBF7]">
                        {translateSign(card.sign, language)}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#8D8B9F]">{description}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8">
                <button type="button" onClick={() => router.push('/')} className={ctaClasses()}>
                  {t.onboardingBigThreeCta}
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
