/**
 * Opportunity Type Definitions
 * 
 * @module types/opportunity
 */

import { EntityId, IdValidator, isStringId, isValidDate, isPlainObject } from './core.js';
import { Platform } from './account.js';

/**
 * Discovery type identifier for opportunity sources.
 * 
 * - 'replies': Responses to authenticated user's posts
 * - 'search': Keyword search results matching profile interests
 * 
 * v0.2: May add 'mentions', 'hashtags', 'follows'
 */
export type DiscoveryType = 'replies' | 'search';

/**
 * Opportunity status lifecycle.
 * 
 * - pending: Awaiting user review
 * - responded: User posted a response
 * - dismissed: User manually dismissed
 * - expired: TTL passed without action (system-managed)
 */
export type OpportunityStatus = 'pending' | 'responded' | 'dismissed' | 'expired';

/**
 * Opportunity represents a discovered social media post that could be
 * an engagement target for the user.
 * 
 * Stored in MongoDB `opportunities` collection.
 * 
 * @typeParam TId - ID type (defaults to string for frontend, use ObjectId for backend)
 * @see ADR-008: Opportunity Discovery Architecture
 */
export interface Opportunity<TId = string> {
  /** Document ID */
  _id: EntityId<TId>;

  /**
   * Account that discovered this opportunity
   * References accounts._id
   */
  accountId: EntityId<TId>;

  /**
   * Platform where this opportunity was found
   * v0.1: Only 'bluesky'
   */
  platform: Platform;

  /**
   * Platform-specific post identifier
   * Bluesky: AT URI (e.g., "at://did:plc:xxx/app.bsky.feed.post/xxx")
   * LinkedIn: Post URN
   * Reddit: Post ID (t3_xxx)
   */
  postId: string;

  /**
   * Direct URL to the post on the platform
   * Example: "https://bsky.app/profile/user.bsky.social/post/xxx"
   */
  postUrl: string;

  /** Post content and metadata */
  content: {
    /** Post text content */
    text: string;

    /** When the post was originally created on the platform */
    createdAt: Date;
  };

  /**
   * Reference to the post author
   * References authors._id
   */
  authorId: EntityId<TId>;

  /** Engagement metrics captured at discovery time */
  engagement: {
    /** Number of likes/favorites */
    likes: number;

    /** Number of reposts/retweets/shares */
    reposts: number;

    /** Number of replies */
    replies: number;
  };

  /** Scoring breakdown */
  scoring: OpportunityScore;

  /**
   * How this opportunity was discovered
   * 'replies': Response to user's post
   * 'search': Keyword search match
   */
  discoveryType: DiscoveryType;

  /**
   * Current opportunity status
   */
  status: OpportunityStatus;

  /** When this opportunity was discovered */
  discoveredAt: Date;

  /**
   * When this opportunity will expire
   * Calculated: discoveredAt + OPPORTUNITY_TTL_HOURS (default: 4h, reduced from 48h in ADR-018)
   */
  expiresAt: Date;

  /** Last modification timestamp */
  updatedAt: Date;
}

/**
 * Scoring breakdown for an opportunity.
 * 
 * Total = (0.6 * recency) + (0.4 * impact)
 */
export interface OpportunityScore {
  /**
   * Recency score (0-100)
   * Based on exponential decay: e^(-ageInMinutes / 30)
   * - Posts < 2 min: ~100
   * - Posts @ 30 min: ~37
   * - Posts @ 2 hours: ~1
   */
  recency: number;

  /**
   * Impact score (0-100)
   * Based on logarithmic scale of reach and engagement:
   * - Author follower count: log10(followers)
   * - Post likes: log10(likes + 1)
   * - Post reposts: log10(reposts + 1)
   * Normalized to 0-100
   */
  impact: number;

  /**
   * Total weighted score (0-100)
   * Formula: (0.6 * recency) + (0.4 * impact)
   */
  total: number;
}

/**
 * Author represents a social media user who authored discovered posts.
 * Upserted during discovery; supports future interaction tracking.
 * 
 * Stored in MongoDB `authors` collection.
 * 
 * @typeParam TId - ID type (defaults to string for frontend, use ObjectId for backend)
 */
export interface Author<TId = string> {
  /** Document ID */
  _id: EntityId<TId>;

  /** Platform identifier */
  platform: Platform;

  /**
   * Platform-specific user identifier
   * Bluesky: DID (e.g., "did:plc:abc123...")
   * LinkedIn: User ID
   * Reddit: Username
   */
  platformUserId: string;

  /**
   * Platform-specific handle/username
   * Bluesky: "@user.bsky.social"
   * Reddit: "u/username"
   * LinkedIn: "username"
   */
  handle: string;

  /** User's display name */
  displayName: string;

  /** User's bio/description (optional) */
  bio?: string;

  /**
   * Follower count (updated on each discovery)
   */
  followerCount: number;

  /**
   * When this author record was last updated
   * Used to determine cache staleness
   */
  lastUpdatedAt: Date;
}

/**
 * Opportunity with populated author data.
 * Result of MongoDB $lookup join.
 * 
 * @typeParam TId - ID type (defaults to string for frontend, use ObjectId for backend)
 */
export interface OpportunityWithAuthor<TId = string> extends Opportunity<TId> {
  /** Populated author document */
  author: Author<TId>;
}

/**
 * Sort options for opportunity list queries.
 * Prefix with '-' for descending order.
 */
export type OpportunitySort = 'score' | '-score' | 'discoveredAt' | '-discoveredAt';

/**
 * Filters for querying opportunities.
 */
export interface OpportunityFilters {
  /** Filter by status (single or multiple) */
  status?: OpportunityStatus | OpportunityStatus[];

