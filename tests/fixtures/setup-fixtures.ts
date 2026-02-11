/**
 * Setup Wizard Test Fixtures
 * 
 * Test data for installation and setup wizard testing.
 * @see ADR-011: Installation and Setup Architecture
 * @see ADR-021: Installation Clipboard Experience
 */

import type {
  BlueskyCredentials,
  AnthropicCredentials,
  CredentialValidationResult,
  SetupConfiguration,
} from '@ngaj/shared';

// ============================================================================
// Valid Credentials
// ============================================================================

/**
 * Valid Bluesky credentials for happy path testing
 */
export const validBlueskyCredentials: BlueskyCredentials = {
  platform: 'bluesky',
  handle: '@testuser.bsky.social',
  appPassword: 'xxxx-xxxx-xxxx-xxxx',
};

/**
 * Alternative valid Bluesky handles
 */
export const validBlueskyHandles = [
  '@user.bsky.social',
  '@user-name.bsky.social',
  '@user_name.bsky.social',
  '@user123.bsky.social',
  '@User.Name.bsky.social',
];

/**
 * Valid app password formats
 */
export const validAppPasswords = [
  'xxxx-xxxx-xxxx-xxxx',
  'abcd-1234-efgh-5678',
  'ABCD-1234-EFGH-5678',
];

/**
 * Valid Anthropic credentials for happy path testing
 */
export const validAnthropicCredentials: AnthropicCredentials = {
  provider: 'anthropic',
  apiKey: 'sk-ant-api03-test-key-12345',
};

/**
 * Valid Anthropic API key formats
 */
export const validAnthropicApiKeys = [
  'sk-ant-api03-xxxxxxxxxxxxx',
  'sk-ant-test-key',
  'sk-ant-12345-abcde',
];

// ============================================================================
// Invalid Credentials
// ============================================================================

/**
 * Invalid Bluesky handle formats for validation testing
 */
export const invalidBlueskyHandles = {
  missingAt: 'user.bsky.social',
  missingDomain: '@user',
  wrongDomain: '@user.twitter.com',
  wrongBskyDomain: '@user.bsky.app',
  empty: '',
  onlyAt: '@',
  spaces: '@user name.bsky.social',
  invalid: 'not-a-handle',
};

/**
 * Invalid app password formats
 */
export const invalidAppPasswords = {
  tooShort: 'xxxx-xxxx',
  noHyphens: 'xxxxxxxxxxxxxxxx',
  wrongFormat: 'xxx-xxx-xxx-xxx',
  tooLong: 'xxxx-xxxx-xxxx-xxxx-xxxx',
  empty: '',
  spaces: 'xxxx xxxx xxxx xxxx',
};

/**
 * Invalid Anthropic API key formats
 */
export const invalidAnthropicApiKeys = {
  wrongPrefix: 'sk-openai-12345',
  noPrefix: 'api-key-12345',
  empty: '',
  spaces: 'sk-ant-test key',
  randomString: 'invalid-api-key',
};

// ============================================================================
// Validation Results
// ============================================================================

/**
 * Successful validation result
 */
export const successValidationResult: CredentialValidationResult = {
  valid: true,
};

/**
 * Auth failed validation result
 */
export const authFailedResult: CredentialValidationResult = {
  valid: false,
  error: 'Invalid handle or app password',
  errorCode: 'AUTH_FAILED',
  helpUrl: 'https://bsky.app/settings/app-passwords',
};

/**
 * Network error validation result
 */
export const networkErrorResult: CredentialValidationResult = {
  valid: false,
  error: 'Network error. Please check your internet connection.',
  errorCode: 'NETWORK_ERROR',
};

/**
 * Format error validation result
 */
export const formatErrorResult: CredentialValidationResult = {
  valid: false,
  error: 'Invalid format',
  errorCode: 'INVALID_FORMAT',
};

/**
 * Timeout validation result
 */
export const timeoutResult: CredentialValidationResult = {
  valid: false,
  error: 'Connection timed out',
  errorCode: 'TIMEOUT',
};

/**
 * Rate limited validation result
 */
export const rateLimitedResult: CredentialValidationResult = {
  valid: false,
  error: 'Too many validation attempts. Please try again later.',
  errorCode: 'RATE_LIMITED',
};

// ============================================================================
// Setup Configuration
// ============================================================================

/**
 * Complete valid setup configuration
 */
export const validSetupConfiguration: SetupConfiguration = {
  platformCredentials: [validBlueskyCredentials],
  aiCredentials: validAnthropicCredentials,
  completedAt: new Date('2026-01-23T12:00:00Z'),
};

/**
 * Factory function to create setup configuration
 */
export const createMockSetupConfiguration = (
  overrides?: Partial<SetupConfiguration>
): SetupConfiguration => ({
  platformCredentials: [validBlueskyCredentials],
  aiCredentials: validAnthropicCredentials,
  completedAt: new Date(),
  ...overrides,
});

// ============================================================================
// Expected .env File Content
// ============================================================================

/**
 * Expected .env file content structure for validation
 */
export const expectedEnvContent = {
  blueskyHandle: 'BLUESKY_HANDLE=@testuser.bsky.social',
  blueskyPassword: 'BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx',
  anthropicKey: 'ANTHROPIC_API_KEY=sk-ant-api03-test-key-12345',
  mongodbUri: 'MONGODB_URI=mongodb://mongodb:27017/ngaj',
  chromaUrl: 'CHROMA_URL=http://chromadb:8000',
  port: 'PORT=3000',
  nodeEnv: 'NODE_ENV=production',
};

/**
 * Generate expected .env file lines for a given configuration
 */
export const generateExpectedEnvLines = (config: SetupConfiguration): string[] => {
  const lines: string[] = [
    '# ngaj Configuration',
    `# Generated by setup wizard on ${config.completedAt.toISOString()}`,
    '',
  ];

  for (const cred of config.platformCredentials) {
    if (cred.platform === 'bluesky') {
      lines.push('# Bluesky Credentials');
      lines.push(`BLUESKY_HANDLE=${cred.handle}`);
      lines.push(`BLUESKY_APP_PASSWORD=${cred.appPassword}`);
      lines.push('');
    }
  }

  if (config.aiCredentials.provider === 'anthropic') {
    lines.push('# Anthropic (Claude) API');
    lines.push(`ANTHROPIC_API_KEY=${config.aiCredentials.apiKey}`);
    lines.push('');
  }

  lines.push('# Database Configuration');
  lines.push('MONGODB_URI=mongodb://mongodb:27017/ngaj');
  lines.push('CHROMA_URL=http://chromadb:8000');
  lines.push('');
  lines.push('# Application Settings');
  lines.push('PORT=3000');
  lines.push('NODE_ENV=production');

  return lines;
};

// ============================================================================
// Paste Instructions Fixtures (ADR-021)
// ============================================================================

/**
 * Expected paste instructions output patterns
 */
export const pasteInstructionsPatterns = {
  /** Tip emoji and header */
  header: '📋 Tip: To paste in this terminal:',
  /** Windows Terminal instruction */
  windowsTerminal: 'Windows Terminal',
  /** PowerShell instruction */
  powershell: 'PowerShell',
  /** Right-click instruction */
  rightClick: 'Right-click',
  /** Ctrl+Shift+V instruction */
  ctrlShiftV: 'Ctrl+Shift+V',
  /** Bullet point */
  bullet: '•',
};

/**
 * Expected full paste instructions output
 */
export const expectedPasteInstructionsOutput = `
📋 Tip: To paste in this terminal:
   • Windows Terminal: Right-click or Ctrl+Shift+V
   • PowerShell: Right-click
`;
