'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AstrocartographyPlanetLines } from '@/types';
import type { AstroFeatureCollection, AngleType } from './AstroMapGL';

const ALL_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const ALL_ANGLES: AngleType[] = ['mc', 'ic', 'asc', 'desc'];
const MAX_LON_GAP = 10;

// Dynamic import to avoid SSR issues with maplibre
import dynamic from 'next/dynamic';
const AstroMapGL = dynamic(() => import('./AstroMapGL'), { ssr: false, loading: () => <div className="h-[50vh] md:h-[70vh] w-full rounded-2xl bg-slate-900/50 border border-white/[0.06] animate-pulse" /> });
const PlanetFilter = dynamic(() => import('./PlanetFilter'), { ssr: false });

type BirthData = {
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
  birth_timezone: string | null;
};

type Props = {
  userData: BirthData | null;
  clientName: string;
  clientEmail?: string | null;
};

function hasSufficientBirthData(d: BirthData | null): boolean {
  if (!d) return false;
  if (!d.birth_date || !d.birth_time) return false;
  const lat = Number(d.birth_latitude);
  const lon = Number(d.birth_longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (!d.birth_timezone) return false;
  return true;
}

function transformToGeoJSON(planets: AstrocartographyPlanetLines[]): AstroFeatureCollection {
  const features: AstroFeatureCollection['features'] = [];

  for (const planet of planets) {
    const lineTypes = [
      { key: 'mc' as const, points: planet.mc },
      { key: 'ic' as const, points: planet.ic },
      { key: 'asc' as const, points: planet.asc },
      { key: 'desc' as const, points: planet.desc },
    ];

    for (const lt of lineTypes) {
      if (!lt.points?.length) continue;

      // Split lines at antimeridian crossings
      let segment: [number, number][] = [];
      for (let i = 0; i < lt.points.length; i++) {
        const pt = lt.points[i];
        if (i > 0) {
          const prev = lt.points[i - 1];
          if (Math.abs(pt.lon - prev.lon) > MAX_LON_GAP) {
            if (segment.length >= 2) {
              features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: segment },
                properties: {
                  planet: planet.planet,
                  symbol: planet.symbol,
                  color: planet.color,
                  angleType: lt.key,
                  label: `${planet.symbol} ${planet.planet} ${lt.key.toUpperCase()}`,
                },
              });
            }
            segment = [];
          }
        }
        segment.push([pt.lon, pt.lat]);
      }
      if (segment.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: segment },
          properties: {
            planet: planet.planet,
            symbol: planet.symbol,
            color: planet.color,
            angleType: lt.key,
            label: `${planet.symbol} ${planet.planet} ${lt.key.toUpperCase()}`,
          },
        });
      }
    }
  }

  return { type: 'FeatureCollection', features };
}

export default function AstrocartographySection({ userData, clientName, clientEmail }: Props) {
  const [activePlanets, setActivePlanets] = useState<string[]>(ALL_PLANETS);
  const [activeAngles, setActiveAngles] = useState<AngleType[]>(ALL_ANGLES);
  const [geoJSON, setGeoJSON] = useState<AstroFeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudgeSent, setNudgeSent] = useState(false);

  const hasBirthData = hasSufficientBirthData(userData);

  useEffect(() => {
    if (!hasBirthData || !userData) return;

    const dateStr = userData!.birth_date!.trim();
    let y: number, m: number, d: number;
    const dotMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dotMatch) {
      d = Number(dotMatch[1]); m = Number(dotMatch[2]); y = Number(dotMatch[3]);
    } else {
      [y, m, d] = dateStr.split('-').map(Number);
    }
    const [h, min] = (userData!.birth_time!).split(':').map(Number);

    const params = new URLSearchParams({
      year: String(y),
      month: String(m - 1),
      day: String(d),
      hour: String(h),
      minute: String(min),
      lat: String(Number(userData!.birth_latitude)),
      lon: String(Number(userData!.birth_longitude)),
      tz: String(userData!.birth_timezone),
    });

    setLoading(true);
    setError(null);

    fetch(`/api/astrocartography?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((resp) => {
        const acgData = resp.data || resp;
        const geo = transformToGeoJSON(acgData.planets || []);
        setGeoJSON(geo);
      })
      .catch((err) => setError(err.message || 'Failed to calculate astrocartography'))
      .finally(() => setLoading(false));
  }, [hasBirthData, userData]);

  const togglePlanet = useCallback((planet: string) => {
    setActivePlanets((prev) => prev.includes(planet) ? prev.filter((p) => p !== planet) : [...prev, planet]);
  }, []);

  const toggleAngle = useCallback((angle: AngleType) => {
    setActiveAngles((prev) => prev.includes(angle) ? prev.filter((a) => a !== angle) : [...prev, angle]);
  }, []);

  const missingFields = useMemo(() => {
    if (!userData) return ['birth date', 'birth time', 'birth location'];
    const missing: string[] = [];
    if (!userData.birth_date) missing.push('birth date');
    if (!userData.birth_time) missing.push('birth time');
    if (userData.birth_latitude == null || userData.birth_longitude == null) missing.push('birth coordinates');
    if (!userData.birth_timezone) missing.push('timezone');
    return missing;
  }, [userData]);

  // Incomplete birth data state
  if (!hasBirthData) {
    return (
      <div className="glass-card p-6">
        <p className="lumina-label mb-3">Astrocartography</p>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 text-center">
          <div className="text-3xl mb-3">🌍</div>
          <p className="text-sm text-warmWhite font-medium mb-1">Incomplete birth data</p>
          <p className="text-xs text-cream/50 mb-4">
            Astrocartography requires exact birth time and location. Missing: {missingFields.join(', ')}.
          </p>
          {clientEmail && !nudgeSent && (
            <button
              onClick={() => {
                // In future: send actual email/notification
                setNudgeSent(true);
              }}
              className="rounded-full border border-lumina-accent/40 px-4 py-2 text-xs text-lumina-soft hover:border-lumina-accent hover:text-warmWhite transition"
            >
              📩 Request data from {clientName}
            </button>
          )}
          {nudgeSent && (
            <p className="text-xs text-emerald-300">✓ Data request noted — follow up with {clientName}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <p className="lumina-label mb-3">Astrocartography</p>

      {loading && (
        <div className="h-[50vh] md:h-[70vh] w-full rounded-2xl bg-slate-900/50 border border-white/[0.06] flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2 animate-pulse">🌍</div>
            <p className="text-xs text-cream/50">Calculating planetary lines...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {geoJSON && !loading && (
        <>
          <PlanetFilter
            activePlanets={activePlanets}
            activeAngles={activeAngles}
            onTogglePlanet={togglePlanet}
            onToggleAngle={toggleAngle}
          />
          <div className="mt-3">
            <AstroMapGL data={geoJSON} activePlanets={activePlanets} activeAngles={activeAngles} />
          </div>
        </>
      )}
    </div>
  );
}
