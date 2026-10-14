"""add meetings table

Revision ID: 003_add_meetings_table
Revises: 002_add_users_table
Create Date: 2026-10-14 20:25:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "003_add_meetings_table"
down_revision: str | None = "002_add_users_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "meetings",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("participants_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("organizer", sa.String(length=255), nullable=False, server_default="Team Member"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_meetings_start_time"), "meetings", ["start_time"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_meetings_start_time"), table_name="meetings")
    op.drop_table("meetings")
