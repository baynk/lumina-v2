import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getOrCreateUser, initDB } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

type ConsultationCheckoutType = 'consultation_written' | 'consultation_video_40' | 'consultation_video_60';
type CheckoutType = 'subscription' | ConsultationCheckoutType;

const CONSULTATION_SUCCESS_PATHS: Record<ConsultationCheckoutType, string> = {
  consultation_written: '/consultation?type=written&paid=1&session_id={CHECKOUT_SESSION_ID}',
  consultation_video_40: '/consultation?type=video-40&paid=1&session_id={CHECKOUT_SESSION_ID}',
  consultation_video_60: '/consultation?type=video-60&paid=1&session_id={CHECKOUT_SESSION_ID}',
};

let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }

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

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://luminastrology.com';
}

function getConsultationPriceId(type: ConsultationCheckoutType) {
  const priceIdMap: Record<ConsultationCheckoutType, string | undefined> = {
    consultation_written:
      process.env.STRIPE_PRICE_CONSULTATION_WRITTEN || process.env.STRIPE_PRICE_CONSULTATION,
    consultation_video_40: process.env.STRIPE_PRICE_CONSULTATION_VIDEO_40,
    consultation_video_60: process.env.STRIPE_PRICE_CONSULTATION_VIDEO_60,
  };

  const envNameMap: Record<ConsultationCheckoutType, string> = {
    consultation_written: 'STRIPE_PRICE_CONSULTATION_WRITTEN',
    consultation_video_40: 'STRIPE_PRICE_CONSULTATION_VIDEO_40',
    consultation_video_60: 'STRIPE_PRICE_CONSULTATION_VIDEO_60',
  };

  const priceId = priceIdMap[type];
  if (!priceId) {
    throw new Error(`Missing Stripe price configuration: ${envNameMap[type]}`);
  }

  return priceId;
}

async function getOrCreateStripeCustomer(userId: string, email: string) {
  const existing = await sql<{ stripe_customer_id: string | null }>`
    SELECT stripe_customer_id
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  const existingCustomerId = existing.rows[0]?.stripe_customer_id;
  if (existingCustomerId) return existingCustomerId;

  const customer = await getStripe().customers.create({
    email,
    metadata: { userId },
  });

  await sql`
    UPDATE users
    SET stripe_customer_id = ${customer.id}, updated_at = now()
    WHERE id = ${userId}
  `;

  return customer.id;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureDB();

    const userId = (session.user as Record<string, unknown>).id as string;
    await getOrCreateUser(userId, session.user.email, session.user.name || null, session.user.image || null);

    const body = (await request.json()) as { type?: CheckoutType };
    const type = body?.type;

    if (!type || !(type in { subscription: true, consultation_written: true, consultation_video_40: true, consultation_video_60: true })) {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    const customerId = await getOrCreateStripeCustomer(userId, session.user.email);
    const siteBaseUrl = baseUrl();

    let checkoutSession;

    if (type === 'subscription') {
      const subscriptionPriceId = process.env.STRIPE_PRICE_SUBSCRIPTION;
      if (!subscriptionPriceId) {
        return NextResponse.json({ error: 'Subscription price is not configured' }, { status: 500 });
      }

      checkoutSession = await getStripe().checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: subscriptionPriceId, quantity: 1 }],
        success_url: `${siteBaseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteBaseUrl}/consultation`,
        metadata: {
          user_id: userId,
          checkout_type: type,
        },
      });
    } else {
      const consultationPriceId = getConsultationPriceId(type);

      checkoutSession = await getStripe().checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{ price: consultationPriceId, quantity: 1 }],
        success_url: `${siteBaseUrl}${CONSULTATION_SUCCESS_PATHS[type]}`,
        cancel_url: `${siteBaseUrl}/consultation`,
        metadata: {
          user_id: userId,
          checkout_type: type,
        },
      });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('POST /api/payments/create-checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
