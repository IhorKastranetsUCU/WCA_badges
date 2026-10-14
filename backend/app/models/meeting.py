import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String

from app.core.database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    participants_count = Column(Integer, nullable=False, default=1)
    organizer = Column(String(255), nullable=False, default="Team Member")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
