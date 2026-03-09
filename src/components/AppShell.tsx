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
    <div className="relative z-10 flex min-h-dvh flex-col">
      {!isOnboarding && !isHome ? (
        <nav className="relative z-40 border-b border-white/5 bg-[#0B0814]/72 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-2 px-4 py-3 pt-safe sm:px-6">
            <LanguageToggle />
            <UserMenu />
          </div>
        </nav>
      ) : null}
      <main className={`lumina-shell-main relative z-10 flex-1 ${isOnboarding ? '' : 'bottom-nav-content-offset'}`}>{children}</main>
      {!isOnboarding ? <BottomNav /> : null}
      {!isOnboarding && !isHome ? <Footer /> : null}
    </div>
  );
}
