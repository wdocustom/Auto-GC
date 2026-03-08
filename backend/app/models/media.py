"""Media model — site photos and documents uploaded via QR hub."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Media(Base):
    __tablename__ = "media"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    milestone_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("milestones.id"))

    # File info
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String(50))  # "image/jpeg", "application/pdf"
    file_name: Mapped[str | None] = mapped_column(String(255))

    # Upload source
    source: Mapped[str] = mapped_column(
        SAEnum("qr_upload", "sms_attachment", "dashboard_upload", name="media_source"),
        default="dashboard_upload",
    )
    uploaded_by_phone: Mapped[str | None] = mapped_column(String(50))

    # Vision analysis results
    vision_analysis: Mapped[dict | None] = mapped_column(JSONB)
    vision_match_score: Mapped[float | None] = mapped_column(Float)  # 0.0-1.0 confidence

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="media")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Media {self.file_name} for project={self.project_id}>"
