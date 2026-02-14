import { NextRequest, NextResponse } from 'next/server';
import type { BirthData } from '@/types';
import { calculateSolarReturn } from '@/services/solarReturnCalculator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const year = Number.parseInt(searchParams.get('year') || '0', 10);
    const month = Number.parseInt(searchParams.get('month') || '0', 10);
    const day = Number.parseInt(searchParams.get('day') || '0', 10);
    const hour = Number.parseInt(searchParams.get('hour') || '12', 10);
    const minute = Number.parseInt(searchParams.get('minute') || '0', 10);
    const lat = Number.parseFloat(searchParams.get('lat') || '0');
    const lon = Number.parseFloat(searchParams.get('lon') || '0');
    const tz = searchParams.get('tz') || 'UTC';

    const returnYear = Number.parseInt(searchParams.get('returnYear') || String(new Date().getFullYear()), 10);
    const currentLat = Number.parseFloat(searchParams.get('currentLat') || String(lat));
    const currentLon = Number.parseFloat(searchParams.get('currentLon') || String(lon));
    const currentTz = searchParams.get('currentTz') || tz;

    if (!year || !day) {
      return NextResponse.json({ error: 'Missing required birth data parameters.' }, { status: 400 });
    }

    if (Number.isNaN(currentLat) || Number.isNaN(currentLon)) {
      return NextResponse.json({ error: 'Invalid current location coordinates.' }, { status: 400 });
    }

    const birthData: BirthData = {
      year,
      month,
      day,
      hour,
      minute,
      latitude: lat,
      longitude: lon,
      timezone: tz,
    };

    const solarReturn = calculateSolarReturn(
      birthData,
      returnYear,
      currentLat,
      currentLon,
      currentTz
    );

    return NextResponse.json(solarReturn);
  } catch (error) {
    console.error('Solar return calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate solar return. Please verify input values.' },
      { status: 500 }
    );
  }
}
