'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Moon, Sparkles } from 'lucide-react';
import MoonPhaseVisual from '@/components/MoonPhaseVisual';
import { calculateDailyCelestialData } from '@/lib/astronomyCalculator';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile } from '@/lib/profile';
import { translateMoonPhase } from '@/lib/translations';
import type { MoonRitualResponse } from '@/types';

type JournalSections = {
  intention: string;
  reflection: string;
  gratitude: string;
  release?: string;
};

type LocalOrDbEntry = {
  date: string;
  moonPhase: string;
  entries: JournalSections;
};

const JOURNAL_PREFIX = 'lumina_moon_journal_';

const EMPTY_SECTIONS: JournalSections = {
  intention: '',
  reflection: '',
  gratitude: '',
  release: '',
};

function normalizeSections(value: unknown): JournalSections {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_SECTIONS };
  }

  const source = value as Record<string, unknown>;
  const intention = typeof source.intention === 'string' ? source.intention : '';
  const reflection = typeof source.reflection === 'string' ? source.reflection : '';
  const gratitude = typeof source.gratitude === 'string' ? source.gratitude : '';
  const release = typeof source.release === 'string' ? source.release : '';
  return { intention, reflection, gratitude, release };
}

function parseLocalPayload(raw: string): JournalSections {
  try {
    return normalizeSections(JSON.parse(raw));
  } catch {
    return {
      intention: '',
      reflection: raw,
      gratitude: '',
      release: '',
    };
  }
}

function firstLine(text: string): string {
  return text.split('\n').map((line) => line.trim()).find((line) => line.length > 0) || text.trim();
}

function isReleaseMoon(phase: string): boolean {
  const normalized = phase.toLowerCase();
  return normalized.includes('full') || normalized.includes('waning') || normalized.includes('last quarter') || normalized.includes('third quarter');
}

function getSunSign(month: number, day: number): string {
  const signs = [
    { sign: 'Capricorn', start: [1, 1], end: [1, 19] },
    { sign: 'Aquarius', start: [1, 20], end: [2, 18] },
    { sign: 'Pisces', start: [2, 19], end: [3, 20] },
    { sign: 'Aries', start: [3, 21], end: [4, 19] },
    { sign: 'Taurus', start: [4, 20], end: [5, 20] },
    { sign: 'Gemini', start: [5, 21], end: [6, 20] },
    { sign: 'Cancer', start: [6, 21], end: [7, 22] },
    { sign: 'Leo', start: [7, 23], end: [8, 22] },
    { sign: 'Virgo', start: [8, 23], end: [9, 22] },
    { sign: 'Libra', start: [9, 23], end: [10, 22] },
    { sign: 'Scorpio', start: [10, 23], end: [11, 21] },
    { sign: 'Sagittarius', start: [11, 22], end: [12, 21] },
    { sign: 'Capricorn', start: [12, 22], end: [12, 31] },
  ];

  for (const item of signs) {
    if ((month === item.start[0] && day >= item.start[1]) || (month === item.end[0] && day <= item.end[1])) {
      return item.sign;
    }
  }

  return 'Aries';
}

function getSunSignForRitual(): string {
  const profile = loadProfile();
  if (profile?.birthData) {
    return getSunSign(profile.birthData.month + 1, profile.birthData.day);
  }

  const now = new Date();
  return getSunSign(now.getMonth() + 1, now.getDate());
}

