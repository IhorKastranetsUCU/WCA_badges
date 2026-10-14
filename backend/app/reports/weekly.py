import asyncio
import csv
import io
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.database import Base
from app.models.meeting import Meeting

logger = logging.getLogger(__name__)


def parse_iso_week(week: str) -> tuple[datetime, datetime, datetime, datetime]:
    """
    Parses an ISO week string (e.g. "2026-W40") into:
    (start_of_current_week, end_of_current_week, start_of_prev_week, end_of_prev_week)
    All datetimes are in UTC with Monday 00:00:00 as start of week.
    """
    parts = week.strip().split("-W")
    if len(parts) != 2:
        raise ValueError(f"Invalid ISO week format '{week}'. Expected format like '2026-W40'.")
    year = int(parts[0])
    week_num = int(parts[1])

    start_curr = datetime.fromisocalendar(year, week_num, 1).replace(tzinfo=UTC)
    end_curr = start_curr + timedelta(days=7)

    start_prev = start_curr - timedelta(days=7)
    end_prev = start_curr

    return start_curr, end_curr, start_prev, end_prev


async def ensure_tables_and_seed(session: AsyncSession, engine) -> None:
    """Ensures meeting tables exist and seeds representative data if empty."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    result = await session.execute(select(Meeting.id).limit(1))
    if result.scalar_one_or_none() is not None:
        return

    logger.info(
        "Meetings table is empty. Seeding representative meetings data across recent weeks..."
    )
    sample_organizers = ["Ihor Kastranets", "Prof. OOAD", "Cloud Architect", "Frontend Lead"]

    now = datetime.now(UTC)
    current_year = now.year if now.year >= 2026 else 2026

    meetings_to_seed: list[Meeting] = []

    for w_idx in range(38, 45):
        try:
            week_start = datetime.fromisocalendar(current_year, w_idx, 1).replace(tzinfo=UTC)
        except ValueError:
            continue

        week_schedules = [
            ("Weekly Sprint Planning & Standup", 0, 9, 30, 60, 8, sample_organizers[0]),
            ("Architecture Review: SQS & S3 Event-Driven", 1, 14, 0, 90, 6, sample_organizers[1]),
            ("WCA Badge Layout & PDF Renderer Sync", 2, 11, 0, 45, 4, sample_organizers[0]),
            ("Cloud Cost & Aurora Serverless Deep Dive", 3, 15, 0, 120, 14, sample_organizers[2]),
            ("1:1 Architecture Mentorship", 3, 17, 30, 30, 2, sample_organizers[1]),
            ("Engineering Demo & Retrospective", 4, 16, 0, 75, 11, sample_organizers[3]),
        ]

        for title, day_offset, hour, minute, duration, participants, organizer in week_schedules:
            start_dt = week_start + timedelta(days=day_offset, hours=hour, minutes=minute)
            end_dt = start_dt + timedelta(minutes=duration)
            meetings_to_seed.append(
                Meeting(
                    title=title,
                    start_time=start_dt,
                    end_time=end_dt,
                    duration_minutes=duration,
                    participants_count=participants,
                    organizer=organizer,
                )
            )

    session.add_all(meetings_to_seed)
    await session.commit()
    logger.info("Successfully seeded %d meetings.", len(meetings_to_seed))


async def _query_meetings_for_range(
    session: AsyncSession, start_dt: datetime, end_dt: datetime
) -> list[Meeting]:
    stmt = (
        select(Meeting)
        .where(Meeting.start_time >= start_dt, Meeting.start_time < end_dt)
        .order_by(Meeting.duration_minutes.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def _build_weekly_report_async(week: str) -> bytes:
    start_curr, end_curr, start_prev, end_prev = parse_iso_week(week)

    # Use NullPool to avoid event-loop connection binding across multiple runs
    db_url = settings.effective_database_url
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("sqlite://") and not db_url.startswith("sqlite+aiosqlite://"):
        db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}
    scoped_engine = create_async_engine(db_url, poolclass=NullPool, connect_args=connect_args)
    scoped_session_factory = async_sessionmaker(
        bind=scoped_engine, class_=AsyncSession, expire_on_commit=False
    )

    try:
        async with scoped_session_factory() as session:
            await ensure_tables_and_seed(session, scoped_engine)
            curr_meetings = await _query_meetings_for_range(session, start_curr, end_curr)
            prev_meetings = await _query_meetings_for_range(session, start_prev, end_prev)
            await session.commit()
    finally:
        await scoped_engine.dispose()
        await asyncio.sleep(0.05)

    # 1. Metrics required by lab:
    curr_count = len(curr_meetings)
    curr_duration_hours = round(sum(m.duration_minutes for m in curr_meetings) / 60.0, 2)

    prev_count = len(prev_meetings)
    prev_duration_hours = round(sum(m.duration_minutes for m in prev_meetings) / 60.0, 2)

    delta_count = curr_count - prev_count
    delta_duration = round(curr_duration_hours - prev_duration_hours, 2)

    pct_count_str = f"{(delta_count / prev_count) * 100:+.1f}%" if prev_count > 0 else "N/A"
    pct_dur_str = (
        f"{(delta_duration / prev_duration_hours) * 100:+.1f}%"
        if prev_duration_hours > 0
        else "N/A"
    )

    # 2. Five longest meetings: title, start, duration, number of participants, organizer
    top_5_longest = sorted(curr_meetings, key=lambda m: m.duration_minutes, reverse=True)[:5]

    # 3. Breakdown per person / organizer
    organizer_stats: dict[str, dict[str, Any]] = {}
    for m in curr_meetings:
        org = m.organizer or "Unknown"
        if org not in organizer_stats:
            organizer_stats[org] = {"count": 0, "total_minutes": 0}
        organizer_stats[org]["count"] += 1
        organizer_stats[org]["total_minutes"] += m.duration_minutes

    # Build CSV output
    output = io.StringIO()
    writer = csv.writer(output)

    # Header / Meta
    writer.writerow(["# Spry Weekly Meetings Report", week])
    writer.writerow([])

    # Section 1: Summary KPI Comparison
    writer.writerow(["SECTION 1: WEEKLY SUMMARY & MOMENTUM COMPARISON"])
    writer.writerow(
        ["Metric", f"This Week ({week})", "Previous Week", "Absolute Change", "Percent Change"]
    )
    writer.writerow(
        ["Total Meetings Count", curr_count, prev_count, f"{delta_count:+d}", pct_count_str]
    )
    writer.writerow(
        [
            "Total Duration (Hours)",
            f"{curr_duration_hours:.2f}",
            f"{prev_duration_hours:.2f}",
            f"{delta_duration:+.2f}",
            pct_dur_str,
        ]
    )
    writer.writerow([])

    # Section 2: Top 5 Longest Meetings
    writer.writerow(["SECTION 2: TOP 5 LONGEST MEETINGS"])
    writer.writerow(
        ["Rank", "Title", "Start Time (UTC)", "Duration (Hours)", "Participants", "Organizer"]
    )
    if top_5_longest:
        for idx, m in enumerate(top_5_longest, start=1):
            writer.writerow(
                [
                    idx,
                    m.title,
                    m.start_time.isoformat(),
                    f"{m.duration_minutes / 60.0:.2f}",
                    m.participants_count,
                    m.organizer,
                ]
            )
    else:
        writer.writerow(["-", "No meetings scheduled for this week", "-", "-", "-", "-"])
    writer.writerow([])

    # Section 3: Breakdown per Person / Organizer
    writer.writerow(["SECTION 3: BREAKDOWN PER ORGANIZER / MEMBER"])
    writer.writerow(
        ["Organizer", "Meetings Count", "Total Duration (Hours)", "Average Duration (Minutes)"]
    )
    if organizer_stats:
        for org, data in sorted(
            organizer_stats.items(), key=lambda x: x[1]["total_minutes"], reverse=True
        ):
            avg_min = round(data["total_minutes"] / data["count"], 1) if data["count"] > 0 else 0
            writer.writerow(
                [
                    org,
                    data["count"],
                    f"{data['total_minutes'] / 60.0:.2f}",
                    f"{avg_min:.1f}",
                ]
            )
    else:
        writer.writerow(["-", "0", "0.00", "0.0"])

    return output.getvalue().encode("utf-8")


def build_weekly_report(week: str) -> bytes:
    """
    Query the meetings of one ISO week (e.g. "2026-W40") and return the CSV.
    Synchronous interface conforming to the lab contract.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(lambda: asyncio.run(_build_weekly_report_async(week))).result()
    else:
        return asyncio.run(_build_weekly_report_async(week))
