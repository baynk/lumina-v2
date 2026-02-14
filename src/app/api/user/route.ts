import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getOrCreateUser, saveBirthData, updateProfile, initDB } from '@/lib/db';

let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

// GET /api/user — get current user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureDB();
    const userId = (session.user as Record<string, unknown>).id as string;
    const profile = await getOrCreateUser(
      userId,
      session.user.email,
      session.user.name || null,
      session.user.image || null
    );

    return NextResponse.json(profile);
  } catch (error) {
    console.error('GET /api/user error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/user — save birth data (onboarding)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureDB();
    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();

    const { birth_date, birth_time, birth_place, birth_latitude, birth_longitude, birth_timezone, name } = body;

    if (!birth_date || !birth_time || !birth_place || birth_latitude == null || birth_longitude == null || !birth_timezone) {
      return NextResponse.json({ error: 'Missing required birth data fields' }, { status: 400 });
    }

    const profile = await saveBirthData(userId, {
      birth_date,
      birth_time,
      birth_place,
      birth_latitude,
      birth_longitude,
      birth_timezone,
      name,
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('POST /api/user error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH /api/user — update profile fields (gender, relationship, interests)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureDB();
    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();

    const profile = await updateProfile(userId, {
      gender: body.gender,
      relationship_status: body.relationship_status,
      interests: body.interests,
      name: body.name,
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('PATCH /api/user error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
