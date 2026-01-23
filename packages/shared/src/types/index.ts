/**
 * Central export point for all ngaj TypeScript types.
 * 
 * @module types
 */

// Profile types
export type {
  Profile,
  VoiceConfig,
  DiscoveryConfig,
  CreateProfileInput,
  UpdateProfileInput,
} from './profile.js';
export { isProfile } from './profile.js';

// Account types
export type {
  Platform,
  AccountStatus,
  Account,
  AccountDiscoveryConfig,
  DiscoveryTypeSchedule,
  DiscoveryType,
  CreateAccountInput,
  UpdateAccountInput,
  AccountWithProfile,
} from './account.js';
export { isAccount } from './account.js';

// Knowledge Base types
export type {
  KnowledgeDocument,
  KnowledgeDocumentProcessingMetadata,
  DocumentChunk,
  DocumentChunkMetadata,
  KnowledgeQueryResult,
  TextChunk,
  FileUpload,
  ProcessingOptions,
  KnowledgeBaseConfig,
} from './knowledge-base.js';
export {
  ValidationError,
  StorageLimitError,
  ProcessingError,
  TimeoutError,
  ExtractionError,
  EmbeddingError,
  DeletionError,
  NotFoundError,
} from './knowledge-base.js';

// Opportunity types
export type {
  Opportunity,
  OpportunityScore,
  OpportunityStatus,
  OpportunityWithAuthor,
  OpportunityFilters,
  Author,
  RawPost,
  RawAuthor,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  UpsertAuthorInput,
} from './opportunity.js';
export { isOpportunity, isAuthor } from './opportunity.js';

// Response types
export type {
  Response,
  ResponseStatus,
  ResponseMetadata,
  OpportunityAnalysis,
  PlatformConstraints,
  CreateResponseInput,
  UpdateResponseInput,
} from './response.js';
export { isResponse, isOpportunityAnalysis } from './response.js';

// Setup types (CLI credential wizard)
export type {
  BasePlatformCredentials,
  BlueskyCredentials,
  PlatformCredentials,
  AIProvider,
  BaseAICredentials,
  AnthropicCredentials,
  AICredentials,
  CredentialValidationResult,
  CredentialValidationErrorCode,
  SetupConfiguration,
  SetupWizardStep,
  SetupWizardState,
  EnvVariableName,
} from './setup.js';
export {
  PLATFORM_ENV_VARS,
  AI_PROVIDER_ENV_VARS,
  CREDENTIAL_PATTERNS,
  CREDENTIAL_HELP_URLS,
} from './setup.js';

// Wizard types (first-launch web UI)
export type {
  WizardStep,
  WizardState,
  WizardProfileInput,
  TestConnectionInput,
  TestConnectionResult,
  WizardAccountInput,
  DiscoverySchedulePreset,
  WizardDiscoveryInput,
} from './wizard.js';
export {
  SCHEDULE_PRESET_CRON,
  SCHEDULE_PRESET_LABELS,
  DEFAULT_SCHEDULE_PRESET,
  WIZARD_VALIDATION,
} from './wizard.js';
