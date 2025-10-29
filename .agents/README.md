# Introducing a Requirement with the Agent Framework

## Complete Workflow Example

Let's walk through introducing a real requirement: **Post Discovery Service**

---

## Step 1: Write the Requirement (Gherkin Feature File)

Create: `requirements/features/post-discovery.feature`

```gherkin
Feature: Post Discovery
  As a user
  I want the system to discover relevant social media posts
  So that I can engage with conversations matching my interests

  Background:
    Given I have configured keyword monitoring for "TypeScript"
    And I have set minimum engagement to 10 likes

  @requirement:PD-001
  Scenario: Discover posts matching keywords
    Given there are 50 tweets mentioning "TypeScript"
    When the discovery job runs
    Then posts containing "TypeScript" should be fetched
    And posts should be filtered by engagement criteria
    And posts should be ranked by relevance score
    And the top 20 posts should be added to my inbox

  @requirement:PD-002
  Scenario: Filter out low engagement posts
    Given there is a post with "TypeScript" and 5 likes
    And my minimum engagement is set to 10 likes
    When the discovery job runs
    Then that post should not appear in my inbox

  @requirement:PD-003
  Scenario: Deduplicate similar posts
    Given there are 3 tweets with nearly identical "TypeScript tips" content
    When the discovery job runs
    Then only 1 post should be added to my inbox
    And it should be the one with highest engagement
```

**Command:**
```bash
# Create the feature file
mkdir -p requirements/features
nano requirements/features/post-discovery.feature
# Paste the content above
```

---

## Step 2: Use Test-Writer Agent

### Option A: Using Cursor IDE (Recommended)

**In Cursor IDE:**

```
You: "Test-Writer mode: write tests for PD-001"
```

**What the agent does:**
1. Reads the feature file
2. Loads test-writer prompt from `.agents/prompts/test-writer/system-prompt.md`
3. Loads context from `.agents/context/`
4. Creates test plan in `.agents/artifacts/test-writer/test-plans/PD-001_test-plan.md`
5. Writes tests in `tests/unit/services/post-discovery.spec.ts`
6. Logs decisions to `.agents/logs/test-writer/decisions.jsonl`
7. Creates handoff document for implementer

### Option B: Manual Prompt (If not using Cursor)

**Prompt for Claude:**

```markdown
You are the Test-Writer Agent. Please write comprehensive tests for requirement PD-001.

Context:
- Requirement file: requirements/features/post-discovery.feature
- Tech stack: TypeScript, Vitest, Node.js
- Testing approach: Unit tests with mocked dependencies
- Output: tests/unit/services/post-discovery.spec.ts

Please:
1. Read the requirement from the feature file
2. Generate a test plan
3. Write failing tests (Red phase of TDD)
4. Log your decisions
5. Create a handoff document for the Implementer

Follow the system prompt at: .agents/prompts/test-writer/system-prompt.md
```

### Expected Output

**Test Plan** (`.agents/artifacts/test-writer/test-plans/PD-001_test-plan.md`):

```markdown
# Test Plan: PD-001 - Post Discovery

## Requirement
Discover posts matching keywords and filter by engagement criteria

## Test Strategy
- Unit tests for PostDiscoveryService
- Mock Twitter API adapter
- Mock Vector DB for relevance scoring
- Test both happy path and edge cases

## Test Cases
1. Should fetch posts matching single keyword
2. Should fetch posts matching multiple keywords
3. Should filter posts by minimum likes
4. Should filter posts by minimum replies
5. Should rank posts by relevance score
6. Should limit results to configured batch size
7. Should handle API errors gracefully
8. Should handle empty results

## Mocking Strategy
- Mock TwitterAdapter.searchTweets()
- Mock VectorDB.search() for relevance scoring
- Use test fixtures for post data

## Coverage Goal
- 100% of discovery logic
- All error cases
- Edge cases (0 results, API timeout, etc.)
```

**Test File** (`tests/unit/services/post-discovery.spec.ts`):

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostDiscoveryService } from '@/services/post-discovery';
import { TwitterAdapter } from '@/adapters/twitter';
import { VectorDB } from '@/database/vector-db';

