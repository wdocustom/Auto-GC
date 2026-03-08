import { prisma } from '@/lib/prisma';
import { draftClientUpdate } from './concierge';
import { notifyClient } from '@/lib/comms/notifications';
import type { ClientUpdate } from '@prisma/client';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Gathers the last 7 days of project activity from the "Black Box",
 * passes it to the Client Concierge AI, persists the curated update,
 * and notifies the client via push/email.
 *
 * Matches the blueprint's generateClientSummary pattern.
 */
export async function generateClientSummary(
  projectId: string,
): Promise<{ success: true; update: ClientUpdate }> {
  try {
    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);

    // 1. Gather the "Messy" Context from the Black Box
    const recentActivity = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: {
          where: { actualEnd: { gte: cutoff } },
        },
        communications: {
          where: { createdAt: { gte: cutoff } },
        },
        media: {
          where: { timestamp: { gte: cutoff } },
        },
        subcontractors: true,
        clients: true,
      },
    });

    if (!recentActivity) throw new Error('Project not found');

    // 2. Pass the raw data to the Concierge LLM
    const polishedUpdate = await draftClientUpdate({
      activity: recentActivity,
    });

    // 3. Map the curated photo IDs back to their URLs
    const selectedUrls = recentActivity.media
      .filter(m => polishedUpdate.curatedPhotoIds.includes(m.id))
      .map(m => m.url);

    // 4. Save to the Database (Ready for the Dashboard)
    const newUpdate = await prisma.clientUpdate.create({
      data: {
        projectId,
        title: polishedUpdate.title,
        executiveSummary: polishedUpdate.executiveSummary,
        sentiment: polishedUpdate.sentiment,
        curatedPhotoUrls: selectedUrls,
        isMilestonePayment: polishedUpdate.financialTrigger === 'INVOICE_READY',
        published: true,
      },
    });

    // 5. Autonomously Notify the Client (Push/Email)
    const primaryClient = recentActivity.clients[0];
    if (primaryClient) {
      await notifyClient({
        userId: primaryClient.id,
        method: 'PUSH_AND_EMAIL',
        subject: `Project Update: ${newUpdate.title}`,
        body: newUpdate.executiveSummary,
        link: `${process.env.FRONTEND_URL ?? 'https://app.example.com'}/client/projects/${projectId}`,
      });
    }

    return { success: true, update: newUpdate };
  } catch (error) {
    console.error('Concierge Agent Failure:', error);
    throw error;
  }
}
