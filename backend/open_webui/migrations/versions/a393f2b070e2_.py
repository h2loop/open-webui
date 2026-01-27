"""empty message

Revision ID: a393f2b070e2
Revises: a5c220713937, add_active_deactivated_at_to_user
Create Date: 2026-01-27 16:55:51.462752

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import open_webui.internal.db


# revision identifiers, used by Alembic.
revision: str = 'a393f2b070e2'
down_revision: Union[str, None] = ('a5c220713937', 'add_active_deactivated_at_to_user')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
