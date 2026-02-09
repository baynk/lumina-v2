'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MoonPhaseVisual from '@/components/MoonPhaseVisual';
import ExplainModal from '@/components/ExplainModal';
import { useLanguage } from '@/context/LanguageContext';
import { calculateDailyCelestialData, calculateNatalChart } from '@/lib/astronomyCalculator';
import {
  translateAspectType,
  translateMoonPhase,
  translatePlanet,
  translateSign,
  translateSignGenitive,
} from '@/lib/translations';
import { ZodiacImage } from '@/components/icons/ZodiacIcons';
import { getAspectIcon, getPlanetIcon } from '@/components/icons/PlanetIcons';
import { getHouseTheme, getPlanetWhyItMatters } from '@/lib/education';
import { loadProfile } from '@/lib/profile';
import type { BirthData, DailyCelestialData, NatalChartData } from '@/lib/types';

type StoredBirthPayload = {
  name?: string;
  locationName: string;
  birthData: BirthData;
};

type ChartTab = 'today' | 'summary' | 'planets' | 'houses';

type ExplainState = {
  title: string;
  planet: string;
  sign: string;
  house: number;
};

const STORAGE_KEY = 'lumina_birth_data';

export default function ChartPage() {
  const router = useRouter();
  const { language, t } = useLanguage();

  const [profile, setProfile] = useState<StoredBirthPayload | null>(null);
  const [natalChart, setNatalChart] = useState<NatalChartData | null>(null);
  const [dailyData, setDailyData] = useState<DailyCelestialData | null>(null);
  const [horoscope, setHoroscope] = useState('');
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingHoroscope, setLoadingHoroscope] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ChartTab>('today');
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [explainState, setExplainState] = useState<ExplainState | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  const ZodiacSvg = ({ sign, size = 20 }: { sign: string; size?: number }) => {
    return <ZodiacImage sign={sign} size={size} className="inline-block align-middle" />;
  };

  const PlanetSvg = ({ planet, size = 16 }: { planet: string; size?: number }) => {
    const Icon = getPlanetIcon(planet);
    return Icon ? <Icon size={size} className="inline-block align-middle" /> : null;
  };

  const AspectSvg = ({ type, size = 16 }: { type: string; size?: number }) => {
    const Icon = getAspectIcon(type);
    return Icon ? <Icon size={size} className="inline-block align-middle" /> : null;
  };

  useEffect(() => {
    const init = async () => {
    try {
      // Try new profile format first
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
        // Fall back to old format
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) { router.replace('/'); return; }
        const parsed = JSON.parse(raw) as StoredBirthPayload;
        if (!parsed?.birthData) { router.replace('/'); return; }
        birthData = parsed.birthData;
        profilePayload = parsed;
      }

      // ALWAYS re-derive timezone from birth coordinates — this is the single source of truth.
      // Never trust the stored timezone (could be stale browser TZ from before the fix).
      if (birthData.latitude && birthData.longitude) {
        try {
          const tzResp = await fetch(`/api/timezone?lat=${birthData.latitude}&lon=${birthData.longitude}`);
          const tzData = await tzResp.json() as { timezone?: string };
          if (tzData.timezone) {
            birthData = { ...birthData, timezone: tzData.timezone };
            profilePayload = { ...profilePayload!, birthData };
            // Persist the corrected timezone
            if (profileData) {
              const { saveProfile: sp } = await import('@/lib/profile');
              sp({ ...profileData, birthData });
            }
          }
        } catch {
          // If API fails, proceed with existing timezone — best we can do
        }
      }

      setProfile(profilePayload);
      const natal = calculateNatalChart(birthData);
      const daily = calculateDailyCelestialData();
      setNatalChart(natal);
      setDailyData(daily);
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

  const moonSign = useMemo(() => natalChart?.planets.find((p) => p.planet === 'Moon')?.sign, [natalChart]);

  const todayFormatted = useMemo(() => {
    const now = new Date();
    if (language === 'ru') {
      return now.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    return now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [language]);

  const openPlanetExplanation = (planet: string, sign: string, house?: number) => {
    const safeHouse = house && Number.isFinite(house) ? house : 1;
    setExplainState({ title: translatePlanet(planet, language), planet, sign, house: safeHouse });
    setIsExplainOpen(true);
  };

  const openHouseExplanation = (house: number, sign: string) => {
    setExplainState({ title: `${t.houseCusp} ${house}`, planet: `House ${house}`, sign, house });
    setIsExplainOpen(true);
  };

  const tabs: { key: ChartTab; label: string }[] = [
    { key: 'today', label: t.today },
    { key: 'summary', label: t.summary },
    { key: 'planets', label: t.planets },
    { key: 'houses', label: t.houses },
  ];

  if (loadingChart) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="font-heading text-3xl text-lumina-soft">Lumina</p>
          <p className="mt-3 text-cream">{t.loadingChart}</p>
        </div>
      </div>
    );
  }

  if (error || !natalChart || !dailyData) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass-card max-w-md p-6 text-center">
          <p className="text-cream">{error || t.noBirthData}</p>
          <button className="lumina-button mt-5 w-full" onClick={() => router.push('/')}>
            {t.backToHome}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
        {/* Header: back | Lumina | profile */}
        <header className="mb-6 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="min-h-11 rounded-full px-4 text-sm text-cream hover:text-warmWhite">
            ← {t.back}
          </button>
          <p className="font-heading text-xl text-lumina-soft">Lumina</p>
          <button onClick={() => router.push('/profile')} className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-cream hover:text-warmWhite" aria-label={t.profile}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative min-h-11 rounded-full px-4 text-sm transition sm:px-5 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-lumina-accent-bright to-lumina-accent font-semibold text-white'
                    : 'text-cream hover:text-warmWhite'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div key={activeTab} className="transition-opacity duration-300 animate-fadeInUp">

          {/* TODAY TAB */}
          {activeTab === 'today' && (
            <>
              <section className="mb-6 text-center animate-stagger-1">
                <p className="text-sm text-cream/60 capitalize">{todayFormatted}</p>
                {profile?.name && <p className="mt-1 text-warmWhite">{profile.name}</p>}
              </section>

              {/* Today's Energy / Horoscope */}
              <section className="glass-card mb-6 p-5 sm:p-6 animate-stagger-1">
                <p className="lumina-label mb-3">{t.todaysEnergy}</p>
                {loadingHoroscope ? (
                  <div className="space-y-3">
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-11/12" />
                    <div className="skeleton h-4 w-10/12" />
                    <div className="skeleton h-4 w-9/12" />
                  </div>
                ) : (
                  <p className="leading-relaxed text-warmWhite">{horoscope || t.horoscopeFallback}</p>
                )}
              </section>

              {/* Moon Phase */}
              <section className="glass-card mb-6 p-5 sm:p-6 animate-stagger-2">
                <p className="lumina-label mb-3">{t.moonPhase}</p>
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-float">
                    <MoonPhaseVisual illumination={dailyData.moon.illumination} phase={dailyData.moon.phase} />
                  </div>
                  <p className="flex items-center gap-2 text-lg text-lumina-soft">
                    <span>{translateMoonPhase(dailyData.moon.phase, language)}</span>
                    <ZodiacSvg sign={dailyData.moon.sign} />
                  </p>
                  <p className="text-sm text-cream">{translateSign(dailyData.moon.sign, language)}</p>
                  <p className="text-sm text-cream">{t.illumination}: {dailyData.moon.illumination}%</p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-lumina-accent" style={{ width: `${dailyData.moon.illumination}%` }} aria-hidden="true" />
                  </div>
                </div>
              </section>

              {/* Today's Aspects */}
              <section className="glass-card mb-6 p-5 sm:p-6 animate-stagger-3">
                <p className="lumina-label mb-3">{t.todaysAspects}</p>
                <div className="space-y-3">
                  {dailyData.aspects.map((aspect, idx) => (
                    <div key={`${aspect.aspect}-${idx}`} className="rounded-xl bg-white/5 p-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-lumina-soft">
                        <AspectSvg type={aspect.type} />
                        <span>{translateAspectType(aspect.type, language)}</span>
                      </p>
                      <p className="mt-1 text-sm text-warmWhite">{aspect.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Consultation CTA after aspects */}
              <div className="mb-6 text-center animate-stagger-4">
                <a
                  href="/consultation"
                  className="text-sm text-cream/60 hover:text-lumina-accent transition"
                >
                  {t.ctaDecoded}
                </a>
              </div>

              {/* Daily Tip */}
              <section className="glass-card p-5 sm:p-6 animate-stagger-4">
                <p className="lumina-label mb-3">{t.dailyTip}</p>
                <p className="text-sm leading-relaxed text-cream">
                  {language === 'ru'
                    ? 'Сегодня обрати внимание на свои эмоции — Луна подсказывает, что интуиция сильнее логики. Найди 10 минут для тишины.'
                    : 'Pay attention to your emotions today — the Moon suggests intuition is stronger than logic. Find 10 minutes of quiet time.'}
                </p>
              </section>
            </>
          )}

          {/* SUMMARY TAB */}
          {activeTab === 'summary' && (
            <>
              <section className="glass-card mb-6 p-5 sm:p-6 animate-stagger-1">
                <p className="mb-6 text-center text-sm text-cream/70">
                  {language === 'en'
                    ? `You are a ${translateSign(natalChart.zodiacSign, language)} with a ${translateSign(moonSign || '', language)} heart and a ${translateSign(natalChart.risingSign, language)} face to the world.`
                    : `Ты — ${translateSign(natalChart.zodiacSign, language)} с сердцем ${translateSignGenitive(moonSign || '')} и лицом ${translateSignGenitive(natalChart.risingSign)} для мира.`}
                </p>
                <p className="lumina-label mb-4 text-center">{t.bigThree}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cream mb-3">{t.sun}</p>
                    <div className="flex justify-center mb-2">
                      <ZodiacSvg sign={natalChart.zodiacSign} size={72} />
                    </div>
                    <p className="font-heading text-lg sm:text-xl text-lumina-soft">{translateSign(natalChart.zodiacSign, language)}</p>
                    <p className="mt-1 text-[10px] leading-tight text-cream/50">{getPlanetWhyItMatters('Sun', language)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cream mb-3">{t.moon}</p>
                    <div className="flex justify-center mb-2">
                      <ZodiacSvg sign={moonSign || ''} size={72} />
                    </div>
                    <p className="font-heading text-lg sm:text-xl text-lumina-soft">{translateSign(moonSign || '', language)}</p>
                    <p className="mt-1 text-[10px] leading-tight text-cream/50">{getPlanetWhyItMatters('Moon', language)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cream mb-3">{t.rising}</p>
                    <div className="flex justify-center mb-2">
                      <ZodiacSvg sign={natalChart.risingSign} size={72} />
                    </div>
                    <p className="font-heading text-lg sm:text-xl text-lumina-soft">{translateSign(natalChart.risingSign, language)}</p>
                    <p className="mt-1 text-[10px] leading-tight text-cream/50">{language === 'en' ? 'Your mask — how the world sees you' : 'Твоя маска — как тебя видит мир'}</p>
                  </div>
                </div>
                <div className="mt-5 flex gap-3">
                  <button type="button" className="lumina-button flex-1" onClick={() => setShowShareCard(true)}>
                    {t.shareYourChart}
                  </button>
                  <a
                    href="/consultation"
                    className="flex-1 flex items-center justify-center min-h-[48px] rounded-full border border-lumina-accent/30 px-4 text-sm text-cream transition hover:border-lumina-accent/60 hover:text-warmWhite"
                  >
                    {t.ctaPersonalReading}
                  </a>
                </div>
              </section>

              <section className="glass-card p-5 sm:p-6 animate-stagger-2">
                <p className="lumina-label mb-4">{t.currentTransits}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {dailyData.planets.map((planet) => (
                    <div key={`transit-${planet.planet}`} className="rounded-xl bg-white/5 p-3 text-center">
                      <p className="text-sm text-warmWhite">{translatePlanet(planet.planet, language)}</p>
                      <p className="mt-1 flex items-center justify-center gap-2 text-lumina-soft">
                        <ZodiacSvg sign={planet.sign} />
                        <span>{translateSign(planet.sign, language)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* PLANETS TAB */}
          {activeTab === 'planets' && (
            <section className="glass-card p-5 sm:p-6">
              <p className="lumina-label mb-4">{t.planetaryPositions}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {natalChart.planets.map((planet, idx) => (
                  <button
                    key={planet.planet}
                    type="button"
                    onClick={() => openPlanetExplanation(planet.planet, planet.sign, planet.house)}
                    className={`block rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-lumina-accent/40 ${
                      idx < 5 ? 'animate-stagger-2' : 'animate-stagger-3'
                    }`}
                  >
                    <p className="text-sm uppercase tracking-[0.13em] text-cream">
                      <span className="inline-flex items-center gap-1.5">
                        <PlanetSvg planet={planet.planet} />
                        <span>{translatePlanet(planet.planet, language)}</span>
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-cream/50">{getPlanetWhyItMatters(planet.planet, language)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <ZodiacSvg sign={planet.sign} size={44} />
                      <span className="font-heading text-lg text-lumina-soft">{translateSign(planet.sign, language)}</span>
                    </div>
                    <p className="mt-1 text-sm text-cream">{Number.parseFloat(planet.degrees).toFixed(1)}° • {t.house} {planet.house}</p>
                    <p className="mt-2 text-xs text-cream/70">{t.tapToLearnMore}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* HOUSES TAB */}
          {activeTab === 'houses' && (
            <section className="glass-card p-5 sm:p-6">
              <p className="lumina-label mb-4">{t.houses}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {natalChart.houses.map((house, idx) => (
                  <button
                    key={house.house}
                    type="button"
                    onClick={() => openHouseExplanation(house.house, house.sign)}
                    className={`rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-lumina-accent/40 ${
                      idx < 6 ? 'animate-stagger-2' : 'animate-stagger-3'
                    }`}
                  >
                    <p className="text-sm uppercase tracking-[0.13em] text-cream">{t.house} {house.house}</p>
                    <p className="mt-0.5 text-xs text-cream/50">{getHouseTheme(house.house, language)}</p>
                    <p className="mt-1 flex items-center gap-2 text-lg text-lumina-soft">
                      <ZodiacSvg sign={house.sign} />
                      <span>{translateSign(house.sign, language)}</span>
                    </p>
                    <p className="mt-1 text-sm text-cream">{t.houseCusp}: {Number.parseFloat(house.degrees).toFixed(1)}°</p>
                    <p className="mt-2 text-xs text-cream/70">{t.tapToLearnMore}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Share Card Modal */}
      {showShareCard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 px-4 py-6" onClick={() => setShowShareCard(false)}>
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl border-2 border-lumina-accent/40 bg-[#080c1f] p-8 text-center animate-slideUp sm:animate-fadeInUp" onClick={(event) => event.stopPropagation()}>
            <p className="font-heading text-3xl text-lumina-soft">Lumina</p>
            {profile?.name && <p className="mt-2 text-warmWhite">{profile.name}</p>}
            <div className="mt-6 space-y-4 text-left">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.13em] text-cream">
                  <PlanetSvg planet="Sun" />
                  <span>{t.sun}</span>
                </p>
                <p className="mt-1 flex items-center gap-2 text-lumina-soft">
                  <ZodiacSvg sign={natalChart.zodiacSign} size={32} />
                  <span className="font-heading text-lg">{translateSign(natalChart.zodiacSign, language)}</span>
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.13em] text-cream">
                  <PlanetSvg planet="Moon" />
                  <span>{t.moon}</span>
                </p>
                <p className="mt-1 flex items-center gap-2 text-lumina-soft">
                  <ZodiacSvg sign={moonSign || ''} size={32} />
                  <span className="font-heading text-lg">{translateSign(moonSign || '', language)}</span>
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.13em] text-cream">↑ {t.rising}</p>
                <p className="mt-1 flex items-center gap-2 text-lumina-soft">
                  <ZodiacSvg sign={natalChart.risingSign} size={32} />
                  <span className="font-heading text-lg">{translateSign(natalChart.risingSign, language)}</span>
                </p>
              </div>
            </div>
            <p className="mt-6 text-xs tracking-[0.18em] text-cream/70">lumina-v2-five.vercel.app</p>

            {/* Share buttons */}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="lumina-button flex-1 text-sm"
                onClick={async () => {
                  const shareText = `✨ My Lumina Chart ✨\n☉ ${t.sun}: ${translateSign(natalChart.zodiacSign, language)}\n☽ ${t.moon}: ${translateSign(moonSign || '', language)}\n↑ ${t.rising}: ${translateSign(natalChart.risingSign, language)}\n\nDiscover yours → lumina-v2-five.vercel.app`;
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: 'My Lumina Chart', text: shareText, url: 'https://lumina-v2-five.vercel.app' });
                    } catch { /* user cancelled */ }
                  } else {
                    await navigator.clipboard.writeText(shareText);
                    alert(language === 'ru' ? 'Скопировано!' : 'Copied to clipboard!');
                  }
                }}
              >
                {language === 'ru' ? 'Поделиться' : 'Share'}
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-full border border-lumina-accent/30 px-4 text-sm text-cream transition hover:border-lumina-accent/60"
                onClick={() => setShowShareCard(false)}
              >
                {t.closeModal}
              </button>
            </div>
          </div>
        </div>
      )}

      <ExplainModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        title={explainState?.title || ''}
        planet={explainState?.planet}
        sign={explainState?.sign}
        house={explainState?.house}
        language={language}
      />
    </>
  );
}
