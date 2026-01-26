/**
 * Claude Client Unit Tests
 *
 * Tests for ClaudeClient implementation that wraps Anthropic SDK.
 *
 * @see ADR-009: Response Suggestion Architecture
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeClient } from '@ngaj/backend/clients/claude-client';
import { createMockAnalysis, mockClaudeResponses } from '../../fixtures/response-fixtures';

// Mock @anthropic-ai/sdk
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn(),
    };
  },
}));

describe('ClaudeClient', () => {
  let client: ClaudeClient;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    client = new ClaudeClient('test-api-key');
    
    // Access the mocked create function
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const instance = new Anthropic({ apiKey: 'test' });
    mockCreate = instance.messages.create as ReturnType<typeof vi.fn>;
    
    // Replace client's internal create method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).client.messages.create = mockCreate;
  });

  describe('analyze', () => {
    it('should parse valid JSON analysis response', async () => {
      const expectedAnalysis = createMockAnalysis();
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(expectedAnalysis) }],
      });

      const result = await client.analyze('Test prompt');

      expect(result).toEqual(expectedAnalysis);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: 'Test prompt' }],
      });
    });

    it('should throw on malformed JSON response', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: mockClaudeResponses.malformedAnalysis }],
      });

      await expect(client.analyze('Test prompt')).rejects.toThrow(
        /Failed to parse analysis response/
      );
    });

    it('should throw on non-text response type', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'image', source: {} }],
      });

      await expect(client.analyze('Test prompt')).rejects.toThrow(
        'Unexpected response type from Claude'
      );
    });

    it('should propagate API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(client.analyze('Test prompt')).rejects.toThrow(
        'API rate limit exceeded'
      );
    });
  });

  describe('generate', () => {
    it('should return trimmed text response', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: '  Generated response text  ' }],
      });

      const result = await client.generate('Test prompt');

      expect(result).toBe('Generated response text');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: 'Test prompt' }],
      });
    });

    it('should handle Unicode and emoji in response', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: mockClaudeResponses.withUnicode }],
      });

      const result = await client.generate('Test prompt');

      expect(result).toBe(mockClaudeResponses.withUnicode);
    });

    it('should throw on non-text response type', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'tool_use', id: 'test', name: 'test', input: {} }],
      });

      await expect(client.generate('Test prompt')).rejects.toThrow(
        'Unexpected response type from Claude'
      );
    });

    it('should propagate API errors', async () => {
      mockCreate.mockRejectedValue(new Error('Service unavailable'));

      await expect(client.generate('Test prompt')).rejects.toThrow(
        'Service unavailable'
      );
    });
  });

  describe('constructor', () => {
    it('should use default model when not specified', () => {
      const defaultClient = new ClaudeClient('test-key');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((defaultClient as any).model).toBe('claude-sonnet-4-20250514');
    });

    it('should allow custom model specification', () => {
      const customClient = new ClaudeClient('test-key', 'claude-3-haiku-20240307');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((customClient as any).model).toBe('claude-3-haiku-20240307');
    });
  });
});
