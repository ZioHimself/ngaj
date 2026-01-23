import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { ResponseSuggestionService } from '@ngaj/backend/services/response-suggestion-service';
import {
  createMockResponse,
  createMockAnalysis,
  createMockConstraints,
  createMockKBChunks,
  mockClaudeResponses
} from '@tests/fixtures/response-fixtures';
import { createMockOpportunity } from '@tests/fixtures/opportunity-fixtures';
import { createMockProfile, profileFixtures } from '@tests/fixtures/profile-fixtures';

describe('ResponseSuggestionService', () => {
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
        })),
        toArray: vi.fn()
      })),
      insertOne: vi.fn(),
      updateOne: vi.fn()
    };

    mockOpportunitiesCollection = {
      findOne: vi.fn(),
      updateOne: vi.fn()
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

  describe('generateResponse()', () => {
    it('should generate response with KB documents', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId,
        content: {
          text: 'What do you think about TDD?',
          createdAt: new Date()
        }
      });
      const kbChunks = createMockKBChunks(3);
      const constraints = createMockConstraints({ maxLength: 300 });

      // Mock database returns
      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);

      // Mock platform adapter
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(constraints);

      // Mock Stage 1: Analysis
      mockClaudeClient.analyze.mockResolvedValue(
        createMockAnalysis({
          mainTopic: 'test-driven development',
          keywords: ['tdd', 'testing', 'unit tests'],
          domain: 'software engineering',
          question: 'What are the benefits of TDD?'
        })
      );

      // Mock KB search
      mockChromaClient.search.mockResolvedValue(kbChunks);

      // Mock Stage 2: Generation
      mockClaudeClient.generate.mockResolvedValue(
        'TDD is a practice where you write tests first. It helps catch bugs early and improves code design.'
      );

      // Mock response insert
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(opportunityId, accountId, profileId);

      // Assert
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeLessThanOrEqual(300);
      expect(result.status).toBe('draft');
      expect(result.version).toBe(1);
      expect(result.metadata.analysisKeywords).toContain('tdd');
      expect(result.metadata.kbChunksUsed).toBe(3);
      expect(result.metadata.usedPrinciples).toBe(true);
      expect(result.metadata.usedVoice).toBe(true);
      expect(result.metadata.generationTimeMs).toBeGreaterThanOrEqual(0);

      // Verify calls
      expect(mockOpportunitiesCollection.findOne).toHaveBeenCalledWith({
        _id: opportunityId
      });
      // Verify analyze was called with a prompt containing the opportunity text
      expect(mockClaudeClient.analyze).toHaveBeenCalledWith(
        expect.stringContaining(opportunity.content.text)
      );
      // Verify the prompt has boundary marker for security
      expect(mockClaudeClient.analyze).toHaveBeenCalledWith(
        expect.stringContaining('--- USER INPUT BEGINS ---')
      );
      expect(mockChromaClient.search).toHaveBeenCalled();
      expect(mockClaudeClient.generate).toHaveBeenCalled();
      expect(mockResponsesCollection.insertOne).toHaveBeenCalled();
    });

    it('should generate response without KB documents', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });
      const constraints = createMockConstraints();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(constraints);
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]); // No KB chunks
      mockClaudeClient.generate.mockResolvedValue('Response without KB context.');
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(opportunityId, accountId, profileId);

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.kbChunksUsed).toBe(0);
      expect(result.text).toBeTruthy();
    });

    it('should generate response with empty principles and voice', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = profileFixtures.minimalProfile;
      profile._id = profileId;
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });
      const constraints = createMockConstraints();

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(constraints);
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('Generic response.');
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(opportunityId, accountId, profileId);

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.usedPrinciples).toBe(false);
      expect(result.metadata.usedVoice).toBe(false);
    });

    it('should throw error when opportunity not found', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();

      mockOpportunitiesCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generateResponse(opportunityId, accountId, profileId)
      ).rejects.toThrow('Opportunity not found');
    });

    it('should throw error when profile not found', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generateResponse(opportunityId, accountId, profileId)
      ).rejects.toThrow('Profile not found');
    });

    it('should throw error when generated response violates constraints', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });
      const constraints = createMockConstraints({ maxLength: 300 });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(constraints);
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      // Generate response that's too long
      mockClaudeClient.generate.mockResolvedValue(mockClaudeResponses.overLimit);

      // Act & Assert
      await expect(
        service.generateResponse(opportunityId, accountId, profileId)
      ).rejects.toThrow(/exceeds platform limit/);
    });

    it('should increment version number for regenerated responses', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const profileId = new ObjectId();
      const profile = createMockProfile({ _id: profileId });
      const opportunity = createMockOpportunity(accountId, new ObjectId(), {
        _id: opportunityId
      });
      const existingResponse = createMockResponse(opportunityId, accountId, {
        version: 1,
        status: 'dismissed'
      });

      mockOpportunitiesCollection.findOne.mockResolvedValue(opportunity);
      mockProfilesCollection.findOne.mockResolvedValue(profile);
      mockPlatformAdapter.getResponseConstraints.mockReturnValue(
        createMockConstraints()
      );
      // Mock finding existing responses
      mockResponsesCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([existingResponse])
        })
      });
      mockClaudeClient.analyze.mockResolvedValue(createMockAnalysis());
      mockChromaClient.search.mockResolvedValue([]);
      mockClaudeClient.generate.mockResolvedValue('New version response.');
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(opportunityId, accountId, profileId);

      // Assert
      expect(result.version).toBe(2);
    });

    it('should handle analysis parsing error', async () => {
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
      // Mock malformed analysis response
      mockClaudeClient.analyze.mockRejectedValue(new Error('Invalid JSON'));

      // Act & Assert
      await expect(
        service.generateResponse(opportunityId, accountId, profileId)
      ).rejects.toThrow();
    });

    it('should handle Claude API timeout', async () => {
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
      mockChromaClient.search.mockResolvedValue([]);
      // Mock timeout
      mockClaudeClient.generate.mockRejectedValue(new Error('Timeout'));

      // Act & Assert
      await expect(
        service.generateResponse(opportunityId, accountId, profileId)
      ).rejects.toThrow('Timeout');
    });

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
      // Mock ChromaDB failure
      mockChromaClient.search.mockRejectedValue(new Error('Connection failed'));
      // Should proceed without KB chunks
      mockClaudeClient.generate.mockResolvedValue('Response without KB.');
      mockResponsesCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      // Act
      const result = await service.generateResponse(opportunityId, accountId, profileId);

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.kbChunksUsed).toBe(0);
    });
  });

  describe('getResponses()', () => {
    it('should return all responses for an opportunity', async () => {
      // Arrange
      const opportunityId = new ObjectId();
      const accountId = new ObjectId();
      const responses = [
        createMockResponse(opportunityId, accountId, { version: 1, status: 'dismissed' }),
        createMockResponse(opportunityId, accountId, { version: 2, status: 'draft' })
      ];

      mockResponsesCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(responses)
        })
      });

      // Act
      const result = await service.getResponses(opportunityId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(1);
      expect(result[1].version).toBe(2);
      expect(mockResponsesCollection.find).toHaveBeenCalledWith({
        opportunityId
      });
    });

    it('should return empty array when no responses found', async () => {
      // Arrange
      const opportunityId = new ObjectId();

      mockResponsesCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([])
        })
      });

      // Act
      const result = await service.getResponses(opportunityId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('updateResponse()', () => {
    it('should update response text for draft', async () => {
      // Arrange
      const responseId = new ObjectId();
      const newText = 'Updated response text';
      const existingResponse = createMockResponse(new ObjectId(), new ObjectId(), {
        _id: responseId,
        status: 'draft'
      });

      mockResponsesCollection.findOne.mockResolvedValue(existingResponse);
      mockResponsesCollection.updateOne.mockResolvedValue({
        modifiedCount: 1
      });

      // Act
      await service.updateResponse(responseId, { text: newText });

      // Assert
      expect(mockResponsesCollection.updateOne).toHaveBeenCalledWith(
        { _id: responseId },
        expect.objectContaining({
          $set: expect.objectContaining({
            text: newText
          })
        })
      );
    });

    it('should throw error when updating non-draft response', async () => {
      // Arrange
      const responseId = new ObjectId();
      const existingResponse = createMockResponse(new ObjectId(), new ObjectId(), {
        _id: responseId,
        status: 'posted'
      });

      mockResponsesCollection.findOne.mockResolvedValue(existingResponse);

      // Act & Assert
      await expect(
        service.updateResponse(responseId, { text: 'New text' })
      ).rejects.toThrow(/Cannot update.*posted/);
    });

    it('should throw error when response not found', async () => {
      // Arrange
      const responseId = new ObjectId();

      mockResponsesCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateResponse(responseId, { text: 'New text' })
      ).rejects.toThrow('Response not found');
    });
  });

  describe('dismissResponse()', () => {
    it('should dismiss draft response', async () => {
      // Arrange
      const responseId = new ObjectId();
      const existingResponse = createMockResponse(new ObjectId(), new ObjectId(), {
        _id: responseId,
        status: 'draft'
      });

      mockResponsesCollection.findOne.mockResolvedValue(existingResponse);
      mockResponsesCollection.updateOne.mockResolvedValue({
        modifiedCount: 1
      });

      // Act
      await service.dismissResponse(responseId);

      // Assert
      expect(mockResponsesCollection.updateOne).toHaveBeenCalledWith(
        { _id: responseId },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'dismissed',
            dismissedAt: expect.any(Date)
          })
        })
      );
    });

    it('should throw error when dismissing non-draft response', async () => {
      // Arrange
      const responseId = new ObjectId();
      const existingResponse = createMockResponse(new ObjectId(), new ObjectId(), {
        _id: responseId,
        status: 'posted'
      });

      mockResponsesCollection.findOne.mockResolvedValue(existingResponse);

      // Act & Assert
      await expect(service.dismissResponse(responseId)).rejects.toThrow(
        /Cannot dismiss.*posted/
      );
    });

    it('should throw error when response not found', async () => {
      // Arrange
      const responseId = new ObjectId();

      mockResponsesCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.dismissResponse(responseId)).rejects.toThrow(
        'Response not found'
      );
    });
  });

  describe('postResponse()', () => {
    it('should post draft response and update opportunity status', async () => {
      // Arrange
      const responseId = new ObjectId();
      const opportunityId = new ObjectId();
      const existingResponse = createMockResponse(opportunityId, new ObjectId(), {
        _id: responseId,
        status: 'draft'
      });

      mockResponsesCollection.findOne.mockResolvedValue(existingResponse);
      mockResponsesCollection.updateOne.mockResolvedValue({
        modifiedCount: 1
      });
      mockOpportunitiesCollection.updateOne.mockResolvedValue({
        modifiedCount: 1
      });

      // Act
      await service.postResponse(responseId);

      // Assert
      expect(mockResponsesCollection.updateOne).toHaveBeenCalledWith(
        { _id: responseId },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'posted',
            postedAt: expect.any(Date)
          })
        })
      );
      expect(mockOpportunitiesCollection.updateOne).toHaveBeenCalledWith(
        { _id: opportunityId },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'responded'
          })
        })
      );
    });

    it('should throw error when posting non-draft response', async () => {
      // Arrange
      const responseId = new ObjectId();
      const existingResponse = createMockResponse(new ObjectId(), new ObjectId(), {
        _id: responseId,
        status: 'dismissed'
      });

      mockResponsesCollection.findOne.mockResolvedValue(existingResponse);

      // Act & Assert
      await expect(service.postResponse(responseId)).rejects.toThrow(
        /Cannot post.*dismissed/
      );
    });

    it('should throw error when response not found', async () => {
      // Arrange
      const responseId = new ObjectId();

      mockResponsesCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.postResponse(responseId)).rejects.toThrow(
        'Response not found'
      );
    });
  });
});

