import { NextRequest, NextResponse } from 'next/server';
import type { BirthData, AstrocartographyData } from '@/types';
import { calculateAstrocartography } from '@/services/astrocartographyCalculator';

type CacheEntry = {
  createdAt: number;
  data: AstrocartographyData;
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const astroCache = new Map<string, CacheEntry>();

function parseIntParam(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatParam(value: string | null, fallback: number): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCacheKey(birthData: BirthData): string {
  return [
    birthData.year,
    birthData.month,
    birthData.day,
    birthData.hour,
    birthData.minute,
    birthData.latitude.toFixed(4),
    birthData.longitude.toFixed(4),
    birthData.timezone,
  ].join('|');
}

function validateBirthData(birthData: BirthData): string | null {
  if (birthData.year < 1800 || birthData.year > 2300) return 'Invalid year';
  if (birthData.month < 0 || birthData.month > 11) return 'Invalid month (expected 0-11)';
  if (birthData.day < 1 || birthData.day > 31) return 'Invalid day';
  if (birthData.hour < 0 || birthData.hour > 23) return 'Invalid hour';
  if (birthData.minute < 0 || birthData.minute > 59) return 'Invalid minute';
  if (birthData.latitude < -90 || birthData.latitude > 90) return 'Invalid latitude';
  if (birthData.longitude < -180 || birthData.longitude > 180) return 'Invalid longitude';
  if (!birthData.timezone) return 'Missing timezone';
  return null;
}

function getCachedOrCalculate(birthData: BirthData): AstrocartographyData {
  const key = getCacheKey(birthData);
  const existing = astroCache.get(key);

  if (existing && Date.now() - existing.createdAt <= CACHE_TTL_MS) {
    return existing.data;
  }

  const data = calculateAstrocartography(birthData);
  astroCache.set(key, { createdAt: Date.now(), data });
  return data;
}

export function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const birthData: BirthData = {
      year: parseIntParam(params.get('year'), 0),
      month: parseIntParam(params.get('month'), 0),
      day: parseIntParam(params.get('day'), 1),
      hour: parseIntParam(params.get('hour'), 12),
      minute: parseIntParam(params.get('minute'), 0),
      latitude: parseFloatParam(params.get('lat'), 0),
      longitude: parseFloatParam(params.get('lon'), 0),
      timezone: params.get('tz') || 'UTC',
    };

    const validationError = validateBirthData(birthData);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const data = getCachedOrCalculate(birthData);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Astrocartography calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate astrocartography lines.' },
      { status: 500 },
    );
  }
}
