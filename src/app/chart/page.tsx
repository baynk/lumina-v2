'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ChevronRight, Sparkles } from 'lucide-react';
import MoonPhaseVisual from '@/components/MoonPhaseVisual';
import ExplainModal from '@/components/ExplainModal';
import BlurGate from '@/components/BlurGate';
import BirthDataForm, { type BirthDataFormResult } from '@/components/BirthDataForm';
import { useLanguage } from '@/context/LanguageContext';
import { calculateDailyCelestialData, calculateNatalChart } from '@/lib/astronomyCalculator';
import {
  translateMoonPhase,
  translatePlanet,
  translateSign,
} from '@/lib/translations';
import { ZodiacImage } from '@/components/icons/ZodiacIcons';
import { getPlanetIcon } from '@/components/icons/PlanetIcons';
import { getHouseTheme, getPlanetWhyItMatters } from '@/lib/education';
import { loadProfile, saveProfile } from '@/lib/profile';
import type { BirthData, DailyCelestialData, NatalChartData } from '@/lib/types';

type StoredBirthPayload = {
  name?: string;
  locationName: string;
  birthData: BirthData;
};

type ExplainState = {
  title: string;
  planet: string;
  sign: string;
  house: number;
};

const STORAGE_KEY = 'lumina_birth_data';

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle - 90) * (Math.PI / 180);
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeRingSegment(cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

function WheelPlaceholder({
  natalChart,
  language,
  activeHouse,
  onHouseFocus,
  onHouseClick,
}: {
  natalChart: NatalChartData;
  language: 'en' | 'ru';
  activeHouse: number;
  onHouseFocus: (house: number) => void;
  onHouseClick: (house: number, sign: string) => void;
}) {
  const size = 320;
  const center = size / 2;
  const outerRadius = 136;
  const innerRadius = 86;

  return (
    <div className="relative mx-auto w-full max-w-[320px] lg:max-w-[420px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full">
        <defs>
          <radialGradient id="wheelGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(253,251,247,0.12)" />
            <stop offset="100%" stopColor="rgba(253,251,247,0.01)" />
          </radialGradient>
        </defs>

        <circle cx={center} cy={center} r={outerRadius + 8} fill="url(#wheelGlow)" />
        <circle cx={center} cy={center} r={outerRadius} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.14)" />
        <circle cx={center} cy={center} r={innerRadius} fill="rgba(11,8,20,0.68)" stroke="rgba(255,255,255,0.08)" />

        {natalChart.houses.map((house, index) => {
          const startAngle = index * 30;
          const endAngle = startAngle + 30;
          const midAngle = startAngle + 15;
          const labelPoint = polarToCartesian(center, center, 111, midAngle);
          const borderPoint = polarToCartesian(center, center, outerRadius, startAngle);
          const isActive = activeHouse === house.house;

          return (
            <g
              key={house.house}
              className="cursor-pointer"
              onMouseEnter={() => onHouseFocus(house.house)}
              onFocus={() => onHouseFocus(house.house)}
              onClick={() => onHouseClick(house.house, house.sign)}
              tabIndex={0}
              role="button"
              aria-label={`${language === 'ru' ? 'Дом' : 'House'} ${house.house}`}
            >
              <path
                d={describeRingSegment(center, center, innerRadius, outerRadius, startAngle, endAngle)}
                fill={isActive ? 'rgba(200,164,164,0.18)' : 'rgba(255,255,255,0.01)'}
                stroke={isActive ? 'rgba(253,251,247,0.2)' : 'rgba(255,255,255,0.04)'}
              />
              <line
                x1={center}
                y1={center}
                x2={borderPoint.x}
                y2={borderPoint.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isActive ? '#FDFBF7' : '#9B99B0'}
                fontSize="11"
                letterSpacing="2"
              >
                {house.house}
              </text>
            </g>
          );
        })}

        <circle cx={center} cy={center} r={54} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
        <text x={center} y={center - 8} textAnchor="middle" fill="#C8A4A4" fontSize="11" letterSpacing="2">
          {language === 'ru' ? 'НАТАЛ' : 'NATAL'}
        </text>
        <text x={center} y={center + 18} textAnchor="middle" fill="#FDFBF7" fontSize="28" fontFamily="var(--font-heading)">
          ✦
        </text>
      </svg>
    </div>
  );
}

const ZodiacSvg = ({ sign, size = 20 }: { sign: string; size?: number }) => {
  return <ZodiacImage sign={sign} size={size} className="inline-block align-middle" />;
};

const PlanetSvg = ({ planet, size = 16 }: { planet: string; size?: number }) => {
  const Icon = getPlanetIcon(planet);
  return Icon ? <Icon size={size} className="inline-block align-middle" /> : null;
};

