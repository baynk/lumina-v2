import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getOrCreateUser, initDB } from '@/lib/db';
import { stripe } from '@/lib/stripe';

type CheckoutType = 'subscription' | 'consultation_written' | 'consultation_video' | 'consultation_deep';

const CONSULTATION_PRICES: Record<Exclude<CheckoutType, 'subscription'>, number> = {
  consultation_written: 2500,
  consultation_video: 3500,
  consultation_deep: 5500,
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

async function getOrCreateStripeCustomer(userId: string, email: string) {
  const existing = await sql<{ stripe_customer_id: string | null }>`
    SELECT stripe_customer_id
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  const existingCustomerId = existing.rows[0]?.stripe_customer_id;
  if (existingCustomerId) return existingCustomerId;

  const customer = await stripe.customers.create({
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

    if (!type || !(type in { subscription: true, consultation_written: true, consultation_video: true, consultation_deep: true })) {
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

      checkoutSession = await stripe.checkout.sessions.create({
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
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              unit_amount: CONSULTATION_PRICES[type],
              product_data: {
                name:
                  type === 'consultation_written'
                    ? 'Written Consultation'
                    : type === 'consultation_video'
                      ? 'Video Consultation 40 min'
                      : 'Deep Dive Consultation 60 min',
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${siteBaseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
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
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
