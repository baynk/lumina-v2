import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ensureReferralSchema, getOrCreateUser, initDB } from '@/lib/db';

let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    await ensureReferralSchema();
    dbInitialized = true;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await req.json()) as { code?: string };
    const normalizedCode = body.code?.trim().toUpperCase();

    if (!normalizedCode) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    await ensureDB();

    const userId = (session.user as Record<string, unknown>).id as string;
    const email = session.user.email;

    await getOrCreateUser(userId, email, session.user.name || null, session.user.image || null);

    const referrer = await sql<{ id: string; referral_count: number | null }>`
      SELECT id, COALESCE(referral_count, 0) AS referral_count
      FROM users
      WHERE referral_code = ${normalizedCode}
      LIMIT 1
    `;

    if (!referrer.rows[0]) {
      return NextResponse.json({ error: 'Referral code not found' }, { status: 404 });
    }

    if (referrer.rows[0].id === userId) {
      return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 });
    }

    const existing = await sql<{ id: string }>`
      SELECT id
      FROM referrals
      WHERE referred_id = ${userId}
      LIMIT 1
    `;

    if (existing.rows[0]) {
      return NextResponse.json({ error: 'Referral already accepted' }, { status: 409 });
    }

    await sql`
      INSERT INTO referrals (referrer_id, referred_email, referred_id, status, reward_claimed)
      VALUES (${referrer.rows[0].id}, ${email}, ${userId}, 'completed', false)
    `;

    const updated = await sql<{ referral_count: number; synastry_unlocked: boolean }>`
      UPDATE users
      SET
        referral_count = COALESCE(referral_count, 0) + 1,
        synastry_unlocked = CASE
          WHEN COALESCE(referral_count, 0) + 1 >= 3 THEN true
          ELSE synastry_unlocked
        END,
        updated_at = now()
      WHERE id = ${referrer.rows[0].id}
      RETURNING COALESCE(referral_count, 0) AS referral_count, COALESCE(synastry_unlocked, true) AS synastry_unlocked
    `;

    return NextResponse.json({
      ok: true,
      referrer_id: referrer.rows[0].id,
      referral_count: Number(updated.rows[0]?.referral_count ?? 0),
      synastry_unlocked: Boolean(updated.rows[0]?.synastry_unlocked ?? true),
    });
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Referral already accepted' }, { status: 409 });
    }

    console.error('POST /api/referral/accept error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
