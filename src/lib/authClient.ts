'use client';

import { signOut } from 'next-auth/react';
import { clearProfile } from '@/lib/profile';

const KEYS_TO_PRESERVE = new Set(['lumina_language']);

function shouldRemoveLocalStorageKey(key: string) {
  if (KEYS_TO_PRESERVE.has(key)) return false;
  if (key.startsWith('lumina_') || key.startsWith('lumina-')) return true;
  return key.toLowerCase().includes('nextauth');
}

export function clearClientStateForSignOut() {
  if (typeof window === 'undefined') return;

  clearProfile();

  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && shouldRemoveLocalStorageKey(key)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Best effort
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // Best effort
  }
}

/**
 * Manually nuke the NextAuth session cookie.
 * This handles the case where signOut({ redirect: false }) doesn't
 * complete or the cookie survives due to mobile browser caching.
 */
function nukeSessionCookies() {
  if (typeof document === 'undefined') return;
  // NextAuth JWT cookies — try all common names and paths
  const cookieNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.csrf-token',
    '__Secure-next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
    '__Host-next-auth.csrf-token',
  ];
  for (const name of cookieNames) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
    // Also try secure variants
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure`;
  }
}

export async function secureSignOut(callbackUrl = '/') {
  // Step 1: Nuke all client-side state
  clearClientStateForSignOut();

  // Step 2: Nuke session cookies directly (belt-and-suspenders)
  nukeSessionCookies();

  // Step 3: Call NextAuth signOut and WAIT for it to complete
  try {
    await signOut({ redirect: false });
  } catch {
    // Best effort — cookies already nuked above
  }

  // Step 4: Nuke cookies again after signOut (in case it re-set anything)
  nukeSessionCookies();

  // Step 5: Dispatch events for any listening components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('lumina-auth-signed-out'));
    window.dispatchEvent(new Event('lumina-profile-changed'));

    // Step 6: Hard navigation — use window.location.href for a full page load
    // This destroys the entire Next.js client-side cache and React tree
    window.location.href = callbackUrl;
  }
}
