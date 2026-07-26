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
*   [🚀 Milestone 1 Status](#-milestone-1)

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

### 3. Frontend Setup
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

## 🚀 Milestone 1
- [x] Project Setup
- [x] Clean Architecture
- [x] Frontend Structure
- [x] Backend Structure
- [x] Database Structure
- [x] Documentation
- [x] Initial GitHub Repository Setup
