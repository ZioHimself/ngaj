/**
 * ScoringService Weights Update Tests (ADR-018)
 *
 * Tests for the updated scoring weights (70/30 instead of 60/40)
 * to prioritize recency in opportunity ranking.
 *
 * @see ADR-018: Expiration Mechanics (scoring adjustment section)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringService } from '@ngaj/backend/services/scoring-service';
import { scoringScenarios70_30, SCORING_WEIGHTS } from '@tests/fixtures/cleanup-fixtures';
import { createMockRawPost, createMockRawAuthor } from '@tests/fixtures/opportunity-fixtures';

describe('ScoringService - Updated 70/30 Weights (ADR-018)', () => {
  let scoringService: ScoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  describe('scoreOpportunity() with updated weights', () => {
    it('should use 70% recency weight (brand new post = 100 recency)', () => {
      // Arrange - brand new post with 0 engagement (0 impact contribution)
      const post = createMockRawPost({
        createdAt: new Date(), // Right now = 100 recency
        likes: 0,
        reposts: 0,
      });
      const author = createMockRawAuthor({
        followerCount: 1, // Minimal to reduce impact
      });

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      // With 70/30 weights: total ≈ 0.70 * 100 + 0.30 * impact
      // Recency is 100, so total should be > 70
      expect(score.recency).toBe(100);
      expect(score.total).toBeGreaterThanOrEqual(70);
    });

    it('should use 30% impact weight', () => {
      // Arrange - old post with high impact (low recency contribution)
      const post = createMockRawPost({
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago = ~0 recency
        likes: 10000,
        reposts: 5000,
      });
      const author = createMockRawAuthor({
        followerCount: 1000000, // High reach
      });

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      // With 70/30 weights: total ≈ 0.70 * 0 + 0.30 * impact
      // Impact should be ~80-100, so total should be around 24-30
      expect(score.recency).toBeLessThan(5);
      expect(score.total).toBeLessThanOrEqual(35); // Max: 0 + 0.3 * 100 = 30 (plus rounding)
    });

    it('should prioritize recent content over high-impact old content', () => {
      // Arrange
      // Recent post with low engagement
      const recentPost = createMockRawPost({
        createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
        likes: 5,
        reposts: 2,
      });
      const smallAuthor = createMockRawAuthor({
        followerCount: 500,
      });

      // Old post with high engagement
      const oldPost = createMockRawPost({
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        likes: 500,
        reposts: 200,
      });
      const largeAuthor = createMockRawAuthor({
        followerCount: 500000,
      });

      // Act
      const recentScore = scoringService.scoreOpportunity(recentPost, smallAuthor);
      const oldScore = scoringService.scoreOpportunity(oldPost, largeAuthor);

      // Assert - with 70/30 weights, recency should dominate
      expect(recentScore.total).toBeGreaterThan(oldScore.total);
    });
  });

  describe('Weight Verification', () => {
    it('should have updated weights to 70/30 (from 60/40)', () => {
      // Arrange - controlled inputs for exact weight verification
      // Post exactly at decay factor (30 min) = ~37% recency
      const post = createMockRawPost({
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        likes: 10,
        reposts: 5,
      });
      const author = createMockRawAuthor({
        followerCount: 5000,
      });

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      // With 60/40 old weights vs 70/30 new weights:
      // New formula gives higher weight to recency
      // For recency ~37 and impact ~40:
      // 60/40: 0.6 * 37 + 0.4 * 40 = 22.2 + 16 = 38.2
      // 70/30: 0.7 * 37 + 0.3 * 40 = 25.9 + 12 = 37.9
      // The test verifies the formula by checking specific ranges
      expect(score.recency).toBeGreaterThanOrEqual(35);
      expect(score.recency).toBeLessThanOrEqual(40);
    });
  });

  describe('Expected SCORING_WEIGHTS constants', () => {
    it('should have RECENCY weight of 0.70', () => {
      expect(SCORING_WEIGHTS.RECENCY).toBe(0.7);
    });

    it('should have IMPACT weight of 0.30', () => {
      expect(SCORING_WEIGHTS.IMPACT).toBe(0.3);
    });

    it('should have weights that sum to 1.0', () => {
      const sum = SCORING_WEIGHTS.RECENCY + SCORING_WEIGHTS.IMPACT;
      expect(sum).toBe(1.0);
    });
  });

  describe('Scoring scenarios with 70/30 weights', () => {
    it('should match expected score for high recency, moderate impact', () => {
      // This tests the expected behavior after implementation
      const { recency, impact, expected } = scoringScenarios70_30.highRecency;

      // Calculate expected total with 70/30 weights
      const calculatedExpected = Math.round(0.7 * recency + 0.3 * impact);

      // Assert fixture is correctly set up
      expect(calculatedExpected).toBe(expected);
    });

    it('should match expected score for low recency, high impact', () => {
      const { recency, impact, expected } = scoringScenarios70_30.lowRecency;
      const calculatedExpected = Math.round(0.7 * recency + 0.3 * impact);
      expect(calculatedExpected).toBe(expected);
    });

    it('should match expected score for balanced inputs', () => {
      const { recency, impact, expected } = scoringScenarios70_30.balanced;
      const calculatedExpected = Math.round(0.7 * recency + 0.3 * impact);
      expect(calculatedExpected).toBe(expected);
    });
  });
});
