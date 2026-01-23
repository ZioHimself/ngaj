/**
 * Wizard Validation Utilities
 *
 * Validation functions for wizard input types and schedule transformation.
 *
 * @see ADR-012: First-Launch Setup Wizard
 */

import type {
  WizardProfileInput,
  TestConnectionInput,
  DiscoverySchedulePreset,
} from '@ngaj/shared';

// Re-export these for use in tests that import from this module
export { WIZARD_VALIDATION, SCHEDULE_PRESET_CRON } from '@ngaj/shared';

/**
 * Validation result with errors array.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate WizardProfileInput for Step 1.
 */
export function validateWizardProfileInput(
  _input: WizardProfileInput
): ValidationResult {
  throw new Error('Not implemented');
}

/**
 * Validate TestConnectionInput for Step 2.
 */
export function validateTestConnectionInput(
  _input: TestConnectionInput
): ValidationResult {
  throw new Error('Not implemented');
}

/**
 * Convert schedule preset to cron expression.
 */
export function presetToCron(_preset: DiscoverySchedulePreset): string {
  throw new Error('Not implemented');
}
