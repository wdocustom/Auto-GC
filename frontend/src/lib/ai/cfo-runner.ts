import { prisma } from '@/lib/prisma';
import { analyzeProjectFinancials, runFinancialAnalysis } from './cfo';
import {
  createDrawInvoice,
  createAndSendInvoice,
  payoutSubcontractor,
} from '@/lib/payments/stripe';
import { sendSystemSMS } from '@/lib/comms/twilio';
import type { FinancialPlan } from './cfo';

/**
 * Runs the CFO agent: loads the full financial context, gets AI recommendations,
 * and executes Stripe actions (draw invoices + sub payouts).
 */
export async function runFinancialAgent(
  projectId: string,
  triggerType: 'MILESTONE_VERIFIED' | 'PAYMENT_RECEIVED',
  triggerId: string,
): Promise<FinancialPlan> {
  // 1. Load full project financial context
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      milestones: true,
      subcontractors: true,
      transactions: true,
      clients: true,
    },
  });

  const hasActiveDisputes = project.transactions.some(t => t.status === 'DISPUTED');

  // 2. Run the CFO AI
  const plan = await analyzeProjectFinancials({
    projectName: project.name,
    budgetTotal: Number(project.budgetTotal),
    progressPercent: project.progressPercent,
    triggerType,
    triggerId,
    milestones: project.milestones,
    subcontractors: project.subcontractors,
    transactions: project.transactions,
    hasActiveDisputes,
  });

  // 3. Execute client draw invoices
  for (const action of plan.clientActions) {
    if (action.actionType !== 'GENERATE_DRAW_INVOICE') continue;

    const client = project.clients[0];
    if (!client?.stripeCustomerId) {
      console.log(`[CFO] Skipping draw invoice — no Stripe customer ID for client`);
      continue;
    }

    const amountCents = Math.round(action.amount * 100);
    const paymentIntent = await createDrawInvoice(
      amountCents,
      client.stripeCustomerId,
      projectId,
      action.milestoneId,
    );

    await prisma.transaction.create({
      data: {
        projectId,
        milestoneId: action.milestoneId,
        amount: action.amount,
        type: 'CLIENT_DRAW_INVOICE',
        status: 'PROCESSING',
        stripeChargeId: paymentIntent.id,
      },
    });

    console.log(`[CFO] Draw invoice created: $${action.amount} — ${action.description}`);
  }

  // 4. Execute sub payouts
  for (const payout of plan.subcontractorPayouts) {
    if (payout.action !== 'EXECUTE_TRANSFER') {
      console.log(`[CFO] Holding payout for ${payout.subId}: ${payout.reason}`);
      continue;
    }

    if (!payout.stripeAccountId) {
      console.log(`[CFO] Skipping payout — no Stripe account for sub ${payout.subId}`);
      continue;
    }

    const amountCents = Math.round(payout.amount * 100);
    const transfer = await payoutSubcontractor(
      amountCents,
      payout.stripeAccountId,
      projectId,
      triggerId,
    );

    await prisma.transaction.create({
      data: {
        projectId,
        milestoneId: triggerId,
        amount: payout.amount,
        type: 'SUB_PAYOUT',
        status: 'PROCESSING',
        stripeTransferId: transfer.id,
      },
    });

    console.log(`[CFO] Sub payout: $${payout.amount} → ${payout.subId} — ${payout.reason}`);
  }

  // 5. Log financial health
  if (plan.projectFinancialHealth !== 'GREEN') {
    console.log(
      `[CFO] Project "${project.name}" financial health: ${plan.projectFinancialHealth}`,
    );
  }

  return plan;
}

/**
 * Processes the full financial state for a project using Stripe Invoices API
 * for client draws and SMS notifications for sub payouts.
 *
 * This is the preferred entry point for milestone-triggered financial workflows.
 */
export async function processFinancialState(
  projectId: string,
  triggerType: 'MILESTONE_VERIFIED' | 'PAYMENT_RECEIVED',
  triggerId: string,
): Promise<FinancialPlan> {
  // 1. Load full project financial context
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      milestones: true,
      subcontractors: true,
      transactions: true,
      clients: true,
    },
  });

  const hasActiveDisputes = project.transactions.some(t => t.status === 'DISPUTED');

  // 2. Run the CFO AI analysis
  const plan = await runFinancialAnalysis({
    projectName: project.name,
    budgetTotal: Number(project.budgetTotal),
    progressPercent: project.progressPercent,
    triggerType,
    triggerId,
    milestones: project.milestones,
    subcontractors: project.subcontractors,
    transactions: project.transactions,
    hasActiveDisputes,
  });

  // 3. Execute client draw invoices via Stripe Invoices API
  for (const action of plan.clientActions) {
    if (action.actionType !== 'GENERATE_DRAW_INVOICE') continue;

    const client = project.clients[0];
    if (!client?.stripeCustomerId) {
      console.log(`[CFO] Skipping draw invoice — no Stripe customer ID for client`);
      continue;
    }

    const amountCents = Math.round(action.amount * 100);
    const invoice = await createAndSendInvoice(
      amountCents,
      client.stripeCustomerId,
      action.description,
      projectId,
      action.milestoneId,
    );

    await prisma.transaction.create({
      data: {
        projectId,
        milestoneId: action.milestoneId,
        amount: action.amount,
        type: 'CLIENT_DRAW_INVOICE',
        status: 'PROCESSING',
        stripeChargeId: invoice.id,
      },
    });

    console.log(`[CFO] Invoice sent: $${action.amount} — ${action.description}`);
  }

  // 4. Execute sub payouts with SMS notifications
  for (const payout of plan.subcontractorPayouts) {
    if (payout.action !== 'EXECUTE_TRANSFER') {
      console.log(`[CFO] Holding payout for ${payout.subId}: ${payout.reason}`);
      continue;
    }

    if (!payout.stripeAccountId) {
      console.log(`[CFO] Skipping payout — no Stripe account for sub ${payout.subId}`);
      continue;
    }

    const amountCents = Math.round(payout.amount * 100);
    const transfer = await payoutSubcontractor(
      amountCents,
      payout.stripeAccountId,
      projectId,
      triggerId,
    );

    await prisma.transaction.create({
      data: {
        projectId,
        milestoneId: triggerId,
        amount: payout.amount,
        type: 'SUB_PAYOUT',
        status: 'PROCESSING',
        stripeTransferId: transfer.id,
      },
    });

    console.log(`[CFO] Sub payout: $${payout.amount} → ${payout.subId} — ${payout.reason}`);

    // Notify subcontractor via SMS
    const sub = project.subcontractors.find(s => s.id === payout.subId);
    if (sub?.phone && project.dedicatedPhone) {
      const formattedAmount = payout.amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      await sendSystemSMS(
        project.dedicatedPhone,
        sub.phone,
        `Work verified! $${formattedAmount} is on its way to your bank account.`,
      );
      console.log(`[CFO] SMS sent to ${sub.name}: payout notification`);
    }
  }

  // 5. Log financial health
  if (plan.projectFinancialHealth !== 'GREEN') {
    console.log(
      `[CFO] Project "${project.name}" financial health: ${plan.projectFinancialHealth}`,
    );
  }

  return plan;
}
