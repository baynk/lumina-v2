import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAllUsers, getAllConsultations, updateConsultationStatus, getStats, initDB } from '@/lib/db';

// Admin emails that can access the admin panel
const ADMIN_EMAILS = ['ryan@ryanwright.io', 'luminastrology@gmail.com', 'rudasirina773@gmail.com'];
const ADMIN_DOMAINS = ['ryanwright.io'];

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

// GET /api/admin?type=users|consultations|stats
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await ensureDB();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'stats';

  try {
    switch (type) {
      case 'users':
        return NextResponse.json(await getAllUsers());
      case 'consultations':
        return NextResponse.json(await getAllConsultations());
      case 'stats':
        return NextResponse.json(await getStats());
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH /api/admin — update consultation status
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await ensureDB();

  try {
    const body = await req.json();
    const { id, status, admin_notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const result = await updateConsultationStatus(id, status, admin_notes);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin PATCH error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
