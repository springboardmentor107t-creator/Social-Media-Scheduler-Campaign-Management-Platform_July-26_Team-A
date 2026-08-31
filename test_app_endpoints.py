import os
import sys

sys.path.insert(0, os.getcwd())
sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

# Load dotenv
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

print("--- Testing App Endpoints via TestClient ---")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("\nCalling /health...")
try:
    res = client.get("/health")
    print("Health response:", res.status_code, res.json())
except Exception as e:
    print("Health failed:", e)

print("\nCalling /api/auth/login...")
try:
    res = client.post("/api/auth/login", json={
        "email": "alice@example.com",
        "password": "password123"
    })
    print("Login response:", res.status_code, res.json())
except Exception as e:
    print("Login failed:", e)
