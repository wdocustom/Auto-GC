import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/alerts/:alertId/resolve
 *
 * Marks an alert as resolved by the human GC.
 * Body: { "resolvedBy": "user-id", "resolutionNotes": "..." }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ alertId: string }> },
) {
  const { alertId } = await params;
  const body = await req.json();

  const alert = await prisma.systemAlert.findUnique({ where: { id: alertId } });
  if (!alert) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  const updated = await prisma.systemAlert.update({
    where: { id: alertId },
    data: {
      isResolved: true,
      resolvedBy: body.resolvedBy ?? 'gc-manual',
      resolutionNotes: body.resolutionNotes ?? null,
    },
  });

  return NextResponse.json(updated);
}
