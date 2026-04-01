'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, CircleDot, HeartHandshake, Home } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

export default function BottomNav() {
  const pathname = usePathname();
  const { language, t } = useLanguage();

  const items: NavItem[] = [
    { href: '/', label: t.bottomNavToday, icon: Home },
    { href: '/chart', label: t.bottomNavChart, icon: CircleDot },
    { href: '/synastry', label: language === 'ru' ? 'Синастрия' : 'Synastry', icon: HeartHandshake },
    { href: '/calendar', label: t.bottomNavCalendar, icon: CalendarDays },
  ];

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[72px] flex-col items-center border-r border-white/5 bg-[#0B0814]/80 backdrop-blur-xl py-6 gap-2"
        aria-label={language === 'ru' ? 'Боковая навигация' : 'Side navigation'}
      >
        <div className="mb-6 font-heading text-lg text-[#FDFBF7]">✦</div>
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-2xl transition-colors duration-200 ${
                active ? 'bg-white/[0.08] text-[#FDFBF7]' : 'text-[#C0BDD6] hover:bg-white/[0.04] hover:text-[#FDFBF7]'
              }`}
            >
              <Icon size={20} strokeWidth={1.5} absoluteStrokeWidth />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom nav */}
      <nav
        className="bottom-nav-fade fixed inset-x-0 bottom-0 z-40 lg:hidden"
        aria-label={language === 'ru' ? 'Нижняя навигация' : 'Bottom navigation'}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ul className="mx-auto grid w-full max-w-[430px] grid-cols-4 px-6 pb-3 pt-3" style={{ minHeight: '72px' }}>
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-[64px] flex-col items-center justify-center gap-2 text-center font-body transition-colors duration-300"
                  style={{ color: active ? '#FDFBF7' : '#C0BDD6' }}
                >
                  <Icon size={22} strokeWidth={1.5} absoluteStrokeWidth />
                  <span className="text-[11px] font-medium leading-none">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
