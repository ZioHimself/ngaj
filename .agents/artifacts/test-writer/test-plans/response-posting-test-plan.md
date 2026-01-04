# Test Plan: Response Posting

**Handoff Number**: 005  
**Feature**: Response Draft Posting  
**Based on**: [Designer Handoff 005](../../designer/handoffs/005-response-posting-handoff.md)  
**ADR Reference**: [ADR-010: Response Draft Posting](../../../../docs/architecture/decisions/010-response-posting.md)

---

## Test Coverage Summary

This test plan covers the Response Posting feature, which enables users to post AI-generated response drafts to social media platforms.

**Total Test Count**: ~40 tests across 5 test files
- **Unit Tests**: 28 tests (error classes, validation, adapter logic)
- **Integration Tests**: 10 tests (service + adapter + database)
- **E2E Tests**: 2 tests (deferred to future - API layer not in scope for v0.1)

**Coverage Strategy**: Focus on critical path (happy path posting), error handling (6 error types), and data persistence.

---

## Test Categories

### 1. Unit Tests (28 tests)

#### 1.1 Platform Error Classes (`tests/unit/errors/platform-posting-errors.spec.ts`)
- **Purpose**: Verify custom error types for platform posting failures
- **Test Count**: 7 tests
- **Coverage**:
  - ✅ `PlatformPostingError` construction (generic posting failure)
  - ✅ `AuthenticationError` construction (retryable=false)
  - ✅ `RateLimitError` construction with retryAfter
  - ✅ `PostNotFoundError` construction (parent post deleted)
  - ✅ `ContentViolationError` construction
  - ✅ Error inheritance from base Error
  - ✅ Error message formatting

**Why Unit Tests**: Error classes are pure logic with no external dependencies.

#### 1.2 Bluesky Adapter Posting (`tests/unit/adapters/bluesky-adapter-posting.spec.ts`)
- **Purpose**: Test Bluesky-specific posting logic and threading
- **Test Count**: 12 tests
- **Coverage**:
  - ✅ `post()` returns valid PostResult with AT URI
  - ✅ `post()` constructs reply threading (parent + root)
  - ✅ `post()` handles root post (no existing thread)
  - ✅ `post()` handles reply post (existing thread)
  - ✅ `post()` constructs platformPostUrl correctly
  - ✅ `post()` handles Unicode/emoji in response text
  - ✅ `post()` throws AuthenticationError on 401
  - ✅ `post()` throws RateLimitError on 429
  - ✅ `post()` throws PostNotFoundError on 404
  - ✅ `post()` throws PlatformPostingError on network timeout
  - ✅ `post()` uses platform timestamp (not local)
  - ✅ `post()` handles special characters in handle

**Why Unit Tests**: Adapter logic is isolated with mocked Bluesky API client.

#### 1.3 Response Status Validation (`tests/unit/utils/response-validators.spec.ts`)
- **Purpose**: Test validation logic for posting eligibility
- **Test Count**: 5 tests
- **Coverage**:
  - ✅ `validateForPosting()` passes for draft responses
  - ✅ `validateForPosting()` throws InvalidStatusError for posted
  - ✅ `validateForPosting()` throws InvalidStatusError for dismissed
  - ✅ PostResult structure validation
  - ✅ PostResult AT URI format validation

**Why Unit Tests**: Pure validation logic with no side effects.

#### 1.4 Response Service Posting Logic (`tests/unit/services/response-posting-service.spec.ts`)
- **Purpose**: Test service orchestration with mocked dependencies
- **Test Count**: 4 tests
- **Coverage**:
  - ✅ Service loads correct dependencies (response, opportunity, account)
  - ✅ Service calls adapter.post() with correct parameters
  - ✅ Service updates response with platform metadata
  - ✅ Service updates opportunity status to "responded"

**Why Unit Tests**: Focus on service logic without real database or adapter calls.

---

### 2. Integration Tests (10 tests)

#### 2.1 Response Posting Workflow (`tests/integration/workflows/response-posting.spec.ts`)
- **Purpose**: Test complete posting flow with database and mocked adapter
- **Test Count**: 10 tests
- **Coverage**:
  - ✅ **Happy Path**: Draft response posts successfully
    - Response status → "posted"
    - platformPostId populated (AT URI)
    - platformPostUrl populated (Bluesky URL)
    - postedAt populated (platform timestamp)
    - Opportunity status → "responded"
  - ✅ AuthenticationError: Response remains draft
  - ✅ RateLimitError: Response remains draft, shows retryAfter
  - ✅ PostNotFoundError: Response remains draft
  - ✅ PlatformPostingError: Response remains draft
  - ✅ ContentViolationError: Response remains draft
  - ✅ Response not found error
  - ✅ Opportunity not found error
  - ✅ Account not found error
  - ✅ Duplicate post prevention (double-click protection)

