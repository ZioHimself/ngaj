import type { Db, Collection, OptionalUnlessRequiredId } from 'mongodb';
import type {
  UpdateResponseInput,
  OpportunityAnalysis,
} from '@ngaj/shared';
import type { IPlatformAdapter } from '../adapters/platform-adapter.js';
import { buildAnalysisPrompt, buildGenerationPrompt, KBChunk } from '../utils/prompt-builder.js';
import { validateConstraints } from '../utils/constraint-validator.js';
import {
  ObjectId,
  type ResponseDocument,
  type OpportunityDocument,
  type ProfileDocument,
  type CreateResponseDocumentInput,
} from '../types/documents.js';

/**
 * Interface for AI analysis/generation client (e.g., Claude)
 */
export interface IClaudeClient {
  analyze(prompt: string): Promise<OpportunityAnalysis>;
  generate(prompt: string): Promise<string>;
}

/**
 * Interface for vector database client (e.g., ChromaDB)
 */
export interface IChromaClient {
  search(params: { keywords: string[] }): Promise<KBChunk[]>;
}

/**
 * Response Suggestion Service
 * 
 * Implements AI-powered response generation using two-stage pipeline:
 * 1. Stage 1 (Analysis): Extract keywords/concepts from opportunity text
 * 2. Stage 2 (Generation): Search KB + Build prompt + Generate response
 * 
 * @see ADR-009: Response Suggestion Architecture
 */
export class ResponseSuggestionService {
  private responsesCollection: Collection<ResponseDocument>;
  private opportunitiesCollection: Collection<OpportunityDocument>;
  private profilesCollection: Collection<ProfileDocument>;

  constructor(
    db: Db,
    private claudeClient: IClaudeClient,
    private chromaClient: IChromaClient,
    private platformAdapter: IPlatformAdapter
  ) {
    this.responsesCollection = db.collection('responses');
    this.opportunitiesCollection = db.collection('opportunities');
    this.profilesCollection = db.collection('profiles');
  }

