import type { Metadata } from 'next';
import AstrologyIndexClient from '@/components/placements/AstrologyIndexClient';
import { planets, signs, planetSymbols, zodiacSymbols } from '@/data/placements';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://luminastrology.com';

export const metadata: Metadata = {
  title: 'Planet in Sign Meanings — Astrology Placements | Lumina',
  description:
    'Browse all natal chart placements by planet and sign. Explore detailed meanings for Sun, Moon, Mercury, Venus, Mars, and more in every zodiac sign.',
  alternates: {
    canonical: '/astrology',
  },
  openGraph: {
    title: 'Planet in Sign Meanings — Astrology Placements | Lumina',
    description:
      'Browse 120 natal chart placement guides and discover how each planet expresses through every zodiac sign.',
    url: `${siteUrl}/astrology`,
    siteName: 'Lumina',
    type: 'website',
  },
};

export default function AstrologyIndexPage() {
  return (
    <AstrologyIndexClient
      planets={[...planets]}
      signs={[...signs]}
      planetSymbols={planetSymbols}
      zodiacSymbols={zodiacSymbols}
    />
  );
}