**Why Integration Tests**: Need real MongoDB operations + mocked platform adapter to verify data persistence.

---

### 3. E2E Tests (Deferred)

**Rationale**: E2E tests require API layer implementation, which is out of scope for v0.1 backend focus. Deferred to future when REST API is built.

**Planned Coverage (Future)**:
- POST /api/responses/:id/post → 200 (success)
- POST /api/responses/:id/post → 401 (auth error)
- POST /api/responses/:id/post → 404 (not found)
- POST /api/responses/:id/post → 409 (conflict - already posted)
- POST /api/responses/:id/post → 429 (rate limit)

---

## Mock Strategy

### What to Mock

1. **Bluesky API (`BskyAgent`)**: Mock agent.post() and agent.getPost()
   - Return synthetic PostResult with AT URIs
   - Simulate error responses (401, 404, 429, 500)
   - No real network calls to Bluesky

2. **Time**: Use `vi.useFakeTimers()` for deterministic timestamps
   - Control `postedAt` timestamps
   - Test time-sensitive logic

### What NOT to Mock

1. **MongoDB**: Use in-memory MongoDB for integration tests
   - Real database operations ensure persistence correctness
   - Verify indexes and constraints

2. **Error Classes**: Use real error instances
   - Verify error inheritance and properties

3. **Validation Logic**: Use real validation functions
   - Ensure validation rules are correct

---

## Test Organization

```
tests/
├── unit/
│   ├── errors/
│   │   └── platform-posting-errors.spec.ts       # Error class tests (NEW)
│   ├── adapters/
│   │   └── bluesky-adapter-posting.spec.ts        # Bluesky post() tests (NEW)
│   ├── utils/
│   │   └── response-validators.spec.ts            # Validation tests (NEW)
│   └── services/
│       └── response-posting-service.spec.ts       # Service orchestration (NEW)
├── integration/
│   └── workflows/
│       └── response-posting.spec.ts               # Full workflow tests (NEW)
└── fixtures/
    ├── response-fixtures.ts                       # UPDATE: Add posted responses with platformPostId/Url
    ├── account-fixtures.ts                        # EXISTING: Reuse for credentials
    └── opportunity-fixtures.ts                    # EXISTING: Reuse for parent posts
```

---

## Test Priorities

### Critical Path (Must Pass)
1. ✅ Happy path posting (integration test)
2. ✅ Threading correctness (Bluesky adapter)
3. ✅ Platform metadata capture (platformPostId, platformPostUrl, postedAt)
4. ✅ Opportunity status update

### Error Handling (Must Pass)
1. ✅ AuthenticationError (non-retryable)
2. ✅ RateLimitError (retryable with retryAfter)
3. ✅ PostNotFoundError (non-retryable)
4. ✅ Response remains draft on all errors

### Edge Cases (Should Pass)
1. ✅ Unicode/emoji in response text
2. ✅ Special characters in handle
3. ✅ Duplicate post prevention
4. ✅ Response not found
5. ✅ Opportunity not found

---

## Known Limitations

### Out of Scope (v0.1)
- ❌ Automatic retry logic (manual retry only)
- ❌ Background job queue (synchronous posting only)
- ❌ Thread continuation (reply to latest post in thread)
- ❌ Multi-post threads (breaking long responses)
- ❌ Post scheduling (immediate posting only)
- ❌ API endpoint tests (no REST API yet)

### Deferred Testing
- ⏸️ E2E tests (waiting for API layer)
- ⏸️ Performance tests (posting latency < 3s)
- ⏸️ Rate limit backoff strategy (no auto-retry in v0.1)

---

## Test Data Requirements

### Responses
- **Draft**: Various text lengths (short, medium, at limit)
- **Posted**: Include platformPostId, platformPostUrl (for double-post prevention)
- **Dismissed**: Should not be postable
- **Unicode**: Emoji and international characters

### Opportunities
- **Root posts**: No parent (reply.root = reply.parent)
- **Reply posts**: Part of existing thread (reply.root ≠ reply.parent)
- **Deleted posts**: For PostNotFoundError testing

### Accounts
- **Valid credentials**: Active Bluesky account
- **Expired credentials**: For AuthenticationError testing
- **Rate-limited**: For RateLimitError testing (mocked)

---

## Implementation Order

### Phase 1: Error Classes (Foundation)
1. Create `src/shared/errors/platform-posting-errors.ts`
2. Write `tests/unit/errors/platform-posting-errors.spec.ts`
3. Verify: All 7 tests fail with "Not implemented"

### Phase 2: Validation Logic
1. Create `src/backend/utils/response-validators.ts`
2. Write `tests/unit/utils/response-validators.spec.ts`
3. Verify: All 5 tests fail

