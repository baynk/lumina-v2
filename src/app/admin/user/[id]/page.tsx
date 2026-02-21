'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import AstrocartographySection from '@/components/astrocartography/AstrocartographySection';
import NatalWheel from '@/components/admin/NatalWheel';

type Planet = {
  planet: string;
  sign: string;
  house?: number;
  degrees: string;
};

type House = {
  house: number;
  sign: string;
  degrees: string;
};

type Aspect = {
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  angle: number;
  orb: number;
  planet1: string;
  planet2: string;
};

type NatalChart = {
  zodiacSign: string;
  risingSign: string;
  element: string;
  quality: string;
  rulingPlanet: string;
  planets: Planet[];
  houses: House[];
  aspects: Aspect[];
  ascendantDegrees?: number;
  midheavenDegrees?: number;
};

type UserDetail = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
  birth_timezone: string | null;
  onboarding_completed: boolean;
  created_at: string;
  last_active_at: string | null;
};

type BirthDataUsed = {
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
  birth_timezone: string | null;
};

type ApiPayload = {
  user: UserDetail;
  natalChart: NatalChart | null;
  chartError: string | null;
  birthDataUsed: BirthDataUsed | null;
  error?: string;
};

const ADMIN_EMAILS = ['ryan@ryanwright.io', 'luminastrology@gmail.com'];
const ADMIN_DOMAINS = ['ryanwright.io'];

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
};

const ASPECT_STYLES: Record<Aspect['type'], { symbol: string; color: string }> = {
  conjunction: { symbol: '☌', color: '#4ade80' },
  sextile: { symbol: '⚹', color: '#60a5fa' },
  square: { symbol: '□', color: '#f87171' },
  trine: { symbol: '△', color: '#60a5fa' },
  opposition: { symbol: '☍', color: '#f87171' },
};

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const domain = email.split('@')[1];
  return ADMIN_EMAILS.includes(email) || ADMIN_DOMAINS.includes(domain);
}

