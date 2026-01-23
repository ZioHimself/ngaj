# ngaj Project Structure

This document outlines the high-level project structure for ngaj. Internal organization within each major directory will be determined by test-writer and implementer agents during TDD cycles.

**Terminology**: "Platform" = Social Network (Bluesky, etc.). "OS" = Operating System (macOS, Windows).

## Directory Layout

```
ngaj/
├── packages/                     # npm workspaces (separate dependencies per package)
│   ├── backend/                  # @ngaj/backend - Node.js/Express API server
│   ├── frontend/                 # @ngaj/frontend - React web UI
│   ├── setup/                    # @ngaj/setup - CLI wizard for installation
│   └── shared/                   # @ngaj/shared - Types and errors used by all packages
│
├── installer/                    # Native installer packaging (OS-specific)
│   ├── scripts/                  # Post-install scripts (bash, PowerShell)
│   ├── macos/                    # macOS .pkg packaging and resources
│   └── windows/                  # Windows .msi packaging and resources
│
├── tests/                        # Test suites (mirrors packages/ structure)
│   ├── unit/                     # Unit tests (Vitest)
│   ├── integration/              # Integration tests (API, database)
│   ├── e2e/                      # End-to-end tests (Playwright)
│   └── fixtures/                 # Shared test data
│
├── docs/                         # Project documentation
│   ├── api/                      # API specifications (OpenAPI)
│   └── architecture/             # Architecture overview and ADRs
│
├── .agents/                      # Agent workflow system (not in production)
│   ├── prompts/                  # Agent system prompts by role
│   ├── artifacts/                # Agent outputs (designs, handoffs, reviews)
│   └── templates/                # Document templates
│
├── .github/                      # GitHub configuration
│   └── workflows/                # CI/CD workflows
│
├── docker-compose.yml            # Production service orchestration
└── [config files]                # TypeScript, ESLint, Vite, Tailwind configs
```

## Package Descriptions

### `packages/shared` - Shared Code (`@ngaj/shared`)
- TypeScript types and interfaces shared across all packages
- Custom error classes
- Validation helpers and type guards
- **No runtime dependencies** on other packages

### `packages/backend` - API Server (`@ngaj/backend`)
- Express server with RESTful API
- Business logic and service layers
- MongoDB and ChromaDB integration
- Platform adapters (Bluesky, future: LinkedIn, Reddit)
- Cron scheduler for discovery jobs
- **Depends on**: `@ngaj/shared`
- **Dockerfile**: Builds production Docker image

### `packages/frontend` - Web UI (`@ngaj/frontend`)
- React 18 with TypeScript
- Tailwind CSS styling
- Vite for development and building
- **Depends on**: `@ngaj/shared`

### `packages/setup` - Installation Wizard (`@ngaj/setup`)
- Interactive CLI for credential collection (inquirer.js)
- Credential validators (Bluesky, Claude API)
- Environment file writer
- **Depends on**: `@ngaj/shared`
- **Dockerfile**: Builds setup wizard Docker image
- **Runs**: Temporarily during installation, then destroyed

### `installer/` - Native Installer Packaging
- **OS-specific** packaging for macOS (.pkg) and Windows (.msi)
- Post-install scripts that orchestrate Docker installation and setup
- Resources: icons, license text, welcome screens
- **Not an npm package** - build tooling only

### `tests/` - Test Suites
- **Unit tests**: Isolated function/component tests (Vitest)
- **Integration tests**: API endpoints, database, service interactions
- **E2E tests**: Complete user workflows (Playwright)
- **Fixtures**: Shared test data and mocks

### `.agents/` - Agent Workflow System
- Not part of production application
- Prompts, artifacts, and documentation for AI agent workflow
- Organized by agent role (designer, test-writer, implementer, reviewer)

### `docs/` - Documentation
- Architecture Decision Records (ADRs)
- API specifications (OpenAPI)
- Setup guides and architecture overview

## Configuration Files

### Root Level
- **`package.json`** - Workspace configuration and root scripts
- **`docker-compose.yml`** - Production service orchestration
- **`turbo.json`** (optional) - Build orchestration for workspaces

### Per-Package
Each package in `packages/` has its own:
- `package.json` - Package-specific dependencies
- `tsconfig.json` - TypeScript configuration
- `Dockerfile` (backend, setup only) - Docker image build

### Build & Development
- TypeScript configs for each package
- Vite for frontend development and building
- Vitest for unit/integration tests
- Playwright for E2E tests

### Code Quality
- ESLint for TypeScript and React linting
- Tailwind CSS for styling

### Environment
- **`.env`** (not committed) - Credentials and configuration
- **`~/.ngaj/.env`** (user home) - Production credentials written by setup wizard

## Build System

### npm Workspaces
Packages depend on each other via workspace protocol:
```
@ngaj/shared  ←──  @ngaj/backend
              ←──  @ngaj/frontend  
              ←──  @ngaj/setup
```

### Docker Images
| Image | Source | Purpose |
|-------|--------|---------|
| `ngaj/backend` | `packages/backend/` | Production API server |
| `ngaj/setup` | `packages/setup/` | Installation wizard (temporary) |

### Native Installers
Built via CI/CD on release:
- macOS: `.pkg` (pkgbuild or Packages app)
- Windows: `.msi` (WiX Toolset)

## Related Documentation

- [Setup Guide](setup.md) - Development setup instructions
- [Architecture Overview](architecture/overview.md) - System architecture
- [Architecture Decision Records](architecture/decisions/) - ADRs
- [API Specification](api/openapi.yaml) - OpenAPI spec
- [Agent System](../.agents/README.md) - AI agent workflow