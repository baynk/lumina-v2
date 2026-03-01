import { NextResponse } from 'next/server';

function isCronAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const header = request.headers.get('authorization');
  return header === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminToken = process.env.TELEGRAM_ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json({ error: 'Missing TELEGRAM_ADMIN_TOKEN' }, { status: 500 });
  }

  try {
    const origin = new URL(request.url).origin;
    const response = await fetch(`${origin}/api/telegram/channel-post`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      cache: 'no-store',
    });

    const data = (await response.json()) as Record<string, unknown>;
    return NextResponse.json(
      {
        ok: response.ok,
        status: response.status,
        result: data,
      },
      { status: response.ok ? 200 : response.status }
    );
  } catch (error) {
    console.error('Telegram channel cron error:', error);
    return NextResponse.json({ error: 'Failed to trigger telegram channel post' }, { status: 500 });
  }
}
