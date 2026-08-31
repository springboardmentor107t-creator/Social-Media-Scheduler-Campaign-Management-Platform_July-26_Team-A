import os
import sys

sys.path.insert(0, os.getcwd())
sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from database.postgresql.connection import SessionLocal
from database.postgresql.models import SocialAccount
from app.models.facebook import FacebookAccount, FacebookPage

db = SessionLocal()
try:
    print("--- facebook_accounts ---")
    accounts = db.query(FacebookAccount).all()
    for acc in accounts:
        print(acc.id, acc.user_id, acc.facebook_id, acc.name, acc.email, acc.access_token[:10] + "...")

    print("\n--- facebook_pages ---")
    pages = db.query(FacebookPage).all()
    for page in pages:
        print(page.id, page.facebook_account_id, page.page_id, page.page_name, page.category)

    print("\n--- social_accounts (facebook) ---")
    socials = db.query(SocialAccount).filter(SocialAccount.provider == "facebook").all()
    for s in socials:
        print(s.id, s.user_id, s.provider, s.provider_account_id, s.account_name, s.access_token[:10] + "...")
finally:
    db.close()
