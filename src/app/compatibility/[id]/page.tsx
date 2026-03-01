'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import RadarChart from '@/components/RadarChart';
import { useLanguage } from '@/context/LanguageContext';

// Types (same as synastry page)
type SynastryNarrative = {
  overallConnection: string;
  communicationStyle: string;
  emotionalCompatibility: string;
  attractionChemistry: string;
  growthChallenges: string;
  longTermPotential: string;
};

type CategoryScores = {
  overallConnection: number;
  communicationStyle: number;
  emotionalCompatibility: number;
  attractionChemistry: number;
  growthChallenges: number;
  longTermPotential: number;
};

type CrossAspect = {
  planetA: string;
  planetB: string;
  type: string;
  signA: string;
  signB: string;
  orb: number;
  meaning: string;
};

type StoredResult = {
  id: string;
  personAName: string;
  personBName: string;
  personASun: string;
  personBSun: string;
  overallScore: number;
  result: {
    synastry: {
      categoryScores: CategoryScores;
      crossAspects: CrossAspect[];
      personAChart: { planets: { planet: string; sign: string }[]; risingSign?: string };
      personBChart: { planets: { planet: string; sign: string }[]; risingSign?: string };
    };
    interpretation: SynastryNarrative;
  };
  createdAt: string;
};

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? 'bg-purple-400' : value >= 50 ? 'bg-purple-400/70' : value >= 30 ? 'bg-purple-400/50' : 'bg-purple-400/30';
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-right text-xs text-cream/50 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-sm font-semibold text-purple-300">{value}%</span>
    </div>
  );
}

