/**
 * Cleanup Service Test Fixtures
 *
 * Factory functions and fixtures for testing opportunity expiration,
 * cleanup service, and bulk dismiss functionality.
 *
 * @see ADR-018: Expiration Mechanics
 */

import { ObjectId } from 'mongodb';
import type { Opportunity, OpportunityStatus, Response } from '@ngaj/shared';
import { createMockOpportunity, createMockAuthor } from './opportunity-fixtures';
import { createMockResponse } from './response-fixtures';

// Import and re-export from the service for single source of truth
import { OPPORTUNITY_TTL_HOURS as _TTL } from '@ngaj/backend/services/discovery-service';
export const OPPORTUNITY_TTL_HOURS = _TTL;

/** Dismissed retention period in milliseconds (5 minutes) */
export const DISMISSED_RETENTION_MS = 5 * 60 * 1000;

/** Cleanup job interval in milliseconds (5 minutes) */
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Factory to create an expired opportunity (pending with expiresAt in the past)
 */
export const createExpiredOpportunity = (
  accountId: ObjectId,
  authorId: ObjectId,
  overrides?: Partial<Opportunity<ObjectId>>
): Opportunity<ObjectId> => {
  const discoveredAt = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
  const expiresAt = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago (expired)

  return createMockOpportunity(accountId, authorId, {
    status: 'pending',
    discoveredAt,
    expiresAt,
    updatedAt: discoveredAt,
    ...overrides,
  });
};

/**
 * Factory to create a recent pending opportunity (not yet expired)
 */
export const createRecentOpportunity = (
  accountId: ObjectId,
  authorId: ObjectId,
  overrides?: Partial<Opportunity<ObjectId>>
): Opportunity<ObjectId> => {
  const discoveredAt = new Date();
  const expiresAt = new Date(Date.now() + OPPORTUNITY_TTL_HOURS * 60 * 60 * 1000);

  return createMockOpportunity(accountId, authorId, {
    status: 'pending',
    discoveredAt,
    expiresAt,
    updatedAt: discoveredAt,
    ...overrides,
  });
};

/**
 * Factory to create an opportunity with 'expired' status
 */
export const createExpiredStatusOpportunity = (
  accountId: ObjectId,
  authorId: ObjectId,
  overrides?: Partial<Opportunity<ObjectId>>
): Opportunity<ObjectId> => {
  const discoveredAt = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const expiresAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

  return createMockOpportunity(accountId, authorId, {
    status: 'expired',
    discoveredAt,
    expiresAt,
    updatedAt: new Date(Date.now() - 60 * 1000), // Marked expired 1 minute ago
    ...overrides,
  });
};

/**
 * Factory to create a dismissed opportunity with configurable age
 * @param minutesAgo - How many minutes ago the opportunity was dismissed
 */
export const createDismissedOpportunity = (
  accountId: ObjectId,
  authorId: ObjectId,
  minutesAgo: number,
  overrides?: Partial<Opportunity<ObjectId>>
): Opportunity<ObjectId> => {
  const dismissedAt = new Date(Date.now() - minutesAgo * 60 * 1000);

  return createMockOpportunity(accountId, authorId, {
    status: 'dismissed',
    updatedAt: dismissedAt,
    ...overrides,
  });
};

/**
 * Factory to create a responded opportunity (should never be deleted)
 */
export const createRespondedOpportunity = (
  accountId: ObjectId,
  authorId: ObjectId,
  overrides?: Partial<Opportunity<ObjectId>>
): Opportunity<ObjectId> => {
  return createMockOpportunity(accountId, authorId, {
    status: 'responded',
    ...overrides,
  });
};

/**
 * Factory to create an opportunity about to expire (within 30 minutes)
 */
export const createAboutToExpireOpportunity = (
  accountId: ObjectId,
  authorId: ObjectId,
  minutesUntilExpiry: number = 30,
  overrides?: Partial<Opportunity<ObjectId>>
): Opportunity<ObjectId> => {
  const discoveredAt = new Date(
    Date.now() - (OPPORTUNITY_TTL_HOURS * 60 - minutesUntilExpiry) * 60 * 1000
  );
  const expiresAt = new Date(Date.now() + minutesUntilExpiry * 60 * 1000);

  return createMockOpportunity(accountId, authorId, {
    status: 'pending',
    discoveredAt,
    expiresAt,
    updatedAt: discoveredAt,
    ...overrides,
  });
};

/**
 * Expected result type from cleanup operation
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
 * Create a set of cleanup test fixtures for a given account
 */
