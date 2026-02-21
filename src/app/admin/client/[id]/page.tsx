'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import AstrocartographySection from '@/components/astrocartography/AstrocartographySection';
import NatalWheel from '@/components/admin/NatalWheel';

type ConsultationDetail = {
  id: string;
  user_id: string | null;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  topics: string[] | null;
  question: string;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

type LinkedUser = {
  id: string;
  name: string | null;
  email: string;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
  birth_timezone: string | null;
  gender: string | null;
  relationship_status: string | null;
};

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
  consultation: ConsultationDetail;
  user: LinkedUser | null;
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

function formatDegree(value: string) {
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return value;
  return `${num.toFixed(2)}°`;
}

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const domain = email.split('@')[1];
  return ADMIN_EMAILS.includes(email) || ADMIN_DOMAINS.includes(domain);
}

export default function AdminClientWorkspacePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const consultationId = params?.id;

  const { data: session, status: authStatus } = useSession();

  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState<string | null>(null);

  const isAdmin = isAdminEmail(session?.user?.email);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      const callback = consultationId ? `%2Fadmin%2Fclient%2F${encodeURIComponent(consultationId)}` : '%2Fadmin';
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

    if (!consultationId) {
      setError('Missing consultation id.');
      setLoading(false);
      return;
    }

    const loadClient = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/client/${consultationId}`);
        const payload = (await response.json()) as ApiPayload;

        if (response.status === 403) {
          setError('Access denied. Admin only.');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          setError(payload.error || 'Failed to load client workspace.');
          setLoading(false);
          return;
        }

        setData(payload);
        setNotes(payload.consultation.admin_notes || '');
      } catch {
        setError('Failed to load client workspace.');
      }

      setLoading(false);
    };

    loadClient();
  }, [authStatus, consultationId, isAdmin, router, session?.user?.email]);

  const planetOrder = useMemo(() => {
    const preferred = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    if (!data?.natalChart?.planets?.length) return preferred;

    const actual = data.natalChart.planets.map((planet) => planet.planet);
    return preferred.filter((name) => actual.includes(name));
  }, [data?.natalChart?.planets]);

  const aspectLookup = useMemo(() => {
    const map = new Map<string, Aspect>();
    for (const aspect of data?.natalChart?.aspects || []) {
      const keyA = `${aspect.planet1}-${aspect.planet2}`;
      const keyB = `${aspect.planet2}-${aspect.planet1}`;
      map.set(keyA, aspect);
      map.set(keyB, aspect);
    }
    return map;
  }, [data?.natalChart?.aspects]);

  async function saveNotes() {
    if (!data?.consultation?.id) return;

    setSavingNotes(true);
    setNotesMessage(null);

    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.consultation.id,
          status: data.consultation.status,
          admin_notes: notes,
        }),
      });

      if (!res.ok) {
        setNotesMessage('Failed to save notes.');
        setSavingNotes(false);
        return;
      }

      setNotesMessage('Notes saved.');
      setData((current) => (current
        ? {
            ...current,
            consultation: {
              ...current.consultation,
              admin_notes: notes,
            },
          }
        : current));
    } catch {
      setNotesMessage('Failed to save notes.');
    }

    setSavingNotes(false);
  }

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

  const birthSummary = [data.consultation.birth_date, data.consultation.birth_time, data.consultation.birth_place].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:pt-6 sm:px-6">
      {/* Header — compact, single line */}
      <header className="mb-5 flex items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-[10px] text-cream/40 uppercase tracking-widest mb-0.5">Client Workspace</p>
          <h1 className="font-heading text-2xl text-warmWhite">{data.consultation.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-cream/50">
            {(data.consultation.contact_email || data.user?.email) && (
              <a href={`mailto:${data.consultation.contact_email || data.user?.email}`} className="hover:text-lumina-soft transition">
                📧 {data.consultation.contact_email || data.user?.email}
              </a>
            )}
            {data.consultation.contact_phone && (
              <a href={`tel:${data.consultation.contact_phone}`} className="hover:text-lumina-soft transition">
                📱 {data.consultation.contact_phone}
              </a>
            )}
            {birthSummary && <span>🗓️ {birthSummary}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-[10px] text-cream/60 hover:text-cream hover:border-white/20 transition">
            🖨️ Export
          </button>
          <Link href="/admin" className="text-sm text-cream/50 hover:text-cream transition">← Back</Link>
        </div>
      </header>

      {/* Question + Topics — only if present */}
      {(data.consultation.question && data.consultation.question !== '-') && (
        <div className="mb-5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 print:hidden">
          <div className="flex items-start gap-3">
            <span className="text-cream/30 text-sm mt-0.5">💬</span>
            <div>
              <p className="text-sm text-cream/80 leading-relaxed">{data.consultation.question}</p>
              {data.consultation.topics?.length ? (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {data.consultation.topics.map((topic) => (
                    <span key={topic} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-cream/60">{topic}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ===== PRINT HEADER (hidden on screen) ===== */}
      <div className="hidden print:block mb-6">
        <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>✦ LUMINA ✦</h1>
          <p className="text-xs text-gray-500 uppercase tracking-[0.3em] mt-1">Natal Chart Report</p>
        </div>
        <div className="flex justify-between text-sm">
          <div>
            <p className="font-semibold text-lg">{data.consultation.name}</p>
            <p className="text-gray-600">{birthSummary}</p>
          </div>
          <div className="text-right text-gray-500 text-xs">
            <p>Prepared by Lumina Astrology</p>
            <p>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* ===== CHART + DATA — 3-column on large screens ===== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr_260px] mb-5">
        {/* Column 1: Chart wheel */}
        <div className="glass-card p-4">
          <p className="lumina-label mb-2 print:hidden">Natal Chart</p>
          {data.natalChart ? (
            <NatalWheel chart={data.natalChart} clientName={data.consultation.name} birthInfo={birthSummary} />
          ) : (
            <p className="text-cream/60 text-sm">{data.chartError || 'Natal chart unavailable.'}</p>
          )}
        </div>

        {/* Column 2: Planet table (full height) */}
        <div className="glass-card p-4">
          <p className="lumina-label mb-2">Planetary Positions</p>
          {data.natalChart ? (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 text-cream/50 text-[10px] uppercase tracking-wider print:text-gray-500 print:border-gray-300">
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
                    <tr key={planet.planet} className="border-b border-white/5 print:border-gray-200">
                      <td className="py-1.5 pr-2 text-warmWhite print:text-gray-900 font-medium">
                        <span className="text-lumina-soft print:text-gray-600">{PLANET_SYMBOLS[planet.planet]}</span> {planet.planet}
                      </td>
                      <td className="py-1.5 pr-2 text-cream print:text-gray-700">{planet.sign}</td>
                      <td className="py-1.5 pr-2 text-cream/80 print:text-gray-600 tabular-nums">{formatDegree(planet.degrees)}</td>
                      <td className="py-1.5 pr-2 text-cream/70 print:text-gray-600">{planet.house || '—'}</td>
                      <td className="py-1.5 text-cream/50 print:text-gray-500 text-xs hidden sm:table-cell">{signElements[planet.sign] || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-cream/60">No planetary data.</p>
          )}
        </div>

        {/* Column 3: Aspect grid (desktop) / below on mobile */}
        <div className="glass-card p-4">
          <p className="lumina-label mb-2">Aspects</p>
          {data.natalChart ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-center text-[10px]">
                <thead>
                  <tr>
                    <th className="p-0.5" />
                    {planetOrder.map((planet) => (
                      <th key={planet} className="p-0.5 text-cream/50 font-normal print:text-gray-500">{PLANET_SYMBOLS[planet]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {planetOrder.map((rowPlanet, rowIdx) => (
                    <tr key={rowPlanet}>
                      <th className="p-0.5 text-cream/50 font-normal print:text-gray-500">{PLANET_SYMBOLS[rowPlanet]}</th>
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

              {/* Aspect legend */}
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-cream/40 border-t border-white/5 pt-2 print:text-gray-500 print:border-gray-200">
                {Object.entries(ASPECT_STYLES).map(([name, { symbol, color }]) => (
                  <span key={name} className="flex items-center gap-1">
                    <span style={{ color }}>{symbol}</span> {name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-cream/60">No aspects.</p>
          )}
        </div>
      </div>

      {/* Key Aspects list — more readable than just the grid */}
      {data.natalChart && data.natalChart.aspects.length > 0 && (
        <div className="glass-card p-4 mb-5">
          <p className="lumina-label mb-2">Key Aspects</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            {data.natalChart.aspects
              .sort((a, b) => parseFloat(String(a.orb)) - parseFloat(String(b.orb)))
              .slice(0, 15)
              .map((aspect) => (
                <div key={`${aspect.planet1}-${aspect.planet2}`} className="flex items-center gap-2 text-xs py-1 border-b border-white/[0.04] print:border-gray-100">
                  <span className="text-warmWhite print:text-gray-900 font-medium w-16 text-right">{PLANET_SYMBOLS[aspect.planet1]} {aspect.planet1}</span>
                  <span style={{ color: ASPECT_STYLES[aspect.type]?.color }} className="text-sm">{ASPECT_STYLES[aspect.type]?.symbol}</span>
                  <span className="text-warmWhite print:text-gray-900 font-medium w-16">{PLANET_SYMBOLS[aspect.planet2]} {aspect.planet2}</span>
                  <span className="text-cream/40 print:text-gray-500 capitalize">{aspect.type}</span>
                  <span className="text-cream/30 print:text-gray-400 tabular-nums ml-auto">{aspect.orb}°</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Astrocartography Map */}
      <div className="mb-5 print:hidden">
        <AstrocartographySection
          userData={data.birthDataUsed}
          clientName={data.consultation.name}
          clientEmail={data.consultation.contact_email || data.user?.email}
          natalPlanets={data.natalChart?.planets || null}
        />
      </div>

      {/* Session Notes */}
      <section className="glass-card p-4 print:hidden">
        <label htmlFor="admin-notes" className="lumina-label block mb-2">Session Notes</label>
        <textarea
          id="admin-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="lumina-input min-h-[120px]"
          placeholder="Write session notes, follow-ups, and action items..."
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[10px] text-cream/40">
            Status: <span className="capitalize text-cream/60">{data.consultation.status.replace('_', ' ')}</span>
          </p>
          <button
            onClick={saveNotes}
            disabled={savingNotes}
            className="rounded-full border border-lumina-accent/40 px-4 py-1.5 text-xs text-lumina-soft hover:border-lumina-accent hover:text-warmWhite transition disabled:opacity-50"
          >
            {savingNotes ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
        {notesMessage && (
          <p className={`mt-1 text-xs ${notesMessage === 'Notes saved.' ? 'text-emerald-300' : 'text-red-300'}`}>{notesMessage}</p>
        )}
      </section>

      {/* Print footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">
        <p>Generated by Lumina · luminastrology.com</p>
      </div>
    </div>
  );
}
