"""Pydantic schemas for Project CRUD."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class ProjectCreate(BaseModel):
    name: str
    address: str
    client_name: str
    client_email: str | None = None
    client_phone: str | None = None
    scope_of_work: str | None = None
    total_budget: float | None = None
    start_date: datetime | None = None
    target_end_date: datetime | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    client_name: str | None = None
    client_email: str | None = None
    client_phone: str | None = None
    scope_of_work: str | None = None
    status: str | None = None
    total_budget: float | None = None
    start_date: datetime | None = None
    target_end_date: datetime | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    address: str
    client_name: str
    client_email: str | None
    client_phone: str | None
    twilio_phone_number: str | None
    qr_code_url: str | None
    scope_of_work: str | None
    status: str
    total_budget: float | None
    spent_budget: float | None
    start_date: datetime | None
    target_end_date: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MilestoneCreate(BaseModel):
    name: str
    description: str | None = None
    trade: str | None = None
    sort_order: int = 0
    planned_start: datetime | None = None
    planned_end: datetime | None = None
    lead_time_days: int | None = None
    budgeted_cost: float | None = None


class MilestoneUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    percent_complete: float | None = None
    status: str | None = None
    actual_start: datetime | None = None
    actual_end: datetime | None = None
    actual_cost: float | None = None
    vision_verified: bool | None = None
    vision_confidence: float | None = None


class MilestoneResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str | None
    trade: str | None
    percent_complete: float
    status: str
    sort_order: int
    planned_start: datetime | None
    planned_end: datetime | None
    actual_start: datetime | None
    actual_end: datetime | None
    lead_time_days: int | None
    budgeted_cost: float | None
    actual_cost: float | None
    vision_verified: bool
    vision_confidence: float | None
    created_at: datetime

    model_config = {"from_attributes": True}
