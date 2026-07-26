# 🚀 SocialPilot: Social Media Scheduler & Campaign Management Platform

A centralized, production-ready social media scheduling platform. SocialPilot enables users, content creators, and businesses to orchestrate, schedule, and publish media campaigns across various social platforms from a single web interface.

---

## 🧭 Interactive Table of Contents
*   [⚡ Quick Start](#-quick-start)
*   [📂 Interactive Directory Explorer](#-interactive-directory-explorer)
*   [🏗️ Clean Architecture Overview](#%EF%B8%8F-clean-architecture-overview)
*   [🛠️ Technology Stack & Ports](#%EF%B8%8F-technology-stack--ports)
*   [🔄 Database Configurations](#-database-configurations)

---

## ⚡ Quick Start

<details>
<summary><b>1. Prerequisites (Expand to view)</b></summary>
<br>

Ensure you have the following installed on your host system:
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Compose support)
*   [Node.js](https://nodejs.org/) *(Optional: for running frontend outside container)*
*   [Python 3.10+](https://www.python.org/) *(Optional: for running backend outside container)*
</details>

<details>
<summary><b>2. Running the Application via Docker Compose (Expand to view)</b></summary>
<br>

Boot all services in development mode with active hot-reloading:

```bash
docker-compose up --build
```

Upon successful startup, Docker will run the following services:
*   **Frontend UI** on `http://localhost:5173`
*   **FastAPI API Docs** on `http://localhost:8000/docs`
*   **PostgreSQL Database** on `localhost:5432`
*   **MongoDB Database** on `localhost:27017`
</details>

---

## 📂 Interactive Directory Explorer
*Click on any folder icon below to expand and view its subfolders, files, and architectural description.*

<details>
<summary><b>📂 SocialPilot Root Workspace</b></summary>
<blockquote>

*   `docker-compose.yml` - Orchestrates the containerized frontend, backend, and DB services.
*   `.gitignore` - Configured patterns for Node, Python, and local configs.
*   `README.md` - This interactive repository documentation.
</blockquote>
</details>

<details>
<summary><b>📂 frontend/ (React Client Application)</b></summary>
<blockquote>

*   `package.json` - Lists frontend Node dependencies (Vite, React, Lucide icons, etc.).
*   `vite.config.ts` - Vite compiler and hot-reloading configurations.
*   `index.html` - Primary HTML entry point, styled using Outfit and Inter fonts.
*   `Dockerfile` - Container setup for the client dev server.
*   `src/` - Core application codebase:
    
    <details style="margin-left: 20px;">
    <summary><b>📂 src/ Directories Breakdown</b></summary>
    
    *   `assets/` - Global styling, custom icons, and static assets.
    *   `components/` - Reusable UI widgets and layout modules (Buttons, Modals, Cards).
    *   `layouts/` - Wrapping page frames (e.g. DashboardLayout, AuthenticationLayout).
    *   `pages/` - Parent routing pages (Dashboard, Scheduler, Analytics).
    *   `routes/` - Client-side route declarations and authorization guards.
    *   `hooks/` - Reusable React hooks for general hooks.
    *   `services/` - API communications (fetching endpoints, axios configurations).
    *   `context/` - Global context states (Authentication tokens, Theme triggers).
    *   `utils/` - Shared helper operations and formatting algorithms.
    *   `App.tsx` - App component containing navigation and active tab router.
    *   `main.tsx` - Root rendering engine initiating React.
    </details>
</blockquote>
</details>

<details>
<summary><b>📂 backend/ (FastAPI Clean Architecture Application)</b></summary>
<blockquote>

*   `requirements.txt` - Lists python dependencies (FastAPI, SQLAlchemy, Motor, etc.).
*   `Dockerfile` - Container blueprint compiling python layers and drivers.
*   `.env` - Environmental file containing access credentials and DB links.
*   `app/` - Python application module following Clean Architecture layers:
    
    <details style="margin-left: 20px;">
    <summary><b>📂 app/domain/ (Domain Layer - Business Rules Core)</b></summary>
    
    *Contains enterprise-wide business rules. Independent of external frameworks.*
    *   `entities/` - Defines core models (e.g. User, Post, Schedule).
    *   `repositories/` - Abstract repository interfaces defining DB interaction boundaries.
    *   `interfaces/` - Other structural protocols and interface boundaries.
    </details>

    <details style="margin-left: 20px;">
    <summary><b>📂 app/application/ (Application Layer - Use Cases)</b></summary>
    
    *Orchestrates the data flow to and from the domain layer.*
    *   `use_cases/` - Concrete commands (e.g. PublishPostUseCase, CreateCampaignUseCase).
    *   `services/` - Application logic workflows crossing multiple boundaries.
    *   `dto/` - Data Transfer Objects representing transaction packets.
    </details>

    <details style="margin-left: 20px;">
    <summary><b>📂 app/infrastructure/ (Infrastructure Layer - Frameworks & Drivers)</b></summary>
    
    *Adapters for external entities like DB clients, filesystems, and third-party APIs.*
    *   `database/` - Connection hooks, pool initializers, and SQLAlchemy metadata.
    *   `repositories/` - Concrete implementations of Domain Repository interfaces.
    *   `external/` - Integration wrappers for Twitter, Facebook, and LinkedIn APIs.
    *   `storage/` - Handles file transfers (local uploads or cloud-based S3 adapters).
    </details>

    <details style="margin-left: 20px;">
    <summary><b>📂 app/presentation/ (Presentation Layer - API Delivery)</b></summary>
    
    *Exposes REST endpoints and formats requests/responses.*
    *   `api/` - Main routers and path aggregators.
    *   `routes/` - FastAPI endpoints (e.g. UserRoutes, SchedulerRoutes).
    *   `middleware/` - Custom CORS adapters, request limiters, and authenticators.
    *   `schemas/` - Request/Response validation schemas (Pydantic models).
    </details>

    <details style="margin-left: 20px;">
    <summary><b>📂 app/core/, shared/, config/</b></summary>
    
    *   `core/` - System utilities (logging setups, password encryptions).
    *   `shared/` - Constants, enumerators, and variables shared between layers.
    *   `config/` - Settings loader class loading config values from `.env`.
    *   `main.py` - Application starter defining CORS and status diagnostic endpoints.
    </details>
</blockquote>
</details>

<details>
<summary><b>📂 database/ (Migrations & Scripts)</b></summary>
<blockquote>

*   `postgresql/` - Relational tables and database seeding scripts.
*   `mongodb/` - Collection configurations and setup files.
*   `migrations/` - Alembic or manual database update history.
</blockquote>
</details>

---

## 🏗️ Clean Architecture Overview

In this project, the codebase is structured so dependencies flow strictly inwards:

```
  ┌─────────────────────────────────────────────────────────┐
  │ Presentation (FastAPI Routes, Schemas, CORS)            │
  │   ┌─────────────────────────────────────────────────┐   │
  │   │ Application (Use Cases, Application DTOs)       │   │
  │   │   ┌─────────────────────────────────────────┐   │   │
  │   │   │ Domain (Entities, Repository Interfaces)│   │   │
  │   │   └─────────────────────────────────────────┘   │   │
  │   └─────────────────────────────────────────────────┘   │
  │ Infrastructure (SQLAlchemy, Motor DB, APIs, S3)         │
  └─────────────────────────────────────────────────────────┘
```

1.  **Domain (Core)**: Represents business logic. It depends on nothing else and has no reference to frameworks, databases, or UI.
2.  **Application**: Implements application-specific business use cases.
3.  **Presentation / Infrastructure (Outer Circle)**: Interacts with the outside world (web clients, databases, third-party APIs).

---

## 🛠️ Technology Stack & Ports

| Component | Technology | Default Dev Port | Container Service Name |
| :--- | :--- | :--- | :--- |
| **Frontend** | React, TypeScript, Vite | `5173` | `socialpilot_frontend` |
| **Backend** | Python, FastAPI, Uvicorn | `8000` | `socialpilot_backend` |
| **Relational DB** | PostgreSQL 15 | `5432` | `socialpilot_postgres` |
| **NoSQL DB** | MongoDB 6.0 | `27017` | `socialpilot_mongodb` |

---

## 🔄 Database Configurations

<details>
<summary><b>Relational Database (PostgreSQL) Details</b></summary>
<br>

*   **Primary Engine**: PostgreSQL 15.
*   **Purpose**: Manages accounts, credentials, subscription configurations, and scheduled job times.
*   **ORM Integration**: SQLAlchemy 2.0 with PostgreSQL binary drivers.
</details>

<details>
<summary><b>NoSQL Database (MongoDB) Details</b></summary>
<br>

*   **Primary Engine**: MongoDB 6.0.
*   **Purpose**: Stores document-style JSON payloads: campaign assets, media lists, audit logs, and performance analytics.
*   **Integration**: Async Motor driver.
</details>
