"""Orchestrator Agent — the Brain. Routes triggers through sub-agents and persists results."""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.state import AgentState
from app.agents.comm_agent import comm_agent_node
from app.agents.vision_agent import vision_agent_node
from app.agents.logistics_agent import logistics_agent_node
from app.models.project import Project
from app.models.milestone import Milestone
from app.models.communication import Communication
from app.models.agent_log import AgentLog
from app.models.subcontractor import Subcontractor

logger = logging.getLogger(__name__)


class Orchestrator:
    """The central agent that delegates to sub-agents based on trigger type.

    Flow:
      1. Load project context
      2. Route to appropriate sub-agent(s)
      3. Run logistics agent for schedule/payment implications
      4. Persist all results + Black Box logs
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _load_project_context(self, project_id: uuid.UUID) -> Project | None:
        result = await self.db.execute(select(Project).where(Project.id == project_id))
        return result.scalar_one_or_none()

    async def _resolve_sender(self, phone: str) -> tuple[str, uuid.UUID | None]:
        """Look up a sub by phone number."""
        result = await self.db.execute(select(Subcontractor).where(Subcontractor.phone == phone))
        sub = result.scalar_one_or_none()
        if sub:
            return sub.contact_name or sub.company_name, sub.id
        return "Unknown", None

    async def _find_project_by_twilio_number(self, to_number: str) -> Project | None:
        result = await self.db.execute(
            select(Project).where(Project.twilio_phone_number == to_number)
        )
        return result.scalar_one_or_none()

    async def _persist_communication(self, state: AgentState, comm_data: dict) -> uuid.UUID:
        """Save the communication record."""
        comm = Communication(
            project_id=state.project_id,
            channel=comm_data.get("channel", "sms"),
            direction="inbound",
            from_number=state.sender_phone,
            from_name=state.sender_name,
            raw_body=comm_data.get("body"),
            transcription=comm_data.get("transcription"),
            parsed_intent=state.parsed_message.get("intent") if state.parsed_message else None,
            parsed_data=state.parsed_message,
            agent_response=state.parsed_message.get("suggested_response") if state.parsed_message else None,
            processing_status="processed" if not state.errors else "failed",
        )
        self.db.add(comm)
        await self.db.flush()
        return comm.id

    async def _persist_agent_logs(self, state: AgentState, duration_ms: float) -> None:
        """Save the full Black Box reasoning trace."""
        for entry in state.reasoning_log:
            log = AgentLog(
                project_id=state.project_id,
                agent_type=entry["agent"],
                event=entry["step"],
                detail=entry["detail"],
                reasoning_trace=entry.get("data"),
                duration_ms=duration_ms,
            )
            self.db.add(log)

    async def _apply_db_mutations(self, state: AgentState) -> None:
        """Apply any DB updates decided by agents (milestone progress, etc.)."""
        for mutation in state.db_mutations:
            if mutation["table"] == "milestones" and mutation["operation"] == "update":
                filters = mutation["filter"]
                data = mutation["data"]
                result = await self.db.execute(
                    select(Milestone).where(
                        Milestone.project_id == uuid.UUID(filters["project_id"]),
                        Milestone.name == filters["name"],
                    )
                )
                milestone = result.scalar_one_or_none()
                if milestone:
                    for key, value in data.items():
                        setattr(milestone, key, value)

    async def handle_sms(self, to_number: str, from_number: str, body: str) -> AgentState:
        """Full pipeline: SMS -> Comm Agent -> Logistics -> Persist."""
        start = time.time()

        # Resolve project by Twilio number
        project = await self._find_project_by_twilio_number(to_number)
        if not project:
            state = AgentState()
            state.errors.append(f"No project found for Twilio number {to_number}")
            return state

        # Resolve sender
        sender_name, sub_id = await self._resolve_sender(from_number)

        # Build state
        state = AgentState(
            project_id=project.id,
            project_name=project.name,
            scope_of_work=project.scope_of_work or "",
            trigger_type="sms",
            trigger_data={"body": body, "from": from_number, "to": to_number},
            sender_phone=from_number,
            sender_name=sender_name,
        )

        state.log_reasoning("orchestrator", "routing", f"SMS from {sender_name} -> Comm Agent")

        # Run sub-agents in sequence
        state = await comm_agent_node(state)
        state = await logistics_agent_node(state)

        # Persist
        duration_ms = (time.time() - start) * 1000
        await self._persist_communication(state, {"channel": "sms", "body": body})
        await self._apply_db_mutations(state)
        await self._persist_agent_logs(state, duration_ms)
        await self.db.commit()

        return state

    async def handle_photo_upload(
        self, project_id: uuid.UUID, image_url: str, milestone_name: str
    ) -> AgentState:
        """Full pipeline: Photo -> Vision Agent -> Logistics -> Persist."""
        start = time.time()

        project = await self._load_project_context(project_id)
        if not project:
            state = AgentState()
            state.errors.append(f"Project {project_id} not found")
            return state

        state = AgentState(
            project_id=project.id,
            project_name=project.name,
            scope_of_work=project.scope_of_work or "",
            trigger_type="photo_upload",
            trigger_data={"image_url": image_url, "milestone_name": milestone_name},
        )

        state.log_reasoning("orchestrator", "routing", "Photo upload -> Vision Agent")

        state = await vision_agent_node(state)
        state = await logistics_agent_node(state)

        duration_ms = (time.time() - start) * 1000
        await self._apply_db_mutations(state)
        await self._persist_agent_logs(state, duration_ms)
        await self.db.commit()

        return state
