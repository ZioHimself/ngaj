import type { BskyAgent } from '@atproto/api';
import type { IPlatformAdapter, FetchOptions } from './platform-adapter';
import type { RawPost, RawAuthor } from '@/tests/fixtures/opportunity-fixtures';

/**
 * Bluesky platform adapter implementation
 * 
 * Implements the IPlatformAdapter interface for Bluesky using the AT Protocol API.
 * Transforms Bluesky-specific responses into the common RawPost/RawAuthor format.
 * 
 * @see ADR-008: Opportunity Discovery Architecture
 */
export class BlueskyAdapter implements IPlatformAdapter {
  constructor(
    private agent: BskyAgent,
    private userDid: string
  ) {}

  /**
   * Fetch replies to authenticated user's posts from Bluesky notifications
   * 
   * @param options - Fetch options (since, limit)
   * @returns Array of reply posts
   */
  async fetchReplies(options: FetchOptions): Promise<RawPost[]> {
    throw new Error('Not implemented');
  }

  /**
   * Search Bluesky for posts matching keywords
   * 
   * @param keywords - Array of search terms
   * @param options - Fetch options (since, limit)
   * @returns Array of matching posts (deduplicated)
   */
  async searchPosts(keywords: string[], options: FetchOptions): Promise<RawPost[]> {
    throw new Error('Not implemented');
  }

  /**
   * Get Bluesky author profile by DID
   * 
   * @param platformUserId - Bluesky DID (e.g., "did:plc:abc123")
   * @returns Author profile data
   */
  async getAuthor(platformUserId: string): Promise<RawAuthor> {
    throw new Error('Not implemented');
  }
}

