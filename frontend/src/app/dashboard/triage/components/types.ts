/** Serialized alert shape passed from the RSC to client components. */
export interface TriageAlert {
  id: string;
  projectId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  milestoneId: string | null;
  communicationId: string | null;
  mediaId: string | null;
  isResolved: boolean;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  createdAt: string;

  project: {
    id: string;
    name: string;
    address: string;
    dedicatedPhone: string;
    status: string;
    budgetTotal: number;
    progressPercent: number;
  };

  milestone: {
    id: string;
    title: string;
    description: string;
    status: string;
    scheduledStart: string;
    scheduledEnd: string;
    actualEnd: string | null;
    assignedSubId: string | null;
    visionLog: string | null;
  } | null;

  communication: {
    id: string;
    senderPhone: string;
    rawMessage: string;
    aiInterpretation: unknown;
    direction: string;
    createdAt: string;
  } | null;

  media: {
    id: string;
    url: string;
    type: string;
    visionAnalysis: string | null;
  } | null;

  subcontractors: {
    id: string;
    name: string;
    trade: string;
    phoneNumber: string;
  }[];
}
