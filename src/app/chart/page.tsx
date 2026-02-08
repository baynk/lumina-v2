'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import BigThree from '@/components/BigThree';
import PlanetCard from '@/components/PlanetCard';
import MoonPhase from '@/components/MoonPhase';
import HoroscopeSection from '@/components/HoroscopeSection';
import { getZodiacGlyph, getPlanetSymbol } from '@/lib/zodiac';
import type { NatalChartData, DailyCelestialData } from '@/types';

function ChartContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [natalChart, setNatalChart] = useState<NatalChartData | null>(null);
  const [dailyData, setDailyData] = useState<DailyCelestialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchChart() {
      const year = searchParams.get('year');
      const month = searchParams.get('month');
      const day = searchParams.get('day');
      const hour = searchParams.get('hour');
      const minute = searchParams.get('minute');
      const lat = searchParams.get('lat');
      const lon = searchParams.get('lon');
      const tz = searchParams.get('tz');

      if (!year || !day || !lat || !lon || !tz) {
        setError('Missing birth data. Please go back and enter your details.');
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({
          year: year,
          month: month || '0',
          day: day,
          hour: hour || '12',
          minute: minute || '0',
          lat: lat,
          lon: lon,
          tz: tz,
        });

        const res = await fetch(`/api/chart?${params.toString()}`);
        
        if (!res.ok) {
          throw new Error('Failed to calculate chart');
        }

        const data = await res.json();
        setNatalChart(data.natalChart);
        setDailyData(data.dailyData);
      } catch {
        setError('Something went wrong calculating your chart. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchChart();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="text-gold text-5xl loading-pulse mb-6">✦</div>
          <h2 className="font-heading text-3xl text-cream/80 mb-3">Reading the Stars</h2>
          <p className="text-cream/40 font-body text-sm">Calculating your celestial blueprint...</p>
        </div>
      </div>
    );
  }

  if (error || !natalChart || !dailyData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center glass-card p-10 max-w-md">
          <div className="text-gold/40 text-4xl mb-4">☽</div>
          <h2 className="font-heading text-2xl text-cream/80 mb-3">Stars Obscured</h2>
          <p className="text-cream/50 font-body text-sm mb-6">{error || 'Unable to read your chart.'}</p>
          <button
            onClick={() => router.push('/')}
            className="gold-button text-sm font-body"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const moonPlanet = natalChart.planets.find(p => p.planet === 'Moon');
  const moonSign = moonPlanet?.sign || 'Unknown';

  return (
    <div className="min-h-screen px-4 py-8 md:py-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <button
          onClick={() => router.push('/')}
          className="text-gold/40 hover:text-gold/70 text-sm font-body tracking-wider uppercase mb-6 inline-block transition-colors"
        >
          ← New Chart
        </button>
        <h1 className="font-heading text-4xl md:text-5xl gold-text mb-2">Your Natal Chart</h1>
        <p className="text-cream/40 font-body text-sm">
          {getZodiacGlyph(natalChart.zodiacSign)} {natalChart.zodiacSign} Sun · {natalChart.element} · {natalChart.quality}
        </p>
        <div className="gold-divider mt-6 max-w-xs mx-auto" />
      </div>

      {/* Big Three */}
      <section className="mb-10">
        <BigThree
          sunSign={natalChart.zodiacSign}
          moonSign={moonSign}
          risingSign={natalChart.risingSign}
        />
      </section>

      {/* AI Horoscope */}
      <section className="mb-10">
        <HoroscopeSection natalChart={natalChart} dailyData={dailyData} />
      </section>

      {/* Moon Phase & Current Sky */}
      <section className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Moon Phase */}
          <div className="glass-card p-8 flex flex-col items-center justify-center">
            <div className="text-gold/50 text-sm uppercase tracking-[0.2em] font-body mb-4">
              Current Moon
            </div>
            <MoonPhase
              phase={dailyData.moon.phase}
              illumination={dailyData.moon.illumination}
            />
            <p className="text-cream/50 font-body text-sm mt-3">
              {getZodiacGlyph(dailyData.moon.sign)} Moon in {dailyData.moon.sign}
            </p>
          </div>

          {/* Aspects */}
          <div className="glass-card p-8">
            <div className="text-gold/50 text-sm uppercase tracking-[0.2em] font-body mb-4 text-center">
              Major Aspects Today
            </div>
            {dailyData.aspects.length > 0 ? (
              <div className="space-y-3">
                {dailyData.aspects.map((aspect, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-2 border-b border-gold/5 last:border-0">
                    <span className="text-gold/60 text-xs mt-0.5">✦</span>
                    <div>
                      <p className="text-cream/70 font-body text-sm">{aspect.aspect}</p>
                      <p className="text-cream/35 font-body text-xs mt-0.5">{aspect.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-cream/40 font-body text-sm text-center py-6 italic">
                No major aspects forming today
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Natal Planets */}
      <section className="mb-10">
        <div className="text-center mb-6">
          <div className="text-gold/50 text-sm uppercase tracking-[0.2em] font-body mb-2">
            Natal Placements
          </div>
          <h2 className="font-heading text-3xl text-cream/90">Your Planets</h2>
          <div className="gold-divider mt-4 max-w-xs mx-auto" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {natalChart.planets.map((planet) => (
            <PlanetCard
              key={planet.planet}
              planet={planet.planet}
              sign={planet.sign}
              degrees={planet.degrees}
              house={planet.house}
            />
          ))}
        </div>
      </section>

      {/* Houses */}
      <section className="mb-10">
        <div className="text-center mb-6">
          <div className="text-gold/50 text-sm uppercase tracking-[0.2em] font-body mb-2">
            House Placements
          </div>
          <h2 className="font-heading text-3xl text-cream/90">The Twelve Houses</h2>
          <div className="gold-divider mt-4 max-w-xs mx-auto" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {natalChart.houses.map((house) => (
            <div key={house.house} className="glass-card glass-card-hover p-4 text-center transition-all duration-300">
              <div className="text-gold/50 text-xs uppercase tracking-wider font-body mb-1">
                House {house.house}
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-gold/70 text-lg">{getZodiacGlyph(house.sign)}</span>
                <span className="font-body text-cream/70 text-sm">{house.sign}</span>
              </div>
              <p className="text-cream/30 text-xs font-body mt-1">{parseFloat(house.degrees).toFixed(1)}°</p>
            </div>
          ))}
        </div>
      </section>

      {/* Current Transits */}
      <section className="mb-10">
        <div className="text-center mb-6">
          <div className="text-gold/50 text-sm uppercase tracking-[0.2em] font-body mb-2">
            Celestial Weather
          </div>
          <h2 className="font-heading text-3xl text-cream/90">Current Transits</h2>
          <div className="gold-divider mt-4 max-w-xs mx-auto" />
        </div>
        <div className="glass-card p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {dailyData.planets.map((planet) => (
              <div key={planet.planet} className="text-center py-2">
                <div className="text-gold/60 text-lg mb-1">{getPlanetSymbol(planet.planet)}</div>
                <p className="font-body text-cream/70 text-xs">{planet.planet}</p>
                <p className="font-body text-cream/50 text-xs">
                  {getZodiacGlyph(planet.sign)} {planet.sign}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center py-8">
        <div className="gold-divider max-w-xs mx-auto mb-6" />
        <p className="text-cream/20 text-xs font-body tracking-wider">
          ✦ Lumina · Astronomical precision meets celestial wisdom ✦
        </p>
      </div>
    </div>
  );
}

export default function ChartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="text-gold text-5xl loading-pulse mb-6">✦</div>
          <h2 className="font-heading text-3xl text-cream/80 mb-3">Reading the Stars</h2>
          <p className="text-cream/40 font-body text-sm">Calculating your celestial blueprint...</p>
        </div>
      </div>
    }>
      <ChartContent />
    </Suspense>
  );
}
