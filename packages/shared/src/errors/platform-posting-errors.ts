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
    super(platform, `Authentication failed: ${message}. Please reconnect your account.`, false);
    this.name = 'AuthenticationError';
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

  constructor(platform: string, retryAfter: number = 60) {
    const timeStr = retryAfter >= 60 
      ? `${Math.round(retryAfter / 60)} minute${Math.round(retryAfter / 60) !== 1 ? 's' : ''}`
      : `${retryAfter} second${retryAfter !== 1 ? 's' : ''}`;
    super(platform, `Rate limit exceeded. Please retry after ${timeStr} (${retryAfter} seconds).`, true);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
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
    const message = postId 
      ? `Post not found or was deleted: ${postId}`
      : 'Post not found or was deleted';
    super(platform, message, false);
    this.name = 'PostNotFoundError';
    this.postId = postId;
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
    const message = violationReason
      ? `Content violation: ${violationReason}`
      : 'Content violation detected';
    super(platform, message, false);
    this.name = 'ContentViolationError';
    this.violationReason = violationReason;
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
    const expectedStr = Array.isArray(expectedStatus) 
      ? expectedStatus.join(' or ') 
      : expectedStatus;
    
    // Special message for already posted responses
    const message = currentStatus === 'posted'
      ? `Cannot post response with status 'posted' - already posted. Expected status: ${expectedStr}.`
      : `Cannot post response with status '${currentStatus}'. Expected status: ${expectedStr}.`;
    
    super(message);
    this.name = 'InvalidStatusError';
    this.currentStatus = currentStatus;
    this.expectedStatus = expectedStatus;
  }
}

