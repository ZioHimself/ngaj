/**
 * Cleanup Service
 *
 * Handles automatic expiration of stale opportunities and cleanup of deleted data.
 * Runs on a scheduled interval to maintain data freshness.
 *
 * @see ADR-018: Expiration Mechanics
 */

import type { Db, ObjectId } from 'mongodb';

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
   *
   * Order of operations:
   * 1. Mark pending opportunities as expired when expiresAt is in the past
   * 2. Find all opportunities to delete (expired status OR dismissed > 5 min)
   * 3. Cascade delete associated responses
   * 4. Hard delete expired opportunities (immediate)
   * 5. Hard delete dismissed opportunities (after 5 min retention)
   *
   * Note: Newly marked items ARE deleted in the same cycle per ADR-018.
   * Use stats.expired to verify how many were marked before deletion.
   *
   * @returns Stats on items processed
   */
  async cleanup(): Promise<CleanupStats> {
    const now = new Date();
    const stats: CleanupStats = {
      expired: 0,
      deletedExpired: 0,
      deletedDismissed: 0,
      deletedResponses: 0,
    };

    // 1. Mark pending opportunities as expired when expiresAt is in the past
    const expireResult = await this.db.collection('opportunities').updateMany(
      { status: 'pending', expiresAt: { $lt: now } },
      { $set: { status: 'expired', updatedAt: now } }
    );
    stats.expired = expireResult.modifiedCount;

    // 2. Get IDs of opportunities to delete (for cascade)
    const dismissedCutoff = new Date(now.getTime() - DISMISSED_RETENTION_MS);
    const toDelete = await this.db
      .collection('opportunities')
      .find(
        {
          $or: [
            { status: 'expired' },
            { status: 'dismissed', updatedAt: { $lte: dismissedCutoff } },
          ],
        },
        { projection: { _id: 1 } }
      )
      .toArray();

    const opportunityIds = toDelete.map((o) => o._id as ObjectId);

    // 3. Cascade: delete associated responses
    if (opportunityIds.length > 0) {
      const responseResult = await this.db.collection('responses').deleteMany({
        opportunityId: { $in: opportunityIds },
      });
      stats.deletedResponses = responseResult.deletedCount;
    }

    // 4. Hard delete expired opportunities (immediate)
    const deleteExpiredResult = await this.db.collection('opportunities').deleteMany({
      status: 'expired',
    });
    stats.deletedExpired = deleteExpiredResult.deletedCount;

    // 5. Hard delete dismissed opportunities (after 5 min retention)
    const deleteDismissedResult = await this.db.collection('opportunities').deleteMany({
      status: 'dismissed',
      updatedAt: { $lte: dismissedCutoff },
    });
    stats.deletedDismissed = deleteDismissedResult.deletedCount;

    return stats;
  }

  /**
   * Start scheduled cleanup job (runs every 5 minutes)
   *
   * Idempotent: calling start() multiple times is safe
   */
  start(): void {
    // If already running, don't start another
    if (this.task !== null) {
      return;
    }

    // Run cleanup every 5 minutes
    this.task = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        // Log error but don't crash - cleanup will retry on next interval
        console.error('Cleanup job error:', error);
      }
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop scheduled cleanup job
   *
   * Idempotent: calling stop() multiple times is safe
   */
  stop(): void {
    if (this.task !== null) {
      clearInterval(this.task);
      this.task = null;
    }
  }
}
