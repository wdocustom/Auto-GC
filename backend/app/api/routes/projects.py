"""Project CRUD endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.project import Project
from app.models.milestone import Milestone
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    MilestoneCreate, MilestoneUpdate, MilestoneResponse,
)
from app.services.qr_service import generate_qr_data_uri

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(**data.model_dump())
    # Generate QR code on creation
    qr_data_uri, hub_url = generate_qr_data_uri(project.id)
    project.qr_code_url = qr_data_uri
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return project


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID, data: ProjectUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    await db.flush()
    await db.refresh(project)
    return project


# --- Milestones ---

@router.post("/{project_id}/milestones", response_model=MilestoneResponse, status_code=201)
async def create_milestone(
    project_id: uuid.UUID, data: MilestoneCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    milestone = Milestone(project_id=project_id, **data.model_dump())
    db.add(milestone)
    await db.flush()
    await db.refresh(milestone)
    return milestone


@router.get("/{project_id}/milestones", response_model=list[MilestoneResponse])
async def list_milestones(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Milestone)
        .where(Milestone.project_id == project_id)
        .order_by(Milestone.sort_order)
    )
    return result.scalars().all()


@router.patch("/{project_id}/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    project_id: uuid.UUID,
    milestone_id: uuid.UUID,
    data: MilestoneUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Milestone).where(Milestone.id == milestone_id, Milestone.project_id == project_id)
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(milestone, key, value)
    await db.flush()
    await db.refresh(milestone)
    return milestone
