import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Auto-GC
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Autonomous General Contractor Platform
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Multi-Agent Orchestration for Construction Intelligence
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-xl w-full">
        <Link
          href="/dashboard"
          className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary"
        >
          <h2 className="text-xl font-semibold text-card-foreground">
            Dashboard
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Executive overview of all projects, milestones, and agent activity.
          </p>
        </Link>

        <Link
          href="/dashboard"
          className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary"
        >
          <h2 className="text-xl font-semibold text-card-foreground">
            Agentic Inbox
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-parsed messages from subs, auto-converted to project updates.
          </p>
        </Link>
      </div>
    </div>
  );
}
