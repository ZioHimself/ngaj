/**
 * Central export point for all ngaj TypeScript types.
 * 
 * @module types
 */

// Core utilities (ID types, type guard factories, API types)
export type {
  EntityId,
  IdValidator,
  TypeGuardFactory,
  PaginatedResult,
  ApiResponse,
  ApiError,
} from './core.js';
export { isStringId, isValidDate, isPlainObject } from './core.js';

// Profile types
export type {
  Profile,
  VoiceConfig,
  DiscoveryConfig,
  CreateProfileInput,
  UpdateProfileInput,
} from './profile.js';
export { isProfile, createProfileGuard } from './profile.js';

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
export { isAccount, createAccountGuard } from './account.js';

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
  OpportunitySort,
  OpportunityWithAuthor,
  OpportunityFilters,
  ListOpportunitiesQuery,
  PaginatedOpportunities,
  Author,
  RawPost,
  RawAuthor,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  UpsertAuthorInput,
} from './opportunity.js';
// Note: DiscoveryType is exported from both account.js and opportunity.js
// They are the same type; we export from account.js above
export { isOpportunity, isAuthor, createOpportunityGuard, createAuthorGuard } from './opportunity.js';

// Response types
export type {
  Response,
  ResponseStatus,
  ResponseMetadata,
  OpportunityAnalysis,
  PlatformConstraints,
  CreateResponseInput,
  UpdateResponseInput,
  ListResponsesQuery,
  GenerateResponseInput,
  ListResponsesResult,
} from './response.js';
export { isResponse, isOpportunityAnalysis, createResponseGuard } from './response.js';

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
