import type { Milestone, SiteMedia, Communication, ProjectSub } from '@prisma/client';

export interface ConciergeContext {
  projectName: string;
  projectAddress: string;
  progressPercent: number;
  /** Recently verified milestones to highlight. */
  recentMilestones: (Milestone & { assignedSubId: string | null })[];
  /** Upcoming milestones the client should know about. */
  upcomingMilestones: Milestone[];
  /** Recent site photos with vision analysis and quality context. */
  recentMedia: SiteMedia[];
  /** Recent event log (communications, agent actions) from the last 48h. */
  recentEvents: Communication[];
  /** Sub roster for name resolution. */
  subcontractors: ProjectSub[];
  /** Whether a milestone payment is due. */
  hasMilestonePayment: boolean;
}

export interface ClientUpdateDraft {
  title: string;
  executiveSummary: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'ALERT';
  curatedPhotoIds: string[];
  financialTrigger: 'NONE' | 'INVOICE_READY';
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

  const eventLog = ctx.recentEvents.map(e => {
    const interpretation = e.aiInterpretation as Record<string, unknown> | null;
    const agent = interpretation?.agent ?? (e.direction === 'INBOUND' ? 'SUB_SMS' : 'SYSTEM');
    const intent = interpretation?.actionType ?? interpretation?.intent ?? '';
    return `  - [${agent}] ${e.direction}: "${e.rawMessage.slice(0, 100)}"${intent ? ` → ${intent}` : ''}`;
  }).join('\n');

  const photos = ctx.recentMedia.map(m => {
    const analysis = m.visionAnalysis ?? '';
    const isSafe = !analysis.toLowerCase().includes('messy')
      && !analysis.toLowerCase().includes('safety hazard')
      && !analysis.toLowerCase().includes('reject');
    return `  - [${m.id}] ${m.url} | Quality: ${isSafe ? 'GOOD' : 'EXCLUDED'} | AI notes: ${analysis.slice(0, 120)}`;
  }).join('\n');

  return `### SYSTEM INSTRUCTIONS FOR CLIENT CONCIERGE AI
You are the Executive Client Success Director for a high-end General Contracting firm.
Your job is to translate raw, technical construction data into beautiful, reassuring, and professional updates for the homeowner/investor.

**Project:** "${ctx.projectName}"
**Address:** ${ctx.projectAddress}
**Overall Progress:** ${ctx.progressPercent}%
${ctx.hasMilestonePayment ? '**NOTE:** A milestone payment is due — set financialTrigger to INVOICE_READY.\n' : ''}
**Context Provided to You:**

1. **Events of the last 24-48 hours:**
${eventLog || '  (no recent events)'}

2. **Recently Completed Milestones:**
${recentWork || '  (none)'}

3. **Upcoming Work:**
${upcoming || '  (none)'}

4. **Available Site Photos (with AI quality scores):**
${photos || '  (none)'}

**Your Rules of Engagement:**
- **Shield the Client:** Never expose internal subcontractor drama, minor material shortages, or standard logistical friction.
- **Spin Delays Professionally:** If the schedule shifted by a day due to weather or material, frame it as a commitment to quality (e.g., "We are holding off on pouring the driveway to ensure optimal curing conditions").
- **Celebrate Milestones:** Be enthusiastic when a major phase (like Framing or Drywall) is verified.
- **Curate Media:** Select only 1-3 of the highest-rated photos. Avoid photos labeled "EXCLUDED", "messy", or "safety hazard". Use the photo IDs from the list above.

**Output Format (Strict JSON):**
{
  "title": "A punchy, exciting title for the dashboard",
  "executiveSummary": "A 2-3 paragraph update written directly to the client. Tone: Professional, warm, and highly competent.",
  "sentiment": "POSITIVE | NEUTRAL | ALERT",
  "curatedPhotoIds": ["uuid-1", "uuid-2"],
  "financialTrigger": "NONE | INVOICE_READY"
}

**Rules:**
- Use POSITIVE when the project is on track, ahead of schedule, or a major milestone was celebrated.
- Use NEUTRAL for routine updates with no notable changes.
- Use ALERT only for significant delays, cost changes, or issues the client genuinely needs to know about.
- The executiveSummary should read like a premium concierge service — warm, confident, and reassuring.
- Never expose internal system details, sub ratings, AI decision logs, or agent names to the client.
- Only include photo IDs from the provided list. Never fabricate IDs.
- Set financialTrigger to INVOICE_READY if a milestone payment is due, otherwise NONE.
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

  // Fallback stub — curate safe photos only
  const safePhotos = ctx.recentMedia.filter(m => {
    const analysis = (m.visionAnalysis ?? '').toLowerCase();
    return !analysis.includes('messy')
      && !analysis.includes('safety hazard')
      && !analysis.includes('reject');
  });

  return {
    title: 'Project Update',
    executiveSummary: `Your project at ${ctx.projectAddress} is currently at ${ctx.progressPercent}% completion. Our team continues to make steady progress and we will keep you informed of upcoming milestones.`,
    sentiment: 'NEUTRAL',
    curatedPhotoIds: safePhotos.slice(0, 2).map(m => m.id),
    financialTrigger: ctx.hasMilestonePayment ? 'INVOICE_READY' : 'NONE',
  };
}
