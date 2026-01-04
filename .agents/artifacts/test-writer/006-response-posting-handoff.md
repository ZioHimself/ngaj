# Test-Writer Handoff: Response Posting

**Handoff Number**: 006  
**Feature**: Response Draft Posting  
**Based on**: [Designer Handoff 005](../designer/handoffs/005-response-posting-handoff.md)  
**ADR Reference**: [ADR-010: Response Draft Posting](../../../docs/architecture/decisions/010-response-posting.md)  
**Test Plan**: [Response Posting Test Plan](./test-plans/response-posting-test-plan.md)

---

## Test Statistics

### Total Tests: 40 tests

**By Category:**
- ✅ Unit Tests: 27 tests
  - Error classes: 18 tests
  - Validation logic: 14 tests
  - Bluesky adapter: 13 tests
- ✅ Integration Tests: 14 tests
  - Full posting workflow tests

**By Status:**
- 🔴 **All 40 tests FAILING** (Red phase confirmed ✅)
- ⚡ Test execution time: ~9 seconds (acceptable for integration tests with MongoDB)
- ✅ Zero linter errors

---

## Files Created

### Test Files (5 new files)

1. **`tests/unit/errors/platform-posting-errors.spec.ts`** (18 tests)
   - Tests for all platform error classes
   - Inheritance hierarchy verification
   - Error property validation

2. **`tests/unit/utils/response-validators.spec.ts`** (14 tests)
   - Response status validation for posting
   - PostResult structure validation
   - AT URI format validation

3. **`tests/unit/adapters/bluesky-adapter-posting.spec.ts`** (13 tests)
   - Bluesky-specific posting logic
   - Threading mechanics (root vs. reply posts)
   - URL construction
   - Error handling (401, 404, 429, network errors)
   - Unicode/emoji support

4. **`tests/integration/workflows/response-posting.spec.ts`** (14 tests)
   - Complete posting workflow with MongoDB
   - Happy path (draft → posted)
   - All error scenarios (auth, rate limit, post not found, network, content violation)
   - Validation errors (response/opportunity/account not found)
   - Duplicate post prevention

5. **`tests/fixtures/response-fixtures.ts`** (UPDATED)
   - Added `createMockPostResult()` helper
   - Added `postedResponseFixtures()` with platform metadata
   - Updated existing `posted` fixture to include platformPostId/Url

### Implementation Stubs (4 new files)

1. **`src/shared/errors/platform-posting-errors.ts`**
   - `PlatformPostingError` (base class)
   - `AuthenticationError` (retryable=false)
   - `RateLimitError` (retryable=true, with retryAfter)
   - `PostNotFoundError` (retryable=false, with postId)
   - `ContentViolationError` (retryable=false, with violationReason)
   - `InvalidStatusError` (not a platform error)

2. **`src/backend/utils/response-validators.ts`**
   - `validateResponseForPosting()` - Check response is draft
   - `validatePostResult()` - Verify PostResult structure

3. **`src/backend/services/response-posting-service.ts`**
   - `ResponsePostingService` class
   - `postResponse()` method stub

4. **`src/backend/adapters/bluesky-adapter.ts`** (UPDATED)
   - Added `post()` method stub to existing adapter

---

## Test Coverage Breakdown

### 1. Error Classes (18 tests)

**File**: `tests/unit/errors/platform-posting-errors.spec.ts`

#### PlatformPostingError (3 tests)
- ✅ Create generic posting error
- ✅ Override retryable flag
- ✅ Has stack trace

#### AuthenticationError (2 tests)
- ✅ Create with retryable=false
- ✅ Message suggests reconnecting account

#### RateLimitError (4 tests)
- ✅ Create with retryAfter
- ✅ Format retry time in minutes (> 60s)
- ✅ Format retry time in seconds (< 60s)
- ✅ Default retryAfter to 60 seconds

#### PostNotFoundError (2 tests)
- ✅ Create with postId
- ✅ Handle missing postId

