import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { ResponsePostingService } from '@/backend/services/response-posting-service';
import {
  AuthenticationError,
  RateLimitError,
  PostNotFoundError,
  PlatformPostingError,
  ContentViolationError,
  InvalidStatusError
} from '@/shared/errors/platform-posting-errors';
import { createMockResponse } from '@tests/fixtures/response-fixtures';
import { createMockOpportunity } from '@tests/fixtures/opportunity-fixtures';
import { createMockAccount } from '@tests/fixtures/account-fixtures';
import type { PostResult } from '@/backend/adapters/platform-adapter';

describe('Response Posting Workflow (Integration)', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let service: ResponsePostingService;
  let mockPlatformAdapter: any;

  beforeEach(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoClient = await MongoClient.connect(mongoUri);
    db = mongoClient.db('test-ngaj');

    // Mock platform adapter
    mockPlatformAdapter = {
      post: vi.fn()
    };

    // Create service
    service = new ResponsePostingService(db, mockPlatformAdapter);
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoServer.stop();
    vi.clearAllMocks();
  });

  describe('Happy Path - Successful Posting', () => {
    it('should post draft response successfully', async () => {
      // Arrange
      const accountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const account = createMockAccount(new ObjectId(), { _id: accountId, platform: 'bluesky' });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://did:plc:parent.../post/123',
        status: 'pending'
      });
      const response = createMockResponse(opportunityId, accountId, {
        _id: responseId,
        status: 'draft',
        text: 'Great point! I agree with your analysis.'
      });

      // Insert test data
      await db.collection('accounts').insertOne(account);
      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      // Mock platform adapter post()
      const platformResult: PostResult = {
        postId: 'at://did:plc:user.../app.bsky.feed.post/xyz789',
        postUrl: 'https://bsky.app/profile/user.bsky.social/post/xyz789',
        postedAt: new Date('2026-01-04T12:00:00.000Z')
      };
      mockPlatformAdapter.post.mockResolvedValue(platformResult);

      // Act
      const result = await service.postResponse(responseId);

      // Assert - Response updated correctly
      expect(result).toBeDefined();
      expect(result.status).toBe('posted');
      expect(result.platformPostId).toBe('at://did:plc:user.../app.bsky.feed.post/xyz789');
      expect(result.platformPostUrl).toBe('https://bsky.app/profile/user.bsky.social/post/xyz789');
      expect(result.postedAt).toEqual(new Date('2026-01-04T12:00:00.000Z'));
      expect(result.updatedAt).toBeInstanceOf(Date);

      // Verify platform adapter was called correctly
      expect(mockPlatformAdapter.post).toHaveBeenCalledWith(
        'at://did:plc:parent.../post/123', // opportunity.postId
        'Great point! I agree with your analysis.' // response.text
      );

      // Verify response persisted to database
      const dbResponse = await db.collection('responses').findOne({ _id: responseId });
      expect(dbResponse).toBeDefined();
      expect(dbResponse!.status).toBe('posted');
      expect(dbResponse!.platformPostId).toBe(platformResult.postId);
      expect(dbResponse!.platformPostUrl).toBe(platformResult.postUrl);
      expect(dbResponse!.postedAt).toEqual(platformResult.postedAt);

      // Verify opportunity status updated
      const dbOpportunity = await db.collection('opportunities').findOne({ _id: opportunityId });
      expect(dbOpportunity).toBeDefined();
      expect(dbOpportunity!.status).toBe('responded');
      expect(dbOpportunity!.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle edited response text', async () => {
      const accountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const account = createMockAccount(new ObjectId(), { _id: accountId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://did:plc:parent.../post/123'
      });
      const response = createMockResponse(opportunityId, accountId, {
        _id: responseId,
        status: 'draft',
        text: 'EDITED: This is my revised response after user editing.'
      });

      await db.collection('accounts').insertOne(account);
      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      mockPlatformAdapter.post.mockResolvedValue({
        postId: 'at://post',
        postUrl: 'https://bsky.app/post',
        postedAt: new Date()
      });

      await service.postResponse(responseId);

      // Verify edited text was posted (not original generated text)
      expect(mockPlatformAdapter.post).toHaveBeenCalledWith(
        expect.any(String),
        'EDITED: This is my revised response after user editing.'
      );
    });

    it('should handle Unicode and emoji in response', async () => {
      const accountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const account = createMockAccount(new ObjectId(), { _id: accountId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://parent'
      });
      const response = createMockResponse(opportunityId, accountId, {
        _id: responseId,
        text: '🚀 Great idea! 你好 Let\'s collaborate 💡'
      });

      await db.collection('accounts').insertOne(account);
      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      mockPlatformAdapter.post.mockResolvedValue({
        postId: 'at://post',
        postUrl: 'https://bsky.app/post',
        postedAt: new Date()
      });

      const result = await service.postResponse(responseId);

      expect(result.text).toBe('🚀 Great idea! 你好 Let\'s collaborate 💡');
      expect(mockPlatformAdapter.post).toHaveBeenCalledWith(
        expect.any(String),
        '🚀 Great idea! 你好 Let\'s collaborate 💡'
      );
    });
  });

  describe('Error Handling - Authentication', () => {
    it('should keep response as draft on AuthenticationError', async () => {
      const accountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const account = createMockAccount(new ObjectId(), { _id: accountId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://parent'
      });
      const response = createMockResponse(opportunityId, accountId, {
        _id: responseId,
        status: 'draft'
      });

      await db.collection('accounts').insertOne(account);
      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      // Mock authentication failure
      mockPlatformAdapter.post.mockRejectedValue(
        new AuthenticationError('bluesky', 'Invalid token')
      );

      // Act & Assert
      await expect(service.postResponse(responseId)).rejects.toThrow(AuthenticationError);

      // Verify response status unchanged
      const dbResponse = await db.collection('responses').findOne({ _id: responseId });
      expect(dbResponse!.status).toBe('draft'); // Still draft
      expect(dbResponse!.platformPostId).toBeUndefined();
      expect(dbResponse!.platformPostUrl).toBeUndefined();
      expect(dbResponse!.postedAt).toBeUndefined();

      // Verify opportunity status unchanged
      const dbOpportunity = await db.collection('opportunities').findOne({ _id: opportunityId });
      expect(dbOpportunity!.status).toBe('pending'); // Still pending
    });
  });

  describe('Error Handling - Rate Limit', () => {
    it('should keep response as draft on RateLimitError', async () => {
      const accountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const account = createMockAccount(new ObjectId(), { _id: accountId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://parent'
      });
      const response = createMockResponse(opportunityId, accountId, {
        _id: responseId,
        status: 'draft'
      });

      await db.collection('accounts').insertOne(account);
      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      // Mock rate limit
      mockPlatformAdapter.post.mockRejectedValue(
        new RateLimitError('bluesky', 300) // 5 minutes
      );

      // Act & Assert
      await expect(service.postResponse(responseId)).rejects.toThrow(RateLimitError);

      try {
        await service.postResponse(responseId);
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        const rateLimitErr = error as RateLimitError;
        expect(rateLimitErr.retryable).toBe(true);
        expect(rateLimitErr.retryAfter).toBe(300);
      }

      // Verify response unchanged
      const dbResponse = await db.collection('responses').findOne({ _id: responseId });
      expect(dbResponse!.status).toBe('draft');
      expect(dbResponse!.platformPostId).toBeUndefined();
    });
  });

  describe('Error Handling - Post Not Found', () => {
    it('should keep response as draft on PostNotFoundError', async () => {
      const accountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const account = createMockAccount(new ObjectId(), { _id: accountId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://did:plc:deleted.../post/123'
      });
      const response = createMockResponse(opportunityId, accountId, {
        _id: responseId,
        status: 'draft'
      });

      await db.collection('accounts').insertOne(account);
      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      // Mock parent post deleted
      mockPlatformAdapter.post.mockRejectedValue(
        new PostNotFoundError('bluesky', 'at://did:plc:deleted.../post/123')
      );

      // Act & Assert
      await expect(service.postResponse(responseId)).rejects.toThrow(PostNotFoundError);

      // Verify response unchanged
      const dbResponse = await db.collection('responses').findOne({ _id: responseId });
      expect(dbResponse!.status).toBe('draft');
    });
  });

  describe('Error Handling - Network Errors', () => {
    it('should keep response as draft on PlatformPostingError (network timeout)', async () => {
      const accountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const account = createMockAccount(new ObjectId(), { _id: accountId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://parent'
      });
      const response = createMockResponse(opportunityId, accountId, {
        _id: responseId,
        status: 'draft'
      });

      await db.collection('accounts').insertOne(account);
      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      // Mock network timeout
      mockPlatformAdapter.post.mockRejectedValue(
        new PlatformPostingError('bluesky', 'Network timeout', true)
      );

      // Act & Assert
      await expect(service.postResponse(responseId)).rejects.toThrow(PlatformPostingError);

      // Verify response unchanged
      const dbResponse = await db.collection('responses').findOne({ _id: responseId });
      expect(dbResponse!.status).toBe('draft');
      expect(dbResponse!.platformPostId).toBeUndefined();
    });
  });

  describe('Error Handling - Content Violation', () => {
    it('should keep response as draft on ContentViolationError', async () => {
      const accountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const account = createMockAccount(new ObjectId(), { _id: accountId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://parent'
      });
      const response = createMockResponse(opportunityId, accountId, {
        _id: responseId,
        status: 'draft',
        text: 'Response with banned content'
      });

      await db.collection('accounts').insertOne(account);
      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      // Mock content violation
      mockPlatformAdapter.post.mockRejectedValue(
        new ContentViolationError('bluesky', 'Contains banned terms')
      );

      // Act & Assert
      await expect(service.postResponse(responseId)).rejects.toThrow(ContentViolationError);

      // Verify response unchanged (user can edit and retry)
      const dbResponse = await db.collection('responses').findOne({ _id: responseId });
      expect(dbResponse!.status).toBe('draft');
      expect(dbResponse!.text).toBe('Response with banned content'); // Unchanged
    });
  });

  describe('Validation Errors', () => {
    it('should throw error when response not found', async () => {
      const nonExistentId = new ObjectId();

      await expect(service.postResponse(nonExistentId)).rejects.toThrow(/Response.*not found/);
    });

    it('should throw error when opportunity not found', async () => {
      const accountId = new ObjectId();
      const nonExistentOpportunityId = new ObjectId();
      const responseId = new ObjectId();

      const response = createMockResponse(nonExistentOpportunityId, accountId, {
        _id: responseId,
        status: 'draft'
      });

      await db.collection('responses').insertOne(response);

      await expect(service.postResponse(responseId)).rejects.toThrow(/Opportunity.*not found/);
    });

    it('should throw error when account not found', async () => {
      const nonExistentAccountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const opportunity = createMockOpportunity(nonExistentAccountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://parent'
      });
      const response = createMockResponse(opportunityId, nonExistentAccountId, {
        _id: responseId,
        status: 'draft'
      });

      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      await expect(service.postResponse(responseId)).rejects.toThrow(/Account.*not found/);
    });

    it('should throw InvalidStatusError when posting already-posted response', async () => {
      const accountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const account = createMockAccount(new ObjectId(), { _id: accountId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://parent'
      });
      const response = createMockResponse(opportunityId, accountId, {
        _id: responseId,
        status: 'posted', // Already posted
        postedAt: new Date(),
        platformPostId: 'at://existing-post',
        platformPostUrl: 'https://bsky.app/existing'
      });

      await db.collection('accounts').insertOne(account);
      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      await expect(service.postResponse(responseId)).rejects.toThrow(InvalidStatusError);
      await expect(service.postResponse(responseId)).rejects.toThrow(/Cannot post response with status 'posted'/);

      // Verify adapter was NOT called
      expect(mockPlatformAdapter.post).not.toHaveBeenCalled();
    });

    it('should throw InvalidStatusError when posting dismissed response', async () => {
      const accountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const account = createMockAccount(new ObjectId(), { _id: accountId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://parent'
      });
      const response = createMockResponse(opportunityId, accountId, {
        _id: responseId,
        status: 'dismissed',
        dismissedAt: new Date()
      });

      await db.collection('accounts').insertOne(account);
      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      await expect(service.postResponse(responseId)).rejects.toThrow(InvalidStatusError);
      await expect(service.postResponse(responseId)).rejects.toThrow(/Cannot post response with status 'dismissed'/);

      // Verify adapter was NOT called
      expect(mockPlatformAdapter.post).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate Post Prevention', () => {
    it('should prevent double-posting (idempotency)', async () => {
      const accountId = new ObjectId();
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      const account = createMockAccount(new ObjectId(), { _id: accountId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        postId: 'at://parent',
        status: 'pending'
      });
      const response = createMockResponse(opportunityId, accountId, {
        _id: responseId,
        status: 'draft'
      });

      await db.collection('accounts').insertOne(account);
      await db.collection('opportunities').insertOne(opportunity);
      await db.collection('responses').insertOne(response);

      mockPlatformAdapter.post.mockResolvedValue({
        postId: 'at://post',
        postUrl: 'https://bsky.app/post',
        postedAt: new Date()
      });

      // First post - should succeed
      await service.postResponse(responseId);

      // Verify response is now posted
      const dbResponse = await db.collection('responses').findOne({ _id: responseId });
      expect(dbResponse!.status).toBe('posted');

      // Second post attempt - should fail
      await expect(service.postResponse(responseId)).rejects.toThrow(InvalidStatusError);
      await expect(service.postResponse(responseId)).rejects.toThrow(/already posted/);

      // Verify adapter was only called once
      expect(mockPlatformAdapter.post).toHaveBeenCalledTimes(1);
    });
  });
});

