/**
 * Responses Post API Integration Tests
 *
 * Tests for POST /api/responses/:id/post endpoint.
 * Full posting workflow is tested in response-posting.spec.ts.
 *
 * @see ADR-010: Response Draft Posting
 * @see GitHub Issue #40
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { configureSession } from '@ngaj/backend/middleware/session';
import { authMiddleware } from '@ngaj/backend/middleware/auth';
import authRoutes from '@ngaj/backend/routes/auth';
import { TEST_LOGIN_SECRET, validLoginRequest } from '../../fixtures/auth-fixtures';
import { createMockOpportunity } from '../../fixtures/opportunity-fixtures';
import { createMockAccount } from '../../fixtures/account-fixtures';
import { createMockResponse } from '../../fixtures/response-fixtures';

describe('POST /api/responses/:id/post Integration Tests', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let sessionCookies: string[];
  const originalEnv = process.env;

  // Test data
  const testProfileId = new ObjectId();
  const testAuthorId = new ObjectId();
  let testAccountId: ObjectId;
  let testOpportunityId: ObjectId;
  let testResponseId: ObjectId;

  // Mock platform adapter
  let mockPlatformPost: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db = mongoClient.db('ngaj-test');
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.LOGIN_SECRET = TEST_LOGIN_SECRET;
    process.env.BLUESKY_HANDLE = '@test.bsky.social';
    process.env.BLUESKY_APP_PASSWORD = 'test-app-password';

    // Reset mocks
    mockPlatformPost = vi.fn();

    // Clear test collections
    await db.collection('accounts').deleteMany({});
    await db.collection('profiles').deleteMany({});
    await db.collection('opportunities').deleteMany({});
    await db.collection('authors').deleteMany({});
    await db.collection('responses').deleteMany({});

    // Create test IDs
    testAccountId = new ObjectId();
    testOpportunityId = new ObjectId();
    testResponseId = new ObjectId();

    // Insert test account
    const account = createMockAccount(testProfileId, {
      _id: testAccountId,
      platform: 'bluesky',
      platformUserId: 'did:plc:test123',
      handle: '@test.bsky.social',
    });
    await db.collection('accounts').insertOne(account);

    // Insert test profile
    await db.collection('profiles').insertOne({
      _id: testProfileId,
      name: 'Test User',
      principles: 'Be helpful and informative.',
      voice: { style: 'professional' },
      createdAt: new Date(),
    });

    // Insert test author
    await db.collection('authors').insertOne({
      _id: testAuthorId,
      platform: 'bluesky',
      platformUserId: 'did:plc:author123',
      handle: '@author.bsky.social',
      displayName: 'Test Author',
      followerCount: 1000,
    });

    // Insert test opportunity
    const opportunity = createMockOpportunity(testAccountId, testAuthorId, {
      _id: testOpportunityId,
      postId: 'at://did:plc:author123/app.bsky.feed.post/parent123',
      status: 'pending',
    });
    await db.collection('opportunities').insertOne(opportunity);

    // Insert test response (draft)
    const response = createMockResponse(testOpportunityId, testAccountId, {
      _id: testResponseId,
      status: 'draft',
      text: 'Great point! I agree with your analysis.',
    });
    await db.collection('responses').insertOne(response);

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use(configureSession());
    app.use(authMiddleware);
    app.use('/api/auth', authRoutes);

    // Add the responses/:id/post route (validation + mock posting)
    app.post('/api/responses/:id/post', async (req, res) => {
      try {
        const { id } = req.params;

        // Check for Bluesky credentials
        const handle = process.env.BLUESKY_HANDLE;
        const appPassword = process.env.BLUESKY_APP_PASSWORD;

        if (!handle || !appPassword) {
          res.status(503).json({
            error: 'Bluesky not configured',
            message: 'BLUESKY_HANDLE and BLUESKY_APP_PASSWORD required',
          });
          return;
        }

        // Load response
        const response = await db.collection('responses').findOne({ _id: new ObjectId(id) });
        if (!response) {
          res.status(404).json({ error: `Response with ID ${id} not found` });
          return;
        }

        // Validate response is draft
        if (response.status !== 'draft') {
          res.status(400).json({ error: `Cannot post response with status '${response.status}'` });
          return;
        }

        // Load opportunity
        const opportunity = await db.collection('opportunities').findOne({ _id: response.opportunityId });
        if (!opportunity) {
          res.status(404).json({ error: `Opportunity with ID ${response.opportunityId} not found` });
          return;
        }

        // Load account
        const account = await db.collection('accounts').findOne({ _id: response.accountId });
        if (!account) {
          res.status(404).json({ error: `Account with ID ${response.accountId} not found` });
          return;
        }

        // Mock platform post (for validation tests)
        const postResult = mockPlatformPost(opportunity.postId, response.text);
        if (postResult instanceof Error) {
          throw postResult;
        }

        const platformResult = postResult || {
          postId: 'at://did:plc:test123/app.bsky.feed.post/newpost789',
          postUrl: 'https://bsky.app/profile/test.bsky.social/post/newpost789',
          postedAt: new Date(),
        };

        // Update response
        const now = new Date();
        await db.collection('responses').updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: 'posted',
              postedAt: platformResult.postedAt,
              platformPostId: platformResult.postId,
              platformPostUrl: platformResult.postUrl,
              updatedAt: now,
            },
          }
        );

        // Update opportunity
        await db.collection('opportunities').updateOne(
          { _id: opportunity._id },
          {
            $set: {
              status: 'responded',
              updatedAt: now,
            },
          }
        );

        // Return updated response
        const updatedResponse = await db.collection('responses').findOne({ _id: new ObjectId(id) });
        res.json(updatedResponse);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to post response';
        let status = 500;
        if (message.includes('not found')) {
          status = 404;
        } else if (message.includes('not a draft') || message.includes('Invalid status') || message.includes('Cannot post')) {
          status = 400;
        }
        res.status(status).json({ error: message });
      }
    });

    // Login to get session cookies
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send(validLoginRequest);
    sessionCookies = loginRes.headers['set-cookie'] || [];
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('should return 200 and post draft response successfully', async () => {
      mockPlatformPost.mockReturnValue({
        postId: 'at://did:plc:test123/app.bsky.feed.post/newpost789',
        postUrl: 'https://bsky.app/profile/test.bsky.social/post/newpost789',
        postedAt: new Date('2026-01-26T12:00:00Z'),
      });

      const response = await request(app)
        .post(`/api/responses/${testResponseId}/post`)
        .set('Cookie', sessionCookies)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('posted');
      expect(response.body.platformPostId).toBe('at://did:plc:test123/app.bsky.feed.post/newpost789');
      expect(response.body.platformPostUrl).toBe('https://bsky.app/profile/test.bsky.social/post/newpost789');
      expect(response.body.postedAt).toBeDefined();

      // Verify platform adapter was called with correct params
      expect(mockPlatformPost).toHaveBeenCalledWith(
        'at://did:plc:author123/app.bsky.feed.post/parent123',
        'Great point! I agree with your analysis.'
      );

      // Verify opportunity status updated
      const opportunity = await db.collection('opportunities').findOne({ _id: testOpportunityId });
      expect(opportunity?.status).toBe('responded');
    });

    it('should handle Unicode and emoji in response text', async () => {
      // Update response with Unicode text
      await db.collection('responses').updateOne(
        { _id: testResponseId },
        { $set: { text: '🚀 Great idea! 你好 Let\'s collaborate 💡' } }
      );

      mockPlatformPost.mockReturnValue({
        postId: 'at://post',
        postUrl: 'https://bsky.app/post',
        postedAt: new Date(),
      });

      const response = await request(app)
        .post(`/api/responses/${testResponseId}/post`)
        .set('Cookie', sessionCookies)
        .send();

      expect(response.status).toBe(200);
      expect(mockPlatformPost).toHaveBeenCalledWith(
        expect.any(String),
        '🚀 Great idea! 你好 Let\'s collaborate 💡'
      );
    });
  });

  describe('Validation errors', () => {
    it('should return 404 when response does not exist', async () => {
      const fakeResponseId = new ObjectId();
      const response = await request(app)
        .post(`/api/responses/${fakeResponseId}/post`)
        .set('Cookie', sessionCookies)
        .send();

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 when response is already posted', async () => {
      // Update response to posted status
      await db.collection('responses').updateOne(
        { _id: testResponseId },
        {
          $set: {
            status: 'posted',
            postedAt: new Date(),
            platformPostId: 'at://existing',
            platformPostUrl: 'https://bsky.app/existing',
          },
        }
      );

      const response = await request(app)
        .post(`/api/responses/${testResponseId}/post`)
        .set('Cookie', sessionCookies)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Cannot post response with status 'posted'");
      expect(mockPlatformPost).not.toHaveBeenCalled();
    });

    it('should return 400 when response is dismissed', async () => {
      // Update response to dismissed status
      await db.collection('responses').updateOne(
        { _id: testResponseId },
        { $set: { status: 'dismissed', dismissedAt: new Date() } }
      );

      const response = await request(app)
        .post(`/api/responses/${testResponseId}/post`)
        .set('Cookie', sessionCookies)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Cannot post response with status 'dismissed'");
      expect(mockPlatformPost).not.toHaveBeenCalled();
    });

    it('should return 404 when opportunity is missing', async () => {
      // Delete opportunity
      await db.collection('opportunities').deleteMany({});

      const response = await request(app)
        .post(`/api/responses/${testResponseId}/post`)
        .set('Cookie', sessionCookies)
        .send();

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Opportunity');
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 when account is missing', async () => {
      // Delete account
      await db.collection('accounts').deleteMany({});

      const response = await request(app)
        .post(`/api/responses/${testResponseId}/post`)
        .set('Cookie', sessionCookies)
        .send();

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Account');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Service availability', () => {
    it('should return 503 when BLUESKY_HANDLE is not set', async () => {
      delete process.env.BLUESKY_HANDLE;

      const response = await request(app)
        .post(`/api/responses/${testResponseId}/post`)
        .set('Cookie', sessionCookies)
        .send();

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Bluesky not configured');
    });

    it('should return 503 when BLUESKY_APP_PASSWORD is not set', async () => {
      delete process.env.BLUESKY_APP_PASSWORD;

      const response = await request(app)
        .post(`/api/responses/${testResponseId}/post`)
        .set('Cookie', sessionCookies)
        .send();

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Bluesky not configured');
    });
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`/api/responses/${testResponseId}/post`)
        .send();

      expect(response.status).toBe(401);
    });
  });

  describe('Idempotency', () => {
    it('should prevent double-posting the same response', async () => {
      mockPlatformPost.mockReturnValue({
        postId: 'at://post',
        postUrl: 'https://bsky.app/post',
        postedAt: new Date(),
      });

      // First post - should succeed
      const firstResponse = await request(app)
        .post(`/api/responses/${testResponseId}/post`)
        .set('Cookie', sessionCookies)
        .send();

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.status).toBe('posted');

      // Second post - should fail
      const secondResponse = await request(app)
        .post(`/api/responses/${testResponseId}/post`)
        .set('Cookie', sessionCookies)
        .send();

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.error).toContain("Cannot post response with status 'posted'");

      // Platform should only be called once
      expect(mockPlatformPost).toHaveBeenCalledTimes(1);
    });
  });
});
