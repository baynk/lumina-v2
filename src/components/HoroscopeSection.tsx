'use client';

import { useState, useEffect } from 'react';
import type { NatalChartData, DailyCelestialData } from '@/types';

interface HoroscopeSectionProps {
  natalChart: NatalChartData;
  dailyData: DailyCelestialData;
}

export default function HoroscopeSection({ natalChart, dailyData }: HoroscopeSectionProps) {
  const [horoscope, setHoroscope] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchHoroscope() {
      try {
        const res = await fetch('/api/horoscope', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ natalChart, dailyData }),
        });

        if (!res.ok) {
          throw new Error('Failed to generate horoscope');
        }

        const data = await res.json();
        setHoroscope(data.horoscope);
      } catch {
        setError('The stars are momentarily veiled. Try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchHoroscope();
  }, [natalChart, dailyData]);

  return (
    <div className="glass-card p-8 md:p-10">
      <div className="text-center mb-6">
        <div className="text-gold/50 text-sm uppercase tracking-[0.2em] font-body mb-2">
          ✦ Today&apos;s Reading ✦
        </div>
        <h2 className="font-heading text-3xl text-cream/90">Daily Horoscope</h2>
        <div className="gold-divider mt-4" />
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-gold/40 text-2xl loading-pulse mb-3">✦</div>
          <p className="text-cream/40 font-body text-sm">Consulting the cosmos...</p>
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-cream/40 font-body text-sm italic">{error}</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="font-body text-cream/75 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            {horoscope}
          </p>
        </div>
      )}
    </div>
  );
}