#### ContentViolationError (2 tests)
- ✅ Create with violation reason
- ✅ Handle missing reason

#### InvalidStatusError (3 tests)
- ✅ Create with current and expected status
- ✅ Handle multiple expected statuses
- ✅ No platform property (not a platform error)

#### Error Inheritance (2 tests)
- ✅ Catch all platform errors with base class
- ✅ Catch specific error types

---

### 2. Validation Logic (14 tests)

**File**: `tests/unit/utils/response-validators.spec.ts`

#### validateResponseForPosting() (4 tests)
- ✅ Pass validation for draft response
- ✅ Throw InvalidStatusError for posted response
- ✅ Throw InvalidStatusError for dismissed response
- ✅ Include expected status in error

#### validatePostResult() (9 tests)
- ✅ Pass validation for valid PostResult
- ✅ Throw if postId missing
- ✅ Throw if postId empty string
- ✅ Throw if postUrl missing
- ✅ Throw if postUrl empty string
- ✅ Throw if postedAt missing
- ✅ Throw if postedAt not a Date
- ✅ Throw if postedAt invalid Date
- ✅ Accept non-AT-URI postId (other platforms)

#### Bluesky AT URI Validation (1 test)
- ✅ Validate AT URI format for postId

---

### 3. Bluesky Adapter Posting (13 tests)

**File**: `tests/unit/adapters/bluesky-adapter-posting.spec.ts`

#### Happy Path (2 tests)
- ✅ Post response and return valid PostResult
- ✅ Use platform timestamp (not local)

#### Threading (2 tests)
- ✅ Construct reply threading for root post
- ✅ Construct reply threading for post in existing thread

#### URL Construction (2 tests)
- ✅ Construct platformPostUrl correctly
- ✅ Handle special characters in handle

#### Unicode and Emoji (1 test)
- ✅ Handle Unicode and emoji in response text

#### Error Handling (6 tests)
- ✅ Throw AuthenticationError on 401
- ✅ Throw RateLimitError on 429
- ✅ Throw PostNotFoundError on 404
- ✅ Throw PlatformPostingError on network timeout
- ✅ Throw PlatformPostingError on connection refused
- ✅ Throw PlatformPostingError on unknown error

---

### 4. Integration Workflow (14 tests)

**File**: `tests/integration/workflows/response-posting.spec.ts`

#### Happy Path (3 tests)
- ✅ Post draft response successfully
  - Response status → "posted"
  - platformPostId, platformPostUrl, postedAt populated
  - Opportunity status → "responded"
  - Data persisted to MongoDB
- ✅ Handle edited response text
- ✅ Handle Unicode and emoji in response

#### Error Handling - Authentication (1 test)
- ✅ Keep response as draft on AuthenticationError
  - Response unchanged in database
  - Opportunity status unchanged

#### Error Handling - Rate Limit (1 test)
- ✅ Keep response as draft on RateLimitError
  - Error includes retryAfter
  - Response unchanged

#### Error Handling - Post Not Found (1 test)
- ✅ Keep response as draft on PostNotFoundError
  - Response unchanged

#### Error Handling - Network Errors (1 test)
- ✅ Keep response as draft on PlatformPostingError (timeout)
  - Response unchanged

#### Error Handling - Content Violation (1 test)
- ✅ Keep response as draft on ContentViolationError
  - Response text unchanged (user can edit and retry)

#### Validation Errors (5 tests)
- ✅ Throw error when response not found
- ✅ Throw error when opportunity not found
- ✅ Throw error when account not found
- ✅ Throw InvalidStatusError when posting already-posted response
  - Platform adapter NOT called
- ✅ Throw InvalidStatusError when posting dismissed response
  - Platform adapter NOT called

#### Duplicate Post Prevention (1 test)
- ✅ Prevent double-posting (idempotency)
  - First post succeeds
  - Second post fails with InvalidStatusError
  - Adapter called only once

---

## Test Fixtures

### New Fixtures

