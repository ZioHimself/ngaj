import type { Db } from 'mongodb';
import * as cron from 'node-cron';
import type { IDiscoveryService } from '../services/discovery-service.js';
import type { DiscoveryType } from '@ngaj/shared';
import {
  ObjectId,
  type OpportunityDocument,
  type AccountDocument,
} from '../types/documents.js';

/**
 * Cron scheduler interface
 */
export interface ICronScheduler {
  initialize(): Promise<void>;
  start(): void;
  stop(): void;
  reload(): Promise<void>;
  triggerNow(accountId: ObjectId, discoveryType: DiscoveryType): Promise<OpportunityDocument[]>;
  isRunning(): boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // Load all active accounts from database
    const accountsCollection = this.db.collection<AccountDocument>('accounts');
    const accounts = await accountsCollection.find().toArray();

    // Register jobs for each enabled schedule
    for (const account of accounts) {
      // Skip non-active accounts
      if (account.status !== 'active') {
        continue;
      }

      // Register a job for each enabled schedule
      for (const schedule of account.discovery.schedules) {
        if (!schedule.enabled) {
          continue;
        }

        const jobKey = this.getJobKey(account._id, schedule.type);
        
        // Create cron job
        const job = cron.schedule(
          schedule.cronExpression,
          async () => {
            await this.executeDiscovery(account._id, schedule.type);
          },
          {
            scheduled: false // Don't start automatically
          }
        );

        this.jobs.set(jobKey, job);
      }
    }
  }

  /**
   * Start all cron jobs
   */
  start(): void {
    this.running = true;
    for (const job of this.jobs.values()) {
      job.start();
    }
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    this.running = false;
    for (const job of this.jobs.values()) {
      job.stop();
    }
  }

  /**
   * Reload schedules (after account config changes)
   * Stops all jobs, clears map, re-initializes from database
   */
  async reload(): Promise<void> {
    // Stop and clear existing jobs
    this.stop();
    this.jobs.clear();
    
    // Re-initialize from database
    await this.initialize();
    
    // Start if was running
    if (this.running) {
      this.start();
    }
  }

  /**
   * Manually trigger discovery for testing
   * 
   * @param accountId - MongoDB ObjectId
   * @param discoveryType - 'replies' | 'search'
   * @returns Created opportunities
   */
  async triggerNow(accountId: ObjectId, discoveryType: DiscoveryType): Promise<OpportunityDocument[]> {
    return await this.discoveryService.discover(accountId, discoveryType);
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get registered jobs map (for testing)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRegisteredJobs(): Map<string, any> {
    return this.jobs;
  }

  /**
   * Execute discovery for an account and type
   * Handles errors gracefully to prevent crashing the scheduler
   */
  private async executeDiscovery(accountId: ObjectId, discoveryType: DiscoveryType): Promise<void> {
    try {
      await this.discoveryService.discover(accountId, discoveryType);
    } catch (error) {
      // Log error but don't crash the scheduler
      console.error(`Discovery failed for ${accountId}:${discoveryType}:`, error);
    }
  }

  /**
   * Generate job key from account ID and discovery type
   */
  private getJobKey(accountId: ObjectId, discoveryType: DiscoveryType): string {
    return `${accountId.toString()}:${discoveryType}`;
  }
}

