'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ShareCard from '@/components/ShareCard';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile } from '@/lib/profile';
import { translateAspectType, translatePlanet, translateSign } from '@/lib/translations';
import type { BirthData, SynastryAspect, SynastryData, SynastryNarrative } from '@/types';

type LocationResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

type PersonFormState = {
  name: string;
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
  locationQuery: string;
  selectedLocationName: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  searchResults: LocationResult[];
  searching: boolean;
};

type SynastryResponse = {
  synastry: SynastryData;
  interpretation: SynastryNarrative;
};

const months = Array.from({ length: 12 }, (_, idx) => idx + 1);
const days = Array.from({ length: 31 }, (_, idx) => idx + 1);
const years = Array.from({ length: 100 }, (_, idx) => new Date().getFullYear() - idx);
const hours = Array.from({ length: 24 }, (_, idx) => idx);
const minutes = Array.from({ length: 60 }, (_, idx) => idx);

const initialPerson = (): PersonFormState => ({
  name: '',
  day: '',
  month: '',
  year: '',
  hour: '',
  minute: '',
  locationQuery: '',
  selectedLocationName: '',
  latitude: null,
  longitude: null,
  timezone: 'UTC',
  searchResults: [],
  searching: false,
});

function RadarChart({
  values,
}: {
  values: { label: string; value: number }[];
}) {
  const center = 130;
  const radius = 95;
  const points = values
    .map((item, index) => {
      const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
      const x = center + Math.cos(angle) * radius * (item.value / 100);
      const y = center + Math.sin(angle) * radius * (item.value / 100);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 260 260" className="mx-auto w-full max-w-[280px]">
      {[20, 40, 60, 80, 100].map((level) => (
        <polygon
          key={level}
          points={values
            .map((_, index) => {
              const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
              const x = center + Math.cos(angle) * radius * (level / 100);
              const y = center + Math.sin(angle) * radius * (level / 100);
              return `${x},${y}`;
            })
            .join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1"
        />
      ))}
      {values.map((item, index) => {
        const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        const lx = center + Math.cos(angle) * (radius + 18);
        const ly = center + Math.sin(angle) * (radius + 18);

        return (
          <g key={item.label}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <text x={lx} y={ly} fill="rgba(245,240,235,0.85)" fontSize="9" textAnchor="middle" dominantBaseline="middle">
              {item.label}
            </text>
          </g>
        );
      })}
      <polygon points={points} fill="rgba(167,139,250,0.25)" stroke="rgba(196,181,253,0.95)" strokeWidth="2" />
    </svg>
  );
}

function AspectMeaning({ aspect, language }: { aspect: SynastryAspect; language: 'en' | 'ru' }) {
  const text =
    language === 'ru'
      ? `Твоя ${translatePlanet(aspect.planetA, language)} в ${translateSign(aspect.signA, language)} образует ${translateAspectType(aspect.type, language).toLowerCase()} с ${translatePlanet(aspect.planetB, language)} партнёра в ${translateSign(aspect.signB, language)}. ${aspect.meaning}`
      : `Your ${aspect.planetA} in ${aspect.signA} forms a ${aspect.type} with their ${aspect.planetB} in ${aspect.signB}. ${aspect.meaning}`;
  return <p className="text-sm leading-relaxed text-warmWhite">{text}</p>;
}

export default function SynastryPage() {
  const router = useRouter();
  const { language, t } = useLanguage();

  const [personA, setPersonA] = useState<PersonFormState>(initialPerson);
  const [personB, setPersonB] = useState<PersonFormState>(initialPerson);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SynastryResponse | null>(null);
  const [openSection, setOpenSection] = useState<keyof SynastryNarrative>('overallConnection');

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setPersonA((prev) => ({ ...prev, timezone }));
    setPersonB((prev) => ({ ...prev, timezone }));
  }, []);

  useEffect(() => {
    const profile = loadProfile();
    if (!profile) return;

    setPersonA((prev) => ({
      ...prev,
      name: profile.name || t.synastryPersonALabel,
      day: String(profile.birthData.day).padStart(2, '0'),
      month: String(profile.birthData.month + 1).padStart(2, '0'),
      year: String(profile.birthData.year),
      hour: String(profile.birthData.hour).padStart(2, '0'),
      minute: String(profile.birthData.minute).padStart(2, '0'),
      locationQuery: profile.locationName,
      selectedLocationName: profile.locationName,
      latitude: profile.birthData.latitude,
      longitude: profile.birthData.longitude,
      timezone: profile.birthData.timezone,
    }));
  }, [t.synastryPersonALabel]);

  const searchLocation = async (query: string, target: 'A' | 'B') => {
    const update = target === 'A' ? setPersonA : setPersonB;
    if (query.trim().length < 2) {
      update((prev) => ({ ...prev, searchResults: [] }));
      return;
    }

    update((prev) => ({ ...prev, searching: true }));
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      );
      const payload = (await response.json()) as LocationResult[];
      update((prev) => ({ ...prev, searchResults: payload, searching: false }));
    } catch {
      update((prev) => ({ ...prev, searchResults: [], searching: false }));
    }
  };

  const selectLocation = async (item: LocationResult, target: 'A' | 'B') => {
    const update = target === 'A' ? setPersonA : setPersonB;
    const lat = Number.parseFloat(item.lat);
    const lon = Number.parseFloat(item.lon);

    let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    try {
      const response = await fetch(`/api/timezone?lat=${lat}&lon=${lon}`);
      const payload = (await response.json()) as { timezone?: string };
      if (payload.timezone) timezone = payload.timezone;
    } catch {
      // keep browser fallback
    }

    update((prev) => ({
      ...prev,
      locationQuery: item.display_name,
      selectedLocationName: item.display_name,
      latitude: lat,
      longitude: lon,
      timezone,
      searchResults: [],
    }));
  };

  const canSubmit = useMemo(() => {
    const valid = (person: PersonFormState) =>
      person.day &&
      person.month &&
      person.year &&
      person.hour &&
      person.minute &&
      person.selectedLocationName &&
      person.latitude !== null &&
      person.longitude !== null;
    return valid(personA) && valid(personB);
  }, [personA, personB]);

  const toBirthData = (person: PersonFormState): BirthData => ({
    year: Number.parseInt(person.year, 10),
    month: Number.parseInt(person.month, 10) - 1,
    day: Number.parseInt(person.day, 10),
    hour: Number.parseInt(person.hour, 10),
    minute: Number.parseInt(person.minute, 10),
    latitude: person.latitude ?? 0,
    longitude: person.longitude ?? 0,
    timezone: person.timezone,
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/synastry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDataA: toBirthData(personA),
          birthDataB: toBirthData(personB),
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Synastry request failed');
      }

      const payload = (await response.json()) as SynastryResponse;
      setResult(payload);
    } catch {
      setError(t.synastryError);
    } finally {
      setLoading(false);
    }
  };

  const sections: { key: keyof SynastryNarrative; title: string; text: string }[] = result
    ? [
        { key: 'overallConnection', title: t.synastryOverallConnection, text: result.interpretation.overallConnection },
        { key: 'communicationStyle', title: t.synastryCommunication, text: result.interpretation.communicationStyle },
        { key: 'emotionalCompatibility', title: t.synastryEmotional, text: result.interpretation.emotionalCompatibility },
        { key: 'attractionChemistry', title: t.synastryChemistry, text: result.interpretation.attractionChemistry },
        { key: 'growthChallenges', title: t.synastryGrowth, text: result.interpretation.growthChallenges },
        { key: 'longTermPotential', title: t.synastryLongTerm, text: result.interpretation.longTermPotential },
      ]
    : [];

  const radarValues = result
    ? [
        { label: t.synastryOverallShort, value: result.synastry.categoryScores.overallConnection },
        { label: t.synastryTalkShort, value: result.synastry.categoryScores.communicationStyle },
        { label: t.synastryFeelShort, value: result.synastry.categoryScores.emotionalCompatibility },
        { label: t.synastrySparkShort, value: result.synastry.categoryScores.attractionChemistry },
        { label: t.synastryGrowShort, value: result.synastry.categoryScores.growthChallenges },
        { label: t.synastryFutureShort, value: result.synastry.categoryScores.longTermPotential },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-2 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <button type="button" onClick={() => router.push('/')} className="min-h-11 rounded-full px-3 text-sm text-cream hover:text-warmWhite">
          ← {t.back}
        </button>
        <h1 className="font-heading text-3xl text-lumina-soft">{t.synastryTitle}</h1>
        <div className="w-14" />
      </header>

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-cream/80">{t.synastrySubtitle}</p>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {[{ key: 'A' as const, state: personA, setState: setPersonA, title: t.synastryPersonA }, { key: 'B' as const, state: personB, setState: setPersonB, title: t.synastryPersonB }].map(
            ({ key, state, setState, title }) => (
              <section key={key} className="glass-card p-5 sm:p-6">
                <h2 className="mb-4 font-heading text-2xl text-lumina-soft">{title}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="lumina-label">{t.name}</label>
                    <input
                      className="lumina-input"
                      value={state.name}
                      onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder={title}
                    />
                  </div>

                  <div>
                    <p className="lumina-label mb-2">{t.dateOfBirth}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <select className="lumina-input" value={state.day} onChange={(event) => setState((prev) => ({ ...prev, day: event.target.value }))} required>
                        <option value="">{t.day}</option>
                        {days.map((item) => (
                          <option key={item} value={String(item).padStart(2, '0')}>
                            {String(item).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <select className="lumina-input" value={state.month} onChange={(event) => setState((prev) => ({ ...prev, month: event.target.value }))} required>
                        <option value="">{t.month}</option>
                        {months.map((item) => (
                          <option key={item} value={String(item).padStart(2, '0')}>
                            {String(item).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <select className="lumina-input" value={state.year} onChange={(event) => setState((prev) => ({ ...prev, year: event.target.value }))} required>
                        <option value="">{t.year}</option>
                        {years.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <p className="lumina-label mb-2">{t.timeOfBirth}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <select className="lumina-input" value={state.hour} onChange={(event) => setState((prev) => ({ ...prev, hour: event.target.value }))} required>
                        <option value="">{t.hour}</option>
                        {hours.map((item) => (
                          <option key={item} value={String(item).padStart(2, '0')}>
                            {String(item).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <select className="lumina-input" value={state.minute} onChange={(event) => setState((prev) => ({ ...prev, minute: event.target.value }))} required>
                        <option value="">{t.minute}</option>
                        {minutes.map((item) => (
                          <option key={item} value={String(item).padStart(2, '0')}>
                            {String(item).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="lumina-label">{t.birthLocation}</label>
                    <input
                      className="lumina-input"
                      value={state.locationQuery}
                      onChange={(event) => {
                        const query = event.target.value;
                        setState((prev) => ({
                          ...prev,
                          locationQuery: query,
                          selectedLocationName: '',
                          latitude: null,
                          longitude: null,
                        }));
                        window.setTimeout(() => searchLocation(query, key), 240);
                      }}
                      placeholder={t.searchCityOrPlace}
                      required
                    />
                    {state.searchResults.length > 0 ? (
                      <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0f1433]/95 backdrop-blur-md">
                        {state.searchResults.map((item) => (
                          <button
                            key={item.place_id}
                            type="button"
                            className="block min-h-11 w-full border-b border-white/5 px-3 py-3 text-left text-sm text-warmWhite transition hover:bg-white/10"
                            onClick={() => selectLocation(item, key)}
                          >
                            {item.display_name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {state.searching ? <p className="mt-2 text-xs text-cream/60">{t.synastrySearching}</p> : null}
                  </div>

                  {state.selectedLocationName ? (
                    <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-cream/75">{state.selectedLocationName}</p>
                  ) : null}
                </div>
              </section>
            ),
          )}
        </div>

        <button type="submit" disabled={!canSubmit || loading} className="lumina-button w-full sm:w-auto">
          {loading ? t.synastryLoading : t.synastryRun}
        </button>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </form>

      {loading ? (
        <section className="mt-8 glass-card p-6">
          <div className="space-y-3">
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-11/12" />
            <div className="skeleton h-4 w-10/12" />
          </div>
        </section>
      ) : null}

      {result ? (
        <div className="mt-8 space-y-6 animate-fadeInUp">
          <section className="grid gap-4 md:grid-cols-2">
            {[{ label: t.synastryPersonA, chart: result.synastry.personAChart }, { label: t.synastryPersonB, chart: result.synastry.personBChart }].map((item) => {
              const sun = item.chart.planets.find((planet) => planet.planet === 'Sun');
              const moon = item.chart.planets.find((planet) => planet.planet === 'Moon');
              return (
                <div key={item.label} className="glass-card p-5">
                  <p className="lumina-label mb-2">{item.label}</p>
                  <p className="text-sm text-cream/70">{t.bigThree}</p>
                  <p className="mt-2 text-sm text-warmWhite">{t.sun}: {sun?.sign}</p>
                  <p className="text-sm text-warmWhite">{t.moon}: {moon?.sign}</p>
                  <p className="text-sm text-warmWhite">{t.rising}: {item.chart.risingSign}</p>
                </div>
              );
            })}
          </section>

          <section className="glass-card p-6">
            <p className="lumina-label mb-4">{t.synastryCompatibilityWheel}</p>
            <RadarChart values={radarValues} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {radarValues.map((item) => (
                <p key={item.label} className="rounded-lg bg-white/5 px-2 py-1 text-cream/80">
                  {item.label}: <span className="text-warmWhite">{item.value}</span>
                </p>
              ))}
            </div>
          </section>

          <section className="glass-card p-6">
            <p className="lumina-label mb-3">{t.synastryNarrative}</p>
            <div className="space-y-2">
              {sections.map((section) => (
                <div key={section.key} className="rounded-xl border border-white/10 bg-white/5">
                  <button
                    type="button"
                    onClick={() => setOpenSection(section.key)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-warmWhite"
                  >
                    <span>{section.title}</span>
                    <span>{openSection === section.key ? '−' : '+'}</span>
                  </button>
                  {openSection === section.key ? <p className="px-4 pb-4 text-sm leading-relaxed text-cream/90">{section.text}</p> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card p-6">
            <p className="lumina-label mb-3">{t.synastryKeyAspects}</p>
            <div className="space-y-3">
              {result.synastry.crossAspects.slice(0, 10).map((aspect, idx) => (
                <div key={`${aspect.planetA}-${aspect.planetB}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="mb-1 text-xs uppercase tracking-[0.14em] text-lumina-soft">
                    {translatePlanet(aspect.planetA, language)} {translateAspectType(aspect.type, language)} {translatePlanet(aspect.planetB, language)} · {aspect.orb.toFixed(1)}°
                  </p>
                  <AspectMeaning aspect={aspect} language={language} />
                </div>
              ))}
            </div>
          </section>

          <ShareCard
            type="synastry-summary"
            title={language === 'ru' ? 'Краткий портрет вашей пары' : 'Your Relationship Snapshot'}
            subtitle={result.interpretation.overallConnection}
            bullets={[
              `${t.synastryOverallConnection}: ${result.synastry.categoryScores.overallConnection}`,
              `${t.synastryCommunication}: ${result.synastry.categoryScores.communicationStyle}`,
              `${t.synastryEmotional}: ${result.synastry.categoryScores.emotionalCompatibility}`,
              `${t.synastryChemistry}: ${result.synastry.categoryScores.attractionChemistry}`,
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
