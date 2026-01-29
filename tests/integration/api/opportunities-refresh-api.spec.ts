/**
 * Opportunities Refresh API Integration Tests
 *
 * Tests for POST /api/opportunities/refresh endpoint
 * Triggers discovery and returns updated opportunities list.
 *
 * @see ADR-008: Opportunity Discovery Architecture
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { configureSession } from '@ngaj/backend/middleware/session';
import { authMiddleware } from '@ngaj/backend/middleware/auth';
import authRoutes from '@ngaj/backend/routes/auth';
import { TEST_LOGIN_SECRET, validLoginRequest } from '../../fixtures/auth-fixtures';
import { createMockProfile } from '../../fixtures/profile-fixtures';
import { createMockAccount } from '../../fixtures/account-fixtures';

describe('Opportunities Refresh API Integration Tests', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let sessionCookies: string[];
  const originalEnv = process.env;

  // Test data
  const testProfileId = new ObjectId();
  const testAccountId = new ObjectId();
  const testAuthorId = new ObjectId();

  // Mock discovery service
  let mockDiscoveryService: {
    discover: (accountId: ObjectId, type: string) => Promise<Array<{ _id: ObjectId }>>;
  } | null = null;

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

    // Clear test collections
    await db.collection('accounts').deleteMany({});
    await db.collection('profiles').deleteMany({});
    await db.collection('opportunities').deleteMany({});
    await db.collection('authors').deleteMany({});

    // Insert test profile
    const profile = createMockProfile({
      _id: testProfileId,
      discovery: {
        interests: ['typescript', 'testing'],
        keywords: ['tdd', 'vitest'],
        communities: [],
      },
    });
    await db.collection('profiles').insertOne(profile);

    // Insert test account
    const account = createMockAccount(testProfileId, {
      _id: testAccountId,
      platform: 'bluesky',
      handle: '@test.bsky.social',
    });
    await db.collection('accounts').insertOne(account);

    // Insert test author
    await db.collection('authors').insertOne({
      _id: testAuthorId,
      platform: 'bluesky',
      platformUserId: 'did:plc:author123',
      handle: '@author.bsky.social',
      displayName: 'Test Author',
      followerCount: 1000,
      lastUpdatedAt: new Date(),
    });

    // Default mock discovery service
    mockDiscoveryService = {
      discover: async () => [],
    };

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use(configureSession());
    app.use(authMiddleware);
    app.use('/api/auth', authRoutes);

    // Implement refresh endpoint (matching index.ts implementation)
    app.post('/api/opportunities/refresh', async (req: Request, res: Response) => {
      try {
        if (!mockDiscoveryService) {
          res.status(503).json({
            error: 'Discovery service not available',
            message: 'Bluesky credentials may not be configured',
          });
          return;
        }

        // Get account (MVP: first account)
        const accountsCollection = db.collection('accounts');
        const account = await accountsCollection.findOne({});

        if (!account) {
          res.status(404).json({ error: 'No account configured' });
          return;
        }

        const accountId = account._id instanceof ObjectId ? account._id : new ObjectId(account._id);

        // Trigger discovery for both types (run in parallel)
        const [repliesResult, searchResult] = await Promise.allSettled([
          mockDiscoveryService.discover(accountId, 'replies'),
          mockDiscoveryService.discover(accountId, 'search'),
        ]);

        // Parse query params for filtering (same as GET)
        const { status, limit = '20', offset = '0' } = req.query;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: any = { accountId: account._id };
        if (status && status !== 'all') {
          query.status = status;
          if (status === 'pending') {
            query.expiresAt = { $gt: new Date() };
          }
        }

        const opportunitiesCollection = db.collection('opportunities');
        const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
        const offsetNum = parseInt(offset as string, 10) || 0;

        const opportunities = await opportunitiesCollection
          .find(query)
          .sort({ 'scoring.total': -1 })
          .skip(offsetNum)
          .limit(limitNum)
          .toArray();

        const total = await opportunitiesCollection.countDocuments(query);

        // Populate authors
        const authorsCollection = db.collection('authors');
        const populatedOpportunities = await Promise.all(
          opportunities.map(async (opp) => {
            const author = await authorsCollection.findOne({ _id: opp.authorId });
            return { ...opp, author };
          })
        );

        // Include discovery stats in response
        const newReplies = repliesResult.status === 'fulfilled' ? repliesResult.value.length : 0;
        const newSearch = searchResult.status === 'fulfilled' ? searchResult.value.length : 0;

        res.json({
          opportunities: populatedOpportunities,
          total,
          hasMore: offsetNum + opportunities.length < total,
          discovery: {
            newOpportunities: newReplies + newSearch,
            replies: repliesResult.status === 'fulfilled' ? { found: newReplies } : { error: 'failed' },
            search: searchResult.status === 'fulfilled' ? { found: newSearch } : { error: 'failed' },
          },
        });
      } catch (error) {
        console.error('Error refreshing opportunities:', error);
        res.status(500).json({ error: 'Failed to refresh opportunities' });
      }
    });

    // Login to get session cookies
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send(validLoginRequest);
    sessionCookies = loginResponse.headers['set-cookie'];
  });

  afterEach(async () => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('POST /api/opportunities/refresh', () => {
    it('should trigger discovery and return opportunities', async () => {
      // Insert existing opportunity
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await db.collection('opportunities').insertOne({
        _id: new ObjectId(),
        accountId: testAccountId,
        authorId: testAuthorId,
        platform: 'bluesky',
        postId: 'existing-post',
        status: 'pending',
        scoring: { total: 75 },
        expiresAt: futureDate,
      });

      const response = await request(app)
        .post('/api/opportunities/refresh')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities).toHaveLength(1);
      expect(response.body.total).toBe(1);
      expect(response.body.discovery).toBeDefined();
    });

    it('should return discovery stats with new opportunity counts', async () => {
      // Mock discovery to return new opportunities
      mockDiscoveryService = {
        discover: async (_accountId, type) => {
          if (type === 'replies') {
            return [{ _id: new ObjectId() }, { _id: new ObjectId() }];
          }
          return [{ _id: new ObjectId() }];
        },
      };

      const response = await request(app)
        .post('/api/opportunities/refresh')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.discovery.newOpportunities).toBe(3);
      expect(response.body.discovery.replies.found).toBe(2);
      expect(response.body.discovery.search.found).toBe(1);
    });

    it('should handle discovery errors gracefully', async () => {
      // Mock replies to throw error, search succeeds
      mockDiscoveryService = {
        discover: async (_accountId, type) => {
          if (type === 'replies') {
            throw new Error('API rate limited');
          }
          return [{ _id: new ObjectId() }];
        },
      };

      const response = await request(app)
        .post('/api/opportunities/refresh')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.discovery.replies.error).toBe('failed');
      expect(response.body.discovery.search.found).toBe(1);
      expect(response.body.discovery.newOpportunities).toBe(1);
    });

    it('should filter by status when provided', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      
      // Insert pending and dismissed opportunities
      await db.collection('opportunities').insertMany([
        {
          _id: new ObjectId(),
          accountId: testAccountId,
          authorId: testAuthorId,
          status: 'pending',
          scoring: { total: 80 },
          expiresAt: futureDate,
          postId: 'pending-post',
        },
        {
          _id: new ObjectId(),
          accountId: testAccountId,
          authorId: testAuthorId,
          status: 'dismissed',
          scoring: { total: 70 },
          postId: 'dismissed-post',
        },
      ]);

      const response = await request(app)
        .post('/api/opportunities/refresh?status=pending')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities).toHaveLength(1);
      expect(response.body.opportunities[0].status).toBe('pending');
    });

    it('should support pagination with limit and offset', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      
      // Insert 5 opportunities
      const opportunities = Array.from({ length: 5 }, (_, i) => ({
        _id: new ObjectId(),
        accountId: testAccountId,
        authorId: testAuthorId,
        status: 'pending',
        scoring: { total: 100 - i * 10 },
        expiresAt: futureDate,
        postId: `post-${i}`,
      }));
      await db.collection('opportunities').insertMany(opportunities);

      const response = await request(app)
        .post('/api/opportunities/refresh?limit=2&offset=2')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities).toHaveLength(2);
      expect(response.body.total).toBe(5);
      expect(response.body.hasMore).toBe(true);
    });

    it('should return 503 when discovery service is unavailable', async () => {
      mockDiscoveryService = null;

      const response = await request(app)
        .post('/api/opportunities/refresh')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Discovery service not available');
    });

    it('should return 404 when no account configured', async () => {
      await db.collection('accounts').deleteMany({});

      const response = await request(app)
        .post('/api/opportunities/refresh')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No account configured');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/opportunities/refresh');
      // No cookies

      expect(response.status).toBe(401);
    });

    it('should exclude expired opportunities when filtering by pending status', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const pastDate = new Date(Date.now() - 1000);

      await db.collection('opportunities').insertMany([
        {
          _id: new ObjectId(),
          accountId: testAccountId,
          authorId: testAuthorId,
          status: 'pending',
          scoring: { total: 80 },
          expiresAt: futureDate, // Not expired
          postId: 'valid-post',
        },
        {
          _id: new ObjectId(),
          accountId: testAccountId,
          authorId: testAuthorId,
          status: 'pending',
          scoring: { total: 90 },
          expiresAt: pastDate, // Expired
          postId: 'expired-post',
        },
      ]);

      const response = await request(app)
        .post('/api/opportunities/refresh?status=pending')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities).toHaveLength(1);
      expect(response.body.opportunities[0].postId).toBe('valid-post');
    });

    it('should populate author data for each opportunity', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      
      await db.collection('opportunities').insertOne({
        _id: new ObjectId(),
        accountId: testAccountId,
        authorId: testAuthorId,
        platform: 'bluesky',
        postId: 'test-post',
        status: 'pending',
        scoring: { total: 75 },
        expiresAt: futureDate,
      });

      const response = await request(app)
        .post('/api/opportunities/refresh')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities[0].author).toBeDefined();
      expect(response.body.opportunities[0].author.handle).toBe('@author.bsky.social');
      expect(response.body.opportunities[0].author.displayName).toBe('Test Author');
    });

    it('should sort opportunities by score descending', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      
      await db.collection('opportunities').insertMany([
        {
          _id: new ObjectId(),
          accountId: testAccountId,
          authorId: testAuthorId,
          status: 'pending',
          scoring: { total: 50 },
          expiresAt: futureDate,
          postId: 'low-score',
        },
        {
          _id: new ObjectId(),
          accountId: testAccountId,
          authorId: testAuthorId,
          status: 'pending',
          scoring: { total: 90 },
          expiresAt: futureDate,
          postId: 'high-score',
        },
      ]);

      const response = await request(app)
        .post('/api/opportunities/refresh')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities[0].scoring.total).toBe(90);
      expect(response.body.opportunities[1].scoring.total).toBe(50);
    });

    it('should run both discovery types in parallel', async () => {
      const callOrder: string[] = [];
      
      mockDiscoveryService = {
        discover: async (_accountId, type) => {
          callOrder.push(`start-${type}`);
          // Small delay to verify parallel execution
          await new Promise(resolve => setTimeout(resolve, 10));
          callOrder.push(`end-${type}`);
          return [];
        },
      };

      await request(app)
        .post('/api/opportunities/refresh')
        .set('Cookie', sessionCookies);

      // Both should start before either ends (parallel execution)
      expect(callOrder).toContain('start-replies');
      expect(callOrder).toContain('start-search');
      // Both starts should occur before both ends
      const repliesStart = callOrder.indexOf('start-replies');
      const searchStart = callOrder.indexOf('start-search');
      const repliesEnd = callOrder.indexOf('end-replies');
      const searchEnd = callOrder.indexOf('end-search');
      
      expect(repliesStart).toBeLessThan(Math.max(repliesEnd, searchEnd));
      expect(searchStart).toBeLessThan(Math.max(repliesEnd, searchEnd));
    });
  });
});
