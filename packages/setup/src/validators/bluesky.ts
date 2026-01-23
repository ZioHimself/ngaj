/**
 * Bluesky credential validation
 */

import { BskyAgent } from '@atproto/api';
import type { CredentialValidationResult } from '@ngaj/shared';
import { CREDENTIAL_HELP_URLS } from '@ngaj/shared';

/**
 * Validate Bluesky credentials by attempting to create a session
 */
export async function validateBlueskyConnection(
  handle: string,
  appPassword: string
): Promise<CredentialValidationResult> {
  try {
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    
    // Remove @ prefix if present for API call
    const identifier = handle.startsWith('@') ? handle.slice(1) : handle;
    
    await agent.login({
      identifier,
      password: appPassword,
    });

    return { valid: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid identifier or password')) {
        return {
          valid: false,
          error: 'Invalid handle or app password',
          errorCode: 'AUTH_FAILED',
          helpUrl: CREDENTIAL_HELP_URLS.blueskyAppPassword,
        };
      }
      if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
        return {
          valid: false,
          error: 'Network error. Please check your internet connection.',
          errorCode: 'NETWORK_ERROR',
        };
      }
    }
    return {
      valid: false,
      error: 'Failed to connect to Bluesky. Please try again.',
      errorCode: 'UNKNOWN',
      helpUrl: CREDENTIAL_HELP_URLS.blueskyAccount,
    };
  }
}
