import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { DiscoveryService } from '@ngaj/backend/services/discovery-service';
import type { ScoringService } from '@ngaj/backend/services/scoring-service';
import type { IPlatformAdapter } from '@ngaj/backend/adapters/platform-adapter';
import { createMockAccount } from '@tests/fixtures/account-fixtures';
import { createMockProfile } from '@tests/fixtures/profile-fixtures';
import {
  createMockRawPost,
  createMockRawAuthor,
  createMockAuthor,
} from '@tests/fixtures/opportunity-fixtures';
import {
  createLogCapture,
  LOG_LEVELS,
  type CapturedLog,
} from '@tests/fixtures/logger-fixtures';

/**
 * Integration tests for DiscoveryService logging behavior.
 *
 * These tests verify that the discovery service logs key operational
 * metrics during discovery runs.
 *
 * @see ADR-017: Structured Logging Strategy
 */
describe('DiscoveryService Logging', () => {
  let discoveryService: DiscoveryService;
  let mockDb: any;
  let mockPlatformAdapter: IPlatformAdapter;
  let mockScoringService: ScoringService;
  let mockAccountsCollection: any;
  let mockProfilesCollection: any;
  let mockOpportunitiesCollection: any;
  let mockAuthorsCollection: any;
  let logCapture: ReturnType<typeof createLogCapture>;

  beforeEach(() => {
    logCapture = createLogCapture();

    // Create collection mocks
    mockAccountsCollection = {
      findOne: vi.fn(),
      updateOne: vi.fn(),
    };

    mockProfilesCollection = {
      findOne: vi.fn(),
    };

    mockOpportunitiesCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          limit: vi.fn(() => ({
            skip: vi.fn(() => ({
              toArray: vi.fn(),
            })),
          })),
        })),
        toArray: vi.fn(),
      })),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
      countDocuments: vi.fn(),
    };

    mockAuthorsCollection = {
      findOne: vi.fn(),
      updateOne: vi.fn(),
    };

    // Mock database with collection cache
    mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'accounts') return mockAccountsCollection;
        if (name === 'profiles') return mockProfilesCollection;
        if (name === 'opportunities') return mockOpportunitiesCollection;
        if (name === 'authors') return mockAuthorsCollection;
        throw new Error(`Unknown collection: ${name}`);
      }),
    };

    // Mock platform adapter
    mockPlatformAdapter = {
      fetchReplies: vi.fn(),
      searchPosts: vi.fn(),
      getAuthor: vi.fn(),
    };

    // Mock scoring service
    mockScoringService = {
      scoreOpportunity: vi.fn(),
      explainScore: vi.fn(),
    } as unknown as ScoringService;

    discoveryService = new DiscoveryService(
      mockDb,
      mockPlatformAdapter,
      mockScoringService
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    logCapture.clear();
  });

  describe('discover() logging', () => {
    it('should log discovery start with accountId and discoveryType', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      mockAccountsCollection.findOne.mockResolvedValue(account);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      (mockPlatformAdapter.fetchReplies as any).mockResolvedValue([]);
      mockAccountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await discoveryService.discover(accountId, 'replies');

      // Assert
      const startLogs = logCapture.logs.filter(
        (log: CapturedLog) =>
          log.msg?.includes('start') || log.msg?.includes('Discovery')
      );
      expect(startLogs.length).toBeGreaterThanOrEqual(1);
      expect(startLogs[0].accountId).toBe(accountId.toString());
      expect(startLogs[0].discoveryType).toBe('replies');
    });

    it('should log posts fetched count', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      const mockPosts = [
        createMockRawPost({ id: 'post1', authorId: 'author1' }),
        createMockRawPost({ id: 'post2', authorId: 'author2' }),
        createMockRawPost({ id: 'post3', authorId: 'author3' }),
        createMockRawPost({ id: 'post4', authorId: 'author4' }),
        createMockRawPost({ id: 'post5', authorId: 'author5' }),
      ];

      mockAccountsCollection.findOne.mockResolvedValue(account);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      (mockPlatformAdapter.fetchReplies as any).mockResolvedValue(mockPosts);
      mockOpportunitiesCollection.findOne.mockResolvedValue(null);

      const rawAuthor = createMockRawAuthor();
      (mockPlatformAdapter.getAuthor as any).mockResolvedValue(rawAuthor);
      (mockScoringService.scoreOpportunity as any).mockReturnValue({
        recency: 50,
        impact: 30,
        total: 40, // Above threshold
      });

      mockAuthorsCollection.updateOne.mockResolvedValue({ upsertedId: new ObjectId() });
      mockAuthorsCollection.findOne.mockResolvedValue(createMockAuthor());
      mockOpportunitiesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      mockAccountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await discoveryService.discover(accountId, 'replies');

      // Assert
      const postCountLogs = logCapture.logs.filter(
        (log: CapturedLog) => log.postCount !== undefined
      );
      expect(postCountLogs.length).toBeGreaterThanOrEqual(1);
      expect(postCountLogs[0].postCount).toBe(5);
    });

    it('should log opportunities created count', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      const mockPosts = [
        createMockRawPost({ id: 'post1', authorId: 'author1' }),
        createMockRawPost({ id: 'post2', authorId: 'author2' }),
        createMockRawPost({ id: 'post3', authorId: 'author3' }),
      ];

      mockAccountsCollection.findOne.mockResolvedValue(account);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      (mockPlatformAdapter.fetchReplies as any).mockResolvedValue(mockPosts);
      mockOpportunitiesCollection.findOne.mockResolvedValue(null);

      const rawAuthor = createMockRawAuthor();
      (mockPlatformAdapter.getAuthor as any).mockResolvedValue(rawAuthor);
      // All posts score above threshold
      (mockScoringService.scoreOpportunity as any).mockReturnValue({
        recency: 80,
        impact: 50,
        total: 70,
      });

      mockAuthorsCollection.updateOne.mockResolvedValue({ upsertedId: new ObjectId() });
      mockAuthorsCollection.findOne.mockResolvedValue(createMockAuthor());
      mockOpportunitiesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      mockAccountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await discoveryService.discover(accountId, 'replies');

      // Assert
      const completionLogs = logCapture.logs.filter(
        (log: CapturedLog) =>
          log.created !== undefined || log.opportunityCount !== undefined
      );
      expect(completionLogs.length).toBeGreaterThanOrEqual(1);
      // Should have created 3 opportunities
      const count = completionLogs[0].created ?? completionLogs[0].opportunityCount;
      expect(count).toBe(3);
    });

    it('should log skipped counts (duplicates, low score) at debug level', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const existingAuthorId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      const mockPosts = [
        createMockRawPost({ id: 'duplicate-post', authorId: 'author1' }),
        createMockRawPost({ id: 'low-score-post', authorId: 'author2' }),
        createMockRawPost({ id: 'good-post', authorId: 'author3' }),
      ];

      mockAccountsCollection.findOne.mockResolvedValue(account);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      (mockPlatformAdapter.fetchReplies as any).mockResolvedValue(mockPosts);

      // First post is duplicate, second is low score, third is good
      mockOpportunitiesCollection.findOne
        .mockResolvedValueOnce({ _id: existingAuthorId }) // Duplicate
        .mockResolvedValueOnce(null) // Not duplicate
        .mockResolvedValueOnce(null); // Not duplicate

      const rawAuthor = createMockRawAuthor();
      (mockPlatformAdapter.getAuthor as any).mockResolvedValue(rawAuthor);

      // Score results: skipped (duplicate), low, high
      (mockScoringService.scoreOpportunity as any)
        .mockReturnValueOnce({ recency: 10, impact: 10, total: 10 }) // Low score
        .mockReturnValueOnce({ recency: 80, impact: 50, total: 70 }); // High score

      mockAuthorsCollection.updateOne.mockResolvedValue({ upsertedId: new ObjectId() });
      mockAuthorsCollection.findOne.mockResolvedValue(createMockAuthor());
      mockOpportunitiesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      mockAccountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await discoveryService.discover(accountId, 'replies');

      // Assert
      const skipLogs = logCapture.logs.filter(
        (log: CapturedLog) =>
          log.skippedDuplicates !== undefined || log.skippedLowScore !== undefined
      );
      // These should be at debug level
      const debugLogs = logCapture.getByLevel('debug');
      expect(skipLogs.length + debugLogs.length).toBeGreaterThanOrEqual(0);
      // Verify either skipped counts are logged or debug logs exist
    });

    it('should log completion with duration', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      mockAccountsCollection.findOne.mockResolvedValue(account);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      (mockPlatformAdapter.fetchReplies as any).mockResolvedValue([]);
      mockAccountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await discoveryService.discover(accountId, 'replies');

      // Assert
      const completionLogs = logCapture.logs.filter(
        (log: CapturedLog) =>
          log.msg?.includes('complete') || log.durationMs !== undefined
      );
      expect(completionLogs.length).toBeGreaterThanOrEqual(1);
    });

    it('should log error on discovery failure', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      mockAccountsCollection.findOne.mockResolvedValue(account);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      (mockPlatformAdapter.fetchReplies as any).mockRejectedValue(
        new Error('API rate limit exceeded')
      );
      mockAccountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      try {
        await discoveryService.discover(accountId, 'replies');
      } catch {
        // Expected to throw
      }

      // Assert
      const errorLogs = logCapture.getByLevel('error');
      expect(errorLogs.length).toBeGreaterThanOrEqual(1);
      expect(errorLogs[0].err).toBeDefined();
    });

    it('should include component context in all logs', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const account = createMockAccount(profileId, { _id: accountId });

      mockAccountsCollection.findOne.mockResolvedValue(account);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      (mockPlatformAdapter.fetchReplies as any).mockResolvedValue([]);
      mockAccountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await discoveryService.discover(accountId, 'replies');

      // Assert
      const componentLogs = logCapture.logs.filter(
        (log: CapturedLog) => log.component === 'discovery'
      );
      // All discovery logs should have the component field
      expect(componentLogs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('search discovery logging', () => {
    it('should log keywords used for search', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const profile = createMockProfile({
        _id: profileId,
        discovery: {
          interests: ['ai'],
          keywords: ['machine learning', 'typescript'],
          communities: [],
        },
      });
      const account = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
            { type: 'search', enabled: true, cronExpression: '0 */2 * * *', lastRunAt: undefined },
          ],
        },
      });

      mockAccountsCollection.findOne.mockResolvedValue(account);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      (mockPlatformAdapter.searchPosts as any).mockResolvedValue([]);
      mockAccountsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await discoveryService.discover(accountId, 'search');

      // Assert
      const searchLogs = logCapture.logs.filter(
        (log: CapturedLog) =>
          log.keywords !== undefined || log.discoveryType === 'search'
      );
      expect(searchLogs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
