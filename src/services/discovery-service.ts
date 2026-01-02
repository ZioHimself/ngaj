import type { Db, ObjectId } from 'mongodb';
import type { IPlatformAdapter } from '@/adapters/platform-adapter';
import type { ScoringService } from './scoring-service';
import type {
  Opportunity,
  OpportunityWithAuthor,
  OpportunityFilters,
  OpportunityStatus,
  DiscoveryType
} from '@/shared/types/opportunity';

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
    throw new Error('Not implemented');
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
    throw new Error('Not implemented');
  }

  /**
   * Update opportunity status
   * 
   * @param opportunityId - MongoDB ObjectId of opportunity
   * @param status - New status
   * @throws NotFoundError if opportunity doesn't exist
   */
  async updateStatus(opportunityId: ObjectId, status: OpportunityStatus): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Manually expire stale opportunities
   * Typically run as a daily cleanup job
   * 
   * @returns Number of opportunities expired
   */
  async expireOpportunities(): Promise<number> {
    throw new Error('Not implemented');
  }
}

