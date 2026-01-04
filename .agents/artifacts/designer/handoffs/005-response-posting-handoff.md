# Test-Writer Handoff: Response Draft Posting

🔗 **Design Rationale**: [ADR-010: Response Draft Posting](../../../docs/architecture/decisions/010-response-posting.md)  
🔗 **Technical Specs**: [Response Posting Design Document](../designs/response-posting-design.md)

---

## Overview

The Response Draft Posting feature enables users to post AI-generated response drafts to social media platforms, completing the engagement loop.

**Critical Requirements:**
- ✅ Post response as threaded reply to opportunity post
- ✅ Capture platform metadata (post ID, URL, timestamp)
- ✅ Handle posting failures gracefully (keep as draft, show error)
- ✅ Update opportunity status to "responded" on success
- ✅ Support manual retry on failure

---

## Test Categories

### 1. Unit Tests
Focus: Individual functions, error mapping, validation logic

### 2. Integration Tests
Focus: Service interactions (MongoDB, Platform Adapters)

### 3. End-to-End Tests
Focus: Complete user workflows, API contracts

### 4. Error Handling Tests
Focus: All failure modes, retry mechanics

### 5. Threading Tests
Focus: Verify replies attach correctly to parent posts

---

## 1. Unit Test Scenarios

### 1.1 Response Status Validation

**Test**: Validate response is draft before posting
- **Given**: Response with status "draft"
- **When**: Validate for posting
- **Then**: Validation passes

**Test**: Reject posting of already-posted response
- **Given**: Response with status "posted"
- **When**: Attempt to validate for posting
- **Then**: Throws `InvalidStatusError` with message "Cannot post response with status 'posted' (must be 'draft')"

**Test**: Reject posting of dismissed response
- **Given**: Response with status "dismissed"
- **When**: Attempt to validate for posting
- **Then**: Throws `InvalidStatusError`

### 1.2 Error Type Construction

**Test**: Create AuthenticationError
- **Given**: Platform "bluesky" and message "Invalid token"
- **When**: Construct `AuthenticationError`
- **Then**:
  - `error.name` = "AuthenticationError"
  - `error.platform` = "bluesky"
  - `error.retryable` = false
  - `error.message` contains "Invalid token"

**Test**: Create RateLimitError with retryAfter
- **Given**: Platform "bluesky", retryAfter 300 seconds
- **When**: Construct `RateLimitError`
- **Then**:
  - `error.name` = "RateLimitError"
  - `error.retryAfter` = 300
  - `error.retryable` = true

**Test**: Create PostNotFoundError
- **Given**: Platform "bluesky", postId "at://did:plc:.../post/123"
- **When**: Construct `PostNotFoundError`
- **Then**:
  - `error.name` = "PostNotFoundError"
  - `error.retryable` = false
  - `error.message` contains postId

### 1.3 PostResult Validation

**Test**: Valid PostResult structure
- **Given**: PostResult with all required fields
- **When**: Validate structure
- **Then**:
  - Has `postId` (string)
  - Has `postUrl` (string)
  - Has `postedAt` (Date)

**Test**: PostResult with Bluesky AT URI
- **Given**: PostResult from Bluesky adapter
- **When**: Check postId format
- **Then**: postId starts with "at://"

---

## 2. Integration Test Scenarios

### 2.1 Successful Posting Flow

**Test**: Post draft response to Bluesky
- **Given**:
  - Response with status "draft", text "Great point! I agree."
  - Opportunity with postId "at://did:plc:abc.../post/123", postUrl "https://bsky.app/..."
  - Account with valid Bluesky credentials
- **When**: Call `responseService.postResponse(responseId)`
- **Then**:
  - Platform adapter `post()` called with (opportunity.postId, response.text)
  - Response updated in MongoDB:
    - status = "posted"
    - postedAt = platform timestamp
    - platformPostId = AT URI from platform
    - platformPostUrl = public Bluesky URL
    - updatedAt = current time
  - Opportunity status updated to "responded"
  - Returns updated Response object

