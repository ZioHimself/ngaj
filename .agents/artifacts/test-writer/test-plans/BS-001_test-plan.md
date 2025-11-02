# Test Plan: Bluesky Search Adapter (BS-001 to BS-005)

**Date**: 2025-11-02  
**Agent**: Test-Writer  
**Iteration**: 1 - Basic interface and structure  
**Requirements**: BS-001, BS-002, BS-003, BS-004, BS-005

---

## Overview

This test plan covers the basic functionality of the Bluesky adapter, focusing on search operations, error handling, and data parsing. All tests will use mocked Bluesky API (@atproto/api) to avoid external dependencies.

## Requirements Coverage

### BS-001: Basic Search Functionality
**Scenario**: Search for posts with a single keyword

**Test Cases**:
1. ✅ Should return posts matching search query
2. ✅ Should include all required fields (id, content, author, createdAt)
3. ✅ Should call Bluesky API with correct parameters
4. ✅ Should transform Bluesky post format to our Post interface

**Acceptance Criteria**:
- Posts returned contain search keyword
- All posts have required fields
- Posts conform to Post interface from types/post.ts

---

### BS-002: Empty Results Handling
**Scenario**: Handle empty search results gracefully

**Test Cases**:
1. ✅ Should return empty array when no results found
2. ✅ Should not throw errors for empty results
3. ✅ Should handle undefined/null API responses

**Acceptance Criteria**:
- Returns empty array `[]`
- No exceptions thrown
- Graceful handling of edge cases

---

### BS-003: Authentication Errors
**Scenario**: Handle API authentication failures

**Test Cases**:
1. ✅ Should throw AuthenticationError for invalid credentials
2. ✅ Should include descriptive error message
3. ✅ Should reject authentication during authenticate() call
4. ✅ Should prevent searchPosts() when not authenticated

**Acceptance Criteria**:
- Custom AuthenticationError thrown (not generic Error)
- Error message indicates invalid credentials
- isAuthenticated() returns false

---

### BS-004: Network Errors
**Scenario**: Handle network failures gracefully

**Test Cases**:
1. ✅ Should throw NetworkError for unreachable API
2. ✅ Should include retry information in error
3. ✅ Should handle timeout errors
4. ✅ Should distinguish between network and auth errors

**Acceptance Criteria**:
- Custom NetworkError thrown
- Error includes retry metadata
- Clear error messages for different network issues

---

### BS-005: Data Parsing
**Scenario**: Parse Bluesky post data correctly

**Test Cases**:
1. ✅ Should map all required fields correctly
2. ✅ Should handle optional fields (likeCount, replyCount, repostCount)
3. ✅ Should parse dates correctly
4. ✅ Should extract author information properly
5. ✅ Should handle missing/malformed data gracefully
6. ✅ Should set platform to 'bluesky'
7. ✅ Should generate proper post URLs

**Acceptance Criteria**:
- All fields mapped correctly from Bluesky format
- Required fields always present
- Optional fields handled gracefully (default to 0 or undefined)
- Dates are proper Date objects
- Posts conform to Post interface

---

## Technical Approach

### Mocking Strategy
- Mock `@atproto/api` BskyAgent
- Use Vitest's `vi.mock()` for module mocking
- Create mock post responses matching Bluesky API schema
- Mock both success and failure scenarios

### Test Structure
```typescript
describe('BlueskyAdapter', () => {
  describe('BS-001: Basic Search', () => { ... })
  describe('BS-002: Empty Results', () => { ... })
  describe('BS-003: Authentication Errors', () => { ... })
  describe('BS-004: Network Errors', () => { ... })
  describe('BS-005: Data Parsing', () => { ... })
})
```

### Mock Data
- Create realistic Bluesky post objects
- Include edge cases (null values, missing fields)
- Test both complete and minimal post structures

---

## Test Data

### Valid Bluesky Post Response
```typescript
{
  uri: 'at://did:plc:user123/app.bsky.feed.post/abc123',
  cid: 'cid123',
  author: {
    did: 'did:plc:user123',
    handle: 'user.bsky.social',
    displayName: 'Test User',
    avatar: 'https://cdn.bsky.app/avatar/user123'
  },
  record: {
    text: 'This is a test post about TypeScript',
    createdAt: '2024-01-01T12:00:00.000Z'
  },
  likeCount: 10,
  replyCount: 5,
  repostCount: 3
}
```

### Expected Post Output
```typescript
{
  id: 'generated-uuid',
  platform: 'bluesky',
  platformPostId: 'abc123',
  content: 'This is a test post about TypeScript',
  author: {
    id: 'did:plc:user123',
    username: 'user.bsky.social',
    displayName: 'Test User',
    avatarUrl: 'https://cdn.bsky.app/avatar/user123'
  },
  metrics: {
    likes: 10,
    replies: 5,
    reposts: 3
  },
  createdAt: Date('2024-01-01T12:00:00.000Z'),
  url: 'https://bsky.app/profile/user.bsky.social/post/abc123'
}
```

---

## Edge Cases

1. **Null/Undefined Values**
   - Missing avatar URL
   - Missing display name
   - Zero engagement metrics
   - Missing optional fields

2. **Malformed Data**
   - Invalid date formats
   - Missing required fields
   - Unexpected API response structure

3. **Empty States**
   - Empty search results
   - Empty string in content
   - Empty author information

---

## Dependencies

### Required Packages
- `@atproto/api` - Bluesky SDK (to be mocked)
- `vitest` - Test framework
- `uuid` - For generating post IDs

### Type Dependencies
- `src/types/post.ts` - Post, Author, PostMetrics interfaces
- `src/types/adapter.ts` - SocialAdapter, AdapterConfig, SearchOptions

---

## Success Criteria

✅ All 5 requirements have test coverage  
✅ All tests fail initially (Red phase)  
✅ Tests use proper mocking (no real API calls)  
✅ Tests are clear, readable, and maintainable  
✅ Edge cases are covered  
✅ Error handling is comprehensive  
✅ Test descriptions match Gherkin scenarios  

---

## Handoff Notes

### For Implementer Agent

**Implementation File**: `src/adapters/bluesky-adapter.ts`

**Key Implementation Points**:
1. Install `@atproto/api` package
2. Implement `SocialAdapter` interface
3. Use `BskyAgent` for API interactions
4. Implement proper error handling (custom error classes)
5. Transform Bluesky post format to our Post interface
6. Handle authentication flow
7. Implement rate limiting (if needed)

**Custom Error Classes Needed**:
- `AuthenticationError` (extends Error)
- `NetworkError` (extends Error, includes retry info)

**Data Transformation**:
- Map Bluesky `uri` → extract `platformPostId`
- Map `author.handle` → `author.username`
- Map `author.displayName` → `author.displayName`
- Map engagement counts → `metrics` object
- Generate UUID for `id` field
- Construct post URL from handle and post ID

**Configuration**:
```typescript
interface BlueskyAdapterConfig extends AdapterConfig {
  credentials: {
    identifier: string; // handle or email
    password: string;   // app password
  }
}
```

---

## Decision Log Reference

All decisions made during test writing are logged in:
`.agents/logs/test-writer/decisions.jsonl`

Key decisions:
- Mock strategy for @atproto/api
- Error class design
- Test data structure
- Edge case coverage

---

## Next Steps

1. ✅ Test plan created
2. ⏭️ Write test file: `tests/unit/adapters/bluesky-adapter.spec.ts`
3. ⏭️ Verify tests fail (Red phase)
4. ⏭️ Log all decisions
5. ⏭️ Create handoff document
6. ⏭️ Notify Implementer Agent

