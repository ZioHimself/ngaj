import type { Db } from 'mongodb';
import type { IPlatformAdapter } from '../adapters/platform-adapter.js';
import type { ScoringService } from './scoring-service.js';
import type {
  OpportunityFilters,
  OpportunityStatus,
  DiscoveryType,
  RawPost
} from '@ngaj/shared';
import {
  ObjectId,
  type OpportunityDocument,
  type OpportunityWithAuthorDocument,
  type AuthorDocument,
  type AccountDocument,
  type ProfileDocument,
} from '../types/documents.js';
import { createComponentLogger, sanitizeError } from '../utils/logger.js';
import type pino from 'pino';

// Lazy-initialized discovery component logger to support test injection
let _discoveryLogger: pino.Logger | null = null;

function getDiscoveryLogger(): pino.Logger {
  if (!_discoveryLogger) {
    _discoveryLogger = createComponentLogger('discovery');
  }
  return _discoveryLogger;
}

/**
 * Reset the discovery logger (for testing)
 * This allows tests to inject a new destination
 */
export function resetDiscoveryLogger(): void {
  _discoveryLogger = null;
}

/**
 * Discovery service interface
 */
export interface IDiscoveryService {
  discover(accountId: ObjectId, discoveryType: DiscoveryType): Promise<OpportunityDocument[]>;
  getOpportunities(accountId: ObjectId, filters?: OpportunityFilters): Promise<{
    opportunities: OpportunityWithAuthorDocument[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }>;
  updateStatus(opportunityId: ObjectId, status: OpportunityStatus): Promise<void>;
  expireOpportunities(): Promise<number>;
}

/**
 * Service responsible for discovering and managing opportunities
 * 
 * Core responsibilities:
 * - Orchestrate discovery for account + discovery type
 * - Fetch posts from platform adapter
 * - Score opportunities using ScoringService
 * - Deduplicate by (accountId, postId)
 * - Persist opportunities and authors to MongoDB
 * - Manage opportunity lifecycle (status updates, expiration)
 * 
 * @see ADR-008: Opportunity Discovery Architecture
 */
/** ADR-018: Pending opportunities expire after 4 hours */
export const OPPORTUNITY_TTL_HOURS = 4;

export class DiscoveryService implements IDiscoveryService {
  private readonly DEFAULT_SCORE_THRESHOLD = 30;
  private readonly DEFAULT_LOOKBACK_HOURS = 2;

  constructor(
    private db: Db,
    private platformAdapter: IPlatformAdapter,
    private scoringService: ScoringService
  ) {}

  /**
   * Run discovery for a specific account and type
   * 
   * @param accountId - MongoDB ObjectId of account
   * @param discoveryType - 'replies' or 'search'
   * @returns Array of created opportunities
   * @throws DiscoveryError on failure
   */
  async discover(accountId: ObjectId, discoveryType: DiscoveryType): Promise<OpportunityDocument[]> {
    const log = getDiscoveryLogger().child({
      accountId: accountId.toString(),
      discoveryType,
      component: 'discovery',
    });

    const startTime = Date.now();
    log.info('Discovery starting');

    try {
      // 1. Load account and profile
      const accountsCollection = this.db.collection<AccountDocument>('accounts');
      const account = await accountsCollection.findOne({ _id: accountId });
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const profilesCollection = this.db.collection<ProfileDocument>('profiles');
      const profile = await profilesCollection.findOne({ _id: account.profileId });
      if (!profile) {
        throw new Error(`Profile not found: ${account.profileId}`);
      }

      // 2. Get schedule for this discovery type
      const schedule = account.discovery.schedules.find(s => s.type === discoveryType);
      if (!schedule) {
        throw new Error(`No schedule found for discovery type: ${discoveryType}`);
      }

      // 3. Determine "since" parameter
      const since = schedule.lastRunAt || new Date(Date.now() - this.DEFAULT_LOOKBACK_HOURS * 60 * 60 * 1000);
      log.debug({ since: since.toISOString() }, 'Fetching posts since');

      // 4. Fetch posts from platform
      let posts: RawPost[];
      if (discoveryType === 'replies') {
        posts = await this.platformAdapter.fetchReplies({ since, limit: 100 });
      } else {
        // Search type - use profile keywords, fallback to interests
        const keywords = profile.discovery.keywords.length > 0
          ? profile.discovery.keywords
          : profile.discovery.interests;
        if (keywords.length === 0) {
          // Skip search if no keywords or interests configured
          log.info({ postCount: 0, keywords: [] }, 'No keywords or interests configured, skipping search');
          await this.updateDiscoverySuccess(accountId, discoveryType);
          return [];
        }
        const source = profile.discovery.keywords.length > 0 ? 'keywords' : 'interests';
        log.debug({ keywords, source }, 'Searching with keywords');
        posts = await this.platformAdapter.searchPosts(keywords, { since, limit: 50 });
      }

      log.info({ postCount: posts.length }, 'Posts fetched from platform');

      // 5. Process each post
      const opportunities: OpportunityDocument[] = [];
      let skippedDuplicates = 0;
      let skippedLowScore = 0;

      for (const post of posts) {
        // Check for duplicate
        const opportunitiesCollection = this.db.collection<OpportunityDocument>('opportunities');
        const existing = await opportunitiesCollection.findOne({
          accountId,
          postId: post.id
        });
        if (existing) {
          skippedDuplicates++;
          continue; // Skip duplicate
        }

        // Fetch author
        const rawAuthor = await this.platformAdapter.getAuthor(post.authorId);

        // Score opportunity
        const score = this.scoringService.scoreOpportunity(post, rawAuthor);

        // Upsert author
        const authorsCollection = this.db.collection<AuthorDocument>('authors');
        await authorsCollection.updateOne(
          {
            platform: account.platform,
            platformUserId: rawAuthor.id
          },
          {
            $set: {
              handle: rawAuthor.handle,
              displayName: rawAuthor.displayName,
              bio: rawAuthor.bio,
              followerCount: rawAuthor.followerCount,
              lastUpdatedAt: new Date()
            }
          },
          { upsert: true }
        );

        // Get author _id
        const author = await authorsCollection.findOne({
          platform: account.platform,
          platformUserId: rawAuthor.id
        });
        if (!author) {
          throw new Error(`Failed to upsert author: ${rawAuthor.id}`);
        }

        // Filter by threshold
        if (score.total < this.DEFAULT_SCORE_THRESHOLD) {
          skippedLowScore++;
          continue; // Skip low-scoring opportunities
        }

        // Create opportunity
        const discoveredAt = new Date();
        const expiresAt = new Date(discoveredAt.getTime() + OPPORTUNITY_TTL_HOURS * 60 * 60 * 1000);

        const opportunity: OpportunityDocument = {
          _id: new ObjectId(),
          accountId,
          platform: account.platform,
          postId: post.id,
          postUrl: post.url,
          content: {
            text: post.text,
            createdAt: post.createdAt
          },
          authorId: author._id,
          engagement: {
            likes: post.likes,
            reposts: post.reposts,
            replies: post.replies
          },
          scoring: score,
          discoveryType,
          status: 'pending',
          discoveredAt,
          expiresAt,
          updatedAt: discoveredAt
        };

        // Insert opportunity
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await opportunitiesCollection.insertOne(opportunity as any);
        opportunities.push(opportunity);
      }

      // 6. Update account discovery status
      await this.updateDiscoverySuccess(accountId, discoveryType);

      const durationMs = Date.now() - startTime;
      log.debug({ skippedDuplicates, skippedLowScore }, 'Scoring complete');
      log.info(
        { created: opportunities.length, skippedDuplicates, skippedLowScore, durationMs },
        'Discovery complete'
      );

      return opportunities;
    } catch (error) {
      log.error({ err: sanitizeError(error) }, 'Discovery failed');
      // Update error status
      await this.updateDiscoveryError(accountId, error as Error);
      throw error;
    }
  }

