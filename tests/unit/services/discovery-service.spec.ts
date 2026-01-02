import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { DiscoveryService } from '@/services/discovery-service';
import type { ScoringService } from '@/services/scoring-service';
import type { IPlatformAdapter } from '@/adapters/platform-adapter';
import {
  createMockOpportunity,
  createMockAuthor,
  createMockRawPost,
  createMockRawAuthor,
  createOpportunityFixtures
} from '@/tests/fixtures/opportunity-fixtures';
import { createMockAccount } from '@/tests/fixtures/account-fixtures';
import { createMockProfile } from '@/tests/fixtures/profile-fixtures';

describe('DiscoveryService', () => {
  let discoveryService: DiscoveryService;
  let mockDb: any;
  let mockPlatformAdapter: IPlatformAdapter;
  let mockScoringService: ScoringService;

  beforeEach(() => {
    // Mock database collections
    mockDb = {
      collection: vi.fn((name: string) => ({
        findOne: vi.fn(),
        find: vi.fn(() => ({
          sort: vi.fn(() => ({
            limit: vi.fn(() => ({
              skip: vi.fn(() => ({
                toArray: vi.fn()
              }))
            }))
          })),
          toArray: vi.fn()
        })),
        insertOne: vi.fn(),
        updateOne: vi.fn(),
        updateMany: vi.fn(),
        countDocuments: vi.fn()
      }))
    };

    // Mock platform adapter
    mockPlatformAdapter = {
      fetchReplies: vi.fn(),
      searchPosts: vi.fn(),
      getAuthor: vi.fn()
    };

    // Mock scoring service
    mockScoringService = {
      scoreOpportunity: vi.fn(),
      explainScore: vi.fn()
    } as unknown as ScoringService;

    discoveryService = new DiscoveryService(
      mockDb,
      mockPlatformAdapter,
      mockScoringService
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('discover() - replies', () => {
    it('should discover replies and create opportunities above threshold', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: new Date('2026-01-01T10:00:00Z')
            },
            {
              type: 'search',
              enabled: true,
              cronExpression: '0 */2 * * *',
              lastRunAt: undefined
            }
          ]
        }
      });

      const mockPosts = [
        createMockRawPost({
          id: 'at://did:plc:author1/app.bsky.feed.post/post1',
          authorId: 'did:plc:author1',
          createdAt: new Date('2026-01-01T11:55:00Z')
        }),
        createMockRawPost({
          id: 'at://did:plc:author2/app.bsky.feed.post/post2',
          authorId: 'did:plc:author2',
          createdAt: new Date('2026-01-01T11:50:00Z')
        }),
        createMockRawPost({
          id: 'at://did:plc:author3/app.bsky.feed.post/post3',
          authorId: 'did:plc:author3',
          createdAt: new Date('2026-01-01T11:45:00Z')
        })
      ];

      const mockAuthors = [
        createMockRawAuthor({ id: 'did:plc:author1' }),
        createMockRawAuthor({ id: 'did:plc:author2' }),
        createMockRawAuthor({ id: 'did:plc:author3' })
      ];

      // Mock scores: 2 above threshold (30), 1 below
      const mockScores = [
        { recency: 100, impact: 50, total: 80 }, // Above threshold
        { recency: 80, impact: 40, total: 64 },  // Above threshold
        { recency: 30, impact: 20, total: 26 }   // Below threshold
      ];

      // Mock database responses
      const accountsCollection = mockDb.collection('accounts');
      accountsCollection.findOne.mockResolvedValue(account);

      const profilesCollection = mockDb.collection('profiles');
      profilesCollection.findOne.mockResolvedValue(profile);

      const opportunitiesCollection = mockDb.collection('opportunities');
      opportunitiesCollection.findOne.mockResolvedValue(null); // No duplicates

      const authorsCollection = mockDb.collection('authors');
      authorsCollection.updateOne.mockResolvedValue({ upsertedId: new ObjectId() });

      opportunitiesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      accountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Mock adapter responses
      (mockPlatformAdapter.fetchReplies as any).mockResolvedValue(mockPosts);
      mockAuthors.forEach((author, i) => {
        (mockPlatformAdapter.getAuthor as any).mockResolvedValueOnce(author);
        (mockScoringService.scoreOpportunity as any).mockReturnValueOnce(mockScores[i]);
      });

      // Act
      const opportunities = await discoveryService.discover(accountId, 'replies');

      // Assert
      expect(mockPlatformAdapter.fetchReplies).toHaveBeenCalledWith({
        since: new Date('2026-01-01T10:00:00Z'),
        limit: 100
      });
      expect(mockPlatformAdapter.getAuthor).toHaveBeenCalledTimes(3);
      expect(mockScoringService.scoreOpportunity).toHaveBeenCalledTimes(3);
      expect(authorsCollection.updateOne).toHaveBeenCalledTimes(3); // All authors upserted
      expect(opportunitiesCollection.insertOne).toHaveBeenCalledTimes(2); // Only 2 above threshold
      expect(opportunities).toHaveLength(2);
      expect(accountsCollection.updateOne).toHaveBeenCalledWith(
        { _id: accountId },
        expect.objectContaining({
          $set: expect.objectContaining({
            'discovery.lastAt': expect.any(Date),
            'discovery.schedules.0.lastRunAt': expect.any(Date)
          })
        })
      );
    });

    it('should use fallback lookback when lastRunAt is undefined', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined // First run
            },
            {
              type: 'search',
              enabled: true,
              cronExpression: '0 */2 * * *',
              lastRunAt: undefined
            }
          ]
        }
      });

      const accountsCollection = mockDb.collection('accounts');
      accountsCollection.findOne.mockResolvedValue(account);

      const profilesCollection = mockDb.collection('profiles');
      profilesCollection.findOne.mockResolvedValue(profile);

      (mockPlatformAdapter.fetchReplies as any).mockResolvedValue([]);
      accountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await discoveryService.discover(accountId, 'replies');

      // Assert
      expect(mockPlatformAdapter.fetchReplies).toHaveBeenCalledWith(
        expect.objectContaining({
          since: expect.any(Date), // Should use fallback (2 hours ago)
          limit: 100
        })
      );

      const callArgs = (mockPlatformAdapter.fetchReplies as any).mock.calls[0][0];
      const sinceDate = callArgs.since as Date;
      const expectedSince = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const timeDiff = Math.abs(sinceDate.getTime() - expectedSince.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should deduplicate existing opportunities', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const existingAuthorId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      const mockPosts = [
        createMockRawPost({
          id: 'at://did:plc:author1/app.bsky.feed.post/duplicate',
          authorId: 'did:plc:author1'
        }),
        createMockRawPost({
          id: 'at://did:plc:author2/app.bsky.feed.post/new',
          authorId: 'did:plc:author2'
        })
      ];

      const existingOpportunity = createMockOpportunity(accountId, existingAuthorId, {
        postId: 'at://did:plc:author1/app.bsky.feed.post/duplicate'
      });

      const accountsCollection = mockDb.collection('accounts');
      accountsCollection.findOne.mockResolvedValue(account);

      const profilesCollection = mockDb.collection('profiles');
      profilesCollection.findOne.mockResolvedValue(profile);

      const opportunitiesCollection = mockDb.collection('opportunities');
      opportunitiesCollection.findOne
        .mockResolvedValueOnce(existingOpportunity) // First post is duplicate
        .mockResolvedValueOnce(null); // Second post is new

      (mockPlatformAdapter.fetchReplies as any).mockResolvedValue(mockPosts);
      (mockPlatformAdapter.getAuthor as any).mockResolvedValue(createMockRawAuthor());
      (mockScoringService.scoreOpportunity as any).mockReturnValue({
        recency: 80,
        impact: 50,
        total: 70
      });

      const authorsCollection = mockDb.collection('authors');
      authorsCollection.updateOne.mockResolvedValue({ upsertedId: new ObjectId() });

      opportunitiesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      accountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      const opportunities = await discoveryService.discover(accountId, 'replies');

      // Assert
      expect(opportunitiesCollection.insertOne).toHaveBeenCalledTimes(1); // Only 1 inserted
      expect(opportunities).toHaveLength(1);
    });

    it('should return empty array when no posts meet threshold', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      const mockPosts = [
        createMockRawPost({ id: 'post1', authorId: 'author1' }),
        createMockRawPost({ id: 'post2', authorId: 'author2' })
      ];

      // All scores below threshold
      const mockScore = { recency: 10, impact: 15, total: 12 };

      const accountsCollection = mockDb.collection('accounts');
      accountsCollection.findOne.mockResolvedValue(account);

      const profilesCollection = mockDb.collection('profiles');
      profilesCollection.findOne.mockResolvedValue(profile);

      const opportunitiesCollection = mockDb.collection('opportunities');
      opportunitiesCollection.findOne.mockResolvedValue(null);

      (mockPlatformAdapter.fetchReplies as any).mockResolvedValue(mockPosts);
      (mockPlatformAdapter.getAuthor as any).mockResolvedValue(createMockRawAuthor());
      (mockScoringService.scoreOpportunity as any).mockReturnValue(mockScore);

      const authorsCollection = mockDb.collection('authors');
      authorsCollection.updateOne.mockResolvedValue({ upsertedId: new ObjectId() });
      accountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      const opportunities = await discoveryService.discover(accountId, 'replies');

      // Assert
      expect(opportunities).toEqual([]);
      expect(opportunitiesCollection.insertOne).not.toHaveBeenCalled();
    });

    it('should update account.discovery.error on platform API failure', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      const accountsCollection = mockDb.collection('accounts');
      accountsCollection.findOne.mockResolvedValue(account);

      const profilesCollection = mockDb.collection('profiles');
      profilesCollection.findOne.mockResolvedValue(profile);

      const error = new Error('Rate limit exceeded');
      (mockPlatformAdapter.fetchReplies as any).mockRejectedValue(error);

      accountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act & Assert
      await expect(discoveryService.discover(accountId, 'replies')).rejects.toThrow('Rate limit exceeded');

      expect(accountsCollection.updateOne).toHaveBeenCalledWith(
        { _id: accountId },
        {
          $set: {
            'discovery.error': 'Rate limit exceeded'
          }
        }
      );
    });

    it('should NOT update lastAt on discovery failure', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      const accountsCollection = mockDb.collection('accounts');
      accountsCollection.findOne.mockResolvedValue(account);

      const profilesCollection = mockDb.collection('profiles');
      profilesCollection.findOne.mockResolvedValue(profile);

      (mockPlatformAdapter.fetchReplies as any).mockRejectedValue(new Error('API Error'));
      accountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act & Assert
      await expect(discoveryService.discover(accountId, 'replies')).rejects.toThrow();

      // Should only set error, not lastAt or lastRunAt
      expect(accountsCollection.updateOne).toHaveBeenCalledWith(
        { _id: accountId },
        {
          $set: {
            'discovery.error': expect.any(String)
          }
        }
      );
    });
  });

  describe('discover() - search', () => {
    it('should discover search results using profile keywords', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({
        _id: profileId,
        discovery: {
          interests: ['ai', 'typescript'],
          keywords: ['machine learning', 'graphql'],
          communities: ['@tech.bsky.social']
        }
      });
      const account = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: new Date('2026-01-01T10:00:00Z')
            },
            {
              type: 'search',
              enabled: true,
              cronExpression: '0 */2 * * *',
              lastRunAt: new Date('2026-01-01T08:00:00Z')
            }
          ]
        }
      });

      const mockPosts = [
        createMockRawPost({ id: 'post1', text: 'Great article about machine learning', authorId: 'author1' }),
        createMockRawPost({ id: 'post2', text: 'GraphQL best practices', authorId: 'author2' })
      ];

      const accountsCollection = mockDb.collection('accounts');
      accountsCollection.findOne.mockResolvedValue(account);

      const profilesCollection = mockDb.collection('profiles');
      profilesCollection.findOne.mockResolvedValue(profile);

      const opportunitiesCollection = mockDb.collection('opportunities');
      opportunitiesCollection.findOne.mockResolvedValue(null);

      (mockPlatformAdapter.searchPosts as any).mockResolvedValue(mockPosts);
      (mockPlatformAdapter.getAuthor as any).mockResolvedValue(createMockRawAuthor());
      (mockScoringService.scoreOpportunity as any).mockReturnValue({
        recency: 80,
        impact: 50,
        total: 70
      });

      const authorsCollection = mockDb.collection('authors');
      authorsCollection.updateOne.mockResolvedValue({ upsertedId: new ObjectId() });

      opportunitiesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      accountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      const opportunities = await discoveryService.discover(accountId, 'search');

      // Assert
      expect(mockPlatformAdapter.searchPosts).toHaveBeenCalledWith(
        ['machine learning', 'graphql'],
        expect.objectContaining({
          since: new Date('2026-01-01T08:00:00Z'),
          limit: 50
        })
      );
      expect(opportunities).toHaveLength(2);
      expect(opportunities[0].discoveryType).toBe('search');
    });

    it('should skip search when profile has empty keywords array', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({
        _id: profileId,
        discovery: {
          interests: [],
          keywords: [], // Empty keywords
          communities: []
        }
      });
      const account = createMockAccount(profileId, { _id: accountId });

      const accountsCollection = mockDb.collection('accounts');
      accountsCollection.findOne.mockResolvedValue(account);

      const profilesCollection = mockDb.collection('profiles');
      profilesCollection.findOne.mockResolvedValue(profile);

      accountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      const opportunities = await discoveryService.discover(accountId, 'search');

      // Assert
      expect(mockPlatformAdapter.searchPosts).not.toHaveBeenCalled();
      expect(opportunities).toEqual([]);
    });
  });

  describe('getOpportunities()', () => {
    it('should return paginated opportunities sorted by score descending', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const author = createMockAuthor({ _id: authorId });

      const mockOpportunities = [
        createMockOpportunity(accountId, authorId, { scoring: { recency: 90, impact: 50, total: 76 } }),
        createMockOpportunity(accountId, authorId, { scoring: { recency: 80, impact: 40, total: 64 } }),
        createMockOpportunity(accountId, authorId, { scoring: { recency: 70, impact: 30, total: 52 } })
      ];

      const opportunitiesCollection = mockDb.collection('opportunities');
      const mockQuery = {
        sort: vi.fn(() => mockQuery),
        limit: vi.fn(() => mockQuery),
        skip: vi.fn(() => mockQuery),
        toArray: vi.fn().mockResolvedValue(mockOpportunities)
      };
      opportunitiesCollection.find.mockReturnValue(mockQuery);
      opportunitiesCollection.countDocuments.mockResolvedValue(3);

      const authorsCollection = mockDb.collection('authors');
      authorsCollection.findOne.mockResolvedValue(author);

      // Act
      const result = await discoveryService.getOpportunities(accountId, {
        status: 'pending',
        limit: 20,
        offset: 0
      });

      // Assert
      expect(opportunitiesCollection.find).toHaveBeenCalledWith({
        accountId,
        status: 'pending'
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ 'scoring.total': -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(result.opportunities).toHaveLength(3);
      expect(result.opportunities[0].author).toBeDefined();
      expect(result.pagination).toEqual({
        total: 3,
        limit: 20,
        offset: 0
      });
    });

    it('should filter by multiple statuses', async () => {
      // Arrange
      const accountId = new ObjectId();

      const opportunitiesCollection = mockDb.collection('opportunities');
      const mockQuery = {
        sort: vi.fn(() => mockQuery),
        limit: vi.fn(() => mockQuery),
        skip: vi.fn(() => mockQuery),
        toArray: vi.fn().mockResolvedValue([])
      };
      opportunitiesCollection.find.mockReturnValue(mockQuery);
      opportunitiesCollection.countDocuments.mockResolvedValue(0);

      // Act
      await discoveryService.getOpportunities(accountId, {
        status: ['pending', 'responded'],
        limit: 20,
        offset: 0
      });

      // Assert
      expect(opportunitiesCollection.find).toHaveBeenCalledWith({
        accountId,
        status: { $in: ['pending', 'responded'] }
      });
    });

    it('should populate author data for each opportunity', async () => {
      // Arrange
      const accountId = new ObjectId();
      const author1Id = new ObjectId();
      const author2Id = new ObjectId();

      const mockOpportunities = [
        createMockOpportunity(accountId, author1Id),
        createMockOpportunity(accountId, author2Id)
      ];

      const opportunitiesCollection = mockDb.collection('opportunities');
      const mockQuery = {
        sort: vi.fn(() => mockQuery),
        limit: vi.fn(() => mockQuery),
        skip: vi.fn(() => mockQuery),
        toArray: vi.fn().mockResolvedValue(mockOpportunities)
      };
      opportunitiesCollection.find.mockReturnValue(mockQuery);
      opportunitiesCollection.countDocuments.mockResolvedValue(2);

      const authorsCollection = mockDb.collection('authors');
      authorsCollection.findOne
        .mockResolvedValueOnce(createMockAuthor({ _id: author1Id }))
        .mockResolvedValueOnce(createMockAuthor({ _id: author2Id }));

      // Act
      const result = await discoveryService.getOpportunities(accountId);

      // Assert
      expect(authorsCollection.findOne).toHaveBeenCalledTimes(2);
      expect(result.opportunities[0].author).toBeDefined();
      expect(result.opportunities[1].author).toBeDefined();
    });
  });

  describe('updateStatus()', () => {
    it('should update opportunity status to dismissed', async () => {
      // Arrange
      const opportunityId = new ObjectId();

      const opportunitiesCollection = mockDb.collection('opportunities');
      opportunitiesCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await discoveryService.updateStatus(opportunityId, 'dismissed');

      // Assert
      expect(opportunitiesCollection.updateOne).toHaveBeenCalledWith(
        { _id: opportunityId },
        {
          $set: {
            status: 'dismissed',
            updatedAt: expect.any(Date)
          }
        }
      );
    });

    it('should update opportunity status to responded', async () => {
      // Arrange
      const opportunityId = new ObjectId();

      const opportunitiesCollection = mockDb.collection('opportunities');
      opportunitiesCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await discoveryService.updateStatus(opportunityId, 'responded');

      // Assert
      expect(opportunitiesCollection.updateOne).toHaveBeenCalledWith(
        { _id: opportunityId },
        {
          $set: {
            status: 'responded',
            updatedAt: expect.any(Date)
          }
        }
      );
    });

    it('should throw NotFoundError when opportunity does not exist', async () => {
      // Arrange
      const opportunityId = new ObjectId();

      const opportunitiesCollection = mockDb.collection('opportunities');
      opportunitiesCollection.updateOne.mockResolvedValue({ modifiedCount: 0 });

      // Act & Assert
      await expect(
        discoveryService.updateStatus(opportunityId, 'dismissed')
      ).rejects.toThrow('not found');
    });
  });

  describe('expireOpportunities()', () => {
    it('should expire pending opportunities past TTL', async () => {
      // Arrange
      const opportunitiesCollection = mockDb.collection('opportunities');
      opportunitiesCollection.updateMany.mockResolvedValue({ modifiedCount: 2 });

      // Act
      const count = await discoveryService.expireOpportunities();

      // Assert
      expect(opportunitiesCollection.updateMany).toHaveBeenCalledWith(
        {
          status: 'pending',
          expiresAt: { $lt: expect.any(Date) }
        },
        {
          $set: {
            status: 'expired',
            updatedAt: expect.any(Date)
          }
        }
      );
      expect(count).toBe(2);
    });

    it('should return 0 when no opportunities to expire', async () => {
      // Arrange
      const opportunitiesCollection = mockDb.collection('opportunities');
      opportunitiesCollection.updateMany.mockResolvedValue({ modifiedCount: 0 });

      // Act
      const count = await discoveryService.expireOpportunities();

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('Author Upsert Logic', () => {
    it('should upsert author with latest data during discovery', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      const mockPost = createMockRawPost({ authorId: 'did:plc:author123' });
      const mockAuthor = createMockRawAuthor({
        id: 'did:plc:author123',
        handle: '@updated.bsky.social',
        followerCount: 5000
      });

      const accountsCollection = mockDb.collection('accounts');
      accountsCollection.findOne.mockResolvedValue(account);

      const profilesCollection = mockDb.collection('profiles');
      profilesCollection.findOne.mockResolvedValue(profile);

      const opportunitiesCollection = mockDb.collection('opportunities');
      opportunitiesCollection.findOne.mockResolvedValue(null);

      (mockPlatformAdapter.fetchReplies as any).mockResolvedValue([mockPost]);
      (mockPlatformAdapter.getAuthor as any).mockResolvedValue(mockAuthor);
      (mockScoringService.scoreOpportunity as any).mockReturnValue({
        recency: 80,
        impact: 50,
        total: 70
      });

      const authorsCollection = mockDb.collection('authors');
      authorsCollection.updateOne.mockResolvedValue({ upsertedId: new ObjectId() });

      opportunitiesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      accountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await discoveryService.discover(accountId, 'replies');

      // Assert
      expect(authorsCollection.updateOne).toHaveBeenCalledWith(
        {
          platform: 'bluesky',
          platformUserId: 'did:plc:author123'
        },
        {
          $set: {
            handle: '@updated.bsky.social',
            displayName: expect.any(String),
            followerCount: 5000,
            bio: expect.any(String),
            lastUpdatedAt: expect.any(Date)
          }
        },
        { upsert: true }
      );
    });
  });
});

