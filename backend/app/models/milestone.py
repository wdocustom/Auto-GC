"""Milestone model — trackable phases of a project (Gantt nodes)."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, Float, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    trade: Mapped[str | None] = mapped_column(String(100))  # e.g. "Framing", "Electrical"

    # Progress
    percent_complete: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(
        SAEnum("not_started", "in_progress", "blocked", "review", "completed", name="milestone_status"),
        default="not_started",
    )

    # Scheduling (Gantt)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    planned_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    planned_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actual_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actual_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lead_time_days: Mapped[int | None] = mapped_column(Integer)

    # Budget slice
    budgeted_cost: Mapped[float | None] = mapped_column(Float)
    actual_cost: Mapped[float | None] = mapped_column(Float, default=0.0)

    # Vision verification
    vision_verified: Mapped[bool] = mapped_column(default=False)
    vision_confidence: Mapped[float | None] = mapped_column(Float)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="milestones")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Milestone {self.name} ({self.percent_complete}%)>"
