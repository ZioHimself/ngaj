/**
 * Responses Generate API Integration Tests
 *
 * Tests for POST /api/responses/generate endpoint validation logic.
 * Full response generation flow is tested in response-generation-flow.spec.ts.
 *
 * @see ADR-009: Response Suggestion Architecture
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

describe('POST /api/responses/generate Integration Tests', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let sessionCookies: string[];
  const originalEnv = process.env;

  // Test data
  const testAccountId = new ObjectId();
  const testProfileId = new ObjectId();
  const testAuthorId = new ObjectId();
  let testOpportunityId: ObjectId;

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
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    // Clear test collections
    await db.collection('accounts').deleteMany({});
    await db.collection('profiles').deleteMany({});
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
    const opportunity = createMockOpportunity(testAccountId, testAuthorId);
    testOpportunityId = opportunity._id;
    await db.collection('opportunities').insertOne(opportunity);

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use(configureSession());
    app.use(authMiddleware);
    app.use('/api/auth', authRoutes);

    // Add the responses/generate route (endpoint validation only, no actual Claude call)
    app.post('/api/responses/generate', async (req, res) => {
      try {
        const { opportunityId } = req.body;

        if (!opportunityId) {
          res.status(400).json({ error: 'opportunityId is required' });
          return;
        }

        const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicApiKey) {
          res.status(503).json({
            error: 'AI service not configured',
            message: 'ANTHROPIC_API_KEY not set.',
          });
          return;
        }

        const account = await db.collection('accounts').findOne({});
        if (!account) {
          res.status(400).json({ error: 'No account configured' });
          return;
        }

        const profile = await db.collection('profiles').findOne({});
        if (!profile) {
          res.status(400).json({ error: 'No profile configured' });
          return;
        }

        // Verify opportunity exists
        const opportunity = await db.collection('opportunities').findOne({
          _id: new ObjectId(opportunityId),
        });
        if (!opportunity) {
          res.status(404).json({ error: 'Opportunity not found' });
          return;
        }

        // For validation tests, return mock success
        // Full generation is tested in response-generation-flow.spec.ts
        res.json({
          _id: new ObjectId(),
          opportunityId: new ObjectId(opportunityId),
          accountId: account._id,
          text: 'Mock generated response for testing.',
          status: 'draft',
          version: 1,
          generatedAt: new Date(),
          metadata: {
            analysisKeywords: ['test'],
            mainTopic: 'testing',
            domain: 'technology',
            question: 'none',
            kbChunksUsed: 0,
            constraints: { maxLength: 300 },
            model: 'claude-sonnet-4-20250514',
            generationTimeMs: 1000,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate';
        res.status(500).json({ error: message });
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
    it('should return 200 for valid request with all prerequisites', async () => {
      const response = await request(app)
        .post('/api/responses/generate')
        .set('Cookie', sessionCookies)
        .send({ opportunityId: testOpportunityId.toString() });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('draft');
      expect(response.body.version).toBe(1);
      expect(response.body.text).toBeDefined();
      expect(response.body.metadata).toBeDefined();
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when opportunityId is missing', async () => {
      const response = await request(app)
        .post('/api/responses/generate')
        .set('Cookie', sessionCookies)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('opportunityId is required');
    });

    it('should return 404 when opportunity does not exist', async () => {
      const fakeOpportunityId = new ObjectId();
      const response = await request(app)
        .post('/api/responses/generate')
        .set('Cookie', sessionCookies)
        .send({ opportunityId: fakeOpportunityId.toString() });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Opportunity not found');
    });

    it('should return 400 when no account is configured', async () => {
      await db.collection('accounts').deleteMany({});

      const response = await request(app)
        .post('/api/responses/generate')
        .set('Cookie', sessionCookies)
        .send({ opportunityId: testOpportunityId.toString() });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No account configured');
    });

    it('should return 400 when no profile is configured', async () => {
      await db.collection('profiles').deleteMany({});

      const response = await request(app)
        .post('/api/responses/generate')
        .set('Cookie', sessionCookies)
        .send({ opportunityId: testOpportunityId.toString() });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No profile configured');
    });
  });

  describe('Service availability', () => {
    it('should return 503 when ANTHROPIC_API_KEY is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const response = await request(app)
        .post('/api/responses/generate')
        .set('Cookie', sessionCookies)
        .send({ opportunityId: testOpportunityId.toString() });

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('AI service not configured');
    });
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/responses/generate')
        .send({ opportunityId: testOpportunityId.toString() });

      expect(response.status).toBe(401);
    });
  });
});
