"""merge all heads for milestone 4

Revision ID: 9afc36ccab8c
Revises: ('b1c2d3e4f5a6', 'c8d9e0f1a2b3')
Create Date: 2026-08-26 05:53:15.453906

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9afc36ccab8c'
down_revision = ('b1c2d3e4f5a6', 'c8d9e0f1a2b3')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
