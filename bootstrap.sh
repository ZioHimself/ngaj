#!/bin/bash

# ngaj - Project Bootstrap Script (Iteration 1)
# This script sets up: documentation, agent configs, test setup, and CI pipeline

set -e  # Exit on error

echo "🚀 Bootstrapping ngaj - Iteration 1"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# 1. PROJECT INITIALIZATION
# ============================================================================

echo -e "${BLUE}📦 Step 1: Initializing project...${NC}"

# Initialize git repository
git init
echo "✓ Git repository initialized"

# Initialize npm project
npm init -y

# Update package.json with project info
npm pkg set name="ngaj"
npm pkg set version="0.1.0"
npm pkg set description="AI-powered social media engagement assistant"
npm pkg set main="dist/index.js"
npm pkg set type="module"
npm pkg set license="MIT"
npm pkg set author="Your Name <your.email@example.com>"

# Set keywords array
npm pkg set keywords[0]="social-media"
npm pkg set keywords[1]="ai"
npm pkg set keywords[2]="automation"
npm pkg set keywords[3]="engagement"
npm pkg set keywords[4]="tdd"

echo "✓ NPM project initialized"
echo ""

# ============================================================================
# 2. INSTALL DEPENDENCIES
# ============================================================================

echo -e "${BLUE}📚 Step 2: Installing dependencies...${NC}"

# Core dependencies
npm install typescript@latest tsx@latest

# Testing dependencies
npm install --save-dev \
  vitest@latest \
  @vitest/ui@latest \
  @playwright/test@latest \
  supertest@latest \
  @types/supertest@latest

# Development tools
npm install --save-dev \
  @types/node@latest \
  prettier@latest \
  eslint@latest \
  @typescript-eslint/parser@latest \
  @typescript-eslint/eslint-plugin@latest

# Utilities
npm install chalk@latest

echo "✓ Dependencies installed"
echo ""

# ============================================================================
# 3. TYPESCRIPT CONFIGURATION
# ============================================================================

echo -e "${BLUE}⚙️  Step 3: Configuring TypeScript...${NC}"

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./src/*"],
      "@agents/*": ["./.agents/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*", ".agents/**/*"],
  "exclude": ["node_modules", "dist", ".agents/artifacts"]
}
EOF

echo "✓ TypeScript configured"
echo ""

# ============================================================================
# 4. TEST CONFIGURATION
# ============================================================================

echo -e "${BLUE}🧪 Step 4: Configuring test framework...${NC}"

# Vitest config
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '.agents/artifacts/'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    include: ['tests/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', '.agents/artifacts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@agents': path.resolve(__dirname, './.agents')
    }
  }
});
EOF

# Playwright config
cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
EOF

echo "✓ Test frameworks configured"
echo ""

# ============================================================================
# 5. DIRECTORY STRUCTURE
# ============================================================================

echo -e "${BLUE}📁 Step 5: Creating directory structure...${NC}"

# Source directories
mkdir -p src/{services,adapters,utils}
mkdir -p src/types

# Test directories
mkdir -p tests/{unit,integration,e2e}
mkdir -p tests/unit/{services,adapters,utils}
mkdir -p tests/integration/{api,database}

# Agent directories
mkdir -p .agents/{prompts,logs,artifacts,context,config,workflows,metrics}
mkdir -p .agents/prompts/{test-writer,implementer,reviewer}
mkdir -p .agents/prompts/test-writer/{examples,context}
mkdir -p .agents/prompts/implementer/{examples,context}
mkdir -p .agents/prompts/reviewer/{checklists,context}
mkdir -p .agents/logs/{test-writer,implementer,reviewer}
mkdir -p .agents/artifacts/{test-writer,implementer,reviewer}
mkdir -p .agents/artifacts/test-writer/{draft-tests,test-plans}
mkdir -p .agents/artifacts/implementer/{draft-implementations,design-docs}
mkdir -p .agents/artifacts/reviewer/{review-reports,improvement-suggestions}
mkdir -p .agents/context/decisions
mkdir -p .agents/approvals/{pending,approved,rejected}

