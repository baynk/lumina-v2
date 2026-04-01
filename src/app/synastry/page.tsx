'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ChevronDown, Flame, Infinity, Link2, LucideIcon, MapPin, MessageCircle, Send, Sparkles, Sprout, Waves } from 'lucide-react';
import ShareCard from '@/components/ShareCard';
import RadarChart from '@/components/RadarChart';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile } from '@/lib/profile';
import { translateAspectType, translatePlanet, translateSign, translateSynastryAspectMeaning } from '@/lib/translations';
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

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://luminastrology.com').replace(/\/+$/, '');

/* ─── Radar Chart ─── */
// RadarChart extracted to @/components/RadarChart

/* ─── Benefit Card ─── */
function BenefitCard({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="glass-card flex items-start gap-3 rounded-[28px] p-4">
      <Icon className="mt-0.5 shrink-0 text-[#8D8B9F]" size={18} strokeWidth={1.5} />
      <p className="text-sm leading-relaxed text-[#8D8B9F]">{text}</p>
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
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-[#C8A4A4]/10 to-transparent px-5 py-4 sm:px-6">
        <p className="lumina-label mb-2">{personKey === 'A' ? (t.synastryPersonA || 'Person A') : (t.synastryPersonB || 'Person B')}</p>
        <h2 className="font-heading text-xl text-[#FDFBF7]">{title}</h2>
        <p className="mt-0.5 text-xs text-[#8D8B9F]">{subtitle}</p>
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
            <div className="absolute bottom-full z-40 mb-1 max-h-48 w-full overflow-hidden overflow-y-auto rounded-[22px] border border-white/10 bg-[rgba(20,17,33,0.94)] shadow-xl backdrop-blur-md">
              {state.searchResults.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  className="block min-h-11 w-full border-b border-white/5 px-3 py-3 text-left text-sm text-[#FDFBF7] transition hover:bg-white/10"
                  onClick={() => selectLocation(item, personKey)}
                >
                  {item.display_name}
                </button>
              ))}
            </div>
          )}
          {state.searching && <p className="mt-2 text-xs text-[#8D8B9F]">{t.synastrySearching}</p>}
        </div>

        {state.selectedLocationName && (
          <div className="flex items-center gap-2 rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <MapPin className="text-[#C0BDD6]" size={14} strokeWidth={1.5} />
            <p className="text-xs text-[#C0BDD6]">{state.selectedLocationName}</p>
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

  // Redirect home if profile is cleared (e.g. sign-out)
  useEffect(() => {
    const handler = () => { if (!loadProfile()) router.push('/'); };
    window.addEventListener('lumina-profile-changed', handler);
    return () => window.removeEventListener('lumina-profile-changed', handler);
  }, [router]);

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
  const [shareUrl, setShareUrl] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('lumina_synastry_share_url') || '';
  });
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [savedPartners, setSavedPartners] = useState<SavedPartner[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState('');
  const [connectionCode, setConnectionCode] = useState('');
  const [connectionCodeLoading, setConnectionCodeLoading] = useState(false);
  const [connectCodeInput, setConnectCodeInput] = useState('');
  const [showConnectCode, setShowConnectCode] = useState(false);
  const [connectCodeLoading, setConnectCodeLoading] = useState(false);
  const [savePartnerLoading, setSavePartnerLoading] = useState(false);
  const [partnerSaved, setPartnerSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setPersonA((prev) => ({ ...prev, timezone }));
    setPersonB((prev) => ({ ...prev, timezone }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('code')?.trim().toUpperCase();
    if (!inviteCode) return;
    setConnectCodeInput(inviteCode);
    setShowConnectCode(true);
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
    if (
      profile?.birthData &&
      profile.birthData.latitude !== null &&
      profile.birthData.latitude !== undefined &&
      profile.birthData.longitude !== null &&
      profile.birthData.longitude !== undefined
    ) {
      applyProfile(profile.name, profile.birthData, profile.locationName);
      return;
    }

    // Fall back to server-side profile
    fetch('/api/user')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (
          data?.birth_date &&
          data.birth_latitude !== null &&
          data.birth_latitude !== undefined &&
          data.birth_longitude !== null &&
          data.birth_longitude !== undefined
        ) {
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

  useEffect(() => {
    if (!inviteStatus) return;
    const timeout = setTimeout(() => setInviteStatus(''), 2500);
    return () => clearTimeout(timeout);
  }, [inviteStatus]);

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

  useEffect(() => {
    async function loadConnectionCode() {
      if (sessionStatus !== 'authenticated') {
        setConnectionCode('');
        return;
      }

      setConnectionCodeLoading(true);
      try {
        const response = await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-code' }),
        });
        const payload = (await response.json()) as { code?: string; error?: string };
        if (!response.ok) throw new Error(payload.error || 'failed');
        setConnectionCode(payload.code || '');
      } catch {
        setConnectionsError(
          language === 'ru'
            ? 'Не удалось загрузить код подключения'
            : 'Unable to load connection code'
        );
      } finally {
        setConnectionCodeLoading(false);
      }
    }

    loadConnectionCode();
  }, [language, sessionStatus]);

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
    const isValidCalendarDate = (p: PersonFormState) => {
      const y = Number.parseInt(p.year, 10);
      const m = Number.parseInt(p.month, 10);
      const d = Number.parseInt(p.day, 10);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
      const date = new Date(Date.UTC(y, m - 1, d));
      return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
    };

    const valid = (p: PersonFormState) =>
      p.day &&
      p.month &&
      p.year &&
      p.hour &&
      p.minute &&
      p.selectedLocationName &&
      p.latitude !== null &&
      p.longitude !== null &&
      isValidCalendarDate(p);
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

  const inviteLink = connectionCode ? `${siteUrl}/synastry?code=${encodeURIComponent(connectionCode)}` : '';

  const handleCopyInviteCode = async () => {
    if (!connectionCode) return;
    try {
      await navigator.clipboard.writeText(connectionCode);
      setInviteStatus(language === 'ru' ? 'Код скопирован' : 'Code copied');
    } catch {
      setConnectionsError(language === 'ru' ? 'Не удалось скопировать код' : 'Unable to copy code');
    }
  };

  const handleShareInvite = async () => {
    if (!inviteLink || !connectionCode) return;

    const message = language === 'ru'
      ? `Присоединяйся ко мне в Lumina. Открой синастрию по ссылке или используй код ${connectionCode}.`
      : `Join me on Lumina. Open synastry from this link or use code ${connectionCode}.`;

    try {
      await navigator.clipboard.writeText(`${message}\n${inviteLink}`);
    } catch {
      // Clipboard fallback is non-blocking; continue with native share or toast.
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lumina Synastry',
          text: message,
          url: inviteLink,
        });
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          setInviteStatus(language === 'ru' ? 'Ссылка скопирована' : 'Invite link copied');
          return;
        }
      }
    }

    setInviteStatus(language === 'ru' ? 'Ссылка скопирована' : 'Invite link copied');
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
          ? `Сохранено: ${personB.name || 'Партнер'}`
          : `Saved: ${personB.name || 'Partner'}`
      );
      await loadConnections();
    } catch (err) {
      console.error('Save partner error:', err);
      setToastMessage(language === 'ru' ? 'Не удалось сохранить' : 'Unable to save');
    } finally {
      setSavePartnerLoading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setError(language === 'ru' ? 'Проверьте дату рождения для обоих людей' : 'Please check both birth dates');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/synastry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDataA: toBirthData(personA),
          birthDataB: toBirthData(personB),
          nameA: personA.name,
          nameB: personB.name,
          language,
        }),
      });
      if (!response.ok) throw new Error('failed');
      const payload = (await response.json()) as SynastryResponse;
      setResult(payload);
      try {
        localStorage.setItem('lumina_synastry_result', JSON.stringify(payload));
        localStorage.setItem('lumina_synastry_names', JSON.stringify({ a: personA.name, b: personB.name }));
      } catch {}
      // Save result to DB for shareable URL
      try {
        const sunA = payload.synastry.personAChart.planets.find((p: { planet: string }) => p.planet === 'Sun')?.sign || '';
        const sunB = payload.synastry.personBChart.planets.find((p: { planet: string }) => p.planet === 'Sun')?.sign || '';
        const saveRes = await fetch('/api/synastry-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personAName: personA.name,
            personBName: personB.name,
            personASun: sunA,
            personBSun: sunB,
            overallScore: payload.synastry.categoryScores.overallConnection,
            result: payload,
          }),
        });
        if (saveRes.ok) {
          const { id: resultId } = await saveRes.json();
          const url = `${siteUrl}/compatibility/${resultId}`;
          localStorage.setItem('lumina_synastry_share_url', url);
          setShareUrl(url);
        }
      } catch {}
    } catch {
      setError(t.synastryError);
    } finally {
      setLoading(false);
    }
  };

  const generateShareUrl = async () => {
    if (!result || shareUrl) return shareUrl;
    setShareLinkLoading(true);
    try {
      let cachedNames = { a: '', b: '' };
      try { cachedNames = JSON.parse(localStorage.getItem('lumina_synastry_names') || '{}'); } catch {}
      const nameA = personA.name || cachedNames.a || 'Person A';
      const nameB = personB.name || cachedNames.b || 'Person B';
      const sunA = result.synastry.personAChart.planets.find((p: { planet: string }) => p.planet === 'Sun')?.sign || '';
      const sunB = result.synastry.personBChart.planets.find((p: { planet: string }) => p.planet === 'Sun')?.sign || '';
      const res = await fetch('/api/synastry-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personAName: nameA, personBName: nameB,
          personASun: sunA, personBSun: sunB,
          overallScore: result.synastry.categoryScores.overallConnection,
          result,
        }),
      });
      if (res.ok) {
        const { id } = await res.json();
        const url = `${siteUrl}/compatibility/${id}`;
        localStorage.setItem('lumina_synastry_share_url', url);
        setShareUrl(url);
        return url;
      }
    } catch {} finally { setShareLinkLoading(false); }
    return '';
  };

  const [shareLinkStatus, setShareLinkStatus] = useState('');
  const getShareNames = () => {
    let cachedNames = { a: '', b: '' };
    try { cachedNames = JSON.parse(localStorage.getItem('lumina_synastry_names') || '{}'); } catch {}
    return {
      nameA: personA.name || cachedNames.a || (language === 'ru' ? 'Партнёр A' : 'Person A'),
      nameB: personB.name || cachedNames.b || (language === 'ru' ? 'Партнёр B' : 'Person B'),
    };
  };

  const handleShareLink = async () => {
    const url = shareUrl || await generateShareUrl();
    if (!url) return;
    // Always copy to clipboard first
    try { await navigator.clipboard.writeText(url); } catch {}
    if (navigator.share) {
      try {
        let cachedNames = { a: '', b: '' };
        try { cachedNames = JSON.parse(localStorage.getItem('lumina_synastry_names') || '{}'); } catch {}
        const nA = personA.name || cachedNames.a || '';
        const nB = personB.name || cachedNames.b || '';
        await navigator.share({ title: 'Lumina Compatibility', text: `${nA} & ${nB}`, url });
        setShareLinkStatus(language === 'ru' ? 'Ссылка скопирована' : 'Link copied');
        setTimeout(() => setShareLinkStatus(''), 3000);
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          setShareLinkStatus(language === 'ru' ? 'Ссылка скопирована' : 'Link copied');
          setTimeout(() => setShareLinkStatus(''), 3000);
          return;
        }
      }
    }
    setShareLinkStatus(language === 'ru' ? 'Ссылка скопирована' : 'Link copied');
    setTimeout(() => setShareLinkStatus(''), 3000);
  };

  const handleShareWhatsApp = async () => {
    const url = shareUrl || await generateShareUrl();
    if (!url) return;
    const { nameA, nameB } = getShareNames();
    const text = language === 'ru'
      ? `Наша совместимость в Lumina: ${nameA} & ${nameB}\n${url}`
      : `Our Lumina compatibility reading: ${nameA} & ${nameB}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = async () => {
    const url = shareUrl || await generateShareUrl();
    if (!url) return;
    const { nameA, nameB } = getShareNames();
    const text = language === 'ru'
      ? `Наша совместимость в Lumina: ${nameA} & ${nameB}`
      : `Our Lumina compatibility reading: ${nameA} & ${nameB}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const sections: { key: keyof SynastryNarrative; title: string; icon: LucideIcon; text: string }[] = result
    ? [
        { key: 'overallConnection', title: t.synastryOverallConnection, icon: Sparkles, text: result.interpretation.overallConnection },
        { key: 'communicationStyle', title: t.synastryCommunication, icon: MessageCircle, text: result.interpretation.communicationStyle },
        { key: 'emotionalCompatibility', title: t.synastryEmotional, icon: Waves, text: result.interpretation.emotionalCompatibility },
        { key: 'attractionChemistry', title: t.synastryChemistry, icon: Flame, text: result.interpretation.attractionChemistry },
        { key: 'growthChallenges', title: t.synastryGrowth, icon: Sprout, text: result.interpretation.growthChallenges },
        { key: 'longTermPotential', title: t.synastryLongTerm, icon: Infinity, text: result.interpretation.longTermPotential },
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

    // Check if partner B is already saved
    const isAlreadySaved = partnerSaved || savedPartners.some(
      (p) => p.partner_name?.toLowerCase().trim() === nameB.toLowerCase().trim()
    );
    const sunA = result.synastry.personAChart.planets.find((p) => p.planet === 'Sun');
    const moonA = result.synastry.personAChart.planets.find((p) => p.planet === 'Moon');
    const sunB = result.synastry.personBChart.planets.find((p) => p.planet === 'Sun');
    const moonB = result.synastry.personBChart.planets.find((p) => p.planet === 'Moon');

    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-void)]">
        <div className="celestial-gradient" aria-hidden="true" />
        <div className="star-field" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-safe sm:px-6 animate-fadeInUp">
        {/* Results Header */}
        <div className="mb-8 text-center">
          <p className="lumina-label mb-2">
            {language === 'ru' ? 'Ваше поле совместимости' : 'Your compatibility field'}
          </p>
          <h1 className="mb-1 font-heading text-3xl text-[#FDFBF7] sm:text-4xl">
            {nameA} & {nameB}
          </h1>
          <p className="text-sm text-[#8D8B9F]">
            {language === 'ru' ? 'Там, где ваши ритмы встречаются, рождается история.' : 'Where your rhythms meet, a new story starts to speak.'}
          </p>
        </div>

        {/* Big Three Comparison */}
        <section className="glass-card mb-6 overflow-hidden">
          <div className="grid grid-cols-1 divide-y divide-white/[0.06] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {[
              { name: nameA, sun: sunA, moon: moonA, rising: result.synastry.personAChart.risingSign },
              { name: nameB, sun: sunB, moon: moonB, rising: result.synastry.personBChart.risingSign },
            ].map((person) => (
              <div key={person.name} className="p-5 text-center">
                <p className="lumina-label mb-3">{person.name}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#8D8B9F]">{t.sun}</p>
                    <p className="text-sm font-medium text-[#FDFBF7]">{language === 'ru' ? translateSign(person.sun?.sign || '', language) : person.sun?.sign}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#8D8B9F]">{t.moon}</p>
                    <p className="text-sm font-medium text-[#FDFBF7]">{language === 'ru' ? translateSign(person.moon?.sign || '', language) : person.moon?.sign}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#8D8B9F]">{t.rising}</p>
                    <p className="text-sm font-medium text-[#FDFBF7]">{language === 'ru' ? translateSign(person.rising, language) : person.rising}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Radar Chart */}
        <section className="glass-card mb-6 p-6">
          <p className="lumina-label mb-4 text-center">{t.synastryCompatibilityWheel}</p>
          <RadarChart values={radarValues} />
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {radarValues.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-[18px] border border-white/[0.06] bg-white/[0.04] px-3 py-2">
                <span className="text-xs text-[#8D8B9F]">{item.label}</span>
                <span className="badge px-3 py-1">{item.value}%</span>
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
                <section.icon className="text-[#C8A4A4]" size={18} strokeWidth={1.5} />
                <span className="flex-1 text-sm font-medium text-[#FDFBF7]">{section.title}</span>
                <ChevronDown className={`h-4 w-4 text-[#8D8B9F] transition-transform ${openSection === section.key ? 'rotate-180' : ''}`} strokeWidth={1.5} />
              </button>
              {openSection === section.key && (
                <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 animate-fadeInUp">
                  <p className="text-sm leading-relaxed text-[#8D8B9F]">{section.text}</p>
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Key Aspects */}
        <section className="glass-card mb-6 p-5 sm:p-6">
          <p className="lumina-label mb-4">{t.synastryKeyAspects}</p>
          <div className="space-y-3">
            {result.synastry.crossAspects.slice(0, 8).map((aspect, idx) => (
              <div key={`${aspect.planetA}-${aspect.planetB}-${idx}`} className="glass-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    ['trine', 'sextile'].includes(aspect.type.toLowerCase()) ? 'bg-emerald-400' :
                    ['square', 'opposition'].includes(aspect.type.toLowerCase()) ? 'bg-[#C8A4A4]' :
                    'bg-[#C0BDD6]'
                  }`} />
                  <p className="text-xs uppercase tracking-[0.12em] text-[#C0BDD6]">
                    {translatePlanet(aspect.planetA, language)} {translateAspectType(aspect.type, language)} {translatePlanet(aspect.planetB, language)}
                  </p>
                  <span className="text-[10px] text-[#8D8B9F]">{aspect.orb.toFixed(1)}°</span>
                </div>
                <p className="text-sm leading-relaxed text-[#8D8B9F]">
                  {language === 'ru'
                    ? `${translatePlanet(aspect.planetA, language)} в ${translateSign(aspect.signA, language)} — ${translateAspectType(aspect.type, language).toLowerCase()} — ${translatePlanet(aspect.planetB, language)} в ${translateSign(aspect.signB, language)}. ${translateSynastryAspectMeaning(aspect.type, language)}`
                    : `Your ${aspect.planetA} in ${aspect.signA} ${aspect.type.toLowerCase()}s their ${aspect.planetB} in ${aspect.signB}. ${aspect.meaning}`
                  }
                </p>
              </div>
            ))}
          </div>
        </section>

        {session?.user && !isAlreadySaved && (
          <button
            type="button"
            onClick={handleSavePartner}
            disabled={savePartnerLoading}
            className="mb-6 w-full rounded-2xl px-5 py-3.5 text-sm font-medium transition lumina-button disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savePartnerLoading
              ? (language === 'ru' ? 'Сохраняем...' : 'Saving...')
              : `${language === 'ru' ? 'Сохранить' : 'Save'} ${nameB}`}
          </button>
        )}

        {/* Share Link Button */}
        <button
          type="button"
          onClick={handleShareLink}
          disabled={shareLinkLoading}
          className={`mb-4 w-full rounded-full border py-3.5 text-sm font-medium transition disabled:opacity-50 ${
            shareLinkStatus ? 'border-white/[0.12] bg-white/[0.08] text-[#FDFBF7]' : 'border-white/[0.08] bg-white/[0.03] text-[#C0BDD6] hover:bg-white/[0.08]'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Link2 size={16} strokeWidth={1.5} />
            <span>{shareLinkLoading
              ? (language === 'ru' ? 'Создаём ссылку...' : 'Creating link...')
              : shareLinkStatus || (language === 'ru' ? 'Поделиться ссылкой' : 'Share Link')}</span>
          </span>
        </button>
        {shareUrl && (
          <p className="mb-4 -mt-2 break-all text-center text-[11px] text-[#8D8B9F]">{shareUrl}</p>
        )}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={shareLinkLoading}
            className="w-full rounded-[22px] border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm text-[#C0BDD6] transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <MessageCircle size={16} strokeWidth={1.5} />
              <span>{language === 'ru' ? 'Отправить в WhatsApp' : 'Share on WhatsApp'}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={handleShareTelegram}
            disabled={shareLinkLoading}
            className="w-full rounded-[22px] border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm text-[#C0BDD6] transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <Send size={16} strokeWidth={1.5} />
              <span>{language === 'ru' ? 'Отправить в Telegram' : 'Share on Telegram'}</span>
            </span>
          </button>
        </div>

        {/* Share Card (image) */}
        <ShareCard
          type="synastry-summary"
          title={`${nameA} & ${nameB}`}
          subtitle={result.interpretation.overallConnection}
          bullets={radarValues.map((v) => `${v.label}: ${v.value}%`)}
          shareUrl={shareUrl || undefined}
        />

        {/* Back to form */}
        <button
          type="button"
          onClick={() => { setResult(null); setPartnerSaved(false); try { localStorage.removeItem('lumina_synastry_result'); localStorage.removeItem('lumina_synastry_names'); } catch {} }}
          className="mt-6 w-full rounded-full border border-white/10 bg-white/[0.03] py-3 text-sm text-[#8D8B9F] transition hover:bg-white/[0.06] hover:text-[#FDFBF7]"
        >
          <span className="inline-flex items-center gap-2">
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span>{language === 'ru' ? 'Новый расчёт' : 'New Reading'}</span>
          </span>
        </button>

        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-[22px] border border-white/[0.08] bg-[rgba(20,17,33,0.94)] px-4 py-3 text-center text-sm text-[#FDFBF7] shadow-xl backdrop-blur">
            {toastMessage}
          </div>
        )}
      </div>
      </div>
    );
  }

  // ─── FORM VIEW ───
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-void)]">
      <div className="celestial-gradient" aria-hidden="true" />
      <div className="star-field" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-safe sm:px-6">
      {/* Hero */}
      <div className="mb-10 text-center animate-fadeInUp">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mb-6 inline-flex items-center gap-1 text-sm text-[#8D8B9F] transition hover:text-[#FDFBF7]"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>{t.back}</span>
        </button>
        <p className="lumina-label mb-3">{language === 'ru' ? 'Синастрия' : 'Synastry'}</p>
        <h1 className="mb-3 font-heading text-4xl text-[#FDFBF7] sm:text-5xl">{t.synastryTitle}</h1>
        <p className="mb-6 text-lg text-[#C0BDD6]">{t.synastrySubtitle}</p>
        <p className="mx-auto max-w-lg text-sm leading-relaxed text-[#8D8B9F]">{t.synastryHeroText}</p>
      </div>

      {/* Benefits */}
      <div className="mb-10 grid gap-3 sm:grid-cols-2 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <BenefitCard icon={MessageCircle} text={t.synastryWhy1} />
        <BenefitCard icon={Waves} text={t.synastryWhy2} />
        <BenefitCard icon={Flame} text={t.synastryWhy3} />
        <BenefitCard icon={Sprout} text={t.synastryWhy4} />
      </div>

      {/* Form */}
      <form onSubmit={submit} className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
        {/* Partner quick-select (above forms, full width) */}
        {session?.user && savedPartners.length > 1 && (
          <section className="glass-card p-4 sm:p-5 mb-4">
            <p className="lumina-label mb-3">
              {language === 'ru' ? 'Выбрать партнёра' : 'Select saved partner'}
            </p>
            <div className="flex flex-wrap gap-2">
              {savedPartners.map((partner) => (
                <button
                  key={partner.id}
                  type="button"
                  onClick={() => fillPersonBFromPartner(partner)}
                  className="glass-card rounded-[28px] px-4 py-3 text-left transition hover:border-white/[0.16] hover:bg-white/[0.08]"
                >
                  <p className="text-sm font-medium text-[#FDFBF7]">{partner.partner_name}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Two forms side-by-side on desktop */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start">
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

        {/* Invite and connect */}
        {session?.user && (
          <section className="glass-card mt-4 rounded-[28px] p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="lumina-label mb-2">{language === 'ru' ? 'Ваш код приглашения' : 'Your invite code'}</p>
                <p className="font-heading text-[28px] tracking-[0.18em] text-[#FDFBF7]">
                  {connectionCodeLoading ? '••••••' : connectionCode || 'LUMINA'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#8D8B9F]">
                  {language === 'ru'
                    ? 'Отправьте код или ссылку партнёру, чтобы он быстро подключился к вашей совместимости.'
                    : 'Send your code or invite link so your partner can join your compatibility space quickly.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyInviteCode}
                    disabled={!connectionCode || connectionCodeLoading}
                    className="rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#FDFBF7] transition hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    {language === 'ru' ? 'Копировать код' : 'Copy code'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShareInvite}
                    disabled={!inviteLink || connectionCodeLoading}
                    className="rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#FDFBF7] transition hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    {language === 'ru' ? 'Поделиться ссылкой' : 'Share invite link'}
                  </button>
                </div>
                {inviteLink ? (
                  <p className="mt-3 break-all text-[11px] leading-5 text-[#8D8B9F]">{inviteLink}</p>
                ) : null}
                {inviteStatus ? <p className="mt-3 text-xs text-[#C0BDD6]">{inviteStatus}</p> : null}
              </div>

              <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 text-center lg:text-left">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="lumina-label mb-2">{language === 'ru' ? 'Подключить партнёра' : 'Connect your partner'}</p>
                    <p className="text-sm leading-relaxed text-[#8D8B9F]">
                      {language === 'ru'
                        ? 'Вставьте код партнёра, если он уже отправил приглашение.'
                        : 'Paste your partner’s code if they already sent you an invite.'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className="lumina-input text-center sm:text-left"
                      value={connectCodeInput}
                      onChange={(e) => setConnectCodeInput(e.target.value.toUpperCase())}
                      placeholder="LUNA-XXXX"
                      autoFocus={showConnectCode}
                    />
                    <button
                      type="button"
                      onClick={handleConnectWithCode}
                      disabled={connectCodeLoading || !connectCodeInput.trim()}
                      className="lumina-button min-w-[136px] px-4 disabled:opacity-60"
                    >
                      {connectCodeLoading ? '...' : language === 'ru' ? 'Подключить' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {connectionsLoading ? (
              <p className="mt-3 text-xs text-[#8D8B9F]">{language === 'ru' ? 'Загружаем связи...' : 'Loading connections...'}</p>
            ) : null}
            {connectionsError && <p className="mt-3 text-xs text-[#C8A4A4]">{connectionsError}</p>}
          </section>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="lumina-button mx-auto mt-6 flex w-full items-center justify-center px-8 py-4 text-sm disabled:cursor-not-allowed disabled:opacity-40 lg:max-w-md"
        >
          {loading ? t.synastryLoading : t.synastryRun}
        </button>
        {error && <p className="mt-3 text-center text-sm text-[#C8A4A4]">{error}</p>}
      </form>

      {/* Loading skeleton */}
      {loading && (
        <section className="mt-8 glass-card p-6 animate-fadeInUp">
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="h-2 w-2 rounded-full bg-lumina-accent animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-lumina-accent animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="h-2 w-2 rounded-full bg-lumina-accent animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          <p className="text-center text-sm text-[#8D8B9F]">{t.synastryLoading}</p>
        </section>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-[22px] border border-white/[0.08] bg-[rgba(20,17,33,0.94)] px-4 py-3 text-center text-sm text-[#FDFBF7] shadow-xl backdrop-blur">
          {toastMessage}
        </div>
      )}
    </div>
    </div>
  );
}
