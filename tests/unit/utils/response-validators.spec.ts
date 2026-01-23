import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  validateResponseForPosting,
  validatePostResult
} from '@ngaj/backend/utils/response-validators';
import { InvalidStatusError } from '@ngaj/shared';
import { createMockResponse } from '@tests/fixtures/response-fixtures';
import type { PostResult } from '@ngaj/backend/adapters/platform-adapter';

describe('Response Validators', () => {
  describe('validateResponseForPosting()', () => {
    it('should pass validation for draft response', () => {
      const response = createMockResponse(new ObjectId(), new ObjectId(), {
        status: 'draft'
      });

      expect(() => validateResponseForPosting(response)).not.toThrow();
    });

    it('should throw InvalidStatusError for posted response', () => {
      const response = createMockResponse(new ObjectId(), new ObjectId(), {
        status: 'posted',
        postedAt: new Date()
      });

      expect(() => validateResponseForPosting(response)).toThrow(InvalidStatusError);
      expect(() => validateResponseForPosting(response)).toThrow(/Cannot post response with status 'posted'/);
    });

    it('should throw InvalidStatusError for dismissed response', () => {
      const response = createMockResponse(new ObjectId(), new ObjectId(), {
        status: 'dismissed',
        dismissedAt: new Date()
      });

      expect(() => validateResponseForPosting(response)).toThrow(InvalidStatusError);
      expect(() => validateResponseForPosting(response)).toThrow(/Cannot post response with status 'dismissed'/);
    });

    it('should include expected status in error', () => {
      const response = createMockResponse(new ObjectId(), new ObjectId(), {
        status: 'posted'
      });

      try {
        validateResponseForPosting(response);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidStatusError);
        const statusError = error as InvalidStatusError;
        expect(statusError.currentStatus).toBe('posted');
        expect(statusError.expectedStatus).toBe('draft');
      }
    });
  });

  describe('validatePostResult()', () => {
    it('should pass validation for valid PostResult', () => {
      const postResult: PostResult = {
        postId: 'at://did:plc:abc123.../app.bsky.feed.post/xyz789',
        postUrl: 'https://bsky.app/profile/user.bsky.social/post/xyz789',
        postedAt: new Date('2026-01-04T12:00:00Z')
      };

      expect(() => validatePostResult(postResult)).not.toThrow();
    });

    it('should throw error if postId is missing', () => {
      const postResult = {
        postUrl: 'https://bsky.app/profile/user/post/123',
        postedAt: new Date()
      } as PostResult;

      expect(() => validatePostResult(postResult)).toThrow(/postId is required/);
    });

    it('should throw error if postId is empty string', () => {
      const postResult: PostResult = {
        postId: '',
        postUrl: 'https://bsky.app/profile/user/post/123',
        postedAt: new Date()
      };

      expect(() => validatePostResult(postResult)).toThrow(/postId.*empty/);
    });

    it('should throw error if postUrl is missing', () => {
      const postResult = {
        postId: 'at://did:plc:abc.../post/123',
        postedAt: new Date()
      } as PostResult;

      expect(() => validatePostResult(postResult)).toThrow(/postUrl is required/);
    });

    it('should throw error if postUrl is empty string', () => {
      const postResult: PostResult = {
        postId: 'at://did:plc:abc.../post/123',
        postUrl: '',
        postedAt: new Date()
      };

      expect(() => validatePostResult(postResult)).toThrow(/postUrl.*empty/);
    });

    it('should throw error if postedAt is missing', () => {
      const postResult = {
        postId: 'at://did:plc:abc.../post/123',
        postUrl: 'https://bsky.app/profile/user/post/123'
      } as PostResult;

      expect(() => validatePostResult(postResult)).toThrow(/postedAt is required/);
    });

    it('should throw error if postedAt is not a Date', () => {
      const postResult = {
        postId: 'at://did:plc:abc.../post/123',
        postUrl: 'https://bsky.app/profile/user/post/123',
        postedAt: '2026-01-04T12:00:00Z' // String, not Date
      } as unknown as PostResult;

      expect(() => validatePostResult(postResult)).toThrow(/postedAt.*Date/);
    });

    it('should throw error if postedAt is invalid Date', () => {
      const postResult: PostResult = {
        postId: 'at://did:plc:abc.../post/123',
        postUrl: 'https://bsky.app/profile/user/post/123',
        postedAt: new Date('invalid')
      };

      expect(() => validatePostResult(postResult)).toThrow(/postedAt.*invalid/);
    });
  });

  describe('Bluesky AT URI Validation', () => {
    it('should validate AT URI format for postId', () => {
      const postResult: PostResult = {
        postId: 'at://did:plc:abc123xyz.../app.bsky.feed.post/3l2uuuyqkb22a',
        postUrl: 'https://bsky.app/profile/user.bsky.social/post/3l2uuuyqkb22a',
        postedAt: new Date()
      };

      expect(() => validatePostResult(postResult)).not.toThrow();
    });

    it('should accept non-AT-URI postId (for other platforms)', () => {
      // LinkedIn or Reddit might use different ID formats
      const postResult: PostResult = {
        postId: 'urn:li:share:123456',
        postUrl: 'https://linkedin.com/feed/update/urn:li:share:123456',
        postedAt: new Date()
      };

      expect(() => validatePostResult(postResult)).not.toThrow();
    });
  });
});

