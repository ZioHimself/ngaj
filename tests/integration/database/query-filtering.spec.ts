/**
 * Query Filtering Integration Tests
 *
 * Tests for excluding expired opportunities from pending queries.
 *
 * @see ADR-018: Expiration Mechanics
 * @see Design: .agents/artifacts/designer/designs/expiration-mechanics-design.md (Section 4)
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import {
  createRecentOpportunity,
  createExpiredOpportunity,
  createExpiredStatusOpportunity,
  createDismissedOpportunity,
  createRespondedOpportunity,
  OPPORTUNITY_TTL_HOURS,
} from '@tests/fixtures/cleanup-fixtures';
import { createMockAuthor } from '@tests/fixtures/opportunity-fixtures';

/**
 * Simulates the getOpportunities query logic from DiscoveryService
 * This is the query that needs to exclude expired opportunities
 */
async function getOpportunities(
  db: Db,
  accountId: ObjectId,
  filters?: { status?: string | string[] }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = { accountId };

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query.status = { $in: filters.status };
    } else if (filters.status === 'pending') {
      // Exclude expired when querying pending (ADR-018)
      query.status = 'pending';
      query.expiresAt = { $gt: new Date() }; // Not yet expired
    } else {
      query.status = filters.status;
    }
  }

  return db
    .collection('opportunities')
    .find(query)
    .sort({ 'scoring.total': -1 })
    .toArray();
}

