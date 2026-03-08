'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertDetailPanel } from './alert-detail-panel';
import type { TriageAlert } from './types';

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: 'border-red-500/40 bg-red-500/5', text: 'text-red-400', dot: 'bg-red-500' },
  HIGH: { bg: 'border-orange-500/40 bg-orange-500/5', text: 'text-orange-400', dot: 'bg-orange-500' },
  MEDIUM: { bg: 'border-amber-500/30 bg-amber-500/5', text: 'text-amber-400', dot: 'bg-amber-500' },
  LOW: { bg: 'border-blue-500/20 bg-blue-500/5', text: 'text-blue-400', dot: 'bg-blue-400' },
};

function SeverityBadge({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.LOW;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', style.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot, severity === 'CRITICAL' && 'animate-pulse')} />
      {severity}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function TriageInbox({ alerts }: { alerts: TriageAlert[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    alerts[0]?.id ?? null,
  );
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const activeAlerts = alerts.filter(a => !resolvedIds.has(a.id));
  const selectedAlert = activeAlerts.find(a => a.id === selectedId) ?? null;

  function handleResolved(alertId: string) {
    setResolvedIds(prev => new Set(prev).add(alertId));
    // Select next alert
    const remaining = activeAlerts.filter(a => a.id !== alertId);
    setSelectedId(remaining[0]?.id ?? null);
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* Left: Alert List */}
      <div className="space-y-2 overflow-y-auto lg:max-h-[calc(100vh-200px)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Triage Queue
          </h2>
          <span className="text-xs text-muted-foreground">
            {activeAlerts.length} remaining
          </span>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-emerald-400 font-medium">All alerts resolved</p>
          </div>
        ) : (
          activeAlerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.LOW;
            const isSelected = alert.id === selectedId;

            return (
              <button
                key={alert.id}
                onClick={() => setSelectedId(alert.id)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-all',
                  isSelected
                    ? cn(style.bg, 'ring-1 ring-primary/50')
                    : 'border-border bg-card hover:border-primary/30',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(alert.createdAt)}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-medium text-card-foreground line-clamp-1">
                  {alert.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {alert.description}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {alert.project.name}
                  </span>
                  {alert.milestone && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {alert.milestone.title}
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Right: Detail Panel */}
      <div className="lg:max-h-[calc(100vh-200px)] overflow-y-auto">
        {selectedAlert ? (
          <AlertDetailPanel alert={selectedAlert} onResolved={handleResolved} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-card p-12">
            <p className="text-sm text-muted-foreground">Select an alert to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
