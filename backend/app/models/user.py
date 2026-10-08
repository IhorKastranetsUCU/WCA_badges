import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, String, Text, JSON
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    avatar_url = Column(Text, nullable=True)
    google_sub = Column(String(255), nullable=True, index=True)
    auth_provider = Column(String(32), default="google", nullable=False)

    # WCA profile data preserved in database
    wca_id = Column(String(32), nullable=True, index=True)
    wca_name = Column(String(255), nullable=True)
    wca_avatar_url = Column(Text, nullable=True)
    wca_country_iso2 = Column(String(8), nullable=True)
    wca_delegate_status = Column(String(64), nullable=True)
    wca_profile_data = Column(JSON, nullable=True)
    wca_access_token = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
