# SocialPilot PowerShell Starter Script
$Host.UI.RawUI.WindowTitle = "SocialPilot Launcher"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       🚀 Starting SocialPilot Platform Services" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "[1/3] Checking Docker Compose services (PostgreSQL, MongoDB, Redis)..." -ForegroundColor Yellow
try {
    docker compose up -d postgres mongodb redis 2>$null
} catch {
    docker-compose up -d postgres mongodb redis 2>$null
}

Write-Host ""
Write-Host "[2/3] Launching FastAPI Backend Server (Port 8000)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$ScriptDir\backend`" && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

Write-Host ""
Write-Host "[3/3] Launching Vite React Frontend Server (Port 5173)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$ScriptDir\frontend`" && npm run dev"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  ✅ SocialPilot is starting!" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Frontend App:      http://localhost:5173" -ForegroundColor White
Write-Host "  ⚙️  Backend API:       http://localhost:8000" -ForegroundColor White
Write-Host "  📚 API Documentation: http://localhost:8000/docs" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