export const createCleanupFixtures = (accountId: ObjectId, authorId: ObjectId) => ({
  /**
   * Pending opportunity that should be marked as expired
   */
  pendingExpired: createExpiredOpportunity(accountId, authorId, {
    content: {
      text: 'This pending opportunity has expired TTL',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  }),

  /**
   * Pending opportunity that is still valid (not expired)
   */
  pendingValid: createRecentOpportunity(accountId, authorId, {
    content: {
      text: 'This pending opportunity is still valid',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  }),

  /**
   * Already expired status - should be hard deleted immediately
   */
  expiredStatus: createExpiredStatusOpportunity(accountId, authorId, {
    content: {
      text: 'This opportunity is already marked expired',
      createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
    },
  }),

  /**
   * Dismissed recently (< 5 min) - should NOT be deleted
   */
  dismissedRecent: createDismissedOpportunity(accountId, authorId, 2, {
    content: {
      text: 'Dismissed 2 minutes ago - should be kept',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  }),

  /**
   * Dismissed old (>= 5 min) - should be hard deleted
   */
  dismissedOld: createDismissedOpportunity(accountId, authorId, 10, {
    content: {
      text: 'Dismissed 10 minutes ago - should be deleted',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  }),

  /**
   * Responded opportunity - should NEVER be affected
   */
  responded: createRespondedOpportunity(accountId, authorId, {
    content: {
      text: 'This has been responded to - never delete',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  }),

  /**
   * About to expire (30 min remaining) - should stay pending
   */
  aboutToExpire: createAboutToExpireOpportunity(accountId, authorId, 30, {
    content: {
      text: 'About to expire in 30 minutes',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  }),

  /**
   * Dismissed exactly at 5 minute boundary - edge case
   */
  dismissedAtBoundary: createDismissedOpportunity(accountId, authorId, 5, {
    content: {
      text: 'Dismissed exactly 5 minutes ago - edge case',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  }),
});

/**
 * Create multiple opportunities for bulk operations
 */
export const createBulkOpportunities = (
  accountId: ObjectId,
  authorId: ObjectId,
  count: number,
  status: OpportunityStatus = 'pending'
): Opportunity<ObjectId>[] => {
  return Array.from({ length: count }, (_, i) => {
    const now = Date.now();
    const discoveredAt = new Date(now - i * 5 * 60 * 1000); // Spread over time
    const expiresAt = new Date(
      discoveredAt.getTime() + OPPORTUNITY_TTL_HOURS * 60 * 60 * 1000
    );

    return createMockOpportunity(accountId, authorId, {
      _id: new ObjectId(),
      status,
      discoveredAt,
      expiresAt,
      updatedAt: discoveredAt,
      content: {
        text: `Bulk opportunity ${i + 1}`,
        createdAt: new Date(now - (i + 1) * 10 * 60 * 1000),
      },
      scoring: {
        recency: 100 - i * 5,
        impact: 50 - i * 2,
        total: Math.round(0.7 * (100 - i * 5) + 0.3 * (50 - i * 2)),
      },
    });
  });
};

/**
 * Create a response linked to an opportunity (for cascade delete testing)
 */
export const createLinkedResponse = (
  opportunityId: ObjectId,
  accountId: ObjectId,
  overrides?: Partial<Response<ObjectId>>
): Response<ObjectId> => {
  return createMockResponse(opportunityId, accountId, {
    status: 'draft',
    ...overrides,
  });
};

/**
 * Selection mode test fixtures
 */
export interface SelectionState {
  /** Whether selection mode is active */
  isSelectionMode: boolean;
  /** Set of selected opportunity IDs */
  selectedIds: Set<string>;
}

/**
 * Create initial selection state
 */
export const createSelectionState = (
  isSelectionMode: boolean = false,
  selectedIds: string[] = []
): SelectionState => ({
  isSelectionMode,
  selectedIds: new Set(selectedIds),
});

/**
 * Bulk dismiss API request/response types
 */
export interface BulkDismissRequest {
  opportunityIds: string[];
}

export interface BulkDismissResponse {
  dismissed: number;
  skipped: string[];
}

/**
 * Create mock bulk dismiss request
 */
export const createBulkDismissRequest = (ids: ObjectId[]): BulkDismissRequest => ({
  opportunityIds: ids.map((id) => id.toString()),
});

/**
 * Create expected bulk dismiss response
 */
export const createBulkDismissResponse = (
  dismissed: number,
  skipped: string[] = []
): BulkDismissResponse => ({
  dismissed,
  skipped,
});

/**
 * Helper to create opportunities for different accounts (cross-account testing)
 */
export const createCrossAccountFixtures = () => {
  const account1Id = new ObjectId();
  const account2Id = new ObjectId();
  const authorId = new ObjectId();

  return {
    account1Id,
    account2Id,
    authorId,
    account1Opportunities: createBulkOpportunities(account1Id, authorId, 3),
    account2Opportunities: createBulkOpportunities(account2Id, authorId, 2),
  };
};

/**
 * Scoring weight constants (ADR-018: updated from 60/40 to 70/30)
 */
export const SCORING_WEIGHTS = {
  RECENCY: 0.7,
  IMPACT: 0.3,
} as const;

/**
 * Scoring test scenarios with expected results for 70/30 weights
 */
export const scoringScenarios70_30 = {
  /**
   * High recency (80), moderate impact (60) → 74
   */
  highRecency: {
    recency: 80,
    impact: 60,
    expected: 74, // 0.70 * 80 + 0.30 * 60 = 56 + 18 = 74
  },

  /**
   * Low recency (20), high impact (90) → 41
   */
  lowRecency: {
    recency: 20,
    impact: 90,
    expected: 41, // 0.70 * 20 + 0.30 * 90 = 14 + 27 = 41
  },

  /**
   * Balanced scores (50, 50) → 50
   */
  balanced: {
    recency: 50,
    impact: 50,
    expected: 50, // 0.70 * 50 + 0.30 * 50 = 35 + 15 = 50
  },

  /**
   * Maximum recency (100), minimum impact (0) → 70
   */
  maxRecency: {
    recency: 100,
    impact: 0,
    expected: 70, // 0.70 * 100 + 0.30 * 0 = 70 + 0 = 70
  },

  /**
   * Minimum recency (0), maximum impact (100) → 30
   */
  maxImpact: {
    recency: 0,
    impact: 100,
    expected: 30, // 0.70 * 0 + 0.30 * 100 = 0 + 30 = 30
  },

  /**
   * Both maximum (100, 100) → 100
   */
  bothMax: {
    recency: 100,
    impact: 100,
    expected: 100, // 0.70 * 100 + 0.30 * 100 = 70 + 30 = 100
  },
};
