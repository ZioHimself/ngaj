# Handoff Document: Bluesky Adapter Implementation (BS-001 to BS-005)

**From**: Test-Writer Agent  
**To**: Implementer Agent  
**Date**: 2025-11-02  
**Status**: ✅ Tests Written - Ready for Implementation (Red Phase)

---

## Summary

Comprehensive test suite has been written for the Bluesky adapter covering requirements BS-001 through BS-005. All 32 tests are currently **failing** (Red phase) as expected. The implementation file needs to be created at `src/adapters/bluesky-adapter.ts`.

---

## Test Coverage

### Requirements Tested
- ✅ **BS-001**: Basic Search Functionality (4 tests)
- ✅ **BS-002**: Empty Results Handling (4 tests)
- ✅ **BS-003**: Authentication Errors (5 tests)
- ✅ **BS-004**: Network Errors (5 tests)
- ✅ **BS-005**: Data Parsing (10 tests)
- ✅ **Integration**: Adapter Lifecycle (4 tests)

**Total**: 32 test cases

### Test File Location
`tests/unit/adapters/bluesky-adapter.spec.ts`

### Test Plan Location
`.agents/artifacts/test-writer/test-plans/BS-001_test-plan.md`

---

## Implementation Requirements

### File to Create
**Path**: `src/adapters/bluesky-adapter.ts`

### Dependencies to Install
```bash
npm install @atproto/api
```

### Interfaces to Implement

```typescript
import { SocialAdapter, AdapterConfig, SearchOptions } from '@/types/adapter';
import { Post } from '@/types/post';

export class BlueskyAdapter implements SocialAdapter {
  readonly name: string = 'bluesky';
  
  constructor(config: AdapterConfig) { }
  
  authenticate(): Promise<void> { }
  isAuthenticated(): boolean { }
  searchPosts(options: SearchOptions): Promise<Post[]> { }
  disconnect(): Promise<void> { }
}
```

---

## Custom Error Classes Needed

### 1. AuthenticationError
**File**: `src/adapters/errors/authentication-error.ts`

```typescript
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}
```

**When to throw**:
- Invalid credentials during login
- Attempting to search when not authenticated
- Session expired or invalid

**Example usage**:
```typescript
throw new AuthenticationError('Invalid identifier or password');
```

### 2. NetworkError
**File**: `src/adapters/errors/network-error.ts`

```typescript
export class NetworkError extends Error {
  public retryable: boolean;
  
  constructor(message: string, retryable: boolean = true) {
    super(message);
    this.name = 'NetworkError';
    this.retryable = retryable;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
```

**When to throw**:
- Network connection failures
- API unreachable
- Timeout errors
- DNS failures

**Example usage**:
```typescript
throw new NetworkError('Failed to connect to Bluesky API', true);
```

---

## Data Transformation Guide

### Bluesky API Response → Our Post Interface

```typescript
// Bluesky API Format
{
  uri: 'at://did:plc:user123/app.bsky.feed.post/abc123',
  cid: 'bafyreicid123',
  author: {
    did: 'did:plc:user123',
    handle: 'testuser.bsky.social',
    displayName: 'Test User',
    avatar: 'https://cdn.bsky.app/img/avatar/...'
  },
  record: {
    text: 'Post content',
    createdAt: '2024-01-01T12:00:00.000Z'
  },
  likeCount: 42,
  replyCount: 10,
  repostCount: 5
}

// Transform to Our Post Format
{
  id: generateUUID(),                                // Generate new UUID
  platform: 'bluesky',                               // Hardcode 'bluesky'
  platformPostId: extractPostId(uri),                // Extract 'abc123' from URI
  content: record.text,                               // Direct mapping
  author: {
    id: author.did,                                   // Direct mapping
    username: author.handle,                          // Direct mapping
    displayName: author.displayName || author.handle, // Fallback to handle
    avatarUrl: author.avatar                          // Direct mapping (can be undefined)
  },
  metrics: {
    likes: likeCount || 0,                            // Default to 0
    replies: replyCount || 0,                         // Default to 0
    reposts: repostCount || 0                         // Default to 0
  },
  createdAt: new Date(record.createdAt),             // Parse to Date object
  url: `https://bsky.app/profile/${author.handle}/post/${platformPostId}`
}
```

### Key Transformation Rules

1. **UUID Generation**: Use `crypto.randomUUID()` or a UUID library for the `id` field
2. **URI Parsing**: Extract post ID from AT Protocol URI format
   - Format: `at://did:plc:user123/app.bsky.feed.post/{postId}`
   - Extract: `{postId}`