// @requirement: PD-001
describe('PostDiscoveryService - Keyword Monitoring', () => {
  let service: PostDiscoveryService;
  let mockTwitter: TwitterAdapter;
  let mockVectorDB: VectorDB;

  beforeEach(() => {
    mockTwitter = {
      searchTweets: vi.fn(),
    } as any;
    
    mockVectorDB = {
      search: vi.fn(),
    } as any;

    service = new PostDiscoveryService(mockTwitter, mockVectorDB);
  });

  // @requirement: PD-001.1
  it('should fetch posts matching single keyword', async () => {
    // Arrange
    const config = {
      sources: { keywords: ['TypeScript'] },
      filters: { minEngagement: { likes: 10 } }
    };
    
    mockTwitter.searchTweets.mockResolvedValue([
      { id: '1', content: 'TypeScript is great', likes: 15 },
      { id: '2', content: 'TypeScript tips', likes: 12 }
    ]);

    // Act
    const posts = await service.discoverPosts(config);

    // Assert
    expect(mockTwitter.searchTweets).toHaveBeenCalledWith('TypeScript');
    expect(posts).toHaveLength(2);
    expect(posts.every(p => p.content.includes('TypeScript'))).toBe(true);
  });

  // @requirement: PD-002
  it('should filter out posts below minimum likes threshold', async () => {
    // Arrange
    const config = {
      sources: { keywords: ['TypeScript'] },
      filters: { minEngagement: { likes: 10 } }
    };

    mockTwitter.searchTweets.mockResolvedValue([
      { id: '1', content: 'Post 1', likes: 15 },
      { id: '2', content: 'Post 2', likes: 5 },  // Below threshold
      { id: '3', content: 'Post 3', likes: 12 }
    ]);

    // Act
    const posts = await service.discoverPosts(config);

    // Assert
    expect(posts).toHaveLength(2);
    expect(posts.find(p => p.id === '2')).toBeUndefined();
    expect(posts.every(p => p.likes >= 10)).toBe(true);
  });

  // Additional tests...
});
```

**Decision Log** (`.agents/logs/test-writer/decisions.jsonl`):

```json
{"timestamp":"2024-10-29T15:30:00Z","agent":"test-writer","requirement_id":"PD-001","decision_type":"test_strategy","decision":"Use unit tests with mocked dependencies","rationale":"Service has external dependencies (Twitter API, Vector DB) that should be mocked for fast, isolated tests","confidence":0.9,"alternatives_considered":[{"approach":"Integration tests with TestContainers","pros":["More realistic","Tests actual integrations"],"cons":["Slower execution","Complex setup"],"why_not_chosen":"Reserve integration tests for API layer"}],"context":{"files_affected":["tests/unit/services/post-discovery.spec.ts"],"related_requirements":["PD-002","PD-003"]},"outcome":{"status":"success","artifacts_created":["tests/unit/services/post-discovery.spec.ts"],"tests_affected":["post-discovery.spec.ts"]},"follow_up_needed":false,"tags":["unit-testing","tdd","service-layer"]}
```

**Handoff Document** (`.agents/artifacts/test-writer/PD-001_handoff.md`):

```markdown
# Handoff: Test-Writer → Implementer

**Date**: 2024-10-29
**Requirement**: PD-001
**Tests Written**: tests/unit/services/post-discovery.spec.ts

## Current Status

✓ Tests written (8 test cases)
✓ All tests failing (Red phase - expected)

## What Needs Implementation

### 1. PostDiscoveryService Class
Location: `src/services/post-discovery.ts`

Required methods:
- `discoverPosts(config: DiscoveryConfig): Promise<RankedPost[]>`

### 2. Required Functionality
- Fetch posts from TwitterAdapter using keywords
- Filter posts by engagement criteria (likes, replies)
- Rank posts by relevance score
- Limit results to batch size
- Handle errors gracefully

### 3. Dependencies Needed
- TwitterAdapter interface/implementation
- VectorDB interface for relevance scoring
- DiscoveryConfig type definition
- RankedPost type definition

### 4. Edge Cases to Handle
- Empty search results
- API timeout/errors
- Invalid configuration
- Duplicate posts

## Test Output