  /**
   * Get opportunities for an account, optionally filtered
   * 
   * @param accountId - MongoDB ObjectId of account
   * @param filters - Optional filters (status, limit, offset)
   * @returns Paginated opportunities with populated authors
   */
  async getOpportunities(
    accountId: ObjectId,
    filters?: OpportunityFilters
  ): Promise<{
    opportunities: OpportunityWithAuthorDocument[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }> {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { accountId };
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status };
      } else {
        query.status = filters.status;
      }
    }

    // Query opportunities
    const opportunitiesCollection = this.db.collection<OpportunityDocument>('opportunities');
    const opportunities = await opportunitiesCollection
      .find(query)
      .sort({ 'scoring.total': -1 })
      .limit(limit)
      .skip(offset)
      .toArray();

    const total = await opportunitiesCollection.countDocuments(query);

    // Populate authors
    const authorsCollection = this.db.collection<AuthorDocument>('authors');
    const opportunitiesWithAuthors: OpportunityWithAuthorDocument[] = [];
    for (const opp of opportunities) {
      const author = await authorsCollection.findOne({ _id: opp.authorId });
      if (author) {
        opportunitiesWithAuthors.push({
          ...opp,
          author
        });
      }
    }

    return {
      opportunities: opportunitiesWithAuthors,
      pagination: {
        total,
        limit,
        offset
      }
    };
  }

  /**
   * Update opportunity status
   * 
   * @param opportunityId - MongoDB ObjectId of opportunity
   * @param status - New status
   * @throws NotFoundError if opportunity doesn't exist
   */
  async updateStatus(opportunityId: ObjectId, status: OpportunityStatus): Promise<void> {
    const opportunitiesCollection = this.db.collection<OpportunityDocument>('opportunities');
    const result = await opportunitiesCollection.updateOne(
      { _id: opportunityId },
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }
  }

  /**
   * Manually expire stale opportunities
   * Typically run as a daily cleanup job
   * 
   * @returns Number of opportunities expired
   */
  async expireOpportunities(): Promise<number> {
    const opportunitiesCollection = this.db.collection<OpportunityDocument>('opportunities');
    const result = await opportunitiesCollection.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() }
      },
      {
        $set: {
          status: 'expired',
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount;
  }

  /**
   * Update account discovery status on success
   */
  private async updateDiscoverySuccess(accountId: ObjectId, discoveryType: DiscoveryType): Promise<void> {
    const accountsCollection = this.db.collection<AccountDocument>('accounts');
    const account = await accountsCollection.findOne({ _id: accountId });
    if (!account) return;

    const scheduleIndex = account.discovery.schedules.findIndex(s => s.type === discoveryType);
    if (scheduleIndex === -1) return;

    await accountsCollection.updateOne(
      { _id: accountId },
      {
        $set: {
          'discovery.lastAt': new Date(),
          [`discovery.schedules.${scheduleIndex}.lastRunAt`]: new Date()
        }
      }
    );
  }

  /**
   * Update account discovery error status
   */
  private async updateDiscoveryError(accountId: ObjectId, error: Error): Promise<void> {
    const accountsCollection = this.db.collection<AccountDocument>('accounts');
    await accountsCollection.updateOne(
      { _id: accountId },
      {
        $set: {
          'discovery.error': error.message
        }
      }
    );
  }
}

