import type { Metadata, Viewport } from 'next';
import { Outfit, Playfair_Display } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import AppProviders from '@/components/providers/AppProviders';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import AppShell from '@/components/AppShell';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://luminastrology.com';

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
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
  themeColor: '#0B0814',
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
    <html lang="en" className={`${playfair.variable} ${outfit.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B0814" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
        />
      </head>
      <body className="min-h-screen bg-bg-base text-text-primary font-body antialiased">
        <ServiceWorkerRegistrar />
        <Analytics />
        <SpeedInsights />
        <AppProviders>
          <div className="star-field" aria-hidden="true" />
          <div className="celestial-gradient" aria-hidden="true" />
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
