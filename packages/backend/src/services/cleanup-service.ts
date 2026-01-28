/**
 * Cleanup Service
 *
 * Handles automatic expiration of stale opportunities and cleanup of deleted data.
 * Runs on a scheduled interval to maintain data freshness.
 *
 * @see ADR-018: Expiration Mechanics
 */

import type { Db } from 'mongodb';

/** Time after which dismissed opportunities are hard deleted (5 minutes) */
export const DISMISSED_RETENTION_MS = 5 * 60 * 1000;

/** Cleanup job interval (5 minutes) */
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Statistics returned from a cleanup operation
 */
export interface CleanupStats {
  /** Pending opportunities marked as expired */
  expired: number;
  /** Expired opportunities hard deleted */
  deletedExpired: number;
  /** Dismissed opportunities hard deleted */
  deletedDismissed: number;
  /** Orphaned responses deleted */
  deletedResponses: number;
}

/**
 * Service interface for cleanup operations
 */
export interface ICleanupService {
  /**
   * Run cleanup cycle: expire pending, delete expired/dismissed
   * @returns Stats on items processed
   */
  cleanup(): Promise<CleanupStats>;

  /**
   * Start scheduled cleanup job
   */
  start(): void;

  /**
   * Stop scheduled cleanup job
   */
  stop(): void;
}

/**
 * Cleanup service implementation
 */
export class CleanupService implements ICleanupService {
  private db: Db;
  private task: NodeJS.Timeout | null = null;

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Run cleanup cycle: expire pending, delete expired/dismissed
   * @returns Stats on items processed
   */
  async cleanup(): Promise<CleanupStats> {
    // TODO: Implementation required
    // Access db to satisfy TypeScript (will be used in actual implementation)
    void this.db;
    throw new Error('Not implemented');
  }

  /**
   * Start scheduled cleanup job
   */
  start(): void {
    // TODO: Implementation required
    // Access task to satisfy TypeScript (will be used in actual implementation)
    void this.task;
    throw new Error('Not implemented');
  }

  /**
   * Stop scheduled cleanup job
   */
  stop(): void {
    // TODO: Implementation required
    void this.task;
    throw new Error('Not implemented');
  }
}
