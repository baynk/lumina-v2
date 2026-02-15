'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import html2canvas from 'html2canvas';
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
    const sun = chart.planets.find((p: { name: string }) => p.name === 'Sun')?.sign || '';
    const moon = chart.planets.find((p: { name: string }) => p.name === 'Moon')?.sign || '';
    const rising = chart.planets.find((p: { name: string }) => p.name === 'Ascendant')?.sign || chart.houses?.[0]?.sign || '';
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
      const p = loadProfile();
      if (!p) {
        router.replace('/');
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
    clearProfile();
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

  const shareCompatCard = async () => {
    if (!compatCardRef.current) return;
    try {
      const canvas = await html2canvas(compatCardRef.current, { backgroundColor: '#080c1f', scale: 2 });
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png', 1));
      if (!blob) return;
      const file = new File([blob], 'lumina-compatibility.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Lumina', files: [file] });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      }
    } catch { /* silent */ }
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-heading text-3xl text-lumina-soft">Lumina</p>
      </div>
    );
  }

  const birthDate = `${String(profile.birthData.day).padStart(2, '0')}.${String(profile.birthData.month + 1).padStart(2, '0')}.${profile.birthData.year}`;
  const birthTime = `${String(profile.birthData.hour).padStart(2, '0')}:${String(profile.birthData.minute).padStart(2, '0')}`;

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-0 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <button onClick={() => router.push('/chart')} className="min-h-11 rounded-full px-4 text-sm text-cream hover:text-warmWhite">
          ← {t.back}
        </button>
        <p className="font-heading text-xl text-lumina-soft">{t.profile}</p>
        <div className="w-20" />
      </header>

      {/* Big Three */}
      {bigThree && (
        <section className="glass-card mb-6 p-5 animate-fadeInUp">
          <p className="lumina-label mb-3">{language === 'ru' ? 'Ваша большая тройка' : 'Your Big Three'}</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: language === 'ru' ? 'Солнце' : 'Sun', sign: bigThree.sun },
              { label: language === 'ru' ? 'Луна' : 'Moon', sign: bigThree.moon },
              { label: language === 'ru' ? 'Восходящий' : 'Rising', sign: bigThree.rising },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-2xl">{ZODIAC_SYMBOLS[item.sign] || '✦'}</p>
                <p className="mt-1 text-sm font-medium text-warmWhite">{language === 'ru' ? translateSign(item.sign, 'ru') : item.sign}</p>
                <p className="text-[10px] uppercase tracking-wider text-cream/40">{item.label}</p>
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
                  <p className="font-heading text-lg text-warmWhite">
                    {language === 'ru' ? `Связь с ${partner.partner_name}` : `Connected with ${partner.partner_name}`} ✦
                  </p>
                  <p className="text-xs text-cream/50">
                    {partner.partner_birth_place || (partner.is_linked ? partner.linked_birth_place : '') || ''}
                  </p>
                </div>
                <button
                  onClick={() => router.push('/synastry')}
                  className="text-xs text-lumina-accent/60 hover:text-lumina-accent transition"
                >
                  {language === 'ru' ? 'Совместимость →' : 'Compatibility →'}
                </button>
              </div>

              {partnerBigThree && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: language === 'ru' ? 'Солнце' : 'Sun', sign: partnerBigThree.sun },
                    { label: language === 'ru' ? 'Луна' : 'Moon', sign: partnerBigThree.moon },
                    { label: language === 'ru' ? 'Восходящий' : 'Rising', sign: partnerBigThree.rising },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
                      <p className="text-xl">{ZODIAC_SYMBOLS[item.sign] || '✦'}</p>
                      <p className="mt-0.5 text-xs font-medium text-warmWhite">{language === 'ru' ? translateSign(item.sign, 'ru') : item.sign}</p>
                      <p className="text-[9px] uppercase tracking-wider text-cream/40">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Shareable compatibility mini-card */}
              {bigThree && partnerBigThree && (
                <>
                  <div
                    ref={compatCardRef}
                    className="relative overflow-hidden rounded-2xl border border-white/15 p-5"
                    style={{ background: 'linear-gradient(135deg, #0f1338 0%, #1a1050 50%, #0f1338 100%)' }}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(167,139,250,0.15),transparent_50%)]" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="text-center flex-1">
                        <p className="text-3xl">{ZODIAC_SYMBOLS[bigThree.sun]}</p>
                        <p className="mt-1 text-sm font-medium text-warmWhite">{displayName || 'You'}</p>
                        <p className="text-[10px] text-cream/40">{bigThree.sun}</p>
                      </div>
                      <div className="px-3">
                        <p className="font-heading text-lg text-lumina-accent/60">✦</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-3xl">{ZODIAC_SYMBOLS[partnerBigThree.sun]}</p>
                        <p className="mt-1 text-sm font-medium text-warmWhite">{partner.partner_name}</p>
                        <p className="text-[10px] text-cream/40">{partnerBigThree.sun}</p>
                      </div>
                    </div>
                    <p className="relative z-10 mt-3 text-center text-[9px] uppercase tracking-[0.2em] text-cream/20">luminastrology.com</p>
                  </div>
                  <button
                    type="button"
                    onClick={shareCompatCard}
                    className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-xs text-cream/60 hover:text-warmWhite hover:bg-white/[0.06] transition"
                  >
                    {language === 'ru' ? '📤 Поделиться' : '📤 Share'}
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-cream/50 mb-3">
                {language === 'ru' ? 'Подключите партнёра для совместимости' : 'Connect your partner for compatibility'}
              </p>
              <button
                onClick={() => router.push('/synastry')}
                className="lumina-button px-6"
              >
                {language === 'ru' ? 'Проверить совместимость' : 'Check compatibility'}
              </button>
            </div>
          )}

          {/* Connection code (compact) */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs text-cream/40">
                {language === 'ru' ? 'Ваш код:' : 'Your code:'}
                <span className="ml-2 font-heading text-sm tracking-wider text-lumina-soft">
                  {connectionCodeLoading ? '....' : (connectionCode || '....')}
                </span>
              </p>
              <button
                type="button"
                onClick={copyCode}
                disabled={!connectionCode}
                className="text-xs text-cream/40 hover:text-warmWhite transition disabled:opacity-30"
              >
                {copiedCode ? '✓' : (language === 'ru' ? 'Копировать' : 'Copy')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Birth Data (read-only) */}
      <section className="glass-card mb-6 p-5 animate-fadeInUp">
        <p className="lumina-label mb-3">{t.dateOfBirth}</p>
        <div className="space-y-2 text-sm text-cream">
          <p>{birthDate} • {birthTime}</p>
          {profile.locationName && <p className="text-cream/70">{profile.locationName}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            clearProfile();
            router.push('/');
          }}
          className="mt-3 text-sm text-lumina-accent hover:text-lumina-accent-bright transition"
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
                    ? 'border-lumina-accent bg-lumina-accent/15 text-lumina-soft'
                    : 'border-white/15 text-cream hover:border-lumina-accent/40'
                }`}
              >
                {getInterestLabel(interest)}
              </button>
            ))}
          </div>
        </div>

        {/* Consultation CTA */}
        <div className="mb-5 rounded-xl bg-white/5 border border-white/10 p-4 text-center">
          <p className="text-sm text-cream/70 mb-3">{t.ctaConsultationLabel}</p>
          <a
            href="/consultation"
            className="inline-flex items-center justify-center min-h-[44px] rounded-full border border-lumina-accent/30 px-6 text-sm text-cream transition hover:border-lumina-accent/60 hover:text-warmWhite"
          >
            {t.ctaBookSession}
          </a>
        </div>

        {/* Save Button */}
        <button type="button" onClick={handleSave} className="lumina-button w-full">
          {saved ? t.profileSaved : t.saveProfileBtn}
        </button>
      </section>

      {/* Connection code error */}
      {connectionCodeError && (
        <p className="mb-4 text-center text-sm text-rose-300">{connectionCodeError}</p>
      )}

      {/* Clear All Data */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleClearAll}
          className="text-sm text-cream/40 hover:text-red-400 transition"
        >
          {t.clearAllData}
        </button>
      </div>
    </div>
  );
}
