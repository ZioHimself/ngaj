# Opportunity Discovery - Test Plan

**Handoff Number**: 004
**Feature**: Opportunity Discovery
**Based on**: [Design Handoff 003](../../../.agents/artifacts/designer/handoffs/003-opportunity-discovery-handoff.md)
**Design Rationale**: [ADR-008: Opportunity Discovery Architecture](../../../../docs/architecture/decisions/008-opportunity-discovery-architecture.md)

---

## Test Coverage Summary

| Test Category | Test Files | Test Count | Status |
|--------------|------------|------------|--------|
| **Unit Tests** | 3 files | 68 tests | ✅ Red Phase |
| **Integration Tests** | 2 files | 29 tests | ✅ Red Phase |
| **Total** | 5 files | 97 tests | ✅ All Failing |

### Test Breakdown by Component

1. **ScoringService** (Unit): 14 tests
   - Recency scoring algorithm (exponential decay)
   - Impact scoring algorithm (logarithmic scale)
   - Total score calculation (60/40 weighting)
   - Edge cases (zero engagement, negative values)
   - Score explanation

2. **BlueskyAdapter** (Unit): 18 tests
   - Fetch replies from notifications
   - Search posts by keywords
   - Get author profiles
   - Deduplication logic
   - Date filtering
   - Error handling (rate limits, auth, network)

3. **DiscoveryService** (Unit): 36 tests
   - Discovery orchestration (replies + search)
   - Threshold filtering
   - Deduplication by (accountId, postId)
   - Author upsert logic
   - Opportunity CRUD operations
   - Status updates
   - Expiration logic
   - Error handling and rollback

4. **CronScheduler** (Integration): 11 tests
   - Job registration for enabled schedules
   - Schedule reload
   - Manual trigger
   - Job lifecycle (start/stop)
   - Error isolation

5. **Opportunity Repository** (Integration): 18 tests
   - MongoDB indexes and query optimization
   - Author upsert operations
   - Deduplication constraints
   - Expiration queries
   - Pagination
   - Performance validation

---

## Test Categories

### Unit Tests (Critical Path)

#### ScoringService
**File**: `tests/unit/services/scoring-service.spec.ts`
**Priority**: ⭐⭐⭐ Critical - Core scoring algorithm

**Coverage**:
- ✅ Recent post from small account (high recency, low impact) → score ~73
- ✅ Old post from large account (low recency, high impact) → score ~31
- ✅ Middle-aged post with moderate engagement → score ~40
- ✅ Brand new post (0 minutes old) → recency = 100
- ✅ Zero engagement handling (no division by zero)
- ✅ Zero/negative follower count handling
- ✅ Recency weight > impact weight validation
- ✅ Score bounds (0-100)
- ✅ Exponential decay formula (e^(-age/30))
- ✅ Logarithmic impact scale
- ✅ Human-readable score explanation

**Mock Strategy**: No mocks needed (pure calculations)

---

#### BlueskyAdapter
**File**: `tests/unit/adapters/bluesky-adapter.spec.ts`
**Priority**: ⭐⭐⭐ Critical - Platform API integration

**Coverage**:
- ✅ Fetch and transform reply notifications
- ✅ Filter replies by since date
- ✅ Filter out non-reply notifications (likes, reposts)
- ✅ Return empty array when no replies
- ✅ Construct correct Bluesky URLs
- ✅ Search posts by multiple keywords
- ✅ Deduplicate search results (same post matches multiple keywords)
- ✅ Filter search results by since date
- ✅ Handle empty keywords array
- ✅ Transform posts with all required fields
- ✅ Fetch and transform author profile
- ✅ Handle missing bio gracefully
- ✅ Handle missing display name (fallback to handle)
- ✅ Default follower count to 0 if missing
- ✅ Prepend @ to handle if not present
- ✅ Throw RateLimitError on 429 response
- ✅ Throw PlatformApiError on network error
- ✅ Throw AuthenticationError on 401 response

**Mock Strategy**: Mock `BskyAgent` from `@atproto/api` using Vitest

---

#### DiscoveryService
**File**: `tests/unit/services/discovery-service.spec.ts`
**Priority**: ⭐⭐⭐ Critical - Discovery orchestration

**Coverage**:

**Replies Discovery**:
- ✅ Discover replies and create opportunities above threshold
- ✅ Use fallback lookback when lastRunAt is undefined
- ✅ Deduplicate existing opportunities
- ✅ Return empty array when no posts meet threshold
- ✅ Update account.discovery.error on platform API failure
- ✅ NOT update lastAt on discovery failure

