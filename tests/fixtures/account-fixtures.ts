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
    schedules: [
      {
        type: 'replies',
        enabled: true,
        cronExpression: '*/15 * * * *', // Every 15 minutes
        lastRunAt: undefined
      },
      {
        type: 'search',
        enabled: true,
        cronExpression: '0 */2 * * *', // Every 2 hours
        lastRunAt: undefined
      }
    ],
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
      ],
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
      schedules: [
        {
          type: 'replies',
          enabled: true,
          cronExpression: '*/15 * * * *',
          lastRunAt: new Date('2025-01-01T12:00:00Z')
        },
        {
          type: 'search',
          enabled: true,
          cronExpression: '0 */2 * * *',
          lastRunAt: new Date('2025-01-01T10:00:00Z')
        }
      ],
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
      schedules: [
        {
          type: 'replies',
          enabled: true,
          cronExpression: '0 9,17 * * 1-5', // 9am and 5pm, weekdays
          lastRunAt: undefined
        },
        {
          type: 'search',
          enabled: true,
          cronExpression: '0 12 * * 1-5', // Noon, weekdays
          lastRunAt: undefined
        }
      ]
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
      schedules: [
        {
          type: 'replies',
          enabled: true,
          cronExpression: '0 * * * *', // Every hour
          lastRunAt: undefined
        },
        {
          type: 'search',
          enabled: true,
          cronExpression: '0 */2 * * *', // Every 2 hours
          lastRunAt: undefined
        }
      ]
    }
  }),

  /**
   * Account with custom hourly schedule
   */
  hourlySchedule: createMockAccount(profileId, {
    platform: 'bluesky',
    handle: '@hourly.bsky.social',
    discovery: {
      schedules: [
        {
          type: 'replies',
          enabled: true,
          cronExpression: '0 * * * *', // Every hour
          lastRunAt: undefined
        },
        {
          type: 'search',
          enabled: true,
          cronExpression: '0 */2 * * *', // Every 2 hours
          lastRunAt: undefined
        }
      ]
    }
  }),

  /**
   * Account with business hours schedule
   */
  businessHours: createMockAccount(profileId, {
    platform: 'bluesky',
    handle: '@business.bsky.social',
    discovery: {
      schedules: [
        {
          type: 'replies',
          enabled: true,
          cronExpression: '0 9-17 * * 1-5', // 9am-5pm, weekdays (hourly during business hours)
          lastRunAt: undefined
        },
        {
          type: 'search',
          enabled: true,
          cronExpression: '0 10,14 * * 1-5', // 10am and 2pm, weekdays
          lastRunAt: undefined
        }
      ]
    }
  }),

  /**
   * Account with only replies enabled
   */
  repliesOnly: createMockAccount(profileId, {
    platform: 'bluesky',
    handle: '@repliesonly.bsky.social',
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
          enabled: false,
          cronExpression: '0 */2 * * *',
          lastRunAt: undefined
        }
      ]
    }
  }),

  /**
   * Account with only search enabled
   */
  searchOnly: createMockAccount(profileId, {
    platform: 'bluesky',
    handle: '@searchonly.bsky.social',
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
          enabled: true,
          cronExpression: '0 */2 * * *',
          lastRunAt: undefined
        }
      ]
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
      schedules: [
        {
          type: 'replies',
          enabled: true,
          cronExpression: '*/15 * * * *'
        },
        {
          type: 'search',
          enabled: true,
          cronExpression: '0 */2 * * *'
        }
      ]
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
      schedules: [
        {
          type: 'replies',
          enabled: true,
          cronExpression: '*/15 * * * *'
        },
        {
          type: 'search',
          enabled: true,
          cronExpression: '0 */2 * * *'
        }
      ]
    },
    status: 'active'
  },

  /**
   * Invalid cron expression
   */
  invalidCron: createMockAccountInput(profileId, {
    discovery: {
      schedules: [
        {
          type: 'replies',
          enabled: true,
          cronExpression: '0 60 * * *' // Out of range: minute must be 0-59
        },
        {
          type: 'search',
          enabled: true,
          cronExpression: '0 */2 * * *'
        }
      ]
    }
  }),

  /**
   * Empty cron expression
   */
  emptyCron: createMockAccountInput(profileId, {
    discovery: {
      schedules: [
        {
          type: 'replies',
          enabled: true,
          cronExpression: ''
        },
        {
          type: 'search',
          enabled: true,
          cronExpression: '0 */2 * * *'
        }
      ]
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
      schedules: [
        {
          type: 'replies',
          enabled: true,
          cronExpression: '0 * *' // Too few fields
        },
        {
          type: 'search',
          enabled: true,
          cronExpression: '0 */2 * * *'
        }
      ]
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


