/**
 * Wizard Validation Unit Tests
 *
 * Tests for WizardProfileInput and TestConnectionInput validation functions.
 *
 * @see ADR-012: First-Launch Setup Wizard
 */

import { describe, it, expect } from 'vitest';
import {
  validateWizardProfileInput,
  validateTestConnectionInput,
} from '@ngaj/backend/utils/wizard-validation';
import {
  createMockWizardProfileInput,
  wizardProfileInputFixtures,
  invalidWizardProfileInputs,
  createMockTestConnectionInput,
} from '@tests/fixtures/wizard-fixtures';
import { WIZARD_VALIDATION } from '@ngaj/shared';

describe('Wizard Validation', () => {
  describe('validateWizardProfileInput()', () => {
    describe('valid inputs', () => {
      it('should accept valid profile input with all fields', () => {
        // Arrange
        const input = wizardProfileInputFixtures.valid;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should accept minimal valid input (minimum lengths)', () => {
        // Arrange
        const input = wizardProfileInputFixtures.minimalValid;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should accept maximal valid input (maximum lengths)', () => {
        // Arrange
        const input = wizardProfileInputFixtures.maximalValid;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should accept empty interests array (optional field)', () => {
        // Arrange
        const input = wizardProfileInputFixtures.noInterests;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should accept interests at maximum tag length', () => {
        // Arrange
        const input = wizardProfileInputFixtures.maxTagLength;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    describe('name validation', () => {
      it('should reject empty name', () => {
        // Arrange
        const input = invalidWizardProfileInputs.missingName;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Profile name is required');
      });

      it('should reject name shorter than minimum length', () => {
        // Arrange
        const input = invalidWizardProfileInputs.nameTooShort;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Profile name must be at least ${WIZARD_VALIDATION.name.min} characters`
        );
      });

      it('should reject name longer than maximum length', () => {
        // Arrange
        const input = invalidWizardProfileInputs.nameTooLong;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Profile name must not exceed ${WIZARD_VALIDATION.name.max} characters`
        );
      });
    });

    describe('voice validation', () => {
      it('should reject voice shorter than minimum length', () => {
        // Arrange
        const input = invalidWizardProfileInputs.voiceTooShort;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Voice must be at least ${WIZARD_VALIDATION.voice.min} characters`
        );
      });

      it('should reject voice longer than maximum length', () => {
        // Arrange
        const input = invalidWizardProfileInputs.voiceTooLong;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Voice must not exceed ${WIZARD_VALIDATION.voice.max} characters`
        );
      });
    });

    describe('principles validation', () => {
      it('should reject principles shorter than minimum length', () => {
        // Arrange
        const input = invalidWizardProfileInputs.principlesTooShort;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Principles must be at least ${WIZARD_VALIDATION.principles.min} characters`
        );
      });

      it('should reject principles longer than maximum length', () => {
        // Arrange
        const input = invalidWizardProfileInputs.principlesTooLong;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Principles must not exceed ${WIZARD_VALIDATION.principles.max} characters`
        );
      });
    });

    describe('interests validation', () => {
      it('should reject more interests than maximum allowed', () => {
        // Arrange
        const input = invalidWizardProfileInputs.tooManyInterests;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Maximum ${WIZARD_VALIDATION.interests.maxTags} interests allowed`
        );
      });

      it('should reject interest tag longer than maximum length', () => {
        // Arrange
        const input = invalidWizardProfileInputs.interestTooLong;

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Each interest must not exceed ${WIZARD_VALIDATION.interests.maxTagLength} characters`
        );
      });
    });

    describe('multiple validation errors', () => {
      it('should return all validation errors at once', () => {
        // Arrange
        const input = createMockWizardProfileInput({
          name: 'AB', // Too short
          voice: 'Short', // Too short
          principles: 'X', // Too short
          interests: Array.from({ length: 25 }, (_, i) => `interest${i}`), // Too many
        });

        // Act
        const result = validateWizardProfileInput(input);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });
  });

  describe('validateTestConnectionInput()', () => {
    it('should accept valid bluesky platform', () => {
      // Arrange
      const input = createMockTestConnectionInput({ platform: 'bluesky' });

      // Act
      const result = validateTestConnectionInput(input);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid platform', () => {
      // Arrange
      const input = { platform: 'twitter' as any };

      // Act
      const result = validateTestConnectionInput(input);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Platform must be bluesky');
    });

    it('should reject empty platform', () => {
      // Arrange
      const input = { platform: '' as any };

      // Act
      const result = validateTestConnectionInput(input);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Platform is required');
    });
  });
});
