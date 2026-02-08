import type { Metadata, Viewport } from 'next';
import { DM_Serif_Display, Inter } from 'next/font/google';
import './globals.css';
import AppProviders from '@/components/providers/AppProviders';
import Footer from '@/components/Footer';

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
  title: 'Lumina V2',
  description: 'Premium astrology insights with natal chart precision and daily celestial guidance.',
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
          <main className="relative z-10 min-h-screen">{children}</main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
