# ngaj Architecture Overview

> **Document Purpose**: This document provides a high-level architectural overview of the ngaj system, including system context, component architecture, core workflows, and operational considerations. For detailed specifications, see linked documents (ADRs, API specs, design docs).

## System Vision

ngaj is a **proactive engagement companion** designed to help users maintain authentic, strategic presence across social media communities. The system discovers engagement opportunities, crafts AI-powered responses grounded in user knowledge, and operates with a local-first, privacy-focused architecture.

## Core Principles

1. **Local-First**: All processing happens on the user's machine; data remains under user control
2. **AI-Assisted, Not AI-Driven**: Claude suggests, user decides and refines
3. **Knowledge-Grounded**: Responses are based on user's reference materials and past voice
4. **Privacy-Focused**: Credentials in environment variables, no cloud storage of sensitive data
5. **Proactive Discovery**: Surfaces opportunities users might otherwise miss

## High-Level Architecture

### System Context (C4 Level 1)

```
┌─────────────────────────────────────────────────────┐
│                      User                           │
│  (Community member, content creator)                │
└────────────┬────────────────────────────────────────┘
             │
             │ Configures, reviews opportunities,
             │ approves responses
             ▼
┌────────────────────────────────────────────────────┐
│                                                    │
│                  ngaj System                       │
│  (Proactive Engagement Companion)                  │
│                                                    │
│  - Discovers relevant conversations                │
│  - Generates AI-powered responses                  │
│  - Grounds responses in user knowledge             │
│  - Manages posting on user's behalf                │
│                                                    │
└─────┬──────────────────────────────┬───────────────┘
      │                              │
      │ Reads feeds,                 │ Generates
      │ posts replies                │ responses
      ▼                              ▼
┌─────────────┐              ┌──────────────────┐
│  Bluesky    │              │ Anthropic Claude │
│  Platform   │              │      API         │
│  (AT Proto) │              │  (Sonnet 4.5)    │
└─────────────┘              └──────────────────┘
```

### Container Architecture (C4 Level 2)

```
┌────────────────────────────────────────────────────────────┐
│                      ngaj System                           │
│                                                            │
│  ┌──────────────────┐         ┌────────────────────────┐   │
│  │   React Frontend │◄────────┤   Node.js Backend      │   │
│  │                  │  HTTP   │   (Express/Fastify)    │   │
│  │  - Dashboard UI  │  REST   │                        │   │
│  │  - Opportunities │         │  - API Routes          │   │
│  │  - Knowledge Mgmt│         │  - Business Logic      │   │
│  │  - Settings      │         │  - Cron Jobs           │   │
│  └──────────────────┘         └────┬───────────────────┘   │
│                                    │                       │
│  ┌──────────────┬──────────────────┴─────┬────────────┐    │
│  │              │                        │            │    │
│  ▼              ▼                        ▼            ▼    │
│ ┌───────────┐ ┌─────────────┐  ┌──────────────┐  ┌──────┐  │
│ │ MongoDB   │ │ ChromaDB    │  │ File Storage │  │ Cron │  │
│ │           │ │             │  │              │  │Sched.│  │
│ │ - Config  │ │ - Vectors   │  │ - Uploaded   │  │      │  │
│ │ - Opps    │ │ - Embeddings│  │   documents  │  └──────┘  │
│ │ - History │ │             │  │              │            │
│ └───────────┘ └─────────────┘  └──────────────┘            │
│                                                            │
└────────────────────────────────────────────────────────────┘
        │                              │
        │ AT Protocol                  │ REST API
        ▼                              ▼
   ┌─────────────┐              ┌───────────────┐
   │  Bluesky    │              │  Anthropic    │
   │  Platform   │              │  Claude API   │
   └─────────────┘              └───────────────┘
```

## Component Architecture

### Backend Services (Detailed)