**Test**: PostResult contains correct metadata
- **Given**: Successful post to Bluesky
- **When**: Check returned PostResult
- **Then**:
  - `postId` is valid AT URI
  - `postUrl` is valid Bluesky URL (https://bsky.app/...)
  - `postedAt` is recent timestamp (within 5 seconds of current time)

### 2.2 Platform Adapter Integration

**Test**: Bluesky adapter constructs reply threading
- **Given**: 
  - Parent post with ID "at://did:plc:parent.../post/456"
  - Parent post has no reply.root (it IS the root)
- **When**: Adapter posts response
- **Then**:
  - Bluesky API called with reply structure:
    - `reply.parent.uri` = parent post ID
    - `reply.root.uri` = parent post ID (same, since it's root)
  - Threading preserved correctly

**Test**: Bluesky adapter constructs URL correctly
- **Given**: 
  - Posted response has AT URI "at://did:plc:abc.../app.bsky.feed.post/xyz789"
  - Account handle is "user.bsky.social"
- **When**: Adapter returns PostResult
- **Then**: `postUrl` = "https://bsky.app/profile/user.bsky.social/post/xyz789"

---

## 3. End-to-End Test Scenarios

### 3.1 Full User Workflow: Generate → Post

**Test**: User generates draft and posts successfully
- **Given**: Opportunity in pending status
- **When**: User follows this flow:
  1. Generate response (creates draft)
  2. Review draft
  3. Click "Post"
- **Then**:
  - `POST /api/responses/:id/post` returns 200
  - Response body includes:
    - status: "posted"
    - platformPostId: AT URI
    - platformPostUrl: Bluesky URL
    - postedAt: timestamp
  - Opportunity status updated to "responded"
  - Response visible on Bluesky platform (threaded reply)

**Test**: User edits draft before posting
- **Given**: Generated draft response
- **When**: User follows this flow:
  1. Edit draft text
  2. Save changes (PATCH /api/responses/:id)
  3. Post edited version
- **Then**:
  - Edited text is posted (not original generated text)
  - Platform post contains user's edits

### 3.2 Full User Workflow: View Posted Response

**Test**: User views posted response on platform
- **Given**: Successfully posted response
- **When**: User clicks `platformPostUrl` link in UI
- **Then**:
  - Link opens Bluesky post
  - Post is threaded reply to opportunity post
  - Post text matches response.text

---

## 4. Error Handling Test Scenarios

### 4.1 Authentication Errors

**Test**: Platform authentication fails
- **Given**: 
  - Account with expired Bluesky credentials
  - Draft response ready to post
- **When**: Call `POST /api/responses/:id/post`
- **Then**:
  - Platform adapter throws `AuthenticationError`
  - API returns 401 Unauthorized
  - Response body:
    - `error`: "AuthenticationError"
    - `message`: Clear guidance to reconnect account
    - `retryable`: false
  - Response status remains "draft"
  - Response NOT modified in database

**Test**: User reconnects account and retries
- **Given**: Previous posting failed with AuthenticationError
- **When**: User follows this flow:
  1. Reconnect Bluesky account in Settings
  2. Click "Post" again on same draft
- **Then**: Posting succeeds on retry

### 4.2 Post Not Found Errors

**Test**: Parent post was deleted
- **Given**:
  - Opportunity references post that no longer exists
  - Draft response ready to post
- **When**: Call `POST /api/responses/:id/post`
- **Then**:
  - Platform adapter throws `PostNotFoundError`
  - API returns 404 Not Found
  - Response body:
    - `error`: "PostNotFoundError"
    - `message`: "The post you're replying to was deleted"
    - `retryable`: false
  - Response status remains "draft"
  - Opportunity could be marked as "expired" (optional)

### 4.3 Rate Limit Errors

**Test**: Platform rate limit exceeded
- **Given**: 
  - User has posted many responses recently
  - Bluesky returns 429 Too Many Requests
- **When**: Call `POST /api/responses/:id/post`
- **Then**:
  - Platform adapter throws `RateLimitError`
  - API returns 429 Too Many Requests
  - Response body:
    - `error`: "RateLimitError"
    - `message`: "Rate limit exceeded. Please try again in 5 minutes."
    - `retryable`: true
    - `retryAfter`: 300 (seconds)
  - Response status remains "draft"

**Test**: User waits and retries after rate limit
- **Given**: Previous posting failed with RateLimitError (retryAfter: 60)
- **When**: User waits 60+ seconds and clicks "Post" again
- **Then**: Posting succeeds on retry

### 4.4 Network Errors

**Test**: Network timeout during posting
- **Given**: Mock Bluesky API with 30-second delay (exceeds timeout)
- **When**: Call `POST /api/responses/:id/post`
- **Then**:
  - Platform adapter throws `PlatformPostingError`
  - API returns 500 Internal Server Error
  - Response body:
    - `error`: "PlatformPostingError"
    - `message`: "Network timeout"
    - `retryable`: true
  - Response status remains "draft"

**Test**: Connection refused
- **Given**: Bluesky API unreachable (connection refused)
- **When**: Call `POST /api/responses/:id/post`
- **Then**:
  - Platform adapter throws `PlatformPostingError`
  - API returns 500
  - Response status remains "draft"

### 4.5 Content Violation Errors

**Test**: Response violates platform rules
- **Given**: 
  - Response text contains banned content
  - Bluesky rejects post with content violation error
- **When**: Call `POST /api/responses/:id/post`
- **Then**:
  - Platform adapter throws `ContentViolationError`
  - API returns 422 Unprocessable Entity
  - Response body:
    - `error`: "ContentViolationError"
    - `message`: "Content violation: [reason from platform]"
    - `retryable`: false
  - Response status remains "draft"
  - User can edit response text and retry

### 4.6 Duplicate Post Prevention

**Test**: Prevent double-posting (user clicks "Post" twice)
- **Given**: Draft response
- **When**: User rapidly clicks "Post" twice
- **Then**:
  - First request: Posting succeeds, status updated to "posted"
  - Second request: Returns 409 Conflict
  - Response body:
    - `error`: "InvalidStatus"
    - `message`: "Response is already posted (cannot post again)"
  - Only ONE post created on platform (no duplicate)

---

## 5. Threading Test Scenarios

### 5.1 Simple Reply Threading

**Test**: Response threads correctly as reply
- **Given**:
  - Opportunity post with ID "at://did:plc:alice.../post/123"
  - Opportunity has no parent (it's a root post)
- **When**: Post response
- **Then**:
  - Bluesky API receives reply structure:
    - `reply.parent.uri` = "at://did:plc:alice.../post/123"
    - `reply.root.uri` = "at://did:plc:alice.../post/123"
  - Posted response appears as direct reply on Bluesky
  - Response is in same thread as opportunity

**Test**: Response threads to post in existing thread
- **Given**:
  - Opportunity post with ID "at://did:plc:bob.../post/456"
  - Opportunity post is itself a reply (has reply.root)
  - Original thread root is "at://did:plc:alice.../post/123"
- **When**: Post response
- **Then**:
  - Bluesky API receives reply structure:
    - `reply.parent.uri` = "at://did:plc:bob.../post/456" (immediate parent)
    - `reply.root.uri` = "at://did:plc:alice.../post/123" (thread root)
  - Posted response continues the thread correctly

---

## 6. Data Persistence Test Scenarios

### 6.1 Response Update on Success

**Test**: Response fields updated correctly after posting
- **Given**: Draft response
- **When**: Successfully posted to Bluesky
- **Then**: Check MongoDB `responses` collection:
  - status = "posted"
  - postedAt = platform timestamp (Date)
  - platformPostId = AT URI (string starting with "at://")
  - platformPostUrl = Bluesky URL (string starting with "https://bsky.app/")
  - updatedAt = recent timestamp
  - All other fields unchanged (text, generatedAt, metadata, etc.)

**Test**: Opportunity status updated after posting
- **Given**: Opportunity with status "pending"
- **When**: Response posted successfully
- **Then**: Check MongoDB `opportunities` collection:
  - status = "responded"
  - updatedAt = recent timestamp
  - All other fields unchanged

### 6.2 Response Unchanged on Failure

**Test**: Response not modified when posting fails
- **Given**: Draft response
- **When**: Posting fails with any error (auth, network, etc.)
- **Then**: Check MongoDB `responses` collection:
  - status still "draft" (unchanged)
  - postedAt still undefined (not populated)
  - platformPostId still undefined (not populated)
  - platformPostUrl still undefined (not populated)
  - updatedAt unchanged

---

## 7. Edge Cases

### 7.1 Missing Dependencies

**Test**: Response not found
- **Given**: Invalid responseId
- **When**: `POST /api/responses/:id/post`
- **Then**: 404 error with message "Response with ID :id not found"

**Test**: Opportunity not found
- **Given**: Response references deleted opportunity
- **When**: Attempt to post
- **Then**: 404 error with message "Opportunity not found"

**Test**: Account not found
- **Given**: Response references deleted account
- **When**: Attempt to post
- **Then**: 404 error with message "Account not found"

### 7.2 Platform-Specific Edge Cases

**Test**: Bluesky handle contains special characters
- **Given**: Account handle "user-name.test.bsky.social"
- **When**: Construct platformPostUrl
- **Then**: URL correctly includes handle (no encoding issues)

**Test**: Response text contains unicode/emoji
- **Given**: Response text "Great point! 🚀 Let's collaborate 你好"
- **When**: Post to Bluesky
- **Then**:
  - Post succeeds (unicode handled correctly)
  - Text on platform matches original (no mojibake)

---

## 8. Acceptance Criteria

### Must-Have (v0.1 MVP)

✅ **Functional:**
- [ ] User can post draft response to Bluesky
- [ ] Posted response threads correctly as reply to opportunity post
- [ ] Platform metadata (postId, postUrl, timestamp) captured correctly
- [ ] Response status updates to "posted" on success
- [ ] Opportunity status updates to "responded" on success
- [ ] User can view posted response on Bluesky (clickable link)

✅ **Error Handling:**
- [ ] Authentication errors prevent posting, show clear message
- [ ] Post-not-found errors handled gracefully
- [ ] Rate limit errors show retry guidance
- [ ] Network errors keep response as draft
- [ ] All errors display user-friendly messages

✅ **Reliability:**
- [ ] No duplicate posts (double-click prevention)
- [ ] Manual retry works after any error
- [ ] Response data consistent (status matches reality)

### Nice-to-Have (Defer to v0.2)

- [ ] Automatic retry with exponential backoff
- [ ] Background job queue for deferred posting
- [ ] Thread continuation (reply to latest in thread)
- [ ] Post scheduling (delayed posting)

---

## 9. Test Data Requirements

### 9.1 Responses

**Variety Needed:**
- Draft responses (various text lengths)
- Posted responses (with platform metadata)
- Dismissed responses (should not be postable)

### 9.2 Opportunities

**Variety Needed:**
- Root posts (no parent)
- Reply posts (part of existing thread)
- Deleted posts (for PostNotFoundError testing)
- Various platforms (Bluesky for v0.1, LinkedIn/Reddit for future)

### 9.3 Accounts

**Variety Needed:**
- Valid Bluesky account (active credentials)
- Expired credentials (for AuthenticationError testing)
- Rate-limited account (for RateLimitError testing)

---

## 10. Testing Tools & Mocks

### 10.1 Required Mocks

**Platform Adapter Mock:**
- Success scenario: Return valid PostResult
- AuthenticationError: Throw with retryable=false
- RateLimitError: Throw with retryAfter
- PostNotFoundError: Throw with postId
- PlatformPostingError: Throw with various messages
- Network timeout: Delay then throw

**Bluesky API Mock (for adapter testing):**
- `agent.getPost()`: Return parent post with reply references
- `agent.post()`: Return created post with URI, createdAt
- Error responses: 401, 404, 429, 500

### 10.2 Test Fixtures

See `tests/fixtures/` for reusable test data:
- `response-fixtures.ts`: Sample responses (draft, posted, dismissed)
  - Include platformPostId and platformPostUrl for posted responses
- `opportunity-fixtures.ts`: Sample opportunities (root posts, replies)
- `account-fixtures.ts`: Sample accounts (valid, expired credentials)

---

## 11. Monitoring & Observability

### 11.1 Metrics to Track (Future)

- Post success rate (by platform)
- Error distribution (auth, rate limit, network, etc.)
- Average posting latency
- Retry attempts per response
- Threading accuracy (manual verification)

### 11.2 Logging Requirements

**Info-Level Logs:**
- Post initiated (responseId, opportunityId, accountId)
- Post succeeded (postId, postUrl, latency)
- Response status updated
- Opportunity status updated

**Error-Level Logs:**
- Post failed (error type, message, responseId)
- Authentication errors (accountId, platform)
- Rate limit errors (retryAfter, accountId)
- Network errors (timeout, connection refused)

**Never Log:**
- Account credentials or tokens
- Full response text (may contain PII)
- User handle or DID (PII)

---

## 12. Definition of Done

**Feature Complete When:**
- [ ] All unit tests pass (>90% coverage for posting logic)
- [ ] All integration tests pass (platform adapter mocking)
- [ ] All E2E tests pass (full user workflows)
- [ ] All error handling tests pass (6+ error types verified)
- [ ] Threading tests pass (replies attach correctly)
- [ ] API documentation updated (OpenAPI spec for POST /responses/:id/post)
- [ ] Error messages user-tested (clear and actionable)
- [ ] Code reviewed by reviewer agent
- [ ] Manual testing by human (post 10+ responses to real Bluesky account)

---

## 13. References

- **Design Document**: See [Response Posting Design](../designs/response-posting-design.md) for complete data models, API specs, and implementation details
- **ADR**: See [ADR-010](../../../docs/architecture/decisions/010-response-posting.md) for decision rationale
- **Related Features:**
  - [Response Suggestion Handoff](./004-response-suggestion-handoff.md) - Response generation
  - [Opportunity Discovery Handoff](./003-opportunity-discovery-handoff.md) - Opportunity data models

---

## Questions for Test-Writer Agent

1. Should we test with real Bluesky API (slow, needs real account) or only mocks?
2. How many error scenarios should have E2E tests vs. unit tests? (All 6+ error types?)
3. Should threading tests use real Bluesky threads or synthetic data?
4. What's the priority order for test implementation? (Happy path first? Error cases first?)
5. Should we test platform URL construction with various handle formats?

---

**Ready for Test-Writer!** 🎯

All technical details are in the Design Document. This handoff focuses on **what behaviors to test** and **how to verify them**. Questions or unclear scenarios? Check the design doc or ask!

