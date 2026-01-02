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
  CreateOpportunityInput,
  UpdateOpportunityInput,
  UpsertAuthorInput,
} from './opportunity.js';
export { isOpportunity, isAuthor } from './opportunity.js';

