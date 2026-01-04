/**
 * Platform-specific posting error classes
 * 
 * @see ADR-010: Response Draft Posting
 */

/**
 * Base error for platform posting failures.
 * All platform-specific errors extend this class.
 */
export class PlatformPostingError extends Error {
  public readonly platform: string;
  public readonly retryable: boolean;

  constructor(platform: string, message: string, retryable: boolean = true) {
    super(message);
    this.name = 'PlatformPostingError';
    this.platform = platform;
    this.retryable = retryable;
  }
}

/**
 * Authentication error - expired or invalid credentials.
 * User must reconnect their account to retry.
 * 
 * **Not retryable** - requires user intervention.
 */
export class AuthenticationError extends PlatformPostingError {
  constructor(platform: string, message: string) {
    throw new Error('Not implemented');
  }
}

/**
 * Rate limit error - platform has throttled requests.
 * User should wait before retrying.
 * 
 * **Retryable** - can retry after waiting.
 */
export class RateLimitError extends PlatformPostingError {
  public readonly retryAfter: number; // seconds

  constructor(platform: string, retryAfter?: number) {
    throw new Error('Not implemented');
  }
}

/**
 * Post not found error - parent post was deleted.
 * Cannot post a reply to a deleted post.
 * 
 * **Not retryable** - parent post no longer exists.
 */
export class PostNotFoundError extends PlatformPostingError {
  public readonly postId?: string;

  constructor(platform: string, postId?: string) {
    throw new Error('Not implemented');
  }
}

/**
 * Content violation error - response violates platform rules.
 * User must edit content before retrying.
 * 
 * **Not retryable** - requires content changes.
 */
export class ContentViolationError extends PlatformPostingError {
  public readonly violationReason?: string;

  constructor(platform: string, violationReason?: string) {
    throw new Error('Not implemented');
  }
}

/**
 * Invalid status error - response is not in correct status for posting.
 * For example, trying to post a response that's already posted.
 * 
 * **Not a platform error** - internal validation error.
 */
export class InvalidStatusError extends Error {
  public readonly currentStatus: string;
  public readonly expectedStatus: string | string[];

  constructor(currentStatus: string, expectedStatus: string | string[]) {
    throw new Error('Not implemented');
  }
}

