# Opportunity Discovery - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-008: Opportunity Discovery Architecture](../../../docs/architecture/decisions/008-opportunity-discovery-architecture.md)
🔗 **Technical Specs**: [Design Document](../designs/opportunity-discovery-design.md)

## Overview

The Opportunity Discovery system needs comprehensive testing across multiple layers: platform adapters, scoring logic, discovery orchestration, database operations, and cron scheduling. This handoff document outlines test scenarios, acceptance criteria, and mock/stub guidance for the Test-Writer Agent.

**Testing Priority**: Scoring algorithm and discovery orchestration are critical path. Cron scheduling can be tested with manual triggers.

---

## 1. Test Scope

### In Scope
- ✅ Scoring algorithm (recency, impact, total)
- ✅ Discovery service orchestration (fetch, deduplicate, score, persist)
- ✅ Platform adapter interface (Bluesky implementation)
- ✅ Database operations (opportunity CRUD, author upsert, expiration)
- ✅ API endpoints (GET opportunities, PATCH status, POST discovery/run)
- ✅ Error handling (rate limits, auth failures, network errors)
- ✅ Deduplication logic
- ✅ Expiration logic (time-based TTL)

### Out of Scope (for this phase)
- ❌ Real Bluesky API calls (use mocks)
- ❌ Actual cron execution (test manual triggers)
- ❌ Multi-platform adapters (LinkedIn, Reddit deferred to v0.2)
- ❌ Performance/load testing
- ❌ UI integration tests

---

## 2. Test Scenarios

### 2.1 Unit Tests: ScoringService

#### Scenario: Recent post from small account scores high
**Given**: Post created 2 minutes ago, author has 1,000 followers, post has 5 likes, 2 reposts
**When**: `scoreOpportunity(post, author)` is called
**Then**: 
- Recency score ≈ 100
- Impact score ≈ 33
- Total score ≈ 73 (0.6 * 100 + 0.4 * 33)

**Acceptance Criteria**:
- [ ] Recency score is within 99-101 range
- [ ] Impact score is within 30-36 range
- [ ] Total score is within 70-76 range

