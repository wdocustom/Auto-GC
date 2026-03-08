import type { Milestone, ProjectSub } from '@prisma/client';

export interface LogisticsContext {
  projectName: string;
  triggerMilestoneId: string;
  triggerEvent: 'VERIFIED' | 'DELAYED';
  /** All milestones in the project with their dependency edges. */
  milestones: (Milestone & {
    dependsOn: Milestone[];
    prerequisiteFor: Milestone[];
  })[];
  /** All subcontractors on the project. */
  subcontractors: ProjectSub[];
}

/** Simplified context used by the engine-style caller. */
export interface LogisticsGraphContext {
  projectGraph: (Milestone & {
    dependsOn: Milestone[];
    prerequisiteFor: Milestone[];
  })[];
  triggerId: string;
}

export interface ScheduleUpdate {
  milestoneId: string;
  newScheduledStart: string; // YYYY-MM-DD
  newScheduledEnd: string;   // YYYY-MM-DD
}

export interface DispatchAction {
  subcontractorId: string;
  actionType: 'DISPATCH_NOTICE' | 'DELAY_WARNING' | 'MATERIAL_ORDER';
  messagePayload: string;
}

export interface LogisticsPlan {
  projectStatus: 'ON_TRACK' | 'DELAYED' | 'AHEAD_OF_SCHEDULE';
  daysShifted: number;
  scheduleUpdates: ScheduleUpdate[];
  dispatchActions: DispatchAction[];
}

/**
 * Builds the system prompt for the Logistics Orchestrator AI.
 */
function buildLogisticsPrompt(ctx: LogisticsContext): string {
  const milestoneGraph = ctx.milestones.map(m => {
    const deps = m.dependsOn.map(d => d.id).join(', ') || '(none)';
    const unlocks = m.prerequisiteFor.map(d => d.id).join(', ') || '(none)';
    const sub = ctx.subcontractors.find(s => s.id === m.assignedSubId);
    const subLabel = sub ? `${sub.name} (${sub.trade})` : 'Unassigned';

    return `  - [${m.id}] "${m.title}" | Status: ${m.status} | Scheduled: ${m.scheduledStart.toISOString().split('T')[0]} → ${m.scheduledEnd.toISOString().split('T')[0]}${m.actualEnd ? ` | Completed: ${m.actualEnd.toISOString().split('T')[0]}` : ''} | Lead: ${m.leadTimeDays}d | Sub: ${subLabel} | DependsOn: [${deps}] | Unlocks: [${unlocks}]`;
  }).join('\n');

  const subRoster = ctx.subcontractors
    .map(s => `  - [${s.id}] ${s.name} — ${s.trade} (${s.phoneNumber})`)
    .join('\n');

  return `### SYSTEM INSTRUCTIONS FOR LOGISTICS ORCHESTRATOR AI
You are the Master Scheduler and Logistics Engine for an autonomous General Contracting platform.

**Project:** "${ctx.projectName}"

**Trigger:** Milestone [${ctx.triggerMilestoneId}] has just been marked "${ctx.triggerEvent}".

**Full Milestone DAG:**
${milestoneGraph}

**Subcontractor Roster:**
${subRoster || '  (none)'}

**Your Task:**
1. Analyze the project's Directed Acyclic Graph (DAG) of milestones.
2. Identify all immediately subsequent milestones that are unblocked.
3. Recalculate the 'scheduledStart' and 'scheduledEnd' dates for all future downstream milestones if the current milestone finished early or late.
4. Output a strict JSON object of actions for the system to execute.

**Output Format (Strict JSON):**
{
  "projectStatus": "ON_TRACK | DELAYED | AHEAD_OF_SCHEDULE",
  "daysShifted": 0,
  "scheduleUpdates": [
    {
      "milestoneId": "uuid",
      "newScheduledStart": "YYYY-MM-DD",
      "newScheduledEnd": "YYYY-MM-DD"
    }
  ],
  "dispatchActions": [
    {
      "subcontractorId": "uuid",
      "actionType": "DISPATCH_NOTICE | DELAY_WARNING | MATERIAL_ORDER",
      "messagePayload": "The exact professional text message to send to the sub or supplier."
    }
  ]
}

**Rules:**
- For VERIFIED triggers: if the milestone finished early, shift downstream dates earlier. If on time, issue DISPATCH_NOTICE to unblocked subs accounting for their leadTimeDays.
- For DELAYED triggers: propagate the delay through all downstream milestones. Issue DELAY_WARNING to affected subs.
- Only include milestones in scheduleUpdates that actually need date changes.
- Only include dispatchActions for subs who need to be notified NOW.
- messagePayload must be professional, specific, and under 300 characters.
- Respond ONLY with valid JSON. No markdown, no explanation.`;
}

/**
 * Analyzes a milestone state change and produces a logistics plan
 * with schedule updates and dispatch actions.
 *
 * Replace the placeholder implementation below with your preferred AI provider.
 */
export async function planLogistics(ctx: LogisticsContext): Promise<LogisticsPlan> {
  const systemPrompt = buildLogisticsPrompt(ctx);
  const userPrompt = `Milestone [${ctx.triggerMilestoneId}] has been ${ctx.triggerEvent}. Analyze the DAG and produce the logistics plan.`;

  // ----- Placeholder: replace with your actual LLM call -----
  // Example using the Anthropic SDK:
  //
  // import Anthropic from '@anthropic-ai/sdk';
  // const anthropic = new Anthropic();
  // const response = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-20250514',
  //   max_tokens: 2048,
  //   system: systemPrompt,
  //   messages: [{ role: 'user', content: userPrompt }],
  // });
  // return JSON.parse(response.content[0].text) as LogisticsPlan;

  console.log('[Logistics] System prompt length:', systemPrompt.length);
  console.log('[Logistics] User prompt:', userPrompt);

  // Fallback stub — returns no-op plan until an LLM is wired up
  return {
    projectStatus: 'ON_TRACK',
    daysShifted: 0,
    scheduleUpdates: [],
    dispatchActions: [],
  };
}

/**
 * Simplified entry point that infers the trigger event from milestone status.
 * Used by the engine-style runner (runLogisticsEngine).
 */
export async function calculateLogisticsGraph(
  ctx: LogisticsGraphContext,
): Promise<LogisticsPlan> {
  const trigger = ctx.projectGraph.find(m => m.id === ctx.triggerId);
  const triggerEvent: 'VERIFIED' | 'DELAYED' =
    trigger?.status === 'VERIFIED' ? 'VERIFIED' : 'DELAYED';

  return planLogistics({
    projectName: '', // Filled in by the runner which has project context
    triggerMilestoneId: ctx.triggerId,
    triggerEvent,
    milestones: ctx.projectGraph,
    subcontractors: [],
  });
}
