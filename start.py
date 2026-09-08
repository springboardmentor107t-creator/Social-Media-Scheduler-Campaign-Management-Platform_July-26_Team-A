import os
import sys
import subprocess
import threading
import time

def stream_output(process, prefix):
    try:
        for line in iter(process.stdout.readline, ''):
            if line:
                print(f"[{prefix}] {line.strip()}")
    except Exception:
        pass

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("========================================================")
    print("       🚀 Starting SocialPilot Platform Services")
    print("========================================================")
    print()

    # Try starting docker compose
    print("[1/3] Checking Docker Compose services (PostgreSQL, MongoDB, Redis)...")
    try:
        subprocess.run(["docker", "compose", "up", "-d", "postgres", "mongodb", "redis"], cwd=root_dir, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        try:
            subprocess.run(["docker-compose", "up", "-d", "postgres", "mongodb", "redis"], cwd=root_dir, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

    # Find venv python / uvicorn
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = sys.executable

    print("[2/3] Launching FastAPI Backend on http://localhost:8000 ...")
    backend_cmd = [venv_python, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    print("[3/3] Launching Vite Frontend on http://localhost:5173 ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    print()
    print("========================================================")
    print("  ✅ SocialPilot is running!")
    print("  🌐 Frontend App:      http://localhost:5173")
    print("  ⚙️  Backend API:       http://localhost:8000")
    print("  📚 API Documentation: http://localhost:8000/docs")
    print("========================================================")
    print("  Press Ctrl+C to stop all services.")
    print()

    t1 = threading.Thread(target=stream_output, args=(backend_proc, "BACKEND"), daemon=True)
    t2 = threading.Thread(target=stream_output, args=(frontend_proc, "FRONTEND"), daemon=True)
    t1.start()
    t2.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
