'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateDailyCelestialData } from '@/lib/astronomyCalculator';
import { useLanguage } from '@/context/LanguageContext';
import { translateMoonPhase } from '@/lib/translations';

type JournalEntry = {
  date: string;
  text: string;
};

const JOURNAL_PREFIX = 'lumina_moon_journal_';

function phasePrompt(phase: string, language: 'en' | 'ru'): string {
  const normalized = phase.toLowerCase();

  if (language === 'ru') {
    if (normalized.includes('new')) return 'Что ты хочешь начать с чистого листа в этом цикле?';
    if (normalized.includes('full')) return 'Что сейчас достигло пика и что пора отпустить?';
    if (normalized.includes('waxing') || normalized.includes('first')) return 'Какой один шаг сегодня укрепит твое намерение?';
    return 'Что готово завершиться, чтобы освободить место новому?';
  }

  if (normalized.includes('new')) return 'What intention do you want to plant in this cycle?';
  if (normalized.includes('full')) return 'What is peaking now, and what are you ready to release?';
  if (normalized.includes('waxing') || normalized.includes('first')) return 'What one action today strengthens your intention?';
  return 'What is ready to close so something new can begin?';
}

function firstLine(text: string): string {
  return text.split('\n').map((line) => line.trim()).find((line) => line.length > 0) || text.trim();
}

export default function JournalPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [moonPhase, setMoonPhase] = useState('New Moon');
  const [moonIllumination, setMoonIllumination] = useState(0);
  const [journalText, setJournalText] = useState('');
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  const todayKey = useMemo(() => `${JOURNAL_PREFIX}${new Date().toISOString().slice(0, 10)}`, []);

  const loadEntries = () => {
    const items: JournalEntry[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(JOURNAL_PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw || !raw.trim()) continue;
      items.push({ date: key.slice(JOURNAL_PREFIX.length), text: raw });
    }

    items.sort((a, b) => (a.date < b.date ? 1 : -1));
    setEntries(items);
  };

  useEffect(() => {
    try {
      const daily = calculateDailyCelestialData();
      setMoonPhase(daily.moon.phase);
      setMoonIllumination(daily.moon.illumination);
    } catch {
      setMoonPhase('New Moon');
      setMoonIllumination(0);
    }

    const existing = window.localStorage.getItem(todayKey);
    if (existing) setJournalText(existing);
    loadEntries();
  }, [todayKey]);

  const saveEntry = () => {
    window.localStorage.setItem(todayKey, journalText.trim());
    setSaved(true);
    loadEntries();
    window.setTimeout(() => setSaved(false), 1500);
  };

  const prompt = phasePrompt(moonPhase, language);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-2 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <button type="button" onClick={() => router.push('/')} className="min-h-11 rounded-full px-3 text-sm text-cream hover:text-warmWhite">
          ← {t.back}
        </button>
        <h1 className="font-heading text-3xl text-lumina-soft">{t.journalTitle}</h1>
        <div className="w-14" />
      </header>

      <section className="glass-card p-5 sm:p-6">
        <p className="lumina-section-title">{t.moonPhase}</p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-lg text-lumina-soft">🌙 {translateMoonPhase(moonPhase, language)}</p>
          <p className="text-xs text-cream/60">{moonIllumination}%</p>
        </div>
        <p className="mt-3 text-sm text-cream/85">{prompt}</p>

        <textarea
          value={journalText}
          onChange={(event) => setJournalText(event.target.value)}
          placeholder={t.moonJournalPlaceholder}
          className="lumina-input mt-4 min-h-[220px]"
        />

        <button type="button" onClick={saveEntry} className="lumina-button mt-4 w-full" disabled={!journalText.trim()}>
          {saved ? t.moonJournalSaved : t.moonJournalSave}
        </button>
      </section>

      <section className="mt-6 space-y-3">
        <p className="lumina-section-title">{t.journalPreviousEntries}</p>
        {entries.length ? (
          entries.map((entry) => (
            <article key={entry.date} className="lumina-card p-4">
              <p className="text-xs text-cream/50">{new Date(entry.date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}</p>
              <p className="mt-2 text-sm text-cream/90">{firstLine(entry.text).slice(0, 140)}</p>
            </article>
          ))
        ) : (
          <p className="text-sm text-cream/70">{t.journalNoEntries}</p>
        )}
      </section>
    </div>
  );
}
