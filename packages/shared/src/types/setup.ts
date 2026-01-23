/**
 * Setup Wizard Types
 * 
 * Types for the containerized CLI setup wizard that collects and validates
 * credentials before production services start.
 * 
 * Note: These types are only used once Docker is running. Pre-Docker steps
 * (Docker installation, daemon check) are handled by platform-specific shell scripts.
 * 
 * @see ADR-011: Installation and Setup Architecture
 * @see Design Doc: .agents/artifacts/designer/designs/installation-setup-design.md
 */

import type { Platform } from './account.js';

// ============================================================================
// Platform Credentials Abstraction
// ============================================================================

/**
 * Base interface for platform credentials.
 * Each social platform extends this with platform-specific fields.
 * 
 * Credentials are collected during setup and written to .env file.
 * They are NOT stored in MongoDB (see ADR-002).
 */
export interface BasePlatformCredentials {
  /** Platform identifier */
  platform: Platform;
  
  /** Platform-specific handle/username (non-sensitive, also stored in Account) */
  handle: string;
}

/**
 * Bluesky-specific credentials.
 * Uses app passwords for API access (not main account password).
 * 
 * @see https://bsky.app/settings/app-passwords
 */
export interface BlueskyCredentials extends BasePlatformCredentials {
  platform: 'bluesky';
  
  /**
   * Bluesky handle in format "@user.bsky.social"
   * Format validation: ^@[\w\-\.]+\.bsky\.social$
   */
  handle: string;
  
  /**
   * App password (not main account password)
   * Format: "xxxx-xxxx-xxxx-xxxx" (19 chars with hyphens)
   * 
   * Security: Hidden input in wizard, written to .env as BLUESKY_APP_PASSWORD
   */
  appPassword: string;
}

/**
 * Union type for all platform credentials.
 * Discriminated by `platform` field.
 */
export type PlatformCredentials = 
  | BlueskyCredentials;

// ============================================================================
// AI Provider Credentials
// ============================================================================

/**
 * AI provider identifier.
 * v0.1: Only 'anthropic' (Claude)
 * Future: May add 'openai', 'google', etc.
 */
export type AIProvider = 'anthropic';

/**
 * Base interface for AI provider credentials.
 */
export interface BaseAICredentials {
  /** AI provider identifier */
  provider: AIProvider;
}

/**
 * Anthropic (Claude) API credentials.
 */
export interface AnthropicCredentials extends BaseAICredentials {
  provider: 'anthropic';
  
  /**
   * Anthropic API key
   * Format validation: starts with "sk-ant-"
   * 
   * Security: Hidden input in wizard, written to .env as ANTHROPIC_API_KEY
   */
  apiKey: string;
}

/**
 * Union type for AI provider credentials.
 * Currently only Anthropic, extensible for future providers.
 */
export type AICredentials = AnthropicCredentials;

// ============================================================================
// Credential Validation
// ============================================================================

/**
 * Result of credential validation.
 * Used by setup wizard to provide feedback.
 */
export interface CredentialValidationResult {
  /** Whether validation succeeded */
  valid: boolean;
  
  /** Error message if validation failed */
  error?: string;
  
  /** Specific error code for programmatic handling */
  errorCode?: CredentialValidationErrorCode;
  
  /** Help URL for troubleshooting */
  helpUrl?: string;
}

/**
 * Error codes for credential validation failures.
 * Enables specific error handling and user guidance.
 */
export type CredentialValidationErrorCode =
  | 'INVALID_FORMAT'        // Credential format doesn't match expected pattern
  | 'CONNECTION_FAILED'     // Could not connect to service
  | 'AUTH_FAILED'           // Authentication rejected by service
  | 'RATE_LIMITED'          // Too many validation attempts
  | 'NETWORK_ERROR'         // Network connectivity issue
  | 'TIMEOUT'               // Connection timed out
  | 'UNKNOWN';              // Unexpected error

// ============================================================================
// Setup Wizard Configuration
// ============================================================================

/**
 * Complete setup configuration collected by wizard.
 * Written to .env file after validation.
 */
export interface SetupConfiguration {
  /** Platform credentials (v0.1: only Bluesky) */
  platformCredentials: PlatformCredentials[];
  
  /** AI provider credentials (v0.1: only Anthropic) */
  aiCredentials: AICredentials;
  
  /** Timestamp when setup completed */
  completedAt: Date;
}

/**
 * Setup wizard step identifier.
 * Ordered sequence of wizard screens.
 */
export type SetupWizardStep =
  | 'welcome'
  | 'platform_credentials'
  | 'ai_credentials'
  | 'validation'
  | 'complete';

/**
 * Current state of setup wizard.
 * Used for progress tracking and resumption.
 */
export interface SetupWizardState {
  /** Current step in wizard */
  currentStep: SetupWizardStep;
  
  /** Platform credentials collected so far (may be partial) */
  platformCredentials: Partial<PlatformCredentials>[];
  
  /** AI credentials collected so far (may be partial) */
  aiCredentials: Partial<AICredentials> | null;
  
  /** Validation errors from current step */
  validationErrors: CredentialValidationResult[];
}

// ============================================================================
// Environment File Types
// ============================================================================

/**
 * Environment variable names for credentials.
 * Used when generating .env file content.
 */
export type EnvVariableName =
  // Bluesky
  | 'BLUESKY_HANDLE'
  | 'BLUESKY_APP_PASSWORD'
  // LinkedIn (v0.2+)
  | 'LINKEDIN_HANDLE'
  | 'LINKEDIN_ACCESS_TOKEN'
  // Reddit (v0.2+)
  | 'REDDIT_HANDLE'
  | 'REDDIT_CLIENT_ID'
  | 'REDDIT_CLIENT_SECRET'
  // AI Providers
  | 'ANTHROPIC_API_KEY';

/**
 * Mapping of platform to environment variable names.
 * Used by setup wizard to generate .env file.
 */
export const PLATFORM_ENV_VARS: Record<Platform, EnvVariableName[]> = {
  bluesky: ['BLUESKY_HANDLE', 'BLUESKY_APP_PASSWORD'],
  linkedin: ['LINKEDIN_HANDLE', 'LINKEDIN_ACCESS_TOKEN'],
  reddit: ['REDDIT_HANDLE', 'REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
};

/**
 * Mapping of AI provider to environment variable names.
 */
export const AI_PROVIDER_ENV_VARS: Record<AIProvider, EnvVariableName[]> = {
  anthropic: ['ANTHROPIC_API_KEY'],
};

// ============================================================================
// Validation Patterns
// ============================================================================

/**
 * Regex patterns for credential format validation.
 * Used before making API calls to validate format.
 */
export const CREDENTIAL_PATTERNS = {
  /** Bluesky handle: @user.bsky.social */
  blueskyHandle: /^@[\w\-.]+\.bsky\.social$/,
  
  /** Bluesky app password: xxxx-xxxx-xxxx-xxxx (19 chars) */
  blueskyAppPassword: /^[\w]{4}-[\w]{4}-[\w]{4}-[\w]{4}$/,
  
  /** Anthropic API key: starts with sk-ant- */
  anthropicApiKey: /^sk-ant-/,
} as const;

/**
 * Help URLs for credential setup.
 * Shown in wizard when user needs guidance.
 */
export const CREDENTIAL_HELP_URLS = {
  blueskyAppPassword: 'https://bsky.app/settings/app-passwords',
  blueskyAccount: 'https://bsky.app',
  anthropicApiKey: 'https://console.anthropic.com',
} as const;
