import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateClientUpdate } from '@/lib/ai/concierge';

/**
 * POST /api/projects/:projectId/client-updates
 *
 * Generates a new AI-curated client update from recent project activity.
 * Body (optional): { "hasMilestonePayment": true }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const body = await req.json().catch(() => ({}));
    const hasMilestonePayment = body.hasMilestonePayment === true;

    // 1. Load full project context
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: { orderBy: { actualEnd: 'desc' } },
        subcontractors: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 2. Gather recent verified milestones and upcoming work
    const recentMilestones = project.milestones.filter(
      m => m.status === 'VERIFIED' && m.actualEnd,
    ).slice(0, 5);

    const upcomingMilestones = project.milestones.filter(
      m => m.status === 'PENDING' || m.status === 'IN_PROGRESS',
    ).slice(0, 5);

    // 3. Gather recent site photos
    const recentMedia = await prisma.siteMedia.findMany({
      where: { projectId, type: 'IMAGE' },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // 4. Gather recent event log (last 48 hours of communications)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentEvents = await prisma.communication.findMany({
      where: { projectId, createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 5. Generate the curated update via Concierge AI
    const draft = await generateClientUpdate({
      projectName: project.name,
      projectAddress: project.address,
      progressPercent: project.progressPercent,
      recentMilestones,
      upcomingMilestones,
      recentMedia,
      recentEvents,
      subcontractors: project.subcontractors,
      hasMilestonePayment,
    });

    // 6. Resolve curated photo IDs to URLs for storage
    const curatedPhotos = recentMedia.filter(m => draft.curatedPhotoIds.includes(m.id));
    const curatedPhotoUrls = curatedPhotos.map(m => m.url);

    // 7. Persist the update as unpublished (GC can review before publishing)
    const clientUpdate = await prisma.clientUpdate.create({
      data: {
        projectId,
        title: draft.title,
        executiveSummary: draft.executiveSummary,
        sentiment: draft.sentiment,
        curatedPhotoUrls,
        isMilestonePayment: draft.financialTrigger === 'INVOICE_READY',
        published: false,
      },
    });

    return NextResponse.json({
      success: true,
      update: clientUpdate,
    });
  } catch (error) {
    console.error('Client Update Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/projects/:projectId/client-updates
 *
 * Lists client updates for a project, optionally filtered by published status.
 * Query params: ?published=true|false
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    const publishedFilter = searchParams.get('published');

    const where: { projectId: string; published?: boolean } = { projectId };
    if (publishedFilter === 'true') where.published = true;
    if (publishedFilter === 'false') where.published = false;

    const updates = await prisma.clientUpdate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(updates);
  } catch (error) {
    console.error('Client Updates List Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
