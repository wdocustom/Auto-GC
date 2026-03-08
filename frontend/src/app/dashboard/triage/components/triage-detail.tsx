'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Hand, ShieldAlert, CheckCircle2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TriageAlert } from './types';

type ActionState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Interactive detail + override controls for a single triage alert card.
 * Renders the action buttons and expandable panels (context view, SMS takeover).
 */
export function TriageDetail({ alert }: { alert: TriageAlert }) {
  const [showContext, setShowContext] = useState(false);
  const [showComms, setShowComms] = useState(false);

  const [forceApproveState, setForceApproveState] = useState<ActionState>('idle');
  const [haltPaymentState, setHaltPaymentState] = useState<ActionState>('idle');
  const [resolveState, setResolveState] = useState<ActionState>('idle');
  const [smsState, setSmsState] = useState<ActionState>('idle');

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
    setSmsState('loading');
    try {
      const res = await fetch(`/api/projects/${alert.projectId}/comms/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subId: selectedSubId, message: smsMessage }),
      });
      if (!res.ok) throw new Error('Failed');
      setSmsState('success');
      setSmsMessage('');
    } catch {
      setSmsState('error');
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
    } catch {
      setResolveState('error');
    }
  }

  if (resolveState === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-400">Alert resolved</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="default"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => { setShowContext(!showContext); setShowComms(false); }}
        >
          <Eye className="mr-2 h-4 w-4" />
          {showContext ? 'Hide Context' : 'View Context'}
        </Button>

        <Button
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          onClick={() => { setShowComms(!showComms); setShowContext(false); }}
        >
          <Hand className="mr-2 h-4 w-4" />
          Take Over Comms
        </Button>

        {alert.milestoneId && (
          <Button
            variant="outline"
            className={cn(
              'border-zinc-700 text-zinc-300 hover:bg-zinc-800',
              forceApproveState === 'success' && 'border-emerald-500/30 text-emerald-400',
            )}
            disabled={forceApproveState === 'loading' || forceApproveState === 'success'}
            onClick={handleForceApprove}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {forceApproveState === 'loading'
              ? 'Approving...'
              : forceApproveState === 'success'
                ? 'Approved'
                : 'Force Approve Milestone'}
          </Button>
        )}

        <Button
          variant="outline"
          className={cn(
            'border-red-500/30 text-red-400 hover:bg-red-500/10',
            haltPaymentState === 'success' && 'border-emerald-500/30 text-emerald-400',
          )}
          disabled={haltPaymentState === 'loading' || haltPaymentState === 'success'}
          onClick={handleHaltPayments}
        >
          <ShieldAlert className="mr-2 h-4 w-4" />
          {haltPaymentState === 'loading'
            ? 'Halting...'
            : haltPaymentState === 'success'
              ? 'Payments Halted'
              : 'Halt Payment Escrow'}
        </Button>
      </div>

      {/* Expandable: View Context (God Mode) */}
      {showContext && (
        <div className="grid gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-5 lg:grid-cols-2">
          {/* Left: AI reasoning + raw data */}
          <div className="space-y-4">
            {/* AI Reasoning */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                AI Reasoning
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">{alert.description}</p>
            </div>

            {/* Milestone Context */}
            {alert.milestone && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Linked Milestone
                </h4>
                <div className="rounded-lg bg-zinc-900 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{alert.milestone.title}</span>
                    <Badge variant="outline" className="text-xs">{alert.milestone.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{alert.milestone.description}</p>
                  <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                    <span>Due: {new Date(alert.milestone.scheduledEnd).toLocaleDateString()}</span>
                    {alert.milestone.actualEnd && (
                      <span>Completed: {new Date(alert.milestone.actualEnd).toLocaleDateString()}</span>
                    )}
                  </div>
                  {alert.milestone.visionLog && (
                    <div className="mt-2 rounded bg-zinc-800 p-2">
                      <p className="text-xs text-zinc-500">Vision Log</p>
                      <p className="text-xs text-zinc-300">{alert.milestone.visionLog}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Raw SMS */}
            {alert.communication && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Raw Message
                </h4>
                <div className="rounded-lg bg-zinc-900 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {alert.communication.direction === 'INBOUND' ? 'From' : 'To'}:{' '}
                      {alert.communication.senderPhone}
                    </span>
                    <span>{new Date(alert.communication.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="font-mono text-sm text-zinc-200 whitespace-pre-wrap">
                    {alert.communication.rawMessage}
                  </p>
                  {alert.communication.aiInterpretation && (
                    <div className="mt-3 border-t border-zinc-800 pt-2">
                      <p className="text-xs text-zinc-500 mb-1">AI Interpretation</p>
                      <pre className="text-xs text-zinc-400 overflow-x-auto">
                        {JSON.stringify(alert.communication.aiInterpretation, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Site photo + resolution */}
          <div className="space-y-4">
            {alert.media && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Flagged Photo
                </h4>
                <div className="overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={alert.media.url}
                    alt="Flagged site photo"
                    className="w-full rounded-lg object-cover"
                  />
                </div>
                {alert.media.visionAnalysis && (
                  <div className="mt-2 rounded-lg bg-zinc-900 p-3">
                    <p className="text-xs text-zinc-500 mb-1">Vision Analysis</p>
                    <p className="text-xs text-zinc-300">{alert.media.visionAnalysis}</p>
                  </div>
                )}
              </div>
            )}

            {/* Resolve Alert */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Resolve Alert
              </h4>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Resolution notes (optional)..."
                rows={3}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none"
              />
              <Button
                variant="outline"
                className="mt-2 w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                disabled={resolveState === 'loading'}
                onClick={handleResolve}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {resolveState === 'loading' ? 'Resolving...' : 'Mark as Resolved'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Expandable: Take Over Comms */}
      {showComms && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Direct SMS to Subcontractor
          </h4>
          <div>
            <label className="text-xs text-zinc-500">Subcontractor</label>
            <select
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
            >
              {alert.subcontractors.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} — {sub.trade} ({sub.phoneNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Message</label>
            <textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="Type your message to the sub..."
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none"
            />
          </div>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={!smsMessage.trim() || smsState === 'loading'}
            onClick={handleSendSMS}
          >
            <Send className="mr-2 h-4 w-4" />
            {smsState === 'loading'
              ? 'Sending...'
              : smsState === 'success'
                ? 'Sent!'
                : 'Send SMS'}
          </Button>
        </div>
      )}
    </div>
  );
}
