import type { Db, ObjectId } from 'mongodb';
import type { IDiscoveryService } from '@/services/discovery-service';
import type { DiscoveryType, Opportunity } from '@/shared/types/opportunity';

/**
 * Cron scheduler interface
 */
export interface ICronScheduler {
  initialize(): Promise<void>;
  start(): void;
  stop(): void;
  reload(): Promise<void>;
  triggerNow(accountId: ObjectId, discoveryType: DiscoveryType): Promise<Opportunity[]>;
  isRunning(): boolean;
  getRegisteredJobs(): Map<string, any>;
}

/**
 * Cron scheduler for managing multiple discovery jobs per account
 * 
 * Responsibilities:
 * - Load active accounts from database
 * - Register cron jobs for each enabled discovery schedule
 * - Execute discovery at specified intervals
 * - Handle job failures gracefully (don't crash scheduler)
 * - Support manual triggering for testing
 * 
 * Job Key Format: "accountId:discoveryType" (e.g., "507f1f77bcf86cd799439011:replies")
 * 
 * @see ADR-008: Opportunity Discovery Architecture
 */
export class CronScheduler implements ICronScheduler {
  private jobs: Map<string, any> = new Map();
  private running: boolean = false;

  constructor(
    private db: Db,
    private discoveryService: IDiscoveryService
  ) {}

  /**
   * Initialize scheduler and load all active accounts
   * Registers cron jobs for each enabled discovery type
   */
  async initialize(): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Start all cron jobs
   */
  start(): void {
    throw new Error('Not implemented');
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    throw new Error('Not implemented');
  }

  /**
   * Reload schedules (after account config changes)
   * Stops all jobs, clears map, re-initializes from database
   */
  async reload(): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Manually trigger discovery for testing
   * 
   * @param accountId - MongoDB ObjectId
   * @param discoveryType - 'replies' | 'search'
   * @returns Created opportunities
   */
  async triggerNow(accountId: ObjectId, discoveryType: DiscoveryType): Promise<Opportunity[]> {
    throw new Error('Not implemented');
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    throw new Error('Not implemented');
  }

  /**
   * Get registered jobs map (for testing)
   */
  getRegisteredJobs(): Map<string, any> {
    throw new Error('Not implemented');
  }
}

