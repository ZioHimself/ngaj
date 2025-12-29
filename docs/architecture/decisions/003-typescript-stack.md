# ADR-003: TypeScript for Full Stack

## Status
Accepted

## Context
Need to choose tech stack for frontend and backend

## Decision
TypeScript + Node.js for both frontend and backend

## Rationale
- Share types between FE/BE
- Single language, unified codebase
- Strong Bluesky and Anthropic SDK support
- User preference

## Consequences
- ChromaDB is Python-based (need to run separate service or use HTTP API)
- But: acceptable, can use docker-compose for dependencies
```

---

### **2. System Architecture Diagram** ⭐

Visual overview of components and data flow.

**C4 Model - Context Diagram**:
```
┌─────────────────────────────────────────────────────┐
│                      User                           │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────┐
│                                                    │
│                  ngaj System                       │
│  (Proactive Engagement Companion)                  │
│                                                    │
└─────┬──────────────────────────────┬───────────────┘
      │                              │
      ▼                              ▼
┌─────────────┐              ┌──────────────────┐
│  Bluesky    │              │ Anthropic Claude │
│  Platform   │              │      API         │
└─────────────┘              └──────────────────┘
```

**C4 Model - Container Diagram**:
```
┌─────────────────────────────────────────────────────┐
│                  ngaj System                        │
│                                                     │
│  ┌────────────┐         ┌───────────────────────┐   │
│  │ React UI   │◄────────┤  Node.js Backend      │   │
│  │ (Browser)  │  HTTP   │  (Express/Fastify)    │   │
│  └────────────┘         └───────┬───────────────┘   │
│                                 │                   │
│  ┌─────────────────────┬────────┴────┬──────────┐   │
│  │                     │             │          │   │
│  ▼                     ▼             ▼          ▼   │
│ ┌──────────┐  ┌──────────┐   ┌──────────┐   ┌────┐  │
│ │ MongoDB  │  │ ChromaDB │   │ File     │   │Cron│  │
│ │ (Config) │  │ (Vectors)│   │ Storage  │   │Job │  │
│ └──────────┘  └──────────┘   └──────────┘   └────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
        │                        │
        ▼                        ▼
   ┌─────────┐          ┌───────────────┐
   │Bluesky  │          │Anthropic API  │
   │   API   │          │               │
   └─────────┘          └───────────────┘
```

**Component Diagram** (detailed view of backend):
```
┌───────────────────────────────────────────────────┐
│               Backend Services                    │
│                                                   │
│  ┌──────────────────────────────────────────┐     │
│  │         API Layer (Express)              │     │
│  │  - /api/accounts                         │     │
│  │  - /api/opportunities                    │     │
│  │  - /api/knowledge                        │     │
│  │  - /api/responses                        │     │
│  └────┬─────────────────────────────────────┘     │
│       │                                           │
│  ┌────┴───────────────────────────────────────┐   │
│  │         Service Layer                      │   │
│  │                                            │   │
│  │  ┌──────────────┐    ┌─────────────────┐   │   │
│  │  │ Discovery    │    │ Response        │   │   │
│  │  │ Service      │    │ Generator       │   │   │
│  │  └──────────────┘    └─────────────────┘   │   │
│  │                                            │   │
│  │  ┌──────────────┐    ┌─────────────────┐   │   │
│  │  │ Knowledge    │    │ Bluesky         │   │   │
│  │  │ Service      │    │ Client          │   │   │
│  │  └──────────────┘    └─────────────────┘   │   │
│  └────┬──────────────────────┬────────────────┘   │
│       │                      │                    │
│  ┌────┴──────────┐     ┌─────┴──────────┐         │
│  │  MongoDB      │     │  ChromaDB      │         │
│  │  Repository   │     │  Client        │         │
│  └───────────────┘     └────────────────┘         │
└───────────────────────────────────────────────────┘