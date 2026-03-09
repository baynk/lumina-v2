'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { translatePlanet, translateSign } from '@/lib/translations';
import type { PlacementData } from '@/data/placements';

type PlacementDetailClientProps = {
  placement: PlacementData;
  planetSymbol: string;
  zodiacSymbol: string;
};

export default function PlacementDetailClient({ placement, planetSymbol, zodiacSymbol }: PlacementDetailClientProps) {
  const { language } = useLanguage();

  const copy = {
    en: {
      sectionLabel: 'Planetary Placement',
      connector: 'in',
      overview: 'Overview',
      traits: 'Key Traits',
      relationships: 'In Relationships',
      career: 'Career & Purpose',
      challenges: 'Challenges',
      ctaChart: `Discover where ${placement.planet} falls in YOUR chart`,
      ctaSynastry: 'Check your compatibility',
      ctaTitle: 'Make this placement personal',
    },
    ru: {
      sectionLabel: 'Положение планеты',
      connector: 'в',
      overview: 'Обзор',
      traits: 'Ключевые черты',
      relationships: 'В отношениях',
      career: 'Карьера и предназначение',
      challenges: 'Сложности и уроки',
      ctaChart: `Узнайте, где ${translatePlanet(placement.planet, 'ru')} в ВАШЕЙ карте`,
      ctaSynastry: 'Проверить совместимость',
      ctaTitle: 'Сделайте это положение личным',
    },
  }[language];

  const planetName = translatePlanet(placement.planet, language);
  const signName = translateSign(placement.sign, language);
  const overviewParagraphs = placement.overview[language].split('\n\n').filter(Boolean);

  return (
    <div className="lumina-screen">
      <div className="aura -right-24 -top-16 h-[300px] w-[300px] bg-[#5A438A]" />
      <div className="aura -left-24 bottom-[22%] h-[280px] w-[280px] bg-[#2E1B54]" />
      <div className="aura -right-14 top-[42%] h-[250px] w-[250px] bg-[#18244D]" />
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <article className="glass-card p-6 sm:p-8">
        <p className="lumina-label">{copy.sectionLabel}</p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-[28px] border border-lumina-accent/30 bg-lumina-accent/10 px-4 py-3 text-lumina-soft">
            <span className="text-3xl" aria-hidden="true">{planetSymbol}</span>
            <span className="text-3xl" aria-hidden="true">{zodiacSymbol}</span>
          </div>
          <h1 className="font-heading text-3xl text-lumina-soft sm:text-4xl">
            {planetName} {copy.connector} {signName} {zodiacSymbol}
          </h1>
        </div>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-warmWhite">{copy.overview}</h2>
          {overviewParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="leading-relaxed text-cream/85">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-warmWhite">{copy.traits}</h2>
          <ul className="mt-4 space-y-2">
            {placement.traits[language].map((trait) => (
              <li key={trait} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-cream/85">
                {trait}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-warmWhite">{copy.relationships}</h2>
          <p className="leading-relaxed text-cream/85">{placement.relationships[language]}</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-warmWhite">{copy.career}</h2>
          <p className="leading-relaxed text-cream/85">{placement.career[language]}</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-warmWhite">{copy.challenges}</h2>
          <p className="leading-relaxed text-cream/85">{placement.challenges[language]}</p>
        </section>

        <section className="mt-10 rounded-[28px] border border-lumina-accent/25 bg-gradient-to-r from-lumina-accent/10 to-transparent p-5">
          <p className="text-sm uppercase tracking-[0.14em] text-lumina-accent/75">{copy.ctaTitle}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="lumina-button inline-flex min-h-11 items-center justify-center px-5 text-sm font-semibold transition hover:opacity-90"
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
      </article>
      </div>
    </div>
  );
}
