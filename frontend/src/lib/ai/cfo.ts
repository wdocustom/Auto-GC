import type { Milestone, ProjectSub, Transaction } from '@prisma/client';

export interface CFOContext {
  projectName: string;
  budgetTotal: number;
  progressPercent: number;
  triggerType: 'MILESTONE_VERIFIED' | 'PAYMENT_RECEIVED';
  triggerId: string;
  milestones: Milestone[];
  subcontractors: ProjectSub[];
  transactions: Transaction[];
  /** Whether there are any active disputes on the project. */
  hasActiveDisputes: boolean;
}

export interface ClientAction {
  actionType: 'GENERATE_DRAW_INVOICE' | 'NONE';
  amount: number;
  description: string;
  milestoneId: string;
}

export interface SubPayout {
  subId: string;
  stripeAccountId: string;
  amount: number;
  reason: string;
  action: 'EXECUTE_TRANSFER' | 'HOLD_FUNDS_PENDING_CLIENT_PAYMENT';
}

export interface FinancialPlan {
  projectFinancialHealth: 'GREEN' | 'YELLOW' | 'RED';
  clientActions: ClientAction[];
  subcontractorPayouts: SubPayout[];
}

/**
 * Builds the system prompt for the CFO AI agent.
 */
function buildCFOPrompt(ctx: CFOContext): string {
  const milestoneList = ctx.milestones.map(m => {
    const sub = ctx.subcontractors.find(s => s.id === m.assignedSubId);
    return `  - [${m.id}] "${m.title}" | Status: ${m.status}${m.actualEnd ? ` | Completed: ${m.actualEnd.toISOString().split('T')[0]}` : ''} | Sub: ${sub ? `${sub.name} (${sub.trade})` : 'Unassigned'}`;
  }).join('\n');

  const subRoster = ctx.subcontractors.map(s =>
    `  - [${s.id}] ${s.name} — ${s.trade} | Stripe: ${s.stripeAccountId ?? 'NOT_ONBOARDED'} | Status: ${s.onboardingStatus}`,
  ).join('\n');

  const txSummary = ctx.transactions.map(t =>
    `  - [${t.id}] ${t.type} | $${t.amount} | ${t.status}${t.milestoneId ? ` | Milestone: ${t.milestoneId}` : ''}`,
  ).join('\n');

  const totalPaid = ctx.transactions
    .filter(t => t.type === 'CLIENT_DRAW_INVOICE' && t.status === 'PAID')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalOwedToSubs = ctx.transactions
    .filter(t => t.type === 'SUB_PAYOUT' && t.status === 'PAID')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const clearedBalance = totalPaid - totalOwedToSubs;

  return `### SYSTEM INSTRUCTIONS FOR FINANCIAL ORCHESTRATOR AI
You are the Chief Financial Officer (CFO) AI for an autonomous General Contracting platform.

**Project:** "${ctx.projectName}"
**Total Budget:** $${ctx.budgetTotal.toLocaleString()}
**Progress:** ${ctx.progressPercent}%
**Cleared Balance (Client Payments - Sub Payouts):** $${clearedBalance.toLocaleString()}
**Active Disputes:** ${ctx.hasActiveDisputes ? 'YES — DO NOT authorize new payouts' : 'None'}

**Trigger:** ${ctx.triggerType} [${ctx.triggerId}]

**Milestones:**
${milestoneList || '  (none)'}

**Subcontractor Roster:**
${subRoster || '  (none)'}

**Transaction History:**
${txSummary || '  (none)'}

**Your Task:**
1. Analyze the financial state of the project.
2. If a major phase is complete (e.g., "Rough-in Complete"), determine if it's time to issue a Draw Invoice to the Client.
3. If a specific subcontractor's work was just VERIFIED by the Vision Agent, check if the GC holds enough cleared funds for this project.
4. If funds are clear, authorize a Stripe Connect Transfer to the subcontractor.
5. Do NOT authorize payouts for unverified work or if there are active quality disputes.

**Output Format (Strict JSON):**
{
  "projectFinancialHealth": "GREEN | YELLOW | RED",
  "clientActions": [
    {
      "actionType": "GENERATE_DRAW_INVOICE | NONE",
      "amount": 15000.00,
      "description": "Draw 2: Framing & Rough-in phase completion",
      "milestoneId": "uuid"
    }
  ],
  "subcontractorPayouts": [
    {
      "subId": "uuid",
      "stripeAccountId": "acct_12345",
      "amount": 4500.00,
      "reason": "Verified completion of HVAC rough-in",
      "action": "EXECUTE_TRANSFER | HOLD_FUNDS_PENDING_CLIENT_PAYMENT"
    }
  ]
}

**Rules:**
- Set projectFinancialHealth to GREEN if cleared balance covers pending payouts.
- Set to YELLOW if balance is tight (< 10% of budget remaining).
- Set to RED if there are active disputes, failed payments, or negative balance.
- Only include clientActions with actionType GENERATE_DRAW_INVOICE if a meaningful phase just completed.
- Only include subcontractorPayouts for subs whose milestone is VERIFIED, who have an ACTIVE stripeAccountId, and where no disputes are active.
- Use HOLD_FUNDS_PENDING_CLIENT_PAYMENT if the cleared balance doesn't cover the payout.
- Amounts are in dollars (not cents).
- Respond ONLY with valid JSON. No markdown, no explanation.`;
}

/**
 * Analyzes the financial state of a project and produces invoicing
 * and payout recommendations.
 *
 * Replace the placeholder implementation below with your preferred AI provider.
 */
export async function analyzeProjectFinancials(ctx: CFOContext): Promise<FinancialPlan> {
  const systemPrompt = buildCFOPrompt(ctx);
  const userPrompt = `${ctx.triggerType} triggered for [${ctx.triggerId}]. Analyze the project financials and produce the plan.`;

  // ----- Placeholder: replace with your actual LLM call -----
  // Example using the Anthropic SDK:
  //
  // import Anthropic from '@anthropic-ai/sdk';
  // const anthropic = new Anthropic();
  // const response = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-20250514',
  //   max_tokens: 1024,
  //   system: systemPrompt,
  //   messages: [{ role: 'user', content: userPrompt }],
  // });
  // return JSON.parse(response.content[0].text) as FinancialPlan;

  console.log('[CFO] System prompt length:', systemPrompt.length);
  console.log('[CFO] User prompt:', userPrompt);

  // Fallback stub — conservative: no actions until LLM is wired up
  return {
    projectFinancialHealth: ctx.hasActiveDisputes ? 'RED' : 'GREEN',
    clientActions: [],
    subcontractorPayouts: [],
  };
}

/** Alias used by processFinancialState runner. */
export const runFinancialAnalysis = analyzeProjectFinancials;
