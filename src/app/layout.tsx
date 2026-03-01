import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
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

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '600', '700'],
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
  description: 'Lumina delivers personalized astrology readings, natal chart analysis, synastry compatibility, and daily transit guidance for your relationships, purpose, and growth.',
  metadataBase: new URL(siteUrl),
  keywords: [
    'astrology app',
    'natal chart',
    'birth chart reading',
    'synastry compatibility',
    'daily transits',
    'astrology consultation',
    'celestial guidance',
  ],
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192x192.png',
  },
  openGraph: {
    title: 'Lumina — Astrology & Celestial Guidance',
    description: 'Personalized natal chart readings, synastry compatibility insights, and daily transit guidance in one astrology app.',
    url: siteUrl,
    siteName: 'Lumina',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'Lumina - Astrology & Celestial Guidance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lumina — Astrology & Celestial Guidance',
    description: 'Explore your natal chart, relationship compatibility, and daily astrology transits with Lumina.',
    images: [`${siteUrl}/opengraph-image`],
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
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Lumina',
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
    sameAs: [siteUrl],
    description: 'Astrology platform for natal charts, synastry readings, and daily celestial guidance.',
  };

  const webApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Lumina',
    url: siteUrl,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript. Works in modern browsers.',
    description: 'Personalized astrology web app with natal chart analysis, compatibility insights, daily transits, and guided consultation.',
    publisher: {
      '@type': 'Organization',
      name: 'Lumina',
      url: siteUrl,
    },
  };

  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#080C1F" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
        />
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
