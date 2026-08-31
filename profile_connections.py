import os
import sys
import time

sys.path.insert(0, os.getcwd())
sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

# Load dotenv
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

print("--- Profiling Database Connections ---")

# 1. Test Postgres
t0 = time.time()
print("Connecting to PostgreSQL...")
try:
    from sqlalchemy import create_engine
    db_url = os.getenv("DATABASE_URL")
    engine = create_engine(db_url, connect_args={"connect_timeout": 5})
    with engine.connect() as conn:
        res = conn.execute(create_engine("select 1").compile()).fetchall()
    print(f"PostgreSQL: SUCCESS in {time.time() - t0:.4f} seconds")
except Exception as e:
    print(f"PostgreSQL: FAILED in {time.time() - t0:.4f} seconds: {e}")

# 2. Test Redis
t0 = time.time()
print("Connecting to Redis...")
try:
    import redis
    # Parse redis url or use default
    r = redis.Redis(host='127.0.0.1', port=6379, socket_timeout=5)
    r.ping()
    print(f"Redis: SUCCESS in {time.time() - t0:.4f} seconds")
except Exception as e:
    print(f"Redis: FAILED in {time.time() - t0:.4f} seconds: {e}")

# 3. Test MongoDB
t0 = time.time()
print("Connecting to MongoDB...")
try:
    from pymongo import MongoClient
    mongo_url = os.getenv("MONGODB_URL")
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print(f"MongoDB: SUCCESS in {time.time() - t0:.4f} seconds")
except Exception as e:
    print(f"MongoDB: FAILED in {time.time() - t0:.4f} seconds: {e}")
