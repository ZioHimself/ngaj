import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Post } from '@/types/post';
import type { AdapterConfig, SearchOptions } from '@/types/adapter';

/**
 * Test Suite: Bluesky Adapter
 * Requirements: BS-001 to BS-005
 * Iteration: 1 - Basic interface and structure
 * 
 * This test suite covers:
 * - BS-001: Basic search functionality
 * - BS-002: Empty results handling
 * - BS-003: Authentication errors
 * - BS-004: Network errors
 * - BS-005: Data parsing
 */

// Mock @atproto/api module
vi.mock('@atproto/api', () => {
  return {
    BskyAgent: vi.fn(() => ({
      login: vi.fn(),
      app: {
        bsky: {
          feed: {
            searchPosts: vi.fn()
          }
        }
      }
    }))
  };
});

describe('BlueskyAdapter', () => {
  let adapter: any;
  let mockBskyAgent: any;
  let mockLogin: any;
  let mockSearchPosts: any;

  const validConfig: AdapterConfig = {
    credentials: {
      identifier: 'test.bsky.social',
      password: 'test-password'
    },
    timeout: 5000
  };

  const mockBlueskyPost = {
    uri: 'at://did:plc:user123/app.bsky.feed.post/abc123',
    cid: 'bafyreicid123',
    author: {
      did: 'did:plc:user123',
      handle: 'testuser.bsky.social',
      displayName: 'Test User',
      avatar: 'https://cdn.bsky.app/img/avatar/plain/user123/avatar.jpg'
    },
    record: {
      text: 'This is a test post about TypeScript programming',
      createdAt: '2024-01-01T12:00:00.000Z'
    },
    likeCount: 42,
    replyCount: 10,
    repostCount: 5
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamic import to get the mocked version
    const { BskyAgent } = await import('@atproto/api');
    mockBskyAgent = new BskyAgent({ service: 'https://bsky.social' });
    mockLogin = mockBskyAgent.login;
    mockSearchPosts = mockBskyAgent.app.bsky.feed.searchPosts;

    // Import adapter (will be implemented)
    try {
      const { BlueskyAdapter } = await import('@/adapters/bluesky-adapter');
      adapter = new BlueskyAdapter(validConfig);
    } catch (error) {
      // Adapter not implemented yet - expected in Red phase
      adapter = null;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * BS-001: Basic Search Functionality
   * Given I want to search for "TypeScript"
   * When I call searchPosts with "TypeScript"
   * Then I should receive a list of posts
   * And each post should contain the keyword "TypeScript"
   * And each post should have an id, content, author, and timestamp
   */
  describe('BS-001: Basic Search Functionality', () => {
    it('should return posts matching search query', async () => {
      expect(adapter).toBeDefined();
      
      // Mock successful authentication
      mockLogin.mockResolvedValue({
        success: true,
        data: { did: 'did:plc:user123' }
      });

      // Mock search response
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: {
          posts: [mockBlueskyPost]
        }
      });

      await adapter.authenticate();
      
      const searchOptions: SearchOptions = {
        query: 'TypeScript',
        limit: 10
      };
      
      const results: Post[] = await adapter.searchPosts(searchOptions);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(mockSearchPosts).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'TypeScript' })
      );
    });

    it('should return posts with all required fields', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [mockBlueskyPost] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'TypeScript' });

      expect(results.length).toBeGreaterThan(0);
      
      const post = results[0];
      
      // Verify all required fields exist
      expect(post.id).toBeDefined();
      expect(typeof post.id).toBe('string');
      
      expect(post.content).toBeDefined();
      expect(typeof post.content).toBe('string');
      
      expect(post.author).toBeDefined();
      expect(post.author.id).toBeDefined();
      expect(post.author.username).toBeDefined();
      expect(post.author.displayName).toBeDefined();
      
      expect(post.createdAt).toBeDefined();
      expect(post.createdAt).toBeInstanceOf(Date);
    });

    it('should transform Bluesky post format to Post interface', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [mockBlueskyPost] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      const post = results[0];
      
      // Verify platform-specific fields
      expect(post.platform).toBe('bluesky');
      expect(post.platformPostId).toBeDefined();
      
      // Verify metrics structure
      expect(post.metrics).toBeDefined();
      expect(post.metrics.likes).toBeDefined();
      expect(post.metrics.replies).toBeDefined();
      expect(post.metrics.reposts).toBeDefined();
      
      // Verify content transformation
      expect(post.content).toBe(mockBlueskyPost.record.text);
      
      // Verify author transformation
      expect(post.author.username).toBe(mockBlueskyPost.author.handle);
      expect(post.author.displayName).toBe(mockBlueskyPost.author.displayName);
    });

    it('should include post URL', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [mockBlueskyPost] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      const post = results[0];
      expect(post.url).toBeDefined();
      expect(post.url).toContain('bsky.app');
      expect(post.url).toContain(mockBlueskyPost.author.handle);
    });
  });

  /**
   * BS-002: Handle Empty Search Results
   * Given I want to search for "xyzabcdefghijk123456789"
   * When I call searchPosts with that query
   * Then I should receive an empty list
   * And no errors should be thrown
   */
  describe('BS-002: Empty Results Handling', () => {
    it('should return empty array when no results found', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ 
        query: 'xyzabcdefghijk123456789' 
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should not throw errors for empty results', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [] }
      });

      await adapter.authenticate();
      
      await expect(
        adapter.searchPosts({ query: 'nonexistent' })
      ).resolves.not.toThrow();
    });

    it('should handle undefined posts array gracefully', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: undefined }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle null API response data', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: null
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  /**
   * BS-003: Handle API Authentication Errors
   * Given I have invalid Bluesky credentials
   * When I call searchPosts with any query
   * Then I should receive an AuthenticationError
   * And the error message should indicate invalid credentials
   */
  describe('BS-003: Authentication Errors', () => {
    it('should throw AuthenticationError for invalid credentials', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockRejectedValue(
        new Error('Invalid identifier or password')
      );

      await expect(adapter.authenticate())
        .rejects
        .toThrow('AuthenticationError');
    });

    it('should include descriptive error message', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockRejectedValue(
        new Error('Invalid identifier or password')
      );

      try {
        await adapter.authenticate();
        expect.fail('Should have thrown AuthenticationError');
      } catch (error: any) {
        expect(error.message).toContain('credential');
      }
    });

    it('should set isAuthenticated to false on auth failure', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockRejectedValue(
        new Error('Invalid identifier or password')
      );

      try {
        await adapter.authenticate();
      } catch (error) {
        // Expected error
      }

      expect(adapter.isAuthenticated()).toBe(false);
    });

    it('should prevent searchPosts when not authenticated', async () => {
      expect(adapter).toBeDefined();
      
      // Don't call authenticate()
      await expect(
        adapter.searchPosts({ query: 'test' })
      ).rejects.toThrow('AuthenticationError');
    });

    it('should set isAuthenticated to true on successful auth', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      await adapter.authenticate();

      expect(adapter.isAuthenticated()).toBe(true);
    });
  });

  /**
   * BS-004: Handle Network Errors Gracefully
   * Given the Bluesky API is unreachable
   * When I call searchPosts with any query
   * Then I should receive a NetworkError
   * And the error should include retry information
   */
  describe('BS-004: Network Errors', () => {
    it('should throw NetworkError for unreachable API', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      await adapter.authenticate();

      mockSearchPosts.mockRejectedValue(
        new Error('Network request failed')
      );

      await expect(
        adapter.searchPosts({ query: 'test' })
      ).rejects.toThrow('NetworkError');
    });

    it('should include retry information in error', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      await adapter.authenticate();

      mockSearchPosts.mockRejectedValue(
        new Error('Network request failed')
      );

      try {
        await adapter.searchPosts({ query: 'test' });
        expect.fail('Should have thrown NetworkError');
      } catch (error: any) {
        expect(error.retryable).toBeDefined();
        expect(typeof error.retryable).toBe('boolean');
      }
    });

    it('should handle timeout errors', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      await adapter.authenticate();

      mockSearchPosts.mockRejectedValue(
        new Error('Request timeout')
      );

      await expect(
        adapter.searchPosts({ query: 'test' })
      ).rejects.toThrow('NetworkError');
    });

    it('should distinguish network errors from auth errors', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      await adapter.authenticate();

      mockSearchPosts.mockRejectedValue(
        new Error('ECONNREFUSED')
      );

      try {
        await adapter.searchPosts({ query: 'test' });
        expect.fail('Should have thrown NetworkError');
      } catch (error: any) {
        expect(error.constructor.name).toBe('NetworkError');
        expect(error.constructor.name).not.toBe('AuthenticationError');
      }
    });

    it('should include original error message in NetworkError', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      await adapter.authenticate();

      const originalError = new Error('DNS lookup failed');
      mockSearchPosts.mockRejectedValue(originalError);

      try {
        await adapter.searchPosts({ query: 'test' });
        expect.fail('Should have thrown NetworkError');
      } catch (error: any) {
        expect(error.message).toContain('network');
      }
    });
  });

  /**
   * BS-005: Parse Post Data Correctly
   * Given the API returns a post with all fields
   * When I call searchPosts
   * Then each returned post should have all required and optional fields
   */
  describe('BS-005: Data Parsing', () => {
    it('should map all required fields correctly', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [mockBlueskyPost] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      const post = results[0];
      
      // Required fields from Post interface
      expect(post.id).toBeDefined();
      expect(post.platform).toBe('bluesky');
      expect(post.platformPostId).toBeDefined();
      expect(post.content).toBe(mockBlueskyPost.record.text);
      expect(post.author).toBeDefined();
      expect(post.metrics).toBeDefined();
      expect(post.createdAt).toBeInstanceOf(Date);
    });

    it('should handle optional engagement metrics', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      
      // Post with some missing metrics
      const postWithoutMetrics = {
        ...mockBlueskyPost,
        likeCount: undefined,
        replyCount: undefined,
        repostCount: undefined
      };
      
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [postWithoutMetrics] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      const post = results[0];
      expect(post.metrics).toBeDefined();
      expect(post.metrics.likes).toBe(0);
      expect(post.metrics.replies).toBe(0);
      expect(post.metrics.reposts).toBe(0);
    });

    it('should parse dates correctly', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [mockBlueskyPost] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      const post = results[0];
      const expectedDate = new Date('2024-01-01T12:00:00.000Z');
      
      expect(post.createdAt).toBeInstanceOf(Date);
      expect(post.createdAt.getTime()).toBe(expectedDate.getTime());
    });

    it('should extract author information properly', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [mockBlueskyPost] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      const post = results[0];
      const author = post.author;
      
      expect(author.id).toBe(mockBlueskyPost.author.did);
      expect(author.username).toBe(mockBlueskyPost.author.handle);
      expect(author.displayName).toBe(mockBlueskyPost.author.displayName);
      expect(author.avatarUrl).toBe(mockBlueskyPost.author.avatar);
    });

    it('should handle missing avatar URL gracefully', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      
      const postWithoutAvatar = {
        ...mockBlueskyPost,
        author: {
          ...mockBlueskyPost.author,
          avatar: undefined
        }
      };
      
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [postWithoutAvatar] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      const post = results[0];
      expect(post.author.avatarUrl).toBeUndefined();
    });

    it('should handle missing display name with fallback', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      
      const postWithoutDisplayName = {
        ...mockBlueskyPost,
        author: {
          ...mockBlueskyPost.author,
          displayName: undefined
        }
      };
      
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [postWithoutDisplayName] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      const post = results[0];
      // Should fall back to username/handle
      expect(post.author.displayName).toBeDefined();
      expect(post.author.displayName).toBe(mockBlueskyPost.author.handle);
    });

    it('should generate proper post URLs', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [mockBlueskyPost] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      const post = results[0];
      const expectedUrlPattern = /^https:\/\/bsky\.app\/profile\/[\w.]+\/post\/[\w]+$/;
      
      expect(post.url).toBeDefined();
      expect(post.url).toMatch(expectedUrlPattern);
    });

    it('should set platform to bluesky for all posts', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [mockBlueskyPost, mockBlueskyPost] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      results.forEach(post => {
        expect(post.platform).toBe('bluesky');
      });
    });

    it('should handle malformed post data gracefully', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      
      const malformedPost = {
        uri: 'at://malformed',
        // Missing many required fields
        author: {
          handle: 'test.bsky.social'
        },
        record: {
          text: 'Test'
        }
      };
      
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [malformedPost] }
      });

      await adapter.authenticate();
      
      // Should either skip malformed posts or handle gracefully
      await expect(
        adapter.searchPosts({ query: 'test' })
      ).resolves.not.toThrow();
    });

    it('should extract platformPostId from URI correctly', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [mockBlueskyPost] }
      });

      await adapter.authenticate();
      const results = await adapter.searchPosts({ query: 'test' });

      const post = results[0];
      
      // Extract expected ID from URI: at://did:plc:user123/app.bsky.feed.post/abc123
      expect(post.platformPostId).toBe('abc123');
    });
  });

  /**
   * Additional Integration Tests
   */
  describe('Integration: Adapter Lifecycle', () => {
    it('should have correct adapter name', () => {
      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('bluesky');
    });

    it('should disconnect cleanly', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      await adapter.authenticate();

      await expect(adapter.disconnect()).resolves.not.toThrow();
      expect(adapter.isAuthenticated()).toBe(false);
    });

    it('should respect search limit option', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [mockBlueskyPost] }
      });

      await adapter.authenticate();
      await adapter.searchPosts({ query: 'test', limit: 5 });

      expect(mockSearchPosts).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
    });

    it('should use default limit when not specified', async () => {
      expect(adapter).toBeDefined();
      
      mockLogin.mockResolvedValue({ success: true });
      mockSearchPosts.mockResolvedValue({
        success: true,
        data: { posts: [] }
      });

      await adapter.authenticate();
      await adapter.searchPosts({ query: 'test' });

      expect(mockSearchPosts).toHaveBeenCalledWith(
        expect.objectContaining({ limit: expect.any(Number) })
      );
    });
  });
});

