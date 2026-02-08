'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import LanguageToggle from '@/components/LanguageToggle';
import MoonPhaseVisual from '@/components/MoonPhaseVisual';
import { useLanguage } from '@/context/LanguageContext';
import { calculateDailyCelestialData, calculateNatalChart } from '@/lib/astronomyCalculator';
import {
  translateAspectType,
  translateMoonPhase,
  translatePlanet,
  translateSign,
} from '@/lib/translations';
import { getZodiacSymbol } from '@/lib/zodiacSymbols';
import type { BirthData, DailyCelestialData, NatalChartData } from '@/lib/types';

type StoredBirthPayload = {
  name?: string;
  locationName: string;
  birthData: BirthData;
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

      <section className="glass-card mb-6 p-5 sm:p-6">
        <p className="lumina-label mb-4 text-center">{t.bigThree}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/5 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-cream">{t.sun}</p>
            <p className="mt-2 font-heading text-2xl text-lumina-champagne">
              {getZodiacSymbol(natalChart.zodiacSign)} {translateSign(natalChart.zodiacSign, language)}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-cream">{t.moon}</p>
            <p className="mt-2 font-heading text-2xl text-lumina-champagne">
              {getZodiacSymbol(moonSign || '')} {translateSign(moonSign || '', language)}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-cream">{t.rising}</p>
            <p className="mt-2 font-heading text-2xl text-lumina-champagne">
              {getZodiacSymbol(natalChart.risingSign)} {translateSign(natalChart.risingSign, language)}
            </p>
          </div>
        </div>
      </section>

      <section className="glass-card mb-6 p-5 sm:p-6">
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

      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-card p-5 sm:p-6">
          <p className="lumina-label mb-3">{t.moonPhase}</p>
          <div className="flex flex-col items-center gap-2">
            <MoonPhaseVisual illumination={dailyData.moon.illumination} phase={dailyData.moon.phase} />
            <p className="text-lg text-lumina-champagne">{translateMoonPhase(dailyData.moon.phase, language)}</p>
            <p className="text-sm text-cream">
              {t.illumination}: {dailyData.moon.illumination}%
            </p>
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6">
          <p className="lumina-label mb-3">{t.keyAspects}</p>
          <div className="space-y-3">
            {dailyData.aspects.map((aspect, idx) => (
              <div key={`${aspect.aspect}-${idx}`} className="rounded-xl bg-white/5 p-3">
                <p className="text-sm font-semibold text-lumina-champagne">{translateAspectType(aspect.type, language)}</p>
                <p className="mt-1 text-sm text-warmWhite">{aspect.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-card mb-6 p-5 sm:p-6">
        <p className="lumina-label mb-4">{t.planetaryPositions}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {natalChart.planets.map((planet) => (
            <Link
              key={planet.planet}
              href={`/planet/${planet.planet.toLowerCase()}?sign=${encodeURIComponent(planet.sign)}&house=${planet.house}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-lumina-gold/40"
            >
              <p className="text-sm uppercase tracking-[0.13em] text-cream">{translatePlanet(planet.planet, language)}</p>
              <p className="mt-1 text-lg text-lumina-champagne">
                {getZodiacSymbol(planet.sign)} {translateSign(planet.sign, language)}
              </p>
              <p className="mt-1 text-sm text-cream">
                {Number.parseFloat(planet.degrees).toFixed(1)}° • {t.house} {planet.house}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="glass-card p-5 sm:p-6">
        <p className="lumina-label mb-4">{t.transitsToday}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {dailyData.planets.map((planet) => (
            <div key={`transit-${planet.planet}`} className="rounded-xl bg-white/5 p-3 text-center">
              <p className="text-sm text-warmWhite">{translatePlanet(planet.planet, language)}</p>
              <p className="mt-1 text-lumina-champagne">
                {getZodiacSymbol(planet.sign)} {translateSign(planet.sign, language)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
