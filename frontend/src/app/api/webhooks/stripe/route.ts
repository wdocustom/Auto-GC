import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/payments/stripe';

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events to update transaction statuses.
 * Configure this URL in Stripe Dashboard → Webhooks.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      await prisma.transaction.updateMany({
        where: { stripeChargeId: paymentIntent.id },
        data: { status: 'PAID' },
      });
      console.log(`[Stripe] Payment succeeded: ${paymentIntent.id}`);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      await prisma.transaction.updateMany({
        where: { stripeChargeId: paymentIntent.id },
        data: { status: 'FAILED' },
      });
      console.log(`[Stripe] Payment failed: ${paymentIntent.id}`);
      break;
    }

    case 'transfer.paid': {
      const transfer = event.data.object;
      await prisma.transaction.updateMany({
        where: { stripeTransferId: transfer.id },
        data: { status: 'PAID' },
      });
      console.log(`[Stripe] Transfer paid: ${transfer.id}`);
      break;
    }

    case 'transfer.failed': {
      const transfer = event.data.object;
      await prisma.transaction.updateMany({
        where: { stripeTransferId: transfer.id },
        data: { status: 'FAILED' },
      });
      console.log(`[Stripe] Transfer failed: ${transfer.id}`);
      break;
    }

    case 'charge.dispute.created': {
      const dispute = event.data.object;
      if (dispute.payment_intent) {
        await prisma.transaction.updateMany({
          where: { stripeChargeId: dispute.payment_intent as string },
          data: { status: 'DISPUTED' },
        });
        console.log(`[Stripe] Dispute opened: ${dispute.id}`);
      }
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