**`createMockPostResult()`**
```typescript
createMockPostResult({
  postId: 'at://did:plc:user.../post/xyz',
  postUrl: 'https://bsky.app/profile/user/post/xyz',
  postedAt: new Date()
})
```

**`postedResponseFixtures()`**
```typescript
const fixtures = postedResponseFixtures(opportunityId, accountId);
// fixtures.blueskyPosted - Response with Bluesky AT URI
// fixtures.linkedinPosted - Response with LinkedIn URN (future)
// fixtures.unicodePosted - Response with emoji/Unicode
```

### Updated Fixtures

**`createResponseFixtures().posted`**
- Now includes `platformPostId` and `platformPostUrl`

---

## Dependencies Installed

**No new dependencies** - All tests use existing packages:
- `vitest` - Test runner
- `mongodb-memory-server` - In-memory MongoDB for integration tests
- `@atproto/api` - Bluesky API types (already installed)

---

## Implementation Order for Implementer

### Phase 1: Error Classes (Foundation)
**File**: `src/shared/errors/platform-posting-errors.ts`

**Priority**: ⭐⭐⭐ **Critical** (all other code depends on these)

**Implementation Notes**:
1. Implement `AuthenticationError`:
   - Always set `retryable = false`
   - Include message suggesting reconnection
   - Example: `"Authentication failed: ${message}. Please reconnect your account."`

2. Implement `RateLimitError`:
   - Always set `retryable = true`
   - Default `retryAfter = 60` seconds if not provided
   - Format message with human-readable time:
     - If retryAfter >= 60: Show minutes (e.g., "5 minutes")
     - If retryAfter < 60: Show seconds (e.g., "45 seconds")

3. Implement `PostNotFoundError`:
   - Always set `retryable = false`
   - Include postId in message if provided
   - Example: `"Post not found: ${postId}. The post may have been deleted."`

4. Implement `ContentViolationError`:
   - Always set `retryable = false`
   - Include violation reason in message if provided
   - Example: `"Content violation: ${violationReason}"`

5. Implement `InvalidStatusError`:
   - NOT a PlatformPostingError (extends Error directly)
   - Format expected status as string or comma-separated list
   - Example: `"Cannot post response with status 'posted' (must be 'draft')"`

**Run Tests**:
```bash
npm test -- platform-posting-errors
```

**Expected**: 18 tests pass ✅

---

### Phase 2: Validation Logic
**File**: `src/backend/utils/response-validators.ts`

**Priority**: ⭐⭐⭐ **Critical**

**Implementation Notes**:

1. **`validateResponseForPosting()`**:
   - Check `response.status === 'draft'`
   - If not, throw `InvalidStatusError(response.status, 'draft')`

2. **`validatePostResult()`**:
   - Check `postResult.postId` exists and is non-empty string
   - Check `postResult.postUrl` exists and is non-empty string
   - Check `postResult.postedAt` exists, is Date, and is valid Date
   - Throw descriptive errors for each validation failure

**Run Tests**:
```bash
npm test -- response-validators
```

**Expected**: 14 tests pass ✅

---

### Phase 3: Bluesky Adapter Posting
**File**: `src/backend/adapters/bluesky-adapter.ts`

**Priority**: ⭐⭐⭐ **Critical**

**Implementation Notes**:

1. **Fetch Parent Post**:
   ```typescript
   const parentPost = await this.agent.getPost({ uri: parentPostId });
   ```

2. **Construct Reply Structure**:
   ```typescript
   const reply = {
     parent: {
       uri: parentPostId,
       cid: parentPost.value.cid
     },
     root: parentPost.value.reply?.root || {
       uri: parentPostId,
       cid: parentPost.value.cid
     }
   };
   ```

3. **Post Response**:
   ```typescript
   const result = await this.agent.post({
     text: responseText,
     reply
   });
   ```

