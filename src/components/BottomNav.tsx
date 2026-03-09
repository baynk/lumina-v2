'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, CircleDot, HeartHandshake, Home } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { hasProfile } from '@/lib/profile';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

export default function BottomNav() {
  const pathname = usePathname();
  const { language, t } = useLanguage();
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

  if (!visible) return null;

  const items: NavItem[] = [
    { href: '/', label: t.bottomNavToday, icon: Home },
    { href: '/chart', label: t.bottomNavChart, icon: CircleDot },
    { href: '/synastry', label: language === 'ru' ? 'Синастрия' : 'Synastry', icon: HeartHandshake },
    { href: '/calendar', label: t.bottomNavCalendar, icon: CalendarDays },
  ];

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <nav
      className="bottom-nav-shell pointer-events-none fixed inset-x-0 bottom-0 z-40"
      aria-label={language === 'ru' ? 'Нижняя навигация' : 'Bottom navigation'}
    >
      <div className="bottom-nav-fade pointer-events-none absolute inset-x-0 bottom-0 h-[calc(90px+env(safe-area-inset-bottom,0px))]" aria-hidden="true" />
      <ul className="pointer-events-auto mx-auto grid h-[90px] w-full max-w-md grid-cols-4 px-6 pb-5 pt-5">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-[64px] flex-col items-center justify-center gap-2 text-center font-body transition-colors duration-300"
                style={{ color: active ? '#FDFBF7' : '#5C5970' }}
              >
                <Icon size={20} strokeWidth={1.5} absoluteStrokeWidth />
                <span className="text-[11px] leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
