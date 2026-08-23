# 🚀 SocialPilot – Social Media Scheduler & Campaign Management Platform

A centralized, enterprise-grade social media management platform designed to help individuals, businesses, content creators, and marketing teams efficiently manage, schedule, analyze, and automate their multi-platform social media presence.

---

## 🚀 Milestone 3 Status Dashboard

Below is the live status dashboard for the **Milestone 3** deliverables. It showcases completed items (green glowing LEDs) and full backend & database integrations.

![Milestone 3 Status Dashboard](./docs/milestone1_status.svg)

<details open>
<summary><b>📊 Expand for Detailed Deliverables Breakdown</b></summary>
<br>

### 🗄️ Database Team (100% Completed)
- [x] **PostgreSQL & MongoDB Configured** (Containerized orchestration inside `docker-compose.yml`)
- [x] **Relational & NoSQL Schema Created** (User, SocialAccount, Campaign, Content, ScheduledPost, PublishingLog, Analytics models)
- [x] **SQLAlchemy ORM & Session Pooling** (Robust connection pooling and session management in `database/postgresql/connection.py`)
- [x] **Alembic Database Migrations** (Versioned migrations in `database/migrations/versions/`)
- [x] **Database Seeding & Reference Tables** (Role references and default campaign data populated)

### ⚙️ Backend Team (100% Completed)
- [x] **FastAPI Project Architecture** (Clean Architecture structure in `backend/app/main.py`)
- [x] **JWT Authentication & Security** (`/register`, `/login`, `/refresh`, token rotation, and bcrypt password hashing)
- [x] **Role-Based Access Control (RBAC)** (Role enforcement for Admin, Manager/Marketing Team, and Content Creator)
- [x] **Campaign & Post Scheduling APIs** (`/api/campaigns`, `/api/campaigns/{id}/schedule`, tracking metrics, and status filters in `app/presentation/routes/campaigns.py`)
- [x] **Real-Time Notification Broadcasting** (Server-Sent Events & background tasks for campaign/post creation alerts)
- [x] **Account & User Management APIs** (Profile updates, password changes, team governance in `app/presentation/routes/users.py`)
- [x] **Swagger & ReDoc Documentation** (Automatically served at `http://localhost:8000/docs`)

### 💻 Frontend Team (100% Completed)
- [x] **Vite + React + TypeScript Architecture** (Modern, fast frontend application)
- [x] **Authentication & Role-Based Layouts** (Seamless login/register flows with dynamic role-based sidebar & navigation)
- [x] **Campaign Management Dashboard** (Full campaign lifecycle control, quick status dropdown switcher, budget tracking, and status filtering)
- [x] **Live Multi-Platform Post Preview Sandbox** (Real-time preview across Instagram, Facebook, LinkedIn, X/Twitter, YouTube, Pinterest with character limit checks and best-time-to-post recommendations)
- [x] **Content Calendar & Post Scheduler** (Interactive timeline and post management)
- [x] **Team Management Page** (Member search with icon alignment, role assignment modal, deactivate/activate toggles, and permissions reference)
- [x] **Real-Time API & Database Integration** (Centralized `apiFetch` service connected to FastAPI backend)

</details>

---

