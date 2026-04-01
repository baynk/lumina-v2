import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const ADMIN_EMAILS = ['ryan@ryanwright.io', 'luminastrology@gmail.com', 'rudasirina773@gmail.com'];
const ADMIN_DOMAINS = ['ryanwright.io'];

async function isAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return false;
  const domain = email.split('@')[1];
  return ADMIN_EMAILS.includes(email) || ADMIN_DOMAINS.includes(domain);
}

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
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
