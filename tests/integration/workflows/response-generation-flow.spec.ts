import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { ResponseSuggestionService } from '@/backend/services/response-suggestion-service';
import { createMockProfile, profileFixtures } from '@tests/fixtures/profile-fixtures';
import { createMockOpportunity } from '@tests/fixtures/opportunity-fixtures';
import {
  createMockConstraints,
  createMockKBChunks,
  createMockAnalysis
} from '@tests/fixtures/response-fixtures';

describe('Response Generation Flow - Integration Tests', () => {
  let service: ResponseSuggestionService;
  let mockDb: any;
  let mockClaudeClient: any;
  let mockChromaClient: any;
  let mockPlatformAdapter: any;
  let mockResponsesCollection: any;
  let mockOpportunitiesCollection: any;
  let mockProfilesCollection: any;

  beforeEach(() => {
    // Mock collections
    mockResponsesCollection = {
      findOne: vi.fn(),
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      })),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() })
    };

    mockOpportunitiesCollection = {
      findOne: vi.fn(),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 })
    };

    mockProfilesCollection = {
      findOne: vi.fn()
    };

    // Mock database
    mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'responses') return mockResponsesCollection;
        if (name === 'opportunities') return mockOpportunitiesCollection;
        if (name === 'profiles') return mockProfilesCollection;
        throw new Error(`Unknown collection: ${name}`);
      })
    };

    // Mock Claude client
    mockClaudeClient = {
      analyze: vi.fn(),
      generate: vi.fn()
    };

    // Mock ChromaDB client
    mockChromaClient = {
      search: vi.fn()
    };

    // Mock platform adapter
    mockPlatformAdapter = {
      getResponseConstraints: vi.fn()
    };

    service = new ResponseSuggestionService(
      mockDb,
      mockClaudeClient,
      mockChromaClient,
      mockPlatformAdapter
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Generation with KB Documents', () => {
    it('should complete full generation pipeline with KB chunks', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = profileFixtures.completeProfile;
      profile._id = profileId;
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        content: {
          text: 'What\'s your take on implementing TDD in JavaScript?',
          createdAt: new Date()
        }
      });
      const kbChunks = createMockKBChunks(3);
      const constraints = createMockConstraints({ maxLength: 300 });

      // Setup mocks
      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(constraints);

      // Stage 1: Analysis
      mockClaudeClient.analyze.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate 100ms
        return createMockAnalysis({
          mainTopic: 'test-driven development',
          keywords: ['tdd', 'javascript', 'testing'],
          domain: 'software engineering',
          question: 'How to implement TDD in JavaScript?'
        });
      });

      // KB Search
      mockChromaClient.search.mockResolvedValue(kbChunks);

      // Stage 2: Generation
      mockClaudeClient.generate.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150)); // Simulate 150ms
        return 'TDD in JavaScript is powerful! Start by writing failing tests with Jest or Vitest, then implement just enough code to pass. The cycle helps catch bugs early and improves design.';
      });

      // Act
      const result = await service.generateResponse(opportunityId, accountId, profileId);

      // Assert - Response structure
      expect(result).toBeDefined();
      expect(result.opportunityId).toEqual(opportunityId);
      expect(result.accountId).toEqual(accountId);
      expect(result.status).toBe('draft');
      expect(result.version).toBe(1);
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeLessThanOrEqual(300);

      // Assert - Metadata
      expect(result.metadata.analysisKeywords).toEqual(['tdd', 'javascript', 'testing']);
      expect(result.metadata.mainTopic).toBe('test-driven development');
      expect(result.metadata.domain).toBe('software engineering');
      expect(result.metadata.question).toBe('How to implement TDD in JavaScript?');
      expect(result.metadata.kbChunksUsed).toBe(3);
      expect(result.metadata.usedPrinciples).toBe(true);
      expect(result.metadata.usedVoice).toBe(true);
      expect(result.metadata.constraints.maxLength).toBe(300);
      expect(result.metadata.model).toBeTruthy();
      expect(result.metadata.generationTimeMs).toBeGreaterThan(0);
      expect(result.metadata.analysisTimeMs).toBeGreaterThan(0);
      expect(result.metadata.responseTimeMs).toBeGreaterThan(0);

      // Assert - Database operations
      expect(mockResponsesCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          opportunityId,
          accountId,
          status: 'draft',
          version: 1
        })
      );

      // Assert - Service interactions
      expect(mockClaudeClient.analyze).toHaveBeenCalledTimes(1);
      expect(mockChromaClient.search).toHaveBeenCalledTimes(1);
      expect(mockClaudeClient.generate).toHaveBeenCalledTimes(1);
    });

    it('should use extracted keywords for KB search', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        content: {
          text: 'Tell me about vector databases and embeddings',
          createdAt: new Date()
        }
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );

      mockClaudeClient.analyze.mockResolvedValue(
        createMockAnalysis({
          keywords: ['vector', 'database', 'embeddings', 'semantic search']
        })
      );
      mockChromaClient.search.mockResolvedValue(createMockKBChunks(2));
      mockClaudeClient.generate.mockResolvedValue('Vector databases are optimized for semantic search...');

      // Act
      await service.generateResponse(opportunityId, accountId, profileId);

      // Assert - KB search was called with keywords from analysis
      expect(mockChromaClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: ['vector', 'database', 'embeddings', 'semantic search']
        })
      );
    });

    it('should complete generation in under 10 seconds', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );

      // Simulate realistic timings
      mockClaudeClient.analyze.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms
        return createMockAnalysis();
      });
      mockChromaClient.search.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms
        return createMockKBChunks(2);
      });
      mockClaudeClient.generate.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms
        return 'Test response';
      });

      // Act
      const start = Date.now();
      const result = await service.generateResponse(opportunityId, accountId, profileId);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(10000); // Under 10 seconds
      expect(result.metadata.generationTimeMs).toBeLessThan(10000);
    });
  });

  describe('End-to-End Generation without KB Documents', () => {
    it('should generate response when no KB chunks found', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        content: {
          text: 'What\'s your favorite pizza topping?',
          createdAt: new Date()
        }
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(
        createMockAnalysis({
          mainTopic: 'pizza preferences',
          keywords: ['pizza', 'food', 'preferences'],
          domain: 'casual',
          question: 'What\'s your favorite topping?'
        })
      );
      mockChromaClient.search.mockResolvedValue([]); // No KB chunks
      mockClaudeClient.generate.mockResolvedValue(
        'I enjoy trying different toppings! Classic margherita is always a solid choice.'
      );

      // Act
      const result = await service.generateResponse(opportunityId, accountId, profileId);

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.kbChunksUsed).toBe(0);
      expect(result.text).toBeTruthy();
      expect(result.status).toBe('draft');
    });

    it('should be faster without KB search', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return createMockAnalysis();
      });
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return 'Response';
      });

      // Act
      const start = Date.now();
      const result = await service.generateResponse(opportunityId, accountId, profileId);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(6000); // Under 6 seconds (faster than with KB)
      expect(result.metadata.generationTimeMs).toBeLessThan(6000);
    });
  });

  describe('Platform Constraints Integration', () => {
    it('should apply Bluesky constraints correctly', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        platform: 'bluesky'
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints({ maxLength: 300 })
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('x'.repeat(280)); // Under 300

      // Act
      const result = await service.generateResponse(opportunityId, accountId, profileId);

      // Assert
      expect(result).toBeDefined();
      expect(result.text.length).toBeLessThanOrEqual(300);
      expect(result.metadata.constraints.maxLength).toBe(300);
      expect(mockPlatformAdapter.getResponseConstraints).toHaveBeenCalledWith(
        'bluesky'
      );
    });

    it('should reject response that violates platform constraints', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        platform: 'bluesky'
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints({ maxLength: 300 })
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('x'.repeat(350)); // Over 300

      // Act & Assert
      await expect(
        service.generateResponse(opportunityId, accountId, profileId)
      ).rejects.toThrow(/exceeds platform limit/);
    });
  });

  describe('Error Handling', () => {
    it('should handle ChromaDB unavailable gracefully', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockRejectedValue(new Error('Connection refused'));
      mockClaudeClient.generate.mockResolvedValue('Response without KB.');

      // Act
      const result = await service.generateResponse(opportunityId, accountId, profileId);

      // Assert - Should succeed without KB chunks
      expect(result).toBeDefined();
      expect(result.metadata.kbChunksUsed).toBe(0);
      expect(result.text).toBeTruthy();
    });

    it('should handle Claude API failure with retry', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      
      // First call fails, second succeeds
      let analyzeCallCount = 0;
      mockClaudeClient.analyze.mockImplementation(async () => {
        analyzeCallCount++;
        if (analyzeCallCount === 1) {
          throw new Error('Rate limit');
        }
        return createMockAnalysis();
      });
      
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('Response after retry.');

      // Act
      const result = await service.generateResponse(opportunityId, accountId, profileId);

      // Assert
      expect(result).toBeDefined();
      expect(mockClaudeClient.analyze).toHaveBeenCalledTimes(2); // Retry happened
    });

    it('should fail after max retries', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      
      // Always fails
      mockClaudeClient.analyze.mockRejectedValue(new Error('Service unavailable'));

      // Act & Assert
      await expect(
        service.generateResponse(opportunityId, accountId, profileId)
      ).rejects.toThrow(/unavailable/);
    });

    it('should handle malformed analysis JSON', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockRejectedValue(
        new Error('Failed to parse JSON')
      );

      // Act & Assert
      await expect(
        service.generateResponse(opportunityId, accountId, profileId)
      ).rejects.toThrow();
    });
  });

  describe('Multi-Version Workflow', () => {
    it('should handle regenerate request (version increment)', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });
      
      // Existing v1 response (dismissed)
      mockResponsesCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            {
              _id: new ObjectId(),
              opportunityId,
              accountId,
              version: 1,
              status: 'dismissed'
            }
          ])
        })
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('New version response.');

      // Act
      const result = await service.generateResponse(opportunityId, accountId, profileId);

      // Assert
      expect(result.version).toBe(2); // Incremented
      expect(result.status).toBe('draft');
    });
  });
});

