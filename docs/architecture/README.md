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
