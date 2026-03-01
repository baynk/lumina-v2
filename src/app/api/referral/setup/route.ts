import { NextResponse } from 'next/server';
import { ensureReferralSchema, initDB } from '@/lib/db';

let referralSetupDone = false;

async function ensureReferralSetup() {
  if (!referralSetupDone) {
    await initDB();
    await ensureReferralSchema();
    referralSetupDone = true;
  }
}

export async function GET() {
  try {
    await ensureReferralSetup();
    return NextResponse.json({ ok: true, message: 'Referral schema is ready' });
  } catch (error) {
    console.error('GET /api/referral/setup error:', error);
    return NextResponse.json({ error: 'Failed to setup referral schema' }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
