'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import LanguageToggle from '@/components/LanguageToggle';
import MoonPhaseVisual from '@/components/MoonPhaseVisual';
import ExplainModal from '@/components/ExplainModal';
import { useLanguage } from '@/context/LanguageContext';
import { calculateDailyCelestialData, calculateNatalChart } from '@/lib/astronomyCalculator';
import {
  translateAspectType,
  translateMoonPhase,
  translatePlanet,
  translateSign,
} from '@/lib/translations';
import { getZodiacIcon } from '@/components/icons/ZodiacIcons';
import { getAspectIcon, getPlanetIcon } from '@/components/icons/PlanetIcons';
import { getHouseTheme, getPlanetWhyItMatters } from '@/lib/education';
import type { BirthData, DailyCelestialData, NatalChartData } from '@/lib/types';

type StoredBirthPayload = {
  name?: string;
  locationName: string;
  birthData: BirthData;
};

type ChartTab = 'summary' | 'planets' | 'houses';

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
  const [activeTab, setActiveTab] = useState<ChartTab>('summary');
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [explainState, setExplainState] = useState<ExplainState | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  const ZodiacSvg = ({ sign, size = 20 }: { sign: string; size?: number }) => {
    const Icon = getZodiacIcon(sign);
    return Icon ? <Icon size={size} className="inline-block align-middle" /> : null;
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
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        router.replace('/');
        return;
      }

      const parsed = JSON.parse(raw) as StoredBirthPayload;
      if (!parsed?.birthData) {
        router.replace('/');
        return;
      }

      setProfile(parsed);
      const natal = calculateNatalChart(parsed.birthData);
      const daily = calculateDailyCelestialData();
      setNatalChart(natal);
      setDailyData(daily);
    } catch {
      setError(t.chartError);
    } finally {
      setLoadingChart(false);
    }
  }, [router, t.chartError]);

  useEffect(() => {
    if (!natalChart || !dailyData) {
      return;
    }

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

  const moonSign = useMemo(() => natalChart?.planets.find((planet) => planet.planet === 'Moon')?.sign, [natalChart]);

  const openPlanetExplanation = (planet: string, sign: string, house?: number) => {
    const safeHouse = house && Number.isFinite(house) ? house : 1;
    setExplainState({
      title: translatePlanet(planet, language),
      planet,
      sign,
      house: safeHouse,
    });
    setIsExplainOpen(true);
  };

  const openHouseExplanation = (house: number, sign: string) => {
    setExplainState({
      title: `${t.houseCusp} ${house}`,
      planet: `House ${house}`,
      sign,
      house,
    });
    setIsExplainOpen(true);
  };

  if (loadingChart) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="font-heading text-3xl text-lumina-champagne">Lumina</p>
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
        <header className="mb-6 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="min-h-11 rounded-full px-4 text-sm text-cream hover:text-warmWhite">
            ← {t.back}
          </button>
          <LanguageToggle />
        </header>

        <section className="mb-7 text-center animate-fadeInUp">
          <h1 className="font-heading text-4xl text-lumina-champagne sm:text-5xl">{t.yourCelestialBlueprint}</h1>
          {profile?.name && <p className="mt-2 text-cream">{profile.name}</p>}
          {profile?.locationName && <p className="mt-1 text-sm text-cream">{profile.locationName}</p>}
        </section>

        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`relative min-h-11 rounded-full px-4 text-sm transition sm:px-6 ${
                activeTab === 'summary'
                  ? 'bg-gradient-to-r from-lumina-gold to-lumina-champagne font-semibold text-midnight'
                  : 'text-cream hover:text-warmWhite'
              }`}
            >
              {t.summary}
              <span
                aria-hidden="true"
                className={`absolute bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-lumina-gold transition-opacity ${
                  activeTab === 'summary' ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('planets')}
              className={`relative min-h-11 rounded-full px-4 text-sm transition sm:px-6 ${
                activeTab === 'planets'
                  ? 'bg-gradient-to-r from-lumina-gold to-lumina-champagne font-semibold text-midnight'
                  : 'text-cream hover:text-warmWhite'
              }`}
            >
              {t.planets}
              <span
                aria-hidden="true"
                className={`absolute bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-lumina-gold transition-opacity ${
                  activeTab === 'planets' ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('houses')}
              className={`relative min-h-11 rounded-full px-4 text-sm transition sm:px-6 ${
                activeTab === 'houses'
                  ? 'bg-gradient-to-r from-lumina-gold to-lumina-champagne font-semibold text-midnight'
                  : 'text-cream hover:text-warmWhite'
              }`}
            >
              {t.houses}
              <span
                aria-hidden="true"
                className={`absolute bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-lumina-gold transition-opacity ${
                  activeTab === 'houses' ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div key={activeTab} className="transition-opacity duration-300 animate-fadeInUp">
          {activeTab === 'summary' && (
            <>
              <section className="glass-card mb-6 p-5 sm:p-6 animate-stagger-1">
                <p className="mb-6 text-center text-sm text-cream/70">
                  {language === 'en'
                    ? `You are a ${translateSign(natalChart.zodiacSign, language)} with a ${translateSign(
                        moonSign || '',
                        language
                      )} heart and a ${translateSign(natalChart.risingSign, language)} face to the world.`
                    : `Ты — ${translateSign(natalChart.zodiacSign, language)} с сердцем ${translateSign(
                        moonSign || '',
                        language
                      )} и лицом ${translateSign(natalChart.risingSign, language)} для мира.`}
                </p>
                <p className="lumina-label mb-4 text-center">{t.bigThree}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.16em] text-cream">{t.sun}</p>
                    <p className="mt-2 flex items-center justify-center gap-2 font-heading text-2xl text-lumina-champagne">
                      <ZodiacSvg sign={natalChart.zodiacSign} />
                      <span>{translateSign(natalChart.zodiacSign, language)}</span>
                    </p>
                    <p className="mt-1 text-xs text-cream/60">{getPlanetWhyItMatters('Sun', language)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.16em] text-cream">{t.moon}</p>
                    <p className="mt-2 flex items-center justify-center gap-2 font-heading text-2xl text-lumina-champagne">
                      <ZodiacSvg sign={moonSign || ''} />
                      <span>{translateSign(moonSign || '', language)}</span>
                    </p>
                    <p className="mt-1 text-xs text-cream/60">{getPlanetWhyItMatters('Moon', language)}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.16em] text-cream">{t.rising}</p>
                    <p className="mt-2 flex items-center justify-center gap-2 font-heading text-2xl text-lumina-champagne">
                      <ZodiacSvg sign={natalChart.risingSign} />
                      <span>{translateSign(natalChart.risingSign, language)}</span>
                    </p>
                    <p className="mt-1 text-xs text-cream/60">{getPlanetWhyItMatters('Sun', language)}</p>
                  </div>
                </div>
                <button type="button" className="lumina-button mt-5 w-full" onClick={() => setShowShareCard(true)}>
                  {t.shareYourChart}
                </button>
              </section>

              <section className="glass-card mb-6 p-5 sm:p-6 animate-stagger-2">
                <p className="lumina-label mb-3">{t.dailyHoroscope}</p>
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

              <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 animate-stagger-3">
                <div className="glass-card p-5 sm:p-6">
                  <p className="lumina-label mb-3">{t.moonPhase}</p>
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-float">
                      <MoonPhaseVisual illumination={dailyData.moon.illumination} phase={dailyData.moon.phase} />
                    </div>
                    <p className="flex items-center gap-2 text-lg text-lumina-champagne">
                      <span>{translateMoonPhase(dailyData.moon.phase, language)}</span>
                      <ZodiacSvg sign={dailyData.moon.sign} />
                    </p>
                    <p className="text-sm text-cream">{translateSign(dailyData.moon.sign, language)}</p>
                    <p className="text-sm text-cream">
                      {t.illumination}: {dailyData.moon.illumination}%
                    </p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-lumina-gold"
                        style={{ width: `${dailyData.moon.illumination}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5 sm:p-6">
                  <p className="lumina-label mb-3">{t.todaysAspects}</p>
                  <div className="space-y-3">
                    {dailyData.aspects.map((aspect, idx) => (
                      <div key={`${aspect.aspect}-${idx}`} className="rounded-xl bg-white/5 p-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-lumina-champagne">
                          <AspectSvg type={aspect.type} />
                          <span>{translateAspectType(aspect.type, language)}</span>
                        </p>
                        <p className="mt-1 text-sm text-warmWhite">{aspect.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="glass-card p-5 sm:p-6 animate-stagger-4">
                <p className="lumina-label mb-4">{t.currentTransits}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {dailyData.planets.map((planet) => (
                    <div key={`transit-${planet.planet}`} className="rounded-xl bg-white/5 p-3 text-center">
                      <p className="text-sm text-warmWhite">{translatePlanet(planet.planet, language)}</p>
                      <p className="mt-1 flex items-center justify-center gap-2 text-lumina-champagne">
                        <ZodiacSvg sign={planet.sign} />
                        <span>{translateSign(planet.sign, language)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === 'planets' && (
            <section className="glass-card p-5 sm:p-6">
              <p className="lumina-label mb-4">{t.planetaryPositions}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {natalChart.planets.map((planet, idx) => (
                  <button
                    key={planet.planet}
                    type="button"
                    onClick={() => openPlanetExplanation(planet.planet, planet.sign, planet.house)}
                    className={`block rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-lumina-gold/40 ${
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
                    <p className="mt-1 flex items-center gap-2 text-lg text-lumina-champagne">
                      <ZodiacSvg sign={planet.sign} />
                      <span>{translateSign(planet.sign, language)}</span>
                    </p>
                    <p className="mt-1 text-sm text-cream">
                      {Number.parseFloat(planet.degrees).toFixed(1)}° • {t.house} {planet.house}
                    </p>
                    <p className="mt-2 text-xs text-cream/70">{t.tapToLearnMore}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'houses' && (
            <section className="glass-card p-5 sm:p-6">
              <p className="lumina-label mb-4">{t.houses}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {natalChart.houses.map((house, idx) => (
                  <button
                    key={house.house}
                    type="button"
                    onClick={() => openHouseExplanation(house.house, house.sign)}
                    className={`rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-lumina-gold/40 ${
                      idx < 6 ? 'animate-stagger-2' : 'animate-stagger-3'
                    }`}
                  >
                    <p className="text-sm uppercase tracking-[0.13em] text-cream">
                      {t.house} {house.house}
                    </p>
                    <p className="mt-0.5 text-xs text-cream/50">{getHouseTheme(house.house, language)}</p>
                    <p className="mt-1 flex items-center gap-2 text-lg text-lumina-champagne">
                      <ZodiacSvg sign={house.sign} />
                      <span>{translateSign(house.sign, language)}</span>
                    </p>
                    <p className="mt-1 text-sm text-cream">
                      {t.houseCusp}: {Number.parseFloat(house.degrees).toFixed(1)}°
                    </p>
                    <p className="mt-2 text-xs text-cream/70">{t.tapToLearnMore}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {showShareCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6"
          onClick={() => setShowShareCard(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border-2 border-lumina-gold/40 bg-midnight p-8 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-heading text-3xl text-lumina-champagne">Lumina</p>
            {profile?.name && <p className="mt-2 text-warmWhite">{profile.name}</p>}

            <div className="mt-6 space-y-4 text-left">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.13em] text-cream">
                  <PlanetSvg planet="Sun" />
                  <span>{t.sun}</span>
                </p>
                <p className="mt-1 flex items-center gap-2 text-lumina-champagne">
                  <ZodiacSvg sign={natalChart.zodiacSign} />
                  <span>{translateSign(natalChart.zodiacSign, language)}</span>
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.13em] text-cream">
                  <PlanetSvg planet="Moon" />
                  <span>{t.moon}</span>
                </p>
                <p className="mt-1 flex items-center gap-2 text-lumina-champagne">
                  <ZodiacSvg sign={moonSign || ''} />
                  <span>{translateSign(moonSign || '', language)}</span>
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.13em] text-cream">↑ {t.rising}</p>
                <p className="mt-1 flex items-center gap-2 text-lumina-champagne">
                  <ZodiacSvg sign={natalChart.risingSign} />
                  <span>{translateSign(natalChart.risingSign, language)}</span>
                </p>
              </div>
            </div>

            <p className="mt-6 text-xs tracking-[0.18em] text-cream/70">lumina.app</p>
            <button
              type="button"
              className="mt-5 min-h-11 text-sm text-cream/60 transition hover:text-cream"
              onClick={() => setShowShareCard(false)}
            >
              {t.closeModal}
            </button>
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
