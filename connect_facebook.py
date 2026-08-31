import os
import sys

# Add backend directory to Python path
sys.path.insert(0, os.getcwd())
sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from database.postgresql.connection import SessionLocal
from database.postgresql.models import User, SocialAccount
from app.services.facebook_service import FacebookService
from app.repositories.facebook_repository import FacebookRepository

DEFAULT_TOKEN = (
    "EAAXrQ6hIQlsBSULWcD4JHSGmDobq84A2aQXY0wEWhfGOKcwQp6O2x2VD1TcfX53JXe7Q02"
    "xzVhLEg65t4o6TXdfcOgdungAR8ZCluCh15awSqFqjNizx7jhyIq1zlCnYj4UmLjPRocTJC"
    "6wkrqnlNzNvbO4lI1W0uWxojYls9ajpvgpKas7NHFoKk0ZCEcslbwDc4XLKLFOPMJ6T0ZAq"
    "861QnCLD4wQaNA1wEDjpHR07ZCxQxtSxlN5ZCZCzM0A5CbyZC7zobXAZC4zfGqIZBwSgwJo"
    "2YmqlIdxweidBoNhGvfLRv5V9ZA96p4TuleCZCaSSj9i7SvUWhYr"
)

def main():
    token = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_TOKEN

    db = SessionLocal()
    repo = FacebookRepository(db)
    service = FacebookService(repo)

    try:
        # Find user
        user = db.query(User).filter(User.email == "alice@example.com").first()
        if not user:
            print("Error: alice@example.com demo user not found. Please seed the database first.")
            sys.exit(1)

        print("Connecting to Facebook Graph API...")
        
        # Fetch Facebook Profile
        profile = service.fetch_user_profile(token)
        fb_id = profile["facebook_id"]
        name = profile["name"]
        email = profile.get("email")
        print(f"Successfully fetched Facebook profile: {name} (ID: {fb_id})")

        # Fetch Pages managed by this user
        print("Fetching Facebook Pages...")
        pages_data = service.fetch_user_pages(token)
        print(f"Found {len(pages_data)} pages managed by the user:")
        for idx, p in enumerate(pages_data, 1):
            print(f"  {idx}. {p['page_name']} (ID: {p['page_id']})")

        # Upsert FacebookAccount
        account = repo.create_or_update_account(
            user_id=user.id,
            facebook_id=fb_id,
            name=name,
            email=email,
            access_token=token
        )

        # Sync FacebookPages
        repo.sync_account_pages(account.id, pages_data)

        # Upsert global SocialAccount mapping
        social_acc = db.query(SocialAccount).filter(
            SocialAccount.user_id == user.id,
            SocialAccount.provider == "facebook",
            SocialAccount.provider_account_id == fb_id
        ).first()

        if not social_acc:
            social_acc = SocialAccount(
                user_id=user.id,
                provider="facebook",
                provider_account_id=fb_id,
                account_name=name,
                access_token=token,
                is_active=True
            )
            db.add(social_acc)
        else:
            social_acc.account_name = name
            social_acc.access_token = token
            social_acc.is_active = True
        
        db.commit()
        print("\nSUCCESS: Facebook account and pages linked to your user in the database!")
        print("You can now view it as 'Connected' in the SocialPilot Connect Accounts page.")

    except Exception as e:
        print(f"\nFailed to connect Facebook account: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
