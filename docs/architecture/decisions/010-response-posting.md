# ADR-010: Response Draft Posting

## Status

**Accepted** - January 4, 2026

## Context

The Response Suggestion feature (ADR-009) generates AI-powered draft responses to opportunities. However, the actual mechanism for posting these drafts to social media platforms was not fully specified. We need to design:

1. **Platform adapter interface** for posting responses
2. **Threading mechanics** to ensure responses attach to the correct parent post
3. **Metadata capture** to track posted responses
4. **Error handling** for posting failures
5. **Data model updates** to store platform post identifiers and URLs

**Key Requirements:**
- Keep the platform adapter interface generic (multi-platform support)
- Let adapters handle platform-specific threading internally
- Capture platform-provided metadata (post ID, URL, timestamp)
- Simple error handling for v0.1 (no automatic retries)
- User maintains full control (manual retry on failure)

## Decision

We will implement a **generic posting interface** with platform-specific threading handled internally by each adapter.

### 1. Platform Adapter Method

Add a `post()` method to `IPlatformAdapter`:

```typescript
interface IPlatformAdapter {
  /**
   * Post a response to a specific opportunity
   * 
   * @param parentPostId - Platform-specific ID of post being replied to
   * @param responseText - Text content of the response
   * @returns Posted response metadata
   * @throws PlatformPostingError on failure
   */
  post(parentPostId: string, responseText: string): Promise<PostResult>;
}

interface PostResult {
  /** Platform-specific identifier for the posted response */
  postId: string;
  
  /** Public URL to view the posted response */
  postUrl: string;
  
  /** Timestamp when post was created on platform */
  postedAt: Date;
}
```

**Design Rationale:**
- **Generic signature**: Works for all platforms (Bluesky, LinkedIn, Reddit)
- **Simple inputs**: Just parent post ID and text (adapter has account credentials)
- **Platform timestamp**: More accurate than local timestamp
- **Adapter encapsulation**: Each adapter handles its own threading logic

### 2. Response Data Model Updates

Add platform post metadata to `Response`:

```typescript
interface Response {
  // ... existing fields ...
  
  /**
   * Platform-specific identifier for posted response
   * Populated after successful posting
   * Example (Bluesky): "at://did:plc:abc.../app.bsky.feed.post/xyz"
   */
  platformPostId?: string;
  
  /**
   * Public URL to view the posted response
   * Example: "https://bsky.app/profile/user.bsky.social/post/xyz"
   */
  platformPostUrl?: string;
}
```

