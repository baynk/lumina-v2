import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

async function setupPaymentsSchema() {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ`;

  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      stripe_payment_id TEXT,
      amount INTEGER,
      currency TEXT DEFAULT 'eur',
      type TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function POST() {
  try {
    await setupPaymentsSchema();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/payments/setup error:', error);
    return NextResponse.json({ error: 'Failed to setup payments schema' }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
