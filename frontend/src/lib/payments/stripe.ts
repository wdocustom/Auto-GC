import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

/**
 * Creates a Stripe PaymentIntent to charge the homeowner for a milestone draw.
 *
 * @param amount - Amount in cents (e.g., 500000 = $5,000.00)
 * @param customerId - The client's Stripe Customer ID
 * @param projectId - For metadata tracking
 * @param milestoneId - Ties the charge to specific verified work
 * @returns The PaymentIntent object
 */
export async function createDrawInvoice(
  amount: number,
  customerId: string,
  projectId: string,
  milestoneId: string,
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    customer: customerId,
    metadata: {
      projectId,
      milestoneId,
      type: 'CLIENT_DRAW_INVOICE',
    },
  });
}

/**
 * Transfers funds to a subcontractor's Stripe Connect account.
 *
 * @param amount - Amount in cents
 * @param connectedAccountId - The sub's Stripe Connect account ID
 * @param projectId - For metadata tracking
 * @param milestoneId - Ties the payout to specific verified work
 * @returns The Transfer object
 */
export async function payoutSubcontractor(
  amount: number,
  connectedAccountId: string,
  projectId: string,
  milestoneId: string,
): Promise<Stripe.Transfer> {
  return stripe.transfers.create({
    amount,
    currency: 'usd',
    destination: connectedAccountId,
    metadata: {
      projectId,
      milestoneId,
      type: 'SUB_PAYOUT',
    },
  });
}

/**
 * Creates a Stripe Connect onboarding link for a subcontractor.
 *
 * @param accountId - The sub's Stripe Connect account ID
 * @param returnUrl - Where to redirect after onboarding
 * @returns The Account Link URL
 */
export async function createSubOnboardingLink(
  accountId: string,
  returnUrl: string,
): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return link.url;
}

/**
 * Creates a new Stripe Connect Express account for a subcontractor.
 *
 * @param email - The sub's email address
 * @param businessName - The sub's business name
 * @returns The new Account object
 */
export async function createConnectAccount(
  email: string,
  businessName: string,
): Promise<Stripe.Account> {
  return stripe.accounts.create({
    type: 'express',
    email,
    business_type: 'individual',
    metadata: { businessName },
  });
}

/**
 * Creates and sends a Stripe Invoice for a client draw.
 * Uses the Invoices API with `send_invoice` collection method
 * so the client receives an email and can pay online.
 *
 * @param amountCents - Amount in cents
 * @param customerId - The client's Stripe Customer ID
 * @param description - Line item description (e.g., "Draw 2: Framing phase")
 * @param projectId - For metadata tracking
 * @param milestoneId - Ties the invoice to verified work
 * @returns The finalized and sent Invoice object
 */
export async function createAndSendInvoice(
  amountCents: number,
  customerId: string,
  description: string,
  projectId: string,
  milestoneId: string,
): Promise<Stripe.Invoice> {
  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: 'send_invoice',
    days_until_due: 3,
    metadata: {
      projectId,
      milestoneId,
      type: 'CLIENT_DRAW_INVOICE',
    },
  });

  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: amountCents,
    currency: 'usd',
    description,
  });

  const finalizedInvoice = await stripe.invoices.sendInvoice(invoice.id);
  return finalizedInvoice;
}
