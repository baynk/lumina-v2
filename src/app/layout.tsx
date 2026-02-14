import type { Metadata, Viewport } from 'next';
import { DM_Serif_Display, Inter } from 'next/font/google';
import './globals.css';
import AppProviders from '@/components/providers/AppProviders';
import Footer from '@/components/Footer';
import UserMenu from '@/components/UserMenu';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';

const dmSerif = DM_Serif_Display({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lumina — Astrology & Celestial Guidance',
  description: 'Premium astrology insights with natal chart precision and daily celestial guidance.',
  openGraph: {
    title: 'Lumina — Astrology & Celestial Guidance',
    description: 'Premium astrology insights with natal chart precision and daily celestial guidance.',
    url: 'https://luminastrology.com',
    siteName: 'Lumina',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080c1f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-midnight text-warmWhite font-body antialiased">
        <AppProviders>
          <div className="star-field" aria-hidden="true" />
          <div className="celestial-gradient" aria-hidden="true" />
          <nav className="fixed right-3 top-3 z-50 flex items-center gap-2 sm:right-6 sm:top-4 sm:gap-3">
            <LanguageToggle />
            <UserMenu />
          </nav>
          <main className="relative z-10 min-h-screen pb-24 pt-14 sm:pb-0 sm:pt-16">{children}</main>
          <BottomNav />
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
