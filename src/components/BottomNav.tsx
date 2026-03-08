'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CircleDot, Heart, Home, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { hasProfile } from '@/lib/profile';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

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

  if (!visible) return null;

  const items: NavItem[] = [
    { href: '/', label: t.bottomNavToday, icon: Home },
    { href: '/chart', label: t.bottomNavChart, icon: CircleDot },
    { href: '/synastry', label: t.bottomNavCompatibility, icon: Heart },
    { href: '/calendar', label: t.bottomNavCalendar, icon: Calendar },
    { href: '/profile', label: t.bottomNavProfile, icon: User },
  ];

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-[#1A1822] pb-safe"
      style={{ borderTopColor: 'rgba(240,235,227,0.05)' }}
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-[64px] flex-col items-center justify-center gap-1 px-2 pt-2 text-center font-sans"
                style={{ color: active ? '#C8A96E' : '#9A9298' }}
              >
                <div className="flex flex-col items-center">
                  <Icon size={20} strokeWidth={1.9} />
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}
                    style={{ backgroundColor: '#C8A96E' }}
                  />
                </div>
                <span className="text-[10px] leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
