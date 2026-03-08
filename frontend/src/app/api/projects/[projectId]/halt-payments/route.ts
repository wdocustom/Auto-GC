import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/projects/:projectId/halt-payments
 *
 * Freezes all pending/processing transactions for a project.
 * Body: { "reason": "Dispute investigation in progress" }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const body = await req.json();

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Freeze all non-final transactions
  const result = await prisma.transaction.updateMany({
    where: {
      projectId,
      status: { in: ['PENDING', 'PROCESSING'] },
    },
    data: { status: 'PENDING' },
  });

  // Create a CRITICAL alert to track this override
  await prisma.systemAlert.create({
    data: {
      projectId,
      severity: 'CRITICAL',
      title: 'Payment Escrow Halted by GC',
      description: body.reason || 'GC manually halted all pending payments',
    },
  });

  return NextResponse.json({
    success: true,
    transactionsHalted: result.count,
  });
}
