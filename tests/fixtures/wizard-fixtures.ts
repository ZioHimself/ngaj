/**
 * First-Launch Wizard Test Fixtures
 *
 * Factory functions and fixture data for wizard tests.
 *
 * @see ADR-012: First-Launch Setup Wizard
 * @see Design Doc: .agents/artifacts/designer/designs/first-launch-wizard-design.md
 */

import type {
  WizardProfileInput,
  WizardAccountInput,
  WizardDiscoveryInput,
  TestConnectionInput,
  TestConnectionResult,
  DiscoverySchedulePreset,
  WizardState,
} from '@ngaj/shared';

// ============================================================================
// WizardProfileInput Fixtures
// ============================================================================

/**
 * Factory function to create valid WizardProfileInput
 */
export const createMockWizardProfileInput = (
  overrides?: Partial<WizardProfileInput>
): WizardProfileInput => ({
  name: 'Test Professional Persona',
  voice:
    'Professional but friendly. Technical but accessible. Conversational, not stuffy.',
  principles:
    'I value evidence-based reasoning, clear communication, and kindness. I prioritize adding value over self-promotion.',
  interests: ['ai', 'typescript', 'distributed systems', 'developer tools'],
  ...overrides,
});

/**
 * Pre-configured wizard profile inputs for common scenarios
 */
export const wizardProfileInputFixtures = {
  /** Standard valid input */
  valid: createMockWizardProfileInput(),

  /** Minimum valid lengths */
  minimalValid: createMockWizardProfileInput({
    name: 'ABC', // 3 chars (minimum)
    voice: 'Short tone', // 10 chars (minimum)
    principles: 'Core value', // 10 chars (minimum)
    interests: [],
  }),

  /** Maximum valid lengths */
  maximalValid: createMockWizardProfileInput({
    name: 'X'.repeat(100), // 100 chars (maximum)
    voice: 'Y'.repeat(500), // 500 chars (maximum)
    principles: 'Z'.repeat(500), // 500 chars (maximum)
    interests: Array.from({ length: 20 }, (_, i) => `interest${i}`), // 20 tags (maximum)
  }),

  /** With maximum tag length */
  maxTagLength: createMockWizardProfileInput({
    interests: ['X'.repeat(30)], // 30 chars (maximum per tag)
  }),

  /** Empty interests (optional field) */
  noInterests: createMockWizardProfileInput({
    interests: [],
  }),
};

/**
 * Invalid wizard profile inputs for validation testing
 */
export const invalidWizardProfileInputs = {
  /** Missing name */
  missingName: {
    name: '',
    voice:
      'Professional but friendly. Technical but accessible. Conversational.',
    principles:
      'I value evidence-based reasoning, clear communication, and kindness.',
    interests: [],
  } as WizardProfileInput,

  /** Name too short (< 3 chars) */
  nameTooShort: createMockWizardProfileInput({
    name: 'AB', // 2 chars
  }),

  /** Name too long (> 100 chars) */
  nameTooLong: createMockWizardProfileInput({
    name: 'X'.repeat(101), // 101 chars
  }),

  /** Voice too short (< 10 chars) */
  voiceTooShort: createMockWizardProfileInput({
    voice: 'Short', // 5 chars
  }),

  /** Voice too long (> 500 chars) */
  voiceTooLong: createMockWizardProfileInput({
    voice: 'X'.repeat(501), // 501 chars
  }),

  /** Principles too short (< 10 chars) */
  principlesTooShort: createMockWizardProfileInput({
    principles: 'Value', // 5 chars
  }),

  /** Principles too long (> 500 chars) */
  principlesTooLong: createMockWizardProfileInput({
    principles: 'X'.repeat(501), // 501 chars
  }),

  /** Too many interests (> 20) */
  tooManyInterests: createMockWizardProfileInput({
    interests: Array.from({ length: 21 }, (_, i) => `interest${i}`), // 21 tags
  }),

  /** Interest tag too long (> 30 chars) */
  interestTooLong: createMockWizardProfileInput({
    interests: ['X'.repeat(31)], // 31 chars
  }),
};

// ============================================================================
// TestConnectionInput/Result Fixtures
// ============================================================================

/**
 * Factory function to create TestConnectionInput
 */
export const createMockTestConnectionInput = (
  overrides?: Partial<TestConnectionInput>
): TestConnectionInput => ({
  platform: 'bluesky',
  ...overrides,
});

/**
 * Factory function to create TestConnectionResult
 */
