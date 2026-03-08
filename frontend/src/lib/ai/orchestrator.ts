import type { Project, Milestone } from '@prisma/client';

export interface MessageContext {
  projectState: Project & { milestones: Milestone[]; subcontractors: { id: string; name: string; trade: string; phoneNumber: string }[] };
  sender: string;
  message: string;
}

export interface AIDecision {
  intent: 'STATUS_UPDATE' | 'MATERIAL_REQUEST' | 'BLOCKER' | 'GENERAL';
  summary: string;
  requiresAction: boolean;
  actionType: 'UPDATE_MILESTONE' | 'ALERT_PM' | 'NO_ACTION';
  milestoneId?: string;
  newStatus?: 'VERIFIED' | 'PENDING' | 'IN_PROGRESS';
  replyText: string;
}

/**
 * Builds the system prompt that instructs the LLM how to classify inbound
 * subcontractor SMS messages and decide on autonomous actions.
 */
function buildSystemPrompt(ctx: MessageContext): string {
  const activeMilestones = ctx.projectState.milestones
    .filter(m => m.status !== 'VERIFIED')
    .map(m => `  - [${m.id}] "${m.title}" (${m.status})`)
    .join('\n');

  const subs = ctx.projectState.subcontractors
    .map(s => `  - ${s.name} — ${s.trade} (${s.phoneNumber})`)
    .join('\n');

  return `### SYSTEM INSTRUCTIONS FOR INBOUND COMM AGENT
You are the Orchestrator AI for a General Contracting platform.
You are receiving an SMS from a subcontractor.

**Project:** "${ctx.projectState.name}"
**Address:** ${ctx.projectState.address}
**Status:** ${ctx.projectState.status}
**Progress:** ${ctx.projectState.progressPercent}%

**Active Milestones:**
${activeMilestones || '  (none)'}

**Known Subcontractors:**
${subs || '  (none)'}

Your job is to read the raw text, understand the context of the active project, and output a JSON response dictating what the system should do next.

**Analyze for three main intents:**
1. STATUS_UPDATE: The sub is reporting progress (e.g., "Framing is done").
2. MATERIAL_REQUEST: The sub needs supplies (e.g., "Short 4 sheets of drywall").
3. BLOCKER: The sub cannot work (e.g., "Electrician isn't done, I can't mud").

If none of the above fit, use GENERAL.

**Output Format (Strict JSON):**
{
  "intent": "STATUS_UPDATE | MATERIAL_REQUEST | BLOCKER | GENERAL",
  "summary": "Short 1 sentence summary of what they said",
  "requiresAction": true | false,
  "actionType": "UPDATE_MILESTONE | ALERT_PM | NO_ACTION",
  "milestoneId": "uuid-if-applicable",
  "newStatus": "VERIFIED | PENDING | IN_PROGRESS",
  "replyText": "Professional, brief acknowledgment to send back to the sub"
}

**Rules:**
- Match the message to the most relevant milestone by comparing the sub's trade and message content to milestone titles.
- For STATUS_UPDATE where a sub says work is complete, set actionType to UPDATE_MILESTONE, newStatus to VERIFIED, and milestoneId to the matching milestone.
- For MATERIAL_REQUEST or BLOCKER, set actionType to ALERT_PM so the project manager is notified.
- Always include a replyText — keep it professional and under 160 characters.
- Respond ONLY with valid JSON. No markdown, no explanation.`;
}

/**
 * Sends the project context and inbound message to the LLM to determine intent
 * and recommended actions.
 *
 * Replace the placeholder implementation below with your preferred AI provider
 * (e.g., Anthropic SDK, Vercel AI SDK, OpenAI, etc.).
 */
export async function analyzeMessageIntent(ctx: MessageContext): Promise<AIDecision> {
  const systemPrompt = buildSystemPrompt(ctx);
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

  console.log('[Orchestrator] System prompt length:', systemPrompt.length);
  console.log('[Orchestrator] User prompt:', userPrompt);

  // Fallback stub — returns a safe default until an LLM provider is wired up
  return {
    intent: 'GENERAL',
    summary: `Received message from ${ctx.sender}: "${ctx.message}"`,
    requiresAction: false,
    actionType: 'NO_ACTION',
    replyText: 'Thanks for your message. Our team has been notified.',
  };
}
