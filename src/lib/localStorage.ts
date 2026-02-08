'use client';

export interface StoredBirthData {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timezone: string;
  locationName: string;
}

const STORAGE_KEY = 'lumina-birth-data';

export function saveBirthData(data: StoredBirthData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function loadBirthData(): StoredBirthData | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredBirthData;
  } catch {
    return null;
  }
}

export function clearBirthData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}
