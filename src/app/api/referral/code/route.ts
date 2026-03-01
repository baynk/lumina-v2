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

function createReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `LUNA-${suffix}`;
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

    const existing = await sql<{ referral_code: string | null; referral_count: number | null }>`
      SELECT referral_code, COALESCE(referral_count, 0) AS referral_count
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    let referralCode = existing.rows[0]?.referral_code ?? null;
    const referralCount = Number(existing.rows[0]?.referral_count ?? 0);

    if (!referralCode) {
      for (let attempts = 0; attempts < 30; attempts += 1) {
        const candidate = createReferralCode();

        try {
          const updated = await sql<{ referral_code: string | null }>`
            UPDATE users
            SET referral_code = ${candidate}, updated_at = now()
            WHERE id = ${userId} AND referral_code IS NULL
            RETURNING referral_code
          `;

          if (updated.rows[0]?.referral_code) {
            referralCode = updated.rows[0].referral_code;
            break;
          }

          const current = await sql<{ referral_code: string | null }>`
            SELECT referral_code
            FROM users
            WHERE id = ${userId}
            LIMIT 1
          `;

          if (current.rows[0]?.referral_code) {
            referralCode = current.rows[0].referral_code;
            break;
          }
        } catch {
          // Retry if a generated code collides with an existing unique code.
        }
      }
    }

    if (!referralCode) {
      return NextResponse.json({ error: 'Unable to generate referral code' }, { status: 500 });
    }

    return NextResponse.json({ code: referralCode, referral_count: referralCount });
  } catch (error) {
    console.error('GET /api/referral/code error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
