import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeMessageIntent } from '@/lib/ai/orchestrator';

export async function POST(req: Request) {
  try {
    // 1. Parse incoming Twilio Webhook data
    const formData = await req.formData();
    const fromPhone = formData.get('From') as string; // Sub's phone
    const toPhone = formData.get('To') as string;     // Project's dedicated phone
    const messageBody = formData.get('Body') as string; // What they texted

    if (!fromPhone || !toPhone || !messageBody) {
      return NextResponse.json(
        { error: 'Missing required fields: From, To, Body' },
        { status: 400 },
      );
    }

    // 2. Identify the Project (Digital Twin)
    const project = await prisma.project.findUnique({
      where: { dedicatedPhone: toPhone },
      include: { milestones: true, subcontractors: true },
    });

    if (!project) {
      console.error(`Unknown project number: ${toPhone}`);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 3. Identify the Subcontractor
    const sub = project.subcontractors.find(s => s.phoneNumber === fromPhone);
    const senderName = sub ? `${sub.name} (${sub.trade})` : 'Unknown Sender';

    // 4. The Agentic Reasoning Step (Pass to LLM)
    const aiDecision = await analyzeMessageIntent({
      projectState: project,
      sender: senderName,
      message: messageBody,
    });

    // 5. Log the Communication in the Black Box
    await prisma.communication.create({
      data: {
        projectId: project.id,
        senderPhone: fromPhone,
        rawMessage: messageBody,
        direction: 'INBOUND',
        aiInterpretation: aiDecision,
        wasActioned: aiDecision.requiresAction,
      },
    });

    // 6. Execute Autonomous Actions based on AI intent
    if (aiDecision.actionType === 'UPDATE_MILESTONE' && aiDecision.milestoneId) {
      await prisma.milestone.update({
        where: { id: aiDecision.milestoneId },
        data: { status: aiDecision.newStatus },
      });
    }

    if (aiDecision.actionType === 'ALERT_PM') {
      // TODO: Wire up PM notification (email, push, Slack, etc.)
      console.log(`[ALERT_PM] ${aiDecision.intent} from ${senderName} on project "${project.name}": ${aiDecision.summary}`);
    }

    // 7. Auto-Reply via Twilio
    if (aiDecision.replyText) {
      // TODO: Wire up Twilio outbound SMS here
      console.log(`Auto-replying to ${fromPhone}: ${aiDecision.replyText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
