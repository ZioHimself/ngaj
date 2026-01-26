import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { CronScheduler } from '@ngaj/backend/scheduler/cron-scheduler';
import type { IDiscoveryService } from '@ngaj/backend/services/discovery-service';
import { createMockAccount } from '@tests/fixtures/account-fixtures';
import {
  createLogCapture,
  LOG_LEVELS,
  type CapturedLog,
} from '@tests/fixtures/logger-fixtures';

/**
 * Integration tests for CronScheduler logging behavior.
 *
 * These tests verify that the scheduler logs key lifecycle events
 * with appropriate levels and context.
 *
 * @see ADR-017: Structured Logging Strategy
 */
describe('CronScheduler Logging', () => {
  let cronScheduler: CronScheduler;
  let mockDb: any;
  let mockDiscoveryService: IDiscoveryService;
  let mockAccountsCollection: any;
  let logCapture: ReturnType<typeof createLogCapture>;

  beforeEach(() => {
    logCapture = createLogCapture();

    // Create a mock query object that will be returned by find()
    const mockQuery = {
      toArray: vi.fn(),
    };

    // Create cached accounts collection mock
    mockAccountsCollection = {
      find: vi.fn(() => mockQuery),
    };

    // Mock database with collection cache
    mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'accounts') return mockAccountsCollection;
        throw new Error(`Unknown collection: ${name}`);
      }),
    };

    // Mock discovery service
    mockDiscoveryService = {
      discover: vi.fn(),
      getOpportunities: vi.fn(),
      updateStatus: vi.fn(),
      expireOpportunities: vi.fn(),
    } as unknown as IDiscoveryService;

    cronScheduler = new CronScheduler(mockDb, mockDiscoveryService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    logCapture.clear();
    if (cronScheduler) {
      cronScheduler.stop();
    }
  });

  describe('initialize() logging', () => {
    it('should log account count on initialization', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accounts = [
        createMockAccount(profileId, {
          _id: new ObjectId(),
          discovery: {
            schedules: [
              { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
            ],
          },
          status: 'active',
        }),
        createMockAccount(profileId, {
          _id: new ObjectId(),
          discovery: {
            schedules: [
              { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
            ],
          },
          status: 'active',
        }),
      ];

      mockAccountsCollection.find().toArray.mockResolvedValue(accounts);

      // Act
      await cronScheduler.initialize();

      // Assert
      const accountLogs = logCapture.logs.filter(
        (log: CapturedLog) => log.accountCount !== undefined
      );
      expect(accountLogs).toHaveLength(1);
      expect(accountLogs[0].accountCount).toBe(2);
      expect(accountLogs[0].level).toBe(LOG_LEVELS.info);
    });

    it('should log job count on initialization', async () => {
      // Arrange
      const profileId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: new ObjectId(),
        discovery: {
          schedules: [
            { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
            { type: 'search', enabled: true, cronExpression: '0 */2 * * *', lastRunAt: undefined },
          ],
        },
        status: 'active',
      });

      mockAccountsCollection.find().toArray.mockResolvedValue([account]);

      // Act
      await cronScheduler.initialize();

      // Assert
      const jobLogs = logCapture.logs.filter(
        (log: CapturedLog) => log.jobCount !== undefined
      );
      expect(jobLogs).toHaveLength(1);
      expect(jobLogs[0].jobCount).toBe(2);
    });

    it('should log each registered job with accountId, type, and cron', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
            { type: 'search', enabled: true, cronExpression: '0 */2 * * *', lastRunAt: undefined },
          ],
        },
        status: 'active',
      });

      mockAccountsCollection.find().toArray.mockResolvedValue([account]);

      // Act
      await cronScheduler.initialize();

      // Assert
      const jobRegistrationLogs = logCapture.logs.filter(
        (log: CapturedLog) => log.msg?.includes('Job registered') || log.type !== undefined
      );
      expect(jobRegistrationLogs.length).toBeGreaterThanOrEqual(2);

      // Verify job details are logged
      const repliesJob = jobRegistrationLogs.find((log: CapturedLog) => log.type === 'replies');
      const searchJob = jobRegistrationLogs.find((log: CapturedLog) => log.type === 'search');

      expect(repliesJob?.accountId).toBe(accountId.toString());
      expect(repliesJob?.cron).toBe('*/15 * * * *');
      expect(searchJob?.accountId).toBe(accountId.toString());
      expect(searchJob?.cron).toBe('0 */2 * * *');
    });

    it('should log when no accounts are found', async () => {
      // Arrange
      mockAccountsCollection.find().toArray.mockResolvedValue([]);

      // Act
      await cronScheduler.initialize();

      // Assert
      const logs = logCapture.logs.filter(
        (log: CapturedLog) => log.accountCount === 0 || log.jobCount === 0
      );
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('start() and stop() logging', () => {
    it('should log when scheduler starts', async () => {
      // Arrange
      const profileId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: new ObjectId(),
        discovery: {
          schedules: [
            { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
          ],
        },
        status: 'active',
      });

      mockAccountsCollection.find().toArray.mockResolvedValue([account]);
      await cronScheduler.initialize();
      logCapture.clear(); // Clear init logs

      // Act
      cronScheduler.start();

      // Assert
      const startLogs = logCapture.getByMessage('start');
      expect(startLogs.length).toBeGreaterThanOrEqual(1);
      expect(startLogs[0].level).toBe(LOG_LEVELS.info);
    });

    it('should log when scheduler stops', async () => {
      // Arrange
      const profileId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: new ObjectId(),
        discovery: {
          schedules: [
            { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
          ],
        },
        status: 'active',
      });

      mockAccountsCollection.find().toArray.mockResolvedValue([account]);
      await cronScheduler.initialize();
      cronScheduler.start();
      logCapture.clear(); // Clear previous logs

      // Act
      cronScheduler.stop();

      // Assert
      const stopLogs = logCapture.getByMessage('stop');
      expect(stopLogs.length).toBeGreaterThanOrEqual(1);
      expect(stopLogs[0].level).toBe(LOG_LEVELS.info);
    });
  });

  describe('job execution logging', () => {
    it('should log when job starts', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
          ],
        },
        status: 'active',
      });

      mockAccountsCollection.find().toArray.mockResolvedValue([account]);
      (mockDiscoveryService.discover as any).mockResolvedValue([
        { _id: new ObjectId(), postId: 'post1' },
      ]);

      await cronScheduler.initialize();
      logCapture.clear();

      // Act
      await cronScheduler.triggerNow(accountId, 'replies');

      // Assert
      const startLogs = logCapture.logs.filter(
        (log: CapturedLog) =>
          log.msg?.includes('starting') || log.msg?.includes('start')
      );
      expect(startLogs.length).toBeGreaterThanOrEqual(1);
      expect(startLogs[0].accountId).toBe(accountId.toString());
      expect(startLogs[0].discoveryType).toBe('replies');
    });

    it('should log opportunity count on job completion', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
          ],
        },
        status: 'active',
      });

      const mockOpportunities = [
        { _id: new ObjectId(), postId: 'post1' },
        { _id: new ObjectId(), postId: 'post2' },
        { _id: new ObjectId(), postId: 'post3' },
      ];

      mockAccountsCollection.find().toArray.mockResolvedValue([account]);
      (mockDiscoveryService.discover as any).mockResolvedValue(mockOpportunities);

      await cronScheduler.initialize();
      logCapture.clear();

      // Act
      await cronScheduler.triggerNow(accountId, 'replies');

      // Assert
      const completionLogs = logCapture.logs.filter(
        (log: CapturedLog) => log.opportunityCount !== undefined
      );
      expect(completionLogs.length).toBeGreaterThanOrEqual(1);
      expect(completionLogs[0].opportunityCount).toBe(3);
    });

    it('should log duration on job completion', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
          ],
        },
        status: 'active',
      });

      mockAccountsCollection.find().toArray.mockResolvedValue([account]);
      (mockDiscoveryService.discover as any).mockImplementation(async () => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 10));
        return [];
      });

      await cronScheduler.initialize();
      logCapture.clear();

      // Act
      await cronScheduler.triggerNow(accountId, 'replies');

      // Assert
      const completionLogs = logCapture.logs.filter(
        (log: CapturedLog) => log.durationMs !== undefined
      );
      expect(completionLogs.length).toBeGreaterThanOrEqual(1);
      expect(completionLogs[0].durationMs).toBeGreaterThanOrEqual(10);
    });

    it('should log errors when job fails', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
          ],
        },
        status: 'active',
      });

      mockAccountsCollection.find().toArray.mockResolvedValue([account]);
      (mockDiscoveryService.discover as any).mockRejectedValue(
        new Error('Platform API rate limit exceeded')
      );

      await cronScheduler.initialize();
      logCapture.clear();

      // Act
      try {
        await cronScheduler.triggerNow(accountId, 'replies');
      } catch {
        // Expected to throw
      }

      // Assert
      const errorLogs = logCapture.getByLevel('error');
      expect(errorLogs.length).toBeGreaterThanOrEqual(1);
      expect(errorLogs[0].err).toBeDefined();
      // Error should be sanitized
      expect(errorLogs[0].err.message).toContain('rate limit');
    });

    it('should continue running after job failure', async () => {
      // Arrange
      const profileId = new ObjectId();
      const account1Id = new ObjectId();
      const account2Id = new ObjectId();

      const account1 = createMockAccount(profileId, {
        _id: account1Id,
        discovery: {
          schedules: [
            { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
          ],
        },
        status: 'active',
      });

      const account2 = createMockAccount(profileId, {
        _id: account2Id,
        discovery: {
          schedules: [
            { type: 'replies', enabled: true, cronExpression: '*/15 * * * *', lastRunAt: undefined },
          ],
        },
        status: 'active',
      });

      mockAccountsCollection.find().toArray.mockResolvedValue([account1, account2]);
      (mockDiscoveryService.discover as any)
        .mockRejectedValueOnce(new Error('Job 1 failed'))
        .mockResolvedValueOnce([]);

      await cronScheduler.initialize();

      // Act - first job fails, second should still work
      try {
        await cronScheduler.triggerNow(account1Id, 'replies');
      } catch {
        // Expected
      }

      const result = await cronScheduler.triggerNow(account2Id, 'replies');

      // Assert
      expect(result).toEqual([]);
      expect(cronScheduler.isRunning() || cronScheduler.getRegisteredJobs().size > 0).toBe(true);
    });
  });
});
