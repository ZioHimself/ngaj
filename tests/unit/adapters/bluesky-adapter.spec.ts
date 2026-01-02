import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlueskyAdapter } from '@/adapters/bluesky-adapter';

// Mock @atproto/api
vi.mock('@atproto/api', () => ({
  BskyAgent: vi.fn()
}));

describe('BlueskyAdapter', () => {
  let adapter: BlueskyAdapter;
  let mockAgent: any;

  beforeEach(() => {
    // Create mock BskyAgent
    mockAgent = {
      listNotifications: vi.fn(),
      getProfile: vi.fn(),
      app: {
        bsky: {
          feed: {
            searchPosts: vi.fn(),
            getPosts: vi.fn()
          }
        }
      }
    };

    adapter = new BlueskyAdapter(mockAgent, 'did:plc:testuser123');
  });

  describe('fetchReplies()', () => {
    it('should fetch and transform reply notifications', async () => {
      // Arrange
      const mockNotifications = {
        data: {
          notifications: [
            {
              reason: 'reply',
              uri: 'at://did:plc:author1/app.bsky.feed.post/reply1',
              indexedAt: '2026-01-01T12:00:00Z'
            },
            {
              reason: 'reply',
              uri: 'at://did:plc:author2/app.bsky.feed.post/reply2',
              indexedAt: '2026-01-01T12:10:00Z'
            }
          ]
        }
      };

      const mockPost1 = {
        uri: 'at://did:plc:author1/app.bsky.feed.post/reply1',
        record: {
          text: 'Great post! I have a question...',
          createdAt: '2026-01-01T11:55:00Z'
        },
        author: {
          did: 'did:plc:author1',
          handle: 'author1.bsky.social'
        },
        likeCount: 5,
        repostCount: 2,
        replyCount: 1
      };

      const mockPost2 = {
        uri: 'at://did:plc:author2/app.bsky.feed.post/reply2',
        record: {
          text: 'Interesting perspective!',
          createdAt: '2026-01-01T12:05:00Z'
        },
        author: {
          did: 'did:plc:author2',
          handle: 'author2.bsky.social'
        },
        likeCount: 10,
        repostCount: 3,
        replyCount: 2
      };

      mockAgent.listNotifications.mockResolvedValue(mockNotifications);
      mockAgent.app.bsky.feed.getPosts
        .mockResolvedValueOnce({ data: { posts: [mockPost1] } })
        .mockResolvedValueOnce({ data: { posts: [mockPost2] } });

      // Act
      const posts = await adapter.fetchReplies({ limit: 100 });

      // Assert
      expect(posts).toHaveLength(2);
      expect(posts[0].id).toBe('at://did:plc:author1/app.bsky.feed.post/reply1');
      expect(posts[0].text).toBe('Great post! I have a question...');
      expect(posts[0].authorId).toBe('did:plc:author1');
      expect(posts[0].likes).toBe(5);
      expect(posts[1].id).toBe('at://did:plc:author2/app.bsky.feed.post/reply2');
    });

    it('should filter replies by since date', async () => {
      // Arrange
      const sinceDate = new Date('2026-01-01T12:00:00Z');
      const mockNotifications = {
        data: {
          notifications: [
            {
              reason: 'reply',
              uri: 'at://did:plc:author1/app.bsky.feed.post/old',
              indexedAt: '2026-01-01T11:00:00Z' // Before since
            },
            {
              reason: 'reply',
              uri: 'at://did:plc:author2/app.bsky.feed.post/new',
              indexedAt: '2026-01-01T12:30:00Z' // After since
            }
          ]
        }
      };

      const mockPost = {
        uri: 'at://did:plc:author2/app.bsky.feed.post/new',
        record: {
          text: 'Recent reply',
          createdAt: '2026-01-01T12:30:00Z'
        },
        author: {
          did: 'did:plc:author2',
          handle: 'author2.bsky.social'
        },
        likeCount: 3,
        repostCount: 1,
        replyCount: 0
      };

      mockAgent.listNotifications.mockResolvedValue(mockNotifications);
      mockAgent.app.bsky.feed.getPosts.mockResolvedValue({ data: { posts: [mockPost] } });

      // Act
      const posts = await adapter.fetchReplies({ since: sinceDate, limit: 100 });

      // Assert
      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe('at://did:plc:author2/app.bsky.feed.post/new');
      expect(mockAgent.app.bsky.feed.getPosts).toHaveBeenCalledTimes(1);
    });

    it('should filter out non-reply notifications', async () => {
      // Arrange
      const mockNotifications = {
        data: {
          notifications: [
            {
              reason: 'like',
              uri: 'at://did:plc:author1/app.bsky.feed.post/like',
              indexedAt: '2026-01-01T12:00:00Z'
            },
            {
              reason: 'reply',
              uri: 'at://did:plc:author2/app.bsky.feed.post/reply',
              indexedAt: '2026-01-01T12:00:00Z'
            },
            {
              reason: 'repost',
              uri: 'at://did:plc:author3/app.bsky.feed.post/repost',
              indexedAt: '2026-01-01T12:00:00Z'
            }
          ]
        }
      };

      const mockPost = {
        uri: 'at://did:plc:author2/app.bsky.feed.post/reply',
        record: {
          text: 'Reply notification',
          createdAt: '2026-01-01T11:55:00Z'
        },
        author: {
          did: 'did:plc:author2',
          handle: 'author2.bsky.social'
        },
        likeCount: 1,
        repostCount: 0,
        replyCount: 0
      };

      mockAgent.listNotifications.mockResolvedValue(mockNotifications);
      mockAgent.app.bsky.feed.getPosts.mockResolvedValue({ data: { posts: [mockPost] } });

      // Act
      const posts = await adapter.fetchReplies({ limit: 100 });

      // Assert
      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe('at://did:plc:author2/app.bsky.feed.post/reply');
    });

    it('should return empty array when no reply notifications', async () => {
      // Arrange
      const mockNotifications = {
        data: {
          notifications: [
            {
              reason: 'like',
              uri: 'at://did:plc:author1/app.bsky.feed.post/like',
              indexedAt: '2026-01-01T12:00:00Z'
            }
          ]
        }
      };

      mockAgent.listNotifications.mockResolvedValue(mockNotifications);

      // Act
      const posts = await adapter.fetchReplies({ limit: 100 });

      // Assert
      expect(posts).toEqual([]);
      expect(mockAgent.app.bsky.feed.getPosts).not.toHaveBeenCalled();
    });

    it('should construct correct Bluesky URLs', async () => {
      // Arrange
      const mockNotifications = {
        data: {
          notifications: [
            {
              reason: 'reply',
              uri: 'at://did:plc:author1/app.bsky.feed.post/xyz789',
              indexedAt: '2026-01-01T12:00:00Z'
            }
          ]
        }
      };

      const mockPost = {
        uri: 'at://did:plc:author1/app.bsky.feed.post/xyz789',
        record: {
          text: 'Test post',
          createdAt: '2026-01-01T11:55:00Z'
        },
        author: {
          did: 'did:plc:author1',
          handle: 'testuser.bsky.social'
        },
        likeCount: 0,
        repostCount: 0,
        replyCount: 0
      };

      mockAgent.listNotifications.mockResolvedValue(mockNotifications);
      mockAgent.app.bsky.feed.getPosts.mockResolvedValue({ data: { posts: [mockPost] } });

      // Act
      const posts = await adapter.fetchReplies({ limit: 100 });

      // Assert
      expect(posts[0].url).toBe('https://bsky.app/profile/testuser.bsky.social/post/xyz789');
    });
  });

  describe('searchPosts()', () => {
    it('should search for multiple keywords and deduplicate results', async () => {
      // Arrange
      const keywords = ['typescript', 'machine learning'];
      const mockResults1 = {
        data: {
          posts: [
            {
              uri: 'at://did:plc:author1/app.bsky.feed.post/ts1',
              record: {
                text: 'TypeScript is great!',
                createdAt: '2026-01-01T12:00:00Z'
              },
              author: {
                did: 'did:plc:author1',
                handle: 'author1.bsky.social'
              },
              likeCount: 10,
              repostCount: 5,
              replyCount: 2,
              indexedAt: '2026-01-01T12:00:00Z'
            },
            {
              uri: 'at://did:plc:author2/app.bsky.feed.post/both',
              record: {
                text: 'TypeScript and ML together',
                createdAt: '2026-01-01T11:00:00Z'
              },
              author: {
                did: 'did:plc:author2',
                handle: 'author2.bsky.social'
              },
              likeCount: 20,
              repostCount: 10,
              replyCount: 5,
              indexedAt: '2026-01-01T11:00:00Z'
            }
          ]
        }
      };

      const mockResults2 = {
        data: {
          posts: [
            {
              uri: 'at://did:plc:author2/app.bsky.feed.post/both', // Duplicate
              record: {
                text: 'TypeScript and ML together',
                createdAt: '2026-01-01T11:00:00Z'
              },
              author: {
                did: 'did:plc:author2',
                handle: 'author2.bsky.social'
              },
              likeCount: 20,
              repostCount: 10,
              replyCount: 5,
              indexedAt: '2026-01-01T11:00:00Z'
            },
            {
              uri: 'at://did:plc:author3/app.bsky.feed.post/ml1',
              record: {
                text: 'Machine learning models',
                createdAt: '2026-01-01T10:00:00Z'
              },
              author: {
                did: 'did:plc:author3',
                handle: 'author3.bsky.social'
              },
              likeCount: 15,
              repostCount: 7,
              replyCount: 3,
              indexedAt: '2026-01-01T10:00:00Z'
            }
          ]
        }
      };

      mockAgent.app.bsky.feed.searchPosts
        .mockResolvedValueOnce(mockResults1)
        .mockResolvedValueOnce(mockResults2);

      // Act
      const posts = await adapter.searchPosts(keywords, { limit: 50 });

      // Assert
      expect(posts).toHaveLength(3); // Duplicate removed
      expect(mockAgent.app.bsky.feed.searchPosts).toHaveBeenCalledTimes(2);
      expect(mockAgent.app.bsky.feed.searchPosts).toHaveBeenCalledWith({
        q: 'typescript',
        limit: 50
      });
      expect(mockAgent.app.bsky.feed.searchPosts).toHaveBeenCalledWith({
        q: 'machine learning',
        limit: 50
      });
    });

    it('should filter search results by since date', async () => {
      // Arrange
      const keywords = ['typescript'];
      const sinceDate = new Date('2026-01-01T12:00:00Z');
      const mockResults = {
        data: {
          posts: [
            {
              uri: 'at://did:plc:author1/app.bsky.feed.post/old',
              record: {
                text: 'Old post about TypeScript',
                createdAt: '2026-01-01T10:00:00Z'
              },
              author: {
                did: 'did:plc:author1',
                handle: 'author1.bsky.social'
              },
              likeCount: 5,
              repostCount: 2,
              replyCount: 1,
              indexedAt: '2026-01-01T10:00:00Z' // Before since
            },
            {
              uri: 'at://did:plc:author2/app.bsky.feed.post/new',
              record: {
                text: 'New post about TypeScript',
                createdAt: '2026-01-01T13:00:00Z'
              },
              author: {
                did: 'did:plc:author2',
                handle: 'author2.bsky.social'
              },
              likeCount: 10,
              repostCount: 5,
              replyCount: 2,
              indexedAt: '2026-01-01T13:00:00Z' // After since
            }
          ]
        }
      };

      mockAgent.app.bsky.feed.searchPosts.mockResolvedValue(mockResults);

      // Act
      const posts = await adapter.searchPosts(keywords, { since: sinceDate, limit: 50 });

      // Assert
      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe('at://did:plc:author2/app.bsky.feed.post/new');
    });

    it('should return empty array when no search results', async () => {
      // Arrange
      const keywords = ['veryrarekeyword123'];
      const mockResults = {
        data: {
          posts: []
        }
      };

      mockAgent.app.bsky.feed.searchPosts.mockResolvedValue(mockResults);

      // Act
      const posts = await adapter.searchPosts(keywords, { limit: 50 });

      // Assert
      expect(posts).toEqual([]);
    });

    it('should handle empty keywords array', async () => {
      // Arrange
      const keywords: string[] = [];

      // Act
      const posts = await adapter.searchPosts(keywords, { limit: 50 });

      // Assert
      expect(posts).toEqual([]);
      expect(mockAgent.app.bsky.feed.searchPosts).not.toHaveBeenCalled();
    });

    it('should transform posts with all required fields', async () => {
      // Arrange
      const keywords = ['test'];
      const mockResults = {
        data: {
          posts: [
            {
              uri: 'at://did:plc:author1/app.bsky.feed.post/post123',
              record: {
                text: 'Test post content',
                createdAt: '2026-01-01T12:00:00Z'
              },
              author: {
                did: 'did:plc:author1',
                handle: 'testauthor.bsky.social'
              },
              likeCount: 42,
              repostCount: 13,
              replyCount: 7,
              indexedAt: '2026-01-01T12:00:00Z'
            }
          ]
        }
      };

      mockAgent.app.bsky.feed.searchPosts.mockResolvedValue(mockResults);

      // Act
      const posts = await adapter.searchPosts(keywords, { limit: 50 });

      // Assert
      expect(posts[0]).toEqual({
        id: 'at://did:plc:author1/app.bsky.feed.post/post123',
        url: 'https://bsky.app/profile/testauthor.bsky.social/post/post123',
        text: 'Test post content',
        createdAt: new Date('2026-01-01T12:00:00Z'),
        authorId: 'did:plc:author1',
        likes: 42,
        reposts: 13,
        replies: 7
      });
    });
  });

  describe('getAuthor()', () => {
    it('should fetch and transform author profile', async () => {
      // Arrange
      const mockProfile = {
        data: {
          did: 'did:plc:author123',
          handle: 'testauthor.bsky.social',
          displayName: 'Test Author',
          description: 'Software engineer and tech enthusiast',
          followersCount: 1234
        }
      };

      mockAgent.getProfile.mockResolvedValue(mockProfile);

      // Act
      const author = await adapter.getAuthor('did:plc:author123');

      // Assert
      expect(author).toEqual({
        id: 'did:plc:author123',
        handle: '@testauthor.bsky.social',
        displayName: 'Test Author',
        bio: 'Software engineer and tech enthusiast',
        followerCount: 1234
      });
      expect(mockAgent.getProfile).toHaveBeenCalledWith({ actor: 'did:plc:author123' });
    });

    it('should handle missing bio gracefully', async () => {
      // Arrange
      const mockProfile = {
        data: {
          did: 'did:plc:author123',
          handle: 'testauthor.bsky.social',
          displayName: 'Test Author',
          description: undefined,
          followersCount: 100
        }
      };

      mockAgent.getProfile.mockResolvedValue(mockProfile);

      // Act
      const author = await adapter.getAuthor('did:plc:author123');

      // Assert
      expect(author.bio).toBeUndefined();
    });

    it('should handle missing display name by using handle', async () => {
      // Arrange
      const mockProfile = {
        data: {
          did: 'did:plc:author123',
          handle: 'testauthor.bsky.social',
          displayName: undefined,
          description: 'Bio text',
          followersCount: 100
        }
      };

      mockAgent.getProfile.mockResolvedValue(mockProfile);

      // Act
      const author = await adapter.getAuthor('did:plc:author123');

      // Assert
      expect(author.displayName).toBe('testauthor.bsky.social');
    });

    it('should default follower count to 0 if missing', async () => {
      // Arrange
      const mockProfile = {
        data: {
          did: 'did:plc:author123',
          handle: 'testauthor.bsky.social',
          displayName: 'Test Author',
          description: 'Bio',
          followersCount: undefined
        }
      };

      mockAgent.getProfile.mockResolvedValue(mockProfile);

      // Act
      const author = await adapter.getAuthor('did:plc:author123');

      // Assert
      expect(author.followerCount).toBe(0);
    });

    it('should prepend @ to handle if not present', async () => {
      // Arrange
      const mockProfile = {
        data: {
          did: 'did:plc:author123',
          handle: 'testauthor.bsky.social', // No @ prefix
          displayName: 'Test Author',
          followersCount: 100
        }
      };

      mockAgent.getProfile.mockResolvedValue(mockProfile);

      // Act
      const author = await adapter.getAuthor('did:plc:author123');

      // Assert
      expect(author.handle).toBe('@testauthor.bsky.social');
    });
  });

  describe('Error Handling', () => {
    it('should throw RateLimitError on 429 response', async () => {
      // Arrange
      const error = {
        status: 429,
        message: 'Rate Limit Exceeded',
        headers: {
          'retry-after': '60'
        }
      };

      mockAgent.listNotifications.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.fetchReplies({ limit: 100 })).rejects.toThrow('Rate');
    });

    it('should throw PlatformApiError on network error', async () => {
      // Arrange
      const error = new Error('Network error');
      mockAgent.listNotifications.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.fetchReplies({ limit: 100 })).rejects.toThrow();
    });

    it('should throw AuthenticationError on 401 response', async () => {
      // Arrange
      const error = {
        status: 401,
        message: 'Unauthorized'
      };

      mockAgent.getProfile.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.getAuthor('did:plc:test')).rejects.toThrow();
    });
  });
});