## 🧭 Interactive Navigation
*   [📌 Project Overview](#-project-overview)
*   [✨ Comprehensive Feature Highlights](#-comprehensive-feature-highlights)
*   [🎯 Objectives & Deliverables](#-objectives--deliverables)
*   [🛠 Tech Stack](#-tech-stack)
*   [🏛 Architecture](#-architecture)
*   [📂 Project Structure Explorer](#-project-structure-explorer)
*   [📚 Core Modules](#-core-modules)
*   [⚙ Setup Instructions](#-setup-instructions)
*   [🌿 Git Branch Strategy](#-git-branch-strategy)
*   [👥 Team & License](#-team)

---

## 📌 Project Overview

SocialPilot empowers marketing teams, agency managers, and content creators to plan, schedule, publish, and analyze social media content from a single, intuitive control center. By integrating relational data models (PostgreSQL) and flexible analytics storage (MongoDB) with a high-performance FastAPI backend and React frontend, SocialPilot streamlines team collaboration and boosts audience engagement.

---

## ✨ Comprehensive Feature Highlights

### 1. 🔑 Role-Based Access Control (RBAC) & Governance
* **Hierarchical Roles**: 
  * 🛡️ **Administrator**: Full platform authority (billing, integrations, user role management, account deletion).
  * 📢 **Marketing Team / Manager**: Create and edit campaigns, schedule posts, approve content, analyze performance.
  * ✍️ **Content Creator**: Draft content, preview platform views, submit posts for approval, suggest post times.
* **Role Badges & Security Guards**: Enforced both on the backend API layer and frontend UI components.

### 2. 🚀 Campaign Management & Control Center
* **Lifecycle Tracking**: Organize posts under targeted marketing campaigns (`Active`, `Scheduled`, `Completed`, `Paused`, `Draft`).
* **Interactive Status Dropdown**: Change campaign statuses directly within the dashboard table with real-time backend persistence.
* **Filter & Search**: Instant filter by status (`All Statuses`, `Active`, `Scheduled`, `Completed`, `Draft`) and keyword search.
* **KPI & Budget Tracking**: Monitor budget allocation vs. spend and target conversions.

### 3. 👁️ Live Multi-Platform Post Preview & Post Editor
* **Platform Simulation**: Preview post captions, handles, and layout mockups across **Instagram, Facebook, LinkedIn, X (Twitter), YouTube, and Pinterest**.
* **Character Limit Guard**: Real-time character counter and max-length warnings tailored per network.
* **Best-Time-To-Post Intelligence**: Suggests optimal publishing hours per social platform based on target audience activity.

### 4. 📅 Content Calendar & Chronological Queue
* **Visual Post Scheduling**: View scheduled posts organized chronologically.
* **Multi-Platform Tags**: Color-coded badges indicating post platform, campaign link, and publication status.

### 5. 👥 Team Management Workspace
* **Teammate Directory**: Search team members by name or email with aligned search controls.
* **Role Assignment & Actions**: Change teammate roles dynamically, invite new members, deactivate or remove workspace accounts.
* **Role Permissions Reference**: Expandable guide detailing permission scopes per role.

### 6. 🔔 Real-Time Notification Center
* **Instant Alerts**: Server-Sent Events (SSE) and background broadcast tasks alert team members when new campaigns are launched or posts are scheduled.

---

## 🎯 Objectives & Deliverables

- [x] Multi-tenant social account management
- [x] Campaign creation, tracking, and interactive status management
- [x] Multi-platform post creator with live visual preview
- [x] Automated post scheduling and calendar view
- [x] Role-Based Access Control (Admin, Manager, Creator)
- [x] Team management and role governance
- [x] Real-time notification center for campaign alerts
- [x] PostgreSQL relational data modeling & Alembic migrations
- [x] MongoDB analytics storage & connection setup
- [x] FastAPI RESTful API architecture with OpenAPI/Swagger docs

---

## 🛠 Tech Stack

| Frontend | Backend | Database | DevOps & Tooling |
| :--- | :--- | :--- | :--- |
| • React 18 / Vite<br>• TypeScript<br>• Tailwind CSS (v4)<br>• React Router v6<br>• Lucide / Custom SVG Icons | • FastAPI<br>• Python 3.11+<br>• SQLAlchemy ORM<br>• Alembic Migrations<br>• Pydantic v2<br>• JWT Authentication | • PostgreSQL 15+<br>• MongoDB 6.0+<br>• Redis 7 | • Docker & Docker Compose<br>• Git & GitHub<br>• Uvicorn ASGI Server |

---

## 🏛 Architecture

SocialPilot follows **Clean Architecture** principles within a modular framework, separating business rules from infrastructure details.

```
  ┌─────────────────────────────────────────────────────────┐
  │ Presentation Layer (FastAPI Routes, Auth Guards, SSE)   │
  │   ┌─────────────────────────────────────────────────┐   │
  │   │ Application Layer (Services, Use Cases, DTOs)   │   │
  │   │   ┌─────────────────────────────────────────┐   │   │
  │   │   │ Domain Layer (Entities, Model Enums)    │   │   │
  │   │   └─────────────────────────────────────────┘   │   │
  │   └─────────────────────────────────────────────────┘   │
  │ Infrastructure Layer (PostgreSQL, MongoDB, Alembic)     │
  └─────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure Explorer

```
SocialPilot/
├── docker-compose.yml               # PostgreSQL + MongoDB + Redis orchestration
├── README.md                        # Documentation & Status Dashboard
├── docs/
│   ├── milestone1_status.svg        # Live animated status dashboard graphic
│   └── DATABASE_ARCHITECTURE.md     # In-depth database design specs
├── database/
│   ├── postgresql/                  # SQLAlchemy models, engines, connection pools, seeds
│   ├── mongodb/                     # NoSQL client & collections setup
│   ├── redis/                       # Redis client and cache connection settings
│   ├── migrations/                  # Alembic migration scripts and env.py
│   ├── backup.ps1                   # PostgreSQL and MongoDB backup script
│   └── restore-test.ps1             # Isolated backup recovery verification
├── backend/                         # FastAPI Application (Clean Architecture)
│   ├── app/
│   │   ├── main.py                  # FastAPI entrypoint & middleware configuration
│   │   ├── presentation/routes/     # API Endpoints (Campaigns, Users, Content, Notifications)
│   │   ├── application/             # Use cases & DTOs
│   │   ├── domain/                  # Entities & interfaces
│   │   └── infrastructure/          # Repositories & DB adapters
│   └── requirements.txt             # Python dependencies
└── frontend/                        # React Client Application
    ├── src/
    │   ├── pages/dashboard/         # Dashboard pages (Campaigns, Calendar, Preview, Team)
    │   ├── components/              # Shared UI components (AuthScreen, DashboardShell, Modals)
    │   ├── services/                # API connector client services (api.ts, campaignService.ts)
    │   ├── index.css                # CSS Variables & Design Tokens
    │   └── App.tsx                  # Client router setup
    └── package.json                 # Node dependencies
```

---

## Database Architecture

SocialPilot uses PostgreSQL for transactional application data, MongoDB for notification and flexible document data, and Redis for operational caching and coordination. PostgreSQL and MongoDB run with persistent Docker volumes, while Redis uses AOF persistence.

### Complete PostgreSQL ER Diagram

```mermaid
erDiagram
  USERS {
    uuid id PK
    string email UK
    string username UK
    string full_name
    string password_hash
    boolean is_active
    enum role
    string timezone
    json notification_preferences
    timestamp created_at
    timestamp updated_at
  }
  SOCIAL_ACCOUNTS {
    uuid id PK
    uuid user_id FK
    string provider
    string provider_account_id
    string account_name
    text access_token
    text refresh_token
    boolean is_active
    timestamp last_sync_time
  }
  FACEBOOK_ACCOUNTS {
    uuid id PK
    uuid user_id FK
    string facebook_id
    string name
    string email
    text access_token
    timestamp expires_at
  }
  FACEBOOK_PAGES {
    uuid id PK
    uuid facebook_account_id FK
    string page_id
    string page_name
    text page_access_token
    string category
  }
  YOUTUBE_ACCOUNTS {
    uuid id PK
    uuid user_id FK
    string channel_id
    string channel_name
    string email
    text access_token
    text refresh_token
    timestamp expires_at
  }
  CONTENTS {
    uuid id PK
    uuid owner_id FK
    string title
    text body
    json media_urls
    enum content_type
    enum status
    boolean is_approved
    timestamp created_at
  }
  CAMPAIGNS {
    uuid id PK
    uuid owner_id FK
    string title
    text description
    enum status
    timestamp start_date
    timestamp end_date
    string budget
    string spent
    json platforms
    json kpis
    string objective
  }
  CAMPAIGN_CONTENTS {
    uuid id PK
    uuid campaign_id FK
    uuid content_id FK
    integer sequence
    text notes
  }
  SCHEDULED_POSTS {
    uuid id PK
    uuid campaign_id FK
    uuid content_id FK
    uuid social_account_id FK
    uuid parent_scheduled_post_id FK
    timestamp scheduled_time
    boolean is_recurring
    string recurrence_rule
    enum status
    timestamp created_at
    timestamp updated_at
  }
  PUBLISHING_LOGS {
    uuid id PK
    uuid scheduled_post_id FK
    uuid social_account_id FK
    enum status
    text error_message
    timestamp published_at
  }
  CAMPAIGN_PERFORMANCE {
    uuid id PK
    uuid campaign_id FK
    timestamp date
    integer impressions
    integer reach
    integer clicks
    integer engagements
    integer likes
    integer comments
    integer shares
    integer conversions
    float cost
  }
  SCHEDULED_POST_METRICS {
    uuid id PK
    uuid scheduled_post_id FK
    timestamp recorded_at
    integer views
    integer likes
    integer comments
    integer shares
    integer saves
    integer clicks
    float ctr
    float engagement_rate
    integer reach
    integer impressions
  }
  AUDIENCE_GROWTH {
    uuid id PK
    uuid social_account_id FK
    uuid campaign_id FK
    timestamp date
    integer followers
    integer follower_change
    json audience_demographics
  }
  ROLE_REFERENCE {
    uuid id PK
    string role_label UK
    text description
    json key_responsibilities
    string maps_to_auth_role
  }

  USERS ||--o{ SOCIAL_ACCOUNTS : owns
  USERS ||--o{ FACEBOOK_ACCOUNTS : connects
  FACEBOOK_ACCOUNTS ||--o{ FACEBOOK_PAGES : contains
  USERS ||--o{ YOUTUBE_ACCOUNTS : connects
  USERS ||--o{ CONTENTS : creates
  USERS ||--o{ CAMPAIGNS : owns
  CAMPAIGNS ||--o{ CAMPAIGN_CONTENTS : includes
  CONTENTS ||--o{ CAMPAIGN_CONTENTS : assigned_to
  CAMPAIGNS ||--o{ SCHEDULED_POSTS : schedules
  CONTENTS ||--o{ SCHEDULED_POSTS : published_as
  SOCIAL_ACCOUNTS ||--o{ SCHEDULED_POSTS : publishes_to
  SCHEDULED_POSTS ||--o{ SCHEDULED_POSTS : recurs_from
  SCHEDULED_POSTS ||--o{ PUBLISHING_LOGS : records
  SOCIAL_ACCOUNTS ||--o{ PUBLISHING_LOGS : delivers_via
  CAMPAIGNS ||--o{ CAMPAIGN_PERFORMANCE : measures
  SCHEDULED_POSTS ||--o{ SCHEDULED_POST_METRICS : measures
  SOCIAL_ACCOUNTS ||--o{ AUDIENCE_GROWTH : tracks
  CAMPAIGNS |o--o{ AUDIENCE_GROWTH : attributes
```

### MongoDB, Redis, and Performance

- **MongoDB collections:** `notifications`, `users`, and `social_accounts`. Notifications use compound indexes for targeted or broadcast filtering and newest-first retrieval. User email and social account provider identifiers are unique-indexed.
- **Redis:** Redis 7 supports cache and coordination workloads with AOF persistence, password authentication, bounded connection timeouts, and health checks.
- **PostgreSQL indexes:** Composite indexes cover content feeds, pending scheduled posts, campaign ownership/status, and campaign/account time-series analytics. They are defined in migration `b7c8d9e0f1a2`.

### Database Operations and Validation

```bash
docker compose up -d --build
docker compose exec backend python -m alembic -c /app/database/migrations/alembic.ini upgrade head
curl http://127.0.0.1:8000/api/health
docker compose exec backend pytest -q /app/tests
```

The verified environment reports PostgreSQL, MongoDB, and Redis as connected and migration head `c8d9e0f1a2b3`. All 28 backend tests pass. Data-integrity checks found zero orphan records; populated PostgreSQL and MongoDB backup recovery passed; database restart persistence passed; and database ports are bound to localhost in Docker Compose.

PowerShell backup and isolated recovery verification:

```powershell
$env:DATABASE_URL="postgresql+psycopg://socialpilot_user:socialpilot_password@localhost:5432/socialpilot_db"
$env:MONGODB_URL="mongodb://admin:admin_password@localhost:27017/socialpilot_db?authSource=admin"
.\database\backup.ps1
.\database\restore-test.ps1 -BackupDirectory .\backups\<timestamp> `
  -RecoveryMongoUrl "mongodb://admin:admin_password@localhost:27017/socialpilot_recovery_test?authSource=admin"
```

## ⚙ Setup Instructions

### 1. Clone Repository & Checkout Branch
```bash
git clone https://github.com/springboardmentor107t-creator/Social-Media-Scheduler-Campaign-Management-Platform_July-26_Team-A.git
cd Social-Media-Scheduler-Campaign-Management-Platform_July-26_Team-A
git checkout Milestone-3
```

### 2. Start Database Services (Docker)
```bash
# Launch PostgreSQL, MongoDB, and Redis containers
docker compose up -d postgres mongodb redis
```

### 3. Backend Setup & Alembic Migrations
```bash
cd backend

# Create Virtual Environment
python -m venv .venv

# Activate Virtual Environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate Virtual Environment (Linux / macOS)
source .venv/bin/activate

# Install Backend Dependencies
pip install -r requirements.txt

# Run Alembic Database Migrations
python -m alembic -c ../database/migrations/alembic.ini upgrade head

# Launch FastAPI Backend Server
uvicorn app.main:app --reload --port 8000
```
* **Backend API Base**: `http://127.0.0.1:8000`
* **Swagger OpenAPI Docs**: `http://127.0.0.1:8000/docs`

### 4. Frontend Setup
```bash
cd ../frontend

# Install Dependencies
npm install

# Start Vite Development Server
npm run dev
```
* **Frontend App Base**: `http://localhost:5173`

### 5. Database Operations and Verification
```bash
# Apply the production indexes and verify migration state
python -m alembic -c ../database/migrations/alembic.ini upgrade head
docker compose ps
curl http://127.0.0.1:8000/api/health

# Create a timestamped PostgreSQL and MongoDB backup (PowerShell)
$env:DATABASE_URL="postgresql+psycopg://socialpilot_user:socialpilot_password@localhost:5432/socialpilot_db"
$env:MONGODB_URL="mongodb://admin:admin_password@localhost:27017/socialpilot_db?authSource=admin"
.\database\backup.ps1

# Restore into isolated PostgreSQL and MongoDB recovery targets
.\database\restore-test.ps1 -BackupDirectory .\backups\<timestamp> `
  -RecoveryMongoUrl "mongodb://admin:admin_password@localhost:27017/socialpilot_recovery_test?authSource=admin"
```

The `/api/health` response must report `connected` for PostgreSQL, MongoDB, and Redis. For a basic stability check, run the backend tests after installing `backend/requirements.txt`; for query performance, inspect PostgreSQL plans with `EXPLAIN (ANALYZE, BUFFERS)` for content feeds, pending scheduled posts, campaign reports, and time-series analytics. The composite indexes for those paths are applied by migration `b7c8d9e0f1a2`.

---

## 🌿 Git Branch Strategy

* `main` → Stable Production Releases
* `Develop` → Integration & Staging
* `Milestone-1` → Foundation & Database Schema
* `Milestone-2` → Backend APIs & Frontend Core
* `Milestone-3` → Full Database Integration, Campaign Management & Team Features (Current Active Branch)
* `Milestone-4` → Automated Multi-Platform Publishing & Final Polish

---

## 👥 Team & License

**Infosys Springboard Internship Program**
* **Project**: SocialPilot – Social Media Scheduler & Campaign Management Platform
* **Team**: Team A
* **License**: Open for educational and internal internship review.
 
 