function sectionPrompt(section: keyof JournalSections, phase: string, language: 'en' | 'ru'): string {
  const normalized = phase.toLowerCase();
  const isNew = normalized.includes('new');
  const isFull = normalized.includes('full');
  const isWaxing = normalized.includes('waxing') || normalized.includes('first quarter');

  if (language === 'ru') {
    if (section === 'intention') {
      if (isNew) return 'Какое семя намерения ты хочешь посадить в этом лунном цикле?';
      if (isWaxing) return 'На чем ты хочешь укрепить фокус, пока энергия растет?';
      if (isFull) return 'Какое намерение сейчас вышло на пик?';
      return 'Что для тебя сейчас по-настоящему важно завершить осознанно?';
    }
    if (section === 'reflection') {
      if (isNew) return 'Какие мысли или ощущения были самыми заметными сегодня?';
      if (isWaxing) return 'Что сегодня поддержало твой рост, а что отвлекало?';
      if (isFull) return 'Что стало для тебя яснее и заметнее сегодня?';
      return 'Что сегодня попросило замедлиться и пересмотреть свои шаги?';
    }
    if (section === 'gratitude') {
      return 'За что ты благодарна сегодня, даже если это что-то маленькое?';
    }
    return 'Что ты готова отпустить с любовью, чтобы освободить место новому?';
  }

  if (section === 'intention') {
    if (isNew) return 'What intention are you planting for this lunar cycle?';
    if (isWaxing) return 'What focus are you strengthening as energy grows?';
    if (isFull) return 'Which intention has reached its peak right now?';
    return 'What matters most for you to complete with care now?';
  }
  if (section === 'reflection') {
    if (isNew) return 'What thoughts or emotions stood out most today?';
    if (isWaxing) return 'What supported your growth today, and what distracted you?';
    if (isFull) return 'What became clearer for you today?';
    return 'What asked you to slow down and recalibrate today?';
  }
  if (section === 'gratitude') {
    return 'What are you grateful for today, even if it feels small?';
  }
  return 'What are you ready to release with love?';
}

function localEntryMoonPhase(date: string): string {
  try {
    return calculateDailyCelestialData(new Date(`${date}T12:00:00`)).moon.phase;
  } catch {
    return 'New Moon';
  }
}