```
FAIL tests/unit/services/post-discovery.spec.ts
  PostDiscoveryService - Keyword Monitoring
    ✗ should fetch posts matching single keyword
      → PostDiscoveryService is not defined
    ✗ should filter out posts below minimum likes threshold
      → PostDiscoveryService is not defined
```

## Definition of Done
- [ ] All 8 tests pass
- [ ] No existing tests broken
- [ ] Code follows architecture patterns
- [ ] Proper error handling
- [ ] TypeScript types defined
- [ ] JSDoc comments added

## Next: Implementer Agent
Run: "Implementer mode: implement PD-001"
```

---

## Step 3: Verify Tests Fail (Red Phase)

```bash
npm test

# Expected output:
# FAIL tests/unit/services/post-discovery.spec.ts
#   ● PostDiscoveryService › should fetch posts...
#     ReferenceError: PostDiscoveryService is not defined
```

✅ Tests should fail - this is correct! (Red phase of TDD)

---

## Step 4: Use Implementer Agent

**In Cursor IDE:**

```
You: "Implementer mode: implement PD-001"
```

**What the agent does:**
1. Reads the failing tests
2. Reads the handoff document
3. Loads implementer prompt
4. Creates design document
5. Implements code in `src/services/post-discovery.ts`
6. Runs tests to verify they pass (Green phase)
7. Logs decisions
8. Creates handoff for reviewer

### Expected Output

**Design Document** (`.agents/artifacts/implementer/design-docs/PD-001_design.md`):

```markdown
# Design: Post Discovery Service

## Architecture
Service layer component that orchestrates post discovery

## Dependencies
- TwitterAdapter (injected)
- VectorDB (injected)

## Key Design Decisions
1. Dependency injection for testability
2. Strategy pattern for filtering
3. Builder pattern for configuration

## Implementation Plan
1. Define types (DiscoveryConfig, RankedPost)
2. Implement PostDiscoveryService class
3. Implement filtering logic
4. Implement ranking logic
5. Add error handling
```

**Implementation** (`src/services/post-discovery.ts`):

```typescript
import { TwitterAdapter } from '@/adapters/twitter';
import { VectorDB } from '@/database/vector-db';

export interface DiscoveryConfig {
  sources: {
    keywords: string[];
  };
  filters: {
    minEngagement: {
      likes: number;
      replies?: number;
    };
  };
}

export interface RankedPost {
  id: string;
  content: string;
  likes: number;
  replies?: number;
  scores?: {
    relevance: number;
    final: number;
  };
}

export class PostDiscoveryService {
  constructor(
    private twitterAdapter: TwitterAdapter,
    private vectorDB: VectorDB
  ) {}

  async discoverPosts(config: DiscoveryConfig): Promise<RankedPost[]> {
    // 1. Fetch posts from Twitter
    const keyword = config.sources.keywords[0]; // Simple implementation
    const rawPosts = await this.twitterAdapter.searchTweets(keyword);

    // 2. Filter by engagement
    const filtered = this.filterByEngagement(
      rawPosts,
      config.filters.minEngagement
    );

    // 3. Rank posts (placeholder for now)
    const ranked = filtered.map(post => ({
      ...post,
      scores: {
        relevance: 0,
        final: 0
      }
    }));

    return ranked;
  }

  private filterByEngagement(
    posts: any[],
    criteria: { likes: number; replies?: number }
  ): any[] {
    return posts.filter(post => {
      const meetsLikes = post.likes >= criteria.likes;
      const meetsReplies = criteria.replies
        ? post.replies >= criteria.replies
        : true;
      return meetsLikes && meetsReplies;
    });
  }
}
```

**Decision Log** (`.agents/logs/implementer/decisions.jsonl`):

```json
{"timestamp":"2024-10-29T16:00:00Z","agent":"implementer","requirement_id":"PD-001","decision_type":"implementation_approach","decision":"Use dependency injection for adapters","rationale":"Makes testing easier and follows SOLID principles","confidence":0.95,"alternatives_considered":[{"approach":"Direct instantiation of adapters","pros":["Simpler code"],"cons":["Hard to test","Tight coupling"],"why_not_chosen":"Poor testability"}],"context":{"files_affected":["src/services/post-discovery.ts"]},"outcome":{"status":"success","test_results":{"before":"8 failing","after":"8 passing"}}}
```

---

## Step 5: Verify Tests Pass (Green Phase)

```bash
npm test

