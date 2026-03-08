"""Pydantic schemas for Communications / Agentic Inbox."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class TwilioSMSWebhook(BaseModel):
    """Incoming Twilio SMS webhook payload (relevant fields)."""
    MessageSid: str
    From: str
    To: str
    Body: str | None = None
    NumMedia: str = "0"
    MediaUrl0: str | None = None
    MediaContentType0: str | None = None


class TwilioVoiceWebhook(BaseModel):
    """Incoming Twilio voice webhook payload."""
    CallSid: str
    From: str
    To: str
    CallStatus: str


class ParsedMessage(BaseModel):
    """Output of the Comm Agent's LLM parsing."""
    intent: str  # "progress_update", "issue_report", "material_request", "schedule_change", "question"
    milestone_name: str | None = None
    percent_complete: float | None = None
    description: str | None = None
    urgency: str = "normal"  # "low", "normal", "high", "critical"
    suggested_response: str | None = None
    confidence: float = 0.0


class CommunicationResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    channel: str
    direction: str
    from_number: str | None
    from_name: str | None
    raw_body: str | None
    transcription: str | None
    parsed_intent: str | None
    parsed_data: dict | None
    agent_response: str | None
    processing_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InboxItem(BaseModel):
    """Enriched inbox view combining comm + sub + project context."""
    communication: CommunicationResponse
    sub_name: str | None = None
    sub_trade: str | None = None
    project_name: str
    requires_action: bool = False