3. **Date Parsing**: Convert ISO string to Date object
4. **Defaults**: Use 0 for missing engagement metrics
5. **Fallbacks**: Use `handle` when `displayName` is missing
6. **URL Construction**: `https://bsky.app/profile/{handle}/post/{postId}`

---

## Implementation Checklist

### Phase 1: Setup
- [ ] Install `@atproto/api` dependency
- [ ] Create error classes:
  - [ ] `src/adapters/errors/authentication-error.ts`
  - [ ] `src/adapters/errors/network-error.ts`
- [ ] Create adapter file: `src/adapters/bluesky-adapter.ts`
- [ ] Export adapter from `src/adapters/index.ts`

### Phase 2: Basic Structure
- [ ] Create `BlueskyAdapter` class implementing `SocialAdapter`
- [ ] Initialize `BskyAgent` from `@atproto/api`
- [ ] Store configuration in private fields
- [ ] Initialize authentication state

### Phase 3: Authentication (BS-003)
- [ ] Implement `authenticate()` method
  - [ ] Call `BskyAgent.login()` with credentials
  - [ ] Set authentication flag on success
  - [ ] Throw `AuthenticationError` on failure with descriptive message
- [ ] Implement `isAuthenticated()` method
  - [ ] Return current authentication state
- [ ] Add authentication guard to `searchPosts()`
  - [ ] Throw `AuthenticationError` if not authenticated

### Phase 4: Search Posts (BS-001, BS-002)
- [ ] Implement `searchPosts()` method
  - [ ] Build search parameters from `SearchOptions`
  - [ ] Call `BskyAgent.app.bsky.feed.searchPosts()`
  - [ ] Handle empty results (return empty array)
  - [ ] Handle undefined/null responses gracefully
  - [ ] Transform each post using helper function
  - [ ] Return `Post[]`

### Phase 5: Data Transformation (BS-005)
- [ ] Create `transformPost()` helper function
  - [ ] Generate UUID for `id` field
  - [ ] Set `platform` to 'bluesky'
  - [ ] Extract `platformPostId` from URI
  - [ ] Map content from `record.text`
  - [ ] Transform author object
  - [ ] Transform metrics with defaults
  - [ ] Parse date to Date object
  - [ ] Construct post URL
- [ ] Handle edge cases:
  - [ ] Missing avatar (leave as undefined)
  - [ ] Missing displayName (fallback to handle)
  - [ ] Missing metrics (default to 0)
  - [ ] Malformed posts (skip or log warning)

### Phase 6: Error Handling (BS-004)
- [ ] Wrap API calls in try-catch
- [ ] Detect network errors:
  - [ ] Connection failures (ECONNREFUSED, ENOTFOUND)
  - [ ] Timeouts
  - [ ] DNS failures
- [ ] Throw `NetworkError` with:
  - [ ] Descriptive message
  - [ ] `retryable: true` for transient errors
- [ ] Preserve original error context

### Phase 7: Cleanup
- [ ] Implement `disconnect()` method
  - [ ] Clear authentication state
  - [ ] Cleanup any resources
  - [ ] Reset agent if needed

### Phase 8: Polish
- [ ] Add JSDoc comments to all public methods
- [ ] Handle rate limiting (if applicable)
- [ ] Respect timeout configuration
- [ ] Add logging (optional, for debugging)

---

## Code Examples

### Basic Adapter Structure

