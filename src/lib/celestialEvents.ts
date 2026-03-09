import * as Astronomy from 'astronomy-engine';

export type CelestialEvent = {
  date: Date;
  type: 'new_moon' | 'full_moon' | 'retrograde_start' | 'retrograde_end' | 'eclipse' | 'season_change';
  title: { en: string; ru: string };
  description: { en: string; ru: string };
  color: string;
  retrogradePeriod?: { start: Date; end: Date; body: string };
  moonPhase?: 'New Moon' | 'Full Moon';
};

const EVENT_YEAR = 2026;
const DAY_MS = 24 * 60 * 60 * 1000;
const COLORS = {
  moon: '#a78bfa',
  retrograde: '#fb7185',
  eclipse: '#facc15',
  season: '#67e8f9',
} as const;

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function utcDateOnly(input: Date): Date {
  return utcDate(input.getUTCFullYear(), input.getUTCMonth() + 1, input.getUTCDate());
}

function eventDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function sortEvents(events: CelestialEvent[]): CelestialEvent[] {
  return [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
}

const FALLBACK_NEW_MOONS_2026 = [
  '2026-01-18', '2026-02-17', '2026-03-19', '2026-04-17', '2026-05-16', '2026-06-15',
  '2026-07-14', '2026-08-12', '2026-09-11', '2026-10-10', '2026-11-09', '2026-12-09',
];

const FALLBACK_FULL_MOONS_2026 = [
  '2026-01-03', '2026-02-01', '2026-03-03', '2026-04-02', '2026-05-01', '2026-05-31',
  '2026-06-29', '2026-07-29', '2026-08-28', '2026-09-26', '2026-10-26', '2026-11-24', '2026-12-24',
];

function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return utcDate(year, month, day);
}

function moonPhaseFallbackEvents(): CelestialEvent[] {
  const newMoonEvents = FALLBACK_NEW_MOONS_2026.map((date) => ({
    date: fromIsoDate(date),
    type: 'new_moon' as const,
    title: { en: 'New Moon', ru: 'Новолуние' },
    description: {
      en: 'Reset intentions and create space for new beginnings.',
      ru: 'Обновите намерения и создайте пространство для новых начал.',
    },
    color: COLORS.moon,
    moonPhase: 'New Moon' as const,
  }));

  const fullMoonEvents = FALLBACK_FULL_MOONS_2026.map((date) => ({
    date: fromIsoDate(date),
    type: 'full_moon' as const,
    title: { en: 'Full Moon', ru: 'Полнолуние' },
    description: {
      en: 'Emotions peak now; reflect, release, and integrate.',
      ru: 'Эмоции усиливаются; время осмыслить, отпустить и интегрировать.',
    },
    color: COLORS.moon,
    moonPhase: 'Full Moon' as const,
  }));

  return sortEvents([...newMoonEvents, ...fullMoonEvents]);
}

function moonPhaseEventsWithAstronomyEngine(): CelestialEvent[] {
  const start = new Date(Date.UTC(EVENT_YEAR, 0, 1));
  const end = new Date(Date.UTC(EVENT_YEAR + 1, 0, 1));

  const build = (targetLongitude: number, type: 'new_moon' | 'full_moon', phase: 'New Moon' | 'Full Moon'): CelestialEvent[] => {
    const events: CelestialEvent[] = [];
    let cursor = start;

    while (true) {
      const result = Astronomy.SearchMoonPhase(targetLongitude, cursor, 40);
      if (!result) break;

      const dateOnly = utcDateOnly(result.date);
      if (dateOnly >= end) break;
      if (dateOnly >= start) {
        events.push({
          date: dateOnly,
          type,
          title: { en: phase, ru: phase === 'New Moon' ? 'Новолуние' : 'Полнолуние' },
          description: phase === 'New Moon'
            ? {
                en: 'A lunar reset point. Set intentions and plant seeds for the month ahead.',
                ru: 'Точка лунного обновления. Установите намерения и задайте вектор на месяц вперёд.',
              }
            : {
                en: 'A culmination window. Notice what is illuminated and what is ready to release.',
                ru: 'Период кульминации. Заметьте, что стало ясным и что готово к отпусканию.',
              },
          color: COLORS.moon,
          moonPhase: phase,
        });
      }

      cursor = new Date(result.date.getTime() + DAY_MS);
    }

    return events;
  };

  return sortEvents([...build(0, 'new_moon', 'New Moon'), ...build(180, 'full_moon', 'Full Moon')]);
}

type RetrogradeRange = {
  body: string;
  start: Date;
  end: Date;
};