function formatDegree(value: string) {
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return value;
  return `${num.toFixed(2)}°`;
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params?.id;

  const { data: session, status: authStatus } = useSession();

  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = isAdminEmail(session?.user?.email);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      const callback = userId ? `%2Fadmin%2Fuser%2F${encodeURIComponent(userId)}` : '%2Fadmin';
      router.replace(`/auth/signin?callbackUrl=${callback}`);
      return;
    }
    if (authStatus === 'loading') return;

    if (!session?.user?.email) {
      setError('Not signed in.');
      setLoading(false);
      return;
    }

    if (!isAdmin) {
      setError('Access denied. Admin only.');
      setLoading(false);
      return;
    }

    if (!userId) {
      setError('Missing user id.');
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/user/${userId}`);
        const payload = (await response.json()) as ApiPayload;

        if (response.status === 403) {
          setError('Access denied. Admin only.');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          setError(payload.error || 'Failed to load user detail.');
          setLoading(false);
          return;
        }

        setData(payload);
      } catch {
        setError('Failed to load user detail.');
      }

      setLoading(false);
    };

    loadUser();
  }, [authStatus, isAdmin, router, session?.user?.email, userId]);

  const planetOrder = useMemo(() => {
    const preferred = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    if (!data?.natalChart?.planets?.length) return preferred;

    const actual = data.natalChart.planets.map((planet) => planet.planet);
    return preferred.filter((name) => actual.includes(name));
  }, [data?.natalChart?.planets]);

  const aspectLookup = useMemo(() => {
    const map = new Map<string, Aspect>();
    for (const aspect of data?.natalChart?.aspects || []) {
      map.set(`${aspect.planet1}-${aspect.planet2}`, aspect);
      map.set(`${aspect.planet2}-${aspect.planet1}`, aspect);
    }
    return map;
  }, [data?.natalChart?.aspects]);

  if (authStatus === 'loading' || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="glass-card p-8">
          <div className="skeleton h-6 w-56" />
          <div className="mt-4 space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="glass-card p-8 text-center">
          <p className="text-lg text-red-400">{error}</p>
          {!session?.user?.email && (
            <button
              onClick={() => signIn('google', { callbackUrl: '/admin' })}
              className="mt-5 rounded-full border border-lumina-accent/30 px-4 py-2 text-sm text-cream hover:border-lumina-accent/60 hover:text-warmWhite transition"
            >
              Sign in with admin account
            </button>
          )}
          <div className="mt-6">
            <Link href="/admin" className="text-sm text-cream/60 hover:text-cream transition">← Back to admin</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user } = data;
  const birthSummary = [user.birth_date, user.birth_time, user.birth_place].filter(Boolean).join(' · ');

  const hasNoBirthDataAtAll = [
    user.birth_date,
    user.birth_time,
    user.birth_place,
    user.birth_latitude,
    user.birth_longitude,
    user.birth_timezone,
  ].every((value) => value == null || value === '');

  const missingFields: string[] = [];
  if (!user.birth_date) missingFields.push('birth date');
  if (user.birth_latitude == null || user.birth_longitude == null) missingFields.push('birth coordinates');
  if (!user.birth_timezone) missingFields.push('birth timezone');

  const astroBirthData: BirthDataUsed = {
    birth_date: user.birth_date,
    birth_time: user.birth_time,
    birth_place: user.birth_place,
    birth_latitude: user.birth_latitude,
    birth_longitude: user.birth_longitude,
    birth_timezone: user.birth_timezone,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:pt-6 sm:px-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] text-cream/40 uppercase tracking-widest mb-0.5">User Detail</p>
          <h1 className="font-heading text-2xl text-warmWhite">{user.name || 'Unnamed User'}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-cream/50">
            <span>📧 {user.email}</span>
            {birthSummary && <span>🗓️ {birthSummary}</span>}
          </div>
        </div>
        <Link href="/admin" className="text-sm text-cream/50 hover:text-cream transition">← Back</Link>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr] mb-5">
        <div className="glass-card p-4">
          <p className="lumina-label mb-2">Natal Chart</p>
          {data.natalChart ? (
            <NatalWheel chart={data.natalChart} clientName={user.name || user.email} birthInfo={birthSummary} />
          ) : (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
              {hasNoBirthDataAtAll ? (
                <>
                  <p className="text-warmWhite font-medium mb-1">🌍 No birth data available</p>
                  <p className="text-sm text-cream/60">This user hasn't provided their birth details yet.</p>
                </>
              ) : (
                <>
                  <p className="text-warmWhite font-medium mb-1">Natal chart unavailable</p>
                  <p className="text-sm text-cream/60 mb-2">{data.chartError || 'Missing required birth details.'}</p>
                  {missingFields.length > 0 && (
                    <p className="text-xs text-cream/50">Missing: {missingFields.join(', ')}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="glass-card p-4">
          <p className="lumina-label mb-2">Planetary Positions</p>
          {data.natalChart ? (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 text-cream/50 text-[10px] uppercase tracking-wider">
                  <th className="pb-2 pr-2">Planet</th>
                  <th className="pb-2 pr-2">Sign</th>
                  <th className="pb-2 pr-2">Degree</th>
                  <th className="pb-2 pr-2">House</th>
                  <th className="pb-2 hidden sm:table-cell">Element</th>
                </tr>
              </thead>
              <tbody>
                {data.natalChart.planets.map((planet) => {
                  const signElements: Record<string, string> = {
                    Aries: '🔥 Fire', Taurus: '🌍 Earth', Gemini: '💨 Air', Cancer: '💧 Water',
                    Leo: '🔥 Fire', Virgo: '🌍 Earth', Libra: '💨 Air', Scorpio: '💧 Water',
                    Sagittarius: '🔥 Fire', Capricorn: '🌍 Earth', Aquarius: '💨 Air', Pisces: '💧 Water',
                  };
                  return (
                    <tr key={planet.planet} className="border-b border-white/5">
                      <td className="py-1.5 pr-2 text-warmWhite font-medium">
                        <span className="text-lumina-soft">{PLANET_SYMBOLS[planet.planet]}</span> {planet.planet}
                      </td>
                      <td className="py-1.5 pr-2 text-cream">{planet.sign}</td>
                      <td className="py-1.5 pr-2 text-cream/80 tabular-nums">{formatDegree(planet.degrees)}</td>
                      <td className="py-1.5 pr-2 text-cream/70">{planet.house || '—'}</td>
                      <td className="py-1.5 text-cream/50 text-xs hidden sm:table-cell">{signElements[planet.sign] || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 text-sm text-cream/60">
              No planetary data to display.
            </div>
          )}
        </div>
      </div>

      {data.natalChart && data.natalChart.aspects.length > 0 && (
        <div className="glass-card p-4 mb-5">
          <p className="lumina-label mb-2">Key Aspects</p>
          <div className="overflow-x-auto mb-3">
            <table className="min-w-full text-center text-[10px]">
              <thead>
                <tr>
                  <th className="p-0.5" />
                  {planetOrder.map((planet) => (
                    <th key={planet} className="p-0.5 text-cream/50 font-normal">{PLANET_SYMBOLS[planet]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planetOrder.map((rowPlanet, rowIdx) => (
                  <tr key={rowPlanet}>
                    <th className="p-0.5 text-cream/50 font-normal">{PLANET_SYMBOLS[rowPlanet]}</th>
                    {planetOrder.map((colPlanet, colIdx) => {
                      if (colIdx <= rowIdx) {
                        return <td key={`${rowPlanet}-${colPlanet}`} className="p-0.5 text-cream/15">·</td>;
                      }
                      const aspect = aspectLookup.get(`${rowPlanet}-${colPlanet}`);
                      if (!aspect) {
                        return <td key={`${rowPlanet}-${colPlanet}`} className="p-0.5"> </td>;
                      }
                      return (
                        <td key={`${rowPlanet}-${colPlanet}`} className="p-0.5" style={{ color: ASPECT_STYLES[aspect.type].color }} title={`${aspect.planet1} ${aspect.type} ${aspect.planet2} (orb ${aspect.orb}°)`}>
                          {ASPECT_STYLES[aspect.type].symbol}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            {data.natalChart.aspects
              .sort((a, b) => Number(a.orb) - Number(b.orb))
              .slice(0, 15)
              .map((aspect) => (
                <div key={`${aspect.planet1}-${aspect.planet2}`} className="flex items-center gap-2 text-xs py-1 border-b border-white/[0.04]">
                  <span className="text-warmWhite font-medium w-16 text-right">{PLANET_SYMBOLS[aspect.planet1]} {aspect.planet1}</span>
                  <span style={{ color: ASPECT_STYLES[aspect.type]?.color }} className="text-sm">{ASPECT_STYLES[aspect.type]?.symbol}</span>
                  <span className="text-warmWhite font-medium w-16">{PLANET_SYMBOLS[aspect.planet2]} {aspect.planet2}</span>
                  <span className="text-cream/40 capitalize">{aspect.type}</span>
                  <span className="text-cream/30 tabular-nums ml-auto">{aspect.orb}°</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mb-5">
        <AstrocartographySection
          userData={astroBirthData}
          clientName={user.name || user.email}
          clientEmail={user.email}
          natalPlanets={data.natalChart?.planets || null}
        />
      </div>
    </div>
  );
}
