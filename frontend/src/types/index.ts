/**
 * Core domain types matching the backend schemas.
 */

export interface Project {
  id: string;
  name: string;
  address: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  twilio_phone_number: string | null;
  qr_code_url: string | null;
  scope_of_work: string | null;
  status: "planning" | "active" | "paused" | "completed" | "archived";
  total_budget: number | null;
  spent_budget: number | null;
  start_date: string | null;
  target_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  trade: string | null;
  percent_complete: number;
  status: "not_started" | "in_progress" | "blocked" | "review" | "completed";
  sort_order: number;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  lead_time_days: number | null;
  budgeted_cost: number | null;
  actual_cost: number | null;
  vision_verified: boolean;
  vision_confidence: number | null;
  created_at: string;
}

export interface Communication {
  id: string;
  project_id: string;
  channel: "sms" | "voice" | "email" | "qr_upload" | "manual";
  direction: "inbound" | "outbound";
  from_number: string | null;
  from_name: string | null;
  raw_body: string | null;
  transcription: string | null;
  parsed_intent: string | null;
  parsed_data: Record<string, unknown> | null;
  agent_response: string | null;
  processing_status: "pending" | "processing" | "processed" | "failed";
  created_at: string;
}

export interface InboxItem {
  communication: Communication;
  sub_name: string | null;
  sub_trade: string | null;
  project_name: string;
  requires_action: boolean;
}
