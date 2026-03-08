import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Eye, Hand } from 'lucide-react';
import { TriageDetail } from './components/triage-detail';

/**
 * GET /dashboard/triage
 *
 * GC Command Center — "Management by Exception" Triage Inbox.
 * Only shows unresolved SystemAlerts sorted by severity (CRITICAL first).
 */
export default async function TriageInbox() {
  // Fetch only unresolved alerts, sorted by severity
  const activeAlerts = await prisma.systemAlert.findMany({
    where: { isResolved: false },
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' },
    ],
    include: { project: true },
  });

  if (activeAlerts.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold">All Systems Nominal</h2>
          <p className="text-zinc-400">The AI is handling everything. Go play golf.</p>
        </div>
      </div>
    );
  }

  // Preload related context for each alert (milestone, comms, media, subs)
  const alertsWithContext = await Promise.all(
    activeAlerts.map(async (alert) => {
      const [milestone, communication, media, subcontractors] = await Promise.all([
        alert.milestoneId
          ? prisma.milestone.findUnique({ where: { id: alert.milestoneId } })
          : null,
        alert.communicationId
          ? prisma.communication.findUnique({ where: { id: alert.communicationId } })
          : null,
        alert.mediaId
          ? prisma.siteMedia.findUnique({ where: { id: alert.mediaId } })
          : null,
        prisma.projectSub.findMany({
          where: { projectId: alert.projectId },
          select: { id: true, name: true, trade: true, phoneNumber: true },
        }),
      ]);

      return {
        ...alert,
        project: {
          ...alert.project,
          budgetTotal: Number(alert.project.budgetTotal),
        },
        milestone: milestone
          ? {
              ...milestone,
              scheduledStart: milestone.scheduledStart.toISOString(),
              scheduledEnd: milestone.scheduledEnd.toISOString(),
              actualEnd: milestone.actualEnd?.toISOString() ?? null,
            }
          : null,
        communication: communication
          ? {
              ...communication,
              createdAt: communication.createdAt.toISOString(),
            }
          : null,
        media,
        subcontractors,
        createdAt: alert.createdAt.toISOString(),
      };
    }),
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Active Triage Required</h1>
        <Badge variant="destructive">{activeAlerts.length} Pending Exceptions</Badge>
      </div>

      <div className="grid gap-4">
        {alertsWithContext.map((alert) => (
          <Card key={alert.id} className="border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                {alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? (
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                )}
                <CardTitle className="text-lg">
                  {alert.project.name} &mdash; {alert.title}
                </CardTitle>
              </div>
              <Badge variant="outline" className="uppercase">
                {alert.severity}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-zinc-400">{alert.description}</p>

              {/* Interactive detail panel (Client Component) */}
              <TriageDetail alert={alert} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
