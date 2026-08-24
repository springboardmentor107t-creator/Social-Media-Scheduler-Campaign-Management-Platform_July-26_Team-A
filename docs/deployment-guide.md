# Deployment Guide — SocialPilot

This document outlines the steps required to deploy the SocialPilot Lite platform to production environments.

---

## 🏗️ Production Environment Configuration

The application uses environment variables for all environment-specific configurations. Do not hardcode credentials in any config files.

### Backend Environment Variables (`.env.production`)

Ensure the following variables are set in your production hosting platform (e.g., Render, Heroku):

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `SECRET_KEY` | Hex-encoded key for signing JWT tokens | `generate-using-openssl-rand-hex-32` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `MONGODB_URL` | MongoDB Atlas / Server connection URL | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `ENVIRONMENT` | Deployment environment name | `production` |
| `CORS_ORIGINS` | Allowed frontend origins (comma separated) | `https://socialpilot.vercel.app` |
| `DB_POOL_SIZE` | SQLAlchemy connection pool size | `10` |
| `DB_MAX_OVERFLOW` | SQLAlchemy connection max overflow | `5` |

---

## 🚀 Deploying the Backend (Render)

Render is the recommended hosting platform for the FastAPI backend service.

### Prerequisites
1. A GitHub repository containing the project.
2. A database instance (e.g. Render Managed PostgreSQL or Supabase PostgreSQL).
3. A MongoDB instance (e.g. MongoDB Atlas Free Tier).

### Step 1: Create a PostgreSQL database on Render
1. Go to your Render Dashboard and click **New > PostgreSQL**.
2. Name the database, select a region, and choose the Free tier.
3. Once created, copy the **Internal Database URL** or **External Database URL**.

### Step 2: Create a MongoDB Atlas cluster
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free shared cluster.
2. Under Database Access, create a database user and password.
3. Under Network Access, whitelist all IPs (`0.0.0.0/0`) for cloud deployment.
4. Copy the application connection string (e.g., `mongodb+srv://...`).

### Step 3: Deploy Backend as Web Service
1. Click **New > Web Service** on Render.
2. Select your GitHub repository.
3. Set the following details:
   - **Name**: `socialpilot-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker` (Render will auto-detect the multi-stage `Dockerfile`)
   - **Plan**: `Free`
4. Expand the **Advanced** section and add the environment variables listed above.
5. Set the **Build Command** to:
   ```bash
   # Build is handled by Docker, but you can configure database migration runs
   python -m alembic -c ../database/migrations/alembic.ini upgrade head
   ```
6. Set the **Start Command** (if not defined in Dockerfile):
   `gunicorn -w 2 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT`
7. Click **Deploy Web Service**.

---

## 💻 Deploying the Frontend (Vercel)

Vercel provides seamless hosting for Vite React applications.

### Step 1: Configuration
Ensure `frontend/.env.production` has the backend URL:
```env
VITE_API_BASE_URL=https://socialpilot-backend.onrender.com
```

### Step 2: Deploy to Vercel
1. Go to the [Vercel Dashboard](https://vercel.com) and click **Add New > Project**.
2. Import your GitHub repository.
3. Set the configuration details:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `tsc && vite build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_BASE_URL` = `https://socialpilot-backend.onrender.com`
5. Click **Deploy**.

---

## 🐳 Self-Hosted Deployment (Docker Compose)

For running on a VPS or private server, use the included Docker Compose configuration.

```bash
# Clone the repository
git clone https://github.com/your-org/SocialPilot.git
cd Social-Media-Scheduler-Campaign-Management-Platform_July-26_Team-A

# Build and start all services in detached mode
docker compose up --build -d

# Check service health and logs
docker compose ps
docker compose logs -f backend
```
