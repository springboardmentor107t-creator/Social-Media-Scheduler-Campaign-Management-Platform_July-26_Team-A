"""add_contents_missing_columns

Revision ID: a1b2c3d4e5f6
Revises: f3e1c7b2a0b4
Create Date: 2026-08-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f3e1c7b2a0b4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    content_type_enum = sa.Enum('text', 'image', 'video', 'carousel', name='content_type')
    content_status_enum = sa.Enum('draft', 'pending_approval', 'approved', name='content_status')
    content_type_enum.create(op.get_bind(), checkfirst=True)
    content_status_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('contents', sa.Column('body', sa.Text(), nullable=True))
    op.add_column('contents', sa.Column('media_urls', sa.JSON(), nullable=True))
    op.add_column('contents', sa.Column('content_type', sa.Enum('text', 'image', 'video', 'carousel', name='content_type'), server_default='text', nullable=False))
    op.add_column('contents', sa.Column('status', sa.Enum('draft', 'pending_approval', 'approved', name='content_status'), server_default='draft', nullable=False))


def downgrade() -> None:
    op.drop_column('contents', 'status')
    op.drop_column('contents', 'content_type')
    op.drop_column('contents', 'media_urls')
    op.drop_column('contents', 'body')
