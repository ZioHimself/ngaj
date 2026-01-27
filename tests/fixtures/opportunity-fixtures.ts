import { ObjectId } from 'mongodb';
import type {
  Opportunity,
  Author,
  OpportunityWithAuthor,
  CreateOpportunityInput,
  OpportunityStatus,
  UpsertAuthorInput
} from '@ngaj/shared';
import type { Platform } from '@ngaj/shared';

/**
 * Factory function to create a valid opportunity for testing
 */
export const createMockOpportunity = (
  accountId: ObjectId,
  authorId: ObjectId,
  overrides?: Partial<Opportunity>
): Opportunity => {
  const discoveredAt = new Date('2026-01-01T12:00:00Z');
  const expiresAt = new Date(discoveredAt.getTime() + 4 * 60 * 60 * 1000); // 4 hours later (ADR-018)
  
  // Generate unique postId by default (can be overridden)
  const uniqueId = new ObjectId().toString();
  const defaultPostId = `at://did:plc:abc123/app.bsky.feed.post/${uniqueId}`;

  return {
    _id: new ObjectId(),
    accountId,
    platform: 'bluesky',
    postId: defaultPostId,
    postUrl: `https://bsky.app/profile/author.bsky.social/post/${uniqueId}`,
    content: {
      text: 'Great post about TypeScript! What are your thoughts on...',
      createdAt: new Date('2026-01-01T11:45:00Z')
    },
    authorId,
    engagement: {
      likes: 5,
      reposts: 2,
      replies: 1
    },
    scoring: {
      recency: 100,
      impact: 33,
      total: 73
    },
    discoveryType: 'search',
    status: 'pending',
    discoveredAt,
    expiresAt,
    updatedAt: discoveredAt,
    ...overrides
  };
};

/**
 * Factory function to create a valid author for testing
 */
export const createMockAuthor = (overrides?: Partial<Author>): Author => ({
  _id: new ObjectId(),
  platform: 'bluesky',
  platformUserId: 'did:plc:abc123',
  handle: '@author.bsky.social',
  displayName: 'Test Author',
  bio: 'Software engineer interested in AI and web development',
  followerCount: 1234,
  lastUpdatedAt: new Date('2026-01-01T12:00:00Z'),
  ...overrides
});

/**
 * Factory function to create OpportunityWithAuthor
 */
export const createMockOpportunityWithAuthor = (
  accountId: ObjectId,
  overrides?: { opportunity?: Partial<Opportunity>; author?: Partial<Author> }
): OpportunityWithAuthor => {
  const author = createMockAuthor(overrides?.author);
  const opportunity = createMockOpportunity(accountId, author._id, overrides?.opportunity);

  return {
    ...opportunity,
    author
  };
};

/**
 * Factory function to create CreateOpportunityInput
 */
export const createMockOpportunityInput = (
  accountId: ObjectId,
  authorId: ObjectId,
  overrides?: Partial<CreateOpportunityInput>
): CreateOpportunityInput => {
  const discoveredAt = new Date('2026-01-01T12:00:00Z');
  const expiresAt = new Date(discoveredAt.getTime() + 4 * 60 * 60 * 1000); // 4 hours (ADR-018)
  
  // Generate unique postId by default (can be overridden)
  const uniqueId = new ObjectId().toString();
  const defaultPostId = `at://did:plc:abc123/app.bsky.feed.post/${uniqueId}`;

  return {
    accountId,
    platform: 'bluesky',
    postId: defaultPostId,
    postUrl: `https://bsky.app/profile/author.bsky.social/post/${uniqueId}`,
    content: {
      text: 'Great post about TypeScript!',
      createdAt: new Date('2026-01-01T11:45:00Z')
    },
    authorId,
    engagement: {
      likes: 5,
      reposts: 2,
      replies: 1
    },
    scoring: {
      recency: 100,
      impact: 33,
      total: 73
    },
    discoveryType: 'search',
    status: 'pending',
    discoveredAt,
    expiresAt,
    ...overrides
  };
};

/**
 * Factory function to create UpsertAuthorInput
 */
export const createMockAuthorInput = (
  overrides?: Partial<UpsertAuthorInput>
): UpsertAuthorInput => ({
  platform: 'bluesky',
  platformUserId: 'did:plc:abc123',
  handle: '@author.bsky.social',
  displayName: 'Test Author',
  bio: 'Software engineer',
  followerCount: 1234,
  ...overrides
});

/**
 * Pre-configured opportunity fixtures for common test scenarios
 */
