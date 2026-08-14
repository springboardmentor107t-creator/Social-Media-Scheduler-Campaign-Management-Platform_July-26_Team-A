"""add_campaign_management_and_analytics_tables

Revision ID: f3e1c7b2a0b4
Revises: ddc85c8af911
Create Date: 2026-08-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'f3e1c7b2a0b4'
down_revision = 'ddc85c8af911'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'campaigns',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('owner_id', UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'status',
            sa.Enum('planned', 'active', 'completed', 'paused', 'cancelled', name='campaign_status'),
            server_default='planned',
            nullable=False,
        ),
        sa.Column('objective', sa.String(length=255), nullable=True),
        sa.Column('budget', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_campaigns_owner_id'), 'campaigns', ['owner_id'], unique=False)

    op.create_table(
        'campaign_contents',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', UUID(as_uuid=True), nullable=False),
        sa.Column('content_id', UUID(as_uuid=True), nullable=False),
        sa.Column('sequence', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['content_id'], ['contents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_campaign_contents_campaign_id'), 'campaign_contents', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_campaign_contents_content_id'), 'campaign_contents', ['content_id'], unique=False)

    op.create_table(
        'campaign_performance',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('impressions', sa.Integer(), server_default='0', nullable=False),
        sa.Column('reach', sa.Integer(), server_default='0', nullable=False),
        sa.Column('clicks', sa.Integer(), server_default='0', nullable=False),
        sa.Column('engagements', sa.Integer(), server_default='0', nullable=False),
        sa.Column('likes', sa.Integer(), server_default='0', nullable=False),
        sa.Column('comments', sa.Integer(), server_default='0', nullable=False),
        sa.Column('shares', sa.Integer(), server_default='0', nullable=False),
        sa.Column('conversions', sa.Integer(), server_default='0', nullable=False),
        sa.Column('cost', sa.Float(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_campaign_performance_campaign_id'), 'campaign_performance', ['campaign_id'], unique=False)

    op.create_table(
        'scheduled_post_metrics',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('scheduled_post_id', UUID(as_uuid=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('views', sa.Integer(), server_default='0', nullable=False),
        sa.Column('likes', sa.Integer(), server_default='0', nullable=False),
        sa.Column('comments', sa.Integer(), server_default='0', nullable=False),
        sa.Column('shares', sa.Integer(), server_default='0', nullable=False),
        sa.Column('saves', sa.Integer(), server_default='0', nullable=False),
        sa.Column('clicks', sa.Integer(), server_default='0', nullable=False),
        sa.Column('ctr', sa.Float(), server_default='0', nullable=False),
        sa.Column('engagement_rate', sa.Float(), server_default='0', nullable=False),
        sa.Column('reach', sa.Integer(), server_default='0', nullable=False),
        sa.Column('impressions', sa.Integer(), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['scheduled_post_id'], ['scheduled_posts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_scheduled_post_metrics_scheduled_post_id'), 'scheduled_post_metrics', ['scheduled_post_id'], unique=False)

    op.create_table(
        'audience_growth',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('social_account_id', UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', UUID(as_uuid=True), nullable=True),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('followers', sa.Integer(), server_default='0', nullable=False),
        sa.Column('follower_change', sa.Integer(), server_default='0', nullable=False),
        sa.Column('audience_demographics', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['social_account_id'], ['social_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audience_growth_social_account_id'), 'audience_growth', ['social_account_id'], unique=False)
    op.create_index(op.f('ix_audience_growth_campaign_id'), 'audience_growth', ['campaign_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_audience_growth_campaign_id'), table_name='audience_growth')
    op.drop_index(op.f('ix_audience_growth_social_account_id'), table_name='audience_growth')
    op.drop_table('audience_growth')
    op.drop_index(op.f('ix_scheduled_post_metrics_scheduled_post_id'), table_name='scheduled_post_metrics')
    op.drop_table('scheduled_post_metrics')
    op.drop_index(op.f('ix_campaign_performance_campaign_id'), table_name='campaign_performance')
    op.drop_table('campaign_performance')
    op.drop_index(op.f('ix_campaign_contents_content_id'), table_name='campaign_contents')
    op.drop_index(op.f('ix_campaign_contents_campaign_id'), table_name='campaign_contents')
    op.drop_table('campaign_contents')
    op.drop_index(op.f('ix_campaigns_owner_id'), table_name='campaigns')
    op.drop_table('campaigns')
    sa.Enum('planned', 'active', 'completed', 'paused', 'cancelled', name='campaign_status').drop(op.get_bind(), checkfirst=True)