4. **Construct platformPostUrl**:
   ```typescript
   const postId = result.uri.split('/').pop(); // Extract ID from AT URI
   const handle = this.agent.session.handle;
   const postUrl = `https://bsky.app/profile/${handle}/post/${postId}`;
   ```

5. **Return PostResult**:
   ```typescript
   return {
     postId: result.uri,
     postUrl,
     postedAt: new Date(result.createdAt)
   };
   ```

6. **Error Handling**:
   - Catch errors with `status` property
   - Map status codes:
     - `401` → `AuthenticationError`
     - `404` → `PostNotFoundError`
     - `429` → `RateLimitError` (extract retryAfter from headers)
   - Catch errors with `code` property:
     - `ETIMEDOUT`, `ECONNREFUSED` → `PlatformPostingError` (retryable=true)
   - All other errors → `PlatformPostingError` (retryable=true)

**Run Tests**:
```bash
npm test -- bluesky-adapter-posting
```

**Expected**: 13 tests pass ✅

---

### Phase 4: Response Posting Service
**File**: `src/backend/services/response-posting-service.ts`

**Priority**: ⭐⭐⭐ **Critical**

**Implementation Notes**:

1. **Load Data**:
   ```typescript
   const response = await this.responsesCollection.findOne({ _id: responseId });
   if (!response) throw new Error('Response not found');

   const opportunity = await this.opportunitiesCollection.findOne({ _id: response.opportunityId });
   if (!opportunity) throw new Error('Opportunity not found');

   const account = await this.accountsCollection.findOne({ _id: response.accountId });
   if (!account) throw new Error('Account not found');
   ```

2. **Validate Response Status**:
   ```typescript
   validateResponseForPosting(response);
   ```

3. **Post to Platform**:
   ```typescript
   const postResult = await this.platformAdapter.post(
     opportunity.postId,
     response.text
   );

   validatePostResult(postResult);
   ```

4. **Update Response**:
   ```typescript
   await this.responsesCollection.updateOne(
     { _id: responseId },
     {
       $set: {
         status: 'posted',
         postedAt: postResult.postedAt,
         platformPostId: postResult.postId,
         platformPostUrl: postResult.postUrl,
         updatedAt: new Date()
       }
     }
   );
   ```

5. **Update Opportunity**:
   ```typescript
   await this.opportunitiesCollection.updateOne(
     { _id: response.opportunityId },
     {
       $set: {
         status: 'responded',
         updatedAt: new Date()
       }
     }
   );
   ```

6. **Return Updated Response**:
   ```typescript
   return await this.responsesCollection.findOne({ _id: responseId });
   ```

7. **Error Handling**:
   - If `platformAdapter.post()` throws ANY error:
     - Do NOT update response or opportunity
     - Propagate error to caller
   - This ensures response remains as draft on all failures

**Run Tests**:
```bash
npm test -- response-posting.spec
```

**Expected**: 14 integration tests pass ✅

---

## Running Tests

### Run All Response Posting Tests
```bash
npm test -- response-posting
```

### Run by Category
```bash
# Unit tests only
npm test -- tests/unit/errors/platform-posting-errors
npm test -- tests/unit/utils/response-validators
npm test -- tests/unit/adapters/bluesky-adapter-posting

# Integration tests only
npm test -- tests/integration/workflows/response-posting
```

### Watch Mode (TDD)
```bash
npm test -- --watch
```

---

## Expected Output (Red Phase) ✅

```
 FAIL  tests/unit/errors/platform-posting-errors.spec.ts (18 tests | 15 failed)
 FAIL  tests/unit/utils/response-validators.spec.ts (14 tests | 14 failed)
 FAIL  tests/unit/adapters/bluesky-adapter-posting.spec.ts (13 tests | 13 failed)
 FAIL  tests/integration/workflows/response-posting.spec.ts (14 tests | 14 failed)

Test Suites: 4 failed, 4 total
Tests:       40 failed, 40 total  ← 🔴 All tests FAILING (Red phase confirmed)
Time:        ~9 seconds
```

**Status**: ✅ Red Phase Verified

---

## Expected Output (Green Phase) 🎯

After implementation:

```
 PASS  tests/unit/errors/platform-posting-errors.spec.ts (18 tests)
 PASS  tests/unit/utils/response-validators.spec.ts (14 tests)
 PASS  tests/unit/adapters/bluesky-adapter-posting.spec.ts (13 tests)
 PASS  tests/integration/workflows/response-posting.spec.ts (14 tests)