# Documentation
mkdir -p docs/{architecture,guides,api}

# Requirements
mkdir -p requirements/features

echo "✓ Directory structure created"
echo ""

# ============================================================================
# 6. AGENT CONFIGURATIONS
# ============================================================================

echo -e "${BLUE}🤖 Step 6: Creating agent configurations...${NC}"

# Main agent config
cat > .agents/config/agents.json << 'EOF'
{
  "agents": [
    {
      "id": "test-writer",
      "name": "Test Writer Agent",
      "role": "Write comprehensive tests based on requirements",
      "model": "claude-sonnet-4.5",
      "system_prompt_path": ".agents/prompts/test-writer/system-prompt.md",
      "context_paths": [
        ".agents/prompts/test-writer/context/",
        ".agents/context/architecture.md",
        ".agents/context/tech-stack.md"
      ],
      "output_directory": ".agents/artifacts/test-writer/",
      "log_directory": ".agents/logs/test-writer/",
      "capabilities": ["write_tests", "create_test_plans", "requirement_analysis"],
      "constraints": {
        "max_test_file_size": 500,
        "must_link_to_requirement": true,
        "must_fail_initially": true
      }
    },
    {
      "id": "implementer",
      "name": "Implementer Agent",
      "role": "Implement code to make tests pass",
      "model": "claude-sonnet-4.5",
      "system_prompt_path": ".agents/prompts/implementer/system-prompt.md",
      "context_paths": [
        ".agents/prompts/implementer/context/",
        ".agents/context/architecture.md",
        ".agents/context/tech-stack.md",
        ".agents/context/decisions/"
      ],
      "output_directory": ".agents/artifacts/implementer/",
      "log_directory": ".agents/logs/implementer/",
      "capabilities": ["write_implementation", "create_design_docs", "refactor_code"],
      "constraints": {
        "must_pass_existing_tests": true,
        "no_test_modification": true,
        "follow_architecture": true
      }
    },
    {
      "id": "reviewer",
      "name": "Reviewer Agent",
      "role": "Review code quality, security, and standards",
      "model": "claude-opus-4.1",
      "system_prompt_path": ".agents/prompts/reviewer/system-prompt.md",
      "context_paths": [
        ".agents/prompts/reviewer/checklists/",
        ".agents/prompts/reviewer/context/",
        ".agents/context/"
      ],
      "output_directory": ".agents/artifacts/reviewer/",
      "log_directory": ".agents/logs/reviewer/",
      "capabilities": ["code_review", "security_analysis", "performance_analysis"],
      "constraints": {
        "must_check_all_checklists": true,
        "provide_actionable_feedback": true,
        "confidence_threshold": 0.7
      }
    }
  ],
  "workflows": {
    "tdd-cycle": {
      "steps": [
        {
          "agent": "test-writer",
          "input": "requirement",
          "output": "failing_tests"
        },
        {
          "agent": "implementer",
          "input": "failing_tests",
          "output": "implementation"
        },
        {
          "agent": "reviewer",
          "input": ["implementation", "tests"],
          "output": "review_report"
        }
      ]
    }
  }
}
EOF

# Human approval config
cat > .agents/config/human-approval.json << 'EOF'
{
  "version": "1.0",
  "approval_rules": {
    "global": {
      "enabled": true,
      "default_confidence_threshold": 0.8,
      "notification_methods": ["terminal"],
      "timeout_minutes": 60,
      "timeout_action": "block"
    },
    "agents": {
      "test-writer": {
        "confidence_threshold": 0.7
      },
      "implementer": {
        "confidence_threshold": 0.75,
        "require_approval_for": [
          {"decision_type": "architecture", "confidence_below": 0.85},
          {"decision_type": "external_dependency", "confidence_below": 0.9},
          {"tags": ["security"], "confidence_below": 1.0}
        ]
      },
      "reviewer": {
        "confidence_threshold": 0.8
      }
    }
  }
}
EOF

