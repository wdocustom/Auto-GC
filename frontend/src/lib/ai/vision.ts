import type { Milestone } from '@prisma/client';

export interface VisionContext {
  imageUrl: string;
  milestone: Milestone;
  projectName: string;
  projectAddress: string;
}

/** Simplified context used by the upload-based route. */
export interface SitePhotoContext {
  imageUrl: string;
  milestoneDescription: string;
}

export interface VisionVerdict {
  milestoneDetected: boolean;
  confidenceScore: number;
  completionPercentage: number;
  qualityIssuesDetected: boolean;
  visualEvidence: string;
  action: 'APPROVE' | 'REJECT' | 'FLAG_FOR_HUMAN';
  subcontractorFeedback?: string;
}

/**
 * Builds the system prompt for the Vision Verification Agent.
 */
function buildVisionPrompt(ctx: VisionContext): string {
  return `### SYSTEM INSTRUCTIONS FOR VISION VERIFICATION AGENT
You are an expert Construction Project Manager and Quality Control Inspector AI.
You are evaluating a photo uploaded from a job site to verify if a specific milestone is completed.

**Project:** "${ctx.projectName}"
**Address:** ${ctx.projectAddress}

**Pending Milestone:**
- Title: "${ctx.milestone.title}"
- Description: "${ctx.milestone.description}"
- Current Status: ${ctx.milestone.status}
- Scheduled: ${ctx.milestone.scheduledStart.toISOString()} → ${ctx.milestone.scheduledEnd.toISOString()}
- Lead Time: ${ctx.milestone.leadTimeDays} days

**Your Task:**
Analyze the image specifically looking for evidence of the Pending Milestone. Be highly critical. If the task looks incomplete or sloppy, flag it. Do not assume unseen work is done.

**Output Format (Strict JSON):**
{
  "milestoneDetected": true | false,
  "confidenceScore": 0-100,
  "completionPercentage": 0-100,
  "qualityIssuesDetected": true | false,
  "visualEvidence": "Brief description of what you actually see confirming or denying the milestone",
  "action": "APPROVE | REJECT | FLAG_FOR_HUMAN",
  "subcontractorFeedback": "If REJECT or FLAG_FOR_HUMAN, what specific constructive feedback should be texted to the sub?"
}

**Rules:**
- APPROVE only if confidenceScore >= 85 and completionPercentage >= 90 and no quality issues.
- REJECT if the work is clearly not done or has serious quality problems.
- FLAG_FOR_HUMAN for ambiguous cases (e.g., partial completion, angle doesn't show enough, confidence between 50-84).
- Always include visualEvidence describing exactly what you see in the image.
- Include subcontractorFeedback for REJECT and FLAG_FOR_HUMAN actions.
- Respond ONLY with valid JSON. No markdown, no explanation.`;
}

/**
 * Analyzes a site photo against a milestone using multimodal vision AI.
 *
 * Replace the placeholder implementation below with your preferred AI provider.
 * This requires a multimodal model capable of image analysis.
 */
export async function verifyMilestonePhoto(ctx: VisionContext): Promise<VisionVerdict> {
  const systemPrompt = buildVisionPrompt(ctx);

  // ----- Placeholder: replace with your actual multimodal LLM call -----
  // Example using the Anthropic SDK with vision:
  //
  // import Anthropic from '@anthropic-ai/sdk';
  // const anthropic = new Anthropic();
  //
  // // Fetch the image and convert to base64
  // const imageResponse = await fetch(ctx.imageUrl);
  // const imageBuffer = await imageResponse.arrayBuffer();
  // const base64Image = Buffer.from(imageBuffer).toString('base64');
  // const mediaType = imageResponse.headers.get('content-type') || 'image/jpeg';
  //
  // const response = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-20250514',
  //   max_tokens: 1024,
  //   system: systemPrompt,
  //   messages: [{
  //     role: 'user',
  //     content: [
  //       {
  //         type: 'image',
  //         source: { type: 'base64', media_type: mediaType, data: base64Image },
  //       },
  //       {
  //         type: 'text',
  //         text: `Verify milestone: "${ctx.milestone.title}"\nDescription: "${ctx.milestone.description}"`,
  //       },
  //     ],
  //   }],
  // });
  // return JSON.parse(response.content[0].text) as VisionVerdict;

  console.log('[Vision] System prompt length:', systemPrompt.length);
  console.log('[Vision] Analyzing image:', ctx.imageUrl);
  console.log('[Vision] For milestone:', ctx.milestone.title);

  // Fallback stub — flags everything for human review until an LLM is wired up
  return {
    milestoneDetected: false,
    confidenceScore: 0,
    completionPercentage: 0,
    qualityIssuesDetected: false,
    visualEvidence: 'Vision agent not yet connected — photo queued for manual review.',
    action: 'FLAG_FOR_HUMAN',
    subcontractorFeedback: 'Your photo has been received and is pending review by the project manager.',
  };
}

