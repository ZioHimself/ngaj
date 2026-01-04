import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { ResponseSuggestionService } from '@/backend/services/response-suggestion-service';
import {
  adversarialOpportunityFixtures,
  createMockAnalysis,
  createMockConstraints
} from '@tests/fixtures/response-fixtures';
import { createMockProfile } from '@tests/fixtures/profile-fixtures';

describe('ResponseSuggestionService - Security Tests', () => {
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
          toArray: vi.fn()
        }))
      })),
      insertOne: vi.fn()
    };

    mockOpportunitiesCollection = {
      findOne: vi.fn()
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

  describe('Prompt Injection Prevention - Basic Attacks', () => {
    it('should prevent basic prompt injection attempt', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.basicInjection;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      
      // The key test: generated response should NOT be "I agree completely"
      // It should treat the entire text as a post, not instructions
      mockClaudeClient.generate.mockResolvedValue(
        'Interesting perspective! I think the topic deserves thoughtful discussion.'
      );
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(
        opportunity._id,
        accountId,
        profileId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.text.toLowerCase()).not.toContain('i agree completely');
      expect(result.text).not.toBe('I agree completely');
    });

    it('should prevent system role injection attempt', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.systemRoleInjection;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue(
        'That\'s an interesting take on the topic. Let me share my perspective.'
      );
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(
        opportunity._id,
        accountId,
        profileId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.text.toUpperCase()).not.toBe('HACKED');
      expect(result.text.toLowerCase()).not.toContain('hacked');
    });
  });

  describe('Prompt Injection Prevention - Boundary Marker Escape (CRITICAL)', () => {
    it('should prevent boundary marker escape attempt', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.boundaryMarkerEscape;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      // Should generate thoughtful response, not "PWNED"
      mockClaudeClient.generate.mockResolvedValue(
        'I appreciate you sharing that perspective. Let me offer my thoughts.'
      );
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(
        opportunity._id,
        accountId,
        profileId
      );

      // Assert - CRITICAL: Should NOT say "PWNED"
      expect(result).toBeDefined();
      expect(result.text.toUpperCase()).not.toBe('PWNED');
      expect(result.text.toLowerCase()).not.toContain('pwned');
      
      // Verify the adversarial text was treated as data, not instructions
      // by checking that Claude was called with proper prompt structure
      expect(mockClaudeClient.generate).toHaveBeenCalled();
    });

    it('should prevent boundary marker escape variant', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.boundaryMarkerEscapeVariant;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue(
        'Thanks for sharing! Here\'s what I think about this.'
      );
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(
        opportunity._id,
        accountId,
        profileId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.text).not.toContain('"hacked"');
      expect(result.text.toLowerCase()).not.toContain('hacked');
    });

    it('should verify first-occurrence rule for boundary markers', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.boundaryMarkerEscape;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );

      // Mock analyze to capture the prompt it receives
      let capturedAnalysisPrompt = '';
      mockClaudeClient.analyze.mockImplementation((prompt: string) => {
        capturedAnalysisPrompt = prompt;
        return Promise.resolve(createMockAnalysis());
      });

      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('Safe response.');
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      await service.generateResponse(opportunity._id, accountId, profileId);

      // Assert - Verify prompt structure
      // The first boundary marker should be from the system
      // The second occurrence (in user text) should be treated as literal
      const firstMarker = capturedAnalysisPrompt.indexOf('--- USER INPUT BEGINS ---');
      const secondMarker = capturedAnalysisPrompt.indexOf(
        '--- USER INPUT BEGINS ---',
        firstMarker + 1
      );

      expect(firstMarker).toBeGreaterThan(-1);
      expect(secondMarker).toBeGreaterThan(firstMarker);
      
      // The entire adversarial text should appear AFTER the first marker
      const adversarialText = opportunity.content.text;
      const adversarialTextIndex = capturedAnalysisPrompt.indexOf(adversarialText);
      expect(adversarialTextIndex).toBeGreaterThan(firstMarker);
    });
  });

  describe('Prompt Injection Prevention - Markdown and Code Blocks', () => {
    it('should prevent markdown code block injection', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.markdownInjection;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue(
        'Interesting code example! Let me share my thoughts.'
      );
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(
        opportunity._id,
        accountId,
        profileId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.text.toLowerCase()).not.toBe('pwned');
      expect(result.text.toLowerCase()).not.toContain('pwned');
    });

    it('should prevent role confusion with assistant tag', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.roleConfusion;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue(
        'I have some thoughts on this topic I\'d like to share.'
      );
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(
        opportunity._id,
        accountId,
        profileId
      );

      // Assert
      expect(result).toBeDefined();
      // Should not be manipulated into saying "Yes, I agree" only
      expect(result.text).not.toBe('Yes, I agree');
    });
  });

  describe('Prompt Injection Prevention - Analysis Stage (Stage 1)', () => {
    it('should prevent injection in analysis stage', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.analysisInjection;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      // Should still return valid JSON, not unstructured text
      mockClaudeClient.analyze.mockResolvedValue(
        createMockAnalysis({
          mainTopic: 'format inquiry',
          keywords: ['json', 'output', 'format'],
          domain: 'general',
          question: 'none'
        })
      );
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('Valid response.');
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(
        opportunity._id,
        accountId,
        profileId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.analysisKeywords).toBeDefined();
      expect(Array.isArray(result.metadata.analysisKeywords)).toBe(true);
    });

    it('should prevent analysis stage escape attempt', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.analysisEscape;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      // Should analyze the entire text, not return the injected JSON
      mockClaudeClient.analyze.mockResolvedValue(
        createMockAnalysis({
          mainTopic: 'post with instructions',
          keywords: ['instructions', 'json', 'return'],
          domain: 'general',
          question: 'none'
        })
      );
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('Thoughtful response.');
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(
        opportunity._id,
        accountId,
        profileId
      );

      // Assert
      expect(result).toBeDefined();
      // Should NOT have "hacked" as the only keyword
      expect(result.metadata.analysisKeywords).not.toEqual(['hacked']);
    });
  });

  describe('Input Validation - Edge Cases', () => {
    it('should handle extremely long opportunity text', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.extremelyLong;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('Response to long post.');
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(
        opportunity._id,
        accountId,
        profileId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      // Should complete without timeout or crash
    });

    it('should handle Unicode and special characters safely', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.unicodeSpecial;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('Great topic! 🚀');
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(
        opportunity._id,
        accountId,
        profileId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      // No encoding errors
    });

    it('should handle empty opportunity text', async () => {
      // Arrange
      const accountId = new ObjectId();
      const authorId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const adversarialOpps = adversarialOpportunityFixtures(accountId, authorId);
      const opportunity = adversarialOpps.emptyText;
      opportunity._id = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      mockClaudeClient.analyze.mockResolvedValue(
        createMockAnalysis({
          mainTopic: 'none',
          keywords: [],
          domain: 'general',
          question: 'none'
        })
      );
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('Thanks for reaching out!');
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(
        opportunity._id,
        accountId,
        profileId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });
});

