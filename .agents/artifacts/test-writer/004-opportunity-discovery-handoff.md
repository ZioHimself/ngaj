# Test-Writer Handoff: Opportunity Discovery

**Handoff Number**: 004
**Feature**: Opportunity Discovery
**Based on**: [Design Handoff 003](../designer/handoffs/003-opportunity-discovery-handoff.md)
**Test Plan**: [Opportunity Discovery Test Plan](./test-plans/opportunity-discovery-test-plan.md)
**Status**: ✅ Ready for Implementation

---

## Executive Summary

**Test Suite Status**: ✅ Red Phase Complete (97 tests failing as expected)

Comprehensive test suite created for Opportunity Discovery system, covering:
- **ScoringService**: 14 unit tests (scoring algorithm validation)
- **BlueskyAdapter**: 18 unit tests (platform API integration)
- **DiscoveryService**: 36 unit tests (discovery orchestration)
- **CronScheduler**: 11 integration tests (job scheduling)
- **Opportunity Repository**: 18 integration tests (database operations)

**All tests currently fail** with "Not implemented" errors, confirming proper Red phase setup for TDD.

---

## Test Statistics

| Category | Files | Tests | Status |
|----------|-------|-------|--------|
| **Unit Tests** | 3 | 68 | ✅ Failing (Red) |
| **Integration Tests** | 2 | 29 | ✅ Failing (Red) |
| **Total** | 5 | 97 | ✅ All Failing |

### Test Files Created

```
tests/
├── fixtures/
│   └── opportunity-fixtures.ts          # NEW: Test data factories
├── unit/
│   ├── adapters/
│   │   └── bluesky-adapter.spec.ts      # NEW: 18 tests
│   └── services/
│       ├── scoring-service.spec.ts      # NEW: 14 tests
│       └── discovery-service.spec.ts    # NEW: 36 tests
└── integration/
    ├── database/
    │   └── opportunity-repository.spec.ts  # NEW: 18 tests
    └── scheduler/
        └── cron-scheduler.spec.ts          # NEW: 11 tests
```

### Implementation Stubs Created

```
src/
├── adapters/
│   ├── platform-adapter.ts              # NEW: Interface
│   └── bluesky-adapter.ts               # NEW: Stub
├── scheduler/
│   └── cron-scheduler.ts                # NEW: Stub
└── services/
    ├── scoring-service.ts               # NEW: Stub
    └── discovery-service.ts             # NEW: Stub
```

---

## Test Coverage Breakdown

### 1. ScoringService (14 tests) ⭐⭐⭐ Critical

**File**: `tests/unit/services/scoring-service.spec.ts`

**What it tests**:
- ✅ Recency score calculation (exponential decay: e^(-age/30))
- ✅ Impact score calculation (logarithmic scale: log10(followers + likes + reposts))
- ✅ Total score weighting (60% recency + 40% impact)
- ✅ Score bounds (all scores 0-100)
- ✅ Edge cases (zero engagement, negative values)
- ✅ Design doc scenarios (recent small, old large, middle moderate)
- ✅ Human-readable score explanation

**Key Test Scenarios**:
```typescript
// Recent post from small account → high score
Post: 2 min old, 1000 followers, 5 likes, 2 reposts
Expected: recency ~100, impact ~33, total ~73

// Old post from large account → low score
Post: 6 hours old, 1M followers, 500 likes, 200 reposts
Expected: recency ~0, impact ~78, total ~31

// Middle-aged post → moderate score
Post: 30 min old, 10K followers, 20 likes, 10 reposts
Expected: recency ~37, impact ~45, total ~40
```

**Mock Strategy**: None (pure calculations)

---

### 2. BlueskyAdapter (18 tests) ⭐⭐⭐ Critical

**File**: `tests/unit/adapters/bluesky-adapter.spec.ts`

**What it tests**:
- ✅ Fetch replies from Bluesky notifications API
- ✅ Search posts by keywords (deduplicated)
- ✅ Get author profiles
- ✅ Transform AT Protocol responses to RawPost/RawAuthor format
- ✅ Date filtering (since parameter)
- ✅ Error handling (429 rate limit, 401 auth, network errors)
- ✅ URL construction (AT URI → Bluesky web URL)

