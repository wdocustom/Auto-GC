import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/alerts?resolved=false
 *
 * Fetches SystemAlerts sorted by severity (CRITICAL first).
 * Defaults to unresolved alerts only.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const resolved = searchParams.get('resolved') === 'true';

  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const alerts = await prisma.systemAlert.findMany({
    where: { isResolved: resolved },
    include: {
      project: { select: { id: true, name: true, address: true, dedicatedPhone: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Sort by severity (Prisma enum ordering isn't guaranteed)
  alerts.sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );

  return NextResponse.json(alerts);
}
