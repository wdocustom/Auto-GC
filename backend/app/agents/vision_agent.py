"""Vision Agent — analyzes site photos against Scope of Work to verify milestones."""

from __future__ import annotations

import json
import logging

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.agents.state import AgentState

logger = logging.getLogger(__name__)

VISION_SYSTEM_PROMPT = """You are a Construction Vision Verification Agent.
You analyze site photos to verify milestone completion against a Scope of Work document.

PROJECT: {project_name}
SCOPE OF WORK:
{scope_of_work}

MILESTONE BEING VERIFIED: {milestone_name}

Analyze the provided image and determine:
1. match_score: 0.0-1.0 confidence that the milestone work shown matches the scope
2. observations: List of specific observations about the work visible
3. concerns: Any quality or safety concerns visible
4. estimated_completion: Your estimate of percent complete for this milestone
5. recommendation: "approve", "needs_review", or "reject"

Respond ONLY with valid JSON."""


async def vision_agent_node(state: AgentState) -> AgentState:
    """Analyze a site photo against project scope."""
    state.log_reasoning("vision", "start", "Beginning vision analysis")

    image_url = state.trigger_data.get("image_url")
    milestone_name = state.trigger_data.get("milestone_name", "Unknown")

    if not image_url:
        state.errors.append("No image URL provided for vision analysis")
        return state

    llm = ChatOpenAI(model="gpt-4o", temperature=0)

    system_msg = VISION_SYSTEM_PROMPT.format(
        project_name=state.project_name,
        scope_of_work=state.scope_of_work[:3000] if state.scope_of_work else "Not provided",
        milestone_name=milestone_name,
    )

    try:
        response = await llm.ainvoke([
            SystemMessage(content=system_msg),
            HumanMessage(content=[
                {"type": "text", "text": f"Analyze this site photo for milestone: {milestone_name}"},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]),
        ])

        analysis = json.loads(response.content)
        state.vision_analysis = analysis
        state.vision_match_score = analysis.get("match_score", 0.0)

        state.log_reasoning("vision", "analyzed", f"Match score: {state.vision_match_score}", analysis)

        # If high confidence, flag for payment trigger
        if state.vision_match_score and state.vision_match_score >= 0.85:
            state.actions_taken.append(f"vision_approved:{milestone_name}")
            state.add_client_update(f"Milestone '{milestone_name}' verified by site photo analysis.")

    except Exception as e:
        state.errors.append(f"Vision agent error: {str(e)}")
        state.log_reasoning("vision", "error", str(e))

    return state