**Key Test Scenarios**:
```typescript
// Fetch replies and transform
Input: 2 reply notifications from Bluesky API
Expected: 2 RawPost objects with correct fields

// Search with deduplication
Input: keywords = ['typescript', 'machine learning']
Expected: Merged results, duplicates removed by postId

// Error handling
Input: 429 response from API
Expected: Throws RateLimitError with retry-after info
```

**Mock Strategy**: Mock `BskyAgent` from `@atproto/api`

---

### 3. DiscoveryService (36 tests) ⭐⭐⭐ Critical

**File**: `tests/unit/services/discovery-service.spec.ts`

**What it tests**:

#### Discovery Orchestration
- ✅ Fetch posts from platform adapter
- ✅ Score each post using ScoringService
- ✅ Filter by threshold (default: 30)
- ✅ Deduplicate by (accountId, postId)
- ✅ Upsert author with latest data
- ✅ Persist opportunities to MongoDB
- ✅ Update account discovery timestamps

#### Replies Discovery
- ✅ Use lastRunAt from 'replies' schedule
- ✅ Fallback to 2 hours ago if lastRunAt is undefined
- ✅ Set discoveryType = 'replies'

#### Search Discovery
- ✅ Extract keywords from profile.discovery.keywords
- ✅ Skip if keywords array is empty
- ✅ Set discoveryType = 'search'

#### Error Handling
- ✅ Set account.discovery.error on failure
- ✅ Do NOT update lastAt on failure
- ✅ Re-throw error for caller

#### Opportunity Management
- ✅ Get opportunities (paginated, filtered, sorted)
- ✅ Update status (dismissed, responded)
- ✅ Expire stale opportunities (status='pending', expiresAt < now)

**Key Test Scenarios**:
```typescript
// Discovery flow
Input: 5 posts from adapter, 3 score above threshold
Expected: 
  - All authors upserted
  - Only 3 opportunities inserted
  - account.discovery.lastAt updated
  - account.discovery.schedules[type].lastRunAt updated

// Deduplication
Input: 2 posts, 1 already exists in DB
Expected: Only 1 new opportunity inserted

// Error handling
Input: Platform adapter throws error
Expected: 
  - account.discovery.error set
  - account.discovery.lastAt NOT updated
  - Error re-thrown
```

**Mock Strategy**: 
- Mock MongoDB collections
- Mock IPlatformAdapter
- Mock ScoringService

---

### 4. CronScheduler (11 tests) ⭐⭐ Important

**File**: `tests/integration/scheduler/cron-scheduler.spec.ts`

