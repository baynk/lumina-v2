'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';
import UserMenu from '@/components/UserMenu';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname === '/onboarding';
  const isHome = pathname === '/';

  return (
    <>
      {!isOnboarding && !isHome ? (
        <nav className="fixed right-3 top-3 z-50 flex items-center gap-2 sm:right-6 sm:top-4 sm:gap-3">
          <LanguageToggle />
          <UserMenu />
        </nav>
      ) : null}
      <main className={`relative z-10 min-h-dvh ${isOnboarding ? '' : isHome ? 'bottom-nav-content-offset' : 'bottom-nav-content-offset pt-14 sm:pb-0 sm:pt-16'}`}>{children}</main>
      {!isOnboarding ? <BottomNav /> : null}
      {!isOnboarding && !isHome ? <Footer /> : null}
    </>
  );
}
