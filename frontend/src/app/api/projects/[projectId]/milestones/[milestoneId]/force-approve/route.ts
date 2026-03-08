import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/projects/:projectId/milestones/:milestoneId/force-approve
 *
 * GC overrides the AI and manually approves a milestone.
 * Body: { "reason": "GC on-site inspection confirmed work is complete" }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> },
) {
  const { projectId, milestoneId } = await params;
  const body = await req.json();

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, projectId },
  });

  if (!milestone) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  }

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      status: 'VERIFIED',
      actualEnd: new Date(),
      visionLog: `[GC OVERRIDE] ${body.reason || 'Manually approved by GC'}`,
    },
  });

  // Resolve any related alerts
  await prisma.systemAlert.updateMany({
    where: { milestoneId, isResolved: false },
    data: { isResolved: true, resolvedBy: 'gc-manual', resolutionNotes: 'Force approved' },
  });

  return NextResponse.json({ success: true, milestone: updated });
}
