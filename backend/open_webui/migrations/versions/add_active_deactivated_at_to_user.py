"""add active and deactivated_at columns to user table

Revision ID: add_active_deactivated_at_to_user
Revises: d31026856c01
Create Date: 2026-01-16 09:01:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "add_active_deactivated_at_to_user"
down_revision = "d31026856c01"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("user", sa.Column("active", sa.Boolean(), server_default=sa.text("1"), nullable=False))
    op.add_column("user", sa.Column("deactivated_at", sa.BigInteger(), nullable=True))


def downgrade():
    op.drop_column("user", "active")
    op.drop_column("user", "deactivated_at")