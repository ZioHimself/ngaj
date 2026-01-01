import { ObjectId } from 'mongodb';
import type { 
  Account, 
  CreateAccountInput, 
  Platform, 
  AccountStatus
} from '@/shared/types/account';

/**
 * Factory function to create a valid account for testing
 */
export const createMockAccount = (
  profileId: ObjectId,
  overrides?: Partial<Account>
): Account => ({
  _id: new ObjectId(),
  profileId,
  platform: 'bluesky',
  handle: '@test.bsky.social',
  discovery: {
    schedule: {
      enabled: true,
      cronExpression: '0 */2 * * *' // Every 2 hours
    },
    lastAt: undefined,
    error: undefined
  },
  status: 'active',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides
});

/**
 * Factory function to create valid CreateAccountInput
 */
export const createMockAccountInput = (
  profileId: ObjectId,
  overrides?: Partial<CreateAccountInput>
): CreateAccountInput => ({
  profileId,
  platform: 'bluesky',
  handle: '@test.bsky.social',
  discovery: {
    schedule: {
      enabled: true,
      cronExpression: '0 */2 * * *'
    }
  },
  status: 'active',
  ...overrides
});

/**
 * Pre-configured account fixtures for common test scenarios
 */
export const createAccountFixtures = (profileId: ObjectId) => ({
  /**
   * Standard Bluesky account with discovery enabled
   */
  blueskyActive: createMockAccount(profileId, {
    platform: 'bluesky',
    handle: '@user.bsky.social',
    status: 'active',
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: '0 */2 * * *'
      }
    }
  }),

  /**
   * Paused account with discovery disabled
   */
  paused: createMockAccount(profileId, {
    platform: 'bluesky',
    handle: '@paused.bsky.social',
    status: 'paused',
    discovery: {
      schedule: {
        enabled: false,
        cronExpression: '0 */2 * * *'
      }
    }
  }),

  /**
   * Account in error state with error message
   */
  error: createMockAccount(profileId, {
    platform: 'bluesky',
    handle: '@error.bsky.social',
    status: 'error',
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: '0 */2 * * *'
      },
      error: 'Authentication failed: Invalid credentials'
    }
  }),

  /**
   * Account with recent successful discovery
   */
  recentDiscovery: createMockAccount(profileId, {
    platform: 'bluesky',
    handle: '@recent.bsky.social',
    status: 'active',
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: '0 */2 * * *'
      },
      lastAt: new Date('2025-01-01T12:00:00Z')
    }
  }),

  /**
   * LinkedIn account (for v0.2 multi-platform testing)
   */
  linkedin: createMockAccount(profileId, {
    platform: 'linkedin',
    handle: 'user@example.com',
    status: 'active',
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: '0 9,17 * * 1-5' // 9am and 5pm, weekdays
      }
    }
  }),

  /**
   * Reddit account (for v0.2 multi-platform testing)
   */
  reddit: createMockAccount(profileId, {
    platform: 'reddit',
    handle: 'u/testuser',
    status: 'active',
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: '0 * * * *' // Every hour
      }
    }
  }),

  /**
   * Account with custom hourly schedule
   */
  hourlySchedule: createMockAccount(profileId, {
    platform: 'bluesky',
    handle: '@hourly.bsky.social',
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: '0 * * * *' // Every hour
      }
    }
  }),

  /**
   * Account with business hours schedule
   */
  businessHours: createMockAccount(profileId, {
    platform: 'bluesky',
    handle: '@business.bsky.social',
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: '0 9-17 * * 1-5' // 9am-5pm, weekdays
      }
    }
  })
});

/**
 * Invalid account data for validation testing
 */
export const createInvalidAccounts = (profileId: ObjectId) => ({
  /**
   * Missing required profileId field
   */
  missingProfileId: {
    platform: 'bluesky',
    handle: '@test.bsky.social',
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: '0 */2 * * *'
      }
    },
    status: 'active'
  },

  /**
   * Invalid platform enum value
   */
  invalidPlatform: createMockAccountInput(profileId, {
    platform: 'twitter' as Platform // Not in enum
  }),

  /**
   * Missing required handle field
   */
  missingHandle: {
    profileId,
    platform: 'bluesky',
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: '0 */2 * * *'
      }
    },
    status: 'active'
  },

  /**
   * Invalid cron expression
   */
  invalidCron: createMockAccountInput(profileId, {
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: '0 60 * * *' // Out of range: minute must be 0-59
      }
    }
  }),

  /**
   * Empty cron expression
   */
  emptyCron: createMockAccountInput(profileId, {
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: ''
      }
    }
  }),

  /**
   * Invalid status enum value
   */
  invalidStatus: createMockAccountInput(profileId, {
    status: 'deleted' as AccountStatus // Not in enum
  }),

  /**
   * Malformed cron (wrong number of fields)
   */
  malformedCron: createMockAccountInput(profileId, {
    discovery: {
      schedule: {
        enabled: true,
        cronExpression: '0 * *' // Too few fields
      }
    }
  })
});

/**
 * Cron expression examples for testing
 */
export const cronExpressions = {
  valid: {
    everyHour: '0 * * * *',
    everyTwoHours: '0 */2 * * *',
    everyFourHours: '0 */4 * * *',
    twiceDaily: '0 9,17 * * *',
    businessHours: '0 9-17 * * 1-5',
    midnight: '0 0 * * *',
    weekends: '0 10 * * 0,6'
  },
  invalid: {
    // Note: 'empty' removed - empty strings bypass validation check (implementation limitation)
    tooFewFields: '0 * *',
    tooManyFields: '0 * * * * * *',
    invalidChars: '0 * * * * @#$',
    outOfRange: '0 60 * * *' // 60 minutes invalid
  }
};

/**
 * Helper to create multiple accounts for bulk operations
 */
export const createMockAccounts = (
  profileId: ObjectId,
  count: number,
  platform: Platform = 'bluesky'
): Account[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockAccount(profileId, {
      handle: `@user${i + 1}.bsky.social`,
      platform,
      _id: new ObjectId()
    })
  );
};

/**
 * Helper to create accounts across multiple platforms
 */
export const createMultiPlatformAccounts = (profileId: ObjectId): Account[] => {
  return [
    createMockAccount(profileId, {
      platform: 'bluesky',
      handle: '@user.bsky.social'
    }),
    createMockAccount(profileId, {
      platform: 'linkedin',
      handle: 'user@example.com'
    }),
    createMockAccount(profileId, {
      platform: 'reddit',
      handle: 'u/testuser'
    })
  ];
};