# Expected output:
# PASS tests/unit/services/post-discovery.spec.ts
#   PostDiscoveryService - Keyword Monitoring
#     ✓ should fetch posts matching single keyword (5ms)
#     ✓ should filter out posts below minimum likes threshold (3ms)
#     ...
# Tests: 8 passed, 8 total
```

✅ All tests should pass - Green phase complete!

---

## Step 6: Use Reviewer Agent

**In Cursor IDE:**

```
You: "Reviewer mode: review PD-001 implementation"
```

**What the agent does:**
1. Loads reviewer prompt and checklists
2. Reviews both tests and implementation
3. Checks code quality, security, performance
4. Reviews decision logs from other agents
5. Generates review report
6. Provides verdict (approve/request changes)

### Expected Output

**Review Report** (`.agents/artifacts/reviewer/review-reports/PD-001_review.md`):

```markdown
# Code Review: PD-001 - Post Discovery

## Summary
Implementation of post discovery service with keyword filtering and engagement-based filtering.

## Test Quality ✓
- Coverage: 100%
- Edge cases handled: Yes
- Test independence: Yes
- Mocking appropriate: Yes

## Implementation Quality ✓
- Code clarity: 4/5
- SOLID principles: Yes
- Error handling: Needs improvement
- Type safety: Yes

## Specific Feedback

### Must Fix (Blocking)
1. Add error handling for API failures
2. Add input validation for config

### Should Fix (Important)
1. Extract filtering logic to separate service
2. Add JSDoc comments

### Nice to Have
1. Consider caching for repeated keyword searches

## Decision Log Review
- Test-Writer decisions: Sound ✓
- Implementer decisions: Sound ✓

## Verdict
**Status**: REQUEST_CHANGES
**Confidence**: 0.85
**Reasoning**: Implementation is solid but needs error handling before merging
```

---

## Step 7: Address Review Feedback

If reviewer requests changes:

**In Cursor IDE:**

```
You: "Implementer mode: address review feedback for PD-001 - add error handling and input validation"
```

Agent makes changes, tests still pass, ready for final approval.

---

## Summary: Complete Workflow

```bash
# 1. Write requirement
nano requirements/features/post-discovery.feature

# 2. Test-Writer Agent
# In Cursor: "write tests for PD-001"

# 3. Verify tests fail (Red)
npm test  # Should fail ✓

# 4. Implementer Agent
# In Cursor: "implement PD-001"

# 5. Verify tests pass (Green)
npm test  # Should pass ✓

# 6. Reviewer Agent
# In Cursor: "review PD-001"

# 7. Address feedback if needed
# In Cursor: "address review feedback for PD-001"

# 8. Commit
git add .
git commit -m "feat: implement post discovery service (PD-001)"
```

---

## File Structure After Completion

```
ngaj/
├── requirements/
│   └── features/
│       └── post-discovery.feature         # Your requirement
├── tests/
│   └── unit/
│       └── services/
│           └── post-discovery.spec.ts     # Generated by Test-Writer
├── src/
│   └── services/
│       └── post-discovery.ts              # Generated by Implementer
└── .agents/
    ├── logs/
    │   ├── test-writer/decisions.jsonl    # Test-Writer decisions
    │   ├── implementer/decisions.jsonl    # Implementer decisions
    │   └── reviewer/decisions.jsonl       # Reviewer decisions
    └── artifacts/
        ├── test-writer/
        │   ├── test-plans/PD-001_test-plan.md
        │   └── PD-001_handoff.md
        ├── implementer/
        │   ├── design-docs/PD-001_design.md
        │   └── PD-001_handoff.md
        └── reviewer/
            └── review-reports/PD-001_review.md
```

---

## Tips

1. **Start small**: Begin with one scenario, not the entire feature
2. **Iterate**: Red → Green → Refactor → Review
3. **Check decision logs**: Learn from agent reasoning
4. **Adjust thresholds**: If getting too many approval requests
5. **Use version control**: Commit after each phase

---

## Next Steps

Try it yourself:
```bash
# Create your first requirement
nano requirements/features/hello-world.feature

# Then tell the Test-Writer Agent to start!
```