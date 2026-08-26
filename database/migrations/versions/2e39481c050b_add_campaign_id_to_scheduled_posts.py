"""add campaign_id to scheduled_posts

Revision ID: 2e39481c050b
Revises: 9afc36ccab8c
Create Date: 2026-08-26 05:57:41.192001

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2e39481c050b'
down_revision = '9afc36ccab8c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('scheduled_posts', sa.Column('campaign_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_scheduled_posts_campaign_id', 'scheduled_posts', 'campaigns', ['campaign_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_scheduled_posts_campaign_id'), 'scheduled_posts', ['campaign_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_scheduled_posts_campaign_id'), table_name='scheduled_posts')
    op.drop_constraint('fk_scheduled_posts_campaign_id', 'scheduled_posts', type_='foreignkey')
    op.drop_column('scheduled_posts', 'campaign_id')

