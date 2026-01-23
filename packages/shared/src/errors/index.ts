/**
 * @ngaj/shared/errors - Custom error classes
 * 
 * Note: Some error names overlap with types/knowledge-base.ts.
 * Import directly from specific files if you need a particular variant:
 * - service-errors.ts: General service layer errors
 * - platform-posting-errors.ts: Platform posting specific errors
 * - knowledge-base.ts: Knowledge base specific errors (in types/)
 */

// Platform posting errors (no conflicts)
export * from './platform-posting-errors.js';

// Service errors - export selectively to avoid conflicts
// ValidationError and NotFoundError also exist in types/knowledge-base.ts
export {
  ConflictError,
  // Re-export with alias if both are needed in the same file
  ValidationError as ServiceValidationError,
  NotFoundError as ServiceNotFoundError,
} from './service-errors.js';
