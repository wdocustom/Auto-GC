import type { Project, Milestone } from '@prisma/client';

export interface MessageContext {
  projectState: Project & { milestones: Milestone[]; subcontractors: { id: string; name: string; trade: string; phoneNumber: string }[] };
  sender: string;
  message: string;
}

export interface AIDecision {
  intent: string;
  confidence: number;
  summary: string;
  requiresAction: boolean;
  actionType?: 'UPDATE_MILESTONE' | 'FLAG_ISSUE' | 'SCHEDULE_CHANGE' | 'INFO_ONLY';
  milestoneId?: string;
  newStatus?: string;
  replyText?: string;
}

/**
 * Sends the project context and inbound message to the LLM to determine intent
 * and recommended actions.
 *
 * Replace the placeholder implementation with your preferred AI provider
 * (e.g., Anthropic SDK, Vercel AI SDK, OpenAI, etc.).
 */
export async function analyzeMessageIntent(ctx: MessageContext): Promise<AIDecision> {
  const activeMilestones = ctx.projectState.milestones
    .filter(m => m.status !== 'VERIFIED')
    .map(m => `- [${m.id}] "${m.title}" (${m.status})`)
    .join('\n');

  const systemPrompt = `You are an AI construction project manager for "${ctx.projectState.name}" at ${ctx.projectState.address}.

Current active milestones:
${activeMilestones || '(none)'}

Analyze the incoming message and respond with a JSON object containing:
- intent: short label (e.g. "milestone_update", "schedule_delay", "material_issue", "question", "confirmation")
- confidence: 0-1 score
- summary: one-sentence plain-english summary
- requiresAction: boolean
- actionType: one of "UPDATE_MILESTONE", "FLAG_ISSUE", "SCHEDULE_CHANGE", "INFO_ONLY" (or omit)
- milestoneId: the matching milestone ID if applicable (or omit)
- newStatus: new milestone status if applicable (or omit)
- replyText: a short auto-reply to send back to the sender (or omit)

Respond ONLY with valid JSON.`;

  const userPrompt = `Message from ${ctx.sender}:\n"${ctx.message}"`;

  // ----- Placeholder: replace with your actual LLM call -----
  // Example using the Anthropic SDK:
  //
  // import Anthropic from '@anthropic-ai/sdk';
  // const anthropic = new Anthropic();
  // const response = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-20250514',
  //   max_tokens: 512,
  //   system: systemPrompt,
  //   messages: [{ role: 'user', content: userPrompt }],
  // });
  // return JSON.parse(response.content[0].text) as AIDecision;

  console.log('[Orchestrator] System prompt:', systemPrompt);
  console.log('[Orchestrator] User prompt:', userPrompt);

  // Fallback stub — returns a safe default until an LLM provider is wired up
  return {
    intent: 'unknown',
    confidence: 0,
    summary: `Received message from ${ctx.sender}: "${ctx.message}"`,
    requiresAction: false,
    actionType: 'INFO_ONLY',
    replyText: undefined,
  };
}