**Search Discovery**:
- ✅ Discover search results using profile keywords
- ✅ Skip search when profile has empty keywords array

**Get Opportunities**:
- ✅ Return paginated opportunities sorted by score descending
- ✅ Filter by single status
- ✅ Filter by multiple statuses using $in
- ✅ Populate author data for each opportunity

**Update Status**:
- ✅ Update opportunity status to 'dismissed'
- ✅ Update opportunity status to 'responded'
- ✅ Throw NotFoundError when opportunity doesn't exist

**Expiration**:
- ✅ Expire pending opportunities past TTL
- ✅ Return 0 when no opportunities to expire

**Author Upsert**:
- ✅ Upsert author with latest data during discovery

**Mock Strategy**: 
- Mock MongoDB database collections
- Mock IPlatformAdapter methods
- Mock ScoringService

---

### Integration Tests (Database & Scheduler)

#### CronScheduler
**File**: `tests/integration/scheduler/cron-scheduler.spec.ts`
**Priority**: ⭐⭐ Important - Job scheduling logic

**Coverage**:
- ✅ Register jobs for all enabled schedules
- ✅ Skip paused accounts
- ✅ Skip error accounts
- ✅ Skip disabled schedules
- ✅ Handle empty accounts list
- ✅ Clear and re-initialize jobs on reload
- ✅ Update job count when schedule is disabled
- ✅ Manually trigger discovery for specific account and type
- ✅ Propagate discovery errors
- ✅ Start and stop all cron jobs
- ✅ Use correct job key format (accountId:discoveryType)

**Mock Strategy**: 
- Mock MongoDB database
- Mock IDiscoveryService

---

#### Opportunity Repository
**File**: `tests/integration/database/opportunity-repository.spec.ts`
**Priority**: ⭐⭐ Important - Database operations

**Coverage**:

**Indexes**:
- ✅ Use compound index for prioritized opportunity queries
- ✅ Enforce unique constraint on (accountId, postId)
- ✅ Use expiresAt index for expiration queries

**Author Upsert**:
- ✅ Create new author when not exists
- ✅ Update existing author when already exists
- ✅ Not create duplicate authors

**Opportunity Queries**:
- ✅ Return opportunities sorted by total score descending
- ✅ Filter opportunities by status
- ✅ Filter opportunities by multiple statuses using $in
- ✅ Support pagination with limit and skip

**Expiration**:
- ✅ Expire pending opportunities past TTL
- ✅ Calculate correct expiresAt on opportunity creation

**Deduplication**:
- ✅ Prevent duplicate opportunities with same (accountId, postId)
- ✅ Allow same postId for different accounts

**Performance**:
- ✅ Handle large result sets efficiently (< 100ms with 1000 documents)

**Test Setup**: Uses real MongoDB test database

---

## Mock Strategy

### External APIs
- **Bluesky AT Protocol**: Mock using `vi.mock('@atproto/api')`
  - `BskyAgent.listNotifications()` → Mock notifications
  - `BskyAgent.getPost()` → Mock post data
  - `BskyAgent.app.bsky.feed.searchPosts()` → Mock search results
  - `BskyAgent.getProfile()` → Mock author profile

### Database
- **Unit Tests**: Mock MongoDB collections and methods
- **Integration Tests**: Real test MongoDB database (`ngaj_test_opportunity_discovery`)
  - Dropped after each test suite
  - Indexes created in `setupTestDatabase()`

### Node Cron
- **Strategy**: Test manual trigger instead of actual cron execution
- **Validation**: Test cron expression parsing separately

---

## Test Priorities

### ⭐⭐⭐ Critical Path (Must Pass)
1. **Scoring algorithm** - Correct calculation for known inputs
2. **Discovery orchestration** - Fetch, score, filter, persist workflow
3. **Deduplication** - Prevent duplicate opportunities
4. **Threshold filtering** - Only persist opportunities above threshold
5. **Author upsert** - Create or update authors atomically
6. **GET opportunities** - Fetch paginated, filtered, sorted opportunities
7. **PATCH status** - Update opportunity status

### ⭐⭐ Important (Should Pass)
8. **BlueskyAdapter** - Transform Bluesky API responses correctly
9. **Error handling** - Rate limits, auth failures, network errors
10. **Opportunity expiration** - Time-based TTL logic
11. **Manual discovery trigger** - Testing support
12. **Database indexes** - Efficient queries via explain plans

### ⭐ Nice to Have (May Defer)
13. **Cron scheduler** - Initialize, reload, register jobs
14. **Score explanation** - Human-readable score breakdown
15. **Edge cases** - Very old lastRunAt, deleted authors, etc.

