"""add users table

Revision ID: 002_add_users_table
Revises: 001_initial_schema
Create Date: 2026-10-08 23:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_add_users_table"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("google_sub", sa.String(length=255), nullable=True),
        sa.Column("auth_provider", sa.String(length=32), nullable=False, server_default="google"),
        sa.Column("wca_id", sa.String(length=32), nullable=True),
        sa.Column("wca_name", sa.String(length=255), nullable=True),
        sa.Column("wca_avatar_url", sa.Text(), nullable=True),
        sa.Column("wca_country_iso2", sa.String(length=8), nullable=True),
        sa.Column("wca_delegate_status", sa.String(length=64), nullable=True),
        sa.Column("wca_profile_data", sa.JSON(), nullable=True),
        sa.Column("wca_access_token", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_google_sub"), "users", ["google_sub"], unique=False)
    op.create_index(op.f("ix_users_wca_id"), "users", ["wca_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_wca_id"), table_name="users")
    op.drop_index(op.f("ix_users_google_sub"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
