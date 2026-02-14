'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { hasProfile } from '@/lib/profile';

type NavItem = {
  href: string;
  label: string;
  icon: (active: boolean) => ReactNode;
};

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? 'text-lumina-accent' : 'text-cream/70'}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5.5 9.8V20h13V9.8" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? 'text-lumina-accent' : 'text-cream/70'}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 6.7l1.2 2.5 2.8.4-2 1.9.5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-1.9 2.8-.4L12 6.7z" />
    </svg>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? 'text-lumina-accent' : 'text-cream/70'}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20.5s-7.5-4.8-7.5-10.3C4.5 7.5 6.7 5.8 9 5.8c1.6 0 2.5.7 3 1.5.5-.8 1.4-1.5 3-1.5 2.3 0 4.5 1.7 4.5 4.4 0 5.5-7.5 10.3-7.5 10.3z" />
    </svg>
  );
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? 'text-lumina-accent' : 'text-cream/70'}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const refresh = () => setVisible(hasProfile());
    refresh();

    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('lumina-profile-changed', refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('lumina-profile-changed', refresh);
    };
  }, [pathname]);

  const items: NavItem[] = [
    { href: '/', label: t.bottomNavHome, icon: (active) => <HomeIcon active={active} /> },
    { href: '/chart', label: t.bottomNavChart, icon: (active) => <ChartIcon active={active} /> },
    { href: '/synastry', label: t.bottomNavCompatibility, icon: (active) => <HeartIcon active={active} /> },
    { href: '/profile', label: t.bottomNavProfile, icon: (active) => <PersonIcon active={active} /> },
  ];

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1rem)] -translate-x-1/2 rounded-2xl border border-white/[0.08] bg-[#0f1433]/70 px-3 py-2 backdrop-blur-xl md:hidden">
      <ul className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition ${active ? 'bg-white/[0.08] text-lumina-accent' : 'text-cream/65 hover:text-cream'}`}
              >
                {item.icon(active)}
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
