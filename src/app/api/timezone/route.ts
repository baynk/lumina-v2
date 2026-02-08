import { NextResponse } from 'next/server';
import { find } from 'geo-tz';

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
    const timezones = find(latitude, longitude);
    const timezone = timezones[0] || 'UTC';
    return NextResponse.json({ timezone });
  } catch {
    return NextResponse.json({ timezone: 'UTC' });
  }
}