---

## Known Limitations

### Out of Scope (This Phase)
- ❌ Real Bluesky API calls (use mocks)
- ❌ Actual cron execution (test manual triggers)
- ❌ Multi-platform adapters (LinkedIn, Reddit deferred to v0.2)
- ❌ Performance/load testing
- ❌ UI integration tests
- ❌ API endpoint integration tests (deferred)

### Test Data Constraints
- **Time-based tests**: Use fixed dates to avoid flaky tests
- **Scoring tolerance**: Allow ±5 point range for score assertions
- **Performance**: Test database must be local for speed

---

## Environment Configuration

### Required Environment Variables
```bash
# Testing (optional, defaults provided)
MONGO_URI=mongodb://localhost:27017
DISCOVERY_MIN_SCORE=30
OPPORTUNITY_TTL_HOURS=48
DISCOVERY_FALLBACK_HOURS=2
```

### Test Database
- **Name**: `ngaj_test_opportunity_discovery`
- **Lifecycle**: Created in `beforeEach`, dropped in `afterEach`
- **Indexes**: Created automatically in `setupTestDatabase()`

---

## Running Tests

### All Opportunity Discovery Tests
```bash
npm test -- opportunity
```

### Unit Tests Only
```bash
npm test -- tests/unit/services/scoring-service.spec.ts
npm test -- tests/unit/adapters/bluesky-adapter.spec.ts
npm test -- tests/unit/services/discovery-service.spec.ts
```

### Integration Tests Only
```bash
npm test -- tests/integration/scheduler/cron-scheduler.spec.ts
npm test -- tests/integration/database/opportunity-repository.spec.ts
```

### Watch Mode (for development)
```bash
npm test -- --watch opportunity
```

---

## Red Phase Verification

**Status**: ✅ **All Tests Failing**

### Test Execution Output (Sample)
```
❯ tests/unit/services/scoring-service.spec.ts (14 tests | 14 failed)
  × should return high recency score for recent post
    Error: Not implemented
  × should return low recency score for old post
    Error: Not implemented
  ...

❯ tests/unit/adapters/bluesky-adapter.spec.ts (18 tests | 16 failed)
  × should fetch and transform reply notifications
    Error: Not implemented
  ...

❯ tests/unit/services/discovery-service.spec.ts (36 tests | 36 failed)
  × should discover replies and create opportunities above threshold
    Error: Not implemented
  ...
```

**Total**: 68 tests failing (unit) + 29 tests pending (integration) = 97 tests in Red phase ✅

---

## Success Criteria

A test-writing session succeeds when:

1. ✅ **Comprehensive Coverage**: All scenarios from Designer handoff are tested
2. ✅ **Red Phase Verified**: All tests fail with clear, actionable error messages
3. ✅ **Well-Organized**: Tests are logically grouped and easy to navigate
4. ✅ **Properly Mocked**: External dependencies are mocked appropriately
5. ✅ **Test Plan Created**: Strategic testing decisions are documented
6. ✅ **Clear Handoff**: Implementer knows exactly what to build
7. ✅ **Fast Execution**: Test suite runs in reasonable time
8. ✅ **Lint-Clean**: Test code passes linter checks (no errors)

---

## References

- **Why these decisions**: [ADR-008: Opportunity Discovery Architecture](../../../../docs/architecture/decisions/008-opportunity-discovery-architecture.md)
- **Complete technical specs**: [Design Document](../../../designer/designs/opportunity-discovery-design.md)
- **Test scenarios**: [Design Handoff](../../../designer/handoffs/003-opportunity-discovery-handoff.md)
- **Data models**: `src/shared/types/opportunity.ts`
- **Test fixtures**: `tests/fixtures/opportunity-fixtures.ts`
- **Project glossary**: `docs/project-glossary.md`

---

## Next Steps for Implementer

1. Read this test plan to understand coverage strategy
2. Review failing tests to understand expected behavior
3. Implement services in order of dependencies:
   - `ScoringService` (no dependencies)
   - `BlueskyAdapter` (depends on @atproto/api)
   - `DiscoveryService` (depends on both)
   - `CronScheduler` (depends on DiscoveryService)
4. Run tests frequently to verify progress
5. Achieve Green phase (all tests passing)
6. Run linter to ensure code quality

**Expected Implementation Time**: 3-5 days for experienced TypeScript developer

---

**Document Status**: ✅ Complete
**Red Phase Status**: ✅ Verified
**Handoff Status**: ✅ Ready for Implementer

