@echo off
TITLE SocialPilot Launcher
echo ========================================================
echo        🚀 Starting SocialPilot Platform Services
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Docker Compose services (PostgreSQL, MongoDB, Redis)...
docker compose up -d postgres mongodb redis >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    docker-compose up -d postgres mongodb redis >nul 2>&1
)

echo.
echo [2/3] Launching FastAPI Backend Server (Port 8000)...
start "SocialPilot Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

echo.
echo [3/3] Launching Vite React Frontend Server (Port 5173)...
start "SocialPilot Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo  ✅ SocialPilot is starting!
echo.
echo  🌐 Frontend App:      http://localhost:5173
echo  ⚙️  Backend API:       http://localhost:8000
echo  📚 API Documentation: http://localhost:8000/docs
echo ========================================================
echo.
pause