```
┌─────────────────────────────────────────────────────────┐
│                   Backend Services                      │
│                                                         │
│  ┌────────────────────────────────────────────────┐     │
│  │            API Layer (Express)                 │     │
│  │                                                │     │
│  │  - Account Management (profiles, accounts)     │     │
│  │  - Opportunity Discovery & Retrieval           │     │
│  │  - Knowledge Base Upload & Query               │     │
│  │  - Response Generation & Posting               │     │
│  │  - System Health & Statistics                  │     │
│  │                                                │     │
│  │  📋 Full API Spec: docs/api/openapi.yaml       │     │
│  │                                                │     │
│  └────┬───────────────────────────────────────────┘     │
│       │                                                 │
│  ┌────┴──────────────────────────────────────────┐      │
│  │            Service Layer                      │      │
│  │                                               │      │
│  │  ┌─────────────────┐    ┌──────────────────┐  │      │
│  │  │ Discovery       │    │ Response         │  │      │
│  │  │ Service         │    │ Generator        │  │      │
│  │  │                 │    │                  │  │      │
│  │  │ - Score posts   │    │ - Build prompts  │  │      │
│  │  │ - Rank by       │    │ - Call Claude    │  │      │
│  │  │   relevance     │    │ - Format output  │  │      │
│  │  └─────────────────┘    └──────────────────┘  │      │
│  │                                               │      │
│  │  ┌─────────────────┐    ┌──────────────────┐  │      │
│  │  │ Knowledge       │    │ Bluesky          │  │      │
│  │  │ Service         │    │ Client           │  │      │
│  │  │                 │    │                  │  │      │
│  │  │ - Upload docs   │    │ - Auth           │  │      │
│  │  │ - Chunk text    │    │ - Poll feeds     │  │      │
│  │  │ - Generate      │    │ - Post replies   │  │      │
│  │  │   embeddings    │    │                  │  │      │
│  │  │ - Query vectors │    │                  │  │      │
│  │  └─────────────────┘    └──────────────────┘  │      │
│  │                                               │      │
│  └────┬────────────────────────┬─────────────────┘      │
│       │                        │                        │
│  ┌────┴─────────────┐    ┌─────┴─────────────┐          │
│  │  MongoDB         │    │  ChromaDB         │          │
│  │  Repository      │    │  Client           │          │
│  │                  │    │                   │          │
│  │  - CRUD ops      │    │  - Add docs       │          │
│  │  - Queries       │    │  - Query similar  │          │
│  │  - Indexes       │    │                   │          │
│  └──────────────────┘    └───────────────────┘          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

> **📋 Complete API Documentation**: See [OpenAPI Specification](../api/openapi.yaml) for full endpoint definitions, request/response schemas, error codes, and interactive documentation.

## Core Workflows

These diagrams illustrate the high-level flow through the system. For detailed API contracts and service interfaces, see the [OpenAPI Specification](../api/openapi.yaml) and [Design Documents](../.agents/artifacts/designer/designs/).

### 1. Discovery Workflow

```
┌──────────────┐
│ Cron Trigger │ (Every N hours)
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│ Discovery Service       │
│ - Load account config   │
│ - Get interests         │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Bluesky Client          │
│ - Fetch timeline        │
│ - Fetch mentions        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Scoring Algorithm       │
│ Impact = follower count │
│ Time = recency          │
│ Keywords = matches      │
│ Score = weighted sum    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Take Top N              │
│ Insert to MongoDB       │
│ Status: pending         │
└─────────────────────────┘
```

### 2. Response Generation Workflow

```
┌──────────────┐
│ User clicks  │
│ "Suggest"    │
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│ Load Opportunity        │
│ - Post content          │
│ - Author info           │
│ - Thread context        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Query Knowledge Base    │
│ - ChromaDB similarity   │
│ - Get top 5 chunks      │
│ - Include voice samples │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Build Claude Prompt     │
│ System: tone, voice     │
│ Context: knowledge      │
│ Task: generate response │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Call Anthropic API      │
│ Model: claude-sonnet-4.5│
│ Temperature: 0.7        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Save Response           │
│ Status: draft           │
│ Show to user            │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│ User Reviews            │
│ Options:                │
│ - Edit & Post           │
│ - Copy to clipboard     │
│ - Discard               │
└─────────────────────────┘
```

### 3. Knowledge Upload Workflow

```
┌──────────────┐
│ User uploads │
│ document     │
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│ Save to File System     │
│ ~/.ngaj/uploads/{id}/   │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Create MongoDB Record   │
│ Status: pending         │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Background Processing   │
│ - Extract text (PDF)    │
│ - Chunk into segments   │
│ - ~500 tokens each      │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Generate Embeddings     │
│ - Use Claude/OpenAI API │
│ - Create vectors        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Store in ChromaDB       │
│ Collection: account_kb  │
│ With metadata           │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Update MongoDB          │
│ Status: processed       │
│ ChunkCount: N           │
└─────────────────────────┘
```

## Data Flow

### Discovery Phase

```
External Data → Bluesky API → Discovery Service → MongoDB (opportunities)
                                      ↓
                               Scoring Engine
                                      ↓
                            Account Preferences (MongoDB)
```

### Response Phase

```
User Request → Response Generator → ChromaDB (knowledge query)
                       ↓
                  Claude API
                       ↓
              MongoDB (save draft)
                       ↓
               Present to User
                       ↓
          [User approves] → Bluesky API (post)
                       ↓
          MongoDB (update status: posted)