const RETROGRADE_RANGES_2026: RetrogradeRange[] = [
  { body: 'Mercury', start: utcDate(2026, 2, 27), end: utcDate(2026, 3, 22) },
  { body: 'Mercury', start: utcDate(2026, 7, 1), end: utcDate(2026, 7, 25) },
  { body: 'Mercury', start: utcDate(2026, 10, 25), end: utcDate(2026, 11, 15) },
  { body: 'Venus', start: utcDate(2026, 3, 1), end: utcDate(2026, 4, 12) },
  { body: 'Saturn', start: utcDate(2026, 7, 26), end: utcDate(2026, 12, 10) },
  { body: 'Jupiter', start: utcDate(2026, 11, 11), end: utcDate(2027, 3, 11) },
  { body: 'Jupiter', start: utcDate(2025, 10, 9), end: utcDate(2026, 2, 4) },
];

function retrogradeEvents(): CelestialEvent[] {
  const events: CelestialEvent[] = [];

  for (const period of RETROGRADE_RANGES_2026) {
    if (period.start.getUTCFullYear() === EVENT_YEAR) {
      events.push({
        date: period.start,
        type: 'retrograde_start',
        title: {
          en: `${period.body} Retrograde Begins`,
          ru: `Ретроградный ${period.body === 'Mercury' ? 'Меркурий' : period.body === 'Venus' ? 'Венера' : period.body === 'Saturn' ? 'Сатурн' : 'Юпитер'} начинается`,
        },
        description: {
          en: `${period.body} appears to move backward. Slow down, review, and revise your plans.`,
          ru: `${period.body === 'Mercury' ? 'Меркурий' : period.body === 'Venus' ? 'Венера' : period.body === 'Saturn' ? 'Сатурн' : 'Юпитер'} визуально движется назад. Снизьте темп, пересмотрите и уточните планы.`,
        },
        color: COLORS.retrograde,
        retrogradePeriod: period,
      });
    }

    if (period.end.getUTCFullYear() === EVENT_YEAR) {
      events.push({
        date: period.end,
        type: 'retrograde_end',
        title: {
          en: `${period.body} Retrograde Ends`,
          ru: `Ретроградный ${period.body === 'Mercury' ? 'Меркурий' : period.body === 'Venus' ? 'Венера' : period.body === 'Saturn' ? 'Сатурн' : 'Юпитер'} заканчивается`,
        },
        description: {
          en: `${period.body} turns direct. Integrate lessons and move forward with clarity.`,
          ru: `${period.body === 'Mercury' ? 'Меркурий' : period.body === 'Venus' ? 'Венера' : period.body === 'Saturn' ? 'Сатурн' : 'Юпитер'} возвращается в прямое движение. Интегрируйте выводы и двигайтесь дальше яснее.`,
        },
        color: COLORS.retrograde,
        retrogradePeriod: period,
      });
    }
  }

  return sortEvents(events);
}

function seasonEvents(): CelestialEvent[] {
  try {
    const seasons = Astronomy.Seasons(EVENT_YEAR);
    return sortEvents([
      {
        date: utcDateOnly(seasons.mar_equinox.date),
        type: 'season_change',
        title: { en: 'March Equinox', ru: 'Мартовское равноденствие' },
        description: {
          en: 'Balance point between day and night. Astrologically, Aries season begins.',
          ru: 'Точка баланса дня и ночи. Астрологически начинается сезон Овна.',
        },
        color: COLORS.season,
      },
      {
        date: utcDateOnly(seasons.jun_solstice.date),
        type: 'season_change',
        title: { en: 'June Solstice', ru: 'Июньское солнцестояние' },
        description: {
          en: 'Peak solar light in the northern hemisphere. Cancer season begins.',
          ru: 'Пик солнечного света в северном полушарии. Начинается сезон Рака.',
        },
        color: COLORS.season,
      },
      {
        date: utcDateOnly(seasons.sep_equinox.date),
        type: 'season_change',
        title: { en: 'September Equinox', ru: 'Сентябрьское равноденствие' },
        description: {
          en: 'Another point of balance. Libra season begins.',
          ru: 'Ещё одна точка баланса. Начинается сезон Весов.',
        },
        color: COLORS.season,
      },
      {
        date: utcDateOnly(seasons.dec_solstice.date),
        type: 'season_change',
        title: { en: 'December Solstice', ru: 'Декабрьское солнцестояние' },
        description: {
          en: 'The Sun reaches its annual turning point. Capricorn season begins.',
          ru: 'Солнце достигает годовой поворотной точки. Начинается сезон Козерога.',
        },
        color: COLORS.season,
      },
    ]);
  } catch {
    return [
      {
        date: utcDate(2026, 3, 20),
        type: 'season_change',
        title: { en: 'March Equinox', ru: 'Мартовское равноденствие' },
        description: { en: 'Astrological new year alignment point.', ru: 'Точка астрологического обновления года.' },
        color: COLORS.season,
      },
      {
        date: utcDate(2026, 6, 21),
        type: 'season_change',
        title: { en: 'June Solstice', ru: 'Июньское солнцестояние' },
        description: { en: 'Solar peak of the year in the north.', ru: 'Солнечный пик года в северном полушарии.' },
        color: COLORS.season,
      },
      {
        date: utcDate(2026, 9, 23),
        type: 'season_change',
        title: { en: 'September Equinox', ru: 'Сентябрьское равноденствие' },
        description: { en: 'Day and night return to balance.', ru: 'День и ночь снова в балансе.' },
        color: COLORS.season,
      },
      {
        date: utcDate(2026, 12, 21),
        type: 'season_change',
        title: { en: 'December Solstice', ru: 'Декабрьское солнцестояние' },
        description: { en: 'Seasonal turning point and reset.', ru: 'Сезонный поворот и перезапуск.' },
        color: COLORS.season,
      },
    ];
  }
}