export default function JournalPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { status: sessionStatus } = useSession();

  const [moonPhase, setMoonPhase] = useState('New Moon');
  const [moonIllumination, setMoonIllumination] = useState(0);
  const [entry, setEntry] = useState<JournalSections>({ ...EMPTY_SECTIONS });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<LocalOrDbEntry[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [ritual, setRitual] = useState<MoonRitualResponse | null>(null);
  const [loadingRitual, setLoadingRitual] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayKey = useMemo(() => `${JOURNAL_PREFIX}${today}`, [today]);

  const showRelease = isReleaseMoon(moonPhase);
  const trimmedEntry = {
    intention: entry.intention.trim(),
    reflection: entry.reflection.trim(),
    gratitude: entry.gratitude.trim(),
    release: (entry.release || '').trim(),
  };
  const hasContent = Boolean(
    trimmedEntry.intention || trimmedEntry.reflection || trimmedEntry.gratitude || (showRelease && trimmedEntry.release)
  );

  const loadLocalEntries = () => {
    const localItems: LocalOrDbEntry[] = [];

    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(JOURNAL_PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw || !raw.trim()) continue;
      const date = key.slice(JOURNAL_PREFIX.length);
      localItems.push({
        date,
        moonPhase: localEntryMoonPhase(date),
        entries: parseLocalPayload(raw),
      });
    }

    localItems.sort((a, b) => (a.date < b.date ? 1 : -1));
    return localItems;
  };

  const applyEntriesWithToday = (items: LocalOrDbEntry[]) => {
    setEntries(items);
    const todayEntry = items.find((item) => item.date === today);
    if (todayEntry) {
      setEntry(normalizeSections(todayEntry.entries));
    }
  };

  const loadDbEntries = async () => {
    const response = await fetch('/api/journal', { cache: 'no-store' });
    if (!response.ok) return null;
    const payload = (await response.json()) as { entries?: Array<{ date: string; moon_phase: string; entries: JournalSections }> };
    const dbEntries = (payload.entries || []).map((item) => ({
      date: item.date,
      moonPhase: item.moon_phase || 'New Moon',
      entries: normalizeSections(item.entries),
    }));
    return dbEntries;
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
  }, []);

  useEffect(() => {
    const localItems = loadLocalEntries();
    applyEntriesWithToday(localItems);

    if (sessionStatus !== 'authenticated') return;

    (async () => {
      const dbItems = await loadDbEntries();
      if (!dbItems) return;

      const merged = new Map<string, LocalOrDbEntry>();
      localItems.forEach((item) => merged.set(item.date, item));
      dbItems.forEach((item) => merged.set(item.date, item));
      const combined = Array.from(merged.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
      applyEntriesWithToday(combined);
    })();
  }, [sessionStatus, todayKey]);

  const saveEntry = async () => {
    setSaving(true);
    const localPayload: JournalSections = {
      intention: trimmedEntry.intention,
      reflection: trimmedEntry.reflection,
      gratitude: trimmedEntry.gratitude,
      release: showRelease ? trimmedEntry.release : '',
    };

    window.localStorage.setItem(todayKey, JSON.stringify(localPayload));

    if (sessionStatus === 'authenticated') {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          entries: localPayload,
          moon_phase: moonPhase,
        }),
      });
    }

    const localItems = loadLocalEntries();

    if (sessionStatus === 'authenticated') {
      const dbItems = await loadDbEntries();
      if (dbItems) {
        const merged = new Map<string, LocalOrDbEntry>();
        localItems.forEach((item) => merged.set(item.date, item));
        dbItems.forEach((item) => merged.set(item.date, item));
        const combined = Array.from(merged.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
        applyEntriesWithToday(combined);
      } else {
        applyEntriesWithToday(localItems);
      }
    } else {
      applyEntriesWithToday(localItems);
    }

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
    setSaving(false);

    setLoadingRitual(true);
    try {
      const ritualRes = await fetch('/api/moon-ritual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moonPhase,
          sunSign: getSunSignForRitual(),
          language,
        }),
      });
      const ritualPayload = (await ritualRes.json()) as MoonRitualResponse;
      if (ritualPayload?.title && ritualPayload?.summary) {
        setRitual(ritualPayload);
      } else {
        setRitual(null);
      }
    } catch {
      setRitual(null);
    } finally {
      setLoadingRitual(false);
    }
  };

  const pastEntries = entries.filter((item) => item.date !== today);

  return (
    <div className="lumina-screen">
      <div className="aura aura-violet left-[-24%] top-[6%] h-[280px] w-[280px]" />
      <div className="aura aura-blue right-[-20%] top-[24%] h-[280px] w-[280px]" />
      <div className="aura aura-indigo bottom-[-12%] left-[16%] h-[250px] w-[250px]" />
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-2 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <button type="button" onClick={() => router.push('/')} className="min-h-11 rounded-full px-3 text-sm text-[#8D8B9F] transition hover:text-[#FDFBF7]">
          ← {t.back}
        </button>
        <h1 className="font-heading text-3xl text-[#FDFBF7]">{t.journalTitle}</h1>
        <div className="w-14" />
      </header>

      <section className="glass-card mb-6 p-5 sm:p-6 animate-stagger-1">
        <p className="lumina-section-title">{t.moonPhase}</p>
        <div className="mt-3 flex flex-col items-center justify-center text-center">
          <div className="animate-float">
            <MoonPhaseVisual illumination={moonIllumination} phase={moonPhase} />
          </div>
          <p className="mt-2 inline-flex items-center gap-2 font-heading text-2xl text-[#FDFBF7]"><Moon className="text-[#C8A4A4]" size={22} strokeWidth={1.5} />{translateMoonPhase(moonPhase, language)}</p>
          <p className="mt-1 text-xs text-[#8D8B9F]">{t.illumination}: {moonIllumination}%</p>
          <div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-lumina-accent transition-all duration-700" style={{ width: `${moonIllumination}%` }} aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="glass-card p-5 sm:p-6 animate-stagger-2">
        <div className="space-y-4">
          <div className="transition-all duration-500">
            <p className="font-heading text-xl text-[#FDFBF7]">Intention / Намерение</p>
            <p className="mt-1 text-xs text-[#8D8B9F]">{sectionPrompt('intention', moonPhase, language)}</p>
            <textarea
              value={entry.intention}
              onChange={(event) => setEntry((prev) => ({ ...prev, intention: event.target.value }))}
              className="lumina-input mt-2 min-h-[120px] transition-all duration-300"
            />
          </div>

          <div className="transition-all duration-500">
            <p className="font-heading text-xl text-[#FDFBF7]">Reflection / Размышление</p>
            <p className="mt-1 text-xs text-[#8D8B9F]">{sectionPrompt('reflection', moonPhase, language)}</p>
            <textarea
              value={entry.reflection}
              onChange={(event) => setEntry((prev) => ({ ...prev, reflection: event.target.value }))}
              className="lumina-input mt-2 min-h-[140px] transition-all duration-300"
            />
          </div>

          <div className="transition-all duration-500">
            <p className="font-heading text-xl text-[#FDFBF7]">Gratitude / Благодарность</p>
            <p className="mt-1 text-xs text-[#8D8B9F]">{sectionPrompt('gratitude', moonPhase, language)}</p>
            <textarea
              value={entry.gratitude}
              onChange={(event) => setEntry((prev) => ({ ...prev, gratitude: event.target.value }))}
              className="lumina-input mt-2 min-h-[110px] transition-all duration-300"
            />
          </div>

          {showRelease ? (
            <div className="transition-all duration-500">
              <p className="font-heading text-xl text-[#FDFBF7]">Release / Отпускание</p>
              <p className="mt-1 text-xs text-[#8D8B9F]">{sectionPrompt('release', moonPhase, language)}</p>
              <textarea
                value={entry.release}
                onChange={(event) => setEntry((prev) => ({ ...prev, release: event.target.value }))}
                className="lumina-input mt-2 min-h-[110px] transition-all duration-300"
              />
            </div>
          ) : null}
        </div>

        <button type="button" onClick={saveEntry} className="lumina-button mt-5 w-full" disabled={!hasContent || saving}>
          {saving ? (language === 'ru' ? 'Сохранение...' : 'Saving...') : saved ? t.moonJournalSaved : t.moonJournalSave}
        </button>
      </section>

      {loadingRitual || ritual ? (
        <section className="glass-card mt-6 overflow-hidden border-lumina-accent/30 bg-gradient-to-br from-[#181336]/70 via-[#111633]/65 to-[#1b1540]/70 p-6 animate-stagger-3">
          <p className="inline-flex items-center gap-2 font-heading text-2xl text-lumina-soft"><Sparkles className="text-[#C8A4A4]" size={20} strokeWidth={1.5} />{language === 'ru' ? 'Лунный ритуал' : 'Moon Ritual'}</p>
          {loadingRitual ? (
            <div className="mt-4 space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-4/6" />
            </div>
          ) : ritual ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[#C0BDD6]">{ritual.title}</p>
              <p className="text-base text-[#FDFBF7]">{ritual.summary}</p>
              {ritual.prompts?.length ? (
                <ul className="space-y-2">
                  {ritual.prompts.map((item, index) => (
                    <li key={`${item}-${index}`} className="lumina-card px-4 py-3 text-sm text-[#FDFBF7]">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-6 space-y-3 animate-stagger-4">
        <p className="lumina-section-title">{t.journalPreviousEntries}</p>
        {pastEntries.length ? (
          pastEntries.map((item) => {
            const expanded = expandedDate === item.date;
            return (
              <article key={item.date} className="lumina-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedDate((prev) => (prev === item.date ? null : item.date))}
                  className="w-full p-4 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-[#8D8B9F]">
                      {new Date(`${item.date}T12:00:00`).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
                    </p>
                    <p className="inline-flex items-center gap-2 text-sm text-[#FDFBF7]"><Moon className="text-[#C8A4A4]" size={16} strokeWidth={1.5} />{translateMoonPhase(item.moonPhase, language)}</p>
                  </div>
                  <p className="mt-2 text-sm text-[#C0BDD6]">{firstLine(item.entries.reflection || item.entries.intention || '').slice(0, 160)}</p>
                </button>
                {expanded ? (
                  <div className="animate-fadeInUp border-t border-white/10 px-4 py-4 text-sm text-[#C0BDD6]">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8D8B9F]">Intention / Намерение</p>
                    <p className="mt-1 whitespace-pre-wrap">{item.entries.intention || '—'}</p>
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#8D8B9F]">Reflection / Размышление</p>
                    <p className="mt-1 whitespace-pre-wrap">{item.entries.reflection || '—'}</p>
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#8D8B9F]">Gratitude / Благодарность</p>
                    <p className="mt-1 whitespace-pre-wrap">{item.entries.gratitude || '—'}</p>
                    {item.entries.release ? (
                      <>
                        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#8D8B9F]">Release / Отпускание</p>
                        <p className="mt-1 whitespace-pre-wrap">{item.entries.release}</p>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="text-sm text-[#8D8B9F]">{t.journalNoEntries}</p>
        )}
      </section>
    </div>
    </div>
  );
}
