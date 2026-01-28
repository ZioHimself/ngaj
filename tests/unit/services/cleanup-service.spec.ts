/**
 * CleanupService Unit Tests
 *
 * Tests for opportunity expiration marking, hard deletion, cascade deletion,
 * and preservation of responded opportunities.
 *
 * @see ADR-018: Expiration Mechanics
 * @see Design: .agents/artifacts/designer/designs/expiration-mechanics-design.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { CleanupService, DISMISSED_RETENTION_MS } from '@ngaj/backend/services/cleanup-service';
import {
  createCleanupFixtures,
  createExpiredOpportunity,
  createRecentOpportunity,
  createDismissedOpportunity,
  createRespondedOpportunity,
  createExpiredStatusOpportunity,
  createLinkedResponse,
  createBulkOpportunities,
} from '@tests/fixtures/cleanup-fixtures';
import { createMockAuthor } from '@tests/fixtures/opportunity-fixtures';

describe('CleanupService', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let cleanupService: CleanupService;

  // Test identifiers
  const accountId = new ObjectId();
  const authorId = new ObjectId();

  beforeEach(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db = mongoClient.db('ngaj-test');

    // Create service instance
    cleanupService = new CleanupService(db);

    // Insert test author
    await db.collection('authors').insertOne(createMockAuthor({ _id: authorId }));
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoServer.stop();
    vi.clearAllMocks();
  });

  describe('cleanup() - Mark Expired', () => {
    it('should mark pending opportunities as expired when expiresAt is in the past', async () => {
      // Arrange
      const expiredOpp = createExpiredOpportunity(accountId, authorId);
      await db.collection('opportunities').insertOne(expiredOpp);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.expired).toBe(1);

      const updated = await db.collection('opportunities').findOne({ _id: expiredOpp._id });
      expect(updated?.status).toBe('expired');
      expect(updated?.updatedAt).toBeDefined();
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(expiredOpp.updatedAt.getTime());
    });

    it('should NOT mark pending opportunities as expired when expiresAt is in the future', async () => {
      // Arrange
      const validOpp = createRecentOpportunity(accountId, authorId);
      await db.collection('opportunities').insertOne(validOpp);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.expired).toBe(0);

      const unchanged = await db.collection('opportunities').findOne({ _id: validOpp._id });
      expect(unchanged?.status).toBe('pending');
    });

    it('should only mark pending opportunities as expired, not other statuses', async () => {
      // Arrange
      const fixtures = createCleanupFixtures(accountId, authorId);
      await db.collection('opportunities').insertMany([
        fixtures.pendingExpired, // Should be marked expired
        fixtures.dismissedOld, // Already dismissed - not affected by expiration marking
        fixtures.responded, // Responded - never affected
      ]);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert - only 1 pending opportunity marked expired
      expect(stats.expired).toBe(1);

      const pending = await db.collection('opportunities').findOne({
        _id: fixtures.pendingExpired._id,
      });
      expect(pending?.status).toBe('expired');

      const dismissed = await db.collection('opportunities').findOne({
        _id: fixtures.dismissedOld._id,
      });
      expect(dismissed?.status).toBe('dismissed');

      const responded = await db.collection('opportunities').findOne({
        _id: fixtures.responded._id,
      });
      expect(responded?.status).toBe('responded');
    });

    it('should update updatedAt timestamp when marking as expired', async () => {
      // Arrange
      const expiredOpp = createExpiredOpportunity(accountId, authorId);
      const originalUpdatedAt = expiredOpp.updatedAt;
      await db.collection('opportunities').insertOne(expiredOpp);

      // Advance time slightly
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      // Act
      await cleanupService.cleanup();

      // Assert
      const updated = await db.collection('opportunities').findOne({ _id: expiredOpp._id });
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

      vi.useRealTimers();
    });
  });

  describe('cleanup() - Hard Delete Expired', () => {
    it('should hard delete opportunities with status=expired immediately', async () => {
      // Arrange
      const expiredStatusOpp = createExpiredStatusOpportunity(accountId, authorId);
      await db.collection('opportunities').insertOne(expiredStatusOpp);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.deletedExpired).toBe(1);

      const deleted = await db.collection('opportunities').findOne({
        _id: expiredStatusOpp._id,
      });
      expect(deleted).toBeNull();
    });

    it('should delete all expired opportunities in single operation', async () => {
      // Arrange - create multiple expired opportunities
      const expired1 = createExpiredStatusOpportunity(accountId, authorId);
      const expired2 = createExpiredStatusOpportunity(accountId, authorId);
      const expired3 = createExpiredStatusOpportunity(accountId, authorId);
      await db.collection('opportunities').insertMany([expired1, expired2, expired3]);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.deletedExpired).toBe(3);

      const remaining = await db.collection('opportunities').countDocuments({
        status: 'expired',
      });
      expect(remaining).toBe(0);
    });

    it('should return count of deleted items in CleanupStats.deletedExpired', async () => {
      // Arrange
      const expired = createExpiredStatusOpportunity(accountId, authorId);
      await db.collection('opportunities').insertOne(expired);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.deletedExpired).toBeGreaterThan(0);
      expect(typeof stats.deletedExpired).toBe('number');
    });
  });

  describe('cleanup() - Hard Delete Dismissed', () => {
    it('should hard delete dismissed opportunities after 5 minutes', async () => {
      // Arrange - dismissed 10 minutes ago (should be deleted)
      const oldDismissed = createDismissedOpportunity(accountId, authorId, 10);
      await db.collection('opportunities').insertOne(oldDismissed);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.deletedDismissed).toBe(1);

      const deleted = await db.collection('opportunities').findOne({
        _id: oldDismissed._id,
      });
      expect(deleted).toBeNull();
    });

    it('should NOT delete dismissed opportunities less than 5 minutes old', async () => {
      // Arrange - dismissed 2 minutes ago (should be kept)
      const recentDismissed = createDismissedOpportunity(accountId, authorId, 2);
      await db.collection('opportunities').insertOne(recentDismissed);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.deletedDismissed).toBe(0);

      const kept = await db.collection('opportunities').findOne({
        _id: recentDismissed._id,
      });
      expect(kept).not.toBeNull();
      expect(kept?.status).toBe('dismissed');
    });

    it('should delete dismissed at exactly 5 minutes (boundary condition)', async () => {
      // Arrange - dismissed exactly 5 minutes ago
      const boundaryDismissed = createDismissedOpportunity(accountId, authorId, 5);
      await db.collection('opportunities').insertOne(boundaryDismissed);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert - >= 5 minutes should be deleted
      expect(stats.deletedDismissed).toBe(1);

      const deleted = await db.collection('opportunities').findOne({
        _id: boundaryDismissed._id,
      });
      expect(deleted).toBeNull();
    });

    it('should return count in CleanupStats.deletedDismissed', async () => {
      // Arrange
      const dismissed1 = createDismissedOpportunity(accountId, authorId, 10);
      const dismissed2 = createDismissedOpportunity(accountId, authorId, 15);
      await db.collection('opportunities').insertMany([dismissed1, dismissed2]);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.deletedDismissed).toBe(2);
    });
  });

  describe('cleanup() - Cascade Delete Responses', () => {
    it('should delete associated responses when opportunity is deleted', async () => {
      // Arrange
      const expiredOpp = createExpiredStatusOpportunity(accountId, authorId);
      const linkedResponse = createLinkedResponse(expiredOpp._id, accountId);
      await db.collection('opportunities').insertOne(expiredOpp);
      await db.collection('responses').insertOne(linkedResponse);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.deletedResponses).toBe(1);

      const deletedResponse = await db.collection('responses').findOne({
        _id: linkedResponse._id,
      });
      expect(deletedResponse).toBeNull();
    });

    it('should NOT delete responses for non-deleted opportunities', async () => {
      // Arrange - responded opportunity (never deleted) with response
      const respondedOpp = createRespondedOpportunity(accountId, authorId);
      const response = createLinkedResponse(respondedOpp._id, accountId);
      await db.collection('opportunities').insertOne(respondedOpp);
      await db.collection('responses').insertOne(response);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.deletedResponses).toBe(0);

      const keptResponse = await db.collection('responses').findOne({
        _id: response._id,
      });
      expect(keptResponse).not.toBeNull();
    });

    it('should cascade delete multiple responses for multiple opportunities', async () => {
      // Arrange - two expired opportunities with responses
      const expired1 = createExpiredStatusOpportunity(accountId, authorId);
      const expired2 = createExpiredStatusOpportunity(accountId, authorId);
      const response1 = createLinkedResponse(expired1._id, accountId);
      const response2 = createLinkedResponse(expired2._id, accountId);
      const response3 = createLinkedResponse(expired1._id, accountId); // Second response for same opp

      await db.collection('opportunities').insertMany([expired1, expired2]);
      await db.collection('responses').insertMany([response1, response2, response3]);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.deletedResponses).toBe(3);
      expect(stats.deletedExpired).toBe(2);

      const remainingResponses = await db.collection('responses').countDocuments({});
      expect(remainingResponses).toBe(0);
    });

    it('should return count in CleanupStats.deletedResponses', async () => {
      // Arrange
      const expiredOpp = createExpiredStatusOpportunity(accountId, authorId);
      const response1 = createLinkedResponse(expiredOpp._id, accountId);
      const response2 = createLinkedResponse(expiredOpp._id, accountId);
      await db.collection('opportunities').insertOne(expiredOpp);
      await db.collection('responses').insertMany([response1, response2]);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.deletedResponses).toBe(2);
    });
  });

  describe('cleanup() - Preserve Responded', () => {
    it('should NOT affect opportunities with status=responded', async () => {
      // Arrange
      const respondedOpp = createRespondedOpportunity(accountId, authorId);
      await db.collection('opportunities').insertOne(respondedOpp);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.expired).toBe(0);
      expect(stats.deletedExpired).toBe(0);
      expect(stats.deletedDismissed).toBe(0);

      const preserved = await db.collection('opportunities').findOne({
        _id: respondedOpp._id,
      });
      expect(preserved).not.toBeNull();
      expect(preserved?.status).toBe('responded');
    });

    it('should preserve responded opportunities regardless of age', async () => {
      // Arrange - responded opportunity with old discoveredAt (but should still be kept)
      const ancientResponded = createRespondedOpportunity(accountId, authorId, {
        discoveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      });
      await db.collection('opportunities').insertOne(ancientResponded);

      // Act
      await cleanupService.cleanup();

      // Assert - should still exist
      const preserved = await db.collection('opportunities').findOne({
        _id: ancientResponded._id,
      });
      expect(preserved).not.toBeNull();
      expect(preserved?.status).toBe('responded');
    });
  });

  describe('cleanup() - Complete Cycle', () => {
    it('should process all cleanup operations in correct order', async () => {
      // Arrange - comprehensive test with all scenarios
      const fixtures = createCleanupFixtures(accountId, authorId);

      // Create responses for some opportunities
      const responseForExpired = createLinkedResponse(fixtures.expiredStatus._id, accountId);
      const responseForResponded = createLinkedResponse(fixtures.responded._id, accountId);

      await db.collection('opportunities').insertMany([
        fixtures.pendingExpired, // Should be marked expired
        fixtures.pendingValid, // Should remain pending
        fixtures.expiredStatus, // Should be deleted
        fixtures.dismissedRecent, // Should be kept (< 5 min)
        fixtures.dismissedOld, // Should be deleted (>= 5 min)
        fixtures.responded, // Should be preserved
      ]);

      await db.collection('responses').insertMany([
        responseForExpired, // Should be deleted with expired opportunity
        responseForResponded, // Should be kept with responded opportunity
      ]);

      // Act
      const stats = await cleanupService.cleanup();

      // Assert stats
      expect(stats.expired).toBe(1); // pendingExpired → expired
      expect(stats.deletedExpired).toBeGreaterThanOrEqual(1); // expiredStatus + newly marked
      expect(stats.deletedDismissed).toBe(1); // dismissedOld
      expect(stats.deletedResponses).toBe(1); // responseForExpired

      // Verify remaining documents
      const remainingOpps = await db.collection('opportunities').find({}).toArray();
      const statuses = remainingOpps.map((o) => o.status);

      // Should have: pendingValid, dismissedRecent, responded
      expect(statuses).toContain('pending'); // pendingValid
      expect(statuses).toContain('dismissed'); // dismissedRecent
      expect(statuses).toContain('responded'); // responded
      expect(remainingOpps.length).toBe(3);

      // Response for responded should still exist
      const keptResponse = await db.collection('responses').findOne({
        _id: responseForResponded._id,
      });
      expect(keptResponse).not.toBeNull();
    });

    it('should return zeroes when no items to process', async () => {
      // Arrange - empty database
      // Act
      const stats = await cleanupService.cleanup();

      // Assert
      expect(stats.expired).toBe(0);
      expect(stats.deletedExpired).toBe(0);
      expect(stats.deletedDismissed).toBe(0);
      expect(stats.deletedResponses).toBe(0);
    });
  });

  describe('start() and stop()', () => {
    it('should start the cleanup job', () => {
      // Arrange & Act
      expect(() => cleanupService.start()).not.toThrow();

      // Cleanup
      cleanupService.stop();
    });

    it('should stop the cleanup job', () => {
      // Arrange
      cleanupService.start();

      // Act & Assert
      expect(() => cleanupService.stop()).not.toThrow();
    });

    it('should be idempotent for multiple start calls', () => {
      // Arrange & Act
      cleanupService.start();
      expect(() => cleanupService.start()).not.toThrow();

      // Cleanup
      cleanupService.stop();
    });

    it('should be idempotent for multiple stop calls', () => {
      // Arrange
      cleanupService.start();
      cleanupService.stop();

      // Act & Assert
      expect(() => cleanupService.stop()).not.toThrow();
    });
  });
});
