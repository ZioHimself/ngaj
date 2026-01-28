import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringService } from '@ngaj/backend/services/scoring-service';
import { createMockRawPost, createMockRawAuthor, scoringScenarios } from '@tests/fixtures/opportunity-fixtures';

describe('ScoringService', () => {
  let scoringService: ScoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  describe('scoreOpportunity()', () => {
    it('should return high recency score for recent post (2 minutes old)', () => {
      // Arrange
      const post = createMockRawPost({
        createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        likes: 5,
        reposts: 2
      });
      const author = createMockRawAuthor({
        followerCount: 1000
      });

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      // For 2-minute old post: e^(-2/30) * 100 ≈ 93.5%
      expect(score.recency).toBeGreaterThanOrEqual(92);
      expect(score.recency).toBeLessThanOrEqual(95);
      expect(score.impact).toBeGreaterThanOrEqual(30);
      expect(score.impact).toBeLessThanOrEqual(36);
      // ADR-018: 70/30 weights → 0.7*93.5 + 0.3*33 ≈ 75.4
      expect(score.total).toBeGreaterThanOrEqual(72);
      expect(score.total).toBeLessThanOrEqual(78);
    });

    it('should return low recency score for old post (6 hours old)', () => {
      // Arrange
      const post = createMockRawPost({
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        likes: 500,
        reposts: 200
      });
      const author = createMockRawAuthor({
        followerCount: 1000000
      });

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      expect(score.recency).toBeLessThan(1);
      expect(score.impact).toBeGreaterThanOrEqual(75);
      expect(score.impact).toBeLessThanOrEqual(80);
      // ADR-018: 70/30 weights → 0.7*0 + 0.3*78 ≈ 23.4
      expect(score.total).toBeGreaterThanOrEqual(20);
      expect(score.total).toBeLessThanOrEqual(26);
    });

    it('should calculate correct score for middle-aged post (30 minutes)', () => {
      // Arrange
      const post = createMockRawPost({
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        likes: 20,
        reposts: 10
      });
      const author = createMockRawAuthor({
        followerCount: 10000
      });

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      // For 30-minute old post: e^(-30/30) * 100 ≈ 36.8%
      expect(score.recency).toBeGreaterThanOrEqual(35);
      expect(score.recency).toBeLessThanOrEqual(40);
      // Impact: log10(10000)*10 + log10(21)*3 + log10(11)*3 ≈ 47.1
      expect(score.impact).toBeGreaterThanOrEqual(43);
      expect(score.impact).toBeLessThanOrEqual(48);
      // ADR-018: 70/30 weights → 0.7*37 + 0.3*45.5 ≈ 39.5
      expect(score.total).toBeGreaterThanOrEqual(36);
      expect(score.total).toBeLessThanOrEqual(43);
    });

    it('should return maximum recency score for brand new post (0 minutes)', () => {
      // Arrange
      const post = createMockRawPost({
        createdAt: new Date(), // Right now
        likes: 0,
        reposts: 0
      });
      const author = createMockRawAuthor({
        followerCount: 5000
      });

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      expect(score.recency).toBe(100);
      expect(score.impact).toBeGreaterThanOrEqual(35);
      expect(score.impact).toBeLessThanOrEqual(40);
      // ADR-018: 70/30 weights → 0.7*100 + 0.3*37 ≈ 81.1
      expect(score.total).toBeGreaterThanOrEqual(78);
      expect(score.total).toBeLessThanOrEqual(84);
    });

    it('should handle zero engagement post gracefully', () => {
      // Arrange
      const post = createMockRawPost({
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        likes: 0,
        reposts: 0,
        replies: 0
      });
      const author = createMockRawAuthor({
        followerCount: 100
      });

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      expect(score).toBeDefined();
      expect(score.impact).toBeGreaterThan(0);
      expect(score.total).toBeGreaterThan(0);
      expect(Number.isFinite(score.recency)).toBe(true);
      expect(Number.isFinite(score.impact)).toBe(true);
      expect(Number.isFinite(score.total)).toBe(true);
    });

    it('should handle zero follower count gracefully', () => {
      // Arrange
      const post = createMockRawPost({
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
        likes: 5,
        reposts: 2
      });
      const author = createMockRawAuthor({
        followerCount: 0
      });

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      expect(score).toBeDefined();
      expect(score.impact).toBeGreaterThan(0); // Should use log10(1) as minimum
      expect(Number.isFinite(score.impact)).toBe(true);
    });

    it('should handle negative follower count by clamping to 0', () => {
      // Arrange
      const post = createMockRawPost({
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
        likes: 5,
        reposts: 2
      });
      const author = createMockRawAuthor({
        followerCount: -100 // Invalid data from API
      });

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      expect(score).toBeDefined();
      expect(score.impact).toBeGreaterThan(0);
      expect(Number.isFinite(score.impact)).toBe(true);
    });

    it('should weight recency more than impact (60/40 split)', () => {
      // Arrange: High recency, low impact
      const recentPost = createMockRawPost({
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
        likes: 1,
        reposts: 0
      });
      const smallAuthor = createMockRawAuthor({
        followerCount: 100
      });

      // Arrange: Low recency, high impact
      const oldPost = createMockRawPost({
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        likes: 500,
        reposts: 200
      });
      const largeAuthor = createMockRawAuthor({
        followerCount: 1000000
      });

      // Act
      const recentScore = scoringService.scoreOpportunity(recentPost, smallAuthor);
      const oldScore = scoringService.scoreOpportunity(oldPost, largeAuthor);

      // Assert: Recent post should score higher despite lower impact
      expect(recentScore.total).toBeGreaterThan(oldScore.total);
    });

    it('should return all scores between 0 and 100', () => {
      // Arrange
      const post = createMockRawPost();
      const author = createMockRawAuthor();

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      expect(score.recency).toBeGreaterThanOrEqual(0);
      expect(score.recency).toBeLessThanOrEqual(100);
      expect(score.impact).toBeGreaterThanOrEqual(0);
      expect(score.impact).toBeLessThanOrEqual(100);
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
    });

    it('should use exponential decay for recency (e^(-age/30))', () => {
      // Arrange: Post at exactly 30 minutes (decay factor)
      const post = createMockRawPost({
        createdAt: new Date(Date.now() - 30 * 60 * 1000)
      });
      const author = createMockRawAuthor();

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert: At decay factor, should be ~36.79% (1/e)
      expect(score.recency).toBeGreaterThanOrEqual(35);
      expect(score.recency).toBeLessThanOrEqual(39);
    });

    it('should use logarithmic scale for impact', () => {
      // Arrange: Test that doubling followers doesn't double impact
      const post = createMockRawPost({
        likes: 10,
        reposts: 5
      });
      const author1 = createMockRawAuthor({ followerCount: 1000 });
      const author2 = createMockRawAuthor({ followerCount: 2000 });

      // Act
      const score1 = scoringService.scoreOpportunity(post, author1);
      const score2 = scoringService.scoreOpportunity(post, author2);

      // Assert: Impact should increase, but not double
      expect(score2.impact).toBeGreaterThan(score1.impact);
      expect(score2.impact).toBeLessThan(score1.impact * 2);
    });
  });

  describe('explainScore()', () => {
    it('should return human-readable explanation for high score', () => {
      // Arrange
      const score = {
        recency: 100,
        impact: 50,
        total: 80
      };

      // Act
      const explanation = scoringService.explainScore(score);

      // Assert
      expect(explanation).toContain('recency');
      expect(explanation).toContain('impact');
      expect(explanation).toContain('80');
    });

    it('should return human-readable explanation for low score', () => {
      // Arrange
      const score = {
        recency: 5,
        impact: 20,
        total: 11
      };

      // Act
      const explanation = scoringService.explainScore(score);

      // Assert
      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(0);
    });

    it('should include score components in explanation', () => {
      // Arrange
      const score = {
        recency: 75,
        impact: 45,
        total: 63
      };

      // Act
      const explanation = scoringService.explainScore(score);

      // Assert
      expect(explanation).toContain('75');
      expect(explanation).toContain('45');
      expect(explanation).toContain('63');
    });
  });

  describe('Scoring Scenarios from Design Doc', () => {
    it('should match design doc scenario: recent small account', () => {
      // Arrange
      const { post, author, expectedScore } = scoringScenarios.recentSmall;

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      expect(score.recency).toBeGreaterThanOrEqual(expectedScore.recency - 2);
      expect(score.recency).toBeLessThanOrEqual(expectedScore.recency + 2);
      expect(score.impact).toBeGreaterThanOrEqual(expectedScore.impact - 5);
      expect(score.impact).toBeLessThanOrEqual(expectedScore.impact + 5);
      expect(score.total).toBeGreaterThanOrEqual(expectedScore.total - 5);
      expect(score.total).toBeLessThanOrEqual(expectedScore.total + 5);
    });

    it('should match design doc scenario: old large account', () => {
      // Arrange
      const { post, author, expectedScore } = scoringScenarios.oldLarge;

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      expect(score.recency).toBeLessThan(1);
      expect(score.impact).toBeGreaterThanOrEqual(expectedScore.impact - 5);
      expect(score.impact).toBeLessThanOrEqual(expectedScore.impact + 5);
      expect(score.total).toBeGreaterThanOrEqual(expectedScore.total - 5);
      expect(score.total).toBeLessThanOrEqual(expectedScore.total + 5);
    });

    it('should match design doc scenario: middle moderate', () => {
      // Arrange
      const { post, author, expectedScore } = scoringScenarios.middleModerate;

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      expect(score.recency).toBeGreaterThanOrEqual(expectedScore.recency - 3);
      expect(score.recency).toBeLessThanOrEqual(expectedScore.recency + 3);
      expect(score.impact).toBeGreaterThanOrEqual(expectedScore.impact - 5);
      expect(score.impact).toBeLessThanOrEqual(expectedScore.impact + 5);
      expect(score.total).toBeGreaterThanOrEqual(expectedScore.total - 5);
      expect(score.total).toBeLessThanOrEqual(expectedScore.total + 5);
    });

    it('should match design doc scenario: brand new post', () => {
      // Arrange
      const { post, author, expectedScore } = scoringScenarios.brandNew;

      // Act
      const score = scoringService.scoreOpportunity(post, author);

      // Assert
      expect(score.recency).toBe(100);
      expect(score.impact).toBeGreaterThanOrEqual(expectedScore.impact - 5);
      expect(score.impact).toBeLessThanOrEqual(expectedScore.impact + 5);
      expect(score.total).toBeGreaterThanOrEqual(expectedScore.total - 5);
      expect(score.total).toBeLessThanOrEqual(expectedScore.total + 5);
    });
  });
});

