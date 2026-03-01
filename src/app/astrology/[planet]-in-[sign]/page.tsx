import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PlacementDetailClient from '@/components/placements/PlacementDetailClient';
import {
  getPlacementData,
  planets,
  signs,
  placementSlug,
  planetSymbols,
  zodiacSymbols,
} from '@/data/placements';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://luminastrology.com';

type PageProps = {
  params: Promise<{ planet: string; sign: string }>;
};

export function generateStaticParams() {
  return planets.flatMap((planet) =>
    signs.map((sign) => ({
      planet: planet.toLowerCase(),
      sign: sign.toLowerCase(),
    })),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { planet, sign } = await params;
  const placement = getPlacementData(planet, sign);

  if (!placement) {
    return {
      title: 'Placement Not Found | Lumina',
      description: 'The requested planetary placement page could not be found.',
    };
  }

  const title = `${placement.planet} in ${placement.sign} — Natal Chart Meaning | Lumina`;
  const description = `${placement.planet} in ${placement.sign}: ${placement.overview.en.split('. ')[0]}. Explore traits, relationships, career themes, and challenges with Lumina.`;
  const slug = placementSlug(placement.planet, placement.sign);
  const url = `${siteUrl}/astrology/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: `/astrology/${slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      siteName: 'Lumina',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PlacementPage({ params }: PageProps) {
  const { planet, sign } = await params;
  const placement = getPlacementData(planet, sign);

  if (!placement) {
    notFound();
  }

  return (
    <PlacementDetailClient
      placement={placement}
      planetSymbol={planetSymbols[placement.planet]}
      zodiacSymbol={zodiacSymbols[placement.sign]}
    />
  );
}
