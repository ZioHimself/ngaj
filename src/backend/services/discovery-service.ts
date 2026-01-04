import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import type { IPlatformAdapter } from '@/backend/adapters/platform-adapter';
import type { ScoringService } from './scoring-service';
import type {
  Opportunity,
  OpportunityWithAuthor,
  OpportunityFilters,
  OpportunityStatus,
  DiscoveryType,
  Author,
  RawPost
} from '@/shared/types/opportunity';
import type { Account } from '@/shared/types/account';
import type { Profile } from '@/shared/types/profile';

/**
 * Discovery service interface
 */
export interface IDiscoveryService {
  discover(accountId: ObjectId, discoveryType: DiscoveryType): Promise<Opportunity[]>;
  getOpportunities(accountId: ObjectId, filters?: OpportunityFilters): Promise<{
    opportunities: OpportunityWithAuthor[];
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
export class DiscoveryService implements IDiscoveryService {
  private readonly DEFAULT_SCORE_THRESHOLD = 30;
  private readonly OPPORTUNITY_TTL_HOURS = 48;
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
  async discover(accountId: ObjectId, discoveryType: DiscoveryType): Promise<Opportunity[]> {
    try {
      // 1. Load account and profile
      const accountsCollection = this.db.collection<Account>('accounts');
      const account = await accountsCollection.findOne({ _id: accountId });
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const profilesCollection = this.db.collection<Profile>('profiles');
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

      // 4. Fetch posts from platform
      let posts: RawPost[];
      if (discoveryType === 'replies') {
        posts = await this.platformAdapter.fetchReplies({ since, limit: 100 });
      } else {
        // Search type - use profile keywords
        const keywords = profile.discovery.keywords;
        if (keywords.length === 0) {
          // Skip search if no keywords configured
          await this.updateDiscoverySuccess(accountId, discoveryType);
          return [];
        }
        posts = await this.platformAdapter.searchPosts(keywords, { since, limit: 50 });
      }

      // 5. Process each post
      const opportunities: Opportunity[] = [];
      for (const post of posts) {
        // Check for duplicate
        const opportunitiesCollection = this.db.collection<Opportunity>('opportunities');
        const existing = await opportunitiesCollection.findOne({
          accountId,
          postId: post.id
        });
        if (existing) {
          continue; // Skip duplicate
        }

        // Fetch author
        const rawAuthor = await this.platformAdapter.getAuthor(post.authorId);

        // Score opportunity
        const score = this.scoringService.scoreOpportunity(post, rawAuthor);

        // Upsert author
        const authorsCollection = this.db.collection<Author>('authors');
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
          continue; // Skip low-scoring opportunities
        }

        // Create opportunity
        const discoveredAt = new Date();
        const expiresAt = new Date(discoveredAt.getTime() + this.OPPORTUNITY_TTL_HOURS * 60 * 60 * 1000);

        const opportunity: Opportunity = {
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

      return opportunities;
    } catch (error) {
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
    opportunities: OpportunityWithAuthor[];
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
    const opportunitiesCollection = this.db.collection<Opportunity>('opportunities');
    const opportunities = await opportunitiesCollection
      .find(query)
      .sort({ 'scoring.total': -1 })
      .limit(limit)
      .skip(offset)
      .toArray();

    const total = await opportunitiesCollection.countDocuments(query);

    // Populate authors
    const authorsCollection = this.db.collection<Author>('authors');
    const opportunitiesWithAuthors: OpportunityWithAuthor[] = [];
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
    const opportunitiesCollection = this.db.collection<Opportunity>('opportunities');
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
    const opportunitiesCollection = this.db.collection<Opportunity>('opportunities');
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
    const accountsCollection = this.db.collection<Account>('accounts');
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
    const accountsCollection = this.db.collection<Account>('accounts');
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

