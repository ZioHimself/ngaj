import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { CronScheduler } from '@/scheduler/cron-scheduler';
import type { IDiscoveryService } from '@/services/discovery-service';
import { createMockAccount } from '@tests/fixtures/account-fixtures';

describe('CronScheduler', () => {
  let cronScheduler: CronScheduler;
  let mockDb: any;
  let mockDiscoveryService: IDiscoveryService;
  let mockAccountsCollection: any;

  beforeEach(() => {
    // Create a mock query object that will be returned by find()
    const mockQuery = {
      toArray: vi.fn()
    };

    // Create cached accounts collection mock
    mockAccountsCollection = {
      find: vi.fn(() => mockQuery)
    };

    // Mock database with collection cache
    mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'accounts') return mockAccountsCollection;
        throw new Error(`Unknown collection: ${name}`);
      })
    };

    // Mock discovery service
    mockDiscoveryService = {
      discover: vi.fn(),
      getOpportunities: vi.fn(),
      updateStatus: vi.fn(),
      expireOpportunities: vi.fn()
    } as unknown as IDiscoveryService;

    cronScheduler = new CronScheduler(mockDb, mockDiscoveryService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (cronScheduler) {
      cronScheduler.stop();
    }
  });

  describe('initialize()', () => {
    it('should register jobs for all enabled schedules', async () => {
      // Arrange
      const profileId = new ObjectId();
      const account1 = createMockAccount(profileId, {
        _id: new ObjectId(),
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            },
            {
              type: 'search',
              enabled: true,
              cronExpression: '0 */2 * * *',
              lastRunAt: undefined
            }
          ]
        },
        status: 'active'
      });

      const account2 = createMockAccount(profileId, {
        _id: new ObjectId(),
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            },
            {
              type: 'search',
              enabled: false, // Disabled
              cronExpression: '0 */2 * * *',
              lastRunAt: undefined
            }
          ]
        },
        status: 'active'
      });

      // Use mockAccountsCollection directly
      mockAccountsCollection.find().toArray.mockResolvedValue([account1, account2]);

      // Act
      await cronScheduler.initialize();

      // Assert
      const jobs = cronScheduler.getRegisteredJobs();
      expect(jobs.size).toBe(3); // 2 from account1 + 1 from account2 (search disabled)
      expect(jobs.has(`${account1._id}:replies`)).toBe(true);
      expect(jobs.has(`${account1._id}:search`)).toBe(true);
      expect(jobs.has(`${account2._id}:replies`)).toBe(true);
      expect(jobs.has(`${account2._id}:search`)).toBe(false);
    });

    it('should skip paused accounts', async () => {
      // Arrange
      const profileId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: new ObjectId(),
        status: 'paused',
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            }
          ]
        }
      });

      // Use mockAccountsCollection directly
      mockAccountsCollection.find().toArray.mockResolvedValue([account]);

      // Act
      await cronScheduler.initialize();

      // Assert
      const jobs = cronScheduler.getRegisteredJobs();
      expect(jobs.size).toBe(0);
    });

    it('should skip error accounts', async () => {
      // Arrange
      const profileId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: new ObjectId(),
        status: 'error',
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            }
          ]
        }
      });

      // Use mockAccountsCollection directly
      mockAccountsCollection.find().toArray.mockResolvedValue([account]);

      // Act
      await cronScheduler.initialize();

      // Assert
      const jobs = cronScheduler.getRegisteredJobs();
      expect(jobs.size).toBe(0);
    });

    it('should skip disabled schedules', async () => {
      // Arrange
      const profileId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: new ObjectId(),
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: false,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            },
            {
              type: 'search',
              enabled: false,
              cronExpression: '0 */2 * * *',
              lastRunAt: undefined
            }
          ]
        },
        status: 'active'
      });

      // Use mockAccountsCollection directly
      mockAccountsCollection.find().toArray.mockResolvedValue([account]);

      // Act
      await cronScheduler.initialize();

      // Assert
      const jobs = cronScheduler.getRegisteredJobs();
      expect(jobs.size).toBe(0);
    });

    it('should handle empty accounts list', async () => {
      // Arrange
      // Use mockAccountsCollection directly
      mockAccountsCollection.find().toArray.mockResolvedValue([]);

      // Act
      await cronScheduler.initialize();

      // Assert
      const jobs = cronScheduler.getRegisteredJobs();
      expect(jobs.size).toBe(0);
    });
  });

  describe('reload()', () => {
    it('should clear existing jobs and re-initialize', async () => {
      // Arrange
      const profileId = new ObjectId();
      const account1 = createMockAccount(profileId, {
        _id: new ObjectId(),
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            }
          ]
        },
        status: 'active'
      });

      const account2 = createMockAccount(profileId, {
        _id: new ObjectId(),
        discovery: {
          schedules: [
            {
              type: 'search',
              enabled: true,
              cronExpression: '0 */2 * * *',
              lastRunAt: undefined
            }
          ]
        },
        status: 'active'
      });

      // Use mockAccountsCollection directly
      mockAccountsCollection.find().toArray
        .mockResolvedValueOnce([account1]) // Initial load
        .mockResolvedValueOnce([account1, account2]); // After reload

      // Act
      await cronScheduler.initialize();
      const initialJobCount = cronScheduler.getRegisteredJobs().size;

      await cronScheduler.reload();
      const reloadedJobCount = cronScheduler.getRegisteredJobs().size;

      // Assert
      expect(initialJobCount).toBe(1);
      expect(reloadedJobCount).toBe(2);
    });

    it('should update job count when schedule is disabled', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const account1 = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            },
            {
              type: 'search',
              enabled: true,
              cronExpression: '0 */2 * * *',
              lastRunAt: undefined
            }
          ]
        },
        status: 'active'
      });

      const account2 = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            },
            {
              type: 'search',
              enabled: false, // Disabled
              cronExpression: '0 */2 * * *',
              lastRunAt: undefined
            }
          ]
        },
        status: 'active'
      });

      // Use mockAccountsCollection directly
      mockAccountsCollection.find().toArray
        .mockResolvedValueOnce([account1])
        .mockResolvedValueOnce([account2]);

      // Act
      await cronScheduler.initialize();
      const initialJobCount = cronScheduler.getRegisteredJobs().size;

      await cronScheduler.reload();
      const reloadedJobCount = cronScheduler.getRegisteredJobs().size;

      // Assert
      expect(initialJobCount).toBe(2);
      expect(reloadedJobCount).toBe(1); // Search disabled
    });
  });

  describe('triggerNow()', () => {
    it('should manually trigger discovery for specific account and type', async () => {
      // Arrange
      const accountId = new ObjectId();
      const mockOpportunities = [
        { _id: new ObjectId(), postId: 'post1' },
        { _id: new ObjectId(), postId: 'post2' }
      ];

      (mockDiscoveryService.discover as any).mockResolvedValue(mockOpportunities);

      // Act
      const result = await cronScheduler.triggerNow(accountId, 'replies');

      // Assert
      expect(mockDiscoveryService.discover).toHaveBeenCalledWith(accountId, 'replies');
      expect(result).toEqual(mockOpportunities);
    });

    it('should trigger search discovery', async () => {
      // Arrange
      const accountId = new ObjectId();
      (mockDiscoveryService.discover as any).mockResolvedValue([]);

      // Act
      await cronScheduler.triggerNow(accountId, 'search');

      // Assert
      expect(mockDiscoveryService.discover).toHaveBeenCalledWith(accountId, 'search');
    });

    it('should propagate discovery errors', async () => {
      // Arrange
      const accountId = new ObjectId();
      const error = new Error('Discovery failed');
      (mockDiscoveryService.discover as any).mockRejectedValue(error);

      // Act & Assert
      await expect(cronScheduler.triggerNow(accountId, 'replies')).rejects.toThrow('Discovery failed');
    });
  });

  describe('start() and stop()', () => {
    it('should start and stop all cron jobs', async () => {
      // Arrange
      const profileId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: new ObjectId(),
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            }
          ]
        },
        status: 'active'
      });

      // Use mockAccountsCollection directly
      mockAccountsCollection.find().toArray.mockResolvedValue([account]);

      await cronScheduler.initialize();

      // Act
      cronScheduler.start();
      const isRunningAfterStart = cronScheduler.isRunning();

      cronScheduler.stop();
      const isRunningAfterStop = cronScheduler.isRunning();

      // Assert
      expect(isRunningAfterStart).toBe(true);
      expect(isRunningAfterStop).toBe(false);
    });
  });

  describe('Job Key Format', () => {
    it('should use format "accountId:discoveryType" for job keys', async () => {
      // Arrange
      const profileId = new ObjectId();
      const accountId = new ObjectId();
      const account = createMockAccount(profileId, {
        _id: accountId,
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            },
            {
              type: 'search',
              enabled: true,
              cronExpression: '0 */2 * * *',
              lastRunAt: undefined
            }
          ]
        },
        status: 'active'
      });

      // Use mockAccountsCollection directly
      mockAccountsCollection.find().toArray.mockResolvedValue([account]);

      // Act
      await cronScheduler.initialize();

      // Assert
      const jobs = cronScheduler.getRegisteredJobs();
      expect(jobs.has(`${accountId.toString()}:replies`)).toBe(true);
      expect(jobs.has(`${accountId.toString()}:search`)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should continue running other jobs when one job fails', async () => {
      // Arrange
      const profileId = new ObjectId();
      const account1 = createMockAccount(profileId, {
        _id: new ObjectId(),
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            }
          ]
        },
        status: 'active'
      });

      const account2 = createMockAccount(profileId, {
        _id: new ObjectId(),
        discovery: {
          schedules: [
            {
              type: 'replies',
              enabled: true,
              cronExpression: '*/15 * * * *',
              lastRunAt: undefined
            }
          ]
        },
        status: 'active'
      });

      // Use mockAccountsCollection directly
      mockAccountsCollection.find().toArray.mockResolvedValue([account1, account2]);

      (mockDiscoveryService.discover as any)
        .mockRejectedValueOnce(new Error('Job 1 failed')) // First job fails
        .mockResolvedValueOnce([]); // Second job succeeds

      await cronScheduler.initialize();

      // Act - Trigger both jobs manually
      await expect(cronScheduler.triggerNow(account1._id, 'replies')).rejects.toThrow('Job 1 failed');
      await expect(cronScheduler.triggerNow(account2._id, 'replies')).resolves.not.toThrow();

      // Assert - Both jobs should still be registered
      const jobs = cronScheduler.getRegisteredJobs();
      expect(jobs.size).toBe(2);
    });
  });
});

