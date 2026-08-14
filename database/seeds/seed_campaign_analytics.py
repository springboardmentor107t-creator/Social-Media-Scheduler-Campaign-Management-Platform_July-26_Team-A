import os
import sys
from datetime import datetime, timedelta

# Add project root to python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from database.postgresql.connection import get_session
from database.postgresql.models import Campaign, CampaignContent, CampaignPerformance, AudienceGrowth, Content, SocialAccount, User


def seed_campaign_analytics():
    session = get_session()
    try:
        print("Starting campaign and analytics database seeding...")

        # Find a sample user and social account for seeding.
        owner = session.query(User).first()
        social_account = session.query(SocialAccount).first()
        content_item = session.query(Content).first()

        if not owner or not social_account or not content_item:
            raise RuntimeError("Seed campaign analytics requires existing user, social account, and content records.")

        campaign = session.query(Campaign).filter_by(title="Spring Product Launch").first()
        if not campaign:
            campaign = Campaign(
                owner_id=owner.id,
                title="Spring Product Launch",
                description="A campaign to promote the spring product line across social media channels.",
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=30),
                status="active",
                objective="Increase brand awareness and generate lead conversions",
                budget=8500.00,
            )
            session.add(campaign)
            session.flush()
        else:
            print("Using existing campaign record.")

        campaign_content = session.query(CampaignContent).filter_by(campaign_id=campaign.id, content_id=content_item.id).first()
        if not campaign_content:
            campaign_content = CampaignContent(
                campaign_id=campaign.id,
                content_id=content_item.id,
                sequence=1,
                notes="Primary campaign content for spring launch posts.",
            )
            session.add(campaign_content)

        performance_rows = session.query(CampaignPerformance).filter_by(campaign_id=campaign.id).count()
        if performance_rows == 0:
            session.add_all([
                CampaignPerformance(
                    campaign_id=campaign.id,
                    date=datetime.utcnow() - timedelta(days=3),
                    impressions=4700,
                    reach=3500,
                    clicks=280,
                    engagements=380,
                    likes=180,
                    comments=45,
                    shares=20,
                    conversions=12,
                    cost=120.50,
                ),
                CampaignPerformance(
                    campaign_id=campaign.id,
                    date=datetime.utcnow() - timedelta(days=2),
                    impressions=5300,
                    reach=3900,
                    clicks=310,
                    engagements=420,
                    likes=210,
                    comments=60,
                    shares=28,
                    conversions=18,
                    cost=142.75,
                ),
            ])

        growth_rows = session.query(AudienceGrowth).filter_by(social_account_id=social_account.id, campaign_id=campaign.id).count()
        if growth_rows == 0:
            session.add_all([
                AudienceGrowth(
                    social_account_id=social_account.id,
                    campaign_id=campaign.id,
                    date=datetime.utcnow() - timedelta(days=3),
                    followers=8350,
                    follower_change=45,
                    audience_demographics={"region": {"NA": 63, "EU": 22, "APAC": 15}},
                ),
                AudienceGrowth(
                    social_account_id=social_account.id,
                    campaign_id=campaign.id,
                    date=datetime.utcnow() - timedelta(days=2),
                    followers=8398,
                    follower_change=48,
                    audience_demographics={"region": {"NA": 61, "EU": 24, "APAC": 15}},
                ),
            ])

        session.commit()
        print("Campaign analytics seeding completed successfully.")
    except Exception as e:
        session.rollback()
        print(f"Error during campaign analytics seeding: {e}", file=sys.stderr)
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    seed_campaign_analytics()
