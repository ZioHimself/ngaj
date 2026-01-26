/**
 * Discovery API Integration Tests
 *
 * Tests for POST /api/discovery/run endpoint
 * Allows manual triggering of opportunity discovery.
 *
 * @see ADR-008: Opportunity Discovery Architecture
 * @see GitHub Issue #34
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

describe('Discovery API Integration Tests', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let sessionCookies: string[];
  const originalEnv = process.env;

  // Test data
  const testProfileId = new ObjectId();
  const testAccountId = new ObjectId();

  // Mock discovery function - simulates DiscoveryService.discover()
  let mockDiscoverReplies: () => Promise<number>;
  let mockDiscoverSearch: () => Promise<number>;

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
      discovery: {
        schedules: [
          {
            type: 'replies',
            enabled: true,
            cronExpression: '*/15 * * * *',
            lastRunAt: undefined,
          },
          {
            type: 'search',
            enabled: true,
            cronExpression: '0 */2 * * *',
            lastRunAt: undefined,
          },
        ],
        lastAt: undefined,
        error: undefined,
      },
    });
    await db.collection('accounts').insertOne(account);

    // Default mock implementations - return 0 opportunities
    mockDiscoverReplies = async () => 0;
    mockDiscoverSearch = async () => 0;

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use(configureSession());
    app.use(authMiddleware);
    app.use('/api/auth', authRoutes);

    // Implement discovery run endpoint (matching index.ts implementation)
    // Uses mock functions instead of real discovery service
    app.post('/api/discovery/run', async (_req: Request, res: Response) => {
      try {
        // Get first account (MVP simplification)
        const accountsCollection = db.collection('accounts');
        const account = await accountsCollection.findOne({});

        if (!account) {
          // No account configured - return empty result
          res.json({
            discoveredCount: 0,
            repliesCount: 0,
            searchCount: 0,
            message: 'No account configured',
          });
          return;
        }

        // Run discovery for enabled schedule types
        let repliesCount = 0;
        let searchCount = 0;

        // Check which schedules are enabled
        interface Schedule {
          type: string;
          enabled: boolean;
        }
        const repliesSchedule = account.discovery?.schedules?.find(
          (s: Schedule) => s.type === 'replies' && s.enabled
        );
        const searchSchedule = account.discovery?.schedules?.find(
          (s: Schedule) => s.type === 'search' && s.enabled
        );

        // Run replies discovery if enabled
        if (repliesSchedule) {
          try {
            repliesCount = await mockDiscoverReplies();
          } catch (error) {
            console.error('Error running replies discovery:', error);
          }
        }

        // Run search discovery if enabled
        if (searchSchedule) {
          try {
            searchCount = await mockDiscoverSearch();
          } catch (error) {
            console.error('Error running search discovery:', error);
          }
        }

        const discoveredCount = repliesCount + searchCount;

        res.json({
          discoveredCount,
          repliesCount,
          searchCount,
        });
      } catch (error) {
        console.error('Error running discovery:', error);
        res.status(500).json({ error: 'Failed to run discovery' });
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

  describe('POST /api/discovery/run', () => {
    it('should trigger discovery and return count', async () => {
      // Mock discovery to return some opportunities
      mockDiscoverReplies = async () => 3;
      mockDiscoverSearch = async () => 2;

      const response = await request(app)
        .post('/api/discovery/run')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('discoveredCount');
      expect(typeof response.body.discoveredCount).toBe('number');
      expect(response.body.discoveredCount).toBe(5);
    });

    it('should return discovered opportunities count in response', async () => {
      mockDiscoverReplies = async () => 4;
      mockDiscoverSearch = async () => 1;

      const response = await request(app)
        .post('/api/discovery/run')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.discoveredCount).toBeGreaterThanOrEqual(0);
      expect(response.body.discoveredCount).toBe(5);
    });

    it('should run both replies and search discovery types', async () => {
      mockDiscoverReplies = async () => 2;
      mockDiscoverSearch = async () => 3;

      const response = await request(app)
        .post('/api/discovery/run')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      // Response should indicate both discovery types were run
      expect(response.body).toHaveProperty('repliesCount');
      expect(response.body).toHaveProperty('searchCount');
      expect(response.body.repliesCount).toBe(2);
      expect(response.body.searchCount).toBe(3);
    });

    it('should return 0 count when no opportunities discovered', async () => {
      // Mock returns 0 for both types
      mockDiscoverReplies = async () => 0;
      mockDiscoverSearch = async () => 0;

      const response = await request(app)
        .post('/api/discovery/run')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body.discoveredCount).toBe(0);
    });

    it('should return empty result when no account configured', async () => {
      // Remove all accounts
      await db.collection('accounts').deleteMany({});

      const response = await request(app)
        .post('/api/discovery/run')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        discoveredCount: 0,
        repliesCount: 0,
        searchCount: 0,
        message: 'No account configured',
      });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/discovery/run');
      // No cookies

      expect(response.status).toBe(401);
    });

    it('should handle discovery errors gracefully', async () => {
      // Mock replies to throw error, search succeeds
      mockDiscoverReplies = async () => {
        throw new Error('Discovery failed');
      };
      mockDiscoverSearch = async () => 2;

      const response = await request(app)
        .post('/api/discovery/run')
        .set('Cookie', sessionCookies);

      // Endpoint should handle error gracefully and continue
      expect(response.status).toBe(200);
      // Replies failed but search succeeded
      expect(response.body.repliesCount).toBe(0);
      expect(response.body.searchCount).toBe(2);
      expect(response.body.discoveredCount).toBe(2);
    });

    it('should work when account has no keywords or interests configured', async () => {
      // Update profile to have no keywords/interests
      await db.collection('profiles').updateOne(
        { _id: testProfileId },
        {
          $set: {
            'discovery.keywords': [],
            'discovery.interests': [],
          },
        }
      );

      // Mock: replies work, search returns 0 (would be skipped by real service)
      mockDiscoverReplies = async () => 3;
      mockDiscoverSearch = async () => 0;

      const response = await request(app)
        .post('/api/discovery/run')
        .set('Cookie', sessionCookies);

      expect(response.status).toBe(200);
      // Search returns 0, replies should work
      expect(response.body.repliesCount).toBe(3);
      expect(response.body.searchCount).toBe(0);
    });
  });
});
