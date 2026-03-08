"""Project model — the root of each Digital Twin."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Float, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    client_email: Mapped[str | None] = mapped_column(String(255))
    client_phone: Mapped[str | None] = mapped_column(String(50))

    # Project Twilio number (dedicated per project)
    twilio_phone_number: Mapped[str | None] = mapped_column(String(50))

    # QR Hub
    qr_code_url: Mapped[str | None] = mapped_column(Text)

    # Scope of Work — the reference doc for vision comparisons
    scope_of_work: Mapped[str | None] = mapped_column(Text)

    # Status
    status: Mapped[str] = mapped_column(
        SAEnum("planning", "active", "paused", "completed", "archived", name="project_status"),
        default="planning",
    )

    # Budget
    total_budget: Mapped[float | None] = mapped_column(Float)
    spent_budget: Mapped[float | None] = mapped_column(Float, default=0.0)

    # Timestamps
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    target_end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Owner (Supabase Auth user id)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    # Relationships
    milestones: Mapped[list["Milestone"]] = relationship(back_populates="project", cascade="all, delete-orphan")  # noqa: F821
    communications: Mapped[list["Communication"]] = relationship(back_populates="project", cascade="all, delete-orphan")  # noqa: F821
    media: Mapped[list["Media"]] = relationship(back_populates="project", cascade="all, delete-orphan")  # noqa: F821
    agent_logs: Mapped[list["AgentLog"]] = relationship(back_populates="project", cascade="all, delete-orphan")  # noqa: F821
    project_subs: Mapped[list["ProjectSubcontractor"]] = relationship(back_populates="project", cascade="all, delete-orphan")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Project {self.name} [{self.status}]>"