export const createOpportunityFixtures = (accountId: ObjectId, authorId: ObjectId) => ({
  /**
   * Recent post with high score (above threshold)
   */
  highScore: createMockOpportunity(accountId, authorId, {
    content: {
      text: 'Recent high-engagement post',
      createdAt: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
    },
    engagement: {
      likes: 50,
      reposts: 20,
      replies: 10
    },
    scoring: {
      recency: 100,
      impact: 60,
      total: 84
    },
    status: 'pending'
  }),

  /**
   * Old post with low score (below threshold)
   */
  lowScore: createMockOpportunity(accountId, authorId, {
    content: {
      text: 'Old post with low engagement',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
    },
    engagement: {
      likes: 1,
      reposts: 0,
      replies: 0
    },
    scoring: {
      recency: 0,
      impact: 10,
      total: 4
    },
    status: 'pending'
  }),

  /**
   * Medium-aged post with moderate score
   */
  mediumScore: createMockOpportunity(accountId, authorId, {
    content: {
      text: 'Post from 30 minutes ago',
      createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    },
    engagement: {
      likes: 20,
      reposts: 10,
      replies: 5
    },
    scoring: {
      recency: 37,
      impact: 45,
      total: 40
    },
    status: 'pending'
  }),

  /**
   * Dismissed opportunity
   */
  dismissed: createMockOpportunity(accountId, authorId, {
    status: 'dismissed',
    content: {
      text: 'Dismissed opportunity',
      createdAt: new Date('2026-01-01T10:00:00Z')
    }
  }),

  /**
   * Responded opportunity
   */
  responded: createMockOpportunity(accountId, authorId, {
    status: 'responded',
    content: {
      text: 'Already responded to this',
      createdAt: new Date('2026-01-01T10:00:00Z')
    }
  }),

  /**
   * Expired opportunity (past TTL)
   */
  expired: createMockOpportunity(accountId, authorId, {
    status: 'expired',
    discoveredAt: new Date('2025-12-28T12:00:00Z'),
    expiresAt: new Date('2025-12-28T16:00:00Z'), // 4 hours later, in the past (ADR-018)
    content: {
      text: 'Expired opportunity',
      createdAt: new Date('2025-12-28T11:00:00Z')
    }
  }),

  /**
   * Pending opportunity about to expire
   */
  aboutToExpire: createMockOpportunity(accountId, authorId, {
    status: 'pending',
    discoveredAt: new Date(Date.now() - 47.5 * 60 * 60 * 1000), // 47.5 hours ago
    expiresAt: new Date(Date.now() + 0.5 * 60 * 60 * 1000), // Expires in 30 minutes
    content: {
      text: 'About to expire',
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
    }
  }),

  /**
   * Reply type opportunity
   */
  replyType: createMockOpportunity(accountId, authorId, {
    discoveryType: 'replies',
    postId: 'at://did:plc:reply123/app.bsky.feed.post/reply456',
    postUrl: 'https://bsky.app/profile/replier.bsky.social/post/reply456',
    content: {
      text: 'Great point! I have a follow-up question...',
      createdAt: new Date('2026-01-01T11:50:00Z')
    }
  }),

  /**
   * Search type opportunity
   */
  searchType: createMockOpportunity(accountId, authorId, {
    discoveryType: 'search',
    content: {
      text: 'Interesting discussion about machine learning',
      createdAt: new Date('2026-01-01T11:45:00Z')
    }
  }),

  /**
   * Zero engagement post
   */
  zeroEngagement: createMockOpportunity(accountId, authorId, {
    engagement: {
      likes: 0,
      reposts: 0,
      replies: 0
    },
    scoring: {
      recency: 100,
      impact: 0,
      total: 60
    },
    content: {
      text: 'Brand new post with no engagement yet',
      createdAt: new Date(Date.now() - 1 * 60 * 1000) // 1 minute ago
    }
  })
});

/**
 * Pre-configured author fixtures for common test scenarios
 */
export const authorFixtures = {
  /**
   * Small account (< 1000 followers)
   */
  smallAccount: createMockAuthor({
    platformUserId: 'did:plc:small123',
    handle: '@small.bsky.social',
    displayName: 'Small Account',
    followerCount: 250,
    bio: 'Just getting started on Bluesky'
  }),

  /**
   * Medium account (1000-10000 followers)
   */
  mediumAccount: createMockAuthor({
    platformUserId: 'did:plc:medium123',
    handle: '@medium.bsky.social',
    displayName: 'Medium Account',
    followerCount: 5000,
    bio: 'Tech enthusiast and content creator'
  }),

  /**
   * Large account (10000-100000 followers)
   */
  largeAccount: createMockAuthor({
    platformUserId: 'did:plc:large123',
    handle: '@large.bsky.social',
    displayName: 'Large Account',
    followerCount: 50000,
    bio: 'Industry expert and thought leader'
  }),

  /**
   * Mega account (> 100000 followers)
   */
  megaAccount: createMockAuthor({
    platformUserId: 'did:plc:mega123',
    handle: '@mega.bsky.social',
    displayName: 'Mega Account',
    followerCount: 1000000,
    bio: 'Celebrity account'
  }),

  /**
   * Account with no bio
   */
  noBio: createMockAuthor({
    platformUserId: 'did:plc:nobio123',
    handle: '@nobio.bsky.social',
    displayName: 'No Bio User',
    bio: undefined,
    followerCount: 100
  }),

  /**
   * Account with zero followers
   */
  zeroFollowers: createMockAuthor({
    platformUserId: 'did:plc:zero123',
    handle: '@new.bsky.social',
    displayName: 'Brand New Account',
    followerCount: 0,
    bio: 'Just joined!'
  })
};

