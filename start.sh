#!/usr/bin/env bash

echo "========================================================"
echo "       🚀 Starting SocialPilot Platform Services"
echo "========================================================"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "[1/3] Starting Docker Compose services (PostgreSQL, MongoDB, Redis)..."
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    docker compose up -d postgres mongodb redis
elif command -v docker-compose &> /dev/null; then
    docker-compose up -d postgres mongodb redis
else
    echo "Warning: docker command not found. Skipping container initialization."
fi

echo ""
echo "[2/3] Launching Backend FastAPI..."
if [ -d "backend/venv" ]; then
    source backend/venv/bin/activate 2>/dev/null || source backend/venv/Scripts/activate 2>/dev/null
elif [ -d "backend/.venv" ]; then
    source backend/.venv/bin/activate 2>/dev/null || source backend/.venv/Scripts/activate 2>/dev/null
fi

(cd backend && uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!

echo ""
echo "[3/3] Launching Frontend React App..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "Stopping background services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "========================================================"
echo "  ✅ SocialPilot is running!"
echo ""
echo "  🌐 Frontend App:      http://localhost:5173"
echo "  ⚙️  Backend API:       http://localhost:8000"
echo "  📚 API Documentation: http://localhost:8000/docs"
echo "========================================================"
echo "Press Ctrl+C to stop all servers."
echo ""

wait