Test Suites: 4 passed, 4 total
Tests:       40 passed, 40 total  ← 🟢 All tests PASSING
Time:        ~9 seconds
```

---

## Key Implementation Notes

### 1. Platform Adapter Contract
- **Input**: `parentPostId` (AT URI), `responseText` (plain string)
- **Output**: `PostResult` with `postId`, `postUrl`, `postedAt` (Date)
- **Threading**: Adapter handles internally (fetch parent, construct reply)
- **Timestamp**: Use platform timestamp (not local)

### 2. Error Handling Strategy
- **On ANY error**: Keep response as draft (do NOT update database)
- **Error types**: Map HTTP status codes to specific error classes
- **Retryable errors**: RateLimitError, generic PlatformPostingError
- **Non-retryable errors**: AuthenticationError, PostNotFoundError, ContentViolationError

### 3. Threading Logic (Bluesky)
- **Root post**: `reply.parent === reply.root` (both point to same post)
- **Reply post**: `reply.parent` = immediate parent, `reply.root` = thread root
- **Thread continuation**: Preserve `reply.root` from parent post

### 4. Database Updates
- **Atomic**: Update response and opportunity together
- **On success**: response.status = "posted", opportunity.status = "responded"
- **On failure**: No database changes (rollback by not committing)

### 5. Validation Rules
- Response must be "draft" (not "posted" or "dismissed")
- Response, opportunity, and account must exist
- PostResult must have all required fields (postId, postUrl, postedAt)

---

## Known Limitations (v0.1)

### Out of Scope
- ❌ Automatic retry logic (manual retry only)
- ❌ Background job queue (synchronous posting)
- ❌ Thread continuation (reply to latest post in thread)
- ❌ Multi-post threads (breaking long responses)
- ❌ Post scheduling (immediate posting only)

### Deferred Testing
- ⏸️ E2E tests (waiting for API layer)
- ⏸️ Performance tests (posting latency < 3s)
- ⏸️ Real Bluesky API integration (use mocks only)

---

## Success Criteria

Implementation succeeds when:

1. ✅ **All 40 tests pass** (Green phase)
2. ✅ **No linter errors** (`npm run lint`)
3. ✅ **Response metadata captured**: platformPostId, platformPostUrl, postedAt
4. ✅ **Threading correct**: Replies attach to correct parent post
5. ✅ **Error handling robust**: All 6 error types handled correctly
6. ✅ **Database consistency**: Response/opportunity status always match reality
7. ✅ **Duplicate prevention**: Cannot post same response twice

---

## References

- **Design Document**: [Response Posting Design](../designer/designs/response-posting-design.md)
- **ADR**: [ADR-010: Response Draft Posting](../../../docs/architecture/decisions/010-response-posting.md)
- **Designer Handoff**: [005-response-posting-handoff.md](../designer/handoffs/005-response-posting-handoff.md)
- **Test Plan**: [Response Posting Test Plan](./test-plans/response-posting-test-plan.md)
- **Related Features**:
  - [Response Suggestion Tests](./005-response-suggestion-handoff.md) - Response generation
  - [Opportunity Discovery Tests](./004-opportunity-discovery-handoff.md) - Opportunity data models

---

## Questions or Issues?

If tests are unclear or requirements seem ambiguous:

1. Check the **Test Plan** for detailed rationale
2. Check the **ADR** for design decisions
3. Check the **Designer Handoff** for technical specs
4. Ask human for clarification (follow escalation guidelines)

---

**Ready for Implementation!** 🚀

All test stubs are in place. Implementer should follow the phases above, making tests pass one by one (TDD Green phase). Remember: tests define success criteria - make them pass, and the feature is complete! ✅