### Phase 3: Bluesky Adapter
1. Add `post()` method stub to `src/backend/adapters/bluesky-adapter.ts`
2. Write `tests/unit/adapters/bluesky-adapter-posting.spec.ts`
3. Verify: All 12 tests fail

### Phase 4: Service Orchestration
1. Update `src/backend/services/response-suggestion-service.ts` (or create new service)
2. Write `tests/unit/services/response-posting-service.spec.ts`
3. Verify: All 4 tests fail

### Phase 5: Integration Tests
1. Update `tests/fixtures/response-fixtures.ts` (add platformPostId/Url)
2. Write `tests/integration/workflows/response-posting.spec.ts`
3. Verify: All 10 tests fail

### Phase 6: Verify Red Phase
1. Run full test suite: `npm test`
2. Confirm: All ~40 new tests fail
3. Confirm: No false positives (tests passing without implementation)
4. Run linter: `npm run lint` (no errors in test code)

---

## Success Criteria

A test session succeeds when:

1. ✅ **Red Phase Verified**: All 40 tests fail with clear error messages
2. ✅ **No False Positives**: Tests fail due to missing implementation, not test bugs
3. ✅ **Comprehensive Coverage**: All scenarios from Designer handoff are tested
4. ✅ **Well-Organized**: Tests follow project structure conventions
5. ✅ **Proper Mocks**: Bluesky API mocked, MongoDB in-memory for integration
6. ✅ **Fast Execution**: Full suite runs in < 5 seconds
7. ✅ **Lint-Clean**: No ESLint errors in test files
8. ✅ **Clear Handoff**: Implementer knows exactly what to build

---

## Running Tests

### Run All Response Posting Tests
```bash
npm test -- response-posting
```

### Run Unit Tests Only
```bash
npm test -- tests/unit
```

### Run Integration Tests Only
```bash
npm test -- tests/integration/workflows/response-posting
```

### Run Specific Test File
```bash
npm test -- tests/unit/adapters/bluesky-adapter-posting.spec.ts
```

### Watch Mode (TDD)
```bash
npm test -- --watch
```

---

## Expected Output (Red Phase)

```
 FAIL  tests/unit/errors/platform-posting-errors.spec.ts
   PlatformPostingErrors
     ✗ should create PlatformPostingError (2 ms)
         ReferenceError: PlatformPostingError is not defined
     ✗ should create AuthenticationError (1 ms)
         ReferenceError: AuthenticationError is not defined
     ...

 FAIL  tests/unit/adapters/bluesky-adapter-posting.spec.ts
   BlueskyAdapter
     post()
       ✗ should post response and return PostResult (3 ms)
           Error: Not implemented
       ✗ should construct reply threading correctly (2 ms)
           Error: Not implemented
       ...

 FAIL  tests/integration/workflows/response-posting.spec.ts
   Response Posting Workflow
     ✗ should post draft response successfully (5 ms)
         Error: Not implemented
     ...

Test Suites: 5 failed, 5 total
Tests:       40 failed, 40 total
Time:        2.145 s
```

---

## Key Implementation Notes for Implementer

### 1. Platform Adapter Contract
- `post(parentPostId, responseText)` must return `PostResult`
- Adapter handles threading internally (fetch parent, construct reply)
- Use platform timestamp (not local) for `postedAt`

### 2. Error Handling
- All errors extend base `Error`
- Include `retryable` boolean property
- `RateLimitError` includes `retryAfter` (seconds)
- Preserve response as draft on all errors

### 3. Threading Logic (Bluesky)
- Fetch parent post to get `reply.root` (if exists)
- If parent has no `reply.root`, parent IS the root
- Set `reply.parent` = parent URI
- Set `reply.root` = parent's root URI (or parent URI if no root)

### 4. Database Updates
- **Atomic**: Update response and opportunity in transaction (or handle rollback)
- **Fields**: platformPostId, platformPostUrl, postedAt, status, updatedAt
- **Opportunity**: status = "responded", updatedAt

### 5. Validation
- Response must be "draft" (not "posted" or "dismissed")
- Response, opportunity, and account must exist
- Platform credentials must be valid

---

## References

- **Design Document**: [Response Posting Design](../../designer/designs/response-posting-design.md)
- **ADR**: [ADR-010: Response Draft Posting](../../../../docs/architecture/decisions/010-response-posting.md)
- **Designer Handoff**: [005-response-posting-handoff.md](../../designer/handoffs/005-response-posting-handoff.md)
- **Related Features**:
  - [Response Suggestion Handoff](./response-suggestion-test-plan.md) - Response generation
  - [Opportunity Discovery Handoff](./opportunity-discovery-test-plan.md) - Opportunity data models

---

**Ready for Implementation!** 🚀

All test stubs and implementation skeletons are in place. Implementer should follow the phases above, making tests pass one by one (TDD Green phase).

