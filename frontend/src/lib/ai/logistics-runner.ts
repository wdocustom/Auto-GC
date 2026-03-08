import { prisma } from '@/lib/prisma';
import { calculateLogisticsGraph, planLogistics } from './logistics';
import type { LogisticsPlan } from './logistics';
import { sendSystemSMS } from '@/lib/comms/twilio';

/**
 * Full logistics engine matching the blueprint's runLogisticsEngine pattern.
 *
 * Fetches the entire project graph, passes it to the AI, applies schedule
 * updates, and dispatches SMS notifications via Twilio.
 */
export async function runLogisticsEngine(
  projectId: string,
  triggeredByMilestoneId: string,
): Promise<{ success: true; plan: LogisticsPlan }> {
  try {
    // 1. Fetch the entire project graph (All milestones and dependencies)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: {
          include: { dependsOn: true, prerequisiteFor: true },
        },
        subcontractors: true,
      },
    });

    if (!project) throw new Error('Project not found');

    // 2. Pass the current state to the AI Orchestrator
    const logisticsPlan = await calculateLogisticsGraph({
      projectGraph: project.milestones,
      triggerId: triggeredByMilestoneId,
    });

    // 3. Execute Database Schedule Updates (The Ripple Effect)
    for (const update of logisticsPlan.scheduleUpdates) {
      await prisma.milestone.update({
        where: { id: update.milestoneId },
        data: {
          scheduledStart: new Date(update.newScheduledStart),
          scheduledEnd: new Date(update.newScheduledEnd),
        },
      });
    }

    // 4. Autonomous Dispatch (Texting the Subs)
    for (const action of logisticsPlan.dispatchActions) {
      const sub = project.subcontractors.find(s => s.id === action.subcontractorId);

      if (sub) {
        // Send the actual text via Twilio
        await sendSystemSMS(project.dedicatedPhone, sub.phoneNumber, action.messagePayload);

        // Log it in the Black Box Communication history
        await prisma.communication.create({
          data: {
            projectId: project.id,
            senderPhone: project.dedicatedPhone,
            rawMessage: action.messagePayload,
            direction: 'OUTBOUND',
            aiInterpretation: { intent: action.actionType },
            wasActioned: true,
          },
        });
      }
    }

    return { success: true, plan: logisticsPlan };
  } catch (error) {
    console.error('Logistics Engine Failure:', error);
    // Alert the human GC immediately if the brain fails
    throw error;
  }
}

/**
 * Convenience wrapper used by the verify-photo and milestone-event routes.
 * Accepts an explicit trigger event instead of inferring from milestone status.
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

  // 2. Run the Logistics Orchestrator AI with full context
  const plan = await planLogistics({
    projectName: project.name,
    triggerMilestoneId,
    triggerEvent,
    milestones: project.milestones,
    subcontractors: project.subcontractors,
  });

  // 3. Apply schedule updates
  for (const update of plan.scheduleUpdates) {
    await prisma.milestone.update({
      where: { id: update.milestoneId },
      data: {
        scheduledStart: new Date(update.newScheduledStart),
        scheduledEnd: new Date(update.newScheduledEnd),
      },
    });
  }

  // 4. Dispatch SMS to subs
  for (const action of plan.dispatchActions) {
    const sub = project.subcontractors.find(s => s.id === action.subcontractorId);

    if (sub) {
      await sendSystemSMS(project.dedicatedPhone, sub.phoneNumber, action.messagePayload);

      await prisma.communication.create({
        data: {
          projectId,
          senderPhone: project.dedicatedPhone,
          rawMessage: action.messagePayload,
          direction: 'OUTBOUND',
          aiInterpretation: {
            agent: 'LOGISTICS_BOT',
            actionType: action.actionType,
            targetSub: sub.name,
          },
          wasActioned: true,
        },
      });
    }
  }

  // 5. Log overall project status if shifted
  if (plan.projectStatus === 'DELAYED' || plan.projectStatus === 'AHEAD_OF_SCHEDULE') {
    console.log(
      `[Logistics] Project "${project.name}" is now ${plan.projectStatus} by ${plan.daysShifted} day(s)`,
    );
  }

  return plan;
}