/**
 * Simplified entry point for the upload-based route.
 * Accepts just an imageUrl and milestone description string.
 */
export async function analyzeSitePhoto(ctx: SitePhotoContext): Promise<VisionVerdict> {
  const systemPrompt = `### SYSTEM INSTRUCTIONS FOR VISION VERIFICATION AGENT
You are an expert Construction Project Manager and Quality Control Inspector AI.
You are evaluating a photo uploaded from a job site to verify if a specific milestone is completed.

**Pending Milestone:** "${ctx.milestoneDescription}"

**Your Task:**
Analyze the image specifically looking for evidence of the Pending Milestone. Be highly critical. If the task looks incomplete or sloppy, flag it. Do not assume unseen work is done.

**Output Format (Strict JSON):**
{
  "milestoneDetected": true | false,
  "confidenceScore": 0-100,
  "completionPercentage": 0-100,
  "qualityIssuesDetected": true | false,
  "visualEvidence": "Brief description of what you actually see confirming or denying the milestone",
  "action": "APPROVE | REJECT | FLAG_FOR_HUMAN",
  "subcontractorFeedback": "If REJECT or FLAG_FOR_HUMAN, what specific constructive feedback should be texted to the sub?"
}

**Rules:**
- APPROVE only if confidenceScore >= 85 and completionPercentage >= 90 and no quality issues.
- REJECT if the work is clearly not done or has serious quality problems.
- FLAG_FOR_HUMAN for ambiguous cases (e.g., partial completion, angle doesn't show enough, confidence between 50-84).
- Always include visualEvidence describing exactly what you see in the image.
- Include subcontractorFeedback for REJECT and FLAG_FOR_HUMAN actions.
- Respond ONLY with valid JSON. No markdown, no explanation.`;

  // ----- Placeholder: replace with your actual multimodal LLM call -----
  // Example using the Anthropic SDK with vision:
  //
  // import Anthropic from '@anthropic-ai/sdk';
  // const anthropic = new Anthropic();
  //
  // const imageResponse = await fetch(ctx.imageUrl);
  // const imageBuffer = await imageResponse.arrayBuffer();
  // const base64Image = Buffer.from(imageBuffer).toString('base64');
  // const mediaType = imageResponse.headers.get('content-type') || 'image/jpeg';
  //
  // const response = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-20250514',
  //   max_tokens: 1024,
  //   system: systemPrompt,
  //   messages: [{
  //     role: 'user',
  //     content: [
  //       {
  //         type: 'image',
  //         source: { type: 'base64', media_type: mediaType, data: base64Image },
  //       },
  //       {
  //         type: 'text',
  //         text: `Verify milestone: "${ctx.milestoneDescription}"`,
  //       },
  //     ],
  //   }],
  // });
  // return JSON.parse(response.content[0].text) as VisionVerdict;

  console.log('[Vision] System prompt length:', systemPrompt.length);
  console.log('[Vision] Analyzing image:', ctx.imageUrl);
  console.log('[Vision] For milestone description:', ctx.milestoneDescription);

  return {
    milestoneDetected: false,
    confidenceScore: 0,
    completionPercentage: 0,
    qualityIssuesDetected: false,
    visualEvidence: 'Vision agent not yet connected — photo queued for manual review.',
    action: 'FLAG_FOR_HUMAN',
    subcontractorFeedback: 'Your photo has been received and is pending review by the project manager.',
  };
}
