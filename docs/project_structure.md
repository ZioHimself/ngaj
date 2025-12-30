# ngaj Project Structure

This document outlines the high-level project structure for ngaj. Internal organization within each major directory will be determined by test-writer and implementer agents during TDD cycles.

## Current Directory Layout (Phase 1)

```
ngaj/
├── .gitignore                    # Git ignore rules
├── package.json                  # Node.js dependencies and scripts
├── tsconfig.json                 # TypeScript configuration (base)
├── tsconfig.backend.json         # Backend-specific TypeScript config
├── tsconfig.frontend.json        # Frontend-specific TypeScript config
├── vite.config.ts                # Vite build configuration
├── vitest.config.ts              # Vitest test configuration
├── playwright.config.ts          # Playwright E2E test configuration
├── eslint.config.js              # ESLint configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
├── README.md                     # Project overview
├── LICENSE                       # MIT license
│
├── .agents/                      # Agent workflow artifacts (not in production)
│   ├── README.md                 # Agent system documentation
│   ├── config/                   # Agent configuration
│   ├── context/                  # Project context (glossary, tech stack)
│   ├── prompts/                  # Agent system prompts
│   │   ├── designer/
│   │   ├── test-writer/
│   │   ├── implementer/
│   │   └── reviewer/
│   ├── artifacts/                # Agent outputs
│   │   ├── designer/
│   │   │   ├── designs/
│   │   │   └── handoffs/
│   │   ├── test-writer/
│   │   │   ├── test-plans/
│   │   │   └── handoffs/
│   │   ├── implementer/
│   │   │   └── handoffs/
│   │   └── reviewer/
│   │       └── review-reports/
│   ├── docs/                     # Agent system documentation
│   └── templates/                # Document templates
│
├── docs/                         # Project documentation
│   ├── setup.md                  # Setup and installation guide
│   ├── project_structure.md      # This file
│   ├── api/
│   │   └── openapi.yaml          # API specification
│   └── architecture/
│       ├── overview.md           # System architecture
│       └── decisions/            # Architecture Decision Records (ADRs)
│
├── src/                          # Source code
│   ├── shared/                   # Shared code used across backend and frontend
│   │   ├── types/                # Shared TypeScript type definitions
│   │   └── errors/               # Custom error classes
│   │
│   ├── backend/                  # Node.js/Express backend
│   │   ├── index.ts              # Server entry point
│   │   └── config/
│   │       └── database.ts       # MongoDB connection
│   │
│   └── frontend/                 # React frontend
│       ├── index.html            # HTML entry point
│       ├── main.tsx              # React entry point
│       ├── App.tsx               # Root component
│       └── index.css             # Tailwind CSS imports
│
├── tests/                        # Test suites
│   ├── unit/                     # Unit tests (Vitest)
│   │   └── example.spec.ts
│   ├── integration/              # Integration tests
│   │   ├── api/
│   │   └── database/
│   └── e2e/                      # End-to-end tests (Playwright)
│
└── dist/                         # Build output (gitignored)
    ├── backend/                  # Compiled backend
    └── frontend/                 # Compiled frontend assets
```

## High-Level Structure Guidelines

### `/src/shared` - Shared Code
- Code shared across backend and frontend
- Includes types, error classes, and utilities

#### `/src/shared/types` - Shared Type Definitions
- TypeScript interfaces and types shared across backend and frontend
- Type guards and validation helpers
- Exported through `index.ts` for clean imports

#### `/src/shared/errors` - Custom Error Classes
- Application-specific error types

### `/src/backend` - Node.js Backend
- Express server with RESTful API
- Business logic and data access layers
- Integration with MongoDB and ChromaDB
- Platform adapters (Bluesky, etc.)
- Internal structure to be determined by implementer agent

**Current Phase 1 Infrastructure:**
- `index.ts` - Express server with health check and placeholder endpoints
- `config/database.ts` - MongoDB connection management

### `/src/frontend` - React Frontend  
- User interface built with React 18 and TypeScript
- Styled with Tailwind CSS
- Vite for development and building
- Internal component organization to be determined by implementer agent

**Current Phase 1 Infrastructure:**
- `index.html`, `main.tsx`, `App.tsx` - Basic app structure with health check UI
- `index.css` - Tailwind imports

### `/tests` - Test Suites
- **Unit tests**: Test individual functions/components in isolation (Vitest)
- **Integration tests**: Test API endpoints and database interactions
- **E2E tests**: Test complete user workflows (Playwright)
- Test structure mirrors source structure where applicable

### `/.agents` - Agent Workflow System
- Not part of production application
- Contains prompts, artifacts, and documentation for AI agent workflow
- See `.agents/README.md` for complete documentation
- Organized by agent role (designer, test-writer, implementer, reviewer)

### `/docs` - Documentation
- Architecture Decision Records (ADRs) documenting major design choices
- API specifications (OpenAPI/Swagger)
- Setup and user guides
- Architecture overview and diagrams

## Configuration Files

### TypeScript
- **`tsconfig.json`** - Base configuration for shared types
- **`tsconfig.backend.json`** - Backend compilation (NodeNext module resolution)
- **`tsconfig.frontend.json`** - Frontend compilation (React JSX, DOM types)

### Build & Development
- **`package.json`** - Dependencies, scripts, metadata
- **`vite.config.ts`** - Frontend dev server and build
- **`vitest.config.ts`** - Unit test runner
- **`playwright.config.ts`** - E2E test runner

### Code Quality
- **`eslint.config.js`** - Linting rules for TypeScript and React
- **`tailwind.config.js`** - Tailwind CSS configuration
- **`postcss.config.js`** - PostCSS configuration

### Environment
- **`.env`** (not committed) - Environment variables, created from `.env.example`
- **`.gitignore`** - Files excluded from version control

## Related Documentation

- [Setup Guide](setup.md) - Detailed setup instructions
- [Architecture Overview](architecture/overview.md) - System architecture
- [Architecture Decision Records](architecture/decisions/) - ADR-001 through ADR-006
- [API Specification](api/openapi.yaml) - OpenAPI spec
- [Agent System](.agents/README.md) - AI agent workflow documentation