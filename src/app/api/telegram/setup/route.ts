import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { setWebhook } from '@/lib/telegram';

const ADMIN_EMAILS = ['ryan@ryanwright.io', 'luminastrology@gmail.com', 'rudasirina773@gmail.com'];
const ADMIN_DOMAINS = ['ryanwright.io'];

async function isAuthorized(request: Request) {
  const header = request.headers.get('authorization');
  const token = process.env.TELEGRAM_ADMIN_TOKEN;

  if (token && header) {
    const value = header.replace(/^Bearer\s+/i, '').trim();
    if (value === token) return true;
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return false;

  const domain = email.split('@')[1] || '';
  return ADMIN_EMAILS.includes(email) || ADMIN_DOMAINS.includes(domain);
}

export async function GET(request: Request) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secretToken) {
    return NextResponse.json({ error: 'Missing TELEGRAM_WEBHOOK_SECRET' }, { status: 500 });
  }

  try {
    const webhookUrl = 'https://luminastrology.com/api/telegram/webhook';
    const result = await setWebhook(webhookUrl, secretToken);

    return NextResponse.json({
      ok: true,
      webhookUrl,
      telegram: result,
    });
  } catch (error) {
    console.error('Telegram setup error:', error);
    return NextResponse.json({ error: 'Failed to set webhook' }, { status: 500 });
  }
}
