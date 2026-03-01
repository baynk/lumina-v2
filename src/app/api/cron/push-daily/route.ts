import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import webpush from 'web-push';
import { calculateDailyCelestialData } from '@/services/astronomyCalculator';
import { translateMoonPhase } from '@/lib/translations';

type PushSubscriptionRow = {
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  user_id: string | null;
};

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error('Missing VAPID keys');
  webpush.setVapidDetails('mailto:luminastrology@gmail.com', publicKey, privateKey);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    configureVapid();

    const daily = calculateDailyCelestialData();
    const moonPhase = translateMoonPhase(daily.moon.phase, 'en');

    // Build a contextual morning notification
    const bodies = [
      `${moonPhase} — your daily reading is ready ✦`,
      `The stars have something to tell you today ✦`,
      `Your personalized cosmic guidance awaits ✦`,
      `New day, new transits — see what's in store ✦`,
    ];
    const body = bodies[new Date().getDay() % bodies.length];

    const payload = JSON.stringify({
      title: 'Lumina ✦',
      body,
      url: '/',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
    });

    const { rows: subscriptions } = await sql<PushSubscriptionRow>`
      SELECT endpoint, keys_p256dh, keys_auth, user_id
      FROM push_subscriptions
    `;

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
            payload
          );
          sent++;
        } catch (error) {
          failed++;
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
          }
        }
      })
    );

    return NextResponse.json({ ok: true, sent, failed });
  } catch (error) {
    console.error('Push daily cron error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
