'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
// LanguageToggle moved to layout.tsx
import { useLanguage } from '@/context/LanguageContext';
import { planetNames, translatePlanet, translateSign } from '@/lib/translations';
import { getZodiacIcon } from '@/components/icons/ZodiacIcons';

export default function PlanetPage() {
  const params = useParams<{ name: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language, t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState('');

  const planetKey = (params.name || '').toLowerCase();
  const englishPlanet = Object.keys(planetNames.en).find((planet) => planet.toLowerCase() === planetKey);
  const sign = searchParams.get('sign') || '';
  const house = Number.parseInt(searchParams.get('house') || '', 10);

  useEffect(() => {
    if (!englishPlanet || !sign || Number.isNaN(house)) {
      setLoading(false);
      return;
    }

    const fetchExplanation = async () => {
      try {
        const response = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planet: englishPlanet,
            sign,
            house,
            language,
          }),
        });

        const payload = (await response.json()) as { explanation?: string };
        setExplanation(payload.explanation || t.explanationFallback);
      } catch {
        setExplanation(t.explanationFallback);
      } finally {
        setLoading(false);
      }
    };

    fetchExplanation();
  }, [englishPlanet, house, language, sign, t.explanationFallback]);

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <button onClick={() => router.push('/chart')} className="min-h-11 rounded-full px-4 text-sm text-cream hover:text-warmWhite">
          ← {t.back}
        </button>
        <div className="w-20" />
      </header>

      <section className="glass-card p-6 sm:p-8">
        {englishPlanet && sign && !Number.isNaN(house) ? (
          <>
            <p className="lumina-label">{t.generatedInsight}</p>
            <h1 className="mt-2 font-heading text-4xl text-lumina-soft">
              {translatePlanet(englishPlanet, language)}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-lg text-warmWhite">
              {(() => { const Icon = getZodiacIcon(sign); return Icon ? <Icon size={20} className="inline-block" /> : null; })()}
              <span>{translateSign(sign, language)} • {t.house} {house}</span>
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-11/12" />
                  <div className="skeleton h-4 w-10/12" />
                  <div className="skeleton h-4 w-9/12" />
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed text-warmWhite">{explanation || t.explanationFallback}</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-cream">{t.notFoundPlanet}</p>
        )}
      </section>
    </div>
  );
}
