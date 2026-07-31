# 🚀 SocialPilot – Social Media Scheduler & Campaign Management Platform

A centralized social media management platform designed to help individuals, businesses, content creators, and marketing teams efficiently manage their social media presence.

---

## 🧭 Interactive Navigation
*   [📌 Project Overview](#-project-overview)
*   [🎯 Objectives](#-objectives)
*   [🛠 Tech Stack](#-tech-stack)
*   [🏛 Architecture](#-architecture)
*   [📂 Project Structure Explorer](#-project-structure-explorer)
*   [📚 Core Modules](#-core-modules)
*   [⚙ Setup Instructions](#-setup-instructions)
*   [🌿 Git Branch Strategy](#-git-branch-strategy)
*   [👥 Team & License](#-team)
*   [🚀 Milestone 1 Status Dashboard](#-milestone-1-status-dashboard)

---

## 📌 Project Overview

SocialPilot enables users to create, schedule, publish, and analyze content across multiple social media platforms from a single dashboard. It provides campaign management, analytics, notifications, and reporting features to improve productivity and audience engagement.

---

## 🎯 Objectives

- [x] Manage multiple social media accounts
- [x] Create and schedule posts
- [x] Publish content across different platforms
- [x] Track campaign performance
- [x] Monitor analytics and engagement
- [x] Generate reports
- [x] Provide notifications and reminders
- [x] Follow Clean Architecture principles for scalability and maintainability

---

## 🛠 Tech Stack

| Frontend | Backend | Database | DevOps |
| :--- | :--- | :--- | :--- |
| • React.js / Next.js<br>• TypeScript<br>• Tailwind CSS<br>• Axios<br>• React Router<br>• React Hook Form | • FastAPI<br>• Python 3.11+<br>• SQLAlchemy<br>• Alembic<br>• JWT Authentication<br>• Pydantic | • PostgreSQL<br>• MongoDB | • Docker & Docker Compose<br>• Git & GitHub |

---

## 🏛 Architecture

This project follows a **Monolithic Architecture** with **Clean Architecture** principles.

### Clean Architecture Layers

```
  ┌─────────────────────────────────────────────────────────┐
  │ Presentation Layer (Routes, Request Handling, Auth)     │
  │   ┌─────────────────────────────────────────────────┐   │
  │   │ Application Layer (Use Cases, Services, DTOs)   │   │
  │   │   ┌─────────────────────────────────────────┐   │   │
  │   │   │ Domain Layer (Entities, Repositories)   │   │   │
  │   │   └─────────────────────────────────────────┘   │   │
  │   └─────────────────────────────────────────────────┘   │
  │ Infrastructure Layer (Database, External APIs, Storage) │
  └─────────────────────────────────────────────────────────┘
```

<details>
<summary><b>📖 Layer Responsibilities (Click to expand)</b></summary>
<br>

*   **Presentation Layer**: API Routes, Request Handling, Authentication, and Custom Middlewares.
*   **Application Layer**: Business Use Cases, Services, Data Transfer Objects (DTOs), and Validation rules.
*   **Domain Layer**: Core Business Entities, Repository Interfaces, and fundamental Business Rules.
*   **Infrastructure Layer**: Databases (SQLAlchemy, Motor), Repository Implementations, External API integrations, and Storage hooks.
</details>

---

## 📂 Project Structure Explorer
*Click on any folder to expand and explore the underlying structure.*

<details>
<summary><b>📂 SocialPilot Root Workspace Files</b></summary>
<blockquote>

*   `docker-compose.yml` - Multi-service Docker orchestration setup.
*   `README.md` - Interactive project documentation.
*   `.gitignore` - Project-level git ignore rules.
</blockquote>
</details>

<details>
<summary><b>📂 frontend/ (React Client Application)</b></summary>
<blockquote>

*   `package.json` - Lists frontend Node dependencies.
*   `vite.config.ts` - Vite compiler and server configurations.
*   `index.html` - HTML document root.
*   `Dockerfile` - Container setup for the client development environment.
*   `src/` - Client codebase directories:
    
    <details style="margin-left: 20px;">
    <summary><b>📂 src/ Folders</b></summary>
    
    *   `assets/` - Static files, styles, and custom branding assets.
    *   `components/` - Shared UI widgets and stateless controls.
    *   `layouts/` - Wrapping templates for different routes (e.g. Auth, Dashboard).
    *   `pages/` - Parent route views (Dashboard, Scheduler, Analytics).
    *   `routes/` - Router rules and client guards.
    *   `hooks/` - Custom utility React hooks.
    *   `services/` - Endpoint connector client files.
    *   `context/` - Global context states.
    *   `utils/` - Shared helper operations.
    *   `App.tsx` - Root App component.
    *   `main.tsx` - DOM renderer.
    </details>
</blockquote>
</details>

<details>
<summary><b>📂 backend/ (FastAPI Application)</b></summary>
<blockquote>

*   `requirements.txt` - Lists python dependencies.
*   `Dockerfile` - Container configuration for backend services.
*   `.env` - Environmental variables setup.
*   `app/` - Python source modules:
    
    <details style="margin-left: 20px;">
    <summary><b>📂 app/ Folders (Clean Architecture)</b></summary>
    
    *   `presentation/` - Endpoints, Routes, Middlewares, and Schemas.
    *   `application/` - Use cases, App Services, and DTO structures.
    *   `domain/` - Business entities, Repositories definitions, and Interfaces.
    *   `infrastructure/` - DB Engines, Repositories implementations, Storage, and External APIs.
    *   `core/` - Utilities and authentication modules.
    *   `config/` - App configurations setup.
    *   `shared/` - Common modules shared across boundaries.
    *   `main.py` - Root FastAPI entrypoint.
    </details>
</blockquote>
</details>

<details>
<summary><b>📂 database/ (Migrations & Schemas)</b></summary>
<blockquote>

*   `postgresql/` - Relational tables and database seeding scripts.
*   `mongodb/` - Collection configurations and setup files.
*   `migrations/` - Database update history (Alembic).
</blockquote>
</details>

<details>
<summary><b>📂 docs/ & architecture/ (Project Design Documents)</b></summary>
<blockquote>

*   `docs/` - General user guides and API documentation.
*   `architecture/` - Systems designs, diagrams, and project specifications.
</blockquote>
</details>

---

## 📚 Core Modules

*   👥 **User Management** - Profile editing, settings, roles registration.
*   🔑 **Authentication & Authorization** - JWT-based authentication system.
*   🔗 **Social Account Management** - Integration connectors for social media accounts.
*   📝 **Content Management** - Rich text editors, media assets uploads, templates.
*   📊 **Campaign Management** - Campaign planning, tag clusters, organization filters.
*   📅 **Post Scheduling** - Scheduled time queues, chronological calendars.
*   📈 **Analytics Dashboard** - Graph statistics showing click rates, visual performance.
*   🔔 **Notification Service** - Reminders, error warnings, push events.
*   📁 **Reporting Module** - Exportable PDF/CSV reports.

---

## ⚙ Setup Instructions

### 1. Clone Repository & Checkout Branch
```bash
git clone <repository-url>
cd Social-Media-Scheduler-Campaign-Management-Platform_July-26_Team-A
git checkout Milestone-1
```

### 2. Backend Setup
```bash
cd backend

# Create Virtual Environment
python -m venv venv

# Activate Virtual Environment (Windows)
venv\Scripts\activate

# Activate Virtual Environment (Linux / macOS)
source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Run FastAPI Development Server
uvicorn app.main:app --reload
```
*   **API Root**: `http://localhost:8000`
*   **Swagger Docs**: `http://localhost:8000/docs`

### 3. Database Setup
```bash
# Start PostgreSQL and MongoDB services
docker compose up -d postgres mongodb

# Apply SQLAlchemy schema for PostgreSQL
cd backend
python -m alembic -c ../database/migrations/alembic.ini upgrade head
```

*   **PostgreSQL**: `localhost:5432`
*   **MongoDB**: `localhost:27017`

### 4. Frontend Setup
```bash
cd ../frontend

# Install node modules
npm install

# Start Vite server
npm run dev
```
*   **Client URL**: `http://localhost:5173`

---

## 🌿 Git Branch Strategy

*   `main` → Stable Production Branch
*   `Develop` → Integration Branch
*   `Milestone-1` → Current Development
*   `Milestone-2`
*   `Milestone-3`
*   `Milestone-4`

---

## 👥 Team
**Infosys Springboard Internship**
*   **Project**: SocialPilot – Social Media Scheduler & Campaign Management Platform
*   **Team**: Team A

---

## 📄 License
This project is developed as part of the Infosys Springboard Internship Program.

---

## 🚀 Milestone 1 Status Dashboard

Below is the live status dashboard for the **Milestone 1** deliverables. It showcases completed items (green glowing LEDs) and pending integration stubs (orange blinking LEDs).

![Milestone 1 Status Dashboard](./docs/milestone1_status.svg)

<details>
<summary><b>📊 Expand for Detailed Deliverables Breakdown</b></summary>
<br>

### 🗄️ Database Team
- [x] **PostgreSQL & MongoDB configured** (configured inside `docker-compose.yml`)
- [x] **Database Schema created** (SQLAlchemy user & social account models defined in `database/postgresql/models.py`)
- [x] **SQLAlchemy ORM configured and connected** (configured in `database/postgresql/connection.py`)
- [x] **Alembic migrations created & tested** (migrations populated under `database/migrations/versions/`)

### ⚙️ Backend Team
- [x] **FastAPI project setup completed** (entrypoint in `backend/app/main.py`)
- [x] **JWT Authentication APIs working** (`/register`, `/login`, and `/refresh` token rotation in `auth.py`)
- [x] **Role-Based Access Control (RBAC) implemented** (hierarchical role enforcement and ownership guards in `app/presentation/dependencies/auth.py` and validated in `backend/tests/test_rbac.py`)
- [ ] **Social Account Integration APIs working** (⚠️ **PENDING** - Backend OAuth routes and service layers are currently absent; database schema exists but business logic/API routes are missing)
- [x] **Account Management APIs working** (Profile update, change password, email verification, and deactivation routes working in `app/presentation/routes/users.py`)
- [x] **Swagger documentation available** (served automatically at `http://localhost:8000/docs`)

### 💻 Frontend Team
- [x] **Vite/React project setup completed** (configured in `frontend/package.json`, migrated successfully from the original Next.js codebase to Vite)
- [x] **Login/Register screens ready** (implemented in `pages/LoginPage.tsx` / `pages/SignupPage.tsx` using `AuthScreen.tsx`)
- [x] **User Profile & Account Management pages ready** (functional in `pages/ProfilePage.tsx` and `pages/SettingsPage.tsx`)
- [x] **Social Account Integration dashboard ready** (visual dashboard working in `pages/ConnectPage.tsx` with support for connect/disconnect/reconnect toggles)
- [x] **UI wireframes converted into working pages** (fully styled using the custom CSS design system variables)
- [/] **APIs integrated** (Authentication & Account settings are fully connected via `apiFetch` in `frontend/src/services/api.ts`; Social Account triggers are currently stubbed with local mock data in `frontend/src/lib/mockConnectAccounts.ts` due to missing backend OAuth APIs)

</details>