# Initialize decision logs
touch .agents/logs/test-writer/decisions.jsonl
touch .agents/logs/implementer/decisions.jsonl
touch .agents/logs/reviewer/decisions.jsonl

echo "✓ Agent configurations created"
echo ""

# ============================================================================
# 7. DOCUMENTATION
# ============================================================================

echo -e "${BLUE}📖 Step 7: Creating documentation...${NC}"

# Main README
cat > README.md << 'EOF'
# ngaj

> AI-powered social media engagement assistant

[![CI](https://github.com/yourusername/ngaj/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/ngaj/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-0%25-red.svg)](./coverage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## What is ngaj?

ngaj helps you discover relevant social media conversations and suggests thoughtful responses powered by Claude AI. Built with Test-Driven Development and multi-agent workflows.

## Features (Planned)

- 🔍 **Smart Discovery**: Find conversations matching your interests
- 🤖 **AI Responses**: Claude-powered response suggestions
- 🎯 **Context-Aware**: Uses your knowledge base and tone preferences
- 🛡️ **Safety First**: Built-in oversight to detect prompt attacks
- 🧪 **Test-Driven**: Comprehensive test coverage from day one

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Testing**: Vitest + Playwright
- **AI**: Anthropic Claude API
- **Database**: PostgreSQL + Vector DB (Qdrant)
- **Development**: Multi-agent TDD workflow

## Project Status

**Iteration 1** (Current): 
- [x] Documentation
- [x] Agent configurations
- [x] Test setup
- [x] CI pipeline
- [ ] Core implementation

## Getting Started

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Documentation

- [Architecture Overview](./docs/architecture/README.md)
- [Agent System](./docs/guides/agent-system.md)
- [Testing Strategy](./docs/guides/testing-strategy.md)
- [Contributing](./CONTRIBUTING.md)

## License

MIT © [Your Name]
EOF

# Architecture doc
cat > docs/architecture/README.md << 'EOF'
# ngaj Architecture

## Overview

ngaj is built with a clean, layered architecture following SOLID principles and Test-Driven Development.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend Layer                      │
│              (React/Next.js + TypeScript)           │
└─────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────┐
│                   API Gateway                        │
│              (Express/Fastify + TypeScript)         │
└─────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────┐
│                  Core Services                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │Discovery │  │Response  │  │Safety    │         │
│  │Service   │  │Generator │  │Oversight │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────┐
│              Social Media Adapters                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │Twitter/X │  │Reddit    │  │Bluesky   │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────┐
│                  Data Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │PostgreSQL│  │Vector DB │  │Redis     │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
```

## Key Principles

1. **Test-Driven Development**: Write tests first, then implementation
2. **Clean Architecture**: Separation of concerns, dependency inversion
3. **Multi-Agent Development**: Specialized AI agents for different tasks
4. **Type Safety**: TypeScript strict mode throughout

## Documentation

- [Component Diagram](./component-diagram.md)
- [Data Flow](./data-flow.md)
- [Decision Records](../../.agents/context/decisions/)

See [full architecture documentation](../../docs/architecture/) for details.
EOF

# Agent system guide
cat > docs/guides/agent-system.md << 'EOF'
# Agent System Guide

## Overview

ngaj uses a multi-agent system for development:

1. **Test-Writer Agent**: Writes comprehensive tests from requirements
2. **Implementer Agent**: Implements code to pass tests
3. **Reviewer Agent**: Reviews code for quality and security

## Configuration

Agent configurations are in `.agents/config/agents.json`.

## Usage

See [Multi-Agent Workflow Documentation](../../.agents/README.md) for details.

## Prompts

Agent prompts are stored in `.agents/prompts/[agent-name]/`.

## Decision Logs

All agent decisions are logged in `.agents/logs/[agent-name]/decisions.jsonl`.
EOF

# Tech stack doc
cat > .agents/context/tech-stack.md << 'EOF'
# ngaj Tech Stack

## Core Technologies

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 20+
- **Package Manager**: npm

## Testing

- **Unit/Integration**: Vitest
- **E2E**: Playwright
- **Mocking**: MSW (Mock Service Worker)
- **Coverage**: c8 (built into Vitest)

## AI/ML

- **LLM**: Anthropic Claude API (Sonnet 4.5)
- **Embeddings**: Claude or OpenAI ada-002
- **Vector DB**: Qdrant (self-hosted)

## Database

- **Primary**: PostgreSQL 15+
- **Cache**: Redis
- **Vector**: Qdrant

## Development

- **Code Quality**: ESLint, Prettier
- **CI/CD**: GitHub Actions
- **Version Control**: Git
- **Development Workflow**: TDD with multi-agent system

## Deployment

- **Target**: Self-hosted (local hardware)
- **Containerization**: Docker + Docker Compose
EOF

# Project glossary
cat > .agents/context/project-glossary.md << 'EOF'
# ngaj Project Glossary

## Terms

- **Discovery**: Process of finding relevant social media posts
- **Engagement**: Responding to or interacting with posts
- **Adapter**: Platform-specific integration (Twitter, Reddit, etc.)
- **Oversight**: Safety checks for prompt attacks and relevance
- **Agent**: Specialized AI assistant (Test-Writer, Implementer, Reviewer)
- **Decision Log**: Record of agent decision-making process
- **Confidence Score**: Agent's certainty about a decision (0.0-1.0)
- **TDD**: Test-Driven Development methodology

## Acronyms

- **PD**: Post Discovery (requirement category)
- **RG**: Response Generation (requirement category)
- **SO**: Safety Oversight (requirement category)
- **ADR**: Architecture Decision Record
- **HITL**: Human-in-the-Loop
EOF

echo "✓ Documentation created"
echo ""

# ============================================================================
# 8. NPM SCRIPTS
# ============================================================================

echo -e "${BLUE}📜 Step 8: Configuring npm scripts...${NC}"

npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest watch"
npm pkg set scripts.test:ui="vitest --ui"
npm pkg set scripts.test:coverage="vitest run --coverage"
npm pkg set scripts.test:unit="vitest run tests/unit"
npm pkg set scripts.test:integration="vitest run tests/integration"
npm pkg set scripts.test:e2e="playwright test"
npm pkg set scripts.build="tsc"
npm pkg set scripts.dev="tsx watch src/index.ts"
npm pkg set scripts.lint="eslint . --ext .ts,.tsx"
npm pkg set scripts.format="prettier --write \"**/*.{ts,tsx,md,json}\""
npm pkg set scripts.type-check="tsc --noEmit"

echo "✓ NPM scripts configured"
echo ""

# ============================================================================
# 9. CI/CD PIPELINE
# ============================================================================

echo -e "${BLUE}⚙️  Step 9: Creating CI/CD pipeline...${NC}"

mkdir -p .github/workflows

cat > .github/workflows/ci.yml << 'EOF'
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Test Suite
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run integration tests
        run: npm run test:integration

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            test-results/
            playwright-report/

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
EOF

echo "✓ CI/CD pipeline created"
echo ""

# ============================================================================
# 10. LINTING AND FORMATTING
# ============================================================================

echo -e "${BLUE}✨ Step 10: Configuring linting and formatting...${NC}"

# ESLint config
cat > .eslintrc.json << 'EOF'
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
EOF

# Prettier config
cat > .prettierrc.json << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
EOF

# Prettier ignore
cat > .prettierignore << 'EOF'
node_modules
dist
coverage
.next
.agents/artifacts
EOF

echo "✓ Linting and formatting configured"
echo ""

# ============================================================================
# 11. SAMPLE FILES
# ============================================================================

echo -e "${BLUE}📝 Step 11: Creating sample files...${NC}"

# Sample requirement
cat > requirements/features/example.feature << 'EOF'
Feature: Example Feature
  As a developer
  I want to see an example feature file
  So that I understand the format

  Background:
    Given the system is initialized

  @requirement:EX-001
  Scenario: Example scenario
    Given I have a feature
    When I implement it
    Then it should work
EOF

# Sample test
cat > tests/unit/example.spec.ts << 'EOF'
import { describe, it, expect } from 'vitest';

// @requirement: EX-001
describe('Example Test Suite', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });

  it('should demonstrate testing', () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
EOF

# Sample source file
cat > src/index.ts << 'EOF'
/**
 * ngaj - AI-powered social media engagement assistant
 */

export const version = '0.1.0';

export function hello(): string {
  return 'Hello from ngaj!';
}

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('ngaj v' + version);
  console.log(hello());
}
EOF

echo "✓ Sample files created"
echo ""

# ============================================================================
# 12. CURSOR IDE CONFIGURATION
# ============================================================================

echo -e "${BLUE}🎯 Step 12: Configuring Cursor IDE...${NC}"

mkdir -p .vscode

cat > .cursorrules << 'EOF'
# Cursor AI Agent Rules for ngaj

## Test-Writer Agent Mode

When I say "write tests for [requirement]":
1. Load system prompt from `.agents/prompts/test-writer/system-prompt.md`
2. Read requirement from `requirements/features/[requirement].feature`
3. Generate test plan in `.agents/artifacts/test-writer/test-plans/`
4. Write tests in `tests/` directory
5. Log decisions to `.agents/logs/test-writer/decisions.jsonl`
6. Verify tests fail (Red phase)

## Implementer Agent Mode

When I say "implement [requirement]":
1. Load system prompt from `.agents/prompts/implementer/system-prompt.md`
2. Read failing tests
3. Implement in `src/` directory
4. Run tests to verify they pass (Green phase)
5. Log decisions to `.agents/logs/implementer/decisions.jsonl`

## Reviewer Agent Mode

When I say "review [change]":
1. Load system prompt from `.agents/prompts/reviewer/system-prompt.md`
2. Load checklists from `.agents/prompts/reviewer/checklists/`
3. Review code and tests
4. Generate report in `.agents/artifacts/reviewer/review-reports/`

## Context Loading

Always load:
- `.agents/context/tech-stack.md`
- `.agents/context/project-glossary.md`
EOF

cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.agents/artifacts": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  }
}
EOF

echo "✓ Cursor IDE configured"
echo ""

# ============================================================================
# 13. INITIAL GIT COMMIT
# ============================================================================

echo -e "${BLUE}📦 Step 13: Creating initial commit...${NC}"

git add .
git commit -m "chore: initial project setup (iteration 1)

- Initialize npm project with TypeScript
- Configure Vitest and Playwright for testing
- Set up multi-agent development system
- Create documentation structure
- Add CI/CD pipeline with GitHub Actions
- Configure ESLint and Prettier
- Add sample test to verify setup"

echo "✓ Initial commit created"
echo ""

# ============================================================================
# 14. VERIFICATION
# ============================================================================

echo -e "${BLUE}✅ Step 14: Verifying setup...${NC}"

# Run type check
echo "Running type check..."
npm run type-check

# Run sample test
echo "Running sample test..."
npm test

echo ""
echo -e "${GREEN}=================================="
echo -e "✨ Setup Complete! ✨"
echo -e "==================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Replace [Your Name] in LICENSE and package.json"
echo "2. Update README.md with your GitHub username"
echo "3. Create GitHub repository: gh repo create ngaj --public"
echo "4. Push to GitHub: git push -u origin main"
echo "5. Start development: npm run test:watch"
echo ""
echo -e "${BLUE}Quick reference:${NC}"
echo "  npm test              - Run all tests"
echo "  npm run test:watch    - Run tests in watch mode"
echo "  npm run test:coverage - Run with coverage report"
echo "  npm run dev           - Start development server"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
EOF

chmod +x bootstrap.sh
