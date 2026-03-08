'use client';

import type { CelestialEvent } from '@/lib/celestialEvents';

type CalendarViewProps = {
  currentMonth: Date;
  selectedDate: Date;
  onMonthChange: (nextMonth: Date) => void;
  onSelectDate: (date: Date) => void;
  events: CelestialEvent[];
  language: 'en' | 'ru';
};

function monthLabel(month: Date, language: 'en' | 'ru'): string {
  return month.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function CalendarView({
  currentMonth,
  selectedDate,
  onMonthChange,
  onSelectDate,
  events,
  language,
}: CalendarViewProps) {
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startWeekDay = monthStart.getDay();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const today = new Date();

  const days: Array<Date | null> = [];
  for (let i = 0; i < startWeekDay; i += 1) days.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }

  const eventsByDay = events.reduce<Record<string, CelestialEvent[]>>((map, event) => {
    const key = dateKey(event.date);
    if (!map[key]) map[key] = [];
    map[key].push(event);
    return map;
  }, {});

  const weekdayLabels = language === 'ru'
    ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <section className="glass-card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          className="profile-btn"
          aria-label={language === 'ru' ? 'Предыдущий месяц' : 'Previous month'}
        >
          ←
        </button>
        <h2 className="font-heading text-2xl capitalize text-[#FDFBF7]">{monthLabel(currentMonth, language)}</h2>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
          className="profile-btn"
          aria-label={language === 'ru' ? 'Следующий месяц' : 'Next month'}
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-[#8D8B9F]">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-1 uppercase tracking-[0.12em]">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-14 rounded-xl border border-transparent" aria-hidden="true" />;
          }

          const key = dateKey(date);
          const dayEvents = eventsByDay[key] ?? [];
          const selected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`relative h-14 rounded-xl border p-1.5 text-left transition ${
                selected
                  ? 'border-white/[0.16] bg-white/[0.08] shadow-[0_0_0_1px_rgba(253,251,247,0.08)]'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/[0.16]'
              }`}
            >
              <span
                className={`text-sm ${
                  isToday ? 'font-semibold text-[#C8A4A4]' : selected ? 'text-[#FDFBF7]' : 'text-[#C0BDD6]'
                }`}
              >
                {date.getDate()}
              </span>
              {dayEvents.length ? (
                <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                  {dayEvents.slice(0, 3).map((event, idx) => (
                    <span
                      key={`${event.type}-${idx}`}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: event.color }}
                      aria-hidden="true"
                    />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
