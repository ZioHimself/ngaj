import type { OpportunityScore, RawPost, RawAuthor } from '@ngaj/shared';

/**
 * Service responsible for calculating opportunity scores based on recency and impact.
 * 
 * Scoring Formula (ADR-018: updated from 60/40 to 70/30):
 * - Recency (70%): Exponential decay based on post age (e^(-age/30))
 * - Impact (30%): Logarithmic scale of reach and engagement
 * - Total: (0.7 * recency) + (0.3 * impact)
 * 
 * The 70/30 weighting prioritizes fresh opportunities over high-follower stale posts,
 * which is important given the reduced 4-hour TTL.
 * 
 * @see ADR-008: Opportunity Discovery Architecture
 * @see ADR-018: Expiration Mechanics (scoring rebalance)
 */
export class ScoringService {
  private readonly RECENCY_WEIGHT = 0.7;
  private readonly IMPACT_WEIGHT = 0.3;
  private readonly RECENCY_DECAY_FACTOR = 30; // minutes

  /**
   * Calculate complete score for a post
   * 
   * @param post - Post metadata from platform adapter
   * @param author - Author metadata
   * @returns Score breakdown (recency, impact, total)
   */
  scoreOpportunity(post: RawPost, author: RawAuthor): OpportunityScore {
    const recency = this.calculateRecencyScore(post.createdAt);
    const impact = this.calculateImpactScore(post, author);
    const total = this.RECENCY_WEIGHT * recency + this.IMPACT_WEIGHT * impact;

    return {
      recency: Math.round(recency * 10) / 10, // Round to 1 decimal
      impact: Math.round(impact * 10) / 10,
      total: Math.round(total * 10) / 10
    };
  }

  /**
   * Get human-readable explanation of score
   * 
   * @param score - Score breakdown
   * @returns Explanation string for UI tooltips
   */
  explainScore(score: OpportunityScore): string {
    const recencyPct = Math.round(score.recency);
    const impactPct = Math.round(score.impact);
    
    const explanation = `Score: ${score.total}/100 (recency: ${recencyPct}%, impact: ${impactPct}%)`;
    
    return explanation;
  }

  /**
   * Calculate recency score using exponential decay
   * Formula: e^(-ageInMinutes / 30) * 100
   * 
   * @param createdAt - Post creation timestamp
   * @returns Recency score (0-100)
   */
  private calculateRecencyScore(createdAt: Date): number {
    const ageInMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
    const score = Math.exp(-ageInMinutes / this.RECENCY_DECAY_FACTOR) * 100;
    return Math.max(0, Math.min(100, score)); // Clamp to 0-100
  }

  /**
   * Calculate impact score using logarithmic scale
   * Based on: follower count + post likes + post reposts
   * 
   * @param post - Post metadata
   * @param author - Author metadata
   * @returns Impact score (0-100)
   */
  private calculateImpactScore(post: RawPost, author: RawAuthor): number {
    // Clamp follower count to non-negative
    const followers = Math.max(0, author.followerCount);
    const likes = Math.max(0, post.likes);
    const reposts = Math.max(0, post.reposts);
    
    // Calculate logarithmic components
    const followerScore = followers > 0 ? Math.log10(followers) : 0;
    const likesScore = Math.log10(likes + 1); // +1 to handle 0 likes
    const repostsScore = Math.log10(reposts + 1); // +1 to handle 0 reposts
    
    // Combine scores with weights
    // Followers: primary (10x weight)
    // Engagement: secondary (3x weight each for high engagement)
    const rawScore = followerScore * 10 + likesScore * 3 + repostsScore * 3;
    
    // Clamp to 0-100 range
    // Max theoretical: log10(10M) * 10 + log10(10K) * 2 + log10(10K) * 2 = 70 + 8 + 8 = 86
    return Math.max(0, Math.min(100, rawScore));
  }
}

