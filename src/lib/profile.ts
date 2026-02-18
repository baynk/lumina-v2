'use client';

import type { BirthData } from '@/lib/types';

export type RelationshipStatus = 'single' | 'dating' | 'committed' | 'married' | 'complicated';
export type Interest = 'career' | 'love' | 'growth' | 'health' | 'creativity' | 'spirituality';
export type Gender = 'female' | 'male' | 'non-binary' | 'prefer-not-to-say';

export type UserProfileLocal = {
  birthData: BirthData;
  name: string;
  locationName: string;
  savedAt: number;
  timeAccuracy?: 'exact' | 'approximate' | 'unknown';
  relationshipStatus?: RelationshipStatus;
  interests?: Interest[];
  gender?: Gender;
};

const PROFILE_KEY = 'lumina_profile';
const OLD_BIRTH_KEY = 'lumina_birth_data';

export function saveProfile(profile: UserProfileLocal): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, savedAt: Date.now() }));
    localStorage.setItem(OLD_BIRTH_KEY, JSON.stringify({
      name: profile.name,
      locationName: profile.locationName,
      birthData: profile.birthData,
    }));
    window.dispatchEvent(new Event('lumina-profile-changed'));
  } catch {
    // Silently fail
  }
}

export function loadProfile(): UserProfileLocal | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) return JSON.parse(stored) as UserProfileLocal;
    const oldData = localStorage.getItem(OLD_BIRTH_KEY);
    if (oldData) {
      const parsed = JSON.parse(oldData);
      if (parsed?.birthData) {
        const migrated: UserProfileLocal = {
          birthData: parsed.birthData,
          name: parsed.name || '',
          locationName: parsed.locationName || '',
          savedAt: Date.now(),
        };
        saveProfile(migrated);
        return migrated;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function hasProfile(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!(localStorage.getItem(PROFILE_KEY) || localStorage.getItem(OLD_BIRTH_KEY));
  } catch {
    return false;
  }
}

export function clearProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(OLD_BIRTH_KEY);
    localStorage.removeItem('lumina_synastry_result');
    localStorage.removeItem('lumina_synastry_names');
    localStorage.removeItem('lumina_synastry_share_url');
    localStorage.removeItem('lumina_onboarding_story_cache');
    localStorage.removeItem('lumina_push_prompt_dismissed');
    // Clear all story-shown flags
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('lumina_story_shown_')) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event('lumina-profile-changed'));
  } catch {
    // Silently fail
  }
}