describe('Query Filtering - Exclude Expired from Pending', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;

  const accountId = new ObjectId();
  const authorId = new ObjectId();

  beforeAll(async () => {
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
    await db.collection('opportunities').deleteMany({});
    await db.collection('authors').deleteMany({});
    await db.collection('authors').insertOne(createMockAuthor({ _id: authorId }));
  });

  afterEach(async () => {
    await db.collection('opportunities').deleteMany({});
  });

  describe('Pending Status Query', () => {
    it('should exclude pending opportunities with expiresAt in past', async () => {
      // Arrange
      // 2 pending opportunities (not expired)
      const pending1 = createRecentOpportunity(accountId, authorId);
      const pending2 = createRecentOpportunity(accountId, authorId);
      // 1 pending opportunity with expiresAt in past (should be excluded)
      const expiredPending = createExpiredOpportunity(accountId, authorId);

      await db.collection('opportunities').insertMany([pending1, pending2, expiredPending]);

      // Act
      const results = await getOpportunities(db, accountId, { status: 'pending' });

      // Assert
      expect(results).toHaveLength(2);
      results.forEach((opp) => {
        expect(opp.expiresAt.getTime()).toBeGreaterThan(Date.now());
      });
    });

    it('should exclude opportunities with status=expired', async () => {
      // Arrange
      const pending = createRecentOpportunity(accountId, authorId);
      const expired = createExpiredStatusOpportunity(accountId, authorId);
      await db.collection('opportunities').insertMany([pending, expired]);

      // Act
      const results = await getOpportunities(db, accountId, { status: 'pending' });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('pending');
    });

    it('should include pending opportunities with future expiresAt', async () => {
      // Arrange
      const pending1 = createRecentOpportunity(accountId, authorId);
      const pending2 = createRecentOpportunity(accountId, authorId);
      await db.collection('opportunities').insertMany([pending1, pending2]);

      // Act
      const results = await getOpportunities(db, accountId, { status: 'pending' });

      // Assert
      expect(results).toHaveLength(2);
      results.forEach((opp) => {
        expect(opp.status).toBe('pending');
        expect(opp.expiresAt.getTime()).toBeGreaterThan(Date.now());
      });
    });

    it('should include expiresAt > now condition in query', async () => {
      // Arrange - opportunity that expires right at the boundary
      const now = Date.now();
      const justExpired = createRecentOpportunity(accountId, authorId, {
        expiresAt: new Date(now - 1000), // 1 second in past
      });
      const notYetExpired = createRecentOpportunity(accountId, authorId, {
        expiresAt: new Date(now + 1000), // 1 second in future
      });

      await db.collection('opportunities').insertMany([justExpired, notYetExpired]);

      // Act
      const results = await getOpportunities(db, accountId, { status: 'pending' });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toEqual(notYetExpired._id);
    });
  });

  describe('Mixed Status Scenarios', () => {
    it('should return only valid pending from mixed dataset', async () => {
      // Arrange
      const pending1 = createRecentOpportunity(accountId, authorId);
      const pending2 = createRecentOpportunity(accountId, authorId);
      const expiredPending = createExpiredOpportunity(accountId, authorId);
      const expiredStatus = createExpiredStatusOpportunity(accountId, authorId);
      const dismissed = createDismissedOpportunity(accountId, authorId, 10);
      const responded = createRespondedOpportunity(accountId, authorId);

      await db
        .collection('opportunities')
        .insertMany([
          pending1,
          pending2,
          expiredPending,
          expiredStatus,
          dismissed,
          responded,
        ]);

      // Act
      const results = await getOpportunities(db, accountId, { status: 'pending' });

      // Assert
      expect(results).toHaveLength(2);
      results.forEach((opp) => {
        expect(opp.status).toBe('pending');
        expect(opp.expiresAt.getTime()).toBeGreaterThan(Date.now());
      });
    });

    it('should return all dismissed when querying dismissed status', async () => {
      // Arrange
      const pending = createRecentOpportunity(accountId, authorId);
      const dismissed1 = createDismissedOpportunity(accountId, authorId, 2);
      const dismissed2 = createDismissedOpportunity(accountId, authorId, 10);

      await db.collection('opportunities').insertMany([pending, dismissed1, dismissed2]);

      // Act
      const results = await getOpportunities(db, accountId, { status: 'dismissed' });

      // Assert
      expect(results).toHaveLength(2);
      results.forEach((opp) => {
        expect(opp.status).toBe('dismissed');
      });
    });

    it('should return all responded when querying responded status', async () => {
      // Arrange
      const pending = createRecentOpportunity(accountId, authorId);
      const responded = createRespondedOpportunity(accountId, authorId);

      await db.collection('opportunities').insertMany([pending, responded]);

      // Act
      const results = await getOpportunities(db, accountId, { status: 'responded' });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('responded');
    });
  });

  describe('Edge Cases', () => {
    it('should handle opportunities expiring exactly at query time', async () => {
      // Arrange
      const now = new Date();
      const expiringNow = createRecentOpportunity(accountId, authorId, {
        expiresAt: now, // Exactly now
      });
      await db.collection('opportunities').insertOne(expiringNow);

      // Act
      const results = await getOpportunities(db, accountId, { status: 'pending' });

      // Assert - $gt means strictly greater, so exactly-now should be excluded
      expect(results).toHaveLength(0);
    });

    it('should return empty array when all pending are expired', async () => {
      // Arrange
      const expired1 = createExpiredOpportunity(accountId, authorId);
      const expired2 = createExpiredOpportunity(accountId, authorId);
      await db.collection('opportunities').insertMany([expired1, expired2]);

      // Act
      const results = await getOpportunities(db, accountId, { status: 'pending' });

      // Assert
      expect(results).toHaveLength(0);
    });

    it('should correctly filter opportunities with TTL boundary (4 hours)', async () => {
      // Arrange
      const now = Date.now();
      // Opportunity discovered 3.5 hours ago (expires in 30 min) - should be included
      const almostExpired = createRecentOpportunity(accountId, authorId, {
        discoveredAt: new Date(now - 3.5 * 60 * 60 * 1000),
        expiresAt: new Date(now + 0.5 * 60 * 60 * 1000),
      });
      // Opportunity discovered 4.5 hours ago (expired 30 min ago) - should be excluded
      const alreadyExpired = createRecentOpportunity(accountId, authorId, {
        discoveredAt: new Date(now - 4.5 * 60 * 60 * 1000),
        expiresAt: new Date(now - 0.5 * 60 * 60 * 1000),
      });

      await db.collection('opportunities').insertMany([almostExpired, alreadyExpired]);

      // Act
      const results = await getOpportunities(db, accountId, { status: 'pending' });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]._id).toEqual(almostExpired._id);
    });

    it('should not apply expiresAt filter to non-pending status queries', async () => {
      // Arrange - dismissed with expired expiresAt should still be returned
      const dismissed = createDismissedOpportunity(accountId, authorId, 5, {
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired 1 hour ago
      });
      await db.collection('opportunities').insertOne(dismissed);

      // Act
      const results = await getOpportunities(db, accountId, { status: 'dismissed' });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('dismissed');
    });
  });

  describe('TTL Verification', () => {
    it('should use 4-hour TTL (ADR-018)', () => {
      // Assert
      expect(OPPORTUNITY_TTL_HOURS).toBe(4);
    });

    it('should create opportunities with correct expiresAt based on TTL', () => {
      // Arrange
      const now = Date.now();
      const opp = createRecentOpportunity(accountId, authorId);

      // Assert
      const expectedExpiry = opp.discoveredAt.getTime() + OPPORTUNITY_TTL_HOURS * 60 * 60 * 1000;
      expect(opp.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -3); // Within 1 second
    });
  });
});
