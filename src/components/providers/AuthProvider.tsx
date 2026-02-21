'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { clearProfile, loadProfile } from '@/lib/profile';

/**
 * Guard against stale state from BFCache and mobile browser caching.
 * If the session is gone but we still have a local profile, wipe it.
 */
function AuthStateGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  useEffect(() => {
    // BFCache: when the browser restores the page from memory, re-check state
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page was restored from BFCache — check if session is still valid
        const profile = loadProfile();
        if (profile && status === 'unauthenticated') {
          clearProfile();
          window.location.reload();
        }
      }
    };

    // Visibility change: when user tabs back, verify state consistency
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && status === 'unauthenticated') {
        const profile = loadProfile();
        if (profile) {
          clearProfile();
          window.location.reload();
        }
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [status]);

  // On every render: if unauthenticated but profile exists, clear it
  useEffect(() => {
    if (status === 'unauthenticated') {
      const profile = loadProfile();
      if (profile) {
        clearProfile();
      }
    }
  }, [status]);

  return <>{children}</>;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={true} refetchInterval={0}>
      <AuthStateGuard>{children}</AuthStateGuard>
    </SessionProvider>
  );
}
