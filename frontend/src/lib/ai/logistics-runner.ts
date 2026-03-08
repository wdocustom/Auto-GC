import { prisma } from '@/lib/prisma';
import { planLogistics } from './logistics';
import type { LogisticsPlan } from './logistics';

/**
 * Loads the full project DAG, runs the logistics AI agent, and applies
 * the resulting schedule updates and dispatch actions to the database.
 *
 * Returns the logistics plan for inclusion in API responses.
 */
export async function runLogisticsAgent(
  projectId: string,
  triggerMilestoneId: string,
  triggerEvent: 'VERIFIED' | 'DELAYED',
): Promise<LogisticsPlan> {
  // 1. Load the full project DAG
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      milestones: {
        include: {
          dependsOn: true,
          prerequisiteFor: true,
        },
      },
      subcontractors: true,
    },
  });

  // 2. Run the Logistics Orchestrator AI
  const plan = await planLogistics({
    projectName: project.name,
    triggerMilestoneId,
    triggerEvent,
    milestones: project.milestones,
    subcontractors: project.subcontractors,
  });

  // 3. Apply schedule updates to the database
  for (const update of plan.scheduleUpdates) {
    await prisma.milestone.update({
      where: { id: update.milestoneId },
      data: {
        scheduledStart: new Date(update.newScheduledStart),
        scheduledEnd: new Date(update.newScheduledEnd),
      },
    });
  }

  // 4. Execute dispatch actions
  for (const action of plan.dispatchActions) {
    const sub = project.subcontractors.find(s => s.id === action.subcontractorId);

    // Log outbound communication
    await prisma.communication.create({
      data: {
        projectId,
        senderPhone: project.dedicatedPhone,
        rawMessage: action.messagePayload,
        direction: 'OUTBOUND',
        aiInterpretation: {
          agent: 'LOGISTICS_BOT',
          actionType: action.actionType,
          targetSub: sub?.name ?? action.subcontractorId,
        },
        wasActioned: true,
      },
    });

    // TODO: Send via Twilio
    console.log(
      `[Logistics] ${action.actionType} → ${sub?.name ?? 'Unknown'} (${sub?.phoneNumber ?? '?'}): ${action.messagePayload}`,
    );
  }

  // 5. Update overall project status if shifted
  if (plan.projectStatus === 'DELAYED' || plan.projectStatus === 'AHEAD_OF_SCHEDULE') {
    console.log(
      `[Logistics] Project "${project.name}" is now ${plan.projectStatus} by ${plan.daysShifted} day(s)`,
    );
  }

  return plan;
}
