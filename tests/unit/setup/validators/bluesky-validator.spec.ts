/**
 * Bluesky Credential Validator Tests
 * 
 * Tests for validateBlueskyConnection function that verifies
 * Bluesky credentials during setup wizard.
 * 
 * @see ADR-011: Installation and Setup Architecture
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CREDENTIAL_HELP_URLS } from '@ngaj/shared';
import {
  validBlueskyCredentials,
  validBlueskyHandles,
  validAppPasswords,
} from '@tests/fixtures/setup-fixtures';

// Create mock login function
const mockLogin = vi.fn();

// Mock @atproto/api before imports
vi.mock('@atproto/api', () => ({
  BskyAgent: class MockBskyAgent {
    login = mockLogin;
  },
}));

// Import after mock setup
import { validateBlueskyConnection } from '@ngaj/setup/validators/bluesky.js';

describe('validateBlueskyConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful validation', () => {
    it('should return valid: true for correct credentials', async () => {
      mockLogin.mockResolvedValue({ success: true });

      const result = await validateBlueskyConnection(
        validBlueskyCredentials.handle,
        validBlueskyCredentials.appPassword
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.errorCode).toBeUndefined();
    });

    it('should strip @ prefix from handle before API call', async () => {
      mockLogin.mockResolvedValue({ success: true });

      await validateBlueskyConnection('@testuser.bsky.social', 'xxxx-xxxx-xxxx-xxxx');

      expect(mockLogin).toHaveBeenCalledWith({
        identifier: 'testuser.bsky.social',
        password: 'xxxx-xxxx-xxxx-xxxx',
      });
    });

    it.each(validBlueskyHandles)('should accept valid handle format: %s', async (handle) => {
      mockLogin.mockResolvedValue({ success: true });

      const result = await validateBlueskyConnection(handle, validAppPasswords[0]);

      expect(result.valid).toBe(true);
    });
  });

  describe('authentication failures', () => {
    it('should return AUTH_FAILED for invalid password', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid identifier or password'));

      const result = await validateBlueskyConnection(
        validBlueskyCredentials.handle,
        'wrong-pass-word-1234'
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('AUTH_FAILED');
      expect(result.error).toBe('Invalid handle or app password');
      expect(result.helpUrl).toBe(CREDENTIAL_HELP_URLS.blueskyAppPassword);
    });

    it('should return AUTH_FAILED for invalid handle', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid identifier or password'));

      const result = await validateBlueskyConnection(
        '@nonexistent.bsky.social',
        validBlueskyCredentials.appPassword
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('AUTH_FAILED');
    });
  });

  describe('network errors', () => {
    it('should return NETWORK_ERROR for ENOTFOUND', async () => {
      mockLogin.mockRejectedValue(new Error('getaddrinfo ENOTFOUND bsky.social'));

      const result = await validateBlueskyConnection(
        validBlueskyCredentials.handle,
        validBlueskyCredentials.appPassword
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('NETWORK_ERROR');
      expect(result.error).toBe('Network error. Please check your internet connection.');
    });

    it('should return NETWORK_ERROR for network keyword in error', async () => {
      mockLogin.mockRejectedValue(new Error('network request failed'));

      const result = await validateBlueskyConnection(
        validBlueskyCredentials.handle,
        validBlueskyCredentials.appPassword
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('NETWORK_ERROR');
    });
  });

  describe('unknown errors', () => {
    it('should return UNKNOWN for unexpected errors', async () => {
      mockLogin.mockRejectedValue(new Error('Something unexpected happened'));

      const result = await validateBlueskyConnection(
        validBlueskyCredentials.handle,
        validBlueskyCredentials.appPassword
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('UNKNOWN');
      expect(result.error).toBe('Failed to connect to Bluesky. Please try again.');
      expect(result.helpUrl).toBe(CREDENTIAL_HELP_URLS.blueskyAccount);
    });

    it('should handle non-Error exceptions', async () => {
      mockLogin.mockRejectedValue('string error');

      const result = await validateBlueskyConnection(
        validBlueskyCredentials.handle,
        validBlueskyCredentials.appPassword
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('UNKNOWN');
    });
  });
});
