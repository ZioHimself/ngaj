import { ObjectId } from 'mongodb';
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
 * @see ADR-008: Opportunity Discovery Architecture
 */
export interface Opportunity {
  /** MongoDB document ID */
  _id: ObjectId;

  /**
   * Account that discovered this opportunity
   * References accounts._id
   */
  accountId: ObjectId;

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
  authorId: ObjectId;

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
   * Calculated: discoveredAt + OPPORTUNITY_TTL_HOURS (default: 48h)
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
 */
export interface Author {
  /** MongoDB document ID */
  _id: ObjectId;

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
 */
export interface OpportunityWithAuthor extends Opportunity {
  /** Populated author document */
  author: Author;
}

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
 * Type guard to check if an object is a valid Opportunity
 */
export function isOpportunity(obj: unknown): obj is Opportunity {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Partial<Opportunity>;
  return (
    o._id instanceof ObjectId &&
    o.accountId instanceof ObjectId &&
    typeof o.platform === 'string' &&
    ['bluesky', 'linkedin', 'reddit'].includes(o.platform) &&
    typeof o.postId === 'string' &&
    typeof o.postUrl === 'string' &&
    typeof o.content === 'object' &&
    o.authorId instanceof ObjectId &&
    typeof o.engagement === 'object' &&
    typeof o.scoring === 'object' &&
    typeof o.discoveryType === 'string' &&
    ['replies', 'search'].includes(o.discoveryType) &&
    typeof o.status === 'string' &&
    ['pending', 'responded', 'dismissed', 'expired'].includes(o.status) &&
    o.discoveredAt instanceof Date &&
    o.expiresAt instanceof Date &&
    o.updatedAt instanceof Date
  );
}

/**
 * Type guard to check if an object is a valid Author
 */
export function isAuthor(obj: unknown): obj is Author {
  if (typeof obj !== 'object' || obj === null) return false;
  const a = obj as Partial<Author>;
  return (
    a._id instanceof ObjectId &&
    typeof a.platform === 'string' &&
    ['bluesky', 'linkedin', 'reddit'].includes(a.platform) &&
    typeof a.platformUserId === 'string' &&
    typeof a.handle === 'string' &&
    typeof a.displayName === 'string' &&
    (a.bio === undefined || typeof a.bio === 'string') &&
    typeof a.followerCount === 'number' &&
    a.lastUpdatedAt instanceof Date
  );
}

/**
 * Partial opportunity for create operations (omit MongoDB-generated fields)
 */
export type CreateOpportunityInput = Omit<Opportunity, '_id' | 'updatedAt'>;

/**
 * Partial opportunity for update operations (only status changes allowed)
 */
export interface UpdateOpportunityInput {
  status: OpportunityStatus;
}

/**
 * Partial author for upsert operations
 */
export type UpsertAuthorInput = Omit<Author, '_id' | 'lastUpdatedAt'>;

