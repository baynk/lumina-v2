import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

function toSubscriptionStatus(status?: string | null): 'free' | 'active' | 'past_due' | 'canceled' {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'past_due';
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled';
  return 'free';
}

async function ensureSchema() {
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

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    await ensureSchema();

    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const userId = checkoutSession.metadata?.user_id || null;
        const checkoutType = checkoutSession.metadata?.checkout_type || null;
        const customerId = typeof checkoutSession.customer === 'string' ? checkoutSession.customer : null;

        if (userId && customerId) {
          await sql`
            UPDATE users
            SET stripe_customer_id = ${customerId}, updated_at = now()
            WHERE id = ${userId}
          `;
        }

        if (checkoutType === 'subscription') {
          const subscriptionId = typeof checkoutSession.subscription === 'string' ? checkoutSession.subscription : null;

          if (userId) {
            await sql`
              UPDATE users
              SET
                subscription_status = 'active',
                subscription_id = ${subscriptionId},
                updated_at = now()
              WHERE id = ${userId}
            `;
          }
        }

        if (userId && checkoutType) {
          await sql`
            INSERT INTO payments (user_id, stripe_payment_id, amount, currency, type, status)
            VALUES (
              ${userId},
              ${checkoutSession.payment_intent?.toString() || checkoutSession.id},
              ${checkoutSession.amount_total || 0},
              ${checkoutSession.currency || 'eur'},
              ${checkoutType},
              'paid'
            )
          `;
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;
        if (!customerId) break;

        await sql`
          UPDATE users
          SET
            subscription_status = ${toSubscriptionStatus(subscription.status)},
            subscription_id = ${subscription.id},
            subscription_end = to_timestamp(${subscription.items.data[0]?.current_period_end ?? 0}),
            updated_at = now()
          WHERE stripe_customer_id = ${customerId}
        `;
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;
        if (!customerId) break;

        await sql`
          UPDATE users
          SET
            subscription_status = 'canceled',
            subscription_id = ${subscription.id},
            subscription_end = to_timestamp(${subscription.items.data[0]?.current_period_end ?? 0}),
            updated_at = now()
          WHERE stripe_customer_id = ${customerId}
        `;
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
        if (!customerId) break;

        await sql`
          UPDATE users
          SET
            subscription_status = 'past_due',
            updated_at = now()
          WHERE stripe_customer_id = ${customerId}
        `;
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('POST /api/payments/webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
