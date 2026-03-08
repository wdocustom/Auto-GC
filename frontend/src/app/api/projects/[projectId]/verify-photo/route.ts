import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToSupabase } from '@/lib/storage';
import { analyzeSitePhoto } from '@/lib/ai/vision';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const formData = await req.formData();
    const file = formData.get('photo') as File;
    const milestoneId = formData.get('milestoneId') as string;

    if (!file || !milestoneId) {
      return NextResponse.json(
        { error: 'Missing required fields: photo, milestoneId' },
        { status: 400 },
      );
    }

    // 1. Upload the image to Supabase Storage to get a public URL
    const imageUrl = await uploadToSupabase(file, `projects/${projectId}`);

    // 2. Fetch the specific milestone context
    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // 3. The Agentic Reasoning Step (Pass to Vision LLM)
    const visionAnalysis = await analyzeSitePhoto({
      imageUrl,
      milestoneDescription: milestone.description,
    });

    // 4. Log the Media and the AI's Analysis in the Black Box
    await prisma.siteMedia.create({
      data: {
        projectId,
        url: imageUrl,
        type: 'IMAGE',
        visionAnalysis: JSON.stringify(visionAnalysis),
      },
    });

    // 5. Autonomous Decision Logic
    if (visionAnalysis.action === 'APPROVE' && visionAnalysis.confidenceScore > 85) {
      // Auto-approve the milestone
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          status: 'VERIFIED',
          visionLog: visionAnalysis.visualEvidence,
          actualEnd: new Date(),
        },
      });

      // TODO: Trigger Event -> Notify Next Subcontractor in Gantt sequence

    } else if (visionAnalysis.action === 'REJECT' || visionAnalysis.qualityIssuesDetected) {
      // Auto-reject and log for the Orchestrator to text the sub
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          status: 'NEEDS_REWORK',
          visionLog: visionAnalysis.subcontractorFeedback,
        },
      });

      // TODO: Trigger Event -> SMS the sub with the feedback

    } else {
      // FLAG_FOR_HUMAN — log reasoning without changing milestone status
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          visionLog: `[FLAG_FOR_HUMAN] ${visionAnalysis.visualEvidence}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      analysis: visionAnalysis,
    });
  } catch (error) {
    console.error('Vision Verification Error:', error);
    return NextResponse.json({ error: 'Failed to process site photo' }, { status: 500 });
  }
}
