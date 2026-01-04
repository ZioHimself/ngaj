/**
 * Response Posting Service
 * 
 * Handles posting draft responses to social media platforms.
 * 
 * @see ADR-010: Response Draft Posting
 */

import type { Db, ObjectId } from 'mongodb';
import type { Response } from '@/shared/types/response';
import type { IPlatformAdapter } from '@/backend/adapters/platform-adapter';
import { validateResponseForPosting, validatePostResult } from '@/backend/utils/response-validators';

/**
 * Service for posting responses to social media platforms.
 * 
 * Workflow:
 * 1. Load response, opportunity, and account
 * 2. Validate response is draft
 * 3. Call platform adapter to post
 * 4. Update response with platform metadata
 * 5. Update opportunity status to "responded"
 */
export class ResponsePostingService {
  private responsesCollection;
  private opportunitiesCollection;
  private accountsCollection;

  constructor(
    db: Db,
    private platformAdapter: IPlatformAdapter
  ) {
    this.responsesCollection = db.collection('responses');
    this.opportunitiesCollection = db.collection('opportunities');
    this.accountsCollection = db.collection('accounts');
  }

  /**
   * Post a draft response to the social media platform.
   * 
   * @param responseId - ID of response to post
   * @returns Updated response with platform metadata
   * 
   * @throws {NotFoundError} If response, opportunity, or account not found
   * @throws {InvalidStatusError} If response is not a draft
   * @throws {AuthenticationError} If platform credentials invalid
   * @throws {RateLimitError} If platform rate limit exceeded
   * @throws {PostNotFoundError} If parent post deleted
   * @throws {ContentViolationError} If response violates platform rules
   * @throws {PlatformPostingError} For other posting failures
   */
  async postResponse(responseId: ObjectId): Promise<Response> {
    // 1. Load response from database
    const response = await this.responsesCollection.findOne({ _id: responseId });
    if (!response) {
      throw new Error(`Response with ID ${responseId.toString()} not found`);
    }

    // 2. Validate response is eligible for posting (must be draft)
    validateResponseForPosting(response as Response);

    // 3. Load opportunity (to get parent post ID for threading)
    const opportunity = await this.opportunitiesCollection.findOne({ _id: response.opportunityId });
    if (!opportunity) {
      throw new Error(`Opportunity with ID ${response.opportunityId.toString()} not found`);
    }

    // 4. Load account (to verify it exists)
    const account = await this.accountsCollection.findOne({ _id: response.accountId });
    if (!account) {
      throw new Error(`Account with ID ${response.accountId.toString()} not found`);
    }

    // 5. Post to platform (adapter handles platform-specific logic)
    const postResult = await this.platformAdapter.post(opportunity.postId, response.text);

    // 6. Validate post result
    validatePostResult(postResult);

    // 7. Update response with platform metadata
    const now = new Date();
    await this.responsesCollection.updateOne(
      { _id: responseId },
      {
        $set: {
          status: 'posted',
          postedAt: postResult.postedAt,
          platformPostId: postResult.postId,
          platformPostUrl: postResult.postUrl,
          updatedAt: now,
        },
      }
    );

    // 8. Update opportunity status to "responded"
    await this.opportunitiesCollection.updateOne(
      { _id: opportunity._id },
      {
        $set: {
          status: 'responded',
          updatedAt: now,
        },
      }
    );

    // 9. Return updated response
    const updatedResponse = await this.responsesCollection.findOne({ _id: responseId });
    return updatedResponse as Response;
  }
}

