/**
 * Opportunities API Integration Tests
 *
 * Tests for GET /api/opportunities, GET /api/responses, and PATCH /api/opportunities/:id
 *
 * @see ADR-013: Opportunity Dashboard UI
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

describe('Opportunities API Integration Tests', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let sessionCookies: string[];
  const originalEnv = process.env;

  // Test data
  const testAccountId = new ObjectId();
  const testAuthorId = new ObjectId();
  const testOpportunityId = new ObjectId();

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
    await db.collection('opportunities').deleteMany({});
    await db.collection('authors').deleteMany({});
    await db.collection('responses').deleteMany({});

    // Insert test account
    await db.collection('accounts').insertOne({
      _id: testAccountId,
      platform: 'bluesky',
      platformUserId: 'did:plc:test123',
      handle: '@test.bsky.social',
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
      lastUpdatedAt: new Date(),
    });

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use(configureSession());
    app.use(authMiddleware);
    app.use('/api/auth', authRoutes);

    // Add the opportunities routes (matching index.ts implementation)
    app.get('/api/opportunities', async (req, res) => {
      const { status, limit = '20', offset = '0' } = req.query;

      const accountsCollection = db.collection('accounts');
      const account = await accountsCollection.findOne({});

      if (!account) {
        res.json({
          opportunities: [],
          total: 0,
          hasMore: false,
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: any = { accountId: account._id };
      if (status && status !== 'all') {
        query.status = status;
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

      const authorsCollection = db.collection('authors');
      const populatedOpportunities = await Promise.all(
        opportunities.map(async (opp) => {
          const author = await authorsCollection.findOne({ _id: opp.authorId });
          return { ...opp, author };
        })
      );

      res.json({
        opportunities: populatedOpportunities,
        total,
        hasMore: offsetNum + opportunities.length < total,
      });
    });

    app.get('/api/responses', async (req, res) => {
      const { opportunityIds } = req.query;

      if (!opportunityIds) {
        res.json({ responses: [] });
        return;
      }

      const ids = (opportunityIds as string).split(',').filter(Boolean);
      if (ids.length === 0) {
        res.json({ responses: [] });
        return;
      }

      const responsesCollection = db.collection('responses');
      const responses = await responsesCollection
        .find({ opportunityId: { $in: ids.map((id) => new ObjectId(id)) } })
        .toArray();

      res.json({ responses });
    });

    app.patch('/api/opportunities/:id', async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
      }

      const opportunitiesCollection = db.collection('opportunities');
      const result = await opportunitiesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        res.status(404).json({ error: 'Opportunity not found' });
        return;
      }

      res.json({ success: true });
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

  describe('GET /api/opportunities', () => {
    it('should return empty list when no opportunities exist', async () => {
      const response = await request(app)
        .get('/api/opportunities')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities).toEqual([]);
      expect(response.body.total).toBe(0);
      expect(response.body.hasMore).toBe(false);
    });

    it('should return opportunities with populated authors', async () => {
      // Insert test opportunity
      await db.collection('opportunities').insertOne({
        _id: testOpportunityId,
        accountId: testAccountId,
        authorId: testAuthorId,
        platform: 'bluesky',
        postId: 'at://did:plc:test/post/123',
        postUrl: 'https://bsky.app/profile/test/post/123',
        content: { text: 'Test post', createdAt: new Date() },
        scoring: { recency: 80, impact: 50, total: 68 },
        status: 'pending',
        discoveredAt: new Date(),
      });

      const response = await request(app)
        .get('/api/opportunities')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities).toHaveLength(1);
      expect(response.body.opportunities[0].author).toBeDefined();
      expect(response.body.opportunities[0].author.handle).toBe('@author.bsky.social');
      expect(response.body.total).toBe(1);
    });

    it('should filter opportunities by status', async () => {
      // Insert pending and dismissed opportunities
      await db.collection('opportunities').insertMany([
        {
          _id: new ObjectId(),
          accountId: testAccountId,
          authorId: testAuthorId,
          status: 'pending',
          scoring: { total: 70 },
          postId: 'post-1',
        },
        {
          _id: new ObjectId(),
          accountId: testAccountId,
          authorId: testAuthorId,
          status: 'dismissed',
          scoring: { total: 60 },
          postId: 'post-2',
        },
      ]);

      const response = await request(app)
        .get('/api/opportunities?status=pending')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities).toHaveLength(1);
      expect(response.body.opportunities[0].status).toBe('pending');
    });

    it('should paginate results with limit and offset', async () => {
      // Insert 5 opportunities
      const opportunities = Array.from({ length: 5 }, (_, i) => ({
        _id: new ObjectId(),
        accountId: testAccountId,
        authorId: testAuthorId,
        status: 'pending',
        scoring: { total: 100 - i * 10 },
        postId: `post-${i}`,
      }));
      await db.collection('opportunities').insertMany(opportunities);

      const response = await request(app)
        .get('/api/opportunities?limit=2&offset=2')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities).toHaveLength(2);
      expect(response.body.total).toBe(5);
      expect(response.body.hasMore).toBe(true);
    });

    it('should sort opportunities by score descending', async () => {
      await db.collection('opportunities').insertMany([
        {
          _id: new ObjectId(),
          accountId: testAccountId,
          authorId: testAuthorId,
          status: 'pending',
          scoring: { total: 50 },
          postId: 'low-score',
        },
        {
          _id: new ObjectId(),
          accountId: testAccountId,
          authorId: testAuthorId,
          status: 'pending',
          scoring: { total: 90 },
          postId: 'high-score',
        },
      ]);

      const response = await request(app)
        .get('/api/opportunities')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities[0].scoring.total).toBe(90);
      expect(response.body.opportunities[1].scoring.total).toBe(50);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/opportunities');

      expect(response.status).toBe(401);
    });

    it('should return empty list when no account exists', async () => {
      // Remove all accounts
      await db.collection('accounts').deleteMany({});

      const response = await request(app)
        .get('/api/opportunities')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.opportunities).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/responses', () => {
    it('should return empty array when no opportunityIds provided', async () => {
      const response = await request(app)
        .get('/api/responses')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.responses).toEqual([]);
    });

    it('should return responses for given opportunity IDs', async () => {
      const opportunityId = new ObjectId();
      const responseId = new ObjectId();

      await db.collection('responses').insertOne({
        _id: responseId,
        opportunityId: opportunityId,
        text: 'Test response',
        status: 'draft',
        createdAt: new Date(),
      });

      const response = await request(app)
        .get(`/api/responses?opportunityIds=${opportunityId.toString()}`)
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.responses).toHaveLength(1);
      expect(response.body.responses[0].text).toBe('Test response');
    });

    it('should handle multiple opportunity IDs', async () => {
      const oppId1 = new ObjectId();
      const oppId2 = new ObjectId();

      await db.collection('responses').insertMany([
        {
          _id: new ObjectId(),
          opportunityId: oppId1,
          text: 'Response 1',
          status: 'draft',
        },
        {
          _id: new ObjectId(),
          opportunityId: oppId2,
          text: 'Response 2',
          status: 'draft',
        },
      ]);

      const response = await request(app)
        .get(`/api/responses?opportunityIds=${oppId1},${oppId2}`)
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.responses).toHaveLength(2);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/responses?opportunityIds=123');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/opportunities/:id', () => {
    it('should update opportunity status', async () => {
      const oppId = new ObjectId();
      await db.collection('opportunities').insertOne({
        _id: oppId,
        accountId: testAccountId,
        status: 'pending',
        postId: 'test-post',
      });

      const response = await request(app)
        .patch(`/api/opportunities/${oppId}`)
        .set('Cookie', sessionCookies)
        .send({ status: 'dismissed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify in database
      const updated = await db.collection('opportunities').findOne({ _id: oppId });
      expect(updated?.status).toBe('dismissed');
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should return 400 when status not provided', async () => {
      const oppId = new ObjectId();

      const response = await request(app)
        .patch(`/api/opportunities/${oppId}`)
        .set('Cookie', sessionCookies)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Status is required');
    });

    it('should return 404 for non-existent opportunity', async () => {
      const fakeId = new ObjectId();

      const response = await request(app)
        .patch(`/api/opportunities/${fakeId}`)
        .set('Cookie', sessionCookies)
        .send({ status: 'dismissed' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Opportunity not found');
    });

    it('should return 401 when not authenticated', async () => {
      const oppId = new ObjectId();

      const response = await request(app)
        .patch(`/api/opportunities/${oppId}`)
        .send({ status: 'dismissed' });

      expect(response.status).toBe(401);
    });
  });
});
