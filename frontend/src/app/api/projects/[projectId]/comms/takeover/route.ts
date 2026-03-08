import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSystemSMS } from '@/lib/comms/twilio';

/**
 * POST /api/projects/:projectId/comms/takeover
 *
 * Pauses the AI SMS agent and lets the GC text a sub directly.
 * Body: { "subId": "...", "message": "Hey Mike, I need you on-site tomorrow at 7am." }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const body = await req.json();

  if (!body.subId || !body.message) {
    return NextResponse.json(
      { error: 'Missing subId or message' },
      { status: 400 },
    );
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const sub = await prisma.projectSub.findFirst({
    where: { id: body.subId, projectId },
  });
  if (!sub) {
    return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 });
  }

  // Send the message from the project's dedicated phone
  const sid = await sendSystemSMS(
    project.dedicatedPhone,
    sub.phoneNumber,
    body.message,
  );

  // Log the communication as a GC-manual outbound
  await prisma.communication.create({
    data: {
      projectId,
      senderPhone: project.dedicatedPhone,
      rawMessage: body.message,
      direction: 'OUTBOUND',
      wasActioned: true,
      aiInterpretation: { source: 'GC_MANUAL_TAKEOVER', twilioSid: sid },
    },
  });

  return NextResponse.json({ success: true, twilioSid: sid });
}
