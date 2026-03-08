"""AgentLog model — the Black Box. Every agent reasoning step is recorded."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AgentLog(Base):
    """Internal-only log of all agent reasoning. Visible to GC, never to client."""
    __tablename__ = "agent_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)

    # Which agent
    agent_type: Mapped[str] = mapped_column(
        SAEnum("orchestrator", "comm", "vision", "logistics", "client_portal", name="agent_type"),
        nullable=False,
    )

    # Event
    event: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "sms_parsed", "milestone_updated"
    detail: Mapped[str | None] = mapped_column(Text)

    # Full reasoning trace (the Black Box data)
    reasoning_trace: Mapped[dict | None] = mapped_column(JSONB)
    input_data: Mapped[dict | None] = mapped_column(JSONB)
    output_data: Mapped[dict | None] = mapped_column(JSONB)

    # Performance
    duration_ms: Mapped[float | None] = mapped_column(Float)
    tokens_used: Mapped[int | None] = mapped_column()

    # Link to trigger
    communication_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    media_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="agent_logs")  # noqa: F821

    def __repr__(self) -> str:
        return f"<AgentLog {self.agent_type}:{self.event}>"
