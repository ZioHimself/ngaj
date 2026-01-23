/**
 * MongoDB Document Types
 * 
 * Instantiates shared types with MongoDB ObjectId for database operations.
 * Use these types in backend services that interact directly with MongoDB.
 * 
 * @module types/documents
 */

import { ObjectId } from 'mongodb';
import type {
  Profile,
  Account,
  Opportunity,
  Author,
  Response,
  AccountWithProfile,
  OpportunityWithAuthor,
  CreateAccountInput,
  CreateOpportunityInput,
  UpsertAuthorInput,
  CreateResponseInput,
  IdValidator,
} from '@ngaj/shared';
import {
  createProfileGuard,
  createAccountGuard,
  createOpportunityGuard,
  createAuthorGuard,
  createResponseGuard,
} from '@ngaj/shared';

// ============================================================================
// ObjectId Validator
// ============================================================================

/**
 * ObjectId validator for MongoDB documents.
 */
export const isObjectId: IdValidator<ObjectId> = (value: unknown): value is ObjectId => {
  return value instanceof ObjectId;
};

// ============================================================================
// Document Types (instantiated with ObjectId)
// ============================================================================

/**
 * Profile document stored in MongoDB.
 */
export type ProfileDocument = Profile<ObjectId>;

/**
 * Account document stored in MongoDB.
 */
export type AccountDocument = Account<ObjectId>;

/**
 * Opportunity document stored in MongoDB.
 */
export type OpportunityDocument = Opportunity<ObjectId>;

/**
 * Author document stored in MongoDB.
 */
export type AuthorDocument = Author<ObjectId>;

/**
 * Response document stored in MongoDB.
 */
export type ResponseDocument = Response<ObjectId>;

/**
 * Account with populated profile (result of $lookup).
 */
export type AccountWithProfileDocument = AccountWithProfile<ObjectId>;

/**
 * Opportunity with populated author (result of $lookup).
 */
export type OpportunityWithAuthorDocument = OpportunityWithAuthor<ObjectId>;

// ============================================================================
// Input Types for MongoDB Operations
// ============================================================================

/**
 * Input for creating an account in MongoDB.
 */
export type CreateAccountDocumentInput = CreateAccountInput<ObjectId>;

/**
 * Input for creating an opportunity in MongoDB.
 */
export type CreateOpportunityDocumentInput = CreateOpportunityInput<ObjectId>;

/**
 * Input for upserting an author in MongoDB.
 */
export type UpsertAuthorDocumentInput = UpsertAuthorInput<ObjectId>;

/**
 * Input for creating a response in MongoDB.
 */
export type CreateResponseDocumentInput = CreateResponseInput<ObjectId>;

// ============================================================================
// Type Guards for MongoDB Documents
// ============================================================================

/**
 * Type guard for ProfileDocument.
 */
export const isProfileDocument = createProfileGuard(isObjectId);

/**
 * Type guard for AccountDocument.
 */
export const isAccountDocument = createAccountGuard(isObjectId);

/**
 * Type guard for OpportunityDocument.
 */
export const isOpportunityDocument = createOpportunityGuard(isObjectId);

/**
 * Type guard for AuthorDocument.
 */
export const isAuthorDocument = createAuthorGuard(isObjectId);

/**
 * Type guard for ResponseDocument.
 */
export const isResponseDocument = createResponseGuard(isObjectId);

// ============================================================================
// Re-export ObjectId for convenience
// ============================================================================

export { ObjectId };
