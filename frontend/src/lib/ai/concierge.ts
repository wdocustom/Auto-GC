import type { Milestone, SiteMedia, ProjectSub } from '@prisma/client';

export interface ConciergeContext {
  projectName: string;
  projectAddress: string;
  progressPercent: number;
  /** Recently verified milestones to highlight. */
  recentMilestones: (Milestone & { assignedSubId: string | null })[];
  /** Upcoming milestones the client should know about. */
  upcomingMilestones: Milestone[];
  /** Recent site photos with vision analysis. */
  recentMedia: SiteMedia[];
  /** Sub roster for name resolution. */
  subcontractors: ProjectSub[];
  /** Whether a milestone payment is due. */
  hasMilestonePayment: boolean;
}

export interface ClientUpdateDraft {
  title: string;
  executiveSummary: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'ALERT';
  curatedPhotoUrls: string[];
  isMilestonePayment: boolean;
}

/**
 * Builds the system prompt for the Client Concierge AI.
 */
function buildConciergePrompt(ctx: ConciergeContext): string {
  const recentWork = ctx.recentMilestones.map(m => {
    const sub = ctx.subcontractors.find(s => s.id === m.assignedSubId);
    return `  - "${m.title}" — ${m.status}${m.actualEnd ? ` (completed ${m.actualEnd.toISOString().split('T')[0]})` : ''}${sub ? ` by ${sub.name} (${sub.trade})` : ''}`;
  }).join('\n');

  const upcoming = ctx.upcomingMilestones.map(m =>
    `  - "${m.title}" — starts ${m.scheduledStart.toISOString().split('T')[0]}`,
  ).join('\n');

  const photos = ctx.recentMedia.map(m =>
    `  - ${m.url}${m.visionAnalysis ? ` | AI notes: ${m.visionAnalysis.slice(0, 120)}` : ''}`,
  ).join('\n');

  return `### SYSTEM INSTRUCTIONS FOR CLIENT CONCIERGE AI
You are the Client Communication Concierge for an autonomous General Contracting platform.
Your role is to craft polished, professional project updates for homeowner clients.

**Project:** "${ctx.projectName}"
**Address:** ${ctx.projectAddress}
**Overall Progress:** ${ctx.progressPercent}%
${ctx.hasMilestonePayment ? '**NOTE:** A milestone payment is due with this update.\n' : ''}
**Recently Completed Work:**
${recentWork || '  (none)'}

**Upcoming Work:**
${upcoming || '  (none)'}

**Recent Site Photos:**
${photos || '  (none)'}

**Your Task:**
Craft a white-glove client update that:
1. Summarizes recent progress in plain language (no construction jargon).
2. Sets expectations for what's coming next.
3. Selects the best 1-3 photos that visually demonstrate progress (only include URLs from the list above).
4. Sets the appropriate sentiment tone.

**Output Format (Strict JSON):**
{
  "title": "Short, engaging headline (e.g., 'Framing Complete & Plumbing Begins')",
  "executiveSummary": "2-4 paragraph professional update. Warm, confident tone. No jargon. Include timeline context.",
  "sentiment": "POSITIVE | NEUTRAL | ALERT",
  "curatedPhotoUrls": ["url1", "url2"],
  "isMilestonePayment": true | false
}

**Rules:**
- Use POSITIVE when the project is on track or ahead of schedule.
- Use NEUTRAL for routine updates with no notable changes.
- Use ALERT only when there are delays, cost changes, or issues the client must know about.
- The executiveSummary should read like a premium concierge service — warm but professional.
- Never expose internal system details, sub ratings, or AI decision logs to the client.
- Only include photo URLs from the provided list. Never fabricate URLs.
- Set isMilestonePayment to ${ctx.hasMilestonePayment}.
- Respond ONLY with valid JSON. No markdown, no explanation.`;
}

/**
 * Generates a curated client update from recent project activity.
 *
 * Replace the placeholder implementation below with your preferred AI provider.
 */
export async function generateClientUpdate(ctx: ConciergeContext): Promise<ClientUpdateDraft> {
  const systemPrompt = buildConciergePrompt(ctx);
  const userPrompt = 'Generate the client update for the recent project activity described above.';

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
  // return JSON.parse(response.content[0].text) as ClientUpdateDraft;

  console.log('[Concierge] System prompt length:', systemPrompt.length);
  console.log('[Concierge] User prompt:', userPrompt);

  // Fallback stub
  const photoUrls = ctx.recentMedia.slice(0, 2).map(m => m.url);
  return {
    title: 'Project Update',
    executiveSummary: `Your project at ${ctx.projectAddress} is currently at ${ctx.progressPercent}% completion. Our team continues to make steady progress and we will keep you informed of upcoming milestones.`,
    sentiment: 'NEUTRAL',
    curatedPhotoUrls: photoUrls,
    isMilestonePayment: ctx.hasMilestonePayment,
  };
}
