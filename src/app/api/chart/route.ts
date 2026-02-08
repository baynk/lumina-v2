import { NextRequest, NextResponse } from 'next/server';
import { calculateNatalChart, calculateDailyCelestialData } from '@/services/astronomyCalculator';
import type { BirthData } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get('year') || '0');
    const month = parseInt(searchParams.get('month') || '0');
    const day = parseInt(searchParams.get('day') || '1');
    const hour = parseInt(searchParams.get('hour') || '12');
    const minute = parseInt(searchParams.get('minute') || '0');
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lon = parseFloat(searchParams.get('lon') || '0');
    const tz = searchParams.get('tz') || 'UTC';

    if (!year || !day) {
      return NextResponse.json({ error: 'Missing birth data parameters' }, { status: 400 });
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

    const natalChart = calculateNatalChart(birthData);
    const dailyData = calculateDailyCelestialData();

    return NextResponse.json({ natalChart, dailyData });
  } catch (error) {
    console.error('Chart calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate chart. Please check your birth data.' },
      { status: 500 }
    );
  }
}
