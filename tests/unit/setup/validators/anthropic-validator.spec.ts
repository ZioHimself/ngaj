/**
 * Anthropic Credential Validator Tests
 * 
 * Tests for validateAnthropicConnection function that verifies
 * Claude API credentials during setup wizard.
 * 
 * @see ADR-011: Installation and Setup Architecture
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CREDENTIAL_HELP_URLS } from '@ngaj/shared';
import {
  validAnthropicCredentials,
  validAnthropicApiKeys,
} from '@tests/fixtures/setup-fixtures';

// Create mock create function
const mockCreate = vi.fn();

// Mock @anthropic-ai/sdk before imports
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: mockCreate,
    };
  },
}));

// Import after mock setup
import { validateAnthropicConnection } from '@ngaj/setup/validators/anthropic.js';

describe('validateAnthropicConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful validation', () => {
    it('should return valid: true for correct API key', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        content: [{ type: 'text', text: 'Hi' }],
      });

      const result = await validateAnthropicConnection(validAnthropicCredentials.apiKey);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.errorCode).toBeUndefined();
    });

    it.each(validAnthropicApiKeys)('should accept valid API key format: %s', async (apiKey) => {
      mockCreate.mockResolvedValue({ id: 'msg_123' });

      const result = await validateAnthropicConnection(apiKey);

      expect(result.valid).toBe(true);
    });

    it('should make minimal API call to verify key', async () => {
      mockCreate.mockResolvedValue({ id: 'msg_123' });

      await validateAnthropicConnection(validAnthropicCredentials.apiKey);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      });
    });
  });

  describe('authentication failures', () => {
    it('should return AUTH_FAILED for 401 error', async () => {
      mockCreate.mockRejectedValue(new Error('401 Unauthorized'));

      const result = await validateAnthropicConnection('sk-ant-invalid-key');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('AUTH_FAILED');
      expect(result.error).toBe('Invalid API key');
      expect(result.helpUrl).toBe(CREDENTIAL_HELP_URLS.anthropicApiKey);
    });

    it('should return AUTH_FAILED for invalid_api_key error', async () => {
      mockCreate.mockRejectedValue(new Error('invalid_api_key: The API key is not valid'));

      const result = await validateAnthropicConnection('sk-ant-wrong-key');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('AUTH_FAILED');
    });
  });

  describe('network errors', () => {
    it('should return NETWORK_ERROR for ENOTFOUND', async () => {
      mockCreate.mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.anthropic.com'));

      const result = await validateAnthropicConnection(validAnthropicCredentials.apiKey);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('NETWORK_ERROR');
      expect(result.error).toBe('Network error. Please check your internet connection.');
    });

    it('should return NETWORK_ERROR for network keyword in error', async () => {
      mockCreate.mockRejectedValue(new Error('network request failed'));

      const result = await validateAnthropicConnection(validAnthropicCredentials.apiKey);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('NETWORK_ERROR');
    });
  });

  describe('unknown errors', () => {
    it('should return UNKNOWN for unexpected errors', async () => {
      mockCreate.mockRejectedValue(new Error('Something unexpected happened'));

      const result = await validateAnthropicConnection(validAnthropicCredentials.apiKey);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('UNKNOWN');
      expect(result.error).toBe('Failed to connect to Anthropic. Please try again.');
      expect(result.helpUrl).toBe(CREDENTIAL_HELP_URLS.anthropicApiKey);
    });

    it('should handle non-Error exceptions', async () => {
      mockCreate.mockRejectedValue('string error');

      const result = await validateAnthropicConnection(validAnthropicCredentials.apiKey);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('UNKNOWN');
    });
  });
});
