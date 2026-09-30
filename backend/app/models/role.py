import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, JSON, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(64), primary_key=True, default=lambda: f"role-{uuid.uuid4().hex[:8]}")
    name = Column(String(100), nullable=False, unique=True)
    is_default = Column(Boolean, default=False, nullable=False)
    style = Column(
        JSON,
        nullable=False,
        default=lambda: {
            "font_family": "Inter",
            "font_size": 14,
            "font_weight": "600",
            "italic": False,
            "text_align": "center",
            "text_color": "#FFFFFF",
            "background_color": "#2563EB",
            "border_radius": 4.0,
            "border_width": 0.0,
            "border_color": "#000000",
            "opacity": 1.0,
        },
    )
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    competitors = relationship("Competitor", back_populates="role", lazy="selectin")
