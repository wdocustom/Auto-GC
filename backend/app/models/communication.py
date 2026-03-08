"""Communication model — every SMS, voice call, and parsed message."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Communication(Base):
    """Inbound/outbound comms linked to a project. The Agentic Inbox source."""
    __tablename__ = "communications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)

    # Source
    channel: Mapped[str] = mapped_column(
        SAEnum("sms", "voice", "email", "qr_upload", "manual", name="comm_channel"),
        nullable=False,
    )
    direction: Mapped[str] = mapped_column(
        SAEnum("inbound", "outbound", name="comm_direction"),
        default="inbound",
    )

    # Sender info
    from_number: Mapped[str | None] = mapped_column(String(50))
    to_number: Mapped[str | None] = mapped_column(String(50))
    from_name: Mapped[str | None] = mapped_column(String(255))

    # Raw content
    raw_body: Mapped[str | None] = mapped_column(Text)
    voice_recording_url: Mapped[str | None] = mapped_column(Text)
    transcription: Mapped[str | None] = mapped_column(Text)

    # Agent-parsed output
    parsed_intent: Mapped[str | None] = mapped_column(String(100))  # e.g. "progress_update"
    parsed_data: Mapped[dict | None] = mapped_column(JSONB)  # structured extraction
    agent_response: Mapped[str | None] = mapped_column(Text)  # what the agent replied

    # Processing
    processing_status: Mapped[str] = mapped_column(
        SAEnum("pending", "processing", "processed", "failed", name="comm_processing_status"),
        default="pending",
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="communications")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Comm {self.channel}/{self.direction} from={self.from_number}>"
