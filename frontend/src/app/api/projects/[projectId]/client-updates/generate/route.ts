import { NextResponse } from 'next/server';
import { generateClientSummary } from '@/lib/ai/concierge-runner';

/**
 * POST /api/projects/:projectId/client-updates/generate
 *
 * Runs the full concierge pipeline: gathers 7 days of activity,
 * drafts a polished update, auto-publishes, and notifies the client.
 *
 * This is the "fire and forget" endpoint — equivalent to calling
 * generateClientSummary() directly (e.g., from a cron job).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const result = await generateClientSummary(projectId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Generate Client Summary Error:', error);
    return NextResponse.json({ error: 'Failed to generate client summary' }, { status: 500 });
  }
}
