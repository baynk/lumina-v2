'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { translatePlanet, translateSign } from '@/lib/translations';
import type { Planet, Sign } from '@/data/placements';

type AstrologyIndexClientProps = {
  planets: Planet[];
  signs: Sign[];
  planetSymbols: Record<Planet, string>;
  zodiacSymbols: Record<Sign, string>;
};

export default function AstrologyIndexClient({ planets, signs, planetSymbols, zodiacSymbols }: AstrologyIndexClientProps) {
  const { language } = useLanguage();

  const copy = {
    en: {
      label: 'Astrology Library',
      title: 'Planet in Sign Meanings',
      subtitle: 'Explore every natal placement and open the one that matches your chart.',
      sectionSuffix: 'placements',
      connector: 'in',
      ctaTitle: 'Get your exact chart placements',
      ctaChart: 'Discover my chart',
      ctaSynastry: 'Check compatibility',
    },
    ru: {
      label: 'Астрологическая библиотека',
      title: 'Значения положений планет в знаках',
      subtitle: 'Изучите все натальные сочетания и откройте то, что есть в вашей карте.',
      sectionSuffix: 'в знаках',
      connector: 'в',
      ctaTitle: 'Узнайте свои точные положения в карте',
      ctaChart: 'Открыть мою карту',
      ctaSynastry: 'Проверить совместимость',
    },
  }[language];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <section className="glass-card p-6 sm:p-8">
        <p className="lumina-label">{copy.label}</p>
        <h1 className="mt-3 font-heading text-4xl text-lumina-soft sm:text-5xl">{copy.title}</h1>
        <p className="mt-3 max-w-2xl text-cream/70">{copy.subtitle}</p>

        <div className="mt-8 space-y-8">
          {planets.map((planet) => (
            <section key={planet}>
              <h2 className="mb-4 text-xl font-semibold text-warmWhite">
                {planetSymbols[planet]} {translatePlanet(planet, language)} {copy.sectionSuffix}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {signs.map((sign) => (
                  <li key={`${planet}-${sign}`}>
                    <Link
                      href={`/astrology/${planet.toLowerCase()}-in-${sign.toLowerCase()}`}
                      className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-cream transition hover:border-lumina-accent/40 hover:text-warmWhite"
                    >
                      <span className="font-medium">
                        {translatePlanet(planet, language)} {copy.connector} {translateSign(sign, language)}
                      </span>
                      <span className="ml-2 text-lumina-accent/80">{zodiacSymbols[sign]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-lumina-accent/25 bg-gradient-to-r from-lumina-accent/10 to-transparent p-5">
          <p className="text-sm uppercase tracking-[0.14em] text-lumina-accent/75">{copy.ctaTitle}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-lumina-accent-bright to-lumina-accent px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {copy.ctaChart}
            </Link>
            <Link
              href="/synastry"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-lumina-accent/35 px-5 text-sm font-semibold text-cream transition hover:border-lumina-accent/70 hover:text-warmWhite"
            >
              {copy.ctaSynastry}
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}
