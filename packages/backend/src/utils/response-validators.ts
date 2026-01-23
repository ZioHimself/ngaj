/**
 * Validation utilities for response posting
 * 
 * @see ADR-010: Response Draft Posting
 */

import type { Response } from '@ngaj/shared';
import type { PostResult } from '../adapters/platform-adapter.js';
import { InvalidStatusError } from '@ngaj/shared';

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
  if (response.status !== 'draft') {
    throw new InvalidStatusError(response.status, 'draft');
  }
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
  if (!postResult) {
    throw new Error('PostResult is required');
  }

  if (postResult.postId === undefined || postResult.postId === null) {
    throw new Error('postId is required');
  }

  if (typeof postResult.postId !== 'string' || postResult.postId.trim() === '') {
    throw new Error('postId cannot be empty');
  }

  if (postResult.postUrl === undefined || postResult.postUrl === null) {
    throw new Error('postUrl is required');
  }

  if (typeof postResult.postUrl !== 'string' || postResult.postUrl.trim() === '') {
    throw new Error('postUrl cannot be empty');
  }

  if (postResult.postedAt === undefined || postResult.postedAt === null) {
    throw new Error('postedAt is required');
  }

  if (!(postResult.postedAt instanceof Date)) {
    throw new Error('postedAt must be a Date');
  }

  if (isNaN(postResult.postedAt.getTime())) {
    throw new Error('postedAt is invalid');
  }
}