**Why these fields:**
- **platformPostId**: Enables future features (edit, delete, track engagement)
- **platformPostUrl**: User can click to view their posted response
- **Optional**: Only populated after successful posting (drafts don't have these)

### 3. Threading Strategy

**For v0.1 (Bluesky):**
- Responses always reply directly to the opportunity post
- No thread continuation support (defer to v0.2)
- Bluesky adapter internally constructs `reply.parent` and `reply.root` from `parentPostId`

**Metadata Flow:**
1. User clicks "Post" on a draft response
2. API service loads opportunity (contains `postId` for threading)
3. API calls `adapter.post(opportunity.postId, response.text)`
4. Adapter handles platform-specific threading
5. Adapter returns `PostResult` with platform metadata
6. API updates response with `platformPostId`, `platformPostUrl`, `postedAt`, `status=posted`

### 4. Error Handling (v0.1)

**Simple, user-controlled approach:**
- If posting fails → keep response as `draft`
- Display error message to user
- No automatic retries
- User can manually retry by clicking "Post" again

**Error Categories:**
- **Network errors**: Timeout, connection failure
- **Authentication errors**: Expired token, invalid credentials
- **Post not found**: Original opportunity was deleted
- **Rate limiting**: 429 Too Many Requests
- **Content violations**: Platform-specific moderation

**Future Enhancements (v0.2+):**
- Exponential backoff retry logic
- Distinguish retryable vs. non-retryable errors
- Queue failed posts for retry

## Rationale

### Why Generic Interface?

**Decision:** Single `post()` method with generic parameters

**Alternatives Considered:**
1. **Platform-specific methods**: `postToBluesky()`, `postToLinkedIn()`, etc.
   - ❌ Breaks abstraction, harder to add new platforms
2. **Rich options object**: `post({ parent, text, threadMode, attachments })`
   - ❌ Over-engineered for v0.1 (only text replies needed)
3. **Separate threading parameter**: `post(parentId, text, { threading: 'direct' })`
   - ❌ Unnecessary complexity when adapter can infer threading

**Chosen approach:** Simple signature, adapter handles platform details internally

### Why Platform Timestamp?

**Decision:** Use `PostResult.postedAt` from platform API response

**Alternatives Considered:**
1. **Local timestamp**: Record time when API call succeeds
   - ❌ Inaccurate (network latency, server processing time)
2. **Hybrid**: Use platform timestamp, fallback to local if unavailable
   - ❌ Adds complexity; all platforms provide creation timestamps

**Chosen approach:** Platform timestamp is authoritative

### Why No Automatic Retries (v0.1)?

**Decision:** Keep response as draft, let user manually retry

**Alternatives Considered:**
1. **Exponential backoff**: Auto-retry 3 times with delays
   - ❌ Adds complexity; may post duplicate responses if unclear whether first attempt succeeded
2. **Background job queue**: Queue failed posts for later retry
   - ❌ Over-engineered for single-user v0.1 MVP

**Chosen approach:** Simplicity and user control for MVP

### Why Store Platform Post Metadata?

**Decision:** Add `platformPostId` and `platformPostUrl` to Response

**Alternatives Considered:**
1. **Don't store metadata**: Only track status (posted/draft)
   - ❌ Cannot link back to platform post for future features
2. **Store in separate collection**: `posted_responses` table
   - ❌ Unnecessary normalization; 1:1 relationship with Response

**Chosen approach:** Store in Response document (simpler, enables future features)

## Consequences

### Positive

- ✅ **Simple interface**: Easy to implement for new platforms
- ✅ **Platform flexibility**: Adapters control threading, formatting, etc.
- ✅ **Accurate timestamps**: Platform-provided postedAt is authoritative
- ✅ **User control**: No surprises from automatic retries
- ✅ **Future-ready**: Metadata enables delete, edit, engagement tracking
- ✅ **Extensible**: Easy to add retry logic, thread continuation in future

### Negative

- ❌ **Manual retry**: User must click "Post" again on network failures
- ❌ **No resilience**: Transient errors require user intervention
- ❌ **Limited feedback**: Generic error messages (no platform-specific guidance)

### Mitigation

- **Manual retry**: Clear error messages guide user ("Network error - please try again")
- **No resilience**: Monitor error rates in telemetry; add auto-retry in v0.2 if >5% failure rate
- **Limited feedback**: Platform adapters can throw specific error types (AuthenticationError, RateLimitError) for better UX

## Implementation Notes

### Bluesky Adapter Example

```typescript
class BlueskyAdapter implements IPlatformAdapter {
  async post(parentPostId: string, responseText: string): Promise<PostResult> {
    // 1. Parse parent post ID to extract reply references
    const parentUri = parentPostId; // Already in AT URI format
    
    // 2. Fetch parent post to get reply.root (for proper threading)
    const parentPost = await this.agent.getPost({ uri: parentUri });
    
    // 3. Construct reply post with threading
    const result = await this.agent.post({
      text: responseText,
      reply: {
        parent: {
          uri: parentUri,
          cid: parentPost.cid,
        },
        root: parentPost.reply?.root || {
          uri: parentUri,
          cid: parentPost.cid,
        },
      },
    });
    
    // 4. Return platform metadata
    return {
      postId: result.uri, // AT URI
      postUrl: `https://bsky.app/profile/${this.handle}/post/${result.uri.split('/').pop()}`,
      postedAt: new Date(result.createdAt),
    };
  }
}
```

### API Service Flow

```typescript
async function postResponse(responseId: ObjectId): Promise<Response> {
  // 1. Load response, opportunity, account
  const response = await responsesCollection.findOne({ _id: responseId });
  const opportunity = await opportunitiesCollection.findOne({ _id: response.opportunityId });
  const account = await accountsCollection.findOne({ _id: response.accountId });
  
  // 2. Get platform adapter
  const adapter = getPlatformAdapter(account.platform, account.credentials);
  
  // 3. Post to platform
  try {
    const result = await adapter.post(opportunity.postId, response.text);
    
    // 4. Update response with platform metadata
    await responsesCollection.updateOne(
      { _id: responseId },
      {
        $set: {
          status: 'posted',
          postedAt: result.postedAt,
          platformPostId: result.postId,
          platformPostUrl: result.postUrl,
          updatedAt: new Date(),
        },
      }
    );
    
    // 5. Update opportunity status
    await opportunitiesCollection.updateOne(
      { _id: opportunity._id },
      { $set: { status: 'responded', updatedAt: new Date() } }
    );
    
    return await responsesCollection.findOne({ _id: responseId });
  } catch (error) {
    // Keep response as draft, propagate error to user
    throw new PlatformPostingError(`Failed to post response: ${error.message}`);
  }
}
```

## Success Criteria

v0.1 succeeds if:
1. ✅ Responses post successfully to Bluesky 95%+ of the time
2. ✅ Posted responses appear as threaded replies to opportunity posts
3. ✅ Platform metadata (post ID, URL) captured correctly
4. ✅ Failed posts remain as drafts with clear error messages
5. ✅ Users can manually retry failed posts
6. ✅ Posted responses link back to platform (clickable URL)

## Future Enhancements

### v0.2: Resilience & Intelligence
- Automatic retry with exponential backoff (3 attempts)
- Distinguish retryable vs. non-retryable errors
- Platform-specific error messages with resolution steps

### v0.3: Advanced Threading
- Thread continuation (reply to latest post in thread, not just root)
- Quote posts (embed original post in response)
- Multi-post threads (break long responses into multiple posts)

### v0.4: Post Management
- Edit posted responses (where supported)
- Delete posted responses
- Track engagement (likes, replies to your response)

### v0.5: Batch Operations
- Post multiple responses in sequence
- Schedule posts for future (delayed posting)

## References

- [ADR-009: Response Suggestion Architecture](./009-response-suggestion-architecture.md) - Response generation design
- [ADR-008: Opportunity Discovery Architecture](./008-opportunity-discovery-architecture.md) - Opportunity data models
- [ADR-005: MVP Scope](./005-mvp-scope.md) - v0.1 feature scope
- [Bluesky AT Protocol - Reply Threading](https://atproto.com/lexicons/app-bsky-feed#appbskyfeedpost) - Threading mechanics

## Related Documentation

- Design Doc: `.agents/artifacts/designer/designs/response-posting-design.md` (to be created)
- Handoff Doc: `.agents/artifacts/designer/handoffs/005-response-posting-handoff.md` (to be created)