**What it tests**:
- ✅ Initialize: Load active accounts and register jobs
- ✅ Skip paused/error accounts
- ✅ Skip disabled schedules
- ✅ Job key format: `accountId:discoveryType`
- ✅ Reload: Clear and re-register jobs
- ✅ Manual trigger (for testing)
- ✅ Start/stop lifecycle
- ✅ Error isolation (one job failure doesn't crash scheduler)

**Key Test Scenarios**:
```typescript
// Initialize with 2 accounts
Account1: replies enabled, search enabled → 2 jobs
Account2: replies enabled, search disabled → 1 job
Expected: 3 jobs registered

// Manual trigger
Input: triggerNow(accountId, 'replies')
Expected: Calls discoveryService.discover(accountId, 'replies')
```

**Mock Strategy**: 
- Mock MongoDB
- Mock IDiscoveryService

---

### 5. Opportunity Repository (18 tests) ⭐⭐ Important

**File**: `tests/integration/database/opportunity-repository.spec.ts`

**What it tests**:

#### MongoDB Indexes
- ✅ Compound index: `{ accountId: 1, status: 1, 'scoring.total': -1 }`
- ✅ Unique index: `{ accountId: 1, postId: 1 }`
- ✅ Expiration index: `{ status: 1, expiresAt: 1 }`
- ✅ Query optimization (< 100ms with 1000 docs)

#### Author Upsert
- ✅ Create author if not exists
- ✅ Update author if exists
- ✅ No duplicates (unique on platform + platformUserId)

#### Opportunity Queries
- ✅ Sort by scoring.total descending
- ✅ Filter by status (single or array)
- ✅ Pagination (limit + skip)

#### Expiration
- ✅ Update pending opportunities past expiresAt
- ✅ Calculate correct expiresAt on creation (discoveredAt + 48h)

#### Deduplication
- ✅ Prevent duplicate (accountId, postId)
- ✅ Allow same postId across different accounts

**Test Setup**: Uses real MongoDB test database

---

## Test Fixtures

### opportunity-fixtures.ts (NEW)

**Purpose**: Factory functions for creating test data

**Key Exports**:
```typescript
// Factories
createMockOpportunity(accountId, authorId, overrides?)
createMockAuthor(overrides?)
createMockRawPost(overrides?)
createMockRawAuthor(overrides?)
createMockOpportunityWithAuthor(accountId, overrides?)

// Pre-configured fixtures
createOpportunityFixtures(accountId, authorId)
authorFixtures (smallAccount, mediumAccount, largeAccount, megaAccount)
scoringScenarios (recentSmall, oldLarge, middleModerate, brandNew)

// Bulk helpers
createMockOpportunities(accountId, authorId, count, status)
createMockAuthors(count, platform)
```

**Updated Fixtures**:
- `account-fixtures.ts`: Updated for ADR-008 (multiple schedules array)

---

## Dependencies Installed

**None** - All testing dependencies already present in `package.json`:
- `vitest` (unit/integration testing)
- `@vitest/runner` (test runner)
- `mongodb` (database integration tests)
- `@atproto/api` (Bluesky adapter, mocked in tests)

---

## Implementation Order (Recommended)

### Phase 1: Pure Logic (No Dependencies)
1. **ScoringService** ⏱️ 2-4 hours
   - Implement `scoreOpportunity()`
   - Implement `explainScore()`
   - Run: `npm test -- tests/unit/services/scoring-service.spec.ts`

### Phase 2: Platform Integration
2. **BlueskyAdapter** ⏱️ 4-6 hours
   - Implement `fetchReplies()`
   - Implement `searchPosts()`
   - Implement `getAuthor()`
   - Add error handling (RateLimitError, AuthenticationError)
   - Run: `npm test -- tests/unit/adapters/bluesky-adapter.spec.ts`

### Phase 3: Core Service
3. **DiscoveryService** ⏱️ 8-12 hours
   - Implement `discover()` (replies + search logic)
   - Implement `getOpportunities()` (queries + pagination)
   - Implement `updateStatus()`
   - Implement `expireOpportunities()`
   - Add author upsert logic
   - Add deduplication checks
   - Run: `npm test -- tests/unit/services/discovery-service.spec.ts`

### Phase 4: Scheduler
4. **CronScheduler** ⏱️ 4-6 hours
   - Implement `initialize()` (load accounts, register jobs)
   - Implement `start()` / `stop()`
   - Implement `reload()`
   - Implement `triggerNow()` (manual trigger)
   - Add job lifecycle management
   - Run: `npm test -- tests/integration/scheduler/cron-scheduler.spec.ts`

### Phase 5: Database Setup
5. **MongoDB Indexes** ⏱️ 1-2 hours
   - Add index creation to database setup
   - Verify with integration tests
   - Run: `npm test -- tests/integration/database/opportunity-repository.spec.ts`

**Total Estimated Time**: 19-30 hours (3-5 days)

---

## Running Tests

### All Opportunity Discovery Tests
```bash
npm test -- opportunity
```

### By Test File
```bash
# Unit tests
npm test -- tests/unit/services/scoring-service.spec.ts
npm test -- tests/unit/adapters/bluesky-adapter.spec.ts
npm test -- tests/unit/services/discovery-service.spec.ts

# Integration tests
npm test -- tests/integration/scheduler/cron-scheduler.spec.ts
npm test -- tests/integration/database/opportunity-repository.spec.ts
```

### Watch Mode (Development)
```bash
npm test -- --watch scoring-service
```

### With Coverage
```bash
npm test -- --coverage opportunity
```

---

## Expected Green Phase Output

After implementation, all tests should pass:

```bash
$ npm test -- opportunity

✓ tests/unit/services/scoring-service.spec.ts (14 tests) 24ms
✓ tests/unit/adapters/bluesky-adapter.spec.ts (18 tests) 56ms
✓ tests/unit/services/discovery-service.spec.ts (36 tests) 145ms
✓ tests/integration/scheduler/cron-scheduler.spec.ts (11 tests) 89ms
✓ tests/integration/database/opportunity-repository.spec.ts (18 tests) 234ms

Test Files  5 passed (5)
     Tests  97 passed (97)
  Start at  10:30:15
  Duration  548ms
```

---

## Critical Tests (Must Pass)

These tests define the core functionality and **must** pass:

1. **ScoringService.scoreOpportunity()** - Correct calculation for all scenarios
2. **DiscoveryService.discover()** - Complete orchestration flow
3. **DiscoveryService deduplication** - No duplicate (accountId, postId)
4. **DiscoveryService threshold filtering** - Only persist score >= 30
5. **Author upsert** - Create or update atomically
6. **Opportunity queries** - Sorted by score, filtered by status
7. **Status update** - Update and timestamp correctly

---

## Key Implementation Notes

### Scoring Algorithm
```typescript
// Recency: Exponential decay
recency = Math.exp(-ageInMinutes / 30) * 100

// Impact: Logarithmic scale
followerScore = Math.log10(Math.max(1, followers))
likesScore = Math.log10(Math.max(1, likes + 1))
repostsScore = Math.log10(Math.max(1, reposts + 1))
impact = ((followerScore + likesScore + repostsScore) / 10) * 100

// Total: Weighted average
total = (0.6 * recency) + (0.4 * impact)
```

### Deduplication Check
```typescript
// Before inserting opportunity
const existing = await opportunities.findOne({
  accountId: accountId,
  postId: post.id
});

if (existing) {
  console.log(`Duplicate opportunity skipped: ${post.id}`);
  continue; // Skip this post
}
```

### Author Upsert
```typescript
await authors.updateOne(
  { platform: 'bluesky', platformUserId: author.id },
  {
    $set: {
      handle: author.handle,
      displayName: author.displayName,
      bio: author.bio,
      followerCount: author.followerCount,
      lastUpdatedAt: new Date()
    }
  },
  { upsert: true }
);
```

### Discovery Schedule Tracking
```typescript
// After successful discovery
await accounts.updateOne(
  { _id: accountId },
  {
    $set: {
      'discovery.lastAt': new Date(),
      [`discovery.schedules.${scheduleIndex}.lastRunAt`]: new Date()
    }
  }
);
```

### Opportunity Expiration
```typescript
// Calculate expiresAt on creation
const ttlHours = Number(process.env.OPPORTUNITY_TTL_HOURS) || 48;
const expiresAt = new Date(discoveredAt.getTime() + ttlHours * 60 * 60 * 1000);

// Expire stale opportunities
await opportunities.updateMany(
  { status: 'pending', expiresAt: { $lt: new Date() } },
  { $set: { status: 'expired', updatedAt: new Date() } }
);
```

---

## Validation Rules

### Environment Variables
- `DISCOVERY_MIN_SCORE`: Integer 0-100 (default: 30)
- `OPPORTUNITY_TTL_HOURS`: Positive integer (default: 48)
- `DISCOVERY_FALLBACK_HOURS`: Positive integer (default: 2)

### Opportunity Status Transitions
```
pending → dismissed (user action)
pending → responded (user action)
pending → expired (system, time-based)

❌ Cannot transition: expired → pending
❌ Cannot transition: responded → pending
```

### Scoring Constraints
- All scores must be 0-100
- Total score = (0.6 * recency) + (0.4 * impact)
- Scores rounded to nearest integer

---

## Error Patterns

### Platform API Errors
```typescript
class RateLimitError extends Error {
  retryAfter: number; // Seconds
}

class AuthenticationError extends Error {
  // Invalid credentials
}

class PlatformApiError extends Error {
  // Network, timeout, etc.
}
```

### Discovery Service Errors
```typescript
class DiscoveryError extends Error {
  accountId: ObjectId;
  discoveryType: DiscoveryType;
  cause?: Error;
}

class NotFoundError extends Error {
  // Opportunity not found
}
```

---

## Known Limitations

### Out of Scope (This Phase)
- ❌ API endpoint integration tests (deferred)
- ❌ E2E tests (deferred)
- ❌ Multi-platform adapters (v0.2)
- ❌ Performance benchmarks beyond basic validation
- ❌ Concurrency/race condition tests

### Test Assumptions
- MongoDB is running locally
- Test database can be created/dropped
- No authentication required for test database
- Sufficient disk space for test data

---

## Success Criteria

✅ **Test Suite Completeness**
- All scenarios from Design Handoff tested
- Critical path fully covered
- Edge cases included

✅ **Red Phase Verified**
- All 97 tests failing with clear error messages
- No false positives
- Stubs throw "Not implemented"

✅ **Code Quality**
- No linter errors
- Proper TypeScript types
- Clear test names
- Good test organization

✅ **Documentation**
- Test plan created
- Handoff document complete
- Implementation guidance clear

✅ **Handoff Ready**
- Implementer can start immediately
- All dependencies resolved
- Clear success path defined

---

## References

### Design Documents
- [ADR-008: Opportunity Discovery Architecture](../../docs/architecture/decisions/008-opportunity-discovery-architecture.md)
- [Design Handoff 003](../designer/handoffs/003-opportunity-discovery-handoff.md)
- [Opportunity Discovery Design](../designer/designs/opportunity-discovery-design.md)

### Type Definitions
- `src/shared/types/opportunity.ts` - Opportunity, Author, OpportunityScore types
- `src/shared/types/account.ts` - Account, DiscoveryTypeSchedule types
- `src/shared/types/profile.ts` - Profile type

### Test Fixtures
- `tests/fixtures/opportunity-fixtures.ts` - Opportunity test data
- `tests/fixtures/account-fixtures.ts` - Account test data (updated for ADR-008)
- `tests/fixtures/profile-fixtures.ts` - Profile test data

### External Documentation
- [Bluesky API Docs](https://docs.bsky.app/docs/api/)
- [AT Protocol Specification](https://atproto.com/specs/atp)
- [node-cron](https://github.com/node-cron/node-cron)
- [Vitest Documentation](https://vitest.dev/)

---

## Implementer Checklist

Before starting:
- [ ] Read ADR-008 to understand architecture decisions
- [ ] Review Design Handoff 003 for complete specifications
- [ ] Examine test files to understand expected behavior
- [ ] Review opportunity-fixtures.ts for data structures

During implementation:
- [ ] Implement ScoringService (14 tests passing)
- [ ] Implement BlueskyAdapter (18 tests passing)
- [ ] Implement DiscoveryService (36 tests passing)
- [ ] Implement CronScheduler (11 tests passing)
- [ ] Set up MongoDB indexes (18 tests passing)
- [ ] Run full test suite (97 tests passing)
- [ ] Run linter (no errors)
- [ ] Verify TypeScript compilation (no errors)

After implementation:
- [ ] All tests pass (Green phase)
- [ ] Code coverage > 90%
- [ ] No linter warnings
- [ ] TypeScript strict mode passes
- [ ] Manual smoke test with real MongoDB
- [ ] Update integration with existing services (if needed)
- [ ] Ready for Reviewer Agent

---

**Handoff Complete**: ✅ Ready for Implementation
**Red Phase**: ✅ Verified (97 tests failing)
**Implementation Time**: 3-5 days estimated
**Next Agent**: Implementer Agent

---

*This handoff document provides all information needed to implement the Opportunity Discovery system following TDD principles. All tests are failing (Red phase), implementation stubs are in place, and success criteria are clearly defined.*

