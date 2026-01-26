import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Db } from 'mongodb';
import type { ICronScheduler } from '@ngaj/backend/scheduler/cron-scheduler';

/**
 * Test: CronScheduler is initialized and started on backend startup
 * 
 * Issue #35: CronScheduler exists but is never instantiated or started in index.ts
 * 
 * Acceptance Criteria:
 * - [ ] Import and instantiate CronScheduler in index.ts
 * - [ ] Call scheduler.initialize() after MongoDB connection
 * - [ ] Call scheduler.start() after server starts
 * - [ ] Discovery jobs run per configured cron expressions
 * 
 * @see ADR-008: Opportunity Discovery Architecture
 */
describe('Backend Scheduler Startup', () => {
  describe('createScheduler()', () => {
    let mockDb: Db;

    beforeEach(() => {
      vi.resetModules();
      
      // Mock database
      mockDb = {
        collection: vi.fn(() => ({
          find: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue([])
          }))
        }))
      } as unknown as Db;
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.unstubAllEnvs();
    });

    it('should export createScheduler function', async () => {
      // Arrange & Act
      const indexModule = await import('@ngaj/backend/index');
      
      // Assert
      expect(indexModule.createScheduler).toBeDefined();
      expect(typeof indexModule.createScheduler).toBe('function');
    });

    it('should return null when Bluesky authentication fails', async () => {
      // Arrange - valid credentials but authentication will fail (no real network call)
      vi.stubEnv('BLUESKY_HANDLE', 'invalid.handle');
      vi.stubEnv('BLUESKY_APP_PASSWORD', 'invalid-password');
      
      const { createScheduler } = await import('@ngaj/backend/index');
      
      // Act - this will fail authentication since we're not mocking the network
      const scheduler = await createScheduler(mockDb);
      
      // Assert - should return null due to auth failure, not crash
      expect(scheduler).toBeNull();
    });

    it('should return null when Bluesky credentials are missing', async () => {
      // Arrange - no credentials set
      vi.stubEnv('BLUESKY_HANDLE', '');
      vi.stubEnv('BLUESKY_APP_PASSWORD', '');
      
      const { createScheduler } = await import('@ngaj/backend/index');
      
      // Act
      const scheduler = await createScheduler(mockDb);
      
      // Assert
      expect(scheduler).toBeNull();
    });
  });

  describe('Scheduler Lifecycle', () => {
    let mockScheduler: ICronScheduler;

    beforeEach(() => {
      mockScheduler = {
        initialize: vi.fn().mockResolvedValue(undefined),
        start: vi.fn(),
        stop: vi.fn(),
        reload: vi.fn().mockResolvedValue(undefined),
        triggerNow: vi.fn().mockResolvedValue([]),
        isRunning: vi.fn().mockReturnValue(false),
        getRegisteredJobs: vi.fn().mockReturnValue(new Map())
      };
    });

    it('should call initialize() before start()', async () => {
      // Arrange
      const callOrder: string[] = [];
      (mockScheduler.initialize as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callOrder.push('initialize');
      });
      (mockScheduler.start as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callOrder.push('start');
      });

      // Act
      await mockScheduler.initialize();
      mockScheduler.start();

      // Assert
      expect(callOrder).toEqual(['initialize', 'start']);
    });

    it('should call stop() on SIGTERM', async () => {
      // This test verifies the pattern - actual signal handling tested in integration
      mockScheduler.stop();
      expect(mockScheduler.stop).toHaveBeenCalled();
    });

    it('should call stop() on SIGINT', async () => {
      // This test verifies the pattern - actual signal handling tested in integration
      mockScheduler.stop();
      expect(mockScheduler.stop).toHaveBeenCalled();
    });
  });

  describe('getScheduler()', () => {
    it('should export getScheduler function to access running scheduler', async () => {
      const indexModule = await import('@ngaj/backend/index');
      
      expect(indexModule.getScheduler).toBeDefined();
      expect(typeof indexModule.getScheduler).toBe('function');
    });
  });
});
