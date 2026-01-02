import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MongoClient, Db, ObjectId } from 'mongodb';
import {
  createMockOpportunity,
  createMockAuthor,
  createMockOpportunities
} from '@/tests/fixtures/opportunity-fixtures';
import { createMockAccount } from '@/tests/fixtures/account-fixtures';
import { createMockProfile } from '@/tests/fixtures/profile-fixtures';

describe('Opportunity Repository - Database Integration', () => {
  let client: MongoClient;
  let db: Db;
  const testDbName = 'ngaj_test_opportunity_discovery';

  beforeEach(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
    client = await MongoClient.connect(mongoUri);
    db = client.db(testDbName);

    // Create collections and indexes
    await setupTestDatabase(db);
  });

  afterEach(async () => {
    // Clean up test database
    await db.dropDatabase();
    await client.close();
  });

  async function setupTestDatabase(db: Db) {
    // Create opportunities collection with indexes
    const opportunities = db.collection('opportunities');
    await opportunities.createIndex(
      { accountId: 1, status: 1, 'scoring.total': -1 },
      { name: 'accountId_status_score' }
    );
    await opportunities.createIndex(
      { accountId: 1, postId: 1 },
      { unique: true, name: 'accountId_postId_unique' }
    );
    await opportunities.createIndex(
      { expiresAt: 1 },
      { name: 'expiresAt' }
    );
    await opportunities.createIndex(
      { status: 1, expiresAt: 1 },
      { name: 'status_expiresAt' }
    );
    await opportunities.createIndex(
      { authorId: 1 },
      { name: 'authorId' }
    );

    // Create authors collection with indexes
    const authors = db.collection('authors');
    await authors.createIndex(
      { platform: 1, platformUserId: 1 },
      { unique: true, name: 'platform_platformUserId_unique' }
    );
    await authors.createIndex(
      { handle: 1 },
      { name: 'handle' }
    );
  }

  describe('Opportunity Indexes', () => {
    it('should use compound index for prioritized opportunity queries', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      // Insert test opportunities
      const testOpps = createMockOpportunities(accountId, authorId, 10, 'pending');
      await opportunities.insertMany(testOpps);

      // Act
      const query = opportunities.find({
        accountId,
        status: 'pending'
      }).sort({ 'scoring.total': -1 });

      const explain = await query.explain();

      // Assert
      expect(explain.executionStats?.totalDocsExamined).toBeLessThanOrEqual(10);
      expect(explain.queryPlanner?.winningPlan?.inputStage?.indexName).toBe('accountId_status_score');
    });

    it('should enforce unique constraint on (accountId, postId)', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      const opportunity = createMockOpportunity(accountId, authorId, {
        postId: 'at://did:plc:author/app.bsky.feed.post/duplicate'
      });

      await opportunities.insertOne(opportunity);

      // Act & Assert
      const duplicate = createMockOpportunity(accountId, authorId, {
        postId: 'at://did:plc:author/app.bsky.feed.post/duplicate'
      });

      await expect(opportunities.insertOne(duplicate)).rejects.toThrow();
    });

    it('should use expiresAt index for expiration queries', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      const testOpps = createMockOpportunities(accountId, authorId, 5, 'pending');
      await opportunities.insertMany(testOpps);

      // Act
      const query = opportunities.find({
        status: 'pending',
        expiresAt: { $lt: new Date() }
      });

      const explain = await query.explain();

      // Assert
      expect(explain.queryPlanner?.winningPlan?.inputStage?.indexName).toMatch(/expiresAt/);
    });
  });

  describe('Author Upsert Operations', () => {
    it('should create new author when not exists', async () => {
      // Arrange
      const authors = db.collection('authors');
      const authorData = {
        platform: 'bluesky' as const,
        platformUserId: 'did:plc:newauthor123',
        handle: '@newauthor.bsky.social',
        displayName: 'New Author',
        bio: 'Test bio',
        followerCount: 100,
        lastUpdatedAt: new Date()
      };

      // Act
      const result = await authors.updateOne(
        { platform: authorData.platform, platformUserId: authorData.platformUserId },
        { $set: authorData },
        { upsert: true }
      );

      // Assert
      expect(result.upsertedCount).toBe(1);
      expect(result.upsertedId).toBeDefined();

      const inserted = await authors.findOne({ platformUserId: authorData.platformUserId });
      expect(inserted).toBeDefined();
      expect(inserted?.handle).toBe('@newauthor.bsky.social');
    });

    it('should update existing author when already exists', async () => {
      // Arrange
      const authors = db.collection('authors');
      const initialAuthor = createMockAuthor({
        platformUserId: 'did:plc:existing123',
        followerCount: 1000
      });

      await authors.insertOne(initialAuthor);

      // Act - Upsert with updated follower count
      const updatedData = {
        platform: 'bluesky' as const,
        platformUserId: 'did:plc:existing123',
        handle: '@existing.bsky.social',
        displayName: 'Existing Author',
        bio: 'Updated bio',
        followerCount: 2000, // Updated
        lastUpdatedAt: new Date()
      };

      const result = await authors.updateOne(
        { platform: updatedData.platform, platformUserId: updatedData.platformUserId },
        { $set: updatedData },
        { upsert: true }
      );

      // Assert
      expect(result.matchedCount).toBe(1);
      expect(result.modifiedCount).toBe(1);
      expect(result.upsertedCount).toBe(0);

      const updated = await authors.findOne({ platformUserId: 'did:plc:existing123' });
      expect(updated?.followerCount).toBe(2000);
    });

    it('should not create duplicate authors', async () => {
      // Arrange
      const authors = db.collection('authors');
      const authorData = {
        platform: 'bluesky' as const,
        platformUserId: 'did:plc:test123',
        handle: '@test.bsky.social',
        displayName: 'Test',
        followerCount: 100,
        lastUpdatedAt: new Date()
      };

      // Act - Upsert twice
      await authors.updateOne(
        { platform: authorData.platform, platformUserId: authorData.platformUserId },
        { $set: authorData },
        { upsert: true }
      );

      await authors.updateOne(
        { platform: authorData.platform, platformUserId: authorData.platformUserId },
        { $set: { ...authorData, followerCount: 200 } },
        { upsert: true }
      );

      // Assert - Only one document exists
      const count = await authors.countDocuments({ platformUserId: 'did:plc:test123' });
      expect(count).toBe(1);
    });
  });

  describe('Opportunity Queries', () => {
    it('should return opportunities sorted by total score descending', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      const testOpps = [
        createMockOpportunity(accountId, authorId, {
          scoring: { recency: 90, impact: 50, total: 76 }
        }),
        createMockOpportunity(accountId, authorId, {
          scoring: { recency: 50, impact: 60, total: 54 }
        }),
        createMockOpportunity(accountId, authorId, {
          scoring: { recency: 100, impact: 40, total: 76 }
        })
      ];

      await opportunities.insertMany(testOpps);

      // Act
      const results = await opportunities
        .find({ accountId, status: 'pending' })
        .sort({ 'scoring.total': -1 })
        .toArray();

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].scoring.total).toBeGreaterThanOrEqual(results[1].scoring.total);
      expect(results[1].scoring.total).toBeGreaterThanOrEqual(results[2].scoring.total);
    });

    it('should filter opportunities by status', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      await opportunities.insertMany([
        createMockOpportunity(accountId, authorId, { status: 'pending' }),
        createMockOpportunity(accountId, authorId, { status: 'pending' }),
        createMockOpportunity(accountId, authorId, { status: 'dismissed' }),
        createMockOpportunity(accountId, authorId, { status: 'responded' })
      ]);

      // Act
      const pending = await opportunities.find({ accountId, status: 'pending' }).toArray();
      const dismissed = await opportunities.find({ accountId, status: 'dismissed' }).toArray();
      const responded = await opportunities.find({ accountId, status: 'responded' }).toArray();

      // Assert
      expect(pending).toHaveLength(2);
      expect(dismissed).toHaveLength(1);
      expect(responded).toHaveLength(1);
    });

    it('should filter opportunities by multiple statuses using $in', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      await opportunities.insertMany([
        createMockOpportunity(accountId, authorId, { status: 'pending' }),
        createMockOpportunity(accountId, authorId, { status: 'dismissed' }),
        createMockOpportunity(accountId, authorId, { status: 'responded' }),
        createMockOpportunity(accountId, authorId, { status: 'expired' })
      ]);

      // Act
      const results = await opportunities
        .find({ accountId, status: { $in: ['pending', 'responded'] } })
        .toArray();

      // Assert
      expect(results).toHaveLength(2);
      expect(results.every((opp) => ['pending', 'responded'].includes(opp.status))).toBe(true);
    });

    it('should support pagination with limit and skip', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      const testOpps = createMockOpportunities(accountId, authorId, 25, 'pending');
      await opportunities.insertMany(testOpps);

      // Act
      const page1 = await opportunities
        .find({ accountId, status: 'pending' })
        .sort({ 'scoring.total': -1 })
        .limit(20)
        .skip(0)
        .toArray();

      const page2 = await opportunities
        .find({ accountId, status: 'pending' })
        .sort({ 'scoring.total': -1 })
        .limit(20)
        .skip(20)
        .toArray();

      // Assert
      expect(page1).toHaveLength(20);
      expect(page2).toHaveLength(5);
    });
  });

  describe('Opportunity Expiration', () => {
    it('should expire pending opportunities past TTL', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      const expiredOpp1 = createMockOpportunity(accountId, authorId, {
        status: 'pending',
        discoveredAt: new Date('2026-01-01T12:00:00Z'),
        expiresAt: new Date('2026-01-02T12:00:00Z') // In the past
      });

      const expiredOpp2 = createMockOpportunity(accountId, authorId, {
        status: 'pending',
        discoveredAt: new Date('2026-01-01T10:00:00Z'),
        expiresAt: new Date('2026-01-02T10:00:00Z') // In the past
      });

      const futureOpp = createMockOpportunity(accountId, authorId, {
        status: 'pending',
        discoveredAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // Future
      });

      await opportunities.insertMany([expiredOpp1, expiredOpp2, futureOpp]);

      // Act
      const result = await opportunities.updateMany(
        {
          status: 'pending',
          expiresAt: { $lt: new Date() }
        },
        {
          $set: {
            status: 'expired',
            updatedAt: new Date()
          }
        }
      );

      // Assert
      expect(result.modifiedCount).toBe(2);

      const expired = await opportunities.find({ status: 'expired' }).toArray();
      expect(expired).toHaveLength(2);

      const stillPending = await opportunities.find({ status: 'pending' }).toArray();
      expect(stillPending).toHaveLength(1);
    });

    it('should calculate correct expiresAt on opportunity creation', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      const discoveredAt = new Date('2026-01-01T12:00:00Z');
      const ttlHours = 48;
      const expectedExpiresAt = new Date(discoveredAt.getTime() + ttlHours * 60 * 60 * 1000);

      const opportunity = createMockOpportunity(accountId, authorId, {
        discoveredAt,
        expiresAt: expectedExpiresAt
      });

      // Act
      await opportunities.insertOne(opportunity);

      // Assert
      const inserted = await opportunities.findOne({ _id: opportunity._id });
      expect(inserted?.expiresAt).toEqual(expectedExpiresAt);
    });
  });

  describe('Deduplication Logic', () => {
    it('should prevent duplicate opportunities with same (accountId, postId)', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      const postId = 'at://did:plc:author/app.bsky.feed.post/unique123';

      // Act - Insert first opportunity
      const opp1 = createMockOpportunity(accountId, authorId, { postId });
      await opportunities.insertOne(opp1);

      // Act - Try to insert duplicate
      const opp2 = createMockOpportunity(accountId, authorId, { postId });

      // Assert
      await expect(opportunities.insertOne(opp2)).rejects.toThrow();

      const count = await opportunities.countDocuments({ accountId, postId });
      expect(count).toBe(1);
    });

    it('should allow same postId for different accounts', async () => {
      // Arrange
      const account1Id = new ObjectId();
      const account2Id = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      const postId = 'at://did:plc:author/app.bsky.feed.post/shared';

      // Act
      const opp1 = createMockOpportunity(account1Id, authorId, { postId });
      const opp2 = createMockOpportunity(account2Id, authorId, { postId });

      await opportunities.insertOne(opp1);
      await opportunities.insertOne(opp2);

      // Assert
      const count = await opportunities.countDocuments({ postId });
      expect(count).toBe(2);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large result sets efficiently', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const opportunities = db.collection('opportunities');

      // Insert 1000 opportunities
      const testOpps = createMockOpportunities(accountId, authorId, 1000, 'pending');
      await opportunities.insertMany(testOpps);

      // Act
      const startTime = Date.now();
      const results = await opportunities
        .find({ accountId, status: 'pending' })
        .sort({ 'scoring.total': -1 })
        .limit(20)
        .toArray();
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(100); // Should be < 100ms with proper indexes
    });
  });
});

