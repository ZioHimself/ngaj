# Designer Agent - User Guide

> **For AI Instructions**: See [system-prompt.md](./system-prompt.md) for the complete Designer Agent system prompt.

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

The Designer Agent follows a collaborative **4-phase workflow**:

| Phase | Duration | What Happens | Your Role |
|-------|----------|--------------|-----------|
| **1. Discovery** | 5-10 min | Agent asks clarifying questions about the problem, constraints, and fit with existing architecture | Answer questions, share context |
| **2. Exploration** | 15-30 min | Collaborate on data models, API contracts, and trade-offs | Discuss options, make decisions |
| **3. Documentation** | 10-20 min | Agent creates ADR, Design Doc, Type Stubs, and Handoff | Review artifacts, request changes |
| **4. Handoff** | Immediate | Design artifacts saved, ready for Test-Writer | Proceed to testing phase |

> **📋 Detailed Workflow**: See [system-prompt.md - Workflow section](./system-prompt.md#workflow) for complete phase-by-phase instructions.

### Outputs Created

1. **ADR** (`docs/architecture/decisions/`) - Decision rationale and trade-offs
2. **Design Doc** (`.agents/artifacts/designer/designs/`) - Complete technical specification
3. **Handoff** (`.agents/artifacts/designer/handoffs/`) - Test guidance for Test-Writer
4. **Type Stubs** (`src/types/`) - TypeScript interfaces (optional)
5. **Updated Docs** - Glossary, Architecture Overview, API spec (if needed)

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

## Output Artifacts

> **📋 Complete Details**: See [system-prompt.md - Output Artifacts section](./system-prompt.md#output-artifacts) for full artifact specifications and content guidelines.

| Artifact | Location | Purpose |
|----------|----------|---------|
| **ADR** | `docs/architecture/decisions/` | WHY - Decision rationale and consequences |
| **Design Doc** | `.agents/artifacts/designer/designs/` | HOW - Complete technical specification |
| **Handoff** | `.agents/artifacts/designer/handoffs/` | TEST WHAT - Guidance for Test-Writer |
| **Type Stubs** | `src/types/` | TypeScript interfaces (optional) |
| **Doc Updates** | Various | Glossary, Architecture, API updates (if needed) |

**Key Principle**: Each document has unique content with cross-references (no duplication). See [Documentation Strategy](../../docs/documentation-strategy.md) for details.

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
   ↓           ↓            ↓            ↓
 Handoff    ADR+Design    Design      ADR+Design
              Doc          Doc        (Review)
```

**Workflow**: Designer outputs become inputs for downstream agents:
- **Test-Writer** reads Handoff → writes failing tests
- **Implementer** reads ADR + Design Doc → implements solution
- **Reviewer** checks implementation against design decisions

> **📋 Complete Workflow**: See [Agent Framework README](../../README.md) for full multi-agent workflow documentation.

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

### Agent System
- **[System Prompt](./system-prompt.md)** - Complete Designer Agent AI instructions and workflow
- [Design Guidelines](./context/design-guidelines.md) - Data modeling and API design principles
- [Documentation Templates](../../templates/documentation-templates.md) - Templates for ADR, Design Doc, Handoff

### Project Documentation
- [Tech Stack](../../../docs/tech-stack.md) - Available technologies and frameworks
- [Project Glossary](../../../docs/project-glossary.md) - Domain and technical terminology
- [Documentation Strategy](../../docs/documentation-strategy.md) - How to avoid duplication
- [Architecture Overview](../../../docs/architecture/overview.md) - System architecture

## Quick Start

1. **Start a design session**: Say "design [feature name]"
2. **Answer questions**: Share your thoughts and constraints
3. **Explore options**: Discuss trade-offs together
4. **Review artifacts**: Check ADR and design doc
5. **Proceed to tests**: Say "write tests for [feature]"

Happy designing! 🎨

