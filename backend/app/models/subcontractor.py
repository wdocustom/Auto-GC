"""Subcontractor model and project-sub junction table."""

import uuid
from datetime import datetime

from sqlalchemy import String, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Subcontractor(Base):
    __tablename__ = "subcontractors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    email: Mapped[str | None] = mapped_column(String(255))
    trade: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "Plumbing"

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    project_assignments: Mapped[list["ProjectSubcontractor"]] = relationship(back_populates="subcontractor")

    def __repr__(self) -> str:
        return f"<Sub {self.company_name} ({self.trade})>"


class ProjectSubcontractor(Base):
    """Junction table linking subs to projects with bid/contract data."""
    __tablename__ = "project_subcontractors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    subcontractor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subcontractors.id"), nullable=False)

    status: Mapped[str] = mapped_column(
        SAEnum("invited", "bid_submitted", "awarded", "active", "completed", name="sub_project_status"),
        default="invited",
    )
    bid_amount: Mapped[float | None] = mapped_column(Float)
    contract_amount: Mapped[float | None] = mapped_column(Float)
    paid_amount: Mapped[float | None] = mapped_column(Float, default=0.0)

    # Stripe
    stripe_account_id: Mapped[str | None] = mapped_column(String(255))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="project_subs")  # noqa: F821
    subcontractor: Mapped["Subcontractor"] = relationship(back_populates="project_assignments")
