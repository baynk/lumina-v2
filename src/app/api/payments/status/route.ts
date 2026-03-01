import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getOrCreateUser, initDB } from '@/lib/db';

let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureDB();

    const userId = (session.user as Record<string, unknown>).id as string;
    await getOrCreateUser(userId, session.user.email, session.user.name || null, session.user.image || null);

    const result = await sql<{ subscription_status: string | null; subscription_end: string | null }>`
      SELECT subscription_status, subscription_end
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    const row = result.rows[0];
    return NextResponse.json({
      subscription_status: row?.subscription_status || 'free',
      subscription_end: row?.subscription_end || null,
    });
  } catch (error) {
    console.error('GET /api/payments/status error:', error);
    return NextResponse.json({ error: 'Failed to get payment status' }, { status: 500 });
  }
}
