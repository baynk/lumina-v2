'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { formatAspectDescription } from '@/lib/translations';
import type { AspectData, BirthData, HouseInfo, PlanetInfo } from '@/types';

type SolarReturnResult = {
  returnDate: string;
  returnTime: string;
  planets: PlanetInfo[];
  houses: HouseInfo[];
  aspects: AspectData[];
  natalSunLongitude: number;
};

type ChartResponse = {
  natalChart?: {
    planets: PlanetInfo[];
  };
  error?: string;
};

type Props = {
  birthData: BirthData;
  year?: number;
};

export default function SolarReturnChart({ birthData, year }: Props) {
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(year ?? currentYear);
  const [city, setCity] = useState('');
  const [currentLat, setCurrentLat] = useState(String(birthData.latitude));
  const [currentLon, setCurrentLon] = useState(String(birthData.longitude));
  const [currentTz, setCurrentTz] = useState(birthData.timezone || 'UTC');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SolarReturnResult | null>(null);
  const [natalPlanets, setNatalPlanets] = useState<PlanetInfo[]>([]);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const planetDiffMap = useMemo(() => {
    const natalByPlanet = new Map(natalPlanets.map((planet) => [planet.planet, planet]));
    const differences = new Map<string, { signChanged: boolean; houseChanged: boolean }>();

    if (!result) return differences;

    for (const planet of result.planets) {
      const natal = natalByPlanet.get(planet.planet);
      if (!natal) continue;

      differences.set(planet.planet, {
        signChanged: natal.sign !== planet.sign,
        houseChanged: natal.house !== planet.house,
      });
    }

    return differences;
  }, [natalPlanets, result]);

  const changedPlanets = useMemo(() => {
    if (!result) return [];

    return result.planets.filter((planet) => {
      const diff = planetDiffMap.get(planet.planet);
      return diff?.signChanged || diff?.houseChanged;
    });
  }, [planetDiffMap, result]);

  const currentPlanetSigns = useMemo(
    () => Object.fromEntries(result?.planets.map((planet) => [planet.planet, planet.sign]) ?? []),
    [result]
  );

  const runCalculation = async () => {
    setLoading(true);
    setError('');

    try {
      const solarParams = new URLSearchParams({
        year: String(birthData.year),
        month: String(birthData.month),
        day: String(birthData.day),
        hour: String(birthData.hour),
        minute: String(birthData.minute),
        lat: String(birthData.latitude),
        lon: String(birthData.longitude),
        tz: birthData.timezone,
        returnYear: String(selectedYear),
        currentLat: String(Number(currentLat)),
        currentLon: String(Number(currentLon)),
        currentTz,
      });

      const natalParams = new URLSearchParams({
        year: String(birthData.year),
        month: String(birthData.month),
        day: String(birthData.day),
        hour: String(birthData.hour),
        minute: String(birthData.minute),
        lat: String(birthData.latitude),
        lon: String(birthData.longitude),
        tz: birthData.timezone,
      });

      const [solarResponse, natalResponse] = await Promise.all([
        fetch(`/api/solar-return?${solarParams.toString()}`),
        fetch(`/api/chart?${natalParams.toString()}`),
      ]);

      if (!solarResponse.ok) {
        throw new Error('Solar return calculation failed.');
      }

      if (!natalResponse.ok) {
        throw new Error('Natal chart lookup failed.');
      }

      const solarData = (await solarResponse.json()) as SolarReturnResult & { error?: string };
      const natalData = (await natalResponse.json()) as ChartResponse;

      if (solarData.error) throw new Error(solarData.error);
      if (natalData.error) throw new Error(natalData.error);

      setResult(solarData);
      setNatalPlanets(natalData.natalChart?.planets ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to calculate solar return.';
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runCalculation();
    // Run once with default birth location/year values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="glass-card p-5 sm:p-6 space-y-5">
      <div>
        <p className="lumina-label mb-2">Solar Return</p>
        <p className="text-sm text-lumina-soft">Find your return chart for where you will be this year.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="lumina-label mb-2 block">Year</label>
          <select className="lumina-input" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
            {yearOptions.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="lumina-label mb-2 block">Where Will You Be?</label>
          <input
            className="lumina-input"
            placeholder="City (optional)"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </div>

        <div>
          <label className="lumina-label mb-2 block">Latitude</label>
          <input
            className="lumina-input"
            value={currentLat}
            onChange={(event) => setCurrentLat(event.target.value)}
          />
        </div>

        <div>
          <label className="lumina-label mb-2 block">Longitude</label>
          <input
            className="lumina-input"
            value={currentLon}
            onChange={(event) => setCurrentLon(event.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="lumina-label mb-2 block">Timezone</label>
          <input
            className="lumina-input"
            value={currentTz}
            onChange={(event) => setCurrentTz(event.target.value)}
            placeholder="America/New_York"
          />
        </div>
      </div>

      <button
        type="button"
        className="lumina-button w-full"
        onClick={runCalculation}
        disabled={loading}
      >
        {loading ? 'Calculating...' : 'Calculate Solar Return'}
      </button>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-cream">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          <div className="skeleton h-4 w-10/12" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-9/12" />
        </div>
      )}

      {result && !loading && (
        <div className="space-y-5">
          <div className="rounded-xl bg-white/5 p-4">
            <p className="lumina-label mb-2">Solar Return Moment</p>
            <p className="text-cream">{result.returnDate} at {result.returnTime}</p>
            <p className="mt-1 text-sm text-lumina-soft">Natal Sun longitude: {result.natalSunLongitude.toFixed(4)}°</p>
            {city && <p className="mt-1 text-sm text-lumina-soft">Location: {city}</p>}
          </div>

          <div>
            <p className="lumina-label mb-3">Planetary Positions</p>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-cream">
                  <tr>
                    <th className="px-3 py-2">Planet</th>
                    <th className="px-3 py-2">Sign</th>
                    <th className="px-3 py-2">House</th>
                    <th className="px-3 py-2">Degree</th>
                    <th className="px-3 py-2">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {result.planets.map((planet) => {
                    const diff = planetDiffMap.get(planet.planet);
                    const changed = Boolean(diff?.signChanged || diff?.houseChanged);

                    return (
                      <tr key={planet.planet} className={changed ? 'bg-lumina-accent/10' : 'bg-transparent'}>
                        <td className="px-3 py-2 text-cream">{planet.planet}</td>
                        <td className="px-3 py-2 text-cream">{planet.sign}</td>
                        <td className="px-3 py-2 text-cream">{planet.house}</td>
                        <td className="px-3 py-2 text-cream">{Number.parseFloat(planet.degrees).toFixed(2)}°</td>
                        <td className="px-3 py-2 text-lumina-soft">
                          {changed ? [
                            diff?.signChanged ? 'Sign changed' : '',
                            diff?.houseChanged ? 'House changed' : '',
                          ].filter(Boolean).join(', ') : 'No change'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="lumina-label mb-3">Key Differences From Natal</p>
            <div className="rounded-xl bg-white/5 p-4 text-sm text-cream">
              {changedPlanets.length === 0 ? (
                <p>No sign or house changes from natal placements.</p>
              ) : (
                <ul className="space-y-2">
                  {changedPlanets.map((planet) => {
                    const natal = natalPlanets.find((item) => item.planet === planet.planet);
                    const diff = planetDiffMap.get(planet.planet);

                    return (
                      <li key={`diff-${planet.planet}`}>
                        {planet.planet}: {diff?.signChanged ? `${natal?.sign} → ${planet.sign}` : planet.sign}
                        {diff?.houseChanged ? `, House ${natal?.house} → House ${planet.house}` : ''}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div>
            <p className="lumina-label mb-3">Aspect Grid</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {result.aspects.map((aspect, index) => (
                <div key={`${aspect.aspect}-${index}`} className="rounded-xl bg-white/5 p-3">
                  <p className="text-sm font-semibold text-cream">{aspect.aspect}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-lumina-soft">{aspect.type}</p>
                  <p className="mt-2 text-sm text-cream/90">{formatAspectDescription(aspect, language, currentPlanetSigns)}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="lumina-label mb-3">Houses</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {result.houses.map((house) => (
                <div key={`house-${house.house}`} className="rounded-xl bg-white/5 p-3">
                  <p className="text-cream">House {house.house}</p>
                  <p className="text-sm text-lumina-soft">{house.sign}</p>
                  <p className="text-sm text-cream/90">{Number.parseFloat(house.degrees).toFixed(2)}°</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
