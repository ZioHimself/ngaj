/**
 * Schedule Transformation Unit Tests
 *
 * Tests for converting wizard schedule presets to cron expressions.
 *
 * @see ADR-012: First-Launch Setup Wizard
 */

import { describe, it, expect } from 'vitest';
import { presetToCron } from '@ngaj/backend/utils/wizard-validation';
import {
  schedulePresets,
  expectedCronExpressions,
} from '@tests/fixtures/wizard-fixtures';
import { SCHEDULE_PRESET_CRON, type DiscoverySchedulePreset } from '@ngaj/shared';

describe('Schedule Transformation', () => {
  describe('presetToCron()', () => {
    it('should map "15min" preset to correct cron expression', () => {
      // Arrange
      const preset: DiscoverySchedulePreset = '15min';

      // Act
      const result = presetToCron(preset);

      // Assert
      expect(result).toBe('*/15 * * * *');
      expect(result).toBe(SCHEDULE_PRESET_CRON['15min']);
    });

    it('should map "30min" preset to correct cron expression', () => {
      // Arrange
      const preset: DiscoverySchedulePreset = '30min';

      // Act
      const result = presetToCron(preset);

      // Assert
      expect(result).toBe('*/30 * * * *');
      expect(result).toBe(SCHEDULE_PRESET_CRON['30min']);
    });

    it('should map "1hr" preset to correct cron expression', () => {
      // Arrange
      const preset: DiscoverySchedulePreset = '1hr';

      // Act
      const result = presetToCron(preset);

      // Assert
      expect(result).toBe('0 * * * *');
      expect(result).toBe(SCHEDULE_PRESET_CRON['1hr']);
    });

    it('should map "2hr" preset to correct cron expression', () => {
      // Arrange
      const preset: DiscoverySchedulePreset = '2hr';

      // Act
      const result = presetToCron(preset);

      // Assert
      expect(result).toBe('0 */2 * * *');
      expect(result).toBe(SCHEDULE_PRESET_CRON['2hr']);
    });

    it('should map "4hr" preset to correct cron expression', () => {
      // Arrange
      const preset: DiscoverySchedulePreset = '4hr';

      // Act
      const result = presetToCron(preset);

      // Assert
      expect(result).toBe('0 */4 * * *');
      expect(result).toBe(SCHEDULE_PRESET_CRON['4hr']);
    });

    it('should handle all presets correctly (parameterized)', () => {
      // Test all presets match expected cron expressions
      for (const preset of schedulePresets) {
        const result = presetToCron(preset);
        expect(result).toBe(expectedCronExpressions[preset]);
      }
    });

    it('should throw error for invalid preset', () => {
      // Arrange
      const invalidPreset = 'invalid' as DiscoverySchedulePreset;

      // Act & Assert
      expect(() => presetToCron(invalidPreset)).toThrow(
        'Invalid schedule preset'
      );
    });
  });
});
