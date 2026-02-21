'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadProfile } from '@/lib/profile';
import type { AstroLinePoint, AstrocartographyData, BirthData } from '@/types';
import AstroMapGL, { type AngleType, type AstroFeatureCollection } from './AstroMapGL';
import PlanetFilter from './PlanetFilter';

type UserProfileResponse = {
  onboarding_completed?: boolean;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_latitude?: number | null;
  birth_longitude?: number | null;
  birth_timezone?: string | null;
  birth_place?: string | null;
};

const PLANET_NAMES = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
];

const ALL_ANGLES: AngleType[] = ['mc', 'ic', 'asc', 'desc'];
const EMPTY_FEATURE_COLLECTION: AstroFeatureCollection = { type: 'FeatureCollection', features: [] };

function parseServerBirthData(profile: UserProfileResponse | null): BirthData | null {
  if (!profile?.onboarding_completed || !profile.birth_date) {
    return null;
  }
  if (
    profile.birth_latitude == null ||
    profile.birth_longitude == null ||
    !profile.birth_timezone
  ) {
    return null;
  }

  const [year, month, day] = profile.birth_date.split('-').map(Number);
  const [hour, minute] = (profile.birth_time || '12:00').split(':').map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return {
    year,
    month: month - 1,
    day,
    hour: Number.isFinite(hour) ? hour : 12,
    minute: Number.isFinite(minute) ? minute : 0,
    latitude: profile.birth_latitude,
    longitude: profile.birth_longitude,
    timezone: profile.birth_timezone || 'UTC',
  };
}

function splitLineAtAntimeridian(points: AstroLinePoint[]): [number, number][][] {
  if (points.length < 2) return [];

  const segments: [number, number][][] = [];
  let currentSegment: [number, number][] = [[points[0].lon, points[0].lat]];

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const point = points[i];
    const lonGap = Math.abs(point.lon - prev.lon);

    if (lonGap > 10) {
      if (currentSegment.length > 1) {
        segments.push(currentSegment);
      }
      currentSegment = [[point.lon, point.lat]];
      continue;
    }

    currentSegment.push([point.lon, point.lat]);
  }

  if (currentSegment.length > 1) {
    segments.push(currentSegment);
  }

  return segments;
}

function toGeoJson(data: AstrocartographyData): AstroFeatureCollection {
  const features: AstroFeatureCollection['features'] = [];

  for (const planet of data.planets) {
    const lineGroups: Record<AngleType, AstroLinePoint[]> = {
      mc: planet.mc,
      ic: planet.ic,
      asc: planet.asc,
      desc: planet.desc,
    };

    for (const angleType of ALL_ANGLES) {
      const segments = splitLineAtAntimeridian(lineGroups[angleType] || []);

      for (const coordinates of segments) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates,
          },
          properties: {
            planet: planet.planet,
            symbol: planet.symbol,
            color: planet.color,
            angleType,
            label: `${planet.symbol} ${planet.planet} ${angleType.toUpperCase()}`,
          },
        });
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export default function AstrocartographyClient() {
  const [birthData, setBirthData] = useState<BirthData | null>(null);
  const [data, setData] = useState<AstrocartographyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlanets, setActivePlanets] = useState<string[]>(PLANET_NAMES);
  const [activeAngles, setActiveAngles] = useState<AngleType[]>(ALL_ANGLES);

  useEffect(() => {
    async function loadBirthAndMap() {
      setLoading(true);
      setError(null);

      let resolvedBirthData: BirthData | null = null;

      try {
        const profileRes = await fetch('/api/user', { cache: 'no-store' });
        if (profileRes.ok) {
          const serverProfile = (await profileRes.json()) as UserProfileResponse;
          resolvedBirthData = parseServerBirthData(serverProfile);
        }
      } catch {
        // fallback handled below
      }

      if (!resolvedBirthData) {
        const localProfile = loadProfile();
        if (localProfile?.birthData) {
          resolvedBirthData = localProfile.birthData as BirthData;
        }
      }

      if (!resolvedBirthData) {
        setError('No birth profile found. Please complete profile birth data first.');
        setLoading(false);
        return;
      }

      setBirthData(resolvedBirthData);

      const params = new URLSearchParams({
        year: String(resolvedBirthData.year),
        month: String(resolvedBirthData.month),
        day: String(resolvedBirthData.day),
        hour: String(resolvedBirthData.hour),
        minute: String(resolvedBirthData.minute),
        lat: String(resolvedBirthData.latitude),
        lon: String(resolvedBirthData.longitude),
        tz: resolvedBirthData.timezone || 'UTC',
      });

      try {
        const res = await fetch(`/api/astrocartography?${params.toString()}`, { cache: 'no-store' });
        const payload = (await res.json()) as { data?: AstrocartographyData; error?: string };
        if (!res.ok || !payload.data) {
          throw new Error(payload.error || 'Failed to calculate astrocartography lines.');
        }
        setData(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to calculate astrocartography lines.');
      } finally {
        setLoading(false);
      }
    }

    loadBirthAndMap();
  }, []);

  const geoJson = useMemo(() => (data ? toGeoJson(data) : EMPTY_FEATURE_COLLECTION), [data]);

  const togglePlanet = (planet: string) => {
    setActivePlanets((current) =>
      current.includes(planet) ? current.filter((name) => name !== planet) : [...current, planet],
    );
  };

  const toggleAngle = (angleType: AngleType) => {
    setActiveAngles((current) =>
      current.includes(angleType)
        ? current.filter((name) => name !== angleType)
        : [...current, angleType],
    );
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-8 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <p className="text-slate-200">Loading birth profile and calculating 40 planetary lines...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
        <p className="text-sm text-rose-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
        <span className="font-medium text-slate-100">Birth UTC:</span> {data?.birthMomentUtc}
        {birthData?.timezone ? (
          <span className="ml-2 text-slate-400">(source timezone: {birthData.timezone})</span>
        ) : null}
      </div>

      <PlanetFilter
        activePlanets={activePlanets}
        activeAngles={activeAngles}
        onTogglePlanet={togglePlanet}
        onToggleAngle={toggleAngle}
      />

      <AstroMapGL data={geoJson} activePlanets={activePlanets} activeAngles={activeAngles} />
    </div>
  );
}
