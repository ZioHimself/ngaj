/**
 * Bulk Dismiss API Integration Tests
 *
 * Tests for POST /api/opportunities/bulk-dismiss endpoint.
 *
 * @see ADR-018: Expiration Mechanics
 * @see Design: .agents/artifacts/designer/designs/expiration-mechanics-design.md
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { configureSession } from '@ngaj/backend/middleware/session';
import { authMiddleware } from '@ngaj/backend/middleware/auth';
import authRoutes from '@ngaj/backend/routes/auth';
import { TEST_LOGIN_SECRET, validLoginRequest } from '@tests/fixtures/auth-fixtures';
import {
  createBulkOpportunities,
  createRespondedOpportunity,
  createDismissedOpportunity,
  createCrossAccountFixtures,
  BulkDismissRequest,
  BulkDismissResponse,
} from '@tests/fixtures/cleanup-fixtures';
import { createMockAuthor } from '@tests/fixtures/opportunity-fixtures';

describe('Bulk Dismiss API Integration Tests', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let sessionCookies: string[];
  const originalEnv = process.env;

  // Test data
  const testAccountId = new ObjectId();
  const testAuthorId = new ObjectId();

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

    // Insert test account
    await db.collection('accounts').insertOne({
      _id: testAccountId,
      platform: 'bluesky',
      platformUserId: 'did:plc:test123',
      handle: '@test.bsky.social',
      createdAt: new Date(),
    });

    // Insert test author
    await db.collection('authors').insertOne(createMockAuthor({ _id: testAuthorId }));

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use(configureSession());
    app.use(authMiddleware);
    app.use('/api/auth', authRoutes);

    // Add the bulk dismiss route (matching design spec)
    app.post('/api/opportunities/bulk-dismiss', async (req, res) => {
      const { opportunityIds } = req.body as BulkDismissRequest;

      if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
        res.status(400).json({ error: 'opportunityIds array is required' });
        return;
      }

      // Get the current user's account
      const account = await db.collection('accounts').findOne({});
      if (!account) {
        res.status(401).json({ error: 'No account found' });
        return;
      }

      // Convert string IDs to ObjectIds
      const objectIds = opportunityIds.map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      }).filter((id): id is ObjectId => id !== null);

      // Find pending opportunities BEFORE updating (to compute skipped list accurately)
      const pendingDocs = await db
        .collection('opportunities')
        .find({
          _id: { $in: objectIds },
          accountId: account._id,
          status: 'pending',
        })
        .project({ _id: 1 })
        .toArray();

      const pendingIdStrings = new Set(pendingDocs.map((o) => o._id.toString()));

      // Update only pending opportunities belonging to this account
      const result = await db.collection('opportunities').updateMany(
        {
          _id: { $in: objectIds },
          accountId: account._id,
          status: 'pending',
        },
        {
          $set: { status: 'dismissed', updatedAt: new Date() },
        }
      );

      // Skipped = input IDs that were NOT pending (or not found, or wrong account)
      const skipped = opportunityIds.filter((id) => !pendingIdStrings.has(id));

      const response: BulkDismissResponse = {
        dismissed: result.modifiedCount,
        skipped,
      };

      res.json(response);
    });

    // Login to get session cookies
    const loginResponse = await request(app).post('/api/auth/login').send(validLoginRequest);
    sessionCookies = loginResponse.headers['set-cookie'];
  });

  afterEach(async () => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('POST /api/opportunities/bulk-dismiss', () => {
    describe('Success Scenarios', () => {
      it('should dismiss multiple pending opportunities', async () => {
        // Arrange - Insert 5 pending opportunities
        const opportunities = createBulkOpportunities(testAccountId, testAuthorId, 5);
        await db.collection('opportunities').insertMany(opportunities);

        const idsToDismi = opportunities.slice(0, 3).map((o) => o._id.toString());

        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({ opportunityIds: idsToDismi });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.dismissed).toBe(3);
        expect(response.body.skipped).toEqual([]);

        // Verify in database
        const dismissed = await db
          .collection('opportunities')
          .find({ status: 'dismissed' })
          .toArray();
        expect(dismissed).toHaveLength(3);
      });

      it('should return 200 with dismissed count', async () => {
        // Arrange
        const opportunities = createBulkOpportunities(testAccountId, testAuthorId, 2);
        await db.collection('opportunities').insertMany(opportunities);

        const ids = opportunities.map((o) => o._id.toString());

        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({ opportunityIds: ids });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          dismissed: 2,
          skipped: [],
        });
      });

      it('should set updatedAt on each dismissed opportunity', async () => {
        // Arrange
        const beforeTime = new Date();
        const opportunities = createBulkOpportunities(testAccountId, testAuthorId, 2);
        await db.collection('opportunities').insertMany(opportunities);

        // Act
        await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({ opportunityIds: opportunities.map((o) => o._id.toString()) });

        // Assert
        const updated = await db.collection('opportunities').find({}).toArray();
        updated.forEach((opp) => {
          expect(opp.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        });
      });
    });

    describe('Skip Non-Pending Opportunities', () => {
      it('should skip already-dismissed opportunities', async () => {
        // Arrange
        const dismissed = createDismissedOpportunity(testAccountId, testAuthorId, 10);
        const pending = createBulkOpportunities(testAccountId, testAuthorId, 1)[0];
        await db.collection('opportunities').insertMany([dismissed, pending]);

        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({
            opportunityIds: [dismissed._id.toString(), pending._id.toString()],
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.dismissed).toBe(1);
        expect(response.body.skipped).toContain(dismissed._id.toString());
      });

      it('should skip responded opportunities', async () => {
        // Arrange
        const responded = createRespondedOpportunity(testAccountId, testAuthorId);
        const pending = createBulkOpportunities(testAccountId, testAuthorId, 1)[0];
        await db.collection('opportunities').insertMany([responded, pending]);

        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({
            opportunityIds: [responded._id.toString(), pending._id.toString()],
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.dismissed).toBe(1);
        expect(response.body.skipped).toContain(responded._id.toString());

        // Verify responded opportunity unchanged
        const unchangedResponded = await db
          .collection('opportunities')
          .findOne({ _id: responded._id });
        expect(unchangedResponded?.status).toBe('responded');
      });

      it('should skip mix of pending, responded, and dismissed', async () => {
        // Arrange
        const pending = createBulkOpportunities(testAccountId, testAuthorId, 2);
        const responded = createRespondedOpportunity(testAccountId, testAuthorId);
        const dismissed = createDismissedOpportunity(testAccountId, testAuthorId, 10);
        await db.collection('opportunities').insertMany([...pending, responded, dismissed]);

        const allIds = [
          ...pending.map((o) => o._id.toString()),
          responded._id.toString(),
          dismissed._id.toString(),
        ];

        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({ opportunityIds: allIds });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.dismissed).toBe(2); // Only the pending ones
        expect(response.body.skipped).toContain(responded._id.toString());
        expect(response.body.skipped).toContain(dismissed._id.toString());
      });

      it('should return skipped IDs in response', async () => {
        // Arrange
        const responded = createRespondedOpportunity(testAccountId, testAuthorId);
        await db.collection('opportunities').insertOne(responded);

        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({ opportunityIds: [responded._id.toString()] });

        // Assert
        expect(response.body.skipped).toEqual([responded._id.toString()]);
      });
    });

    describe('Cross-Account Protection', () => {
      it('should skip opportunities from other accounts', async () => {
        // Arrange
        const fixtures = createCrossAccountFixtures();

        // Insert both accounts
        await db.collection('accounts').insertMany([
          {
            _id: fixtures.account1Id,
            platform: 'bluesky',
            handle: '@account1.bsky.social',
          },
          {
            _id: fixtures.account2Id,
            platform: 'bluesky',
            handle: '@account2.bsky.social',
          },
        ]);

        // Insert author
        await db.collection('authors').insertOne(createMockAuthor({ _id: fixtures.authorId }));

        // Insert opportunities for both accounts
        await db
          .collection('opportunities')
          .insertMany([
            ...fixtures.account1Opportunities,
            ...fixtures.account2Opportunities,
          ]);

        // Current session is for testAccountId (different from both fixture accounts)
        // Attempt to dismiss account2's opportunities

        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({
            opportunityIds: fixtures.account2Opportunities.map((o) => o._id.toString()),
          });

        // Assert - should return 200 but skip all (wrong account)
        expect(response.status).toBe(200);
        expect(response.body.dismissed).toBe(0);
        expect(response.body.skipped.length).toBe(fixtures.account2Opportunities.length);

        // Verify account2 opportunities unchanged
        const account2Opps = await db
          .collection('opportunities')
          .find({ accountId: fixtures.account2Id })
          .toArray();
        account2Opps.forEach((opp) => {
          expect(opp.status).toBe('pending');
        });
      });

      it('should return 200 (not 403) with ID in skipped list for cross-account attempt', async () => {
        // Arrange
        const otherAccountId = new ObjectId();
        const otherAccountOpp = createBulkOpportunities(otherAccountId, testAuthorId, 1)[0];
        await db.collection('opportunities').insertOne(otherAccountOpp);

        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({ opportunityIds: [otherAccountOpp._id.toString()] });

        // Assert - graceful handling, not error
        expect(response.status).toBe(200);
        expect(response.body.dismissed).toBe(0);
        expect(response.body.skipped).toContain(otherAccountOpp._id.toString());
      });
    });

    describe('Error Handling', () => {
      it('should return 400 when opportunityIds is missing', async () => {
        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({});

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('opportunityIds array is required');
      });

      it('should return 400 when opportunityIds is empty array', async () => {
        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({ opportunityIds: [] });

        // Assert
        expect(response.status).toBe(400);
      });

      it('should return 400 when opportunityIds is not an array', async () => {
        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({ opportunityIds: 'not-an-array' });

        // Assert
        expect(response.status).toBe(400);
      });

      it('should return 401 when not authenticated', async () => {
        // Act - no session cookies
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .send({ opportunityIds: [new ObjectId().toString()] });

        // Assert
        expect(response.status).toBe(401);
      });

      it('should handle invalid ObjectId gracefully', async () => {
        // Arrange - mix valid and invalid IDs
        const pending = createBulkOpportunities(testAccountId, testAuthorId, 1)[0];
        await db.collection('opportunities').insertOne(pending);

        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({
            opportunityIds: [pending._id.toString(), 'invalid-id', 'also-not-valid'],
          });

        // Assert - should still dismiss the valid one
        expect(response.status).toBe(200);
        expect(response.body.dismissed).toBe(1);
      });

      it('should handle non-existent IDs by adding to skipped list', async () => {
        // Arrange
        const nonExistentId = new ObjectId().toString();

        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({ opportunityIds: [nonExistentId] });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.dismissed).toBe(0);
        expect(response.body.skipped).toContain(nonExistentId);
      });
    });

    describe('Batch Size', () => {
      it('should handle dismissing many opportunities at once', async () => {
        // Arrange - create 50 opportunities
        const opportunities = createBulkOpportunities(testAccountId, testAuthorId, 50);
        await db.collection('opportunities').insertMany(opportunities);

        const ids = opportunities.map((o) => o._id.toString());

        // Act
        const response = await request(app)
          .post('/api/opportunities/bulk-dismiss')
          .set('Cookie', sessionCookies)
          .send({ opportunityIds: ids });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.dismissed).toBe(50);
        expect(response.body.skipped).toEqual([]);

        // Verify all dismissed
        const remaining = await db
          .collection('opportunities')
          .find({ status: 'pending' })
          .toArray();
        expect(remaining).toHaveLength(0);
      });
    });
  });
});
