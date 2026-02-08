import { NextResponse } from 'next/server';

// @photostructure/tz-lookup embeds timezone data directly in the package
// (no external files needed — works on Vercel serverless)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tzlookup = require('@photostructure/tz-lookup');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon parameters' }, { status: 400 });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    const timezone = tzlookup(latitude, longitude) || 'UTC';
    return NextResponse.json({ timezone });
  } catch {
    return NextResponse.json({ timezone: 'UTC' });
  }
}
