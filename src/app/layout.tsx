import type { Metadata, Viewport } from 'next';
import { DM_Serif_Display, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import AppProviders from '@/components/providers/AppProviders';
import Footer from '@/components/Footer';
import UserMenu from '@/components/UserMenu';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://luminastrology.com';

const dmSerif = DM_Serif_Display({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
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
  metadataBase: new URL(siteUrl),
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192x192.png',
  },
  openGraph: {
    title: 'Lumina — Astrology & Celestial Guidance',
    description: 'Premium astrology insights with natal chart precision and daily celestial guidance.',
    url: siteUrl,
    siteName: 'Lumina',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/images/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: 'Lumina',
      },
    ],
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#080C1F" />
      </head>
      <body className="min-h-screen bg-midnight text-warmWhite font-body antialiased">
        <ServiceWorkerRegistrar />
        <Analytics />
        <SpeedInsights />
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
