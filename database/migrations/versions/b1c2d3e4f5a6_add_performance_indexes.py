"""add_performance_indexes

Revision ID: b1c2d3e4f5a6
Revises: f3e1c7b2a0b4
Create Date: 2026-08-25

Adds composite and individual indexes on high-traffic query columns:
  - scheduled_posts(status, scheduled_time) — used by the background publisher on every poll
  - contents.owner_id — used by content list (per-user filter)
  - contents.status  — used by status filter in content list
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'b1c2d3e4f5a6'
down_revision = 'f3e1c7b2a0b4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Composite index for the background publisher's "due posts" query:
    # SELECT * FROM scheduled_posts WHERE status = 'pending' AND scheduled_time <= NOW()
    op.create_index(
        'ix_sp_status_scheduled_time',
        'scheduled_posts',
        ['status', 'scheduled_time'],
        unique=False,
    )

    # Index for content list per-user filter (contents.owner_id already has index=True
    # in the model, but create explicitly to ensure it exists on existing databases)
    op.create_index(
        'ix_contents_owner_id',
        'contents',
        ['owner_id'],
        unique=False,
        postgresql_where=sa.text("owner_id IS NOT NULL"),
    )

    # Index for content status filter
    op.create_index(
        'ix_contents_status',
        'contents',
        ['status'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_contents_status', table_name='contents')
    op.drop_index('ix_contents_owner_id', table_name='contents')
    op.drop_index('ix_sp_status_scheduled_time', table_name='scheduled_posts')
