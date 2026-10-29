"""add ai_suggestion column to badge_templates

Revision ID: 004_add_badge_ai_suggestion
Revises: 003_add_meetings_table
Create Date: 2026-10-29 17:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "004_add_badge_ai_suggestion"
down_revision: str | None = "003_add_meetings_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("badge_templates"):
        cols = [c["name"] for c in inspector.get_columns("badge_templates")]
        if "ai_suggestion" not in cols:
            op.add_column("badge_templates", sa.Column("ai_suggestion", sa.JSON(), nullable=True))

    if inspector.has_table("meetings"):
        m_cols = [c["name"] for c in inspector.get_columns("meetings")]
        if "agenda" not in m_cols:
            op.add_column("meetings", sa.Column("agenda", sa.JSON(), nullable=True))
        if "ai_suggestion" not in m_cols:
            op.add_column("meetings", sa.Column("ai_suggestion", sa.JSON(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("badge_templates"):
        cols = [c["name"] for c in inspector.get_columns("badge_templates")]
        if "ai_suggestion" in cols:
            op.drop_column("badge_templates", "ai_suggestion")
