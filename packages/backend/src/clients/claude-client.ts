/**
 * Claude API Client
 * 
 * Implements IClaudeClient interface for response generation service.
 * Uses Anthropic SDK for Claude API calls.
 * 
 * @see ADR-009: Response Suggestion Architecture
 */

import Anthropic from '@anthropic-ai/sdk';
import type { OpportunityAnalysis } from '@ngaj/shared';
import type { IClaudeClient } from '../services/response-suggestion-service.js';

/**
 * Claude client implementation using Anthropic SDK
 */
export class ClaudeClient implements IClaudeClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  /**
   * Analyze opportunity text to extract keywords and concepts (Stage 1)
   */
  async analyze(prompt: string): Promise<OpportunityAnalysis> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    try {
      return JSON.parse(content.text) as OpportunityAnalysis;
    } catch {
      throw new Error(`Failed to parse analysis response: ${content.text}`);
    }
  }

  /**
   * Generate response text (Stage 2)
   */
  async generate(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return content.text.trim();
  }
}
