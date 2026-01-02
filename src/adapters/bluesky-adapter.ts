import type { BskyAgent } from '@atproto/api';
import type { IPlatformAdapter, FetchOptions } from './platform-adapter';
import type { RawPost, RawAuthor } from '@/shared/types/opportunity';

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
    const limit = options.limit || 100;
    const since = options.since;

    // Fetch notifications
    const { data } = await this.agent.listNotifications({ limit });

    // Filter for reply notifications after 'since' date
    const replyNotifications = data.notifications.filter((notif: any) => {
      if (notif.reason !== 'reply') return false;
      if (since) {
        const notifDate = new Date(notif.indexedAt);
        if (notifDate < since) return false;
      }
      return true;
    });

    // Fetch full post data for each reply
    const posts: RawPost[] = [];
    for (const notif of replyNotifications) {
      try {
        const postData = await this.agent.getPost({ uri: notif.uri });
        const post = this.transformPost(postData.data);
        posts.push(post);
      } catch (error) {
        // Skip posts that can't be fetched
        console.error(`Failed to fetch post ${notif.uri}:`, error);
      }
    }

    return posts;
  }

  /**
   * Search Bluesky for posts matching keywords
   * 
   * @param keywords - Array of search terms
   * @param options - Fetch options (since, limit)
   * @returns Array of matching posts (deduplicated)
   */
  async searchPosts(keywords: string[], options: FetchOptions): Promise<RawPost[]> {
    if (keywords.length === 0) {
      return [];
    }

    const limit = options.limit || 100;
    const since = options.since;

    // Search for each keyword
    const allPosts: RawPost[] = [];
    const seenIds = new Set<string>();

    for (const keyword of keywords) {
      try {
        const { data } = await this.agent.app.bsky.feed.searchPosts({
          q: keyword,
          limit
        });

        for (const post of data.posts) {
          // Filter by since date if provided
          if (since) {
            const postDate = new Date(post.record.createdAt);
            if (postDate < since) continue;
          }

          // Deduplicate
          if (seenIds.has(post.uri)) continue;
          seenIds.add(post.uri);

          allPosts.push(this.transformSearchPost(post));
        }
      } catch (error) {
        console.error(`Search failed for keyword "${keyword}":`, error);
      }
    }

    return allPosts;
  }

  /**
   * Get Bluesky author profile by DID
   * 
   * @param platformUserId - Bluesky DID (e.g., "did:plc:abc123")
   * @returns Author profile data
   */
  async getAuthor(platformUserId: string): Promise<RawAuthor> {
    const { data } = await this.agent.getProfile({ actor: platformUserId });

    return {
      id: data.did,
      handle: this.normalizeHandle(data.handle),
      displayName: data.displayName || data.handle,
      bio: data.description,
      followerCount: data.followersCount || 0
    };
  }

  /**
   * Transform Bluesky post from getPost() response
   */
  private transformPost(post: any): RawPost {
    const postId = post.uri.split('/').pop();
    const authorHandle = post.author.handle;
    
    return {
      id: post.uri,
      url: `https://bsky.app/profile/${authorHandle}/post/${postId}`,
      text: post.record.text,
      createdAt: new Date(post.record.createdAt),
      authorId: post.author.did,
      likes: post.likeCount || 0,
      reposts: post.repostCount || 0,
      replies: post.replyCount || 0
    };
  }

  /**
   * Transform Bluesky post from searchPosts() response
   */
  private transformSearchPost(post: any): RawPost {
    const postId = post.uri.split('/').pop();
    const authorHandle = post.author.handle;
    
    return {
      id: post.uri,
      url: `https://bsky.app/profile/${authorHandle}/post/${postId}`,
      text: post.record.text,
      createdAt: new Date(post.record.createdAt),
      authorId: post.author.did,
      likes: post.likeCount || 0,
      reposts: post.repostCount || 0,
      replies: post.replyCount || 0
    };
  }

  /**
   * Normalize handle to include @ prefix
   */
  private normalizeHandle(handle: string): string {
    return handle.startsWith('@') ? handle : `@${handle}`;
  }
}

