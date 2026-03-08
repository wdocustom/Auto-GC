import { prisma } from '@/lib/prisma';
import { TriageInbox } from './components/triage-inbox';

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

/**
 * GC Command Center — Triage Inbox
 *
 * Server Component: fetches unresolved SystemAlerts from Prisma,
 * sorted by severity (CRITICAL first), and passes them to the
 * interactive client-side triage UI.
 */
export default async function TriagePage() {
  const alerts = await prisma.systemAlert.findMany({
    where: { isResolved: false },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          address: true,
          dedicatedPhone: true,
          status: true,
          budgetTotal: true,
          progressPercent: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Sort by severity since Prisma enum ordering isn't guaranteed
  alerts.sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  // Preload related context for each alert
  const alertsWithContext = await Promise.all(
    alerts.map(async (alert) => {
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
        // Serialize Decimal/Date for client component
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
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
          <p className="text-sm text-muted-foreground">
            Management by Exception — only items requiring human intervention
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-red-400">
              {alerts.filter(a => a.severity === 'CRITICAL').length} Critical
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
            <span className="text-xs text-muted-foreground">
              {alerts.length} unresolved
            </span>
          </div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center">
          <div className="rounded-full bg-emerald-500/10 p-6">
            <svg className="h-12 w-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">All Clear</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No alerts requiring human intervention. AI agents are operating normally.
          </p>
        </div>
      ) : (
        <TriageInbox alerts={alertsWithContext} />
      )}
    </div>
  );
}
