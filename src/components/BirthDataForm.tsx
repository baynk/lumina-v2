'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { BirthData } from '@/lib/types';

type LocationResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

export type BirthDataFormResult = {
  birthData: BirthData;
  name: string;
  locationName: string;
  timeAccuracy: 'exact' | 'approximate' | 'unknown';
};

type BirthDataFormProps = {
  onComplete: (data: BirthDataFormResult) => void;
  submitLabel?: string;
  /** Optional heading above the form */
  heading?: string;
};

const months = Array.from({ length: 12 }, (_, idx) => idx + 1);
const days = Array.from({ length: 31 }, (_, idx) => idx + 1);
const years = Array.from({ length: 100 }, (_, idx) => new Date().getFullYear() - idx);
const hours = Array.from({ length: 24 }, (_, idx) => idx);
const minutes = Array.from({ length: 60 }, (_, idx) => idx);

export default function BirthDataForm({ onComplete, submitLabel, heading }: BirthDataFormProps) {
  const { language, t } = useLanguage();

  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [timeAccuracy, setTimeAccuracy] = useState<'exact' | 'approximate' | 'unknown'>('exact');

  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [timezone, setTimezone] = useState('UTC');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () =>
      !!day &&
      !!month &&
      !!year &&
      (timeAccuracy === 'unknown' || (!!hour && !!minute)) &&
      selectedLocationName.length > 0 &&
      latitude !== null &&
      longitude !== null,
    [day, hour, latitude, longitude, minute, month, selectedLocationName, timeAccuracy, year],
  );

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detectedTimezone) setTimezone(detectedTimezone);
  }, []);

  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearchingLocation(true);
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          setLocationResults([]);
          return;
        }
        const payload = (await response.json()) as LocationResult[];
        setLocationResults(payload);
      } catch {
        setLocationResults([]);
      } finally {
        setSearchingLocation(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [locationQuery]);

  const handleSelectLocation = async (result: LocationResult) => {
    setSelectedLocationName(result.display_name);
    setLocationQuery(result.display_name);
    const lat = Number.parseFloat(result.lat);
    const lon = Number.parseFloat(result.lon);
    setLatitude(lat);
    setLongitude(lon);
    setLocationResults([]);

    try {
      const tzResp = await fetch(`/api/timezone?lat=${lat}&lon=${lon}`);
      const tzData = (await tzResp.json()) as { timezone?: string };
      if (tzData.timezone) setTimezone(tzData.timezone);
    } catch {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detectedTimezone) setTimezone(detectedTimezone);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || latitude === null || longitude === null) return;

    setSubmitting(true);

    let resolvedTz = timezone;
    try {
      const tzResp = await fetch(`/api/timezone?lat=${latitude}&lon=${longitude}`);
      const tzData = (await tzResp.json()) as { timezone?: string };
      if (tzData.timezone) resolvedTz = tzData.timezone;
    } catch {
      // continue
    }

    const birthData: BirthData = {
      year: Number.parseInt(year, 10),
      month: Number.parseInt(month, 10) - 1,
      day: Number.parseInt(day, 10),
      hour: timeAccuracy === 'unknown' ? 12 : Number.parseInt(hour, 10),
      minute: timeAccuracy === 'unknown' ? 0 : Number.parseInt(minute, 10),
      latitude,
      longitude,
      timezone: resolvedTz,
    };

    onComplete({
      birthData,
      name: name.trim(),
      locationName: selectedLocationName,
      timeAccuracy,
    });
  };

  return (
    <section className="glass-card p-5 sm:p-6">
      {heading && <p className="lumina-section-title mb-4">{heading}</p>}
      {!heading && <p className="lumina-section-title mb-4">{t.enterBirthDetails}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="bdf-name" className="lumina-label">
            {t.name} ({t.optional})
          </label>
          <input
            id="bdf-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="lumina-input"
            placeholder={t.homeNamePlaceholder}
            autoComplete="name"
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="lumina-label mb-2">{t.dateOfBirth}</p>
            <div className="grid grid-cols-3 gap-2">
              <select className="lumina-input" value={day} onChange={(e) => setDay(e.target.value)} required>
                <option value="">{t.day}</option>
                {days.map((item) => (
                  <option key={item} value={item}>{String(item).padStart(2, '0')}</option>
                ))}
              </select>
              <select className="lumina-input" value={month} onChange={(e) => setMonth(e.target.value)} required>
                <option value="">{t.month}</option>
                {months.map((item) => (
                  <option key={item} value={item}>{String(item).padStart(2, '0')}</option>
                ))}
              </select>
              <select className="lumina-input" value={year} onChange={(e) => setYear(e.target.value)} required>
                <option value="">{t.year}</option>
                {years.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="lumina-label mb-2">{t.timeOfBirth}</p>
            <div className="grid grid-cols-2 gap-2">
              <select className="lumina-input" value={hour} onChange={(e) => setHour(e.target.value)} required={timeAccuracy !== 'unknown'} disabled={timeAccuracy === 'unknown'}>
                <option value="">{t.hour}</option>
                {hours.map((item) => (
                  <option key={item} value={item}>{String(item).padStart(2, '0')}</option>
                ))}
              </select>
              <select className="lumina-input" value={minute} onChange={(e) => setMinute(e.target.value)} required={timeAccuracy !== 'unknown'} disabled={timeAccuracy === 'unknown'}>
                <option value="">{t.minute}</option>
                {minutes.map((item) => (
                  <option key={item} value={item}>{String(item).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex gap-1.5">
              {([
                { value: 'exact' as const, en: 'Exact', ru: 'Точное' },
                { value: 'approximate' as const, en: '~Approximate', ru: '~Примерное' },
                { value: 'unknown' as const, en: 'Unknown', ru: 'Не знаю' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimeAccuracy(opt.value)}
                  className={`flex-1 rounded-lg py-1.5 text-[11px] transition ${
                    timeAccuracy === opt.value
                      ? 'bg-purple-400/20 text-purple-300 border border-purple-400/30'
                      : 'bg-white/[0.03] text-cream/40 border border-white/[0.06] hover:text-cream/60'
                  }`}
                >
                  {language === 'ru' ? opt.ru : opt.en}
                </button>
              ))}
            </div>
            {timeAccuracy === 'unknown' && (
              <p className="mt-1.5 text-[10px] text-amber-300/60">
                {language === 'ru'
                  ? '⚠ Без точного времени восходящий знак и дома будут неточными'
                  : '⚠ Without exact time, Rising sign and houses will be inaccurate'}
              </p>
            )}
            {timeAccuracy === 'approximate' && (
              <p className="mt-1.5 text-[10px] text-cream/30">
                {language === 'ru'
                  ? 'Укажите ближайшее время — Rising может отличаться на 1-2 знака'
                  : 'Enter your closest estimate — Rising may be off by 1-2 signs'}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <label htmlFor="bdf-location" className="lumina-label">
            {t.birthLocation}
          </label>
          <input
            id="bdf-location"
            type="text"
            value={locationQuery}
            onChange={(e) => {
              setLocationQuery(e.target.value);
              setSelectedLocationName('');
              setLatitude(null);
              setLongitude(null);
            }}
            className="lumina-input"
            placeholder={t.searchCityOrPlace}
            autoComplete="off"
            required
          />

          {locationResults.length > 0 ? (
            <div className="absolute z-40 bottom-full mb-1 w-full max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#0f1433]/95 backdrop-blur-md">
              {locationResults.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  className="block min-h-11 w-full border-b border-white/5 px-3 py-3 text-left text-sm text-warmWhite transition hover:bg-white/10"
                  onClick={() => handleSelectLocation(result)}
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          ) : null}

          {searchingLocation ? <p className="mt-2 text-xs text-cream/60">...</p> : null}
        </div>

        {selectedLocationName && latitude !== null && longitude !== null ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-cream">
            <p className="text-warmWhite">
              {t.selectedLocation}: {selectedLocationName}
            </p>
            <p>
              {t.latitude}: {latitude.toFixed(4)} | {t.longitude}: {longitude.toFixed(4)}
            </p>
            <p>
              {t.timezone}: {timezone}
            </p>
          </div>
        ) : null}

        <button type="submit" disabled={!canSubmit || submitting} className="lumina-button w-full">
          {submitLabel || t.homeDiscoverStars}
        </button>
      </form>
    </section>
  );
}
