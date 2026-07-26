# SocialPilot: Social Media Scheduler & Campaign Management Platform

A centralized social media scheduling platform that allows users, content creators, businesses, and marketing teams to schedule, manage, and publish content across multiple social media platforms from a single dashboard.

## Clean Architecture Directory Structure

The project follows clean architecture principles to separate concerns and ensure maintainability, scalability, and ease of testing.

```
SocialPilot/
│
├── frontend/                     # React + TypeScript + Vite frontend application
│   ├── public/                   # Static assets accessible directly
│   ├── src/
│   │   ├── assets/               # Local images, fonts, styles
│   │   ├── components/           # Reusable stateless/UI components
│   │   ├── layouts/              # Layout wraps (e.g. DashboardLayout, AuthLayout)
│   │   ├── pages/                # Page-level components associated with routes
│   │   ├── routes/               # Routing configurations and components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── services/             # API clients and HTTP communication logic
│   │   ├── context/              # React Context providers for global state
│   │   ├── utils/                # Helper functions and formatting utilities
│   │   └── App.tsx               # Root App component
│   └── package.json
│
├── backend/                      # Python + FastAPI backend application
│   ├── app/                      # Main application source code
│   │   ├── domain/               # Domain Layer (Enterprise/Business Logic - Framework Independent)
│   │   │   ├── entities/         # Domain models / schemas
│   │   │   ├── repositories/     # Interface definition for repository/data access
│   │   │   └── interfaces/       # Other system boundaries/interface contracts
│   │   │
│   │   ├── application/          # Application Layer (Use Cases & Business Rules)
│   │   │   ├── use_cases/        # Orchestrates the flow of data to/from entities
│   │   │   ├── services/         # Application services
│   │   │   └── dto/              # Data Transfer Objects
│   │   │
│   │   ├── infrastructure/       # Infrastructure Layer (Database, External APIs, File Storage)
│   │   │   ├── database/         # DB connection setup and ORM configurations
│   │   │   ├── repositories/     # Concrete implementations of Domain Repositories
│   │   │   ├── external/         # External API integrations (e.g. Social APIs)
│   │   │   └── storage/          # Local or Cloud storage integrations
│   │   │
│   │   ├── presentation/         # Presentation Layer (API endpoints, routers, serialisation)
│   │   │   ├── api/              # API main handlers / routers setup
│   │   │   ├── routes/           # REST endpoints definition
│   │   │   ├── middleware/       # Custom middleware (CORS, Auth, etc)
│   │   │   └── schemas/          # Presentation Request/Response DTO validation schemas
│   │   │
│   │   ├── core/                 # Core utilities, constants, and logging configuration
│   │   ├── shared/               # Shared modules across layers
│   │   ├── config/               # Application configuration loader (pydantic-settings)
│   │   └── main.py               # FastAPI entrypoint
│   │
│   ├── tests/                    # Backend unit/integration tests
│   ├── requirements.txt          # Python dependency requirements
│   └── .env                      # Local environmental configurations
│
├── database/                     # Database schemas and migration configurations
│   ├── postgresql/               # PostgreSQL schema/scripts
│   ├── mongodb/                  # MongoDB schemas/seeding scripts
│   └── migrations/               # Database migration scripts (e.g. Alembic)
│
├── docs/                         # Project documentation and user guides
│
├── architecture/                 # Architecture diagrams and specifications
│
├── .github/                      # GitHub Action CI/CD workflows and PR templates
│
├── README.md                     # Project documentation
├── .gitignore                    # Project-level git ignore rules
└── docker-compose.yml            # Docker orchestration configuration
```

## Running the Application

### Prerequisites
- Docker & Docker Compose installed on your machine.

### Getting Started
1. Clone the repository and navigate to the directory:
   ```bash
   git clone <repo-url>
   cd Social-Media-Scheduler-Campaign-Management-Platform_July-26_Team-A
   ```

2. Start the services:
   ```bash
   docker-compose up --build
   ```

3. Access the services:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:8000`
   - Backend Docs: `http://localhost:8000/docs`
