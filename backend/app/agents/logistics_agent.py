"""Logistics Agent — manages Gantt schedules, lead times, and payment triggers."""

from __future__ import annotations

import logging

from app.agents.state import AgentState

logger = logging.getLogger(__name__)


async def logistics_agent_node(state: AgentState) -> AgentState:
    """Process schedule updates and determine if payments should be triggered."""
    state.log_reasoning("logistics", "start", "Evaluating schedule and payment implications")

    for action in state.actions_taken:
        # Handle progress updates
        if action.startswith("progress_update:"):
            parts = action.split(":")
            milestone_name = parts[1] if len(parts) > 1 else "Unknown"
            pct = float(parts[2]) if len(parts) > 2 else 0.0

            state.schedule_updates.append({
                "milestone_name": milestone_name,
                "new_percent": pct,
                "type": "progress",
            })

            state.db_mutations.append({
                "table": "milestones",
                "operation": "update",
                "filter": {"name": milestone_name, "project_id": str(state.project_id)},
                "data": {"percent_complete": pct, "status": "completed" if pct >= 100 else "in_progress"},
            })

            state.log_reasoning(
                "logistics", "schedule_update",
                f"{milestone_name} -> {pct}%",
                {"milestone": milestone_name, "percent": pct},
            )

            # Client-visible milestone updates at key thresholds
            if pct >= 100:
                state.add_client_update(f"Milestone '{milestone_name}' marked as complete.")
            elif pct >= 50 and pct < 100:
                state.add_client_update(f"Milestone '{milestone_name}' is {pct:.0f}% complete.")

        # Handle vision approvals -> trigger payment
        if action.startswith("vision_approved:"):
            milestone_name = action.split(":")[1]
            state.payment_triggers.append({
                "milestone_name": milestone_name,
                "reason": "vision_verification_passed",
            })
            state.log_reasoning(
                "logistics", "payment_trigger",
                f"Payment triggered for {milestone_name} after vision approval",
            )

    return state
