/**
 * Anthropic (Claude) credential validation
 */

import Anthropic from '@anthropic-ai/sdk';
import type { CredentialValidationResult } from '@ngaj/shared';
import { CREDENTIAL_HELP_URLS } from '@ngaj/shared';

/**
 * Validate Anthropic API key by making a minimal API call
 */
export async function validateAnthropicConnection(
  apiKey: string
): Promise<CredentialValidationResult> {
  try {
    const client = new Anthropic({ apiKey });
    
    // Make a minimal API call to verify the key works
    // Using messages.create with a tiny prompt to minimize cost
    await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    });

    return { valid: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('invalid_api_key')) {
        return {
          valid: false,
          error: 'Invalid API key',
          errorCode: 'AUTH_FAILED',
          helpUrl: CREDENTIAL_HELP_URLS.anthropicApiKey,
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
      error: 'Failed to connect to Anthropic. Please try again.',
      errorCode: 'UNKNOWN',
      helpUrl: CREDENTIAL_HELP_URLS.anthropicApiKey,
    };
  }
}
