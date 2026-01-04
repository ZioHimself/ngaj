import type { PlatformConstraints } from '@/shared/types/response';

/**
 * Result of constraint validation
 */
export interface ConstraintValidationResult {
  /**
   * Whether the response passes all constraints
   */
  valid: boolean;

  /**
   * Which constraint was violated (if any)
   */
  violation?: 'maxLength';

  /**
   * Actual value that violated the constraint
   */
  actual?: number;

  /**
   * Limit that was violated
   */
  limit?: number;
}

/**
 * Validate generated response against platform constraints.
 * 
 * v0.1: Only validates maxLength constraint.
 * Future: Add minLength, bannedTerms, etc.
 * 
 * @param responseText - Generated response text to validate
 * @param constraints - Platform-specific constraints
 * @returns Validation result with details
 * 
 * @see ADR-009: Response Suggestion Architecture
 */
export function validateConstraints(
  responseText: string,
  constraints: PlatformConstraints
): ConstraintValidationResult {
  throw new Error('Not implemented');
}