export default function ChartPage() {
  const router = useRouter();
  const { language, t } = useLanguage();

  const [profile, setProfile] = useState<StoredBirthPayload | null>(null);
  const [natalChart, setNatalChart] = useState<NatalChartData | null>(null);
  const [dailyData, setDailyData] = useState<DailyCelestialData | null>(null);
  const [horoscope, setHoroscope] = useState('');
  const { data: authSession } = useSession();
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingHoroscope, setLoadingHoroscope] = useState(false);
  const [error, setError] = useState('');
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [teaserData, setTeaserData] = useState<{ natal: NatalChartData; daily: DailyCelestialData; name: string } | null>(null);
  const [explainState, setExplainState] = useState<ExplainState | null>(null);
  const [activeHouse, setActiveHouse] = useState(1);

  useEffect(() => {
    const init = async () => {
      try {
        const profileData = loadProfile();
        let birthData: BirthData | null = null;
        let profilePayload: StoredBirthPayload | null = null;

        if (profileData) {
          birthData = profileData.birthData;
          profilePayload = {
            name: profileData.name,
            locationName: profileData.locationName,
            birthData: profileData.birthData,
          };
        } else {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as StoredBirthPayload;
            if (parsed?.birthData) {
              birthData = parsed.birthData;
              profilePayload = parsed;
            }
          }

          if (!birthData) {
            try {
              const res = await fetch('/api/user');
              if (res.ok) {
                const srv = await res.json();
                if (srv.onboarding_completed && srv.birth_date) {
                  const [y, m, d] = srv.birth_date.split('-').map(Number);
                  const [h, min] = (srv.birth_time || '12:00').split(':').map(Number);
                  birthData = {
                    year: y,
                    month: m - 1,
                    day: d,
                    hour: h,
                    minute: min,
                    latitude: srv.birth_latitude,
                    longitude: srv.birth_longitude,
                    timezone: srv.birth_timezone || 'UTC',
                  };
                  profilePayload = { name: srv.name || '', locationName: srv.birth_place || '', birthData };
                  saveProfile({ birthData, name: srv.name || '', locationName: srv.birth_place || '', savedAt: Date.now() });
                }
              }
            } catch {
              // Continue to empty-state handling.
            }
          }

          if (!birthData) {
            setNeedsProfile(true);
            setLoadingChart(false);
            return;
          }
        }

        if (birthData.latitude && birthData.longitude) {
          try {
            const tzResp = await fetch(`/api/timezone?lat=${birthData.latitude}&lon=${birthData.longitude}`);
            const tzData = (await tzResp.json()) as { timezone?: string };
            if (tzData.timezone) {
              birthData = { ...birthData, timezone: tzData.timezone };
              profilePayload = { ...profilePayload!, birthData };
              if (profileData) {
                const { saveProfile: persistProfile } = await import('@/lib/profile');
                persistProfile({ ...profileData, birthData });
              }
            }
          } catch {
            // If the API fails, keep the stored timezone.
          }
        }

        setProfile(profilePayload);
        const natal = calculateNatalChart(birthData);
        const daily = calculateDailyCelestialData();
        setNatalChart(natal);
        setDailyData(daily);
        setActiveHouse(natal.houses[0]?.house || 1);
      } catch {
        setError(t.chartError);
      } finally {
        setLoadingChart(false);
      }
    };

    init();
  }, [router, t.chartError]);

  useEffect(() => {
    if (!natalChart || !dailyData) return;

    const generateHoroscope = async () => {
      setLoadingHoroscope(true);
      try {
        const response = await fetch('/api/horoscope', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ natalChart, dailyData, language }),
        });
        const payload = (await response.json()) as { horoscope?: string };
        setHoroscope(payload.horoscope || t.horoscopeFallback);
      } catch {
        setHoroscope(t.horoscopeFallback);
      } finally {
        setLoadingHoroscope(false);
      }
    };

    generateHoroscope();
  }, [dailyData, language, natalChart, t.horoscopeFallback]);

  useEffect(() => {
    const handler = () => {
      const loaded = loadProfile();
      if (!loaded) router.push('/');
    };
    window.addEventListener('lumina-profile-changed', handler);
    return () => window.removeEventListener('lumina-profile-changed', handler);
  }, [router]);

  const openPlanetExplanation = (planet: string, sign: string, house?: number) => {
    const safeHouse = house && Number.isFinite(house) ? house : 1;
    setExplainState({ title: translatePlanet(planet, language), planet, sign, house: safeHouse });
    setIsExplainOpen(true);
  };

  const openHouseExplanation = (house: number, sign: string) => {
    setExplainState({ title: `${t.houseCusp} ${house}`, planet: `House ${house}`, sign, house });
    setIsExplainOpen(true);
  };

  const todayFormatted = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [language]);

  const moonSign = useMemo(() => natalChart?.planets.find((planet) => planet.planet === 'Moon')?.sign || '', [natalChart]);

  const activeHouseData = useMemo(() => {
    return natalChart?.houses.find((house) => house.house === activeHouse) || natalChart?.houses[0] || null;
  }, [activeHouse, natalChart]);

  const bigThree = useMemo(() => {
    if (!natalChart) return [];

    return [
      {
        key: 'sun',
        label: t.sun,
        planet: 'Sun',
        sign: natalChart.zodiacSign,
        blurb: getPlanetWhyItMatters('Sun', language),
      },
      {
        key: 'moon',
        label: t.moon,
        planet: 'Moon',
        sign: moonSign,
        blurb: getPlanetWhyItMatters('Moon', language),
      },
      {
        key: 'rising',
        label: t.rising,
        planet: 'Ascendant',
        sign: natalChart.risingSign,
        blurb: language === 'ru'
          ? 'Твой первый свет, который видит мир.'
          : 'Your first shimmer, the way the world meets you.',
      },
    ];
  }, [language, moonSign, natalChart, t.moon, t.rising, t.sun]);

  if (loadingChart) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-void)]">
        <div className="celestial-gradient" aria-hidden="true" />
        <div className="star-field" aria-hidden="true" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <p className="font-heading text-3xl text-[#FDFBF7]">Lumina</p>
            <p className="mt-3 text-[#8D8B9F]">{t.loadingChart}</p>
          </div>
        </div>
      </div>
    );
  }

  if (needsProfile && !teaserData) {
    const handleTeaserSubmit = (data: BirthDataFormResult) => {
      saveProfile({
        birthData: data.birthData,
        name: data.name,
        locationName: data.locationName,
        timeAccuracy: data.timeAccuracy,
        savedAt: Date.now(),
      });

      if (authSession?.user) {
        setNeedsProfile(false);
        setLoadingChart(true);
        window.location.reload();
        return;
      }

      const natal = calculateNatalChart(data.birthData);
      const daily = calculateDailyCelestialData();
      setTeaserData({ natal, daily, name: data.name });
    };

    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-void)]">
        <div className="celestial-gradient" aria-hidden="true" />
        <div className="star-field" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-xl px-4 pb-28 pt-8 sm:px-6">
          <header className="animate-fadeInUp text-center">
            <p className="lumina-label">{language === 'ru' ? 'Натальная карта' : 'Natal chart'}</p>
            <h2 className="mt-3 font-heading text-3xl text-[#FDFBF7]">
              {language === 'ru' ? 'Твоя карта уже ждёт' : 'Your chart is already waiting'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#8D8B9F]">
              {language === 'ru'
                ? 'Введите данные рождения, и Lumina раскроет ваш личный небесный ритм.'
                : 'Enter your birth details and Lumina will reveal your personal sky pattern.'}
            </p>
          </header>
          <div className="mt-8">
            <BirthDataForm
              onComplete={handleTeaserSubmit}
              submitLabel={language === 'ru' ? 'Показать мою карту' : 'Show my chart'}
            />
          </div>
        </div>
      </div>
    );
  }

  if (needsProfile && teaserData) {
    const sunPlanet = teaserData.natal.planets.find((planet) => planet.planet === 'Sun');
    const moonPlanet = teaserData.natal.planets.find((planet) => planet.planet === 'Moon');
    const nameLabel = teaserData.name || (language === 'ru' ? 'друг' : 'friend');

    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-void)]">
        <div className="celestial-gradient" aria-hidden="true" />
        <div className="star-field" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-xl px-4 pb-28 pt-8 sm:px-6">
          <header className="animate-fadeInUp text-center">
            {sunPlanet ? <ZodiacImage sign={sunPlanet.sign} size={80} className="mx-auto opacity-90" /> : null}
            <h1 className="mt-4 font-heading text-3xl text-[#FDFBF7]">
              {language === 'ru'
                ? `${nameLabel}, вы — ${translateSign(sunPlanet?.sign || 'Aries', language)}`
                : `${nameLabel}, you are ${translateSign(sunPlanet?.sign || 'Aries', language)}`}
            </h1>
          </header>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {moonPlanet ? (
              <div className="glass-card p-4 text-center">
                <p className="lumina-label">{t.moon}</p>
                <ZodiacImage sign={moonPlanet.sign} size={32} className="mx-auto mt-2 opacity-80" />
                <p className="mt-2 font-heading text-lg text-[#FDFBF7]">{translateSign(moonPlanet.sign, language)}</p>
                <p className="mt-1 text-[11px] text-[#8D8B9F]">
                  {language === 'ru' ? 'Ваши эмоции и интуиция' : 'Your emotions and intuition'}
                </p>
              </div>
            ) : null}
            <div className="glass-card p-4 text-center">
              <p className="lumina-label">{t.rising}</p>
              <ZodiacImage sign={teaserData.natal.risingSign} size={32} className="mx-auto mt-2 opacity-80" />
              <p className="mt-2 font-heading text-lg text-[#FDFBF7]">{translateSign(teaserData.natal.risingSign, language)}</p>
              <p className="mt-1 text-[11px] text-[#8D8B9F]">
                {language === 'ru' ? 'Как вас считывает мир' : 'How the world reads you'}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <BlurGate language={language}>
              <div className="space-y-4">
                <div className="glass-card p-5">
                  <p className="lumina-label mb-3">{t.dailyHoroscope}</p>
                  <p className="text-sm text-[#8D8B9F]">
                    {language === 'ru'
                      ? 'Остальная часть твоего неба уже собирается в историю.'
                      : 'The rest of your sky is already taking shape.'}
                  </p>
                </div>
                <div className="glass-card p-5">
                  <p className="lumina-label mb-3">{t.planetaryPositions}</p>
                  <div className="space-y-2">
                    {['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map((planet) => (
                      <div key={planet} className="flex justify-between text-sm text-[#8D8B9F]">
                        <span>{translatePlanet(planet, language)}</span>
                        <span>{language === 'ru' ? 'Скоро откроется' : 'Unlock to reveal'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </BlurGate>
          </div>
        </div>
      </div>
    );
  }

  if (error || !natalChart || !dailyData) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-void)]">
        <div className="celestial-gradient" aria-hidden="true" />
        <div className="star-field" aria-hidden="true" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="glass-card max-w-md p-6 text-center">
            <p className="text-[#8D8B9F]">{error || t.noBirthData}</p>
            <button className="lumina-btn-primary mt-5 w-full" onClick={() => router.push('/')}>
              {t.backToHome}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-void)]">
      <div className="celestial-gradient" aria-hidden="true" />
      <div className="star-field" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-safe sm:px-6 lg:pb-10">
        <header className="flex items-center justify-between pb-6 pt-4">
          <button type="button" onClick={() => router.push('/')} className="lumina-back-btn text-sm">
            <span className="inline-flex items-center gap-2">
              <ArrowLeft strokeWidth={1.8} />
              {t.back}
            </span>
          </button>
          <p className="font-heading text-2xl text-[#FDFBF7]">{language === 'ru' ? 'Карта' : 'Chart'}</p>
          <Link href="/consultation" className="text-[11px] uppercase tracking-[0.18em] text-text-secondary transition hover:text-text-primary">
            {language === 'ru' ? 'Сессия' : 'Session'}
          </Link>
        </header>

        <section className="glass-card p-6 animate-stagger-1">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="lumina-label">{language === 'ru' ? 'Натальная карта' : 'Natal chart'}</p>
              <h1 className="mt-3 font-heading text-[34px] leading-[1.02] text-text-primary">
                {profile?.name || (language === 'ru' ? 'Твоя космическая матрица' : 'Your cosmic blueprint')}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
                {profile?.locationName}
                {profile?.locationName ? ' · ' : ''}
                {todayFormatted}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 lg:max-w-md">
              <p className="lumina-label">{t.dailyHoroscope}</p>
              {loadingHoroscope ? (
                <div className="mt-3 space-y-2">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-11/12" />
                </div>
              ) : (
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-text-secondary line-clamp-6">{horoscope}</p>
              )}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="glass-card p-6 animate-stagger-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="lumina-label">{language === 'ru' ? 'Колесо домов' : 'House wheel'}</p>
                <h2 className="mt-2 font-heading text-[30px] text-text-primary">
                  {language === 'ru' ? 'Натальная мандала' : 'Natal mandala'}
                </h2>
              </div>
              <span className="badge">{language === 'ru' ? 'Нажми на дом' : 'Tap a house'}</span>
            </div>

            <div className="mt-6">
              <WheelPlaceholder
                natalChart={natalChart}
                language={language}
                activeHouse={activeHouse}
                onHouseFocus={setActiveHouse}
                onHouseClick={openHouseExplanation}
              />
            </div>

            {activeHouseData ? (
              <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="lumina-label">{language === 'ru' ? 'Активный дом' : 'Active house'}</p>
                <div className="mt-3 flex items-center gap-3">
                  <ZodiacSvg sign={activeHouseData.sign} size={30} />
                  <div>
                    <p className="font-heading text-2xl text-text-primary">
                      {language === 'ru' ? `Дом ${activeHouseData.house}` : `House ${activeHouseData.house}`}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {translateSign(activeHouseData.sign, language)} · {getHouseTheme(activeHouseData.house, language)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <div className="space-y-6">
            <section className="glass-card overflow-hidden p-6 animate-stagger-3">
              <p className="lumina-label">{t.moonPhase}</p>
              <div className="mt-4 flex items-center gap-5">
                <div className="shrink-0 animate-float">
                  <MoonPhaseVisual illumination={dailyData.moon.illumination} phase={dailyData.moon.phase} />
                </div>
                <div>
                  <p className="font-heading text-[28px] leading-none text-text-primary">
                    {translateSign(dailyData.moon.sign, language)}
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    {translateMoonPhase(dailyData.moon.phase, language)} · {dailyData.moon.illumination}%
                  </p>
                </div>
              </div>
            </section>

            <section className="glass-card p-6 animate-stagger-4">
              <p className="lumina-label">{language === 'ru' ? 'Ключ карты' : 'Chart key'}</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-text-secondary">{language === 'ru' ? 'Солнечный знак' : 'Sun sign'}</p>
                  <p className="mt-1 font-heading text-2xl text-text-primary">{translateSign(natalChart.zodiacSign, language)}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-text-secondary">{language === 'ru' ? 'Лунный знак' : 'Moon sign'}</p>
                  <p className="mt-1 font-heading text-2xl text-text-primary">{translateSign(moonSign, language)}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-text-secondary">{language === 'ru' ? 'Асцендент' : 'Rising sign'}</p>
                  <p className="mt-1 font-heading text-2xl text-text-primary">{translateSign(natalChart.risingSign, language)}</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="mt-6 animate-stagger-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="lumina-label">{t.bigThree}</p>
            <span className="text-[11px] uppercase tracking-[0.18em] text-text-secondary">
              {language === 'ru' ? 'Листай' : 'Scroll'}
            </span>
          </div>

          <div className="flex snap-x gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
            {bigThree.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => openPlanetExplanation(item.planet, item.sign, item.planet === 'Ascendant' ? 1 : natalChart.planets.find((planet) => planet.planet === item.planet)?.house)}
                className="glass-card min-w-[260px] snap-start p-5 text-left lg:min-w-0"
              >
                <p className="lumina-label">{item.label}</p>
                <div className="mt-4 flex items-center gap-3">
                  <ZodiacSvg sign={item.sign} size={40} />
                  <div>
                    <p className="font-heading text-[30px] leading-none text-text-primary">{translateSign(item.sign, language)}</p>
                    <p className="mt-1 text-sm text-text-secondary">{item.blurb}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card mt-6 p-6 animate-stagger-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="lumina-label">{t.planetaryPositions}</p>
              <h2 className="mt-2 font-heading text-[30px] text-text-primary">
                {language === 'ru' ? 'Планеты в знаках' : 'Planet placements'}
              </h2>
            </div>
            <Link href="/consultation" className="text-sm text-text-secondary transition hover:text-text-primary">
              <span className="inline-flex items-center gap-2">
                {t.ctaPersonalReading}
                <ChevronRight size={16} strokeWidth={1.7} />
              </span>
            </Link>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {natalChart.planets.map((planet) => (
              <button
                key={planet.planet}
                type="button"
                onClick={() => openPlanetExplanation(planet.planet, planet.sign, planet.house)}
                className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:border-white/[0.18] hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-text-primary">
                    <PlanetSvg planet={planet.planet} size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{translatePlanet(planet.planet, language)}</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {getPlanetWhyItMatters(planet.planet, language)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-heading text-2xl text-text-primary">{translateSign(planet.sign, language)}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-secondary">
                      {planet.degrees}° · {language === 'ru' ? `Дом ${planet.house}` : `House ${planet.house}`}
                    </p>
                  </div>
                  <ZodiacSvg sign={planet.sign} size={30} />
                </div>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-6 text-center">
          <Link href="/consultation" className="inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-text-primary">
            <Sparkles size={14} strokeWidth={1.6} />
            <span>{t.ctaDecoded}</span>
          </Link>
        </div>
      </div>

      <ExplainModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        title={explainState?.title || ''}
        planet={explainState?.planet}
        sign={explainState?.sign}
        house={explainState?.house}
        language={language}
      />
    </div>
  );
}
