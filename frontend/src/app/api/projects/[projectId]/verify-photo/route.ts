import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMilestonePhoto } from '@/lib/ai/vision';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const body = await req.json();
    const { milestoneId, imageUrl } = body as {
      milestoneId: string;
      imageUrl: string;
    };

    if (!milestoneId || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: milestoneId, imageUrl' },
        { status: 400 },
      );
    }

    // 1. Load the project and milestone
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // 2. Run Vision Verification
    const verdict = await verifyMilestonePhoto({
      imageUrl,
      milestone,
      projectName: project.name,
      projectAddress: project.address,
    });

    // 3. Store the photo and analysis in SiteMedia
    await prisma.siteMedia.create({
      data: {
        projectId,
        url: imageUrl,
        type: 'IMAGE',
        visionAnalysis: JSON.stringify(verdict),
      },
    });

    // 4. Act on the verdict
    if (verdict.action === 'APPROVE') {
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          status: 'VERIFIED',
          actualEnd: new Date(),
          visionLog: verdict.visualEvidence,
        },
      });
    } else {
      // REJECT or FLAG_FOR_HUMAN — log the reasoning but don't auto-verify
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          visionLog: `[${verdict.action}] ${verdict.visualEvidence}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      verdict,
    });
  } catch (error) {
    console.error('Vision Verification Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