function eclipseEvents(): CelestialEvent[] {
  return sortEvents([
    {
      date: utcDate(2026, 2, 17),
      type: 'eclipse',
      title: { en: 'Annular Solar Eclipse', ru: 'Кольцевое солнечное затмение' },
      description: {
        en: 'A reset around identity, direction, and future decisions.',
        ru: 'Перезагрузка тем личности, направления и решений на будущее.',
      },
      color: COLORS.eclipse,
    },
    {
      date: utcDate(2026, 3, 3),
      type: 'eclipse',
      title: { en: 'Total Lunar Eclipse', ru: 'Полное лунное затмение' },
      description: {
        en: 'Emotional release and culmination of long-running patterns.',
        ru: 'Эмоциональное отпускание и кульминация длительных паттернов.',
      },
      color: COLORS.eclipse,
    },
    {
      date: utcDate(2026, 8, 12),
      type: 'eclipse',
      title: { en: 'Total Solar Eclipse', ru: 'Полное солнечное затмение' },
      description: {
        en: 'A major initiatory portal for new intentions and identity shifts.',
        ru: 'Сильный портал инициации для новых намерений и смены идентичности.',
      },
      color: COLORS.eclipse,
    },
    {
      date: utcDate(2026, 8, 28),
      type: 'eclipse',
      title: { en: 'Partial Lunar Eclipse', ru: 'Частичное лунное затмение' },
      description: {
        en: 'A subtle but meaningful emotional and relational turning point.',
        ru: 'Мягкая, но значимая точка эмоционального и отношенческого поворота.',
      },
      color: COLORS.eclipse,
    },
  ]);
}

function build2026Events(): CelestialEvent[] {
  const moonEvents = (() => {
    try {
      return moonPhaseEventsWithAstronomyEngine();
    } catch {
      return moonPhaseFallbackEvents();
    }
  })();

  return sortEvents([...moonEvents, ...retrogradeEvents(), ...seasonEvents(), ...eclipseEvents()]);
}

const PRECOMPUTED_2026_EVENTS = build2026Events();

export function getCelestialEventsForYear(year: number): CelestialEvent[] {
  if (year !== EVENT_YEAR) return [];
  return PRECOMPUTED_2026_EVENTS;
}

export function getEventsForMonth(monthDate: Date): CelestialEvent[] {
  return PRECOMPUTED_2026_EVENTS.filter(
    (event) => event.date.getFullYear() === monthDate.getFullYear() && event.date.getMonth() === monthDate.getMonth()
  );
}

export function getEventsForDate(date: Date): CelestialEvent[] {
  const key = eventDateKey(date);
  return PRECOMPUTED_2026_EVENTS.filter((event) => eventDateKey(event.date) === key);
}

export function getUpcomingCelestialEvents(startDate: Date, days = 7): CelestialEvent[] {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(start.getTime() + days * DAY_MS);

  return PRECOMPUTED_2026_EVENTS.filter((event) => {
    const eventDay = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate());
    return eventDay >= start && eventDay < end;
  });
}

export function getRetrogradeProgress(period: { start: Date; end: Date }, referenceDate: Date): number {
  const total = period.end.getTime() - period.start.getTime();
  if (total <= 0) return 0;
  const elapsed = referenceDate.getTime() - period.start.getTime();
  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 100;
  return Math.round((elapsed / total) * 100);
}