// Re-export types from shared for backwards compatibility
export type { RawPost, RawAuthor } from '@ngaj/shared';

/**
 * Factory to create RawPost (platform adapter output)
 */
export const createMockRawPost = (overrides?: Partial<RawPost>): RawPost => ({
  id: 'at://did:plc:abc123/app.bsky.feed.post/xyz789',
  url: 'https://bsky.app/profile/author.bsky.social/post/xyz789',
  text: 'Test post content',
  createdAt: new Date('2026-01-01T11:45:00Z'),
  authorId: 'did:plc:abc123',
  likes: 5,
  reposts: 2,
  replies: 1,
  ...overrides
});

/**
 * Factory to create RawAuthor (platform adapter output)
 */
export const createMockRawAuthor = (overrides?: Partial<RawAuthor>): RawAuthor => ({
  id: 'did:plc:abc123',
  handle: '@author.bsky.social',
  displayName: 'Test Author',
  bio: 'Software engineer',
  followerCount: 1234,
  ...overrides
});

/**
 * Helper to create multiple opportunities for bulk operations
 */
export const createMockOpportunities = (
  accountId: ObjectId,
  authorId: ObjectId,
  count: number,
  status: OpportunityStatus = 'pending'
): Opportunity[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockOpportunity(accountId, authorId, {
      _id: new ObjectId(),
      postId: `at://did:plc:author${i}/app.bsky.feed.post/post${i}`,
      postUrl: `https://bsky.app/profile/author.bsky.social/post/${i}`,
      content: {
        text: `Test post ${i + 1}`,
        createdAt: new Date(Date.now() - i * 60 * 1000) // Spread over time
      },
      scoring: {
        recency: 100 - i * 5,
        impact: 50 - i * 2,
        total: 75 - i * 4
      },
      status
    })
  );
};

/**
 * Helper to create multiple authors for bulk operations
 */
export const createMockAuthors = (count: number, platform: Platform = 'bluesky'): Author[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockAuthor({
      _id: new ObjectId(),
      platform,
      platformUserId: `did:plc:author${i}`,
      handle: `@author${i}.bsky.social`,
      displayName: `Author ${i + 1}`,
      followerCount: 100 + i * 10
    })
  );
};

/**
 * Sample scoring scenarios for testing
 */
export const scoringScenarios = {
  /**
   * Recent post from small account (high recency, low impact)
   */
  recentSmall: {
    post: createMockRawPost({
      createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      likes: 5,
      reposts: 2
    }),
    author: createMockRawAuthor({
      followerCount: 1000
    }),
    expectedScore: {
      recency: 93.5, // e^(-2/30) * 100 ≈ 93.5
      impact: 33, // ~33
      total: 69 // 0.6*93.5 + 0.4*33 ≈ 69.3
    }
  },

  /**
   * Old post from large account (low recency, high impact)
   */
  oldLarge: {
    post: createMockRawPost({
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      likes: 500,
      reposts: 200
    }),
    author: createMockRawAuthor({
      followerCount: 1000000
    }),
    expectedScore: {
      recency: 0, // ~0
      impact: 78, // ~78
      total: 31 // 0.6*0 + 0.4*78
    }
  },

  /**
   * Middle-aged post with moderate engagement
   */
  middleModerate: {
    post: createMockRawPost({
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      likes: 20,
      reposts: 10
    }),
    author: createMockRawAuthor({
      followerCount: 10000
    }),
    expectedScore: {
      recency: 37, // ~37
      impact: 45, // ~45
      total: 40 // 0.6*37 + 0.4*45
    }
  },

  /**
   * Brand new post (0 minutes old)
   */
  brandNew: {
    post: createMockRawPost({
      createdAt: new Date(), // Right now
      likes: 0,
      reposts: 0
    }),
    author: createMockRawAuthor({
      followerCount: 5000
    }),
    expectedScore: {
      recency: 100, // 100
      impact: 37, // ~37
      total: 75 // 0.6*100 + 0.4*37
    }
  },

  /**
   * Zero engagement post
   */
  zeroEngagement: {
    post: createMockRawPost({
      createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      likes: 0,
      reposts: 0
    }),
    author: createMockRawAuthor({
      followerCount: 100
    }),
    expectedScore: {
      recency: 84, // ~84
      impact: 20, // ~20
      total: 58 // 0.6*84 + 0.4*20
    }
  }
};

