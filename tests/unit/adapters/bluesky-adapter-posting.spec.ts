import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlueskyAdapter } from '@ngaj/backend/adapters/bluesky-adapter';
import {
  AuthenticationError,
  RateLimitError,
  PostNotFoundError,
  PlatformPostingError
} from '@ngaj/shared';
import type { BskyAgent } from '@atproto/api';

describe('BlueskyAdapter', () => {
  let adapter: BlueskyAdapter;
  let mockAgent: any;

  beforeEach(() => {
    // Mock BskyAgent
    mockAgent = {
      post: vi.fn(),
      getPostThread: vi.fn(),
      getProfile: vi.fn()
    };

    adapter = new BlueskyAdapter(mockAgent as unknown as BskyAgent);
  });

  describe('post()', () => {
    describe('Happy Path', () => {
      it('should post response and return valid PostResult', async () => {
        const parentPostId = 'at://did:plc:parent123.../app.bsky.feed.post/abc123';
        const responseText = 'Great point! I agree with your analysis.';
        const handle = 'user.bsky.social';

        // Mock getPostThread (fetch parent)
        mockAgent.getPostThread.mockResolvedValue({
          data: {
            thread: {
              post: {
                uri: parentPostId,
                cid: 'parent-cid-123',
                record: {} // Root post (no reply in record)
              }
            }
          }
        });

        // Mock post (create response)
        mockAgent.post.mockResolvedValue({
          uri: 'at://did:plc:user456.../app.bsky.feed.post/xyz789',
          cid: 'response-cid-789',
          createdAt: '2026-01-04T12:00:00.000Z'
        });

        // Mock session to get handle
        (mockAgent as any).session = { handle };

        // Act
        const result = await adapter.post(parentPostId, responseText);

        // Assert
        expect(result).toBeDefined();
        expect(result.postId).toBe('at://did:plc:user456.../app.bsky.feed.post/xyz789');
        expect(result.postUrl).toMatch(/https:\/\/bsky\.app\/profile\/.+\/post\//);
        expect(result.postedAt).toBeInstanceOf(Date);
        expect(result.postedAt.toISOString()).toBe('2026-01-04T12:00:00.000Z');

        // Verify agent.post was called with correct parameters
        expect(mockAgent.post).toHaveBeenCalledWith({
          text: responseText,
          reply: {
            parent: {
              uri: parentPostId,
              cid: 'parent-cid-123'
            },
            root: {
              uri: parentPostId,
              cid: 'parent-cid-123'
            }
          }
        });
      });

      it('should use platform timestamp (not local)', async () => {
        const parentPostId = 'at://did:plc:parent.../post/123';
        const platformTimestamp = '2026-01-04T15:30:45.123Z';

        mockAgent.getPostThread.mockResolvedValue({
          data: {
            thread: {
              post: {
                uri: parentPostId,
                cid: 'cid-123',
                record: {}
              }
            }
          }
        });

        mockAgent.post.mockResolvedValue({
          uri: 'at://did:plc:user.../post/456',
          cid: 'cid-456',
          createdAt: platformTimestamp
        });

        (mockAgent as any).session = { handle: 'user.bsky.social' };

        const result = await adapter.post(parentPostId, 'Response text');

        expect(result.postedAt).toEqual(new Date(platformTimestamp));
        expect(result.postedAt.getTime()).toBe(new Date(platformTimestamp).getTime());
      });
    });

    describe('Threading', () => {
      it('should construct reply threading for root post', async () => {
        const parentPostId = 'at://did:plc:alice.../app.bsky.feed.post/root123';
        const responseText = 'Great post!';

        mockAgent.getPostThread.mockResolvedValue({
          data: {
            thread: {
              post: {
                uri: parentPostId,
                cid: 'root-cid-123',
                record: {} // This IS the root (no reply in record)
              }
            }
          }
        });

        mockAgent.post.mockResolvedValue({
          uri: 'at://did:plc:bob.../app.bsky.feed.post/reply456',
          cid: 'reply-cid-456',
          createdAt: '2026-01-04T12:00:00Z'
        });

        (mockAgent as any).session = { handle: 'bob.bsky.social' };

        await adapter.post(parentPostId, responseText);

        // Verify threading: both parent and root point to same post
        expect(mockAgent.post).toHaveBeenCalledWith({
          text: responseText,
          reply: {
            parent: {
              uri: parentPostId,
              cid: 'root-cid-123'
            },
            root: {
              uri: parentPostId,
              cid: 'root-cid-123'
            }
          }
        });
      });

      it('should construct reply threading for post in existing thread', async () => {
        const rootPostId = 'at://did:plc:alice.../app.bsky.feed.post/root123';
        const parentPostId = 'at://did:plc:bob.../app.bsky.feed.post/reply456';
        const responseText = 'I agree with both of you!';

        // Parent post is itself a reply (part of existing thread)
        mockAgent.getPostThread.mockResolvedValue({
          data: {
            thread: {
              post: {
                uri: parentPostId,
                cid: 'parent-cid-456',
                record: {
                  reply: {
                    root: {
                      uri: rootPostId,
                      cid: 'root-cid-123'
                    },
                    parent: {
                      uri: 'at://did:plc:alice.../post/original',
                      cid: 'original-cid'
                    }
                  }
                }
              }
            }
          }
        });

        mockAgent.post.mockResolvedValue({
          uri: 'at://did:plc:carol.../app.bsky.feed.post/reply789',
          cid: 'reply-cid-789',
          createdAt: '2026-01-04T12:00:00Z'
        });

        (mockAgent as any).session = { handle: 'carol.bsky.social' };

        await adapter.post(parentPostId, responseText);

        // Verify threading: parent = immediate parent, root = thread root
        expect(mockAgent.post).toHaveBeenCalledWith({
          text: responseText,
          reply: {
            parent: {
              uri: parentPostId,
              cid: 'parent-cid-456'
            },
            root: {
              uri: rootPostId,
              cid: 'root-cid-123'
            }
          }
        });
      });
    });

    describe('URL Construction', () => {
      it('should construct platformPostUrl correctly', async () => {
        const handle = 'testuser.bsky.social';
        const postUri = 'at://did:plc:abc.../app.bsky.feed.post/3l2uuuyqkb22a';

        mockAgent.getPostThread.mockResolvedValue({
          data: {
            thread: {
              post: {
                uri: 'at://did:plc:parent.../post/123',
                cid: 'cid-123',
                record: {}
              }
            }
          }
        });

        mockAgent.post.mockResolvedValue({
          uri: postUri,
          cid: 'cid-456',
          createdAt: '2026-01-04T12:00:00Z'
        });

        (mockAgent as any).session = { handle };

        const result = await adapter.post('at://parent', 'Response');

        expect(result.postUrl).toBe(
          'https://bsky.app/profile/testuser.bsky.social/post/3l2uuuyqkb22a'
        );
      });

      it('should handle special characters in handle', async () => {
        const handle = 'user-name.test.bsky.social'; // Hyphens, multiple dots
        const postUri = 'at://did:plc:abc.../app.bsky.feed.post/xyz789';

        mockAgent.getPostThread.mockResolvedValue({
          data: {
            thread: {
              post: { uri: 'at://parent', cid: 'cid-123', record: {} }
            }
          }
        });

        mockAgent.post.mockResolvedValue({
          uri: postUri,
          cid: 'cid-456',
          createdAt: '2026-01-04T12:00:00Z'
        });

        (mockAgent as any).session = { handle };

        const result = await adapter.post('at://parent', 'Response');

        expect(result.postUrl).toContain('user-name.test.bsky.social');
        expect(result.postUrl).toMatch(/^https:\/\/bsky\.app\/profile\//);
      });
    });

    describe('Unicode and Emoji Support', () => {
      it('should handle Unicode and emoji in response text', async () => {
        const responseText = '🚀 Great point! 你好 Let\'s collaborate 💡';

        mockAgent.getPostThread.mockResolvedValue({
          data: {
            thread: {
              post: { uri: 'at://parent', cid: 'cid-123', record: {} }
            }
          }
        });

        mockAgent.post.mockResolvedValue({
          uri: 'at://did:plc:user.../post/abc',
          cid: 'cid-abc',
          createdAt: '2026-01-04T12:00:00Z'
        });

        (mockAgent as any).session = { handle: 'user.bsky.social' };

        await adapter.post('at://parent', responseText);

        // Verify text is passed through unchanged
        expect(mockAgent.post).toHaveBeenCalledWith(
          expect.objectContaining({
            text: responseText
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should throw AuthenticationError on 401', async () => {
        const authError = new Error('Invalid token');
        (authError as any).status = 401;

        mockAgent.getPostThread.mockRejectedValue(authError);

        await expect(
          adapter.post('at://parent', 'Response')
        ).rejects.toThrow(AuthenticationError);

        try {
          await adapter.post('at://parent', 'Response');
        } catch (error) {
          expect(error).toBeInstanceOf(AuthenticationError);
          const authErr = error as AuthenticationError;
          expect(authErr.platform).toBe('bluesky');
          expect(authErr.retryable).toBe(false);
        }
      });

      it('should throw RateLimitError on 429', async () => {
        const rateLimitError = new Error('Rate limit exceeded');
        (rateLimitError as any).status = 429;
        (rateLimitError as any).headers = {
          'ratelimit-reset': '300' // 5 minutes
        };

        mockAgent.post.mockRejectedValue(rateLimitError);

        mockAgent.getPostThread.mockResolvedValue({
          data: {
            thread: {
              post: { uri: 'at://parent', cid: 'cid-123', record: {} }
            }
          }
        });

        await expect(
          adapter.post('at://parent', 'Response')
        ).rejects.toThrow(RateLimitError);

        try {
          await adapter.post('at://parent', 'Response');
        } catch (error) {
          expect(error).toBeInstanceOf(RateLimitError);
          const rateErr = error as RateLimitError;
          expect(rateErr.platform).toBe('bluesky');
          expect(rateErr.retryable).toBe(true);
          expect(rateErr.retryAfter).toBeGreaterThan(0);
        }
      });

      it('should throw PostNotFoundError on 404', async () => {
        const notFoundError = new Error('Post not found');
        (notFoundError as any).status = 404;

        mockAgent.getPostThread.mockRejectedValue(notFoundError);

        const parentPostId = 'at://did:plc:abc.../post/deleted';

        await expect(
          adapter.post(parentPostId, 'Response')
        ).rejects.toThrow(PostNotFoundError);

        try {
          await adapter.post(parentPostId, 'Response');
        } catch (error) {
          expect(error).toBeInstanceOf(PostNotFoundError);
          const notFoundErr = error as PostNotFoundError;
          expect(notFoundErr.platform).toBe('bluesky');
          expect(notFoundErr.retryable).toBe(false);
          expect(notFoundErr.postId).toBe(parentPostId);
        }
      });

      it('should throw PlatformPostingError on network timeout', async () => {
        const timeoutError = new Error('ETIMEDOUT');
        (timeoutError as any).code = 'ETIMEDOUT';

        mockAgent.post.mockRejectedValue(timeoutError);

        mockAgent.getPostThread.mockResolvedValue({
          data: {
            thread: {
              post: { uri: 'at://parent', cid: 'cid-123', record: {} }
            }
          }
        });

        await expect(
          adapter.post('at://parent', 'Response')
        ).rejects.toThrow(PlatformPostingError);

        try {
          await adapter.post('at://parent', 'Response');
        } catch (error) {
          expect(error).toBeInstanceOf(PlatformPostingError);
          const platformErr = error as PlatformPostingError;
          expect(platformErr.platform).toBe('bluesky');
          expect(platformErr.retryable).toBe(true);
          expect(platformErr.message).toMatch(/timeout|network/i);
        }
      });

      it('should throw PlatformPostingError on connection refused', async () => {
        const connError = new Error('ECONNREFUSED');
        (connError as any).code = 'ECONNREFUSED';

        mockAgent.post.mockRejectedValue(connError);

        mockAgent.getPostThread.mockResolvedValue({
          data: {
            thread: {
              post: { uri: 'at://parent', cid: 'cid-123', record: {} }
            }
          }
        });

        await expect(
          adapter.post('at://parent', 'Response')
        ).rejects.toThrow(PlatformPostingError);
      });

      it('should throw PlatformPostingError on unknown error', async () => {
        const unknownError = new Error('Something went wrong');

        mockAgent.post.mockRejectedValue(unknownError);

        mockAgent.getPostThread.mockResolvedValue({
          data: {
            thread: {
              post: { uri: 'at://parent', cid: 'cid-123', record: {} }
            }
          }
        });

        await expect(
          adapter.post('at://parent', 'Response')
        ).rejects.toThrow(PlatformPostingError);

        try {
          await adapter.post('at://parent', 'Response');
        } catch (error) {
          expect(error).toBeInstanceOf(PlatformPostingError);
          const platformErr = error as PlatformPostingError;
          expect(platformErr.retryable).toBe(true); // Unknown errors are retryable by default
        }
      });
    });
  });
});

