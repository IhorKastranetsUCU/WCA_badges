"""initial schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-30 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. roles table
    op.create_table(
        "roles",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("style", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 2. competitors table
    op.create_table(
        "competitors",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("csv_index", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("name_latin", sa.String(length=200), nullable=False),
        sa.Column("name_local", sa.String(length=200), nullable=True),
        sa.Column("name_raw", sa.String(length=400), nullable=False),
        sa.Column("wca_id", sa.String(length=32), nullable=True),
        sa.Column("country_iso2", sa.String(length=8), nullable=True),
        sa.Column("country_name", sa.String(length=100), nullable=True),
        sa.Column("role_id", sa.String(length=64), sa.ForeignKey("roles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_competitors_wca_id"), "competitors", ["wca_id"], unique=False)

    # 3. badge_templates table
    op.create_table(
        "badge_templates",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("dimensions", sa.JSON(), nullable=False),
        sa.Column("sides", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("badge_templates")
    op.drop_index(op.f("ix_competitors_wca_id"), table_name="competitors")
    op.drop_table("competitors")
    op.drop_table("roles")
