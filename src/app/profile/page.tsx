'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import html2canvas from 'html2canvas';
import { ArrowLeft, ArrowUp, Calendar, Moon, Share2, Sparkles, Star, Sun } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile, saveProfile, clearProfile, type UserProfileLocal, type RelationshipStatus, type Interest, type Gender } from '@/lib/profile';
import { calculateNatalChart } from '@/services/astronomyCalculator';
import { translateSign } from '@/lib/translations';
import type { BirthData } from '@/lib/types';

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

type BigThree = { sun: string; moon: string; rising: string };

function getBigThree(birthData: BirthData): BigThree | null {
  try {
    const chart = calculateNatalChart(birthData);
    const sun = chart.planets.find((p: { planet: string }) => p.planet === 'Sun')?.sign || '';
    const moon = chart.planets.find((p: { planet: string }) => p.planet === 'Moon')?.sign || '';
    const rising = (chart as unknown as { risingSign?: string }).risingSign || chart.houses?.[0]?.sign || '';
    return { sun, moon, rising };
  } catch {
    return null;
  }
}

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
  linked_birth_date: string | null;
  linked_birth_time: string | null;
  linked_birth_place: string | null;
  linked_birth_latitude: number | null;
  linked_birth_longitude: number | null;
  linked_birth_timezone: string | null;
};

