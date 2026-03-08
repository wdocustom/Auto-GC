import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runLogisticsAgent } from '@/lib/ai/logistics-runner';

/**
 * POST /api/projects/:projectId/milestones/:milestoneId/event
 *
 * Triggers the Logistics Orchestrator AI when a milestone status changes.
 * Body: { "event": "VERIFIED" | "DELAYED" }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> },
) {
  try {
    const { projectId, milestoneId } = await params;
    const body = await req.json();
    const event = body.event as 'VERIFIED' | 'DELAYED';

    if (!event || !['VERIFIED', 'DELAYED'].includes(event)) {
      return NextResponse.json(
        { error: 'Missing or invalid event. Must be "VERIFIED" or "DELAYED".' },
        { status: 400 },
      );
    }

    // Verify the milestone exists and belongs to the project
    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Update the milestone status
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: event,
        ...(event === 'VERIFIED' ? { actualEnd: new Date() } : {}),
      },
    });

    // Run the Logistics Orchestrator
    const plan = await runLogisticsAgent(projectId, milestoneId, event);

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error('Milestone Event Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
