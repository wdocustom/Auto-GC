"use client";

import { useEffect, useState } from "react";
import type { Project, InboxItem } from "@/types";

// Stat card component
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-card-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    planning: "bg-blue-500/10 text-blue-400",
    active: "bg-emerald-500/10 text-emerald-400",
    paused: "bg-amber-500/10 text-amber-400",
    completed: "bg-green-500/10 text-green-400",
    archived: "bg-zinc-500/10 text-zinc-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || colors.planning}`}
    >
      {status}
    </span>
  );
}

// Inbox item row
function InboxRow({ item }: { item: InboxItem }) {
  return (
    <div
      className={`flex items-start gap-4 rounded-lg border p-4 ${
        item.requires_action
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-card-foreground">
            {item.sub_name || item.communication.from_number || "Unknown"}
          </span>
          {item.sub_trade && (
            <span className="text-xs text-muted-foreground">
              {item.sub_trade}
            </span>
          )}
          {item.requires_action && (
            <span className="text-xs font-medium text-amber-400">
              Action Required
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground truncate">
          {item.communication.raw_body || item.communication.transcription}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{item.project_name}</span>
          <span>{item.communication.channel}</span>
          {item.communication.parsed_intent && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
              {item.communication.parsed_intent}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(item.communication.created_at).toLocaleString()}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [projRes, inboxRes] = await Promise.allSettled([
          fetch("/api/v1/projects/").then((r) => r.json()),
          fetch("/api/v1/inbox/").then((r) => r.json()),
        ]);
        if (projRes.status === "fulfilled") setProjects(projRes.value);
        if (inboxRes.status === "fulfilled") setInbox(inboxRes.value);
      } catch {
        // API not connected yet — show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeProjects = projects.filter((p) => p.status === "active");
  const totalBudget = projects.reduce((s, p) => s + (p.total_budget || 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.spent_budget || 0), 0);
  const actionItems = inbox.filter((i) => i.requires_action);

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Executive overview — Auto-GC Platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-muted-foreground">
            Agents Online
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Projects"
          value={activeProjects.length}
          sub={`${projects.length} total`}
        />
        <StatCard
          label="Total Budget"
          value={
            totalBudget
              ? `$${(totalBudget / 1000).toFixed(0)}k`
              : "--"
          }
          sub={totalSpent ? `$${(totalSpent / 1000).toFixed(0)}k spent` : undefined}
        />
        <StatCard
          label="Inbox Messages"
          value={inbox.length}
          sub={`${actionItems.length} require action`}
        />
        <StatCard
          label="Agent Events"
          value="--"
          sub="Black box logs"
        />
      </div>

      {/* Two-column layout */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Projects list */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground">Projects</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No projects yet. Create your first project to get started.
                </p>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-card-foreground">
                        {project.name}
                      </h3>
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {project.address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {project.client_name}
                    </p>
                  </div>
                  <div className="text-right">
                    {project.total_budget && (
                      <p className="text-sm font-medium text-card-foreground">
                        ${(project.total_budget / 1000).toFixed(0)}k
                      </p>
                    )}
                    {project.qr_code_url && (
                      <span className="text-xs text-primary">QR Active</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inbox sidebar */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Agentic Inbox
          </h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : inbox.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No messages yet. Incoming SMS and voice calls will appear here.
                </p>
              </div>
            ) : (
              inbox.slice(0, 10).map((item) => (
                <InboxRow key={item.communication.id} item={item} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
