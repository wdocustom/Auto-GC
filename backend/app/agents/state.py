"""Shared agent state — the data contract flowing through the LangGraph."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentState:
    """Mutable state passed between agents in the orchestration graph.

    All internal reasoning is captured in `reasoning_log` (the Black Box).
    Only `client_visible_updates` are pushed to the Client Portal.
    """

    # Context
    project_id: uuid.UUID | None = None
    project_name: str = ""
    scope_of_work: str = ""

    # Trigger
    trigger_type: str = ""  # "sms", "voice", "photo_upload", "scheduled"
    trigger_data: dict[str, Any] = field(default_factory=dict)

    # Comm Agent output
    parsed_message: dict[str, Any] | None = None
    sender_phone: str = ""
    sender_name: str = ""

    # Vision Agent output
    vision_analysis: dict[str, Any] | None = None
    vision_match_score: float | None = None

    # Logistics Agent output
    schedule_updates: list[dict[str, Any]] = field(default_factory=list)
    payment_triggers: list[dict[str, Any]] = field(default_factory=list)

    # Orchestrator decisions
    actions_taken: list[str] = field(default_factory=list)
    db_mutations: list[dict[str, Any]] = field(default_factory=list)

    # Client Portal (visible to client)
    client_visible_updates: list[str] = field(default_factory=list)

    # Black Box (visible only to GC)
    reasoning_log: list[dict[str, Any]] = field(default_factory=list)

    # Error handling
    errors: list[str] = field(default_factory=list)

    def log_reasoning(self, agent: str, step: str, detail: str, data: dict | None = None) -> None:
        """Append to the internal reasoning log (Black Box)."""
        self.reasoning_log.append({
            "agent": agent,
            "step": step,
            "detail": detail,
            "data": data or {},
        })

    def add_client_update(self, message: str) -> None:
        """Add a high-level update visible to the client."""
        self.client_visible_updates.append(message)