**Technical Details**: See [Design Doc Section 2.2](../designs/opportunity-discovery-design.md#22-scoringservice) for complete scoring algorithm.

---

#### Scenario: Old post from large account scores low
**Given**: Post created 6 hours ago, author has 1,000,000 followers, post has 500 likes, 200 reposts
**When**: `scoreOpportunity(post, author)` is called
**Then**:
- Recency score ≈ 0
- Impact score ≈ 78
- Total score ≈ 31 (0.6 * 0 + 0.4 * 78)

**Acceptance Criteria**:
- [ ] Recency score is < 1
- [ ] Impact score is within 75-80 range
- [ ] Total score is within 29-33 range

---

#### Scenario: Middle-aged post with moderate engagement
**Given**: Post created 30 minutes ago, author has 10,000 followers, post has 20 likes, 10 reposts
**When**: `scoreOpportunity(post, author)` is called
**Then**:
- Recency score ≈ 37 (e^(-30/30) ≈ 0.368)
- Impact score ≈ 45
- Total score ≈ 40 (0.6 * 37 + 0.4 * 45)

**Acceptance Criteria**:
- [ ] Recency score is within 35-40 range
- [ ] Impact score is within 43-47 range
- [ ] Total score is within 38-42 range

---

#### Scenario: Brand new post (0 minutes old)
**Given**: Post created exactly now, author has 5,000 followers, 0 likes, 0 reposts
**When**: `scoreOpportunity(post, author)` is called
**Then**:
- Recency score = 100
- Impact score ≈ 37 (log10(5000) ≈ 3.7, normalized)
- Total score ≈ 75

**Acceptance Criteria**:
- [ ] Recency score = 100
- [ ] Impact score is within 35-40 range
- [ ] Total score is within 73-77 range

---

#### Scenario: Zero engagement post
**Given**: Post with 0 likes, 0 reposts, author has 100 followers
**When**: `scoreOpportunity(post, author)` is called
**Then**: Impact score should handle log10(0) gracefully (use log10(1) as minimum)

**Acceptance Criteria**:
- [ ] No division by zero errors
- [ ] Impact score is > 0
- [ ] Function returns valid OpportunityScore

---

### 2.2 Unit Tests: BlueskyAdapter

**Mock Guidance**: Use `@atproto/api` mocks for `BskyAgent` methods.

#### Scenario: Fetch replies returns transformed posts
**Given**: Bluesky API returns 3 reply notifications
**When**: `fetchReplies({ since: '2026-01-01T10:00:00Z', limit: 100 })` is called
**Then**: 
- Returns 3 RawPost objects
- Each has correct id, url, text, createdAt, authorId, engagement metrics
- Posts created before `since` are filtered out

**Acceptance Criteria**:
- [ ] Returns array of RawPost objects
- [ ] All required fields are populated
- [ ] Posts older than `since` are excluded
- [ ] AT URIs are correctly transformed to RawPost.id
- [ ] Bluesky URLs are correctly constructed

**Technical Details**: See [Design Doc Section 2.4](../designs/opportunity-discovery-design.md#24-blueskyAdapter-implementation) for BlueskyAdapter implementation.

---

#### Scenario: Search posts by keywords returns deduplicated results
**Given**: Keywords `['typescript', 'machine learning']`, some posts match both
**When**: `searchPosts(['typescript', 'machine learning'], { limit: 50 })` is called
**Then**:
- Searches for each keyword independently
- Deduplicates posts by post ID
- Returns unique RawPost array

**Acceptance Criteria**:
- [ ] Calls `agent.app.bsky.feed.searchPosts()` for each keyword
- [ ] Duplicate post IDs are removed
- [ ] Returns merged RawPost array

---

#### Scenario: Get author returns transformed profile
**Given**: Bluesky API returns profile for DID `did:plc:abc123`
**When**: `getAuthor('did:plc:abc123')` is called
**Then**: Returns RawAuthor with id, handle, displayName, bio, followerCount

**Acceptance Criteria**:
- [ ] Returns RawAuthor object
- [ ] All fields correctly mapped from Bluesky profile
- [ ] Missing bio handled gracefully (undefined, not error)
- [ ] Follower count defaults to 0 if missing

---

#### Scenario: Rate limit error is thrown
**Given**: Bluesky API returns 429 Too Many Requests
**When**: Any adapter method is called
**Then**: Throws `RateLimitError` with retry-after information

**Acceptance Criteria**:
- [ ] Throws error of type `RateLimitError`
- [ ] Error contains `retryAfter` property
- [ ] Error message includes rate limit context

---

### 2.3 Unit Tests: DiscoveryService

**Mock Guidance**: 
- Mock `IPlatformAdapter` methods to return test data
- Use in-memory or test MongoDB database
- Mock `ScoringService` if testing orchestration logic only

#### Scenario: Discover replies creates opportunities above threshold
**Given**: 
- Account with profileId, last discovery run 2 hours ago
- Platform adapter returns 5 posts
- 3 posts score above threshold (30), 2 below

**When**: `discover(accountId, 'replies')` is called
**Then**:
- Fetches posts since `lastRunAt`
- Scores all 5 posts
- Creates 3 opportunities (above threshold)
- Discards 2 posts (below threshold)
- Updates account.discovery.lastAt and schedule.lastRunAt
- Returns 3 created opportunities

**Acceptance Criteria**:
- [ ] Calls `platformAdapter.fetchReplies({ since: lastRunAt })`
- [ ] Calls `scoringService.scoreOpportunity()` for each post
- [ ] Inserts only opportunities with score >= threshold
- [ ] Updates account discovery timestamps
- [ ] Returns array of created opportunities

**Technical Details**: See [Design Doc Section 2.1](../designs/opportunity-discovery-design.md#21-discoveryservice) for DiscoveryService interface.

---

#### Scenario: Discover search queries profile keywords
**Given**:
- Account with profile containing keywords `['typescript', 'graphql']`
- Platform adapter returns 10 posts across both keywords

**When**: `discover(accountId, 'search')` is called
**Then**:
- Loads account with populated profile
- Extracts keywords from profile.discovery.keywords
- Calls `platformAdapter.searchPosts(keywords, options)`
- Creates opportunities for posts above threshold

**Acceptance Criteria**:
- [ ] Loads account with profile populated
- [ ] Passes profile keywords to search
- [ ] Creates opportunities for matching posts
- [ ] Sets opportunity.discoveryType = 'search'

---

#### Scenario: Deduplication prevents duplicate opportunities
**Given**:
- Existing opportunity with postId = 'at://did:plc:123/post/abc'
- Discovery finds same post again

**When**: `discover(accountId, 'replies')` is called
**Then**:
- Checks for existing opportunity by (accountId, postId)
- Skips creating duplicate
- Does not throw error

**Acceptance Criteria**:
- [ ] Queries existing opportunities before insert
- [ ] Skips duplicate post silently
- [ ] Does not attempt to insert duplicate (no unique constraint error)
- [ ] Logs info-level message about duplicate

---

#### Scenario: Author upsert updates existing author
**Given**:
- Existing author with platform = 'bluesky', platformUserId = 'did:plc:123'
- New post from same author with updated follower count

**When**: Discovery processes post from this author
**Then**:
- Upserts author with new data
- Updates followerCount, displayName, bio, lastUpdatedAt
- Does not create duplicate author

**Acceptance Criteria**:
- [ ] Uses `updateOne(..., { upsert: true })`
- [ ] Updates all author fields
- [ ] Sets lastUpdatedAt = now
- [ ] Single author record exists after upsert

---

#### Scenario: First discovery run uses fallback lookback
**Given**:
- Account with discovery schedule where lastRunAt = undefined
- DISCOVERY_FALLBACK_HOURS = 2

**When**: `discover(accountId, 'replies')` is called
**Then**:
- Calculates since = now - 2 hours
- Fetches posts since fallback time
- Sets schedule.lastRunAt after successful discovery

**Acceptance Criteria**:
- [ ] Uses fallback hours when lastRunAt is undefined
- [ ] Passes calculated since to platform adapter
- [ ] Sets lastRunAt after discovery completes

---

#### Scenario: Discovery error updates account error field
**Given**: Platform adapter throws `PlatformApiError`
**When**: `discover(accountId, 'replies')` is called
**Then**:
- Catches error
- Updates account.discovery.error with error message
- Re-throws error for caller (cron scheduler) to handle
- Does not update lastAt (failed run)

**Acceptance Criteria**:
- [ ] Catches platform adapter errors
- [ ] Sets account.discovery.error field
- [ ] Does not update account.discovery.lastAt
- [ ] Re-throws error

---

### 2.4 Unit Tests: Opportunity Expiration

#### Scenario: Expire pending opportunities past TTL
**Given**:
- 3 opportunities with status = 'pending'
- 2 have expiresAt in the past
- 1 has expiresAt in the future

**When**: `expireOpportunities()` is called
**Then**:
- Updates 2 opportunities to status = 'expired'
- Does not touch the 1 future opportunity
- Returns count = 2

**Acceptance Criteria**:
- [ ] Queries opportunities where status = 'pending' AND expiresAt < now
- [ ] Updates matched opportunities to status = 'expired'
- [ ] Sets updatedAt = now
- [ ] Returns number of expired opportunities

---

#### Scenario: expiresAt is calculated on creation
**Given**: Creating new opportunity with OPPORTUNITY_TTL_HOURS = 48
**When**: Opportunity is inserted with discoveredAt = '2026-01-01T12:00:00Z'
**Then**: expiresAt = '2026-01-03T12:00:00Z' (48 hours later)

**Acceptance Criteria**:
- [ ] expiresAt is set during opportunity creation
- [ ] expiresAt = discoveredAt + TTL hours
- [ ] expiresAt is stored in database

---

### 2.5 Integration Tests: API Endpoints

**Test Setup**: 
- Use test MongoDB database
- Mock BlueskyAdapter
- Seed database with test accounts, profiles, opportunities

#### Scenario: GET /api/opportunities returns paginated results
**Given**:
- Test account with 50 opportunities (status = 'pending')
- Opportunities have various scores

**When**: `GET /api/opportunities?status=pending&limit=20&offset=0`
**Then**:
- Returns 200 OK
- Response contains 20 opportunities
- Opportunities are sorted by scoring.total descending
- Pagination object shows total = 50, limit = 20, offset = 0

**Acceptance Criteria**:
- [ ] Returns 200 status code
- [ ] Response matches expected JSON structure
- [ ] Opportunities are correctly sorted
- [ ] Pagination metadata is correct
- [ ] Each opportunity has populated author data

**Technical Details**: See [Design Doc Section 5.1](../designs/opportunity-discovery-design.md#51-get-apiopportunities) for complete API specification.

---

#### Scenario: GET /api/opportunities filters by status
**Given**: Opportunities with status 'pending', 'dismissed', 'responded'
**When**: `GET /api/opportunities?status=pending,responded`
**Then**: Returns only opportunities with status in ['pending', 'responded']

**Acceptance Criteria**:
- [ ] Returns 200 status code
- [ ] All returned opportunities have status in filter array
- [ ] No opportunities with status = 'dismissed' are returned

---

#### Scenario: GET /api/opportunities/:id returns single opportunity
**Given**: Opportunity with _id = '507f1f77bcf86cd799439011'
**When**: `GET /api/opportunities/507f1f77bcf86cd799439011`
**Then**:
- Returns 200 OK
- Response contains opportunity with populated author

**Acceptance Criteria**:
- [ ] Returns 200 status code
- [ ] Response contains OpportunityWithAuthor object
- [ ] Author data is populated (not just ID)

---

#### Scenario: GET /api/opportunities/:id returns 404 for nonexistent ID
**Given**: No opportunity exists with given ID
**When**: `GET /api/opportunities/507f1f77bcf86cd799439099`
**Then**:
- Returns 404 Not Found
- Error response contains code and message

**Acceptance Criteria**:
- [ ] Returns 404 status code
- [ ] Response matches ErrorResponse format
- [ ] Error code = 'NOT_FOUND'

---

#### Scenario: PATCH /api/opportunities/:id/status updates status
**Given**: Opportunity with status = 'pending'
**When**: `PATCH /api/opportunities/:id/status` with body `{ status: 'dismissed' }`
**Then**:
- Returns 200 OK
- Opportunity status updated to 'dismissed'
- updatedAt timestamp updated

**Acceptance Criteria**:
- [ ] Returns 200 status code
- [ ] Response contains updated opportunity
- [ ] Status is 'dismissed'
- [ ] updatedAt is more recent than before update

---

#### Scenario: PATCH /api/opportunities/:id/status rejects invalid status
**Given**: Any opportunity
**When**: `PATCH /api/opportunities/:id/status` with body `{ status: 'invalid' }`
**Then**: Returns 400 Bad Request with validation error

**Acceptance Criteria**:
- [ ] Returns 400 status code
- [ ] Error code = 'VALIDATION_ERROR'
- [ ] Error message indicates invalid status value

---

#### Scenario: POST /api/discovery/run triggers manual discovery
**Given**: 
- Valid accountId and discoveryType = 'replies'
- Platform adapter mocked to return 3 posts above threshold

**When**: `POST /api/discovery/run` with body `{ accountId, discoveryType: 'replies' }`
**Then**:
- Returns 201 Created
- Response contains array of 3 created opportunities
- Account discovery timestamps updated

**Acceptance Criteria**:
- [ ] Returns 201 status code
- [ ] Response contains array of Opportunity objects
- [ ] Opportunities are persisted to database
- [ ] Account.discovery.lastAt is updated

**Technical Details**: See [Design Doc Section 5.4](../designs/opportunity-discovery-design.md#54-post-apidiscoveryrun) for complete API specification.

---

#### Scenario: POST /api/discovery/run returns 404 for invalid account
**Given**: AccountId does not exist
**When**: `POST /api/discovery/run` with nonexistent accountId
**Then**: Returns 404 Not Found

**Acceptance Criteria**:
- [ ] Returns 404 status code
- [ ] Error code = 'NOT_FOUND'
- [ ] Error message indicates account not found

---

### 2.6 Integration Tests: Database Operations

**Test Setup**: Use test MongoDB instance, seed with fixtures

#### Scenario: Compound index enables efficient opportunity queries
**Given**: Opportunities collection with compound index on (accountId, status, scoring.total)
**When**: Query `{ accountId: X, status: 'pending' }` with sort `{ 'scoring.total': -1 }`
**Then**: Query uses index (verify with explain plan)

**Acceptance Criteria**:
- [ ] Query explain plan shows index usage
- [ ] No full collection scan
- [ ] Query execution time < 100ms (with 1000 test documents)

---

#### Scenario: Unique index prevents duplicate opportunities
**Given**: Existing opportunity with (accountId, postId)
**When**: Attempt to insert opportunity with same (accountId, postId)
**Then**: Unique constraint error thrown

**Acceptance Criteria**:
- [ ] MongoDB throws duplicate key error
- [ ] Error code = 11000
- [ ] Insert fails (opportunity not created)

---

#### Scenario: Author upsert creates or updates atomically
**Given**: No existing author for (platform, platformUserId)
**When**: Upsert author with these identifiers
**Then**: 
- Single author document created
- All fields populated

**Given**: Existing author for (platform, platformUserId)
**When**: Upsert with updated followerCount
**Then**:
- Existing document updated
- No duplicate created

**Acceptance Criteria**:
- [ ] Upsert creates document if not exists
- [ ] Upsert updates document if exists
- [ ] Operation is atomic
- [ ] Only one document exists after upsert

---

### 2.7 Integration Tests: Cron Scheduler

**Test Strategy**: Test manual trigger instead of real cron execution.

#### Scenario: Manual trigger executes discovery
**Given**: CronScheduler initialized, account with replies schedule enabled
**When**: `triggerNow(accountId, 'replies')` is called
**Then**:
- Calls discoveryService.discover(accountId, 'replies')
- Returns created opportunities

**Acceptance Criteria**:
- [ ] Calls discovery service with correct parameters
- [ ] Returns result from discovery service
- [ ] Updates account discovery status

---

#### Scenario: Initialize registers jobs for enabled schedules
**Given**:
- Account A with replies enabled, search disabled
- Account B with both enabled

**When**: `initialize()` is called
**Then**:
- Registers 1 job for Account A (replies only)
- Registers 2 jobs for Account B (replies + search)
- Jobs are stored in internal map

**Acceptance Criteria**:
- [ ] Loads active accounts from database
- [ ] Registers job for each enabled schedule
- [ ] Job key format: 'accountId:discoveryType'
- [ ] Disabled schedules are skipped

---

#### Scenario: Reload clears and re-registers jobs
**Given**: Scheduler running with 3 jobs, account config updated (1 schedule disabled)
**When**: `reload()` is called
**Then**:
- Stops all existing jobs
- Clears job map
- Re-initializes from database
- 2 jobs registered (1 disabled)

**Acceptance Criteria**:
- [ ] All jobs stopped before reload
- [ ] Job map cleared
- [ ] Reloads from database
- [ ] New job count reflects updated config

---

## 3. Edge Cases & Error Paths

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| No new posts found during discovery | Log info, update lastRunAt, return empty array | High |
| Platform adapter throws rate limit error | Update account.discovery.error, fail run, don't retry | High |
| Platform adapter throws auth error | Set account.status = 'error', log error, fail run | High |
| Post author no longer exists (deleted account) | Store last known author data, mark unavailable | Medium |
| Very old lastRunAt (> 7 days) | Cap lookback to 7 days max to prevent API overload | Medium |
| Duplicate post from multiple keywords | Deduplicate by postId, keep first occurrence | High |
| Invalid cron expression in schedule | Reject on account update with 400 Bad Request | High |
| Opportunity update on nonexistent ID | Return 404 Not Found | High |
| Discovery runs longer than cron interval | Skip overlapping run, log warning | Low |
| Zero engagement post (0 likes, 0 reposts) | Handle gracefully, calculate impact score with log10(1) | High |
| Negative follower count from API | Clamp to 0, log warning | Low |
| Empty keywords array in profile | Skip search discovery, log info | Medium |

---

## 4. Data Fixtures

### Test Account with Profile
```typescript
const testAccount: Account = {
  _id: new ObjectId('507f1f77bcf86cd799439011'),
  profileId: new ObjectId('507f1f77bcf86cd799439012'),
  platform: 'bluesky',
  handle: '@testuser.bsky.social',
  discovery: {
    schedules: [
      {
        type: 'replies',
        enabled: true,
        cronExpression: '*/15 * * * *',
        lastRunAt: new Date('2026-01-01T10:00:00Z')
      },
      {
        type: 'search',
        enabled: true,
        cronExpression: '0 */2 * * *',
        lastRunAt: new Date('2026-01-01T08:00:00Z')
      }
    ],
    lastAt: new Date('2026-01-01T10:00:00Z'),
    error: undefined
  },
  status: 'active',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T10:00:00Z')
};

const testProfile: Profile = {
  _id: new ObjectId('507f1f77bcf86cd799439012'),
  name: 'Test Professional Persona',
  voice: {
    tone: 'professional-friendly',
    style: 'Clear and helpful',
    examples: ['Example response 1', 'Example response 2']
  },
  discovery: {
    interests: ['ai', 'typescript'],
    keywords: ['machine learning', 'graphql'],
    communities: ['@tech.bsky.social']
  },
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  isActive: true
};
```

**Full Schema**: See [Design Doc Section 1.1](../designs/opportunity-discovery-design.md#11-opportunity-mongodb) for complete Opportunity data model.

### Test Opportunity
```typescript
const testOpportunity: Opportunity = {
  _id: new ObjectId('507f1f77bcf86cd799439013'),
  accountId: new ObjectId('507f1f77bcf86cd799439011'),
  platform: 'bluesky',
  postId: 'at://did:plc:abc123/app.bsky.feed.post/xyz789',
  postUrl: 'https://bsky.app/profile/author.bsky.social/post/xyz789',
  content: {
    text: 'Great post about TypeScript! What are your thoughts on...',
    createdAt: new Date('2026-01-01T11:45:00Z')
  },
  authorId: new ObjectId('507f1f77bcf86cd799439014'),
  engagement: {
    likes: 5,
    reposts: 2,
    replies: 1
  },
  scoring: {
    recency: 100,
    impact: 33,
    total: 73
  },
  discoveryType: 'search',
  status: 'pending',
  discoveredAt: new Date('2026-01-01T12:00:00Z'),
  expiresAt: new Date('2026-01-03T12:00:00Z'),  // 48 hours later
  updatedAt: new Date('2026-01-01T12:00:00Z')
};
```

### Test Author
```typescript
const testAuthor: Author = {
  _id: new ObjectId('507f1f77bcf86cd799439014'),
  platform: 'bluesky',
  platformUserId: 'did:plc:abc123',
  handle: '@author.bsky.social',
  displayName: 'Test Author',
  bio: 'Software engineer interested in AI and web development',
  followerCount: 1234,
  lastUpdatedAt: new Date('2026-01-01T12:00:00Z')
};
```

### Mock Platform Adapter Response
```typescript
const mockRawPost: RawPost = {
  id: 'at://did:plc:abc123/app.bsky.feed.post/xyz789',
  url: 'https://bsky.app/profile/author.bsky.social/post/xyz789',
  text: 'Great post about TypeScript!',
  createdAt: new Date('2026-01-01T11:45:00Z'),
  authorId: 'did:plc:abc123',
  likes: 5,
  reposts: 2,
  replies: 1
};

const mockRawAuthor: RawAuthor = {
  id: 'did:plc:abc123',
  handle: '@author.bsky.social',
  displayName: 'Test Author',
  bio: 'Software engineer',
  followerCount: 1234
};
```

---

## 5. Integration Dependencies

### External APIs
- **Bluesky AT Protocol**: Mock using `vitest.mock('@atproto/api')`
  - `BskyAgent.listNotifications()` → Return mock notifications
  - `BskyAgent.getPost()` → Return mock post
  - `BskyAgent.app.bsky.feed.searchPosts()` → Return mock search results
  - `BskyAgent.getProfile()` → Return mock profile

### Database
- **Collections**: `opportunities`, `authors`, `accounts`, `profiles`
- **Setup**: Use `setupDiscoveryTestDB()` helper
  - Creates test database
  - Seeds with test account + profile
  - Creates indexes
- **Teardown**: Drop test database after each test suite

### Node Cron
- **Mock Strategy**: Don't test actual cron execution
- **Test Alternative**: Use manual `triggerNow()` method
- **Validation**: Test cron expression parsing separately

---

## 6. Test Priorities

### Critical Path (Must Pass)
1. **Scoring algorithm** - Correct calculation for known inputs
2. **Discovery orchestration** - Fetch, score, filter, persist workflow
3. **Deduplication** - Prevent duplicate opportunities
4. **Threshold filtering** - Only persist opportunities above threshold
5. **Author upsert** - Create or update authors atomically
6. **GET /api/opportunities** - Fetch paginated, filtered, sorted opportunities
7. **PATCH /api/opportunities/:id/status** - Update opportunity status

### Important (Should Pass)
8. **BlueskyAdapter** - Transform Bluesky API responses correctly
9. **Error handling** - Rate limits, auth failures, network errors
10. **Opportunity expiration** - Time-based TTL logic
11. **POST /api/discovery/run** - Manual discovery trigger
12. **Database indexes** - Efficient queries via explain plans

### Nice to Have (May Defer)
13. **Cron scheduler** - Initialize, reload, register jobs
14. **Score explanation** - Human-readable score breakdown
15. **Edge cases** - Very old lastRunAt, deleted authors, etc.
16. **API error responses** - Consistent error format

---

## 7. Definition of Done

A test suite is complete when:
- [ ] All critical path scenarios covered (tests 1-7)
- [ ] All edge cases from Design Doc Section 8.2 tested
- [ ] Error paths tested (rate limits, auth failures, not found)
- [ ] Database operations tested (upsert, deduplication, expiration)
- [ ] API endpoints validated (request/response formats, status codes)
- [ ] Integration dependencies properly mocked (Bluesky API, cron)
- [ ] Tests fail before implementation (Red phase verified)
- [ ] All acceptance criteria checked off

---

## References

- **Why these decisions**: [ADR-008: Opportunity Discovery Architecture](../../../docs/architecture/decisions/008-opportunity-discovery-architecture.md)
- **Complete technical specs**: [Design Document](../designs/opportunity-discovery-design.md)
- **Data models**: [Design Doc Section 1](../designs/opportunity-discovery-design.md#1-data-models)
- **Service interfaces**: [Design Doc Section 2](../designs/opportunity-discovery-design.md#2-service-architecture)
- **API endpoints**: [Design Doc Section 5](../designs/opportunity-discovery-design.md#5-api-endpoints)
- **Scoring algorithm**: [Design Doc Section 2.2](../designs/opportunity-discovery-design.md#22-scoringservice)
- **Platform adapter**: [Design Doc Section 2.3](../designs/opportunity-discovery-design.md#23-platform-adapter-interface)

