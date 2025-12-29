# ngaj Project Structure

This document outlines the complete project structure for ngaj.

## Directory Layout

```
ngaj/
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── docker-compose.yml            # Docker services (MongoDB, ChromaDB)
├── package.json                  # Node.js dependencies and scripts
├── tsconfig.json                 # TypeScript configuration (root)
├── tsconfig.backend.json         # Backend-specific TypeScript config
├── tsconfig.frontend.json        # Frontend-specific TypeScript config
├── README.md                     # Project overview
├── CONTRIBUTING.md               # Contributing guidelines
├── LICENSE                       # MIT license
│
├── docs/                         # Documentation
│   ├── setup.md                  # Setup and installation guide
│   ├── user-guide.md             # How to use ngaj
│   └── architecture/             # Architecture documentation
│       ├── overview.md           # System architecture overview
│       ├── data-model.md         # Database schemas
│       ├── api/openapi.yaml      # API specification
│       ├── diagrams/             # Architecture diagrams
│       │   ├── c4-context.png
│       │   ├── c4-container.png
│       │   └── component-diagram.png
│       └── decisions/            # Architecture Decision Records
│           ├── 001-mongodb-storage.md
│           ├── 002-env-credentials.md
│           ├── 003-typescript-stack.md
│           ├── 004-chromadb-vectors.md
│           └── 005-mvp-scope.md
│
├── src/                          # Source code
│   ├── backend/                  # Node.js backend
│   │   ├── index.ts              # Backend entry point
│   │   ├── api/                  # API routes
│   │   │   ├── accounts.ts
│   │   │   ├── opportunities.ts
│   │   │   ├── knowledge.ts
│   │   │   ├── responses.ts
│   │   │   └── health.ts
│   │   ├── services/             # Business logic
│   │   │   ├── discovery.service.ts
│   │   │   ├── response.service.ts
│   │   │   ├── knowledge.service.ts
│   │   │   └── bluesky.service.ts
│   │   ├── models/               # Data models
│   │   │   ├── account.model.ts
│   │   │   ├── opportunity.model.ts
│   │   │   ├── knowledge.model.ts
│   │   │   └── response.model.ts
│   │   ├── repositories/         # Database access layer
│   │   │   ├── mongodb.repository.ts
│   │   │   └── chroma.repository.ts
│   │   ├── jobs/                 # Scheduled jobs
│   │   │   └── discovery.job.ts
│   │   ├── middleware/           # Express middleware
│   │   │   ├── error-handler.ts
│   │   │   ├── validation.ts
│   │   │   └── logging.ts
│   │   └── utils/                # Utilities
│   │       ├── logger.ts
│   │       ├── config.ts
│   │       └── helpers.ts
│   │
│   ├── frontend/                 # React frontend
│   │   ├── index.html            # HTML entry point
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Root component
│   │   ├── components/           # React components
│   │   │   ├── common/           # Shared components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── Modal.tsx
│   │   │   ├── opportunities/    # Opportunity components
│   │   │   │   ├── OpportunityList.tsx
│   │   │   │   ├── OpportunityCard.tsx
│   │   │   │   └── OpportunityDetail.tsx
│   │   │   ├── knowledge/        # Knowledge base components
│   │   │   │   ├── DocumentList.tsx
│   │   │   │   ├── DocumentUpload.tsx
│   │   │   │   └── DocumentCard.tsx
│   │   │   ├── responses/        # Response components
│   │   │   │   ├── ResponseEditor.tsx
│   │   │   │   ├── ResponsePreview.tsx
│   │   │   │   └── ResponseActions.tsx
│   │   │   └── settings/         # Settings components
│   │   │       ├── AccountSettings.tsx
│   │   │       ├── DiscoverySettings.tsx
│   │   │       └── VoiceSettings.tsx
│   │   ├── pages/                # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Opportunities.tsx
│   │   │   ├── Knowledge.tsx
│   │   │   ├── Responses.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useOpportunities.ts
│   │   │   ├── useKnowledge.ts
│   │   │   ├── useResponses.ts
│   │   │   └── useAccount.ts
│   │   ├── api/                  # API client
│   │   │   └── client.ts
│   │   ├── styles/               # CSS/Tailwind
│   │   │   └── globals.css
│   │   └── utils/                # Frontend utilities
│   │       ├── formatters.ts
│   │       └── validators.ts
│   │
│   └── shared/                   # Shared between FE/BE
│       ├── types/                # TypeScript interfaces
│       │   ├── account.types.ts
│       │   ├── opportunity.types.ts
│       │   ├── knowledge.types.ts
│       │   ├── response.types.ts
│       │   └── api.types.ts
│       ├── constants/            # Shared constants
│       │   └── index.ts
│       └── validation/           # Shared validation schemas
│           └── schemas.ts
│
├── scripts/                      # Utility scripts
│   ├── init-db.ts               # Initialize database
│   ├── reset-db.ts              # Reset database
│   └── seed-data.ts             # Seed sample data
│
├── tests/                        # Tests
│   ├── unit/                     # Unit tests
│   │   ├── backend/
│   │   └── frontend/
│   ├── integration/              # Integration tests
│   │   └── api/
│   └── e2e/                      # End-to-end tests
│       └── playwright/
│
└── data/                         # Local data (not committed)
    ├── uploads/                  # Uploaded documents
    │   └── {accountId}/
    ├── mongodb/                  # MongoDB data (Docker volume)
    └── chroma/                   # ChromaDB data (Docker volume)
```

