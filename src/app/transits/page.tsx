'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile } from '@/lib/profile';
import { translateAspectType, translatePlanet, translateSign } from '@/lib/translations';
import type { BirthData, TransitAlert, TransitReport } from '@/lib/types';

const planetSymbols: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
};

function borderByTone(tone: TransitAlert['tone']): string {
  if (tone === 'opportunity') return 'border-l-emerald-300';
  if (tone === 'challenge') return 'border-l-rose-300';
  return 'border-l-amber-300';
}

function badgeByTone(tone: TransitAlert['tone']): string {
  if (tone === 'opportunity') return 'bg-emerald-300/15 text-emerald-200';
  if (tone === 'challenge') return 'bg-rose-300/15 text-rose-200';
  return 'bg-amber-300/15 text-amber-100';
}

function useHeadline(item: TransitAlert, language: 'en' | 'ru', template: string): string {
  return template
    .replace('{transit}', translatePlanet(item.transitPlanet, language))
    .replace('{natal}', translatePlanet(item.natalPlanet, language));
}

function TransitCard({ item }: { item: TransitAlert }) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const transitSymbol = planetSymbols[item.transitPlanet] || '✦';
  const natalSymbol = planetSymbols[item.natalPlanet] || '✦';
  const headline = useHeadline(item, language, t.transitsHeadlineTemplate);

  return (
    <article className={`lumina-card border-l-4 p-4 ${borderByTone(item.tone)}`}>
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="flex w-full items-start justify-between gap-3 text-left">
        <div>
          <div className="flex items-center gap-2 text-sm text-lumina-soft">
            <span>{transitSymbol}</span>
            <span>{translatePlanet(item.transitPlanet, language)}</span>
            <span className="text-cream/40">{translateAspectType(item.aspect, language).toLowerCase()}</span>
            <span>{natalSymbol}</span>
            <span>{translatePlanet(item.natalPlanet, language)}</span>
          </div>
          <p className="mt-2 text-base text-warmWhite">{headline}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-cream/65">
            <span>{new Date(item.date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}</span>
            <span className={`rounded-full px-2 py-0.5 ${badgeByTone(item.tone)}`}>{item.priority}</span>
            <span>{item.status}</span>
          </div>
        </div>
        <span className="pt-1 text-lg text-cream/70">{open ? '−' : '+'}</span>
      </button>

      {open ? (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-sm leading-relaxed text-cream/90">
          <p className="text-lumina-soft">{t.transitsMeaningQuestion}</p>
          <p>{item.aiInterpretation || item.description}</p>
          <p className="text-xs text-cream/60">
            {translatePlanet(item.transitPlanet, language)} {language === 'ru' ? 'в' : 'in'} {translateSign(item.transitSign, language)}{' '}
            {translateAspectType(item.aspect, language).toLowerCase()} {language === 'ru' ? 'к вашей натальной' : 'to your natal'}{' '}
            {translatePlanet(item.natalPlanet, language)} {language === 'ru' ? 'в' : 'in'} {translateSign(item.natalSign, language)}.
          </p>
        </div>
      ) : null}
    </article>
  );
}

export default function TransitsPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [birthData, setBirthData] = useState<BirthData | null>(null);

  const [report, setReport] = useState<TransitReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const profile = loadProfile();
    if (profile?.birthData) setBirthData(profile.birthData);
  }, []);

  const runTransits = async () => {
    if (!birthData) {
      setError(t.noBirthData);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/transits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthData, language }),
      });

      if (!response.ok) throw new Error('Failed');
      const payload = (await response.json()) as TransitReport;
      setReport(payload);
    } catch {
      setError(t.transitsError);
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    if (!report) {
      return { major: [] as TransitAlert[], active: [] as TransitAlert[], background: [] as TransitAlert[] };
    }

    const all = [...report.activeTransits, ...report.upcomingTransits].sort((a, b) => (a.date > b.date ? 1 : -1));
    const major = all.filter((item) => item.priority === 'major');
    const active = all.filter((item) => item.priority !== 'major' && item.status !== 'separating');
    const background = all.filter((item) => item.priority !== 'major' && item.status === 'separating');

    return { major, active, background };
  }, [report]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-2 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <button type="button" onClick={() => router.push('/')} className="min-h-11 rounded-full px-3 text-sm text-cream hover:text-warmWhite">
          ← {t.back}
        </button>
        <h1 className="font-heading text-3xl text-lumina-soft">{t.transitsTitle}</h1>
        <div className="w-14" />
      </header>

      <section className="glass-card p-5 sm:p-6">
        <p className="lumina-section-title">{t.transitsHeroLabel}</p>
        <h2 className="mt-2 text-xl text-lumina-soft">{t.transitsHeroTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-cream/80">{t.transitsHeroDescription}</p>
        <button type="button" onClick={runTransits} disabled={loading || !birthData} className="lumina-button mt-5 w-full sm:w-auto">
          {loading ? t.transitsLoading : t.transitsRun}
        </button>
      </section>

      {!birthData ? <p className="mt-4 text-sm text-rose-200">{t.noBirthData}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}

      {loading ? (
        <section className="glass-card mt-5 p-6">
          <div className="space-y-3">
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-11/12" />
            <div className="skeleton h-4 w-10/12" />
          </div>
        </section>
      ) : null}

      {report ? (
        <div className="mt-6 space-y-6 animate-fadeInUp">
          <section>
            <p className="lumina-section-title mb-3">{t.transitsGroupMajor}</p>
            <div className="space-y-3">
              {grouped.major.length ? grouped.major.map((item) => <TransitCard key={item.id} item={item} />) : <p className="text-sm text-cream/70">{t.transitsNoMajor}</p>}
            </div>
          </section>

          <section>
            <p className="lumina-section-title mb-3">{t.transitsGroupActive}</p>
            <div className="space-y-3">
              {grouped.active.length ? grouped.active.map((item) => <TransitCard key={item.id} item={item} />) : <p className="text-sm text-cream/70">{t.transitsNoActiveGroup}</p>}
            </div>
          </section>

          <section>
            <p className="lumina-section-title mb-3">{t.transitsGroupBackground}</p>
            <div className="space-y-3">
              {grouped.background.length ? grouped.background.map((item) => <TransitCard key={item.id} item={item} />) : <p className="text-sm text-cream/70">{t.transitsNoBackground}</p>}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
