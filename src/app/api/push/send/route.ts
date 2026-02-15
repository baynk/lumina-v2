import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import webpush from 'web-push';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

type SendPayload = {
  title?: string;
  body?: string;
  url?: string;
  userId?: string;
};

type PushSubscriptionRow = {
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
};

const ADMIN_EMAILS = new Set(['ryan@ryanwright.io', 'luminastrology@gmail.com']);
const ADMIN_DOMAIN = 'ryanwright.io';

function isAdminEmail(email: string) {
  const normalized = email.toLowerCase();
  if (ADMIN_EMAILS.has(normalized)) {
    return true;
  }
  return normalized.endsWith(`@${ADMIN_DOMAIN}`);
}

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID keys');
  }

  webpush.setVapidDetails('mailto:luminastrology@gmail.com', publicKey, privateKey);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!email || !isAdminEmail(email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as SendPayload;
    if (!body.title || !body.body) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    configureVapid();

    const query = body.userId
      ? sql<PushSubscriptionRow>`
          SELECT endpoint, keys_p256dh, keys_auth
          FROM push_subscriptions
          WHERE user_id = ${body.userId}
        `
      : sql<PushSubscriptionRow>`
          SELECT endpoint, keys_p256dh, keys_auth
          FROM push_subscriptions
        `;

    const subscriptions = (await query).rows;

    if (!subscriptions.length) {
      return NextResponse.json({ success: true, sent: 0, failed: 0 });
    }

    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      url: body.url || '/',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
    });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          sent += 1;
        } catch (error) {
          failed += 1;
          const statusCode = (error as { statusCode?: number }).statusCode;

          if (statusCode === 404 || statusCode === 410) {
            await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
          }
        }
      })
    );

    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    console.error('POST /api/push/send error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
