/**
 * Platform-specific posting error classes
 *
 * @see ADR-010: Response Draft Posting
 */
/**
 * Base error for platform posting failures.
 * All platform-specific errors extend this class.
 */
export declare class PlatformPostingError extends Error {
    readonly platform: string;
    readonly retryable: boolean;
    constructor(platform: string, message: string, retryable?: boolean);
}
/**
 * Authentication error - expired or invalid credentials.
 * User must reconnect their account to retry.
 *
 * **Not retryable** - requires user intervention.
 */
export declare class AuthenticationError extends PlatformPostingError {
    constructor(platform: string, message: string);
}
/**
 * Rate limit error - platform has throttled requests.
 * User should wait before retrying.
 *
 * **Retryable** - can retry after waiting.
 */
export declare class RateLimitError extends PlatformPostingError {
    readonly retryAfter: number;
    constructor(platform: string, retryAfter?: number);
}
/**
 * Post not found error - parent post was deleted.
 * Cannot post a reply to a deleted post.
 *
 * **Not retryable** - parent post no longer exists.
 */
export declare class PostNotFoundError extends PlatformPostingError {
    readonly postId?: string;
    constructor(platform: string, postId?: string);
}
/**
 * Content violation error - response violates platform rules.
 * User must edit content before retrying.
 *
 * **Not retryable** - requires content changes.
 */
export declare class ContentViolationError extends PlatformPostingError {
    readonly violationReason?: string;
    constructor(platform: string, violationReason?: string);
}
/**
 * Invalid status error - response is not in correct status for posting.
 * For example, trying to post a response that's already posted.
 *
 * **Not a platform error** - internal validation error.
 */
export declare class InvalidStatusError extends Error {
    readonly currentStatus: string;
    readonly expectedStatus: string | string[];
    constructor(currentStatus: string, expectedStatus: string | string[]);
}
//# sourceMappingURL=platform-posting-errors.d.ts.map