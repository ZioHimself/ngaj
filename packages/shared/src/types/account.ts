/**
 * Account Type Definitions
 * 
 * @module types/account
 */

import { EntityId, IdValidator, isStringId, isValidDate, isPlainObject } from './core.js';
import type { Profile } from './profile.js';

/**
 * Platform identifier for supported social media platforms.
 * 
 * v0.1: Only 'bluesky' implemented
 * v0.2: Add 'linkedin' and 'reddit'
 */
export type Platform = 'bluesky' | 'linkedin' | 'reddit';

/**
 * Account status indicating current operational state.
 */
export type AccountStatus = 'active' | 'paused' | 'error';

/**
 * Account represents a connection to a specific social media platform
 * for a given profile.
 * 
 * Relationship: Many Accounts → 1 Profile
 * 
 * Credentials (passwords, tokens) are stored in .env per ADR-002.
 * Only non-sensitive identifiers (handle) are stored in MongoDB.
 * 
 * @typeParam TId - ID type (defaults to string for frontend, use ObjectId for backend)
 * @see ADR-006: Profile and Account Separation
 * @see ADR-002: Environment Variables for Credentials
 */
export interface Account<TId = string> {
  /** Document ID */
  _id: EntityId<TId>;
  
  /** Reference to the profile this account belongs to */
  profileId: EntityId<TId>;
  
  /** Platform identifier */
  platform: Platform;
  
  /**
   * Platform-specific handle/username (non-sensitive)
   * Examples:
   * - Bluesky: "@user.bsky.social"
   * - Reddit: "u/username"
   * - LinkedIn: "username" or email
   * 
   * Unique constraint: (platform, handle) must be unique
   */
  handle: string;
  
  /** Discovery configuration for this account */
  discovery: AccountDiscoveryConfig;
  
  /** Current account status */
  status: AccountStatus;
  
  /** When this account was created */
  createdAt: Date;
  
  /** When this account was last modified */
  updatedAt: Date;
}

/**
 * Discovery type identifier for opportunity sources.
 * 
 * v0.1: 'replies' and 'search'
 * v0.2+: May add 'mentions', 'hashtags', 'follows'
 */
export type DiscoveryType = 'replies' | 'search';

/**
 * Discovery configuration for a specific account.
 * Groups multiple typed schedules, status tracking, and error handling.
 * 
 * @see ADR-008: Opportunity Discovery Architecture
 */
export interface AccountDiscoveryConfig {
  /**
   * Array of typed discovery schedules.
   * Each discovery type (replies, search) has independent scheduling.
   * 
   * Example:
   * [
   *   { type: 'replies', enabled: true, cronExpression: '*\/15 * * * *' },
   *   { type: 'search', enabled: true, cronExpression: '0 *\/2 * * *' }
   * ]
   */
  schedules: DiscoveryTypeSchedule[];
  
  /**
   * Timestamp of last successful discovery (any type)
   * Used for dashboard display
   */
  lastAt?: Date;
  
  /**
   * Last error message from any discovery type
   * Cleared on successful run
   */
  error?: string;
}

/**
 * Typed discovery schedule with independent cron expression.
 * Enables different schedules for different discovery sources.
 */
export interface DiscoveryTypeSchedule {
  /**
   * Discovery source type
   * 'replies': Fetch replies to user's posts (via notifications/mentions)
   * 'search': Search for keywords from profile interests
   */
  type: DiscoveryType;
  
  /** Whether this discovery type is enabled */
  enabled: boolean;
  
  /**
   * Cron expression defining schedule frequency.
   * 
   * Examples:
   * - '*\/15 * * * *'   - Every 15 minutes
   * - '0 *\/2 * * *'    - Every 2 hours
   * - '0 9,17 * * *'   - 9am and 5pm daily
   * - '0 9-17 * * 1-5' - Hourly, weekdays, business hours
   * 
   * @see https://crontab.guru/ for cron syntax
   */
  cronExpression: string;
  
  /**
   * When this specific discovery type last ran
   * Used to calculate "since" parameter for API calls
   */
  lastRunAt?: Date;
}

const VALID_PLATFORMS: Platform[] = ['bluesky', 'linkedin', 'reddit'];
const VALID_STATUSES: AccountStatus[] = ['active', 'paused', 'error'];

/**
 * Creates a type guard for Account with environment-specific ID validation.
 * 
 * @example
 * // Frontend - use default string validation
 * const isAccount = createAccountGuard(isStringId);
 * 
 * // Backend - use ObjectId validation
 * import { ObjectId } from 'mongodb';
 * const isAccountDocument = createAccountGuard(
 *   (v): v is ObjectId => v instanceof ObjectId
 * );
 */
export function createAccountGuard<TId>(
  isValidId: IdValidator<TId>
): (obj: unknown) => obj is Account<TId> {
  return (obj: unknown): obj is Account<TId> => {
    if (!isPlainObject(obj)) return false;
    const a = obj as Partial<Account<TId>>;
    return (
      isValidId(a._id) &&
      isValidId(a.profileId) &&
      typeof a.platform === 'string' &&
      VALID_PLATFORMS.includes(a.platform as Platform) &&
      typeof a.handle === 'string' &&
      isPlainObject(a.discovery) &&
      Array.isArray((a.discovery as AccountDiscoveryConfig).schedules) &&
      typeof a.status === 'string' &&
      VALID_STATUSES.includes(a.status as AccountStatus) &&
      isValidDate(a.createdAt) &&
      isValidDate(a.updatedAt)
    );
  };
}

/**
 * Default type guard for Account with string IDs.
 * Use this in frontend and API validation.
 */
export const isAccount = createAccountGuard(isStringId);

/**
 * Partial account for create operations (omit generated fields)
 */
export type CreateAccountInput<TId = string> = Omit<Account<TId>, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * Partial account for update operations (omit immutable fields)
 */
export type UpdateAccountInput = Partial<Omit<Account<string>, '_id' | 'profileId' | 'platform' | 'createdAt' | 'updatedAt'>>;

/**
 * Account with populated profile (result of MongoDB $lookup)
 * 
 * @typeParam TId - ID type (defaults to string for frontend, use ObjectId for backend)
 */
export interface AccountWithProfile<TId = string> extends Account<TId> {
  /** Populated profile document */
  profile: Profile<TId>;
}
