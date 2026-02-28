import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { calculateNatalChart } from '@/services/astronomyCalculator';
import { initDB } from '@/lib/db';
import type { BirthData } from '@/types';

type ChartAspect = {
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  angle: number;
  orb: number;
  planet1: string;
  planet2: string;
};

const ADMIN_EMAILS = ['ryan@ryanwright.io', 'luminastrology@gmail.com', 'rudasirina773@gmail.com'];
const ADMIN_DOMAINS = ['ryanwright.io'];
const ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) return null;

  const domain = email.split('@')[1];
  if (!ADMIN_EMAILS.includes(email) && !ADMIN_DOMAINS.includes(domain)) {
    return null;
  }

  return session;
}

function parseBirthDate(raw: string | null | undefined) {
  if (!raw) return null;

  const trimmed = raw.trim();
  const dotMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    const day = Number(dotMatch[1]);
    const month = Number(dotMatch[2]);
    const year = Number(dotMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { year, month: month - 1, day };
    }
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { year, month: month - 1, day };
    }
  }

  return null;
}

function parseBirthTime(raw: string | null | undefined) {
  if (!raw) return { hour: 12, minute: 0 };
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return { hour: 12, minute: 0 };

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { hour: 12, minute: 0 };
  }

  return { hour, minute };
}

function longitudeFromPlanet(sign: string, degrees: string) {
  const signIndex = ZODIAC_SIGNS.indexOf(sign as (typeof ZODIAC_SIGNS)[number]);
  if (signIndex < 0) return 0;

  const deg = Number.parseFloat(degrees);
  if (Number.isNaN(deg)) return signIndex * 30;

  return signIndex * 30 + deg;
}

function calculateAspects(
  planets: Array<{ planet: string; sign: string; degrees: string }>
): ChartAspect[] {
  const ASPECTS = [
    { type: 'conjunction' as const, angle: 0, orb: 10 },
    { type: 'sextile' as const, angle: 60, orb: 6 },
    { type: 'square' as const, angle: 90, orb: 8 },
    { type: 'trine' as const, angle: 120, orb: 8 },
    { type: 'opposition' as const, angle: 180, orb: 10 },
  ];

  const results: ChartAspect[] = [];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];

      const lon1 = longitudeFromPlanet(p1.sign, p1.degrees);
      const lon2 = longitudeFromPlanet(p2.sign, p2.degrees);

      let separation = Math.abs(lon2 - lon1);
      if (separation > 180) separation = 360 - separation;

      for (const aspect of ASPECTS) {
        const orb = Math.abs(separation - aspect.angle);
        if (orb <= aspect.orb) {
          results.push({
            type: aspect.type,
            angle: aspect.angle,
            orb: Number(orb.toFixed(2)),
            planet1: p1.planet,
            planet2: p2.planet,
          });
          break;
        }
      }
    }
  }

  return results;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await ensureDB();

  try {
    const { id } = params;

    const result = await sql`
      SELECT
        c.*,
        u.id as linked_user_id,
        u.name as linked_user_name,
        u.email as linked_user_email,
        u.birth_date as linked_user_birth_date,
        u.birth_time as linked_user_birth_time,
        u.birth_place as linked_user_birth_place,
        u.birth_latitude as linked_user_birth_latitude,
        u.birth_longitude as linked_user_birth_longitude,
        u.birth_timezone as linked_user_birth_timezone,
        u.gender as linked_user_gender,
        u.relationship_status as linked_user_relationship_status
      FROM consultations c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ${id}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    const row = result.rows[0];

    const birthDateRaw = row.birth_date || row.linked_user_birth_date;
    const birthTimeRaw = row.birth_time || row.linked_user_birth_time;
    const latitude = Number(row.linked_user_birth_latitude);
    const longitude = Number(row.linked_user_birth_longitude);
    const timezone = row.linked_user_birth_timezone || 'UTC';

    const parsedDate = parseBirthDate(birthDateRaw);
    const parsedTime = parseBirthTime(birthTimeRaw);

    let natalChart: ReturnType<typeof calculateNatalChart> | null = null;
    let chartAspects: ChartAspect[] = [];

    const hasCoordinates = !Number.isNaN(latitude) && !Number.isNaN(longitude);

    if (parsedDate && hasCoordinates) {
      const birthData: BirthData = {
        year: parsedDate.year,
        month: parsedDate.month,
        day: parsedDate.day,
        hour: parsedTime.hour,
        minute: parsedTime.minute,
        latitude,
        longitude,
        timezone,
      };

      natalChart = calculateNatalChart(birthData);
      chartAspects = calculateAspects(natalChart.planets);
    }

    return NextResponse.json({
      consultation: {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        contact_email: row.contact_email,
        contact_phone: row.contact_phone,
        topics: row.topics,
        question: row.question,
        birth_date: row.birth_date,
        birth_time: row.birth_time,
        birth_place: row.birth_place,
        status: row.status,
        admin_notes: row.admin_notes,
        created_at: row.created_at,
      },
      user: row.linked_user_id
        ? {
            id: row.linked_user_id,
            name: row.linked_user_name,
            email: row.linked_user_email,
            birth_date: row.linked_user_birth_date,
            birth_time: row.linked_user_birth_time,
            birth_place: row.linked_user_birth_place,
            birth_latitude: row.linked_user_birth_latitude,
            birth_longitude: row.linked_user_birth_longitude,
            birth_timezone: row.linked_user_birth_timezone,
            gender: row.linked_user_gender,
            relationship_status: row.linked_user_relationship_status,
          }
        : null,
      natalChart: natalChart
        ? {
            ...natalChart,
            aspects: chartAspects,
          }
        : null,
      chartError: natalChart
        ? null
        : 'Natal chart could not be calculated. Missing or invalid birth date/coordinates/timezone.',
      birthDataUsed: parsedDate && hasCoordinates
        ? {
            birth_date: birthDateRaw,
            birth_time: birthTimeRaw,
            birth_place: row.birth_place || row.linked_user_birth_place,
            birth_latitude: latitude,
            birth_longitude: longitude,
            birth_timezone: timezone,
          }
        : null,
    });
  } catch (error) {
    console.error('Admin client detail API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