const RELATIONSHIP_OPTIONS: RelationshipStatus[] = ['single', 'dating', 'committed', 'married', 'complicated'];
const INTEREST_OPTIONS: Interest[] = ['career', 'love', 'growth', 'health', 'creativity', 'spirituality'];
const GENDER_OPTIONS: Gender[] = ['female', 'male', 'non-binary', 'prefer-not-to-say'];

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { language, t } = useLanguage();

  // Redirect home if profile is cleared (e.g. sign-out)
  useEffect(() => {
    const handler = () => { if (!loadProfile()) router.push('/'); };
    window.addEventListener('lumina-profile-changed', handler);
    return () => window.removeEventListener('lumina-profile-changed', handler);
  }, [router]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileLocal | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus | ''>('');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [gender, setGender] = useState<Gender | ''>('');
  const [saved, setSaved] = useState(false);
  const [connectionCode, setConnectionCode] = useState('');
  const [connectionCodeLoading, setConnectionCodeLoading] = useState(false);
  const [connectionCodeError, setConnectionCodeError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [bigThree, setBigThree] = useState<BigThree | null>(null);
  const [partner, setPartner] = useState<SavedPartner | null>(null);
  const [partnerBigThree, setPartnerBigThree] = useState<BigThree | null>(null);
  const compatCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      let p = loadProfile();

      // If no local profile but signed in, try server
      if (!p && session?.user) {
        try {
          const res = await fetch('/api/user');
          if (res.ok) {
            const srv = await res.json();
            if (srv.onboarding_completed && srv.birth_date) {
              const [y, m, d] = srv.birth_date.split('-').map(Number);
              const [h, min] = (srv.birth_time || '12:00').split(':').map(Number);
              p = {
                birthData: {
                  year: y, month: m - 1, day: d, hour: h, minute: min,
                  latitude: srv.birth_latitude, longitude: srv.birth_longitude,
                  timezone: srv.birth_timezone || 'UTC',
                },
                name: srv.name || '',
                locationName: srv.birth_place || '',
                savedAt: Date.now(),
              };
              saveProfile(p);
            }
          }
        } catch { /* continue */ }
      }

      if (!p) {
        setLoading(false);
        return;
      }
      setProfile(p);
      setDisplayName(p.name || '');
      setRelationshipStatus(p.relationshipStatus || '');
      setInterests(p.interests || []);
      setGender(p.gender || '');

      // Calculate Big Three
      const bt = getBigThree(p.birthData);
      if (bt) setBigThree(bt);

      // If authenticated, also load server-side profile fields
      if (session?.user) {
        try {
          const res = await fetch('/api/user');
          if (res.ok) {
            const serverProfile = await res.json();
            if (serverProfile.gender) setGender(serverProfile.gender);
            if (serverProfile.relationship_status) setRelationshipStatus(serverProfile.relationship_status);
            if (serverProfile.interests?.length) setInterests(serverProfile.interests);
            if (serverProfile.name) setDisplayName(serverProfile.name);
          }
        } catch {
          // Fall through with localStorage data
        }
      }
      setLoading(false);
    }
    loadData();
  }, [router, session]);

  useEffect(() => {
    async function loadConnectionCode() {
      if (!session?.user) return;
      setConnectionCodeLoading(true);
      setConnectionCodeError('');
      try {
        const response = await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-code' }),
        });
        if (!response.ok) throw new Error('failed');
        const payload = (await response.json()) as { code?: string };
        setConnectionCode(payload.code || '');
      } catch {
        setConnectionCodeError(
          language === 'ru'
            ? 'Не удалось загрузить код подключения'
            : 'Unable to load connection code'
        );
      } finally {
        setConnectionCodeLoading(false);
      }
    }
    loadConnectionCode();
  }, [language, session?.user]);

  // Load partner
  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/connections')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const connections = data?.connections as SavedPartner[] | undefined;
        if (connections?.length) {
          const p = connections[0];
          setPartner(p);
          // Calculate partner Big Three
          const bd = p.is_linked ? (p.linked_birth_date || p.partner_birth_date) : p.partner_birth_date;
          const bt = p.is_linked ? (p.linked_birth_time || p.partner_birth_time) : p.partner_birth_time;
          const blat = p.is_linked ? (p.linked_birth_latitude ?? p.partner_birth_latitude) : p.partner_birth_latitude;
          const blon = p.is_linked ? (p.linked_birth_longitude ?? p.partner_birth_longitude) : p.partner_birth_longitude;
          const btz = p.is_linked ? (p.linked_birth_timezone || p.partner_birth_timezone) : p.partner_birth_timezone;
          if (bd && blat != null && blon != null) {
            const [y, m, d] = bd.split('-').map(Number);
            const [hr, min] = (bt || '12:00').split(':').map(Number);
            const pbt = getBigThree({ year: y, month: m - 1, day: d, hour: hr, minute: min, latitude: blat, longitude: blon, timezone: btz || 'UTC' });
            if (pbt) setPartnerBigThree(pbt);
          }
        }
      })
      .catch(() => {});
  }, [session?.user]);

  const toggleInterest = (interest: Interest) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    const updated: UserProfileLocal = {
      ...profile,
      name: displayName.trim(),
      relationshipStatus: relationshipStatus || undefined,
      interests: interests.length > 0 ? interests : undefined,
      gender: gender || undefined,
    };
    saveProfile(updated);
    setProfile(updated);

    // Also save to server if authenticated
    if (session?.user) {
      try {
        await fetch('/api/user', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gender: gender || null,
            relationship_status: relationshipStatus || null,
            interests: interests.length > 0 ? interests : null,
            name: displayName.trim() || null,
          }),
        });
      } catch {
        // Non-blocking
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearAll = () => {
    const msg = language === 'ru'
      ? 'Вы уверены? Все ваши данные (профиль, сохранённые партнёры, результаты) будут удалены.'
      : 'Are you sure? All your data (profile, saved partners, results) will be permanently deleted.';
    if (!window.confirm(msg)) return;
    clearProfile();
    try {
      localStorage.removeItem('lumina_synastry_result');
      localStorage.removeItem('lumina_synastry_names');
    } catch {}
    router.replace('/');
  };

  const getRelationshipLabel = (status: RelationshipStatus): string => {
    const key = `status${status.charAt(0).toUpperCase() + status.slice(1)}` as keyof typeof t;
    return (t as Record<string, string>)[key] || status;
  };

  const getInterestLabel = (interest: Interest): string => {
    const key = `interest${interest.charAt(0).toUpperCase() + interest.slice(1)}` as keyof typeof t;
    return (t as Record<string, string>)[key] || interest;
  };

  const getGenderLabel = (g: Gender): string => {
    const map: Record<Gender, string> = {
      female: t.genderFemale,
      male: t.genderMale,
      'non-binary': t.genderNonBinary,
      'prefer-not-to-say': t.genderPreferNot,
    };
    return map[g] || g;
  };

  const copyCode = async () => {
    if (!connectionCode) return;
    try {
      await navigator.clipboard.writeText(connectionCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setConnectionCodeError(language === 'ru' ? 'Не удалось скопировать код' : 'Unable to copy code');
    }
  };

  const [shareStatus, setShareStatus] = useState('');
  const shareCompatCard = async () => {
    const mySign = ZODIAC_SYMBOLS[bigThree?.sun || ''] || '';
    const theirSign = ZODIAC_SYMBOLS[partnerBigThree?.sun || ''] || '';
    const shareUrl = typeof window !== 'undefined' ? localStorage.getItem('lumina_synastry_share_url') || 'https://luminastrology.com/synastry' : 'https://luminastrology.com/synastry';
    const text = `${mySign} ${displayName} & ${partner?.partner_name} ${theirSign} — See our compatibility:`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Lumina Compatibility', text, url: shareUrl });
        setShareStatus('');
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') { setShareStatus(''); return; }
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      setShareStatus(language === 'ru' ? 'Скопировано' : 'Copied');
    } catch { setShareStatus(''); }
    setTimeout(() => setShareStatus(''), 2000);
  };

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-void)]">
        <div className="celestial-gradient" aria-hidden="true" />
        <p className="relative z-10 font-heading text-3xl text-[#FDFBF7]">Lumina</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-void)]">
        <div className="celestial-gradient" aria-hidden="true" />
        <div className="star-field" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-md px-4 pb-28 pt-12 sm:px-6">
        <div className="text-center">
          <p className="lumina-label">{language === 'ru' ? 'Профиль Lumina' : 'Lumina profile'}</p>
          <h1 className="mt-4 font-heading text-2xl text-[#FDFBF7]">
            {language === 'ru' ? 'Соберите пространство, которое знает вас по имени' : 'Create a space that knows you by name'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#8D8B9F]">
            {language === 'ru'
              ? 'Войдите, чтобы сохранить вашу карту, получать ежедневные инсайты и проверять совместимость'
              : 'Sign in to save your chart, get daily insights, and check compatibility'}
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {[
            {
              icon: Star,
              en: 'Personalized natal chart with full planetary positions',
              ru: 'Персональная натальная карта с позициями всех планет',
            },
            {
              icon: Calendar,
              en: 'Daily horoscope tailored to your birth data',
              ru: 'Ежедневный гороскоп на основе ваших данных рождения',
            },
            {
              icon: Sparkles,
              en: 'Compatibility analysis with anyone',
              ru: 'Анализ совместимости с любым человеком',
            },
          ].map((item) => (
            <div key={item.en} className="glass-card flex items-start gap-3 rounded-[28px] p-3.5">
              <item.icon className="mt-0.5 text-[#8D8B9F]" size={18} strokeWidth={1.5} />
              <p className="text-sm text-[#8D8B9F]">{language === 'ru' ? item.ru : item.en}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl: '/profile' })}
          className="lumina-btn-google mt-8 flex w-full items-center justify-center text-sm normal-case tracking-[0.01em]"
        >
          {language === 'ru' ? 'Войти через Google' : 'Continue with Google'}
        </button>

        <button
          onClick={() => router.push('/chart')}
          className="mt-3 w-full py-2 text-center text-sm text-[#8D8B9F] transition hover:text-[#FDFBF7]"
        >
          {language === 'ru' ? 'или сначала введите данные рождения' : 'or enter birth details first'}
        </button>
      </div>
      </div>
    );
  }

  const birthDate = `${String(profile.birthData.day).padStart(2, '0')}.${String(profile.birthData.month + 1).padStart(2, '0')}.${profile.birthData.year}`;
  const birthTime = `${String(profile.birthData.hour).padStart(2, '0')}:${String(profile.birthData.minute).padStart(2, '0')}`;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-void)]">
      <div className="celestial-gradient" aria-hidden="true" />
      <div className="star-field" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-lg px-4 pb-10 pt-0 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <button onClick={() => router.push('/chart')} className="lumina-back-btn text-sm">
          <span className="inline-flex items-center gap-2"><ArrowLeft strokeWidth={1.8} />{t.back}</span>
        </button>
        <p className="font-heading text-xl text-[#FDFBF7]">{t.profile}</p>
        <div className="w-20" />
      </header>

      {/* Big Three — Sun, Moon, Rising */}
      {bigThree && (
        <section className="glass-card mb-6 p-5 animate-fadeInUp">
          <p className="lumina-label mb-1">{language === 'ru' ? 'Ваш знак' : 'Your Signs'}</p>
          <p className="mb-4 text-xs text-[#8D8B9F]">
            {language === 'ru'
              ? 'Солнце — кто вы. Луна — что вы чувствуете. Восходящий — как вас видят.'
              : 'Sun — who you are. Moon — how you feel. Rising — how others see you.'}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: language === 'ru' ? 'Солнце' : 'Sun', sign: bigThree.sun, icon: Sun },
              { label: language === 'ru' ? 'Луна' : 'Moon', sign: bigThree.moon, icon: Moon },
              { label: language === 'ru' ? 'Восходящий' : 'Rising', sign: bigThree.rising, icon: ArrowUp },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3 text-center">
                <div className="flex justify-center">
                  {ZODIAC_SYMBOLS[item.sign] ? <p className="text-lg">{ZODIAC_SYMBOLS[item.sign]}</p> : <item.icon className="text-[#C8A4A4]" size={18} strokeWidth={1.5} />}
                </div>
                <p className="mt-1 text-sm font-medium text-[#FDFBF7]">{language === 'ru' ? translateSign(item.sign, 'ru') : item.sign}</p>
                <p className="text-[10px] uppercase tracking-wider text-[#8D8B9F]">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Partner Connection */}
      {session?.user && (
        <section className="glass-card mb-6 p-5 animate-fadeInUp">
          {partner ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-heading text-lg text-[#FDFBF7]">
                    {language === 'ru' ? `Связь с ${partner.partner_name}` : `Connected with ${partner.partner_name}`}
                  </p>
                  <p className="text-xs text-[#8D8B9F]">
                    {partner.partner_birth_place || (partner.is_linked ? partner.linked_birth_place : '') || ''}
                  </p>
                </div>
                <button
                  onClick={() => router.push('/synastry')}
                  className="text-xs text-[#C0BDD6] transition hover:text-[#FDFBF7]"
                >
                  {language === 'ru' ? 'Совместимость →' : 'Compatibility →'}
                </button>
              </div>

              {partnerBigThree && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: language === 'ru' ? 'Солнце' : 'Sun', sign: partnerBigThree.sun, icon: Sun },
                    { label: language === 'ru' ? 'Луна' : 'Moon', sign: partnerBigThree.moon, icon: Moon },
                    { label: language === 'ru' ? 'Восходящий' : 'Rising', sign: partnerBigThree.rising, icon: ArrowUp },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-2.5 text-center">
                      <div className="flex justify-center">
                        {ZODIAC_SYMBOLS[item.sign] ? <p className="text-lg">{ZODIAC_SYMBOLS[item.sign]}</p> : <item.icon className="text-[#C8A4A4]" size={18} strokeWidth={1.5} />}
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-[#FDFBF7]">{language === 'ru' ? translateSign(item.sign, 'ru') : item.sign}</p>
                      <p className="text-[9px] uppercase tracking-wider text-[#8D8B9F]">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Shareable compatibility mini-card */}
              {bigThree && partnerBigThree && (
                <>
                  <div
                    ref={compatCardRef}
                    className="glass-card relative overflow-hidden rounded-[28px] p-5"
                  >
                    <div className="aura aura-strong aura-violet left-[-10%] top-[-12%] h-[220px] w-[220px]" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="text-center flex-1">
                        <p className="text-3xl">{ZODIAC_SYMBOLS[bigThree.sun]}</p>
                        <p className="mt-1 text-sm font-medium text-[#FDFBF7]">{displayName || 'You'}</p>
                        <p className="text-[10px] text-[#8D8B9F]">{bigThree.sun}</p>
                      </div>
                      <div className="px-3">
                        <p className="font-heading text-lg text-[#C8A4A4]">✦</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-3xl">{ZODIAC_SYMBOLS[partnerBigThree.sun]}</p>
                        <p className="mt-1 text-sm font-medium text-[#FDFBF7]">{partner.partner_name}</p>
                        <p className="text-[10px] text-[#8D8B9F]">{partnerBigThree.sun}</p>
                      </div>
                    </div>
                    <p className="relative z-10 mt-3 text-center text-[9px] uppercase tracking-[0.2em] text-[#8D8B9F]">luminastrology.com</p>
                  </div>
                  <button
                    type="button"
                    onClick={shareCompatCard}
                    disabled={!!shareStatus && shareStatus.includes('...')}
                    className="mt-3 w-full rounded-full border border-white/10 bg-white/[0.03] py-2.5 text-xs text-[#8D8B9F] transition hover:bg-white/[0.06] hover:text-[#FDFBF7] disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Share2 size={14} strokeWidth={1.5} />
                      <span>{shareStatus || (language === 'ru' ? 'Поделиться' : 'Share')}</span>
                    </span>
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-2">
              <p className="mb-3 text-sm text-[#8D8B9F]">
                {language === 'ru' ? 'Подключите партнёра для совместимости' : 'Connect your partner for compatibility'}
              </p>
              <button
                onClick={() => router.push('/synastry')}
                className="lumina-btn-primary px-6"
              >
                {language === 'ru' ? 'Проверить совместимость' : 'Check compatibility'}
              </button>
            </div>
          )}

          {/* Connection code (compact) */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs text-[#8D8B9F]">
                {language === 'ru' ? 'Ваш код:' : 'Your code:'}
                <span className="ml-2 font-heading text-sm tracking-wider text-lumina-soft">
                  {connectionCodeLoading ? '....' : (connectionCode || '....')}
                </span>
              </p>
              <button
                type="button"
                onClick={copyCode}
                disabled={!connectionCode}
                className="text-xs text-[#8D8B9F] transition hover:text-[#FDFBF7] disabled:opacity-30"
              >
                {copiedCode ? (language === 'ru' ? 'Скопировано' : 'Copied') : (language === 'ru' ? 'Копировать' : 'Copy')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Birth Data (read-only) */}
      <section className="glass-card mb-6 p-5 animate-fadeInUp">
        <p className="lumina-label mb-3">{t.dateOfBirth}</p>
        <div className="space-y-2 text-sm text-[#FDFBF7]">
          <p>{birthDate} • {birthTime}</p>
          {profile.locationName && <p className="text-[#8D8B9F]">{profile.locationName}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            const msg = language === 'ru'
              ? 'Это сбросит ваши данные рождения. Продолжить?'
              : 'This will reset your birth data. Continue?';
            if (!window.confirm(msg)) return;
            clearProfile();
            router.push('/');
          }}
          className="mt-3 text-sm text-[#C0BDD6] transition hover:text-[#FDFBF7]"
        >
          {t.editBirthData}
        </button>
      </section>

      {/* Profile Fields */}
      <section className="glass-card mb-6 p-5 animate-fadeInUp">
        {/* Display Name */}
        <div className="mb-5">
          <label className="lumina-label mb-2 block">{t.displayName}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
            className="lumina-input"
            placeholder={t.name}
          />
        </div>

        {/* Gender */}
        <div className="mb-5">
          <label className="lumina-label mb-2 block">{t.gender} ({t.optional})</label>
          <select
            className="lumina-input"
            value={gender}
            onChange={(e) => { setGender(e.target.value as Gender); setSaved(false); }}
          >
            <option value="">—</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{getGenderLabel(g)}</option>
            ))}
          </select>
        </div>

        {/* Relationship Status */}
        <div className="mb-5">
          <label className="lumina-label mb-2 block">{t.relationshipStatus}</label>
          <select
            className="lumina-input"
            value={relationshipStatus}
            onChange={(e) => { setRelationshipStatus(e.target.value as RelationshipStatus); setSaved(false); }}
          >
            <option value="">—</option>
            {RELATIONSHIP_OPTIONS.map((status) => (
              <option key={status} value={status}>{getRelationshipLabel(status)}</option>
            ))}
          </select>
        </div>

        {/* Interests */}
        <div className="mb-5">
          <label className="lumina-label mb-3 block">{t.whatMatters}</label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  interests.includes(interest)
                    ? 'border-white/[0.16] bg-white/[0.08] text-[#FDFBF7]'
                    : 'border-white/15 text-[#8D8B9F] hover:border-white/[0.16]'
                }`}
              >
                {getInterestLabel(interest)}
              </button>
            ))}
          </div>
        </div>

        {/* Consultation CTA */}
        <div className="mb-5 rounded-[22px] border border-white/10 bg-white/5 p-4 text-center">
          <p className="mb-3 text-sm text-[#8D8B9F]">{t.ctaConsultationLabel}</p>
          <a
            href="/consultation"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/[0.1] px-6 text-sm text-[#C0BDD6] transition hover:border-white/[0.18] hover:text-[#FDFBF7]"
          >
            {t.ctaBookSession}
          </a>
        </div>

        {/* Save Button */}
        <button type="button" onClick={handleSave} className="lumina-btn-primary w-full">
          {saved ? t.profileSaved : t.saveProfileBtn}
        </button>
      </section>

      {/* Connection code error */}
      {connectionCodeError && (
        <p className="mb-4 text-center text-sm text-[#C8A4A4]">{connectionCodeError}</p>
      )}

      {/* Clear All Data */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleClearAll}
          className="text-sm text-[#8D8B9F] transition hover:text-[#C8A4A4]"
        >
          {t.clearAllData}
        </button>
      </div>
    </div>
    </div>
  );
}
