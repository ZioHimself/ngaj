import type { RawPost, RawAuthor } from '@ngaj/shared';
import type { PlatformConstraints } from '@ngaj/shared';

/**
 * Fetch options for platform adapter methods
 */
export interface FetchOptions {
  /**
   * Fetch posts created after this timestamp
   * Optional; defaults to "beginning of time" if not provided
   */
  since?: Date;

  /**
   * Maximum number of posts to return
   * Optional; platform may have its own default
   */
  limit?: number;
}

/**
 * Result of a successful post operation.
 * Contains platform-provided metadata.
 * 
 * @see ADR-010: Response Draft Posting
 */
export interface PostResult {
  /**
   * Platform-specific identifier for the posted response
   * 
   * Format varies by platform:
   * - Bluesky: AT URI (e.g., "at://did:plc:abc.../app.bsky.feed.post/xyz")
   * - LinkedIn: Post URN
   * - Reddit: Post ID (t1_xxx for comments)
   */
  postId: string;

  /**
   * Public URL to view the posted response
   * 
   * This is a human-readable URL suitable for sharing or display.
   * Examples:
   * - Bluesky: "https://bsky.app/profile/user.bsky.social/post/xyz"
   * - LinkedIn: "https://www.linkedin.com/feed/update/urn:li:share:abc"
   * - Reddit: "https://reddit.com/r/subreddit/comments/abc/title/xyz"
   */
  postUrl: string;

  /**
   * Timestamp when post was created on platform
   * 
   * This is the authoritative timestamp provided by the platform,
   * NOT a local timestamp. More accurate than client-side recording.
   */
  postedAt: Date;
}

/**
 * Platform adapter interface - abstracts platform-specific API calls
 * 
 * This interface enables multi-platform support by providing a consistent
 * API for discovering opportunities across different social media platforms.
 * 
 * @see ADR-008: Opportunity Discovery Architecture
 */
export interface IPlatformAdapter {
  /**
   * Fetch replies to the authenticated user's posts
   * 
   * @param options - Fetch options (since, limit)
   * @returns Array of raw posts
   * @throws PlatformApiError on failure
   * @throws RateLimitError on 429 response
   * @throws AuthenticationError on 401 response
   */
  fetchReplies(options: FetchOptions): Promise<RawPost[]>;

  /**
   * Search for posts matching keywords
   * 
   * @param keywords - Array of search terms
   * @param options - Fetch options (since, limit)
   * @returns Array of raw posts
   * @throws PlatformApiError on failure
   */
  searchPosts(keywords: string[], options: FetchOptions): Promise<RawPost[]>;

  /**
   * Get author details by platform user ID
   * 
   * @param platformUserId - Platform-specific user identifier
   * @returns Author metadata
   * @throws PlatformApiError on failure
   */
  getAuthor(platformUserId: string): Promise<RawAuthor>;

  /**
   * Get platform-specific constraints for response generation
   * 
   * Returns constraints like character limits, formatting support, etc.
   * Used by Response Suggestion feature to ensure generated responses
   * comply with platform rules.
   * 
   * @returns Platform constraints (maxLength, etc.)
   * @see ADR-009: Response Suggestion Architecture
   */
  getConstraints(): PlatformConstraints;

  /**
   * Post a response to a specific opportunity
   * 
   * This method handles platform-specific threading mechanics internally.
   * For example, Bluesky adapter constructs reply.parent and reply.root
   * from the parentPostId.
   * 
   * @param parentPostId - Platform-specific ID of post being replied to
   *                       (e.g., AT URI for Bluesky, Post ID for Reddit)
   * @param responseText - Text content of the response (already validated)
   * @returns Posted response metadata from platform
   * 
   * @throws {PlatformPostingError} Generic posting failure
   * @throws {AuthenticationError} Invalid or expired credentials
   * @throws {RateLimitError} Platform rate limit exceeded (429)
   * @throws {PostNotFoundError} Parent post no longer exists (404)
   * @throws {ContentViolationError} Response violates platform rules
   * 
   * @see ADR-010: Response Draft Posting
   */
  post(parentPostId: string, responseText: string): Promise<PostResult>;
}

