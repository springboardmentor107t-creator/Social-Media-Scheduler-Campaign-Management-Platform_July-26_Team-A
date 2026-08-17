import uuid
from datetime import datetime, timedelta

from sqlalchemy import text

from database.postgresql.connection import SessionLocal
from database.postgresql.models import (
    AudienceGrowth,
    Campaign,
    CampaignContent,
    CampaignPerformance,
    Content,
    ContentStatus,
    ContentType,
    PublishingLog,
    PublishingStatus,
    RoleReference,
    ScheduledPost,
    ScheduledPostMetrics,
    ScheduledPostStatus,
    SocialAccount,
    User,
    UserRole,
    CampaignStatus,
)


def reset_tables(session):
    tables = [
        "publishing_logs",
        "scheduled_post_metrics",
        "audience_growth",
        "campaign_contents",
        "campaign_performance",
        "scheduled_posts",
        "campaigns",
        "contents",
        "social_accounts",
        "users",
        "role_reference",
    ]
    for table in tables:
        session.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
    session.commit()


def seed_all():
    session = SessionLocal()
    try:
        reset_tables(session)

        users = [
            User(
                email="alice@example.com",
                username="alice_demo",
                full_name="Alice Demo",
                password_hash="hashed_password_1",
                is_active=True,
                role=UserRole.USER,
                phone_number="+15550000001",
                timezone="UTC",
                bio="Content creator.",
                avatar_url="https://example.com/a.png",
                notification_preferences={"email": True, "push": True},
            ),
            User(
                email="bob@example.com",
                username="bob_demo",
                full_name="Bob Demo",
                password_hash="hashed_password_2",
                is_active=True,
                role=UserRole.MANAGER,
                phone_number="+15550000002",
                timezone="UTC",
                bio="Marketing manager.",
                avatar_url="https://example.com/b.png",
                notification_preferences={"email": True, "push": False},
            ),
            User(
                email="charlie@example.com",
                username="charlie_demo",
                full_name="Charlie Demo",
                password_hash="hashed_password_3",
                is_active=True,
                role=UserRole.ADMIN,
                phone_number="+15550000003",
                timezone="UTC",
                bio="Platform administrator.",
                avatar_url="https://example.com/c.png",
                notification_preferences={"email": True, "push": True},
            ),
        ]
        session.add_all(users)
        session.flush()

        social_accounts = [
            SocialAccount(
                user_id=users[0].id,
                provider="instagram",
                provider_account_id="ig_001",
                account_name="Alice IG",
                access_token="token_ig_1",
                refresh_token="refresh_ig_1",
                is_active=True,
                last_sync_time=datetime.utcnow(),
            ),
            SocialAccount(
                user_id=users[1].id,
                provider="facebook",
                provider_account_id="fb_001",
                account_name="Bob FB",
                access_token="token_fb_1",
                refresh_token="refresh_fb_1",
                is_active=True,
                last_sync_time=datetime.utcnow(),
            ),
            SocialAccount(
                user_id=users[2].id,
                provider="youtube",
                provider_account_id="yt_001",
                account_name="Charlie YT",
                access_token="token_yt_1",
                refresh_token="refresh_yt_1",
                is_active=True,
                last_sync_time=datetime.utcnow(),
            ),
        ]
        session.add_all(social_accounts)
        session.flush()

        contents = [
            Content(
                owner_id=users[0].id,
                title="Launch Post 1",
                body="Creative teaser campaign content.",
                media_urls=["https://example.com/post1.jpg"],
                content_type=ContentType.IMAGE,
                status=ContentStatus.APPROVED,
                is_approved=True,
            ),
            Content(
                owner_id=users[1].id,
                title="Launch Post 2",
                body="Product reminder campaign content.",
                media_urls=["https://example.com/post2.mp4"],
                content_type=ContentType.VIDEO,
                status=ContentStatus.PENDING_APPROVAL,
                is_approved=False,
            ),
            Content(
                owner_id=users[2].id,
                title="Launch Post 3",
                body="Brand announcement content.",
                media_urls=["https://example.com/post3.png"],
                content_type=ContentType.CAROUSEL,
                status=ContentStatus.APPROVED,
                is_approved=True,
            ),
        ]
        session.add_all(contents)
        session.flush()

        campaigns = [
            Campaign(
                owner_id=users[0].id,
                title="Spring Product Launch",
                description="Promote the spring product line across selected channels.",
                status=CampaignStatus.ACTIVE,
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=25),
                budget="$5000",
                spent="$1200",
                target_audience="Fitness enthusiasts",
                platforms=["instagram", "facebook"],
                kpis={"target_impressions": 200000, "target_clicks": 5000},
                objective="Increase product awareness",
            ),
            Campaign(
                owner_id=users[1].id,
                title="Customer Retention Push",
                description="Retarget warm leads with loyalty offers.",
                status=CampaignStatus.SCHEDULED,
                start_date=datetime.utcnow() + timedelta(days=2),
                end_date=datetime.utcnow() + timedelta(days=18),
                budget="$3500",
                spent="$500",
                target_audience="Returning customers",
                platforms=["facebook"],
                kpis={"target_impressions": 120000, "target_clicks": 3500},
                objective="Boost repeat purchases",
            ),
            Campaign(
                owner_id=users[2].id,
                title="Brand Awareness Boost",
                description="Top-of-funnel awareness campaign for new audiences.",
                status=CampaignStatus.DRAFT,
                start_date=datetime.utcnow() + timedelta(days=5),
                end_date=datetime.utcnow() + timedelta(days=30),
                budget="$7000",
                spent="$0",
                target_audience="General audience",
                platforms=["youtube", "instagram"],
                kpis={"target_impressions": 300000, "target_clicks": 6000},
                objective="Expand brand reach",
            ),
        ]
        session.add_all(campaigns)
        session.flush()

        scheduled_posts = [
            ScheduledPost(
                campaign_id=campaigns[0].id,
                content_id=contents[0].id,
                social_account_id=social_accounts[0].id,
                scheduled_time=datetime.utcnow() + timedelta(days=1),
                is_recurring=False,
                recurrence_rule=None,
                status=ScheduledPostStatus.PENDING,
            ),
            ScheduledPost(
                campaign_id=campaigns[1].id,
                content_id=contents[1].id,
                social_account_id=social_accounts[1].id,
                scheduled_time=datetime.utcnow() + timedelta(days=3),
                is_recurring=True,
                recurrence_rule="FREQ=DAILY;COUNT=3",
                status=ScheduledPostStatus.PROCESSING,
            ),
            ScheduledPost(
                campaign_id=campaigns[2].id,
                content_id=contents[2].id,
                social_account_id=social_accounts[2].id,
                scheduled_time=datetime.utcnow() + timedelta(days=6),
                is_recurring=False,
                recurrence_rule=None,
                status=ScheduledPostStatus.PUBLISHED,
            ),
        ]
        session.add_all(scheduled_posts)
        session.flush()

        publishing_logs = [
            PublishingLog(
                scheduled_post_id=scheduled_posts[0].id,
                social_account_id=social_accounts[0].id,
                status=PublishingStatus.SUCCESS,
                error_message=None,
            ),
            PublishingLog(
                scheduled_post_id=scheduled_posts[1].id,
                social_account_id=social_accounts[1].id,
                status=PublishingStatus.SUCCESS,
                error_message=None,
            ),
            PublishingLog(
                scheduled_post_id=scheduled_posts[2].id,
                social_account_id=social_accounts[2].id,
                status=PublishingStatus.FAILED,
                error_message="Rate limit reached",
            ),
        ]
        session.add_all(publishing_logs)
        session.flush()

        campaign_contents = [
            CampaignContent(campaign_id=campaigns[0].id, content_id=contents[0].id, sequence=1, notes="Primary asset"),
            CampaignContent(campaign_id=campaigns[1].id, content_id=contents[1].id, sequence=1, notes="Retention creative"),
            CampaignContent(campaign_id=campaigns[2].id, content_id=contents[2].id, sequence=1, notes="Awareness spotlight"),
        ]
        session.add_all(campaign_contents)
        session.flush()

        campaign_performance = [
            CampaignPerformance(
                campaign_id=campaigns[0].id,
                date=datetime.utcnow() - timedelta(days=2),
                impressions=18000,
                reach=12000,
                clicks=1500,
                engagements=900,
                likes=400,
                comments=50,
                shares=60,
                conversions=120,
                cost=340.00,
            ),
            CampaignPerformance(
                campaign_id=campaigns[1].id,
                date=datetime.utcnow() - timedelta(days=5),
                impressions=14000,
                reach=9800,
                clicks=1100,
                engagements=760,
                likes=310,
                comments=42,
                shares=52,
                conversions=95,
                cost=280.00,
            ),
            CampaignPerformance(
                campaign_id=campaigns[2].id,
                date=datetime.utcnow() - timedelta(days=7),
                impressions=24000,
                reach=16000,
                clicks=1900,
                engagements=1100,
                likes=520,
                comments=77,
                shares=90,
                conversions=140,
                cost=410.50,
            ),
        ]
        session.add_all(campaign_performance)
        session.flush()

        scheduled_post_metrics = [
            ScheduledPostMetrics(
                scheduled_post_id=scheduled_posts[0].id,
                recorded_at=datetime.utcnow() - timedelta(hours=2),
                views=5000,
                likes=220,
                comments=30,
                shares=18,
                saves=15,
                clicks=130,
                ctr=0.026,
                engagement_rate=0.075,
                reach=4200,
                impressions=5000,
            ),
            ScheduledPostMetrics(
                scheduled_post_id=scheduled_posts[1].id,
                recorded_at=datetime.utcnow() - timedelta(hours=4),
                views=4200,
                likes=180,
                comments=25,
                shares=16,
                saves=14,
                clicks=110,
                ctr=0.026,
                engagement_rate=0.072,
                reach=3600,
                impressions=4200,
            ),
            ScheduledPostMetrics(
                scheduled_post_id=scheduled_posts[2].id,
                recorded_at=datetime.utcnow() - timedelta(hours=1),
                views=6800,
                likes=310,
                comments=41,
                shares=28,
                saves=18,
                clicks=180,
                ctr=0.026,
                engagement_rate=0.082,
                reach=5600,
                impressions=6800,
            ),
        ]
        session.add_all(scheduled_post_metrics)
        session.flush()

        audience_growth = [
            AudienceGrowth(
                social_account_id=social_accounts[0].id,
                campaign_id=campaigns[0].id,
                date=datetime.utcnow() - timedelta(days=2),
                followers=12500,
                follower_change=180,
                audience_demographics={"region": {"NA": 50, "EU": 30, "APAC": 20}},
            ),
            AudienceGrowth(
                social_account_id=social_accounts[1].id,
                campaign_id=campaigns[1].id,
                date=datetime.utcnow() - timedelta(days=4),
                followers=9800,
                follower_change=120,
                audience_demographics={"region": {"NA": 60, "EU": 25, "APAC": 15}},
            ),
            AudienceGrowth(
                social_account_id=social_accounts[2].id,
                campaign_id=campaigns[2].id,
                date=datetime.utcnow() - timedelta(days=6),
                followers=15300,
                follower_change=210,
                audience_demographics={"region": {"NA": 45, "EU": 35, "APAC": 20}},
            ),
        ]
        session.add_all(audience_growth)
        session.flush()

        role_reference = [
            RoleReference(
                role_label="Content Creator",
                description="Creates and schedules content for social channels.",
                key_responsibilities=["Create posts", "Schedule publications", "Review analytics"],
                maps_to_auth_role="user",
            ),
            RoleReference(
                role_label="Marketing Manager",
                description="Manages campaigns and marketing performance.",
                key_responsibilities=["Review goals", "Approve schedules", "Optimize campaigns"],
                maps_to_auth_role="manager",
            ),
            RoleReference(
                role_label="Platform Admin",
                description="Administers platform access and account health.",
                key_responsibilities=["Manage users", "Review access", "Monitor billing"],
                maps_to_auth_role="admin",
            ),
        ]
        session.add_all(role_reference)
        session.commit()

        print("Sample data inserted successfully for all tables.")
        return {
            "users": session.query(User).count(),
            "social_accounts": session.query(SocialAccount).count(),
            "contents": session.query(Content).count(),
            "campaigns": session.query(Campaign).count(),
            "scheduled_posts": session.query(ScheduledPost).count(),
            "publishing_logs": session.query(PublishingLog).count(),
            "campaign_contents": session.query(CampaignContent).count(),
            "campaign_performance": session.query(CampaignPerformance).count(),
            "scheduled_post_metrics": session.query(ScheduledPostMetrics).count(),
            "audience_growth": session.query(AudienceGrowth).count(),
            "role_reference": session.query(RoleReference).count(),
        }
    finally:
        session.close()


if __name__ == "__main__":
    print(seed_all())
