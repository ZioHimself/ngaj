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
import { WIZARD_VALIDATION, SCHEDULE_PRESET_CRON } from '@ngaj/shared';

// Re-export these for use in tests that import from this module
export { WIZARD_VALIDATION, SCHEDULE_PRESET_CRON };

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
  input: WizardProfileInput
): ValidationResult {
  const errors: string[] = [];

  // Name validation
  if (!input.name || input.name.trim() === '') {
    errors.push('Profile name is required');
  } else {
    if (input.name.length < WIZARD_VALIDATION.name.min) {
      errors.push(
        `Profile name must be at least ${WIZARD_VALIDATION.name.min} characters`
      );
    }
    if (input.name.length > WIZARD_VALIDATION.name.max) {
      errors.push(
        `Profile name must not exceed ${WIZARD_VALIDATION.name.max} characters`
      );
    }
  }

  // Voice validation
  if (input.voice && input.voice.length < WIZARD_VALIDATION.voice.min) {
    errors.push(
      `Voice must be at least ${WIZARD_VALIDATION.voice.min} characters`
    );
  }
  if (input.voice && input.voice.length > WIZARD_VALIDATION.voice.max) {
    errors.push(
      `Voice must not exceed ${WIZARD_VALIDATION.voice.max} characters`
    );
  }

  // Principles validation
  if (
    input.principles &&
    input.principles.length < WIZARD_VALIDATION.principles.min
  ) {
    errors.push(
      `Principles must be at least ${WIZARD_VALIDATION.principles.min} characters`
    );
  }
  if (
    input.principles &&
    input.principles.length > WIZARD_VALIDATION.principles.max
  ) {
    errors.push(
      `Principles must not exceed ${WIZARD_VALIDATION.principles.max} characters`
    );
  }

  // Interests validation
  if (input.interests && input.interests.length > WIZARD_VALIDATION.interests.maxTags) {
    errors.push(
      `Maximum ${WIZARD_VALIDATION.interests.maxTags} interests allowed`
    );
  }
  if (input.interests) {
    for (const interest of input.interests) {
      if (interest.length > WIZARD_VALIDATION.interests.maxTagLength) {
        errors.push(
          `Each interest must not exceed ${WIZARD_VALIDATION.interests.maxTagLength} characters`
        );
        break; // Only report once
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate TestConnectionInput for Step 2.
 */
export function validateTestConnectionInput(
  input: TestConnectionInput
): ValidationResult {
  const errors: string[] = [];

  // Cast to string to handle type-unsafe input from API
  const platform = input.platform as string;

  if (!platform || platform === '') {
    errors.push('Platform is required');
  } else if (platform !== 'bluesky') {
    errors.push('Platform must be bluesky');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert schedule preset to cron expression.
 * @throws Error if preset is not a valid DiscoverySchedulePreset
 */
export function presetToCron(preset: DiscoverySchedulePreset): string {
  const cron = SCHEDULE_PRESET_CRON[preset];
  if (cron === undefined) {
    throw new Error('Invalid schedule preset');
  }
  return cron;
}
