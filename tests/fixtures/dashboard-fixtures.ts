/**
 * Dashboard UI Test Fixtures
 *
 * Fixtures for Opportunity Dashboard UI testing.
 *
 * @see ADR-013: Opportunity Dashboard UI
 */

import type {
  OpportunityWithAuthor,
  Author,
  OpportunityStatus,
  PaginatedOpportunities,
  Response,
  ResponseStatus,
} from '@ngaj/shared';

/**
 * Factory to create mock Author for UI testing (string IDs)
 */
export const createDashboardAuthor = (
  overrides?: Partial<Author<string>>
): Author<string> => ({
  _id: 'author-1',
  platform: 'bluesky',
  platformUserId: 'did:plc:abc123',
  handle: '@user.bsky.social',
  displayName: 'Test User',
  bio: 'Software engineer',
  followerCount: 1200,
  lastUpdatedAt: new Date('2026-01-01T12:00:00Z'),
  ...overrides,
});

/**
 * Factory to create mock OpportunityWithAuthor for UI testing (string IDs)
 */
export const createDashboardOpportunity = (
  overrides?: Partial<OpportunityWithAuthor<string>>
): OpportunityWithAuthor<string> => {
  const author = createDashboardAuthor(overrides?.author);
  const discoveredAt = new Date('2026-01-01T12:00:00Z');
  const expiresAt = new Date(discoveredAt.getTime() + 48 * 60 * 60 * 1000);

  return {
    _id: 'opp-1',
    accountId: 'acc-1',
    platform: 'bluesky',
    postId: 'at://did:plc:abc/app.bsky.feed.post/123',
    postUrl: 'https://bsky.app/profile/user.bsky.social/post/123',
    content: {
      text: 'Test post content for the opportunity dashboard',
      createdAt: new Date('2026-01-01T11:00:00Z'),
    },
    authorId: author._id,
    engagement: {
      likes: 5,
      reposts: 2,
      replies: 1,
    },
    scoring: {
      recency: 80,
      impact: 60,
      total: 72,
    },
    discoveryType: 'replies',
    status: 'pending',
    discoveredAt,
    expiresAt,
    updatedAt: discoveredAt,
    author,
    ...overrides,
  };
};

/**
 * Factory to create mock Response for UI testing (string IDs)
 */
export const createDashboardResponse = (
  opportunityId: string,
  overrides?: Partial<Response<string>>
): Response<string> => {
  const generatedAt = new Date('2026-01-01T12:05:00Z');

  return {
    _id: 'resp-1',
    opportunityId,
    accountId: 'acc-1',
    text: 'This is a draft response to the opportunity. It provides a helpful answer.',
    status: 'draft',
    generatedAt,
    metadata: {
      analysisKeywords: ['test', 'opportunity'],
      mainTopic: 'testing',
      domain: 'technology',
      question: 'How to test?',
      kbChunksUsed: 2,
      constraints: { maxLength: 300 },
      model: 'claude-sonnet-4.5',
      generationTimeMs: 5000,
      usedPrinciples: true,
      usedVoice: true,
      analysisTimeMs: 2000,
      responseTimeMs: 3000,
    },
    version: 1,
    updatedAt: generatedAt,
    ...overrides,
  };
};

/**
 * Pre-configured dashboard opportunity fixtures
 */