export const createMockTestConnectionResult = (
  overrides?: Partial<TestConnectionResult>
): TestConnectionResult => ({
  success: true,
  handle: '@test.bsky.social',
  ...overrides,
});

/**
 * Pre-configured connection test results
 */
export const connectionTestResults = {
  /** Successful connection */
  success: createMockTestConnectionResult({
    success: true,
    handle: '@user.bsky.social',
    error: undefined,
  }),

  /** Failed connection - invalid credentials */
  invalidCredentials: createMockTestConnectionResult({
    success: false,
    handle: '',
    error: 'Authentication failed. Check credentials in .env.',
  }),

  /** Failed connection - network error */
  networkError: createMockTestConnectionResult({
    success: false,
    handle: '',
    error: 'Network error. Check your connection.',
  }),

  /** Failed connection - missing credentials */
  missingCredentials: createMockTestConnectionResult({
    success: false,
    handle: '',
    error: 'Bluesky credentials not configured in .env.',
  }),
};

// ============================================================================
// WizardAccountInput Fixtures
// ============================================================================

/**
 * Factory function to create WizardAccountInput
 */
export const createMockWizardAccountInput = (
  profileId: string,
  overrides?: Partial<WizardAccountInput>
): WizardAccountInput => ({
  profileId,
  platform: 'bluesky',
  ...overrides,
});

// ============================================================================
// WizardDiscoveryInput Fixtures
// ============================================================================

/**
 * Factory function to create WizardDiscoveryInput
 */
export const createMockWizardDiscoveryInput = (
  overrides?: Partial<WizardDiscoveryInput>
): WizardDiscoveryInput => ({
  schedulePreset: '1hr',
  ...overrides,
});

/**
 * All schedule presets for iteration testing
 */
export const schedulePresets: DiscoverySchedulePreset[] = [
  '15min',
  '30min',
  '1hr',
  '2hr',
  '4hr',
];

/**
 * Expected cron expressions for each preset
 */
export const expectedCronExpressions: Record<DiscoverySchedulePreset, string> =
  {
    '15min': '*/15 * * * *',
    '30min': '*/30 * * * *',
    '1hr': '0 * * * *',
    '2hr': '0 */2 * * *',
    '4hr': '0 */4 * * *',
  };

// ============================================================================
// WizardState Fixtures
// ============================================================================

/**
 * Factory function to create WizardState
 */
export const createMockWizardState = (
  overrides?: Partial<WizardState>
): WizardState => ({
  currentStep: 1,
  profileId: undefined,
  accountId: undefined,
  connectionTested: false,
  ...overrides,
});

/**
 * Pre-configured wizard states for different scenarios
 */
export const wizardStateFixtures = {
  /** Initial state (Step 1, nothing completed) */
  initial: createMockWizardState({
    currentStep: 1,
    profileId: undefined,
    accountId: undefined,
    connectionTested: false,
  }),

  /** After Step 1 (Profile created) */
  afterStep1: createMockWizardState({
    currentStep: 2,
    profileId: 'profile-123',
    accountId: undefined,
    connectionTested: false,
  }),

  /** Step 2 with connection tested */
  step2Connected: createMockWizardState({
    currentStep: 2,
    profileId: 'profile-123',
    accountId: undefined,
    connectionTested: true,
  }),

  /** After Step 2 (Account created) */
  afterStep2: createMockWizardState({
    currentStep: 3,
    profileId: 'profile-123',
    accountId: 'account-456',
    connectionTested: true,
  }),

  /** Complete (all steps done) */
  complete: createMockWizardState({
    currentStep: 3,
    profileId: 'profile-123',
    accountId: 'account-456',
    connectionTested: true,
  }),
};

// ============================================================================
// Environment Variable Fixtures
// ============================================================================

/**
 * Mock environment variables for connection tests
 */
export const mockEnvVariables = {
  /** Valid Bluesky credentials */
  valid: {
    BLUESKY_HANDLE: 'test.bsky.social',
    BLUESKY_APP_PASSWORD: 'test-app-password-1234',
  },

  /** Missing handle */
  missingHandle: {
    BLUESKY_HANDLE: undefined,
    BLUESKY_APP_PASSWORD: 'test-app-password-1234',
  },

  /** Missing password */
  missingPassword: {
    BLUESKY_HANDLE: 'test.bsky.social',
    BLUESKY_APP_PASSWORD: undefined,
  },

  /** Both missing */
  bothMissing: {
    BLUESKY_HANDLE: undefined,
    BLUESKY_APP_PASSWORD: undefined,
  },
};
