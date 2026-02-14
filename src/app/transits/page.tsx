'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile } from '@/lib/profile';
import { translateAspectType, translatePlanet, translateSign } from '@/lib/translations';
import type { BirthData, TransitAlert, TransitReport } from '@/types';

type TransitResponse = TransitReport;

const toneStyles: Record<string, string> = {
  opportunity: 'border-emerald-300/30 bg-emerald-400/10',
  awareness: 'border-amber-300/30 bg-amber-300/10',
  challenge: 'border-rose-300/30 bg-rose-400/10',
};

function TransitCard({
  item,
  language,
}: {
  item: TransitAlert;
  language: 'en' | 'ru';
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border p-4 ${toneStyles[item.tone]}`}>
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="flex w-full items-center justify-between text-left">
        <div>
          <p className="text-sm font-semibold text-warmWhite">
            {translatePlanet(item.transitPlanet, language)} {translateAspectType(item.aspect, language).toLowerCase()} {translatePlanet(item.natalPlanet, language)}
          </p>
          <p className="mt-1 text-xs text-cream/75">
            {new Date(item.date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')} · {item.priority} · {item.status}
          </p>
        </div>
        <span className="text-cream">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-cream/90">
          <p>
            {translatePlanet(item.transitPlanet, language)} {language === 'ru' ? 'в' : 'in'} {translateSign(item.transitSign, language)} {translateAspectType(item.aspect, language).toLowerCase()} {language === 'ru' ? 'к вашей натальной' : 'your natal'} {translatePlanet(item.natalPlanet, language)} {language === 'ru' ? 'в' : 'in'} {translateSign(item.natalSign, language)}.
          </p>
          <p>{item.aiInterpretation || item.description}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function TransitsPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [birthData, setBirthData] = useState<BirthData | null>(null);
  const [report, setReport] = useState<TransitResponse | null>(null);
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
      const payload = (await response.json()) as TransitResponse;
      setReport(payload);
    } catch {
      setError(t.transitsError);
    } finally {
      setLoading(false);
    }
  };

  const submitBirthData = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runTransits();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-2 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <button type="button" onClick={() => router.push('/')} className="min-h-11 rounded-full px-3 text-sm text-cream hover:text-warmWhite">
          ← {t.back}
        </button>
        <h1 className="font-heading text-3xl text-lumina-soft">{t.transitsTitle}</h1>
        <div className="w-14" />
      </header>

      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-cream/80">{t.transitsSubtitle}</p>

      {!birthData ? (
        <form onSubmit={submitBirthData} className="glass-card p-5">
          <p className="text-sm text-cream/80">{t.noBirthData}</p>
          <button type="button" onClick={() => router.push('/')} className="lumina-button mt-4">
            {t.backToHome}
          </button>
        </form>
      ) : (
        <div className="mb-5 flex flex-wrap gap-2">
          <button type="button" onClick={runTransits} disabled={loading} className="lumina-button">
            {loading ? t.transitsLoading : t.transitsRun}
          </button>
        </div>
      )}

      {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <section className="glass-card p-6">
          <div className="space-y-3">
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-11/12" />
            <div className="skeleton h-4 w-10/12" />
          </div>
        </section>
      ) : null}

      {report ? (
        <div className="space-y-6 animate-fadeInUp">
          <section className="glass-card p-5 sm:p-6">
            <p className="lumina-label mb-3">{t.transitsActive}</p>
            <div className="space-y-3">
              {report.activeTransits.length ? (
                report.activeTransits.map((item) => <TransitCard key={item.id} item={item} language={language} />)
              ) : (
                <p className="text-sm text-cream/80">{t.transitsNoActive}</p>
              )}
            </div>
          </section>

          <section className="glass-card p-5 sm:p-6">
            <p className="lumina-label mb-3">{t.transitsUpcoming}</p>
            <div className="space-y-3">
              {report.upcomingTransits.length ? (
                report.upcomingTransits.map((item) => <TransitCard key={item.id} item={item} language={language} />)
              ) : (
                <p className="text-sm text-cream/80">{t.transitsNoUpcoming}</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
