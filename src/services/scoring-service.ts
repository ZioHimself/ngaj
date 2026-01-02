import type { OpportunityScore } from '@/shared/types/opportunity';
import type { RawPost, RawAuthor } from '@/tests/fixtures/opportunity-fixtures';

/**
 * Service responsible for calculating opportunity scores based on recency and impact.
 * 
 * Scoring Formula:
 * - Recency (60%): Exponential decay based on post age (e^(-age/30))
 * - Impact (40%): Logarithmic scale of reach and engagement
 * - Total: (0.6 * recency) + (0.4 * impact)
 * 
 * @see ADR-008: Opportunity Discovery Architecture
 */
export class ScoringService {
  /**
   * Calculate complete score for a post
   * 
   * @param post - Post metadata from platform adapter
   * @param author - Author metadata
   * @returns Score breakdown (recency, impact, total)
   */
  scoreOpportunity(post: RawPost, author: RawAuthor): OpportunityScore {
    throw new Error('Not implemented');
  }

  /**
   * Get human-readable explanation of score
   * 
   * @param score - Score breakdown
   * @returns Explanation string for UI tooltips
   */
  explainScore(score: OpportunityScore): string {
    throw new Error('Not implemented');
  }
}

