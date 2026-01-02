import type { RawPost, RawAuthor } from '@/tests/fixtures/opportunity-fixtures';

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
}

