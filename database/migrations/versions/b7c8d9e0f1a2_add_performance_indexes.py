"""add composite indexes for common database access paths

Revision ID: b7c8d9e0f1a2
Revises: f3e1c7b2a0b4
"""
from alembic import op


revision = "b7c8d9e0f1a2"
down_revision = "f3e1c7b2a0b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_contents_owner_created_at", "contents", ["owner_id", "created_at"])
    op.create_index("ix_scheduled_posts_status_time", "scheduled_posts", ["status", "scheduled_time"])
    op.create_index("ix_scheduled_posts_content_status", "scheduled_posts", ["content_id", "status"])
    op.create_index("ix_campaigns_owner_status", "campaigns", ["owner_id", "status"])
    op.create_index("ix_campaign_performance_campaign_date", "campaign_performance", ["campaign_id", "date"])
    op.create_index("ix_scheduled_post_metrics_post_recorded", "scheduled_post_metrics", ["scheduled_post_id", "recorded_at"])
    op.create_index("ix_audience_growth_account_date", "audience_growth", ["social_account_id", "date"])
    op.create_index("ix_audience_growth_campaign_date", "audience_growth", ["campaign_id", "date"])


def downgrade() -> None:
    for index_name, table_name in (
        ("ix_audience_growth_campaign_date", "audience_growth"),
        ("ix_audience_growth_account_date", "audience_growth"),
        ("ix_scheduled_post_metrics_post_recorded", "scheduled_post_metrics"),
        ("ix_campaign_performance_campaign_date", "campaign_performance"),
        ("ix_campaigns_owner_status", "campaigns"),
        ("ix_scheduled_posts_content_status", "scheduled_posts"),
        ("ix_scheduled_posts_status_time", "scheduled_posts"),
        ("ix_contents_owner_created_at", "contents"),
    ):
        op.drop_index(index_name, table_name=table_name)