import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
      {
        headers: {
          'User-Agent': 'Lumina Astrology (luminastrology.com)',
          'Accept-Language': 'en,ru',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
