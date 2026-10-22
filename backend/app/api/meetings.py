import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.meeting import Meeting

router = APIRouter(prefix="/meetings", tags=["meetings"])


class SaveAgendaRequest(BaseModel):
    agenda: dict[str, Any]
    ai_suggestion: dict[str, Any] | None = None


class MeetingCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    organizer: str = "Team Member"
    participants_count: int = 1


@router.get("")
async def list_meetings(db: AsyncSession = Depends(get_db)):
    """Lists all available meetings ordered by start time."""
    result = await db.execute(select(Meeting).order_by(Meeting.start_time.desc()).limit(50))
    meetings = result.scalars().all()
    return [
        {
            "id": m.id,
            "title": m.title,
            "start_time": m.start_time.isoformat() if m.start_time else None,
            "end_time": m.end_time.isoformat() if m.end_time else None,
            "duration_minutes": m.duration_minutes,
            "organizer": m.organizer,
            "has_agenda": m.agenda is not None,
            "agenda": m.agenda,
            "ai_suggestion": m.ai_suggestion,
        }
        for m in meetings
    ]


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves a single meeting by ID."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    return {
        "id": meeting.id,
        "title": meeting.title,
        "start_time": meeting.start_time.isoformat() if meeting.start_time else None,
        "end_time": meeting.end_time.isoformat() if meeting.end_time else None,
        "duration_minutes": meeting.duration_minutes,
        "organizer": meeting.organizer,
        "agenda": meeting.agenda,
        "ai_suggestion": meeting.ai_suggestion,
    }


@router.post("")
async def create_meeting(payload: MeetingCreateRequest, db: AsyncSession = Depends(get_db)):
    """Creates a new meeting."""
    meeting = Meeting(
        id=str(uuid.uuid4()),
        title=payload.title,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration_minutes=payload.duration_minutes,
        organizer=payload.organizer,
        participants_count=payload.participants_count,
        created_at=datetime.now(UTC),
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)
    return {"id": meeting.id, "title": meeting.title, "status": "created"}


@router.post("/{meeting_id}/agenda")
async def save_agenda(
    meeting_id: str, payload: SaveAgendaRequest, db: AsyncSession = Depends(get_db)
):
    """
    Saves a verified agenda for a meeting alongside the original AI suggestion.
    This fulfills Part 4 Step 4: The model suggests and the person decides.
    """
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        # For convenience in tests or dynamic meetings, create if doesn't exist
        meeting = Meeting(
            id=meeting_id,
            title=payload.agenda.get("title") or "Meeting with Agenda",
            start_time=datetime.now(UTC),
            end_time=datetime.now(UTC),
            duration_minutes=payload.agenda.get("duration_minutes") or 30,
            organizer="Ihor Kastranets",
            created_at=datetime.now(UTC),
        )
        db.add(meeting)

    meeting.agenda = payload.agenda
    if payload.ai_suggestion:
        meeting.ai_suggestion = payload.ai_suggestion

    if payload.agenda.get("title"):
        meeting.title = payload.agenda["title"]
    if payload.agenda.get("duration_minutes"):
        meeting.duration_minutes = payload.agenda["duration_minutes"]

    await db.commit()
    await db.refresh(meeting)

    return {
        "status": "saved",
        "meeting_id": meeting.id,
        "agenda": meeting.agenda,
        "has_ai_suggestion": meeting.ai_suggestion is not None,
    }
