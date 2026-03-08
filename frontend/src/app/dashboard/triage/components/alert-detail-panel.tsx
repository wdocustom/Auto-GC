'use client';

import { cn } from '@/lib/utils';
import { OverrideActions } from './override-actions';
import type { TriageAlert } from './types';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-amber-400',
  LOW: 'text-blue-400',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * Split-screen "God Mode" detail view for a selected alert.
 * Left: AI reasoning, raw SMS, site photo.
 * Right: Override controls.
 */
export function AlertDetailPanel({
  alert,
  onResolved,
}: {
  alert: TriageAlert;
  onResolved: (alertId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50">
      {/* Alert Header */}
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-bold uppercase', SEVERITY_COLORS[alert.severity])}>
                {alert.severity}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{alert.project.name}</span>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{alert.title}</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(alert.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Split Content */}
      <div className="grid gap-0 lg:grid-cols-2">
        {/* Left: AI Context */}
        <div className="space-y-4 border-r border-border p-5">
          {/* AI Reasoning */}
          <Section title="AI Reasoning">
            <p className="text-sm text-card-foreground leading-relaxed">
              {alert.description}
            </p>
          </Section>

          {/* Milestone Context */}
          {alert.milestone && (
            <Section title="Linked Milestone">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">
                    {alert.milestone.title}
                  </span>
                  <MilestoneStatus status={alert.milestone.status} />
                </div>
                <p className="text-xs text-muted-foreground">{alert.milestone.description}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Due: {new Date(alert.milestone.scheduledEnd).toLocaleDateString()}</span>
                  {alert.milestone.actualEnd && (
                    <span>Completed: {new Date(alert.milestone.actualEnd).toLocaleDateString()}</span>
                  )}
                </div>
                {alert.milestone.visionLog && (
                  <div className="mt-2 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Vision Log</p>
                    <p className="text-xs text-card-foreground">{alert.milestone.visionLog}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Raw SMS */}
          {alert.communication && (
            <Section title="Raw Message">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {alert.communication.direction === 'INBOUND' ? 'From' : 'To'}:{' '}
                    {alert.communication.senderPhone}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.communication.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-card-foreground font-mono whitespace-pre-wrap">
                  {alert.communication.rawMessage}
                </p>
              </div>
              {alert.communication.aiInterpretation && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    AI Interpretation
                  </p>
                  <pre className="text-xs text-muted-foreground overflow-x-auto">
                    {JSON.stringify(alert.communication.aiInterpretation, null, 2)}
                  </pre>
                </div>
              )}
            </Section>
          )}

          {/* Site Photo */}
          {alert.media && (
            <Section title="Flagged Photo">
              <div className="overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={alert.media.url}
                  alt="Flagged site photo"
                  className="w-full object-cover rounded-lg"
                />
              </div>
              {alert.media.visionAnalysis && (
                <div className="mt-3 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Vision Analysis</p>
                  <p className="text-xs text-card-foreground">{alert.media.visionAnalysis}</p>
                </div>
              )}
            </Section>
          )}
        </div>

        {/* Right: Override Controls */}
        <div className="p-5">
          <OverrideActions alert={alert} onResolved={onResolved} />
        </div>
      </div>
    </div>
  );
}

function MilestoneStatus({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-zinc-500/10 text-zinc-400',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-400',
    VERIFIED: 'bg-emerald-500/10 text-emerald-400',
    DELAYED: 'bg-amber-500/10 text-amber-400',
    NEEDS_REWORK: 'bg-red-500/10 text-red-400',
  };
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      styles[status] ?? styles.PENDING,
    )}>
      {status}
    </span>
  );
}