export const dashboardOpportunityFixtures = {
  /**
   * Pending opportunity without response
   */
  pending: createDashboardOpportunity({
    _id: 'opp-pending',
    status: 'pending',
    content: {
      text: 'What do you think about TypeScript for backend development?',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  }),

  /**
   * Opportunity with draft response
   */
  withDraft: createDashboardOpportunity({
    _id: 'opp-draft',
    status: 'pending',
    content: {
      text: 'Looking for recommendations on testing frameworks',
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    },
  }),

  /**
   * Posted/responded opportunity
   */
  responded: createDashboardOpportunity({
    _id: 'opp-responded',
    status: 'responded',
    content: {
      text: 'Thanks for the great article on TDD!',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
  }),

  /**
   * Dismissed opportunity
   */
  dismissed: createDashboardOpportunity({
    _id: 'opp-dismissed',
    status: 'dismissed',
    content: {
      text: 'Random post not relevant to my interests',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  }),

  /**
   * Opportunity with very long text (>300 chars)
   */
  longText: createDashboardOpportunity({
    _id: 'opp-long',
    status: 'pending',
    content: {
      text: 'This is a very long post that exceeds the typical preview length. '.repeat(
        10
      ),
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  }),

  /**
   * Opportunity with high score
   */
  highScore: createDashboardOpportunity({
    _id: 'opp-high',
    status: 'pending',
    scoring: {
      recency: 95,
      impact: 85,
      total: 91,
    },
    author: createDashboardAuthor({
      followerCount: 50000,
      displayName: 'Popular Account',
    }),
  }),

  /**
   * Opportunity with zero engagement
   */
  zeroEngagement: createDashboardOpportunity({
    _id: 'opp-zero',
    status: 'pending',
    engagement: {
      likes: 0,
      reposts: 0,
      replies: 0,
    },
    scoring: {
      recency: 100,
      impact: 10,
      total: 64,
    },
  }),
};

/**
 * Pre-configured dashboard response fixtures
 */
export const dashboardResponseFixtures = {
  /**
   * Draft response awaiting review
   */
  draft: createDashboardResponse('opp-draft', {
    _id: 'resp-draft',
    status: 'draft',
    text: 'Great question! I recommend Vitest for TypeScript projects - it has excellent integration.',
  }),

  /**
   * Posted response with platform metadata
   */
  posted: createDashboardResponse('opp-responded', {
    _id: 'resp-posted',
    status: 'posted',
    text: 'Thanks for sharing! TDD has transformed my development workflow.',
    postedAt: new Date('2026-01-01T12:10:00Z'),
    platformPostId: 'at://did:plc:user123/app.bsky.feed.post/xyz789',
    platformPostUrl: 'https://bsky.app/profile/user.bsky.social/post/xyz789',
  }),

  /**
   * Response at character limit
   */
  atLimit: createDashboardResponse('opp-pending', {
    _id: 'resp-limit',
    text: 'x'.repeat(300),
  }),

  /**
   * Response with edited text
   */
  edited: createDashboardResponse('opp-draft', {
    _id: 'resp-edited',
    text: 'User-edited response text that differs from generated.',
    version: 1,
  }),
};

/**
 * Factory to create paginated opportunities response
 */
export const createPaginatedOpportunities = (
  opportunities: OpportunityWithAuthor<string>[],
  overrides?: Partial<Omit<PaginatedOpportunities, 'opportunities'>>
): PaginatedOpportunities => ({
  opportunities,
  total: opportunities.length,
  limit: 20,
  offset: 0,
  hasMore: false,
  ...overrides,
});

/**
 * Mock API responses for dashboard testing
 */
export const mockApiResponses = {
  /**
   * Successful opportunities list
   */
  opportunitiesList: createPaginatedOpportunities([
    dashboardOpportunityFixtures.highScore,
    dashboardOpportunityFixtures.pending,
    dashboardOpportunityFixtures.withDraft,
  ]),

  /**
   * Empty opportunities list
   */
  emptyOpportunities: createPaginatedOpportunities([]),

  /**
   * Multi-page opportunities (page 1)
   */
  opportunitiesPage1: createPaginatedOpportunities(
    Array.from({ length: 20 }, (_, i) =>
      createDashboardOpportunity({
        _id: `opp-page1-${i}`,
        scoring: {
          recency: 100 - i * 2,
          impact: 60,
          total: 80 - i,
        },
      })
    ),
    { total: 45, hasMore: true, limit: 20, offset: 0 }
  ),

  /**
   * Multi-page opportunities (page 2)
   */
  opportunitiesPage2: createPaginatedOpportunities(
    Array.from({ length: 20 }, (_, i) =>
      createDashboardOpportunity({
        _id: `opp-page2-${i}`,
        scoring: {
          recency: 60 - i * 2,
          impact: 50,
          total: 55 - i,
        },
      })
    ),
    { total: 45, hasMore: true, limit: 20, offset: 20 }
  ),

  /**
   * Batch responses for opportunities
   */
  responsesBatch: {
    responses: [dashboardResponseFixtures.draft, dashboardResponseFixtures.posted],
  },

  /**
   * Generate response success
   */
  generateSuccess: createDashboardResponse('opp-pending', {
    _id: 'resp-new',
    status: 'draft',
    text: 'Newly generated AI response based on knowledge base.',
  }),

  /**
   * Post response success
   */
  postSuccess: {
    ...dashboardResponseFixtures.draft,
    status: 'posted' as ResponseStatus,
    postedAt: new Date(),
    platformPostId: 'at://did:plc:user/app.bsky.feed.post/new123',
    platformPostUrl: 'https://bsky.app/profile/user/post/new123',
  },
};

/**
 * Mock error responses
 */
export const mockApiErrors = {
  /**
   * Network error
   */
  networkError: new Error('Network request failed'),

  /**
   * 503 Service Unavailable
   */
  serviceUnavailable: {
    status: 503,
    message: 'Service temporarily unavailable',
  },

  /**
   * 404 Not Found (opportunity deleted)
   */
  notFound: {
    status: 404,
    message: 'Opportunity not found',
  },

  /**
   * 500 Internal Server Error
   */
  serverError: {
    status: 500,
    message: 'Internal server error',
  },
};

/**
 * Helper to format relative time for assertions
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
};

/**
 * Helper to format follower count for assertions
 */
export const formatFollowerCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

/**
 * Filter status options (matches FilterBar component)
 */
export const filterStatusOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Draft Ready' },
  { value: 'responded', label: 'Posted' },
  { value: 'dismissed', label: 'Dismissed' },
] as const;

/**
 * Type for filter status values
 */
export type FilterStatusValue = (typeof filterStatusOptions)[number]['value'];
