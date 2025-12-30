# Introducing a Feature with the Agent Framework

## Complete Workflow Example

Let's walk through introducing a real feature: **Opportunity Discovery Service**

This example demonstrates the **Full Cycle** workflow:
```
Designer → Test-Writer → Implementer → Reviewer
```

---

## Phase 1: Designer Agent 🎨

### Invocation
```
User: "design opportunity discovery service"
```

### Discovery Phase (5-10 minutes)

**Designer Agent**:
> Let's design the opportunity discovery service! I see from the project glossary that:
> 
> > **Discovery**: Automated process of finding relevant social media posts based on user-configured interests and keywords
> 
> A few questions to understand the requirements:
> 
> 1. **Discovery Trigger**: Should this run on a cron schedule, on-demand, or both?
> 2. **Data Source**: For MVP (ADR-005), we're Bluesky-only. Should we design for multi-platform from the start?
> 3. **Storage**: Do we store all discovered posts, or just ones above a certain score threshold?
> 4. **User Filtering**: How do users configure what they want to discover? Keywords only, or also by hashtags, authors, topics?

**User**:
> 1. Cron schedule for now (every 15 minutes)
> 2. Design the interface to be platform-agnostic, but implement Bluesky only
> 3. Store all posts above score threshold of 30
> 4. Keywords for MVP, but leave room for hashtags later

### Exploration Phase (15-30 minutes)

**Designer Agent**:
> Great! Let me sketch the data model and architecture:
> 
> ### Data Model: Opportunity
> 
> ```typescript
> interface Opportunity {
>   id: string;                    // MongoDB ObjectId
>   user_id: string;               // Which user this opportunity is for
>   platform: 'bluesky';           // Platform source
>   post_id: string;               // Platform-specific post ID
>   post_url: string;              // Direct link to post
>   author: {
>     id: string;
>     username: string;
>     display_name: string;
>     follower_count: number;
>   };
>   content: {
>     text: string;
>     created_at: Date;
>   };
>   engagement: {
>     like_count: number;
>     reply_count: number;
>     repost_count: number;
>   };
>   scoring: OpportunityScore;     // From scoring service
>   status: 'pending' | 'dismissed' | 'responded';
>   discovered_at: Date;
>   updated_at: Date;
> }
> ```
> 
> ### Service Architecture
> 
> I'm thinking we use the **Adapter Pattern** for platform abstraction:
> 
> ```typescript
> // Platform-agnostic interface
> interface IPlatformAdapter {
>   authenticate(): Promise<void>;
>   fetchRecentPosts(filters: DiscoveryFilters): Promise<Post[]>;
>   getPostDetails(postId: string): Promise<Post>;
> }
> 
> // Bluesky implementation
> class BlueskyAdapter implements IPlatformAdapter {
>   // Bluesky-specific AT Protocol calls
> }
> 
> // Discovery Service orchestrates everything
> interface IDiscoveryService {
>   discover(userId: string): Promise<Opportunity[]>;
>   getOpportunities(userId: string, status?: OpportunityStatus): Promise<Opportunity[]>;
>   dismissOpportunity(id: string): Promise<void>;
> }
> ```
> 
> Does this structure make sense?

**User**:
> Yes! I like the adapter pattern. That'll make multi-platform easier later.

**Designer Agent**:
> Perfect! Now for the discovery flow:
> 
> ### Discovery Algorithm
> 
> ```typescript
> async function discover(userId: string): Promise<Opportunity[]> {
>   // 1. Get user preferences (keywords, weights)
>   const preferences = await userService.getPreferences(userId);
>   
>   // 2. Fetch recent posts from platform
>   const posts = await platformAdapter.fetchRecentPosts({
>     keywords: preferences.keywords,
>     since: getLastDiscoveryTime(userId),
>     limit: 100
>   });
>   
>   // 3. Score each post
>   const scoredPosts = posts.map(post => ({
>     post,
>     score: scoringService.scoreOpportunity(
>       post, 
>       preferences.keywords, 
>       preferences.scoring_weights
>     )
>   }));
>   
>   // 4. Filter by threshold
>   const filtered = scoredPosts.filter(sp => sp.score.total >= 30);
>   
>   // 5. Store as opportunities
>   const opportunities = await opportunityRepository.createMany(
>     filtered.map(sp => toOpportunity(sp, userId))
>   );
>   
>   return opportunities;
> }
> ```
> 
> ### Edge Cases to Consider
> 
> 1. **Rate Limits**: Bluesky API has rate limits. Should we implement exponential backoff?
> 2. **Duplicates**: If we discover the same post twice (different cron runs), deduplicate?
> 3. **No Results**: If no posts meet the threshold, return empty array or notify user?
> 4. **API Down**: If Bluesky is unreachable, skip that run or retry?

