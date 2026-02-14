'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return (
      <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn('google')}
        className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs text-cream/70 transition hover:border-lumina-accent/40 hover:text-warmWhite"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        Sign in
      </button>
    );
  }

  const initials = session.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 transition"
      >
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt=""
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-white/20 object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-lumina-accent/20 border border-lumina-accent/30 text-[10px] sm:text-xs font-semibold text-lumina-soft">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-[#0f1433]/95 backdrop-blur-md p-1 shadow-xl z-50 animate-fadeInUp">
          <div className="px-3 py-2.5 border-b border-white/10">
            <p className="text-sm font-medium text-warmWhite truncate">
              {session.user?.name}
            </p>
            <p className="text-xs text-cream/50 truncate">
              {session.user?.email}
            </p>
          </div>
          <a
            href="/profile"
            onClick={() => setOpen(false)}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-cream/70 transition hover:bg-white/10 hover:text-warmWhite"
          >
            Profile
          </a>
          <button
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: '/' });
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-cream/70 transition hover:bg-white/10 hover:text-warmWhite"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