## Key Directories

### `/src/backend`
Node.js/TypeScript backend server handling:
- REST API endpoints
- Business logic (discovery, response generation)
- Database operations (MongoDB, ChromaDB)
- Platform integrations (Bluesky)
- Scheduled jobs (discovery cron)

### `/src/frontend`
React/TypeScript frontend application:
- User interface components
- Page layouts
- API client
- State management (React Query)

### `/src/shared`
Code shared between frontend and backend:
- TypeScript type definitions
- Constants
- Validation schemas (Zod)

### `/docs`
Project documentation:
- Setup guides
- Architecture documentation
- API specifications
- Architecture Decision Records

### `/scripts`
Utility scripts:
- Database initialization
- Data seeding
- Maintenance tasks

### `/tests`
Test suites:
- Unit tests (Vitest)
- Integration tests
- E2E tests (Playwright)

## Configuration Files

### TypeScript Configuration

**tsconfig.json** (root)
- Base configuration
- Path mappings
- Shared compiler options

**tsconfig.backend.json**
- Extends base config
- Backend-specific settings
- Output to `dist/backend`

**tsconfig.frontend.json**
- Extends base config
- Frontend-specific settings
- React JSX support

### Build Configuration

**package.json**
- Dependencies
- Scripts for dev/build/test
- Project metadata

**vite.config.ts**
- Frontend build configuration
- Development server
- Plugin configuration

### Linting & Formatting

**eslint.config.js**
- ESLint rules
- TypeScript integration
- React plugin configuration

**.prettierrc**
- Code formatting rules

### Docker

**docker-compose.yml**
- MongoDB service
- ChromaDB service
- Volume mappings
- Network configuration

## Data Flow

```
User Request (Browser)
    ↓
Frontend (React)
    ↓ HTTP/REST
Backend (Express)
    ↓
Service Layer
    ↓
Repositories
    ↓
┌─────────────┬──────────────┐
│  MongoDB    │  ChromaDB    │
└─────────────┴──────────────┘
```

## Build Process

### Development

```bash
npm run dev
```

Runs:
- Backend: `tsx watch src/backend/index.ts`
- Frontend: `vite` (dev server with HMR)

### Production Build

```bash
npm run build
```

1. Compiles TypeScript (backend) → `dist/backend`
2. Builds React (frontend) → `dist/frontend`
3. Backend serves frontend assets in production

### Production Run

```bash
npm start
```

Runs compiled backend, which serves frontend assets.

## Environment Setup

### Required Files

1. `.env` (created from `.env.example`)
2. Docker services running
3. MongoDB initialized
4. ChromaDB accessible

### First-Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env with credentials
nano .env

# 4. Start Docker services
docker-compose up -d

# 5. Initialize database
npm run db:init

# 6. Start development server
npm run dev
```

## Development Workflow

1. **Feature Branch**: Create from `develop`
2. **Implementation**: Write code in appropriate directory
3. **Testing**: Add/update tests
4. **Linting**: Run `npm run lint`
5. **Type Check**: Run `npm run type-check`
6. **Documentation**: Update docs as needed
7. **Pull Request**: Submit for review

## Module Boundaries

### Backend Modules

- **API Layer**: HTTP endpoints, request/response handling
- **Service Layer**: Business logic, orchestration
- **Repository Layer**: Database access
- **Models**: Data structures

Dependencies flow: API → Service → Repository → Database

### Frontend Modules

- **Pages**: Top-level routes
- **Components**: Reusable UI elements
- **Hooks**: Reusable logic
- **API Client**: Backend communication

## Testing Strategy

### Unit Tests
- Service functions
- Utility functions
- React components (isolated)

### Integration Tests
- API endpoints
- Database operations
- Service integrations

### E2E Tests
- Complete user workflows
- Critical paths

## Deployment

### Local Development
- Docker Compose for services
- npm scripts for app

### Production (Future)
- Containerized deployment
- Environment-specific configs
- CI/CD pipeline

## Related Documentation

- [Architecture Overview](architecture/overview.md)
- [API Specification](architecture/api-spec.md)
- [Contributing Guidelines](CONTRIBUTING.md)