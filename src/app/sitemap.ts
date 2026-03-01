import type { MetadataRoute } from 'next';
import { planets, signs, placementSlug } from '@/data/placements';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://luminastrology.com';

const publicRoutes = [
  '',
  '/landing',
  '/chart',
  '/synastry',
  '/transits',
  '/consultation',
  '/journal',
  '/profile',
  '/story-of-you',
  '/astrology',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const baseRoutes = publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
    changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
    priority: route === '' ? 1 : 0.8,
  }));

  const placementRoutes = planets.flatMap((planet) =>
    signs.map((sign) => {
      const slug = placementSlug(planet, sign);
      return {
        url: `${siteUrl}/astrology/${slug}`,
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    }),
  );

  return [...baseRoutes, ...placementRoutes];
}
