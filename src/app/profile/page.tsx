'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/context/LanguageContext';
import { loadProfile, saveProfile, clearProfile, type UserProfileLocal, type RelationshipStatus, type Interest, type Gender } from '@/lib/profile';

const RELATIONSHIP_OPTIONS: RelationshipStatus[] = ['single', 'dating', 'committed', 'married', 'complicated'];
const INTEREST_OPTIONS: Interest[] = ['career', 'love', 'growth', 'health', 'creativity', 'spirituality'];
const GENDER_OPTIONS: Gender[] = ['female', 'male', 'non-binary', 'prefer-not-to-say'];

export default function ProfilePage() {
  const router = useRouter();
  const { language, t } = useLanguage();

  const [profile, setProfile] = useState<UserProfileLocal | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus | ''>('');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [gender, setGender] = useState<Gender | ''>('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
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
  }, [router]);

  const toggleInterest = (interest: Interest) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
    setSaved(false);
  };

  const handleSave = () => {
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
    <div className="mx-auto max-w-lg px-4 pb-10 pt-6 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <button onClick={() => router.push('/chart')} className="min-h-11 rounded-full px-4 text-sm text-cream hover:text-warmWhite">
          ← {t.back}
        </button>
        <p className="font-heading text-xl text-lumina-soft">{t.profile}</p>
        <LanguageToggle />
      </header>

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

        {/* Save Button */}
        <button type="button" onClick={handleSave} className="lumina-button w-full">
          {saved ? t.profileSaved : t.saveProfileBtn}
        </button>
      </section>

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
