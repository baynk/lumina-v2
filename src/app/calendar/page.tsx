'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import MoonPhaseVisual from '@/components/MoonPhaseVisual';
import { useLanguage } from '@/context/LanguageContext';
import {
  CelestialEvent,
  getCelestialEventsForYear,
  getEventsForDate,
  getEventsForMonth,
  getRetrogradeProgress,
  getUpcomingCelestialEvents,
} from '@/lib/celestialEvents';

const COPY = {
  en: {
    title: 'Celestial Calendar',
    subtitle: 'Track upcoming transits, retrogrades, and lunar events.',
    selectedDay: 'Selected Day',
    upcoming: 'Upcoming 7 Days',
    empty: 'No notable events in this period.',
    unsupportedYear: 'Event data is currently precomputed for 2026 only.',
    retrogradeProgress: 'Retrograde progress',
  },
  ru: {
    title: 'Небесный календарь',
    subtitle: 'Отслеживайте ближайшие транзиты, ретрограды и лунные события.',
    selectedDay: 'Выбранный день',
    upcoming: 'Ближайшие 7 дней',
    empty: 'В этот период значимых событий нет.',
    unsupportedYear: 'Данные событий сейчас предрасчитаны только для 2026 года.',
    retrogradeProgress: 'Прогресс ретрограда',
  },
} as const;

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function eventIcon(event: CelestialEvent): string {
  if (event.type === 'new_moon') return '🌑';
  if (event.type === 'full_moon') return '🌕';
  if (event.type === 'eclipse') return '🌘';
  if (event.type === 'season_change') return '☀️';
  if (event.type === 'retrograde_start') return '↺';
  return '↻';
}

export default function CalendarPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const copy = COPY[language];
  const yearEvents = useMemo(() => getCelestialEventsForYear(currentMonth.getFullYear()), [currentMonth]);
  const monthEvents = useMemo(() => getEventsForMonth(currentMonth), [currentMonth]);
  const dayEvents = useMemo(() => getEventsForDate(selectedDate), [selectedDate]);

  const listEvents = useMemo(() => {
    if (dayEvents.length) return dayEvents;
    return getUpcomingCelestialEvents(selectedDate, 7);
  }, [dayEvents, selectedDate]);

  const listLabel = dayEvents.length ? copy.selectedDay : copy.upcoming;

  return (
    <div className="lumina-screen">
      <div className="aura left-[-24%] top-[6%] h-[280px] w-[280px] bg-[#5A438A]/34" />
      <div className="aura right-[-20%] top-[24%] h-[280px] w-[280px] bg-[#18244D]/32" />
      <div className="aura bottom-[-12%] left-[16%] h-[250px] w-[250px] bg-[#2E1B54]/34" />
      <div className="mx-auto max-w-4xl px-4 pb-28 pt-2 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <button type="button" onClick={() => router.push('/')} className="min-h-11 rounded-full px-3 text-sm text-[#8D8B9F] transition hover:text-[#FDFBF7]">
          ← {t.back}
        </button>
        <h1 className="font-heading text-3xl text-[#FDFBF7]">{copy.title}</h1>
        <div className="w-14" />
      </header>

      <section className="glass-card mb-4 p-4 sm:p-5">
        <p className="text-sm text-[#8D8B9F]">{copy.subtitle}</p>
      </section>

      <CalendarView
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        onMonthChange={setCurrentMonth}
        onSelectDate={setSelectedDate}
        events={monthEvents}
        language={language}
      />

      {!yearEvents.length ? (
        <p className="mt-4 text-sm text-[#C8A4A4]">{copy.unsupportedYear}</p>
      ) : null}

      <section className="mt-6 space-y-3">
        <p className="lumina-section-title">{listLabel}</p>
        {listEvents.length ? (
          listEvents.map((event) => {
            const showRetrograde = event.type === 'retrograde_start' || event.type === 'retrograde_end';
            const progress = showRetrograde && event.retrogradePeriod
              ? getRetrogradeProgress(event.retrogradePeriod, new Date())
              : 0;
            const showMoon = event.type === 'new_moon' || event.type === 'full_moon';

            return (
              <article key={`${event.type}-${event.date.toISOString()}-${event.title.en}`} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#8D8B9F]">
                      {event.date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <h3 className="mt-1 font-heading text-xl text-[#FDFBF7]">
                      <span className="mr-2" aria-hidden="true">
                        {eventIcon(event)}
                      </span>
                      {event.title[language]}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#8D8B9F]">{event.description[language]}</p>
                  </div>
                  {showMoon ? (
                    <div className="hidden scale-50 sm:block">
                      <MoonPhaseVisual illumination={event.type === 'new_moon' ? 0 : 100} phase={event.moonPhase ?? 'New Moon'} />
                    </div>
                  ) : null}
                </div>

                {showRetrograde && event.retrogradePeriod ? (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-[#8D8B9F]">
                      <span>{copy.retrogradeProgress}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#C8A4A4,#C0BDD6)]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="text-sm text-[#8D8B9F]">{copy.empty}</p>
        )}
      </section>
    </div>
    </div>
  );
}