  /**
   * Generate AI-powered response suggestion for an opportunity.
   * 
   * Pipeline:
   * 1. Load opportunity and profile
   * 2. Stage 1: Analyze opportunity → Extract keywords
   * 3. Search KB using keywords
   * 4. Stage 2: Build prompt → Generate response
   * 5. Validate constraints
   * 6. Store draft response
   * 
   * @param opportunityId - Opportunity to respond to
   * @param accountId - Account generating response
   * @param profileId - Profile providing voice/principles
   * @returns Generated response (status=draft, version incremented)
   * 
   * @throws {Error} If opportunity not found
   * @throws {Error} If profile not found
   * @throws {Error} If generated response violates constraints
   * @throws {Error} If Claude API fails after retries
   */
  async generateResponse(
    opportunityId: ObjectId,
    accountId: ObjectId,
    profileId: ObjectId
  ): Promise<ResponseDocument> {
    const startTime = Date.now();

    // 1. Load opportunity and profile
    const opportunity = await this.opportunitiesCollection.findOne({
      _id: opportunityId
    }) as OpportunityDocument | null;

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    const profile = await this.profilesCollection.findOne({
      _id: profileId
    }) as ProfileDocument | null;

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Get platform constraints
    const constraints = this.platformAdapter.getConstraints();

    // Determine next version number
    const existingResponses = await this.responsesCollection
      .find({ opportunityId })
      .sort({ version: 1 })
      .toArray() || [];
    const version = existingResponses.length > 0
      ? Math.max(...existingResponses.map((r) => r.version)) + 1
      : 1;

    // 2. Stage 1: Analyze opportunity → Extract keywords
    const analysisStartTime = Date.now();
    let analysis: OpportunityAnalysis;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const analysisPrompt = buildAnalysisPrompt(opportunity.content.text);
        analysis = await this.claudeClient.analyze(analysisPrompt);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error;
        }
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
      }
    }
    const analysisTimeMs = Date.now() - analysisStartTime;

    // 3. Search KB using keywords
    let kbChunks: KBChunk[] = [];
    try {
      kbChunks = await this.chromaClient.search({
        keywords: analysis!.keywords
      });
    } catch (err) {
      // ChromaDB unavailable - proceed without KB chunks
      console.warn('ChromaDB unavailable during generation:', err);
      kbChunks = [];
    }

    // 4. Stage 2: Generate response
    const responseStartTime = Date.now();
    let generatedText: string;
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        generatedText = await this.claudeClient.generate(
          buildGenerationPrompt(
            profile,
            kbChunks,
            constraints,
            opportunity.content.text
          )
        );
        break;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
      }
    }
    const responseTimeMs = Date.now() - responseStartTime;

    // 5. Validate constraints
    const validation = validateConstraints(generatedText!, constraints);
    if (!validation.valid) {
      throw new Error(
        `Generated response (${validation.actual} chars) exceeds platform limit (${validation.limit} chars)`
      );
    }

    // 6. Store draft response
    const generationTimeMs = Date.now() - startTime;
    const now = new Date();

    const responseDoc: CreateResponseDocumentInput = {
      opportunityId,
      accountId,
      text: generatedText!,
      status: 'draft',
      generatedAt: now,
      version,
      metadata: {
        analysisKeywords: analysis!.keywords,
        mainTopic: analysis!.mainTopic,
        domain: analysis!.domain,
        question: analysis!.question,
        kbChunksUsed: kbChunks.length,
        constraints,
        model: 'claude-sonnet-4.5',
        generationTimeMs,
        analysisTimeMs,
        responseTimeMs,
        usedPrinciples: !!(profile.principles && profile.principles.length > 0),
        usedVoice: !!(profile.voice && profile.voice.style && profile.voice.style.length > 0)
      }
    };

    const result = await this.responsesCollection.insertOne({
      ...responseDoc,
      updatedAt: now
    } as OptionalUnlessRequiredId<ResponseDocument>);

    return {
      _id: result.insertedId,
      ...responseDoc,
      updatedAt: now
    };
  }

  /**
   * Get all response versions for an opportunity.
   * 
   * Returns responses sorted by version (ascending).
   * Includes draft, posted, and dismissed responses.
   * 
   * @param opportunityId - Opportunity to get responses for
   * @returns Array of responses (all versions)
   */
  async getResponses(opportunityId: ObjectId): Promise<ResponseDocument[]> {
    const responses = await this.responsesCollection
      .find({ opportunityId })
      .sort({ version: 1 })
      .toArray();

    return responses.map((doc) => ({
      ...doc,
      _id: doc._id
    }));
  }

  /**
   * Update draft response text.
   * 
   * Only draft responses can be edited.
   * Updates the text field and updatedAt timestamp.
   * 
   * @param responseId - Response to update
   * @param update - New text
   * 
   * @throws {Error} If response not found
   * @throws {Error} If response is not a draft
   */
  async updateResponse(
    responseId: ObjectId,
    update: UpdateResponseInput
  ): Promise<void> {
    const response = await this.responsesCollection.findOne({ _id: responseId });

    if (!response) {
      throw new Error('Response not found');
    }

    if (response.status !== 'draft') {
      throw new Error(`Cannot update response with status: ${response.status}`);
    }

    await this.responsesCollection.updateOne(
      { _id: responseId },
      {
        $set: {
          text: update.text,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Dismiss a draft response.
   * 
   * Sets status to 'dismissed' and records dismissedAt timestamp.
   * Does NOT delete the response (preserved for learning).
   * 
   * @param responseId - Response to dismiss
   * 
   * @throws {Error} If response not found
   * @throws {Error} If response is not a draft
   */
  async dismissResponse(responseId: ObjectId): Promise<void> {
    const response = await this.responsesCollection.findOne({ _id: responseId });

    if (!response) {
      throw new Error('Response not found');
    }

    if (response.status !== 'draft') {
      throw new Error(`Cannot dismiss response with status: ${response.status}`);
    }

    await this.responsesCollection.updateOne(
      { _id: responseId },
      {
        $set: {
          status: 'dismissed',
          dismissedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Post a draft response to the platform.
   * 
   * 1. Updates response status to 'posted'
   * 2. Records postedAt timestamp
   * 3. Updates opportunity status to 'responded'
   * 
   * @param responseId - Response to post
   * 
   * @throws {Error} If response not found
   * @throws {Error} If response is not a draft
   */
  async postResponse(responseId: ObjectId): Promise<void> {
    const response = await this.responsesCollection.findOne({ _id: responseId });

    if (!response) {
      throw new Error('Response not found');
    }

    if (response.status !== 'draft') {
      throw new Error(`Cannot post response with status: ${response.status}`);
    }

    const now = new Date();

    // Update response status
    await this.responsesCollection.updateOne(
      { _id: responseId },
      {
        $set: {
          status: 'posted',
          postedAt: now,
          updatedAt: now
        }
      }
    );

    // Update opportunity status
    await this.opportunitiesCollection.updateOne(
      { _id: response.opportunityId },
      {
        $set: {
          status: 'responded',
          updatedAt: now
        }
      }
    );
  }

}

