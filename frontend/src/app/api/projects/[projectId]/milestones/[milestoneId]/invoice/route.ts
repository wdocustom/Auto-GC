import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDrawInvoice, payoutSubcontractor } from '@/lib/payments/stripe';

/**
 * POST /api/projects/:projectId/milestones/:milestoneId/invoice
 *
 * Triggered when a milestone is VERIFIED and has a payment tied to it.
 * Creates a draw invoice for the client and queues a sub payout.
 *
 * Body: { "drawAmount": 500000, "subPayoutAmount": 400000 }
 * (amounts in cents)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> },
) {
  try {
    const { projectId, milestoneId } = await params;
    const body = await req.json();
    const { drawAmount, subPayoutAmount } = body as {
      drawAmount: number;
      subPayoutAmount: number;
    };

    if (!drawAmount || drawAmount <= 0) {
      return NextResponse.json(
        { error: 'drawAmount is required and must be positive (in cents)' },
        { status: 400 },
      );
    }

    // 1. Verify the milestone is VERIFIED
    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    if (milestone.status !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'Milestone must be VERIFIED before invoicing' },
        { status: 400 },
      );
    }

    // 2. Get the project with client and assigned sub
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { clients: true, subcontractors: true },
    });

    const client = project.clients[0];
    if (!client?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Client has no Stripe customer ID configured' },
        { status: 400 },
      );
    }

    // 3. Create the draw invoice (charge the homeowner)
    const paymentIntent = await createDrawInvoice(
      drawAmount,
      client.stripeCustomerId,
      projectId,
      milestoneId,
    );

    await prisma.transaction.create({
      data: {
        projectId,
        milestoneId,
        amount: drawAmount / 100, // Store as dollars
        type: 'CLIENT_DRAW_INVOICE',
        status: 'PROCESSING',
        stripeChargeId: paymentIntent.id,
      },
    });

    // 4. Queue the sub payout (if applicable)
    if (subPayoutAmount && subPayoutAmount > 0 && milestone.assignedSubId) {
      const sub = project.subcontractors.find(s => s.id === milestone.assignedSubId);

      if (sub?.stripeAccountId && sub.onboardingStatus === 'ACTIVE') {
        const transfer = await payoutSubcontractor(
          subPayoutAmount,
          sub.stripeAccountId,
          projectId,
          milestoneId,
        );

        await prisma.transaction.create({
          data: {
            projectId,
            milestoneId,
            amount: subPayoutAmount / 100,
            type: 'SUB_PAYOUT',
            status: 'PROCESSING',
            stripeTransferId: transfer.id,
          },
        });
      }
    }

    // 5. Record GC fee (draw - sub payout)
    const gcFee = drawAmount - (subPayoutAmount ?? 0);
    if (gcFee > 0) {
      await prisma.transaction.create({
        data: {
          projectId,
          milestoneId,
          amount: gcFee / 100,
          type: 'GC_FEE_PROFIT',
          status: 'PENDING',
        },
      });
    }

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Invoice Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
