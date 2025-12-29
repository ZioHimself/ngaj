import { ObjectId } from 'mongodb';

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
 * @see ADR-006: Profile and Account Separation
 * @see ADR-002: Environment Variables for Credentials
 */
export interface Account {
  /** MongoDB document ID */
  _id: ObjectId;
  
  /** Reference to the profile this account belongs to */
  profileId: ObjectId;
  
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
 * Discovery configuration for a specific account.
 * Groups scheduling, status tracking, and error handling.
 */
export interface AccountDiscoveryConfig {
  /** Scheduling configuration */
  schedule: DiscoverySchedule;
  
  /** Timestamp of last successful discovery operation */
  lastAt?: Date;
  
  /** Last error message from discovery operation */
  error?: string;
}

/**
 * Discovery schedule configuration using cron expressions.
 */
export interface DiscoverySchedule {
  /** Whether discovery is enabled for this account */
  enabled: boolean;
  
  /**
   * Cron expression defining discovery frequency.
   * 
   * Examples:
   * - '0 * * * *'     - Every hour
   * - '0 *\/2 * * *'  - Every 2 hours
   * - '0 9,17 * * *'  - 9am and 5pm daily
   * - '0 9-17 * * 1-5' - Hourly, weekdays, business hours
   * 
   * @see https://crontab.guru/ for cron syntax
   */
  cronExpression: string;
}

/**
 * Type guard to check if an object is a valid Account
 */
export function isAccount(obj: unknown): obj is Account {
  if (typeof obj !== 'object' || obj === null) return false;
  const a = obj as Partial<Account>;
  return (
    a._id instanceof ObjectId &&
    a.profileId instanceof ObjectId &&
    typeof a.platform === 'string' &&
    ['bluesky', 'linkedin', 'reddit'].includes(a.platform) &&
    typeof a.handle === 'string' &&
    typeof a.discovery === 'object' &&
    typeof a.status === 'string' &&
    ['active', 'paused', 'error'].includes(a.status) &&
    a.createdAt instanceof Date &&
    a.updatedAt instanceof Date
  );
}

/**
 * Partial account for create operations (omit MongoDB-generated fields)
 */
export type CreateAccountInput = Omit<Account, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * Partial account for update operations (omit immutable fields)
 */
export type UpdateAccountInput = Partial<Omit<Account, '_id' | 'profileId' | 'platform' | 'createdAt' | 'updatedAt'>>;

/**
 * Account with populated profile (result of MongoDB $lookup)
 */
export interface AccountWithProfile extends Account {
  /** Populated profile document */
  profile: import('./profile').Profile;
}