```

> **📋 Data Models**: See [Account Configuration Design](../.agents/artifacts/designer/designs/account-configuration-design.md) for complete MongoDB schemas and ChromaDB collection structures.

## Security Considerations

### Credentials Management
- **Storage**: Environment variables in `.env` file (never in database)
- **Scope**: Local filesystem permissions protect access
- **Platform Security**: App passwords used (not main account passwords)

> **📋 Credential Strategy Details**: See [ADR-002: Environment Variables for Credentials](./decisions/002-env-credentials.md) for complete rationale and security considerations.

### API Security
- **Authentication**: Platform-specific app passwords (Bluesky, LinkedIn, Reddit)
- **Rate Limiting**: Respect platform limits with exponential backoff
- **Error Handling**: Never log credentials, tokens, or sensitive data

### Data Privacy
- **Local-First**: All user data stored locally (MongoDB and ChromaDB on user's machine)
- **Knowledge Base**: Documents remain local; only embeddings generated via external API
- **No Cloud Storage**: No sensitive data sent to external services except AI API calls
- **Response Drafts**: Stored locally before user approval and posting

## Scalability Considerations

### v0.1 (MVP) - Single User, Single Account
- Local MongoDB instance (document-based storage)
- Local ChromaDB instance (vector embeddings)
- Single-threaded discovery cron (every 2-4 hours)
- Expected load: <100 opportunities/day, <20 responses/day
- No horizontal scaling needed

> **📋 MVP Scope Details**: See [ADR-005: MVP Scope](./decisions/005-mvp-scope.md) for complete v0.1 requirements and v0.2+ roadmap.

### Future Scaling (Post-v0.1)
- **v0.2 (Multi-Account/Multi-Platform)**: 
  - Multiple profile documents in MongoDB
  - Separate ChromaDB collections per profile
  - See [ADR-006: Profile and Account Separation](./decisions/006-profile-account-separation.md)
- **v0.3 (High-Frequency Discovery)**: Queue-based processing, worker threads
- **v0.4 (Analytics)**: Time-series database for metrics and insights
- **Cloud Deployment (Optional)**: MongoDB Atlas, hosted ChromaDB, containerization

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Backend** | Node.js + TypeScript | Type safety, ecosystem maturity ([ADR-003](./decisions/003-typescript-stack.md)) |
| **Frontend** | React + TypeScript | Component model, developer experience ([ADR-003](./decisions/003-typescript-stack.md)) |
| **Database** | MongoDB | Flexible schema, document model ([ADR-001](./decisions/001-mongodb-storage.md)) |
| **Vector Store** | ChromaDB | Local-first, simple API ([ADR-004](./decisions/004-chromadb-vectors.md)) |
| **AI Model** | Claude Sonnet 4.5 | Best-in-class reasoning, API reliability |
| **Platform** | Bluesky (v0.1) | AT Protocol, developer-friendly ([ADR-005](./decisions/005-mvp-scope.md)) |
| **Credentials** | Environment Variables | Security, portability ([ADR-002](./decisions/002-env-credentials.md)) |

> **📋 Detailed Rationale**: See [Architecture Decision Records](./decisions/) for complete analysis of alternatives, trade-offs, and consequences.

## Deployment Model

### Development
```
Local machine → Docker Compose (MongoDB + ChromaDB)
             → Node.js dev server (hot reload)
             → React dev server (webpack)
```

### Production (Local)
```
Local machine → Docker Compose (persistent volumes)
             → PM2 process manager
             → Built React assets served by Express
```

### Future: Cloud (Optional)
```
Cloud VM → Managed MongoDB (Atlas)
        → Hosted ChromaDB (cloud service)
        → Container deployment (Docker)
```

## Monitoring & Observability

### v0.1 (Minimal)
- Console logging
- Error tracking in MongoDB (failed opportunities)
- Basic health checks

### Future
- Structured logging (Winston/Pino)
- Metrics (Prometheus)
- Dashboards (Grafana)
- Alerting (on API failures, discovery errors)

## Extension Points

The architecture supports future extensions:

1. **Platform Adapters**: New platforms implement common interface
2. **Response Modes**: Brainstorm/Toulmin analysis as separate service
3. **Safety Layer**: Pluggable validation middleware
4. **Analytics Engine**: Separate service consuming response history
5. **Content Origination**: News monitoring as parallel discovery service

## Related Documentation

### Technical Specifications
- [OpenAPI Specification](../api/openapi.yaml) - Complete REST API contracts, request/response schemas
- [Tech Stack](../tech-stack.md) - Technologies, frameworks, and tools used
- [Project Glossary](../project-glossary.md) - Domain terms, technical terms, and acronyms
- [Project Structure](../project_structure.md) - Directory layout and file organization
- [Setup Guide](../setup.md) - Installation and configuration instructions

### Design Artifacts
- [Account Configuration Design](../.agents/artifacts/designer/designs/account-configuration-design.md) - Profile/Account data models and APIs
