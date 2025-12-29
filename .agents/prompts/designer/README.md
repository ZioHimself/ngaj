# Designer Agent

The Designer Agent is a collaborative design partner that helps you think through data models, API contracts, and architecture decisions **before** writing tests and implementation.

## When to Use

Use the Designer Agent when:
- ✅ Starting a new feature or major change
- ✅ Unsure about data model design
- ✅ Need to make architectural decisions
- ✅ Want to explore trade-offs and options
- ✅ Creating cross-cutting concerns (auth, caching, etc.)

Skip the Designer Agent when:
- ❌ Design is already clear (small bug fixes, simple additions)
- ❌ Following existing patterns (e.g., adding another API endpoint like existing ones)
- ❌ Time-sensitive hotfixes

## How to Invoke

Say: **"design [feature name]"** or **"let's design [feature]"**

Examples:
- "design multi-platform support"
- "let's design the opportunity scoring system"
- "design user preferences storage"

## What to Expect

### Phase 1: Discovery (5-10 minutes)
The Designer Agent will:
- Ask clarifying questions about the problem
- Understand requirements and constraints
- Identify stakeholders and use cases
- Reference existing ADRs and architecture

**Example questions**:
- "What problem are we solving?"
- "How does this fit with ADR-005 (MVP scope)?"
- "What are the constraints?"

### Phase 2: Exploration (15-30 minutes)
Together you'll:
- Sketch data models (MongoDB schemas, TypeScript types)
- Design API contracts (endpoints, request/response)
- Discuss trade-offs (performance vs. simplicity, etc.)
- Explore edge cases and error handling

**Example outputs**:
- MongoDB collection schemas
- TypeScript interfaces
- API endpoint specifications
- Sequence diagrams

### Phase 3: Documentation (10-20 minutes)
The Designer Agent will create:
- **ADR** (Architecture Decision Record) in `docs/architecture/decisions/`
- **Design Document** in `.agents/artifacts/designer/designs/`
- **Type Stubs** (optional) in `src/types/`
- **Handoff Document** for Test-Writer in `.agents/artifacts/designer/handoffs/`

### Phase 4: Handoff
Once design is complete:
- Design artifacts are saved
- Handoff document prepared for Test-Writer
- Ready to say: **"write tests for [feature]"**

## Example Session

### User
> "design opportunity scoring system"

### Designer Agent
> Let's explore this! I see from the glossary that opportunities are ranked by relevance. What factors should we use for scoring?
> 
> Looking at ADR-005, we're keeping it simple for v0.1. I'm thinking:
> - Impact (post engagement: likes, replies, followers)
> - Recency (how old is the post?)
> - Keyword match (does it match user interests?)
> 
> Should this be a static score (computed once) or dynamic (recomputed as data changes)?

### User
> Static for now. We can recompute on-demand if needed.

### Designer Agent
> Got it. For the data model, I see two options:
> 
> **Option A**: Store score as top-level field on `Opportunity`
> ```typescript
> interface Opportunity {
>   id: string;
>   score: number;  // 0-100
>   // ...
> }
> ```
> 
> **Option B**: Store scoring breakdown
> ```typescript
> interface Opportunity {
>   id: string;
>   scoring: {
>     total: number;
>     impact: number;
>     recency: number;
>     keyword_match: number;
>   };
>   // ...
> }
> ```
> 
> Option B is more transparent but uses more space. Which do you prefer?

### User
> Option B - transparency is worth it for debugging.

### Designer Agent
> Perfect! I'll document this in an ADR...
> 
> [Creates ADR-006 and design document with full schema, scoring algorithm, API contracts]
> 
> Ready for Test-Writer! Use: "write tests for opportunity-scoring"

## Outputs

### 1. Architecture Decision Record (ADR)
**Location**: `docs/architecture/decisions/###-feature-name.md`

Documents:
- Context (why this decision?)
- Options considered (with pros/cons)
- Decision made
- Rationale
- Consequences

### 2. Design Document
**Location**: `.agents/artifacts/designer/designs/feature-name-design.md`

Includes:
- Data models (TypeScript + MongoDB)
- API contracts
- Sequence diagrams
- Edge cases
- Error handling
- Performance considerations
- Security notes

### 3. Type Definitions (Optional)
**Location**: `src/types/feature-name.ts`

TypeScript interfaces/types for:
- Domain entities
- DTOs (Data Transfer Objects)
- Service interfaces

### 4. Handoff Document
**Location**: `.agents/artifacts/designer/handoffs/feature-name-handoff.md`

Provides Test-Writer with:
- Entities to test
- API contracts to test
- Edge cases to cover
- Integration dependencies
- Acceptance criteria

## Tips for Effective Design Sessions

### Do:
✅ **Be curious** - Ask "what if?" questions
✅ **Challenge constraints** - "Do we really need this?"
✅ **Think about edge cases** - "What if the API is down?"
✅ **Consider future** - "Will this support multi-account?"
✅ **Reference ADRs** - "How does this align with ADR-005?"

### Don't:
❌ **Rush to solutions** - Explore the problem space first
❌ **Over-engineer** - Keep MVP scope in mind (ADR-005)
❌ **Ignore tech stack** - Stay within TypeScript, MongoDB, ChromaDB
❌ **Skip documentation** - ADRs are critical for future you
❌ **Design in isolation** - Use Designer Agent collaboratively

## Integration with Other Agents

```
Designer → Test-Writer → Implementer → Reviewer
   ↓
  ADR
  Design Doc
  Type Stubs
  Handoff
```

**Designer** outputs feed into:
- **Test-Writer**: Uses handoff doc to write comprehensive tests
- **Implementer**: References ADR and design doc for implementation
- **Reviewer**: Checks implementation against design decisions

## Example Use Cases

### 1. New Feature: Multi-Platform Support
**Session**: 45 minutes
- Data model: Platform abstraction, adapter pattern
- API design: Unified interface for Bluesky, LinkedIn, Reddit
- ADR: Document platform abstraction approach
- Handoff: Test platform adapters, switching logic

### 2. Database Schema: Knowledge Base Storage
**Session**: 30 minutes
- Data model: Document chunking, embedding storage
- ChromaDB integration: Collection structure, query patterns
- ADR: Document vs. chunk relationship (embed or reference?)
- Handoff: Test CRUD operations, vector search

### 3. API Endpoint: Generate Response
**Session**: 20 minutes
- API contract: POST /api/responses/generate
- Request/response schemas
- Error handling (LLM rate limits, context too large)
- Handoff: Test request validation, error scenarios

## References

- [System Prompt](./system-prompt.md) - Full Designer Agent instructions
- [Design Guidelines](./context/design-guidelines.md) - Data modeling and API design principles
- [ADR Template](./templates/adr-template.md) - Template for Architecture Decision Records
- [Design Doc Template](./templates/design-doc-template.md) - Template for design documents
- [Tech Stack](../../context/tech-stack.md) - Available technologies
- [Project Glossary](../../context/project-glossary.md) - Domain terminology

## Quick Start

1. **Start a design session**: Say "design [feature name]"
2. **Answer questions**: Share your thoughts and constraints
3. **Explore options**: Discuss trade-offs together
4. **Review artifacts**: Check ADR and design doc
5. **Proceed to tests**: Say "write tests for [feature]"

Happy designing! 🎨

