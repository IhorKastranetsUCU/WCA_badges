import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Competitor(Base):
    __tablename__ = "competitors"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    csv_index = Column(Integer, nullable=False, default=1)
    name_latin = Column(String(200), nullable=False)
    name_local = Column(String(200), nullable=True)
    name_raw = Column(String(400), nullable=False)
    wca_id = Column(String(32), nullable=True, index=True)
    country_iso2 = Column(String(8), nullable=True)
    country_name = Column(String(100), nullable=True)
    role_id = Column(String(64), ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    role = relationship("Role", back_populates="competitors", lazy="selectin")
