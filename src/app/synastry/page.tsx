'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ShareCard from '@/components/ShareCard';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile } from '@/lib/profile';
import { translateAspectType, translatePlanet, translateSign } from '@/lib/translations';
import type { BirthData, SynastryData, SynastryNarrative } from '@/types';

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

type SavedPartner = {
  id: number;
  partner_name: string;
  partner_birth_date: string | null;
  partner_birth_time: string | null;
  partner_birth_place: string | null;
  partner_birth_latitude: number | null;
  partner_birth_longitude: number | null;
  partner_birth_timezone: string | null;
  is_linked: boolean;
  linked_user_name: string | null;
  linked_user_email: string | null;
  linked_birth_date: string | null;
  linked_birth_time: string | null;
  linked_birth_place: string | null;
  linked_birth_latitude: number | null;
  linked_birth_longitude: number | null;
  linked_birth_timezone: string | null;
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

/* ─── Radar Chart ─── */
function RadarChart({ values }: { values: { label: string; value: number }[] }) {
  const center = 140;
  const radius = 105;
  const points = values
    .map((item, index) => {
      const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
      const x = center + Math.cos(angle) * radius * (item.value / 100);
      const y = center + Math.sin(angle) * radius * (item.value / 100);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 280 280" className="mx-auto w-full max-w-[320px]">
      {/* Grid rings */}
      {[25, 50, 75, 100].map((level) => (
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
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}
      {/* Axis lines + labels */}
      {values.map((item, index) => {
        const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        const lx = center + Math.cos(angle) * (radius + 22);
        const ly = center + Math.sin(angle) * (radius + 22);
        return (
          <g key={item.label}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <text x={lx} y={ly} fill="rgba(245,240,235,0.7)" fontSize="10" fontWeight="500" textAnchor="middle" dominantBaseline="middle">
              {item.label}
            </text>
          </g>
        );
      })}
      {/* Filled area */}
      <polygon points={points} fill="url(#radarGradient)" stroke="rgba(196,181,253,0.8)" strokeWidth="2" />
      {/* Dots on vertices */}
      {values.map((item, index) => {
        const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
        const x = center + Math.cos(angle) * radius * (item.value / 100);
        const y = center + Math.sin(angle) * radius * (item.value / 100);
        return <circle key={item.label} cx={x} cy={y} r="3.5" fill="#c4b5fd" stroke="#080c1f" strokeWidth="1.5" />;
      })}
      <defs>
        <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(167,139,250,0.3)" />
          <stop offset="100%" stopColor="rgba(196,181,253,0.15)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Benefit Card ─── */
function BenefitCard({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <span className="mt-0.5 text-lg">{icon}</span>
      <p className="text-sm leading-relaxed text-cream/80">{text}</p>
    </div>
  );
}

/* ─── Person Form Card ─── */
function PersonCard({
  title,
  subtitle,
  personKey,
  state,
  setState,
  searchLocation,
  selectLocation,
  t,
}: {
  title: string;
  subtitle: string;
  personKey: 'A' | 'B';
  state: PersonFormState;
  setState: React.Dispatch<React.SetStateAction<PersonFormState>>;
  searchLocation: (query: string, target: 'A' | 'B') => void;
  selectLocation: (item: LocationResult, target: 'A' | 'B') => void;
  t: Record<string, string>;
}) {
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  return (
    <section className="glass-card overflow-hidden">
      {/* Card header with gradient accent */}
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-lumina-accent/10 to-transparent px-5 py-4 sm:px-6">
        <h2 className="font-heading text-xl text-warmWhite">{title}</h2>
        <p className="mt-0.5 text-xs text-cream/50">{subtitle}</p>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {/* Name */}
        <div>
          <label className="lumina-label">{t.name}</label>
          <input
            className="lumina-input"
            value={state.name}
            onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={personKey === 'A' ? (t.synastryPlaceholderYou || 'Your name') : (t.synastryPlaceholderPartner || "Their name")}
          />
        </div>

        {/* Date of Birth */}
        <div>
          <p className="lumina-label mb-2">{t.dateOfBirth}</p>
          <div className="grid grid-cols-3 gap-2">
            <select className="lumina-input" value={state.day} onChange={(e) => setState((prev) => ({ ...prev, day: e.target.value }))} required>
              <option value="">{t.day}</option>
              {days.map((d) => (
                <option key={d} value={String(d).padStart(2, '0')}>{String(d).padStart(2, '0')}</option>
              ))}
            </select>
            <select className="lumina-input" value={state.month} onChange={(e) => setState((prev) => ({ ...prev, month: e.target.value }))} required>
              <option value="">{t.month}</option>
              {months.map((m) => (
                <option key={m} value={String(m).padStart(2, '0')}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
            <select className="lumina-input" value={state.year} onChange={(e) => setState((prev) => ({ ...prev, year: e.target.value }))} required>
              <option value="">{t.year}</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Time of Birth */}
        <div>
          <p className="lumina-label mb-2">{t.timeOfBirth}</p>
          <div className="grid grid-cols-2 gap-2">
            <select className="lumina-input" value={state.hour} onChange={(e) => setState((prev) => ({ ...prev, hour: e.target.value }))} required>
              <option value="">{t.hour}</option>
              {hours.map((h) => (
                <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}</option>
              ))}
            </select>
            <select className="lumina-input" value={state.minute} onChange={(e) => setState((prev) => ({ ...prev, minute: e.target.value }))} required>
              <option value="">{t.minute}</option>
              {minutes.map((m) => (
                <option key={m} value={String(m).padStart(2, '0')}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="relative">
          <label className="lumina-label">{t.birthLocation}</label>
          <input
            className="lumina-input"
            value={state.locationQuery}
            onChange={(e) => {
              const query = e.target.value;
              setState((prev) => ({
                ...prev,
                locationQuery: query,
                selectedLocationName: '',
                latitude: null,
                longitude: null,
              }));
              if (debounceTimer.current) clearTimeout(debounceTimer.current);
              debounceTimer.current = setTimeout(() => searchLocation(query, personKey), 350);
            }}
            placeholder={t.searchCityOrPlace}
            required
          />
          {state.searchResults.length > 0 && (
            <div className="absolute z-40 bottom-full mb-1 w-full max-h-48 overflow-y-auto overflow-hidden rounded-xl border border-white/10 bg-[#0f1433]/95 backdrop-blur-md shadow-xl">
              {state.searchResults.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  className="block min-h-11 w-full border-b border-white/5 px-3 py-3 text-left text-sm text-warmWhite transition hover:bg-white/10"
                  onClick={() => selectLocation(item, personKey)}
                >
                  {item.display_name}
                </button>
              ))}
            </div>
          )}
          {state.searching && <p className="mt-2 text-xs text-cream/40">{t.synastrySearching}</p>}
        </div>

        {state.selectedLocationName && (
          <div className="flex items-center gap-2 rounded-xl border border-lumina-accent/20 bg-lumina-accent/5 px-3 py-2">
            <span className="text-xs text-lumina-soft">📍</span>
            <p className="text-xs text-cream/75">{state.selectedLocationName}</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Main Page ─── */
export default function SynastryPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { data: session, status: sessionStatus } = useSession();

  const [personA, setPersonA] = useState<PersonFormState>(initialPerson);
  const [personB, setPersonB] = useState<PersonFormState>(initialPerson);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SynastryResponse | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('lumina_synastry_result');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [openSection, setOpenSection] = useState<keyof SynastryNarrative>('overallConnection');
  const [savedPartners, setSavedPartners] = useState<SavedPartner[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState('');
  const [connectCodeInput, setConnectCodeInput] = useState('');
  const [showConnectCode, setShowConnectCode] = useState(false);
  const [connectCodeLoading, setConnectCodeLoading] = useState(false);
  const [savePartnerLoading, setSavePartnerLoading] = useState(false);
  const [partnerSaved, setPartnerSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setPersonA((prev) => ({ ...prev, timezone }));
    setPersonB((prev) => ({ ...prev, timezone }));
  }, []);

  useEffect(() => {
    const applyProfile = (name: string, birthData: { day: number; month: number; year: number; hour: number; minute: number; latitude: number; longitude: number; timezone: string }, locationName: string) => {
      setPersonA((prev) => ({
        ...prev,
        name: name || '',
        day: String(birthData.day).padStart(2, '0'),
        month: String(birthData.month + 1).padStart(2, '0'),
        year: String(birthData.year),
        hour: String(birthData.hour).padStart(2, '0'),
        minute: String(birthData.minute).padStart(2, '0'),
        locationQuery: locationName,
        selectedLocationName: locationName,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone,
      }));
    };

    // Try localStorage first
    const profile = loadProfile();
    if (profile?.birthData?.latitude) {
      applyProfile(profile.name, profile.birthData, profile.locationName);
      return;
    }

    // Fall back to server-side profile
    fetch('/api/user')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.birth_latitude && data?.birth_date) {
          const [y, m, d] = (data.birth_date as string).split('-').map(Number);
          const [hr, min] = (data.birth_time || '12:00').split(':').map(Number);
          applyProfile(data.name || '', {
            day: d, month: m - 1, year: y, hour: hr, minute: min,
            latitude: data.birth_latitude, longitude: data.birth_longitude,
            timezone: data.birth_timezone || 'UTC',
          }, data.birth_place || '');
        }
      })
      .catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(''), 2500);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const autoFilledRef = useRef(false);

  const loadConnections = useCallback(async () => {
    if (!session?.user) return;
    setConnectionsLoading(true);
    setConnectionsError('');
    try {
      const response = await fetch('/api/connections');
      if (!response.ok) throw new Error('failed');
      const payload = (await response.json()) as { connections?: SavedPartner[] };
      const partners = payload.connections || [];
      setSavedPartners(partners);

      // Auto-fill Person B if exactly one saved partner and haven't auto-filled yet
      if (partners.length >= 1 && !autoFilledRef.current) {
        autoFilledRef.current = true;
        // Use the first/primary partner
        const partner = partners[0];
        const birthDate = partner.is_linked ? (partner.linked_birth_date || partner.partner_birth_date) : partner.partner_birth_date;
        const birthTime = partner.is_linked ? (partner.linked_birth_time || partner.partner_birth_time) : partner.partner_birth_time;
        const birthPlace = partner.is_linked ? (partner.linked_birth_place || partner.partner_birth_place) : partner.partner_birth_place;
        const birthLatitude = partner.is_linked ? (partner.linked_birth_latitude ?? partner.partner_birth_latitude) : partner.partner_birth_latitude;
        const birthLongitude = partner.is_linked ? (partner.linked_birth_longitude ?? partner.partner_birth_longitude) : partner.partner_birth_longitude;
        const birthTimezone = partner.is_linked ? (partner.linked_birth_timezone || partner.partner_birth_timezone) : partner.partner_birth_timezone;
        const [year = '', month = '', day = ''] = (birthDate || '').split('-');
        const [hour = '', minute = ''] = (birthTime || '').split(':');
        setPersonB((prev) => ({
          ...prev,
          name: partner.partner_name || partner.linked_user_name || '',
          day, month, year, hour, minute,
          locationQuery: birthPlace || '',
          selectedLocationName: birthPlace || '',
          latitude: birthLatitude ?? null,
          longitude: birthLongitude ?? null,
          timezone: birthTimezone || prev.timezone || 'UTC',
          searchResults: [],
        }));
      }
    } catch {
      setConnectionsError(
        language === 'ru'
          ? 'Не удалось загрузить сохраненных партнеров'
          : 'Unable to load saved partners'
      );
    } finally {
      setConnectionsLoading(false);
    }
  }, [language, session?.user]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      loadConnections();
      return;
    }
    if (sessionStatus === 'unauthenticated') {
      setSavedPartners([]);
      setConnectionsError('');
    }
  }, [loadConnections, sessionStatus]);

  const searchLocation = useCallback(async (query: string, target: 'A' | 'B') => {
    const update = target === 'A' ? setPersonA : setPersonB;
    if (query.trim().length < 2) {
      update((prev) => ({ ...prev, searchResults: [] }));
      return;
    }
    update((prev) => ({ ...prev, searching: true }));
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const payload = (await response.json()) as LocationResult[];
      update((prev) => ({ ...prev, searchResults: payload, searching: false }));
    } catch {
      update((prev) => ({ ...prev, searchResults: [], searching: false }));
    }
  }, []);

  const selectLocation = async (item: LocationResult, target: 'A' | 'B') => {
    const update = target === 'A' ? setPersonA : setPersonB;
    const lat = Number.parseFloat(item.lat);
    const lon = Number.parseFloat(item.lon);
    let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    try {
      const response = await fetch(`/api/timezone?lat=${lat}&lon=${lon}`);
      const payload = (await response.json()) as { timezone?: string };
      if (payload.timezone) timezone = payload.timezone;
    } catch { /* keep browser fallback */ }
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
    const valid = (p: PersonFormState) =>
      p.day && p.month && p.year && p.hour && p.minute && p.selectedLocationName && p.latitude !== null && p.longitude !== null;
    return valid(personA) && valid(personB);
  }, [personA, personB]);

  const toBirthData = (p: PersonFormState): BirthData => ({
    year: parseInt(p.year, 10),
    month: parseInt(p.month, 10) - 1,
    day: parseInt(p.day, 10),
    hour: parseInt(p.hour, 10),
    minute: parseInt(p.minute, 10),
    latitude: p.latitude ?? 0,
    longitude: p.longitude ?? 0,
    timezone: p.timezone,
  });

  const fillPersonBFromPartner = (partner: SavedPartner) => {
    const birthDate = partner.is_linked ? (partner.linked_birth_date || partner.partner_birth_date) : partner.partner_birth_date;
    const birthTime = partner.is_linked ? (partner.linked_birth_time || partner.partner_birth_time) : partner.partner_birth_time;
    const birthPlace = partner.is_linked ? (partner.linked_birth_place || partner.partner_birth_place) : partner.partner_birth_place;
    const birthLatitude = partner.is_linked ? (partner.linked_birth_latitude ?? partner.partner_birth_latitude) : partner.partner_birth_latitude;
    const birthLongitude = partner.is_linked ? (partner.linked_birth_longitude ?? partner.partner_birth_longitude) : partner.partner_birth_longitude;
    const birthTimezone = partner.is_linked ? (partner.linked_birth_timezone || partner.partner_birth_timezone) : partner.partner_birth_timezone;

    const [year = '', month = '', day = ''] = (birthDate || '').split('-');
    const [hour = '', minute = ''] = (birthTime || '').split(':');

    setPersonB((prev) => ({
      ...prev,
      name: partner.partner_name || partner.linked_user_name || '',
      day,
      month,
      year,
      hour,
      minute,
      locationQuery: birthPlace || '',
      selectedLocationName: birthPlace || '',
      latitude: birthLatitude ?? null,
      longitude: birthLongitude ?? null,
      timezone: birthTimezone || prev.timezone || 'UTC',
      searchResults: [],
    }));
  };

  const handleConnectWithCode = async () => {
    const code = connectCodeInput.trim().toUpperCase();
    if (!code) {
      setConnectionsError(language === 'ru' ? 'Введите код подключения' : 'Please enter a connection code');
      return;
    }
    setConnectCodeLoading(true);
    setConnectionsError('');
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect-code', code }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'failed');
      setConnectCodeInput('');
      await loadConnections();
      setToastMessage(language === 'ru' ? 'Партнер подключен' : 'Partner connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'failed';
      setConnectionsError(
        language === 'ru'
          ? `Ошибка подключения: ${message}`
          : `Connection failed: ${message}`
      );
    } finally {
      setConnectCodeLoading(false);
    }
  };

  const handleSavePartner = async () => {
    if (!session?.user) return;
    setSavePartnerLoading(true);
    setError('');
    try {
      const birthDate = `${personB.year}-${personB.month}-${personB.day}`;
      const birthTime = `${personB.hour}:${personB.minute}`;
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-partner',
          partnerData: {
            partner_name: personB.name || (language === 'ru' ? 'Партнер' : 'Partner'),
            birth_date: birthDate,
            birth_time: birthTime,
            birth_place: personB.selectedLocationName,
            birth_latitude: personB.latitude,
            birth_longitude: personB.longitude,
            birth_timezone: personB.timezone,
            relationship_type: 'partner',
          },
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'failed');
      setPartnerSaved(true);
      setToastMessage(
        language === 'ru'
          ? `✓ Сохранено: ${personB.name || 'Партнер'}`
          : `✓ Saved: ${personB.name || 'Partner'}`
      );
      await loadConnections();
    } catch (err) {
      console.error('Save partner error:', err);
      setToastMessage(language === 'ru' ? '❌ Не удалось сохранить' : '❌ Unable to save');
    } finally {
      setSavePartnerLoading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/synastry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDataA: toBirthData(personA), birthDataB: toBirthData(personB), language }),
      });
      if (!response.ok) throw new Error('failed');
      const payload = (await response.json()) as SynastryResponse;
      setResult(payload);
      try {
        localStorage.setItem('lumina_synastry_result', JSON.stringify(payload));
        localStorage.setItem('lumina_synastry_names', JSON.stringify({ a: personA.name, b: personB.name }));
      } catch {}
    } catch {
      setError(t.synastryError);
    } finally {
      setLoading(false);
    }
  };

  const sections: { key: keyof SynastryNarrative; title: string; icon: string; text: string }[] = result
    ? [
        { key: 'overallConnection', title: t.synastryOverallConnection, icon: '✦', text: result.interpretation.overallConnection },
        { key: 'communicationStyle', title: t.synastryCommunication, icon: '💬', text: result.interpretation.communicationStyle },
        { key: 'emotionalCompatibility', title: t.synastryEmotional, icon: '🌊', text: result.interpretation.emotionalCompatibility },
        { key: 'attractionChemistry', title: t.synastryChemistry, icon: '🔥', text: result.interpretation.attractionChemistry },
        { key: 'growthChallenges', title: t.synastryGrowth, icon: '🌱', text: result.interpretation.growthChallenges },
        { key: 'longTermPotential', title: t.synastryLongTerm, icon: '♾️', text: result.interpretation.longTermPotential },
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

  // ─── RESULTS VIEW ───
  if (result) {
    let cachedNames = { a: '', b: '' };
    try { cachedNames = JSON.parse(localStorage.getItem('lumina_synastry_names') || '{}'); } catch {}
    const nameA = personA.name || cachedNames.a || t.synastryPersonA;
    const nameB = personB.name || cachedNames.b || t.synastryPersonB;
    const sunA = result.synastry.personAChart.planets.find((p) => p.planet === 'Sun');
    const moonA = result.synastry.personAChart.planets.find((p) => p.planet === 'Moon');
    const sunB = result.synastry.personBChart.planets.find((p) => p.planet === 'Sun');
    const moonB = result.synastry.personBChart.planets.find((p) => p.planet === 'Moon');

    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 animate-fadeInUp">
        {/* Results Header */}
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-lumina-accent/70 mb-2">
            {language === 'ru' ? 'Ваша совместимость' : 'Your Relationship Reading'}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl text-lumina-soft mb-1">
            {nameA} & {nameB}
          </h1>
        </div>

        {/* Big Three Comparison */}
        <section className="glass-card mb-6 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
            {[
              { name: nameA, sun: sunA, moon: moonA, rising: result.synastry.personAChart.risingSign },
              { name: nameB, sun: sunB, moon: moonB, rising: result.synastry.personBChart.risingSign },
            ].map((person) => (
              <div key={person.name} className="p-5 text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-cream/50 mb-3">{person.name}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-cream/40">{t.sun}</p>
                    <p className="text-sm font-medium text-warmWhite">{language === 'ru' ? translateSign(person.sun?.sign || '', language) : person.sun?.sign}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-cream/40">{t.moon}</p>
                    <p className="text-sm font-medium text-warmWhite">{language === 'ru' ? translateSign(person.moon?.sign || '', language) : person.moon?.sign}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-cream/40">{t.rising}</p>
                    <p className="text-sm font-medium text-warmWhite">{language === 'ru' ? translateSign(person.rising, language) : person.rising}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Radar Chart */}
        <section className="glass-card mb-6 p-6">
          <p className="text-center text-xs uppercase tracking-[0.15em] text-cream/50 mb-4">{t.synastryCompatibilityWheel}</p>
          <RadarChart values={radarValues} />
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {radarValues.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                <span className="text-xs text-cream/60">{item.label}</span>
                <span className="text-sm font-medium text-lumina-soft">{item.value}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* Narrative Sections */}
        <section className="mb-6 space-y-2">
          {sections.map((section) => (
            <div key={section.key} className="glass-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSection(openSection === section.key ? ('' as keyof SynastryNarrative) : section.key)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.02]"
              >
                <span className="text-base">{section.icon}</span>
                <span className="flex-1 text-sm font-medium text-warmWhite">{section.title}</span>
                <svg
                  className={`h-4 w-4 text-cream/40 transition-transform ${openSection === section.key ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openSection === section.key && (
                <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 animate-fadeInUp">
                  <p className="text-sm leading-relaxed text-cream/85">{section.text}</p>
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Key Aspects */}
        <section className="glass-card mb-6 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.15em] text-cream/50 mb-4">{t.synastryKeyAspects}</p>
          <div className="space-y-3">
            {result.synastry.crossAspects.slice(0, 8).map((aspect, idx) => (
              <div key={`${aspect.planetA}-${aspect.planetB}-${idx}`} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    ['trine', 'sextile'].includes(aspect.type.toLowerCase()) ? 'bg-emerald-400' :
                    ['square', 'opposition'].includes(aspect.type.toLowerCase()) ? 'bg-amber-400' :
                    'bg-lumina-accent'
                  }`} />
                  <p className="text-xs uppercase tracking-[0.12em] text-lumina-soft">
                    {translatePlanet(aspect.planetA, language)} {translateAspectType(aspect.type, language)} {translatePlanet(aspect.planetB, language)}
                  </p>
                  <span className="text-[10px] text-cream/30">{aspect.orb.toFixed(1)}°</span>
                </div>
                <p className="text-sm leading-relaxed text-cream/80">
                  {language === 'ru'
                    ? `${translatePlanet(aspect.planetA, language)} в ${translateSign(aspect.signA, language)} — ${translateAspectType(aspect.type, language).toLowerCase()} — ${translatePlanet(aspect.planetB, language)} в ${translateSign(aspect.signB, language)}. ${aspect.meaning}`
                    : `Your ${aspect.planetA} in ${aspect.signA} ${aspect.type.toLowerCase()}s their ${aspect.planetB} in ${aspect.signB}. ${aspect.meaning}`
                  }
                </p>
              </div>
            ))}
          </div>
        </section>

        {session?.user && (
          <button
            type="button"
            onClick={handleSavePartner}
            disabled={savePartnerLoading || partnerSaved}
            className={`mb-6 w-full rounded-2xl px-5 py-3.5 text-sm font-medium transition ${
              partnerSaved
                ? 'border border-green-500/30 bg-green-500/10 text-green-300 cursor-default'
                : 'lumina-button disabled:cursor-not-allowed disabled:opacity-60'
            }`}
          >
            {savePartnerLoading
              ? (language === 'ru' ? 'Сохраняем...' : 'Saving...')
              : partnerSaved
                ? `✓ ${language === 'ru' ? 'Сохранено' : 'Saved'}`
                : `${language === 'ru' ? 'Сохранить' : 'Save'} ${nameB}`}
          </button>
        )}

        {/* Share Card */}
        <ShareCard
          type="synastry-summary"
          title={language === 'ru' ? `${nameA} & ${nameB}` : `${nameA} & ${nameB}`}
          subtitle={result.interpretation.overallConnection}
          bullets={radarValues.map((v) => `${v.label}: ${v.value}%`)}
        />

        {/* Back to form */}
        <button
          type="button"
          onClick={() => { setResult(null); setPartnerSaved(false); try { localStorage.removeItem('lumina_synastry_result'); localStorage.removeItem('lumina_synastry_names'); } catch {} }}
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3 text-sm text-cream/70 transition hover:bg-white/[0.06] hover:text-warmWhite"
        >
          {language === 'ru' ? '← Новый расчёт' : '← New Reading'}
        </button>

        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-xl border border-lumina-accent/30 bg-[#111633]/95 px-4 py-3 text-center text-sm text-warmWhite shadow-xl backdrop-blur">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  // ─── FORM VIEW ───
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      {/* Hero */}
      <div className="mb-10 text-center animate-fadeInUp">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mb-6 inline-flex items-center gap-1 text-sm text-cream/50 transition hover:text-cream/80"
        >
          ← {t.back}
        </button>
        <h1 className="font-heading text-4xl sm:text-5xl text-lumina-soft mb-3">{t.synastryTitle}</h1>
        <p className="text-lg text-cream/60 mb-6">{t.synastrySubtitle}</p>
        <p className="mx-auto max-w-lg text-sm leading-relaxed text-cream/50">{t.synastryHeroText}</p>
      </div>

      {/* Benefits */}
      <div className="mb-10 grid gap-3 sm:grid-cols-2 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <BenefitCard icon="💬" text={t.synastryWhy1} />
        <BenefitCard icon="🌊" text={t.synastryWhy2} />
        <BenefitCard icon="🔥" text={t.synastryWhy3} />
        <BenefitCard icon="🌱" text={t.synastryWhy4} />
      </div>

      {/* Form */}
      <form onSubmit={submit} className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
        <div className="grid gap-4 lg:grid-cols-2">
          <PersonCard
            title={t.synastryPersonA}
            subtitle={language === 'ru' ? 'Автозаполнение из профиля' : 'Auto-filled from your profile'}
            personKey="A"
            state={personA}
            setState={setPersonA}
            searchLocation={searchLocation}
            selectLocation={selectLocation}
            t={t}
          />
          <div className="space-y-4">
            {/* Show partner selector only when multiple saved partners */}
            {session?.user && savedPartners.length > 1 && (
              <section className="glass-card p-4 sm:p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-cream/40">
                  {language === 'ru' ? 'Выбрать партнёра' : 'Select partner'}
                </p>
                <div className="space-y-2">
                  {savedPartners.map((partner) => {
                    const place = partner.is_linked
                      ? (partner.linked_birth_place || partner.partner_birth_place)
                      : partner.partner_birth_place;
                    return (
                      <button
                        key={partner.id}
                        type="button"
                        onClick={() => fillPersonBFromPartner(partner)}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition hover:border-lumina-accent/35 hover:bg-white/[0.06]"
                      >
                        <p className="text-sm font-medium text-warmWhite">{partner.partner_name}</p>
                        <p className="text-xs text-cream/50">{place || ''}</p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Connect with code — collapsed behind a link */}
            {session?.user && (
              <div className="text-center">
                {!showConnectCode && (
                  <button
                    type="button"
                    onClick={() => setShowConnectCode(true)}
                    className="text-xs text-lumina-accent/50 hover:text-lumina-accent/80 transition"
                  >
                    {language === 'ru' ? 'Подключить по коду партнёра' : 'Connect with partner code'}
                  </button>
                )}
                {showConnectCode && (
                  <div className="flex gap-2 mt-1">
                    <input
                      className="lumina-input text-center"
                      value={connectCodeInput}
                      onChange={(e) => setConnectCodeInput(e.target.value.toUpperCase())}
                      placeholder="LUNA-XXXX"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleConnectWithCode}
                      disabled={connectCodeLoading || !connectCodeInput.trim()}
                      className="lumina-button min-w-20 px-4 disabled:opacity-60"
                    >
                      {connectCodeLoading ? '...' : 'OK'}
                    </button>
                  </div>
                )}
                {connectionsError && <p className="mt-2 text-xs text-rose-300">{connectionsError}</p>}
              </div>
            )}

            <PersonCard
              title={t.synastryPersonB}
              subtitle={language === 'ru' ? 'Партнёр, друг, коллега — кто угодно' : "Partner, friend, crush — anyone you're curious about"}
              personKey="B"
              state={personB}
              setState={setPersonB}
              searchLocation={searchLocation}
              selectLocation={selectLocation}
              t={t}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-lumina-accent-bright to-lumina-accent px-8 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-lumina-accent/20 transition hover:shadow-lumina-accent/40 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? t.synastryLoading : t.synastryRun}
        </button>
        {error && <p className="mt-3 text-center text-sm text-rose-300">{error}</p>}
      </form>

      {/* Loading skeleton */}
      {loading && (
        <section className="mt-8 glass-card p-6 animate-fadeInUp">
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="h-2 w-2 rounded-full bg-lumina-accent animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-lumina-accent animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="h-2 w-2 rounded-full bg-lumina-accent animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          <p className="text-center text-sm text-cream/50">{t.synastryLoading}</p>
        </section>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-xl border border-lumina-accent/30 bg-[#111633]/95 px-4 py-3 text-center text-sm text-warmWhite shadow-xl backdrop-blur">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
