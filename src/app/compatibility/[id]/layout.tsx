import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://luminastrology.com';
    const res = await fetch(`${baseUrl}/api/synastry-result?id=${id}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const title = `${data.personAName} & ${data.personBName} — ${data.overallScore}% Compatible`;
      const desc = `Celestial compatibility reading: ${data.personASun} ✦ ${data.personBSun}. Discover your own compatibility at Lumina.`;
      return {
        title,
        description: desc,
        openGraph: {
          title,
          description: desc,
          siteName: 'Lumina Astrology',
          url: `https://luminastrology.com/compatibility/${id}`,
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description: desc,
        },
      };
    }
  } catch {}
  return {
    title: 'Compatibility Reading — Lumina',
    description: 'Celestial compatibility analysis powered by NASA JPL data.',
  };
}

export default function CompatibilityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