```typescript
import { BskyAgent } from '@atproto/api';
import { SocialAdapter, AdapterConfig, SearchOptions } from '@/types/adapter';
import { Post } from '@/types/post';
import { AuthenticationError } from './errors/authentication-error';
import { NetworkError } from './errors/network-error';

export class BlueskyAdapter implements SocialAdapter {
  readonly name: string = 'bluesky';
  private agent: BskyAgent;
  private authenticated: boolean = false;
  private config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
    this.agent = new BskyAgent({ 
      service: 'https://bsky.social' 
    });
  }

  async authenticate(): Promise<void> {
    try {
      await this.agent.login({
        identifier: this.config.credentials.identifier,
        password: this.config.credentials.password
      });
      this.authenticated = true;
    } catch (error: any) {
      this.authenticated = false;
      throw new AuthenticationError(
        `Authentication failed: ${error.message}`
      );
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  async searchPosts(options: SearchOptions): Promise<Post[]> {
    if (!this.authenticated) {
      throw new AuthenticationError('Not authenticated. Call authenticate() first.');
    }

    try {
      const response = await this.agent.app.bsky.feed.searchPosts({
        q: options.query,
        limit: options.limit || 25
      });

      if (!response.data?.posts) {
        return [];
      }

      return response.data.posts
        .map(post => this.transformPost(post))
        .filter(post => post !== null) as Post[];
    } catch (error: any) {
      // Distinguish between auth and network errors
      if (error.message?.includes('auth')) {
        throw new AuthenticationError(error.message);
      }
      throw new NetworkError(
        `Network error: ${error.message}`,
        true // retryable
      );
    }
  }

  private transformPost(blueskyPost: any): Post | null {
    try {
      const postId = this.extractPostId(blueskyPost.uri);
      
      return {
        id: crypto.randomUUID(),
        platform: 'bluesky',
        platformPostId: postId,
        content: blueskyPost.record?.text || '',
        author: {
          id: blueskyPost.author.did,
          username: blueskyPost.author.handle,
          displayName: blueskyPost.author.displayName || blueskyPost.author.handle,
          avatarUrl: blueskyPost.author.avatar
        },
        metrics: {
          likes: blueskyPost.likeCount || 0,
          replies: blueskyPost.replyCount || 0,
          reposts: blueskyPost.repostCount || 0
        },
        createdAt: new Date(blueskyPost.record.createdAt),
        url: `https://bsky.app/profile/${blueskyPost.author.handle}/post/${postId}`
      };
    } catch (error) {
      console.error('Failed to transform post:', error);
      return null;
    }
  }

  private extractPostId(uri: string): string {
    // Extract from: at://did:plc:user123/app.bsky.feed.post/abc123
    const parts = uri.split('/');
    return parts[parts.length - 1];
  }

  async disconnect(): Promise<void> {
    this.authenticated = false;
    // BskyAgent doesn't require explicit cleanup
  }
}
```

---

## Testing Strategy

### Run Tests
```bash
npm run test:unit tests/unit/adapters/bluesky-adapter.spec.ts
```

### Expected Behavior
- **Before implementation**: All tests should FAIL (Red phase) ✅
- **After implementation**: All tests should PASS (Green phase)
- **Current status**: 32 tests failing

### Verify Red Phase
```bash
npm run test:unit -- tests/unit/adapters/bluesky-adapter.spec.ts
```

Expected output:
```
❌ BlueskyAdapter > BS-001: Basic Search > should return posts matching search query
❌ BlueskyAdapter > BS-001: Basic Search > should return posts with all required fields
... (32 failures total)
```

---

## Common Pitfalls to Avoid

1. **Don't make real API calls**: Tests mock the API, your implementation should use the mocked version
2. **Handle null/undefined**: Bluesky API may return incomplete data
3. **Date parsing**: Always convert ISO strings to Date objects
4. **Error types**: Use custom error classes, not generic Error
5. **Authentication state**: Track authentication properly for security
6. **URI parsing**: Be careful with AT Protocol URI format
7. **Default values**: Use 0 for missing metrics, not undefined/null

---

## Success Criteria

✅ All 32 tests pass  
✅ No linter errors  
✅ Type checking passes (`npm run type-check`)  
✅ Code follows existing patterns in codebase  
✅ Error handling is comprehensive  
✅ Data transformation is accurate  

---

## Questions or Issues?

If you encounter issues:
1. Check the test file for expected behavior
2. Review mock data structure in tests
3. Verify @atproto/api documentation
4. Check decision log: `.agents/logs/test-writer/decisions.jsonl`

---

## Next Steps

1. **Implementer Agent**: Implement `src/adapters/bluesky-adapter.ts`
2. **Run tests**: Verify all tests pass (Green phase)
3. **Reviewer Agent**: Review implementation for quality
4. **Refactor**: Improve code quality (if needed)

---

**Test-Writer Agent - Handoff Complete** ✅  
**Date**: 2025-11-02  
**Tests Written**: 32  
**Requirements Covered**: BS-001, BS-002, BS-003, BS-004, BS-005