export default function PublicCompatibilityPage() {
  const { language } = useLanguage();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<StoredResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSection, setOpenSection] = useState<keyof SynastryNarrative>('overallConnection');

  useEffect(() => {
    fetch(`/api/synastry-result?id=${id}`)
      .then((r) => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then((d) => setData(d))
      .catch(() => setError('Compatibility reading not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lumina-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg text-cream/60">{error || 'Not found'}</p>
        <Link href="/" className="lumina-button">Discover Your Compatibility →</Link>
      </div>
    );
  }

  const { result, personAName, personBName, personASun, personBSun } = data;
  const scores = result.synastry.categoryScores;
  const interpretation = result.interpretation;

  const scoreItems = [
    { label: 'Overall', key: 'overallConnection' as const, value: scores.overallConnection },
    { label: 'Talk', key: 'communicationStyle' as const, value: scores.communicationStyle },
    { label: 'Feel', key: 'emotionalCompatibility' as const, value: scores.emotionalCompatibility },
    { label: 'Spark', key: 'attractionChemistry' as const, value: scores.attractionChemistry },
    { label: 'Growth', key: 'growthChallenges' as const, value: scores.growthChallenges },
    { label: 'Future', key: 'longTermPotential' as const, value: scores.longTermPotential },
  ];

  const sections = [
    { key: 'overallConnection' as const, title: 'Overall Connection', icon: '✦', text: interpretation.overallConnection },
    { key: 'communicationStyle' as const, title: 'Communication', icon: '💬', text: interpretation.communicationStyle },
    { key: 'emotionalCompatibility' as const, title: 'Emotional Depth', icon: '🌊', text: interpretation.emotionalCompatibility },
    { key: 'attractionChemistry' as const, title: 'Chemistry & Attraction', icon: '🔥', text: interpretation.attractionChemistry },
    { key: 'growthChallenges' as const, title: 'Growth & Challenges', icon: '🌱', text: interpretation.growthChallenges },
    { key: 'longTermPotential' as const, title: 'Long-Term Potential', icon: '♾️', text: interpretation.longTermPotential },
  ];

  const sunA = result.synastry.personAChart.planets.find((p) => p.planet === 'Sun');
  const sunB = result.synastry.personBChart.planets.find((p) => p.planet === 'Sun');
  const moonA = result.synastry.personAChart.planets.find((p) => p.planet === 'Moon');
  const moonB = result.synastry.personBChart.planets.find((p) => p.planet === 'Moon');
  const risingA = result.synastry.personAChart.risingSign;
  const risingB = result.synastry.personBChart.risingSign;

  return (
    <div className="min-h-screen" style={{ background: '#080c1f' }}>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-block mb-6">
            <span className="text-2xl font-heading text-purple-300 tracking-wider">LUMINA</span>
          </Link>
          <p className="text-[10px] uppercase tracking-[0.25em] text-purple-300/40 mb-4">Celestial Compatibility</p>
          <h1 className="font-heading text-3xl sm:text-4xl text-warmWhite mb-2">
            {personAName} & {personBName}
          </h1>
          <p className="text-sm text-cream/40">
            {ZODIAC_SYMBOLS[personASun] || ZODIAC_SYMBOLS[sunA?.sign || '']} {personASun || sunA?.sign}
            {' '}✦{' '}
            {ZODIAC_SYMBOLS[personBSun] || ZODIAC_SYMBOLS[sunB?.sign || '']} {personBSun || sunB?.sign}
          </p>
        </div>

        {/* Overall Score */}
        <div className="mb-8 text-center">
          <div className="inline-flex flex-col items-center rounded-2xl border border-purple-400/10 bg-purple-400/[0.04] px-10 py-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-purple-300/40 mb-1">Overall Compatibility</span>
            <span className="text-5xl font-bold text-purple-300">{scores.overallConnection}%</span>
          </div>
        </div>

        {/* Big Three Comparison */}
        <section className="glass-card mb-6 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
            {[
              { name: personAName, sun: sunA?.sign, moon: moonA?.sign, rising: risingA },
              { name: personBName, sun: sunB?.sign, moon: moonB?.sign, rising: risingB },
            ].map((person) => (
              <div key={person.name} className="p-5 text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-cream/50 mb-3">{person.name}</p>
                <div className="space-y-2">
                  {[
                    { label: 'Sun', sign: person.sun },
                    { label: 'Moon', sign: person.moon },
                    { label: 'Rising', sign: person.rising },
                  ].map((row) => (
                    <div key={row.label}>
                      <p className="text-[10px] uppercase tracking-wider text-cream/40">{row.label}</p>
                      <p className="text-sm font-medium text-warmWhite">
                        {ZODIAC_SYMBOLS[row.sign || '']} {row.sign}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Radar Chart */}
        <section className="glass-card mb-6 p-6">
          <p className="text-center text-xs uppercase tracking-[0.15em] text-cream/50 mb-4">Compatibility Wheel</p>
          <RadarChart values={scoreItems.map((s) => ({ label: s.label, value: s.value }))} />
        </section>

        {/* Score Bars */}
        <section className="glass-card mb-6 p-5 sm:p-6">
          <p className="text-center text-xs uppercase tracking-[0.15em] text-cream/50 mb-5">Compatibility Breakdown</p>
          <div className="space-y-3">
            {scoreItems.map((item) => (
              <ScoreBar key={item.key} label={item.label} value={item.value} />
            ))}
          </div>
        </section>

        {/* Narrative Sections */}
        <section className="mb-8 space-y-2">
          {sections.map((section) => (
            <div key={section.key} className="glass-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSection(openSection === section.key ? ('' as keyof SynastryNarrative) : section.key)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.02]"
              >
                <span className="text-base">{section.icon}</span>
                <span className="flex-1 text-sm font-medium text-warmWhite">{section.title}</span>
                <svg className={`h-4 w-4 text-cream/40 transition-transform ${openSection === section.key ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openSection === section.key && (
                <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 animate-fadeInUp">
                  <p className="text-sm leading-relaxed text-cream/85">{section.text}</p>
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Key Aspects */}
        {result.synastry.crossAspects.length > 0 && (
          <section className="glass-card mb-8 p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-cream/50 mb-4">Key Aspects</p>
            <div className="space-y-3">
              {result.synastry.crossAspects.slice(0, 6).map((aspect, idx) => (
                <div key={idx} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${
                      ['trine', 'sextile'].includes(aspect.type.toLowerCase()) ? 'bg-emerald-400' :
                      ['square', 'opposition'].includes(aspect.type.toLowerCase()) ? 'bg-amber-400' : 'bg-purple-400'
                    }`} />
                    <p className="text-xs uppercase tracking-[0.12em] text-purple-300">
                      {aspect.planetA} {aspect.type} {aspect.planetB}
                    </p>
                    <span className="text-[10px] text-cream/30">{aspect.orb.toFixed(1)}°</span>
                  </div>
                  <p className="text-sm leading-relaxed text-cream/70">{aspect.meaning}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recipient CTA */}
        <div className="text-center">
          <div className="glass-card p-8 text-center">
            <p className="text-xl font-heading text-warmWhite mb-2">
              {language === 'ru'
                ? 'Хотите узнать СВОЙ космический чертёж?'
                : 'Want to discover YOUR cosmic blueprint?'}
            </p>
            <p className="text-sm text-cream/60 mb-6">
              {language === 'ru'
                ? 'Получите натальную карту бесплатно за 60 секунд'
                : 'Get your free natal chart in 60 seconds'}
            </p>
            <Link href="/" className="lumina-button inline-block px-6 py-3">
              {language === 'ru' ? 'Получить мою карту бесплатно ✦' : 'Get My Free Natal Chart ✦'}
            </Link>
          </div>
          <p className="mt-6 text-xs text-cream/20">
            Powered by NASA JPL ephemeris data · luminastrology.com
          </p>
        </div>
      </div>
    </div>
  );
}