**User**:
> 1. Yes, exponential backoff
> 2. Deduplicate by post_id + user_id
> 3. Empty array is fine
> 4. Log error and skip, we'll catch it next run

### Documentation Phase (10-20 minutes)

**Designer Agent**:
> Excellent! I'll now create the design artifacts in order:
> 
> [Creates files...]
> 
> ✅ **Created**:
> 
> 1. **ADR-006** (`docs/architecture/decisions/006-opportunity-discovery-design.md`)
>    - **WHY**: Decision context and rationale for adapter pattern, scoring, deduplication
>    - Key decisions documented at high level
>    - Links to related ADRs (ADR-005 for MVP scope)
> 
> 2. **Design Doc** (`.agents/artifacts/designer/designs/opportunity-discovery-design.md`)
>    - **HOW**: Complete technical specification
>    - Full TypeScript interfaces for `Opportunity`, `IPlatformAdapter`, `IDiscoveryService`
>    - API contracts with request/response schemas
>    - Sequence diagram for discovery flow
>    - References ADR-006 for decision rationale
> 
> 3. **Handoff** (`.agents/artifacts/designer/handoffs/001-opportunity-discovery-handoff.md`)
>    - **TEST WHAT**: Test scenarios and acceptance criteria
>    - "Should discover posts above threshold (score ≥ 30)"
>    - "Should deduplicate by (post_id, user_id)"
>    - "Should handle rate limits with exponential backoff"
>    - Links to Design Doc for full API schemas
>    - Links to ADR-006 for understanding design decisions
> 
> 4. **Type Stubs** (`src/types/`)
>    - `opportunity.ts` - Matches interfaces in Design Doc
>    - `platform-adapter.ts` - Matches interfaces in Design Doc
> 
> ### Documentation Structure (No Duplication)
> 
> - **ADR-006**: Strategic decisions only (no code samples or detailed schemas)
> - **Design Doc**: Full technical details (the source of truth for implementation)
> - **Handoff**: Test guidance (links to Design Doc, doesn't repeat schemas)
> 
> **Ready for Test-Writer!** 🎉 All documents cross-reference each other.

---

## Phase 2: Test-Writer Agent 🧪

### Invocation
```
User: "write tests for opportunity discovery"
```

**Test-Writer Agent**:
> I'll write comprehensive tests for opportunity discovery. Let me check for design artifacts...
> 
> ✅ Found handoff document: `.agents/artifacts/designer/handoffs/001-opportunity-discovery-handoff.md`
> 
> Reading design specs...

### Test Plan Generation (5-10 minutes)

**Test-Writer Agent**:
> Based on the design, I'll create tests for:
> 
> ### Unit Tests
> 1. **DiscoveryService.discover()** - Happy path
> 2. **DiscoveryService.discover()** - Empty results (no posts meet threshold)
> 3. **DiscoveryService.discover()** - Duplicate post handling
> 4. **DiscoveryService.discover()** - API rate limit error
> 5. **BlueskyAdapter.fetchRecentPosts()** - Successful fetch
> 6. **BlueskyAdapter.fetchRecentPosts()** - API error handling
> 
> ### Integration Tests
> 7. **Discovery → Storage** - End-to-end flow with mocked Bluesky
> 8. **Cron Job Execution** - Verify scheduled discovery runs
> 
> Creating test files...
> 
> ✅ **Created**:
> - `tests/unit/services/discovery-service.spec.ts` (8 test cases)
> - `tests/integration/discovery-flow.spec.ts` (2 test cases)
> - `.agents/artifacts/test-writer/test-plans/opportunity-discovery-test-plan.md`
> 
> Running tests to verify Red phase...

### Test Execution

```bash
$ npm test

FAIL tests/unit/services/discovery-service.spec.ts
  DiscoveryService
    ✗ discover() returns scored opportunities above threshold (2 ms)
    ✗ discover() returns empty array when no posts meet threshold (1 ms)
    ✗ discover() deduplicates posts by post_id + user_id (1 ms)
    ...

Test Suites: 1 failed, 1 total
Tests:       8 failed, 8 total
```

**Test-Writer Agent**:
> ✅ **Red Phase Confirmed**: All 10 tests failing as expected.
> 
> Implementation stubs created:
> - `src/services/discovery-service.ts` (empty class)
> - `src/adapters/bluesky-adapter.ts` (empty class)
> 
> **Ready for Implementer!** 🚀

---

## Phase 3: Implementer Agent ⚙️

### Invocation
```
User: "implement opportunity discovery"
```

**Implementer Agent**:
> I'll implement the discovery service to make the tests pass.
> 
> Reading:
> - ✅ Design docs from `.agents/artifacts/designer/handoffs/`
> - ✅ Failing tests from `tests/unit/services/discovery-service.spec.ts`
> - ✅ ADR-006 for architectural guidance
> 
> Implementing...

### Implementation (30-60 minutes)

**Implementer Agent**:
> Created/Updated:
> - `src/services/discovery-service.ts` - Discovery orchestration logic
> - `src/adapters/bluesky-adapter.ts` - Bluesky API integration
> - `src/repositories/opportunity-repository.ts` - MongoDB storage
> - `src/utils/rate-limiter.ts` - Exponential backoff for rate limits
> - `src/jobs/discovery-cron.ts` - Cron job setup
> 
> Running tests...

```bash
$ npm test

PASS tests/unit/services/discovery-service.spec.ts
  DiscoveryService
    ✓ discover() returns scored opportunities above threshold (24 ms)
    ✓ discover() returns empty array when no posts meet threshold (12 ms)
    ✓ discover() deduplicates posts by post_id + user_id (18 ms)
    ✓ discover() handles API rate limit with exponential backoff (45 ms)
    ✓ discover() handles API errors gracefully (15 ms)
    ...

PASS tests/integration/discovery-flow.spec.ts
  Discovery Flow
    ✓ discovers, scores, and stores opportunities end-to-end (156 ms)
    ✓ cron job executes discovery on schedule (89 ms)

Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
Time:        2.341 s
```

**Implementer Agent**:
> ✅ **Green Phase Achieved**: All 10 tests passing!
> 
> **Implementation Summary**:
> - Adapter pattern implemented with Bluesky adapter
> - Discovery service orchestrates fetch → score → filter → store
> - Exponential backoff for rate limits (1s, 2s, 4s, 8s)
> - Deduplication by checking existing (post_id, user_id) pairs
> - Cron job scheduled for every 15 minutes
> 
> **Ready for Review!** 👀

---

## Phase 4: Reviewer Agent 🔍

### Invocation
```
User: "review opportunity discovery"
```

**Reviewer Agent**:
> I'll review the opportunity discovery implementation.
> 
> Loading review checklists:
> - ✅ Code quality checklist
> - ✅ Security checklist
> - ✅ Architecture compliance checklist
> 
> Reviewing...

### Review Report (10-15 minutes)

**Reviewer Agent**:
> ✅ **Review Complete**
> 
> ### Summary
> 
> **Overall**: ✅ Approved with minor suggestions
> **Test Coverage**: 100% of service logic
> **Architecture**: ✅ Follows ADR-006 design
> **Security**: ✅ No sensitive data leaks, credentials via env vars
> 
> ### Strengths
> 1. ✅ Clean adapter pattern implementation
> 2. ✅ Comprehensive error handling
> 3. ✅ Well-structured, testable code
> 4. ✅ Proper separation of concerns
> 5. ✅ Good TypeScript type safety
> 
> ### Suggestions
> 
> 1. **Logging**: Add structured logging for discovery runs
>    - Severity: LOW
>    - Rationale: Debugging production issues easier with logs
>    - Suggestion: Use a logger service for discovery start/end/errors
> 
> 2. **Monitoring**: Consider metrics for discovery success rate
>    - Severity: LOW
>    - Rationale: MVP doesn't need it, but useful for v0.2
>    - Suggestion: Track discovered_count, filtered_count, error_count
> 
> 3. **Rate Limit Documentation**: Document Bluesky rate limits in code
>    - Severity: LOW
>    - Rationale: Future maintainers should know the constraints
>    - Suggestion: Add comment with Bluesky's documented limits
> 
> ### Test Coverage
> 
> ```
> File                        | % Stmts | % Branch | % Funcs | % Lines
> ----------------------------|---------|----------|---------|--------
> discovery-service.ts        |   100   |   100    |   100   |   100
> bluesky-adapter.ts          |   95.5  |   100    |   100   |   95.5
> opportunity-repository.ts   |   100   |   100    |   100   |   100
> ----------------------------|---------|----------|---------|--------
> All files                   |   98.5  |   100    |   100   |   98.5
> ```
> 
> ### Security Analysis
> 
> ✅ No issues found:
> - Credentials loaded from environment variables (ADR-002)
> - No sensitive data in logs
> - Input validation on user_id, post_id
> - MongoDB injection prevented by using typed queries
> 
> ### Architecture Compliance
> 
> ✅ Follows design decisions:
> - Adapter pattern as specified in ADR-006
> - Score threshold of 30 enforced
> - Deduplication by (post_id, user_id)
> - Exponential backoff implemented
> 
> **Report saved**: `.agents/artifacts/reviewer/review-reports/opportunity-discovery-review.md`
> 
> **Feature Complete!** ✅

---

## Workflow Summary

| Phase | Agent | Duration | Artifacts |
|-------|-------|----------|-----------|
| 1. Design | Designer | 30-45 min | ADR (WHY), Design Doc (HOW), Handoff (TEST WHAT), type stubs |
| 2. Tests | Test-Writer | 20-30 min | Test plan, 10 test cases |
| 3. Implementation | Implementer | 45-60 min | Services, adapters, repos |
| 4. Review | Reviewer | 15-20 min | Review report |
| **Total** | **All Agents** | **~2.5 hours** | **Production-ready feature** |

### Designer Artifact Breakdown (No Duplication)
- **ADR**: Strategic decision record (what + why, high-level)
- **Design Doc**: Complete technical blueprint (how, with code/schemas)
- **Handoff**: Test-specific guidance (what to test, links to Design Doc for details)
- Each document cross-references the others, no large content duplication

## Key Benefits

### Documentation-Driven
- Every decision captured in ADR
- Design artifacts serve as living documentation
- Future developers understand the "why"

### Test-First Development
- Tests written before implementation
- Comprehensive coverage (98.5%+)
- Red → Green → Refactor workflow

### Quality Assurance
- Automated code review
- Security analysis
- Architecture compliance checks

### Clear Handoffs
- Designer → Test-Writer: Numbered Handoff doc with acceptance criteria
- Test-Writer → Implementer: Failing tests define requirements
- Implementer → Reviewer: Working code + tests for review

---

## Quick Start

To introduce a new feature, follow this workflow:

### 1. Design Phase
```
"design [feature name]"
```
- Collaborate on data models and APIs
- Document in 3 complementary artifacts:
  - **ADR**: What was decided and why (strategic)
  - **Design Doc**: Complete technical specification (detailed)
  - **Handoff**: Test scenarios and criteria (actionable)
- Cross-reference documents (no duplication)
- Create type definitions

### 2. Test Phase
```
"write tests for [feature name]"
```
- Read design handoff
- Create comprehensive test plan
- Write failing tests (Red phase)
- Verify tests fail

### 3. Implementation Phase
```
"implement [feature name]"
```
- Read failing tests
- Implement to make tests pass (Green phase)
- Refactor for quality
- Verify all tests pass

### 4. Review Phase
```
"review [feature name]"
```
- Code quality analysis
- Security review
- Architecture compliance
- Generate review report

---

## When to Skip Design Phase

Use the **TDD Cycle** (skip Designer) when:
- ❌ Small bug fixes
- ❌ Following existing patterns (e.g., adding similar API endpoint)
- ❌ Design is already clear
- ❌ Time-sensitive hotfixes

For these cases, jump straight to:
```
"write tests for [requirement]"
```

---

## Additional Resources

### Agent System
- [Designer Agent Guide](.agents/prompts/designer/README.md)
- [Designer Agent Prompt](.agents/prompts/designer/system-prompt.md)
- [Test-Writer Agent Prompt](.agents/prompts/test-writer/system-prompt.md)
- [Implementer Agent Prompt](.agents/prompts/implementer/system-prompt.md)
- [Reviewer Agent Prompt](.agents/prompts/reviewer/system-prompt.md)
- [Agent Configuration](.agents/config/agents.json)
- [Cursor Rules](../.cursorrules)
- **[Documentation Templates](.agents/templates/documentation-templates.md)** - Avoid duplication with proper structure

### Project Documentation
- [Tech Stack](../docs/tech-stack.md) - Technologies, frameworks, and tools
- [Project Glossary](../docs/project-glossary.md) - Domain and technical terminology
- [Architecture Overview](../docs/architecture/overview.md) - System architecture and design
- [Setup Guide](../docs/setup.md) - Installation and configuration

---

**Happy building with the agent framework!** 🚀
