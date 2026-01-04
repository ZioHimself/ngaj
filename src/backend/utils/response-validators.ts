/**
 * Validation utilities for response posting
 * 
 * @see ADR-010: Response Draft Posting
 */

import type { Response } from '@/shared/types/response';
import type { PostResult } from '@/backend/adapters/platform-adapter';
import { InvalidStatusError } from '@/shared/errors/platform-posting-errors';

/**
 * Validate that a response is eligible for posting.
 * 
 * A response can only be posted if it has status 'draft'.
 * Responses with status 'posted' or 'dismissed' cannot be posted.
 * 
 * @param response - Response to validate
 * @throws {InvalidStatusError} If response is not a draft
 */
export function validateResponseForPosting(response: Response): void {
  throw new Error('Not implemented');
}

/**
 * Validate that a PostResult has all required fields.
 * 
 * PostResult must have:
 * - postId (non-empty string)
 * - postUrl (non-empty string)
 * - postedAt (valid Date object)
 * 
 * @param postResult - PostResult to validate
 * @throws {Error} If PostResult is invalid
 */
export function validatePostResult(postResult: PostResult): void {
  throw new Error('Not implemented');
}

