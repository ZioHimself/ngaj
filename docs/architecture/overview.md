# ngaj Architecture Overview

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
│ │ - Queue   │ │ - Embeddings│  │   documents  │  └──────┘  │
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
│  │  GET  /api/account                             │     │
│  │  PUT  /api/account                             │     │
│  │  GET  /api/opportunities                       │     │
│  │  POST /api/opportunities/discover              │     │
│  │  GET  /api/opportunities/:id                   │     │
│  │  POST /api/knowledge/upload                    │     │
│  │  GET  /api/knowledge                           │     │
│  │  POST /api/responses/generate                  │     │
│  │  POST /api/responses/:id/post                  │     │
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

## Core Workflows

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

## Security Considerations

### Credentials Management
- **Storage**: Environment variables only (`.env` file)
- **Access**: Read-only by backend process
- **Scope**: Local filesystem permissions protect access
- **Rotation**: Manual update in `.env` file

### API Security
- **Authentication**: All Bluesky operations use app password (not main password)
- **Rate Limiting**: Respect platform limits (future: implement backoff)
- **Error Handling**: Never log credentials or tokens

### Data Privacy
- **User Data**: Stored locally in MongoDB and ChromaDB
- **Knowledge Base**: Never sent to external services except for embedding generation
- **Responses**: Drafts stored locally before posting

## Scalability Considerations

### v0.1 (MVP) - Single User, Single Account
- Local MongoDB instance
- Local ChromaDB instance
- Single-threaded discovery cron
- Expected load: <100 opportunities/day, <20 responses/day

### Future Scaling
- **v0.2**: Multiple accounts → Separate MongoDB documents, separate ChromaDB collections
- **v0.3**: Higher frequency polling → Queue-based processing, worker threads
- **v0.4**: Analytics → Time-series database for metrics
- **Cloud Migration**: MongoDB Atlas, hosted ChromaDB, container orchestration

## Technology Choices

See [Architecture Decision Records](./decisions/) for detailed rationale:

- [ADR-001: MongoDB for Storage](./decisions/001-mongodb-storage.md)
- [ADR-002: Environment Variables for Credentials](./decisions/002-env-credentials.md)
- [ADR-003: TypeScript Full Stack](./decisions/003-typescript-stack.md)
- [ADR-004: ChromaDB for Vectors](./decisions/004-chromadb-vectors.md)
- [ADR-005: MVP Scope](./decisions/005-mvp-scope.md)

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

- [API Specification](./api/openapi.yaml) - REST endpoints
- [Setup Guide](../setup.md) - Installation instructions
