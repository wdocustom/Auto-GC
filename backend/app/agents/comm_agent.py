"""Comm Agent — parses inbound SMS/voice into structured project updates."""

from __future__ import annotations

import json
import logging

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.agents.state import AgentState

logger = logging.getLogger(__name__)

COMM_SYSTEM_PROMPT = """You are the Communication Agent for a construction project management system.
Your job is to parse inbound messages from subcontractors and extract structured data.

PROJECT CONTEXT:
- Project: {project_name}
- Scope of Work: {scope_of_work}

Given a raw message from a sub-contractor, extract:
1. intent: One of "progress_update", "issue_report", "material_request", "schedule_change", "question", "other"
2. milestone_name: Which milestone/trade this relates to (if identifiable)
3. percent_complete: If they mention progress, extract as 0-100 float
4. description: Brief summary of what they communicated
5. urgency: "low", "normal", "high", or "critical"
6. suggested_response: What should be sent back to the sub

Respond ONLY with valid JSON matching this schema. No markdown, no explanation."""


async def comm_agent_node(state: AgentState) -> AgentState:
    """Parse an inbound SMS or transcription into structured data."""
    state.log_reasoning("comm", "start", "Beginning message parse")

    raw_text = state.trigger_data.get("body") or state.trigger_data.get("transcription", "")
    if not raw_text:
        state.errors.append("No message body to parse")
        return state

    llm = ChatOpenAI(model="gpt-4o", temperature=0)

    system_msg = COMM_SYSTEM_PROMPT.format(
        project_name=state.project_name,
        scope_of_work=state.scope_of_work[:2000] if state.scope_of_work else "Not provided",
    )

    try:
        response = await llm.ainvoke([
            SystemMessage(content=system_msg),
            HumanMessage(content=f"Message from {state.sender_phone} ({state.sender_name}):\n\n{raw_text}"),
        ])

        parsed = json.loads(response.content)
        state.parsed_message = parsed

        state.log_reasoning("comm", "parsed", f"Extracted intent: {parsed.get('intent')}", parsed)

        # If this is a progress update, flag for orchestrator
        if parsed.get("intent") == "progress_update" and parsed.get("percent_complete") is not None:
            state.actions_taken.append(f"progress_update:{parsed.get('milestone_name')}:{parsed.get('percent_complete')}")

    except json.JSONDecodeError:
        state.errors.append(f"LLM returned non-JSON: {response.content[:200]}")
        state.log_reasoning("comm", "error", "Failed to parse LLM output as JSON")
    except Exception as e:
        state.errors.append(f"Comm agent error: {str(e)}")
        state.log_reasoning("comm", "error", str(e))

    return state
