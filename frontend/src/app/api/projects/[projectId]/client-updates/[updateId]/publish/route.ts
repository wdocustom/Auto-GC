import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/projects/:projectId/client-updates/:updateId/publish
 *
 * Publishes a draft client update, making it visible to the client.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; updateId: string }> },
) {
  try {
    const { projectId, updateId } = await params;

    const update = await prisma.clientUpdate.findFirst({
      where: { id: updateId, projectId },
    });

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    if (update.published) {
      return NextResponse.json({ error: 'Already published' }, { status: 409 });
    }

    const published = await prisma.clientUpdate.update({
      where: { id: updateId },
      data: { published: true },
    });

    // TODO: Trigger notification to client (email, push, SMS)
    console.log(`[Concierge] Published update "${published.title}" for project ${projectId}`);

    return NextResponse.json({ success: true, update: published });
  } catch (error) {
    console.error('Publish Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