  /** Maximum number of results */
  limit?: number;

  /** Pagination offset */
  offset?: number;
}

/**
 * Full query parameters for listing opportunities.
 * Used by frontend to construct API requests.
 */
export interface ListOpportunitiesQuery {
  /** Filter by status (default: 'pending') */
  status?: OpportunityStatus | 'all';
  
  /** Maximum results per page (default: 20, max: 100) */
  limit?: number;
  
  /** Pagination offset (default: 0) */
  offset?: number;
  
  /** Sort field and direction (default: '-score') */
  sort?: OpportunitySort;
}

/**
 * Paginated opportunities result from API.
 */
export interface PaginatedOpportunities {
  /** Opportunities with populated author data */
  opportunities: OpportunityWithAuthor[];
  
  /** Total count matching filters */
  total: number;
  
  /** Items per page */
  limit: number;
  
  /** Items skipped */
  offset: number;
  
  /** Whether more pages exist */
  hasMore: boolean;
}

const VALID_PLATFORMS: Platform[] = ['bluesky', 'linkedin', 'reddit'];
const VALID_DISCOVERY_TYPES: DiscoveryType[] = ['replies', 'search'];
const VALID_STATUSES: OpportunityStatus[] = ['pending', 'responded', 'dismissed', 'expired'];

/**
 * Creates a type guard for Opportunity with environment-specific ID validation.
 */
export function createOpportunityGuard<TId>(
  isValidId: IdValidator<TId>
): (obj: unknown) => obj is Opportunity<TId> {
  return (obj: unknown): obj is Opportunity<TId> => {
    if (!isPlainObject(obj)) return false;
    const o = obj as Partial<Opportunity<TId>>;
    return (
      isValidId(o._id) &&
      isValidId(o.accountId) &&
      typeof o.platform === 'string' &&
      VALID_PLATFORMS.includes(o.platform as Platform) &&
      typeof o.postId === 'string' &&
      typeof o.postUrl === 'string' &&
      isPlainObject(o.content) &&
      typeof (o.content as Opportunity['content']).text === 'string' &&
      isValidDate((o.content as Opportunity['content']).createdAt) &&
      isValidId(o.authorId) &&
      isPlainObject(o.engagement) &&
      typeof (o.engagement as Opportunity['engagement']).likes === 'number' &&
      typeof (o.engagement as Opportunity['engagement']).reposts === 'number' &&
      typeof (o.engagement as Opportunity['engagement']).replies === 'number' &&
      isPlainObject(o.scoring) &&
      typeof (o.scoring as OpportunityScore).recency === 'number' &&
      typeof (o.scoring as OpportunityScore).impact === 'number' &&
      typeof (o.scoring as OpportunityScore).total === 'number' &&
      typeof o.discoveryType === 'string' &&
      VALID_DISCOVERY_TYPES.includes(o.discoveryType as DiscoveryType) &&
      typeof o.status === 'string' &&
      VALID_STATUSES.includes(o.status as OpportunityStatus) &&
      isValidDate(o.discoveredAt) &&
      isValidDate(o.expiresAt) &&
      isValidDate(o.updatedAt)
    );
  };
}

/**
 * Creates a type guard for Author with environment-specific ID validation.
 */
export function createAuthorGuard<TId>(
  isValidId: IdValidator<TId>
): (obj: unknown) => obj is Author<TId> {
  return (obj: unknown): obj is Author<TId> => {
    if (!isPlainObject(obj)) return false;
    const a = obj as Partial<Author<TId>>;
    return (
      isValidId(a._id) &&
      typeof a.platform === 'string' &&
      VALID_PLATFORMS.includes(a.platform as Platform) &&
      typeof a.platformUserId === 'string' &&
      typeof a.handle === 'string' &&
      typeof a.displayName === 'string' &&
      (a.bio === undefined || typeof a.bio === 'string') &&
      typeof a.followerCount === 'number' &&
      isValidDate(a.lastUpdatedAt)
    );
  };
}

/**
 * Default type guard for Opportunity with string IDs.
 */
export const isOpportunity = createOpportunityGuard(isStringId);

/**
 * Default type guard for Author with string IDs.
 */
export const isAuthor = createAuthorGuard(isStringId);

/**
 * Partial opportunity for create operations (omit generated fields)
 */
export type CreateOpportunityInput<TId = string> = Omit<Opportunity<TId>, '_id' | 'updatedAt'>;

/**
 * Partial opportunity for update operations (only status changes allowed)
 */
export interface UpdateOpportunityInput {
  status: OpportunityStatus;
}

/**
 * Partial author for upsert operations
 */
export type UpsertAuthorInput<TId = string> = Omit<Author<TId>, '_id' | 'lastUpdatedAt'>;

/**
 * Raw post data from platform adapter (before transformation to Opportunity)
 */
export interface RawPost {
  /** Platform-specific post identifier (e.g., AT URI for Bluesky) */
  id: string;
  
  /** Direct URL to the post */
  url: string;
  
  /** Post text content */
  text: string;
  
  /** When the post was created */
  createdAt: Date;
  
  /** Platform-specific author identifier */
  authorId: string;
  
  /** Number of likes */
  likes: number;
  
  /** Number of reposts */
  reposts: number;
  
  /** Number of replies */
  replies: number;
}

/**
 * Raw author data from platform adapter (before transformation to Author)
 */
export interface RawAuthor {
  /** Platform-specific user identifier */
  id: string;
  
  /** Platform handle/username */
  handle: string;
  
  /** Display name */
  displayName: string;
  
  /** Bio/description (optional) */
  bio?: string;
  
  /** Follower count */
  followerCount: number;
}
