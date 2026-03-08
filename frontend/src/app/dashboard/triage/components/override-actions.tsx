'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { TriageAlert } from './types';

type ActionState = 'idle' | 'loading' | 'success' | 'error';

function ActionButton({
  label,
  description,
  variant,
  icon,
  state,
  onClick,
}: {
  label: string;
  description: string;
  variant: 'danger' | 'warning' | 'primary' | 'default';
  icon: React.ReactNode;
  state: ActionState;
  onClick: () => void;
}) {
  const variants = {
    danger: 'border-red-500/30 hover:bg-red-500/10 text-red-400',
    warning: 'border-amber-500/30 hover:bg-amber-500/10 text-amber-400',
    primary: 'border-primary/30 hover:bg-primary/10 text-primary',
    default: 'border-border hover:bg-accent text-card-foreground',
  };

  return (
    <button
      onClick={onClick}
      disabled={state === 'loading' || state === 'success'}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-all',
        variants[variant],
        state === 'success' && 'border-emerald-500/30 bg-emerald-500/5',
        (state === 'loading' || state === 'success') && 'opacity-60 cursor-not-allowed',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {state === 'loading' ? 'Processing...' : state === 'success' ? 'Done' : label}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );
}

export function OverrideActions({
  alert,
  onResolved,
}: {
  alert: TriageAlert;
  onResolved: (alertId: string) => void;
}) {
  const [forceApproveState, setForceApproveState] = useState<ActionState>('idle');
  const [haltPaymentState, setHaltPaymentState] = useState<ActionState>('idle');
  const [takeoverState, setTakeoverState] = useState<ActionState>('idle');
  const [resolveState, setResolveState] = useState<ActionState>('idle');

  const [showCommsPanel, setShowCommsPanel] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [selectedSubId, setSelectedSubId] = useState(alert.subcontractors[0]?.id ?? '');

  const [resolutionNotes, setResolutionNotes] = useState('');

  async function handleForceApprove() {
    if (!alert.milestoneId) return;
    setForceApproveState('loading');
    try {
      const res = await fetch(
        `/api/projects/${alert.projectId}/milestones/${alert.milestoneId}/force-approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'GC manual override from Command Center' }),
        },
      );
      if (!res.ok) throw new Error('Failed');
      setForceApproveState('success');
    } catch {
      setForceApproveState('error');
    }
  }

  async function handleHaltPayments() {
    setHaltPaymentState('loading');
    try {
      const res = await fetch(`/api/projects/${alert.projectId}/halt-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Halted via alert: ${alert.title}` }),
      });
      if (!res.ok) throw new Error('Failed');
      setHaltPaymentState('success');
    } catch {
      setHaltPaymentState('error');
    }
  }

  async function handleSendSMS() {
    if (!smsMessage.trim() || !selectedSubId) return;
    setTakeoverState('loading');
    try {
      const res = await fetch(`/api/projects/${alert.projectId}/comms/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subId: selectedSubId, message: smsMessage }),
      });
      if (!res.ok) throw new Error('Failed');
      setTakeoverState('success');
      setSmsMessage('');
    } catch {
      setTakeoverState('error');
    }
  }

  async function handleResolve() {
    setResolveState('loading');
    try {
      const res = await fetch(`/api/alerts/${alert.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolvedBy: 'gc-manual',
          resolutionNotes: resolutionNotes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setResolveState('success');
      onResolved(alert.id);
    } catch {
      setResolveState('error');
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Override Controls
      </h3>

      {/* Force Approve Milestone */}
      {alert.milestoneId && (
        <ActionButton
          label="Force Approve Milestone"
          description="Override AI verdict and mark milestone as VERIFIED"
          variant="warning"
          state={forceApproveState}
          onClick={handleForceApprove}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      )}

      {/* Take Over Comms */}
      <ActionButton
        label="Take Over Comms"
        description="Pause AI SMS agent and text the sub directly"
        variant="primary"
        state={showCommsPanel ? 'success' : takeoverState}
        onClick={() => setShowCommsPanel(!showCommsPanel)}
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        }
      />

      {/* SMS Compose Panel */}
      {showCommsPanel && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Subcontractor</label>
            <select
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground"
            >
              {alert.subcontractors.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} — {sub.trade} ({sub.phoneNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Message</label>
            <textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="Type your message to the sub..."
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>
          <button
            onClick={handleSendSMS}
            disabled={!smsMessage.trim() || takeoverState === 'loading'}
            className={cn(
              'w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              smsMessage.trim()
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            {takeoverState === 'loading' ? 'Sending...' : 'Send SMS'}
          </button>
        </div>
      )}

      {/* Halt Payment Escrow */}
      <ActionButton
        label="Halt Payment Escrow"
        description="Freeze all pending/processing payments for this project"
        variant="danger"
        state={haltPaymentState}
        onClick={handleHaltPayments}
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        }
      />

      {/* Divider */}
      <div className="border-t border-border pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Resolve Alert
        </h3>
        <textarea
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          placeholder="Resolution notes (optional)..."
          rows={2}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground resize-none"
        />
        <button
          onClick={handleResolve}
          disabled={resolveState === 'loading' || resolveState === 'success'}
          className={cn(
            'mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
            resolveState === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 cursor-not-allowed'
              : 'bg-card border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
          )}
        >
          {resolveState === 'loading'
            ? 'Resolving...'
            : resolveState === 'success'
              ? 'Resolved'
              : 'Mark as Resolved'}
        </button>
      </div>
    </div>
  );
}
