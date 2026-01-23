import { describe, it, expect } from 'vitest';
import {
  PlatformPostingError,
  AuthenticationError,
  RateLimitError,
  PostNotFoundError,
  ContentViolationError,
  InvalidStatusError
} from '@ngaj/shared';

describe('PlatformPostingErrors', () => {
  describe('PlatformPostingError', () => {
    it('should create generic posting error', () => {
      const error = new PlatformPostingError('bluesky', 'Network timeout');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('PlatformPostingError');
      expect(error.platform).toBe('bluesky');
      expect(error.message).toContain('Network timeout');
      expect(error.retryable).toBe(true); // Generic errors are retryable by default
    });

    it('should allow overriding retryable flag', () => {
      const error = new PlatformPostingError('bluesky', 'Fatal error', false);

      expect(error.retryable).toBe(false);
    });

    it('should have stack trace', () => {
      const error = new PlatformPostingError('bluesky', 'Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('PlatformPostingError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with retryable=false', () => {
      const error = new AuthenticationError('bluesky', 'Invalid token');

      expect(error).toBeInstanceOf(PlatformPostingError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AuthenticationError');
      expect(error.platform).toBe('bluesky');
      expect(error.message).toContain('Invalid token');
      expect(error.retryable).toBe(false); // Auth errors are NOT retryable
    });

    it('should suggest reconnecting account', () => {
      const error = new AuthenticationError('bluesky', 'Expired credentials');

      expect(error.message).toMatch(/reconnect|authentication|credentials/i);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with retryAfter', () => {
      const error = new RateLimitError('bluesky', 300);

      expect(error).toBeInstanceOf(PlatformPostingError);
      expect(error.name).toBe('RateLimitError');
      expect(error.platform).toBe('bluesky');
      expect(error.retryAfter).toBe(300);
      expect(error.retryable).toBe(true); // Rate limit errors ARE retryable
      expect(error.message).toContain('Rate limit');
      expect(error.message).toContain('300');
    });

    it('should format retry time in minutes when > 60 seconds', () => {
      const error = new RateLimitError('bluesky', 300); // 5 minutes

      expect(error.message).toMatch(/5\s*minute/i);
    });

    it('should format retry time in seconds when < 60 seconds', () => {
      const error = new RateLimitError('bluesky', 45);

      expect(error.message).toMatch(/45\s*second/i);
    });

    it('should default retryAfter to 60 seconds if not provided', () => {
      const error = new RateLimitError('bluesky');

      expect(error.retryAfter).toBe(60);
    });
  });

  describe('PostNotFoundError', () => {
    it('should create post not found error', () => {
      const postId = 'at://did:plc:abc123.../app.bsky.feed.post/xyz789';
      const error = new PostNotFoundError('bluesky', postId);

      expect(error).toBeInstanceOf(PlatformPostingError);
      expect(error.name).toBe('PostNotFoundError');
      expect(error.platform).toBe('bluesky');
      expect(error.postId).toBe(postId);
      expect(error.retryable).toBe(false); // Can't retry if post is deleted
      expect(error.message).toContain(postId);
      expect(error.message).toMatch(/deleted|not found/i);
    });

    it('should handle missing postId', () => {
      const error = new PostNotFoundError('bluesky');

      expect(error.postId).toBeUndefined();
      expect(error.message).toMatch(/post.*not found/i);
    });
  });

  describe('ContentViolationError', () => {
    it('should create content violation error', () => {
      const reason = 'Contains banned terms';
      const error = new ContentViolationError('bluesky', reason);

      expect(error).toBeInstanceOf(PlatformPostingError);
      expect(error.name).toBe('ContentViolationError');
      expect(error.platform).toBe('bluesky');
      expect(error.violationReason).toBe(reason);
      expect(error.retryable).toBe(false); // Can't retry without changing content
      expect(error.message).toContain(reason);
      expect(error.message).toMatch(/content.*violation|violates.*rules/i);
    });

    it('should handle missing violation reason', () => {
      const error = new ContentViolationError('bluesky');

      expect(error.violationReason).toBeUndefined();
      expect(error.message).toMatch(/content.*violation/i);
    });
  });

  describe('InvalidStatusError', () => {
    it('should create invalid status error', () => {
      const error = new InvalidStatusError('posted', 'draft');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('InvalidStatusError');
      expect(error.currentStatus).toBe('posted');
      expect(error.expectedStatus).toBe('draft');
      expect(error.message).toContain('posted');
      expect(error.message).toContain('draft');
    });

    it('should handle multiple expected statuses', () => {
      const error = new InvalidStatusError('dismissed', ['draft', 'pending']);

      expect(error.expectedStatus).toEqual(['draft', 'pending']);
      expect(error.message).toContain('draft');
      expect(error.message).toContain('pending');
    });

    it('should not have platform property', () => {
      const error = new InvalidStatusError('posted', 'draft');

      expect((error as any).platform).toBeUndefined();
    });
  });

  describe('Error Inheritance', () => {
    it('should allow catching all platform errors', () => {
      const errors = [
        new PlatformPostingError('bluesky', 'test'),
        new AuthenticationError('bluesky', 'test'),
        new RateLimitError('bluesky', 60),
        new PostNotFoundError('bluesky', 'test-id'),
        new ContentViolationError('bluesky', 'test')
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(PlatformPostingError);
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('should allow catching specific error types', () => {
      const error = new AuthenticationError('bluesky', 'test');

      let caught = false;
      try {
        throw error;
      } catch (e) {
        if (e instanceof AuthenticationError) {
          caught = true;
          expect(e.retryable).toBe(false);
        }
      }

      expect(caught).toBe(true);
    });
  });
});

