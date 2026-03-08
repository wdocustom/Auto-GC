"""Agentic Inbox — view and manage parsed communications."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.communication import Communication
from app.models.project import Project
from app.models.subcontractor import Subcontractor
from app.schemas.communication import CommunicationResponse, InboxItem

router = APIRouter(prefix="/inbox", tags=["inbox"])


@router.get("/", response_model=list[InboxItem])
async def list_inbox(
    project_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List inbox items with enriched context."""
    query = select(Communication).order_by(Communication.created_at.desc()).limit(limit)

    if project_id:
        query = query.where(Communication.project_id == project_id)
    if status:
        query = query.where(Communication.processing_status == status)

    result = await db.execute(query)
    comms = result.scalars().all()

    items = []
    for comm in comms:
        # Resolve project name
        proj_result = await db.execute(select(Project.name).where(Project.id == comm.project_id))
        project_name = proj_result.scalar_one_or_none() or "Unknown"

        # Resolve sub info
        sub_name = None
        sub_trade = None
        if comm.from_number:
            sub_result = await db.execute(
                select(Subcontractor).where(Subcontractor.phone == comm.from_number)
            )
            sub = sub_result.scalar_one_or_none()
            if sub:
                sub_name = sub.contact_name or sub.company_name
                sub_trade = sub.trade

        requires_action = (
            comm.parsed_intent in ("issue_report", "material_request")
            or (comm.parsed_data or {}).get("urgency") in ("high", "critical")
        )

        items.append(InboxItem(
            communication=CommunicationResponse.model_validate(comm),
            sub_name=sub_name,
            sub_trade=sub_trade,
            project_name=project_name,
            requires_action=requires_action,
        ))

    return items
