import { describe, it, expect } from 'vitest';
import { validateConstraints } from '@/backend/utils/constraint-validator';
import { createMockConstraints } from '@tests/fixtures/response-fixtures';

describe('Constraint Validator', () => {
  describe('validateConstraints()', () => {
    it('should pass validation for response within limit', () => {
      // Arrange
      const responseText = 'Great point! I agree with your analysis.'; // ~40 chars
      const constraints = createMockConstraints({ maxLength: 300 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.violation).toBeUndefined();
    });

    it('should pass validation for response exactly at limit', () => {
      // Arrange
      const responseText = 'x'.repeat(300); // Exactly 300 chars
      const constraints = createMockConstraints({ maxLength: 300 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.violation).toBeUndefined();
    });

    it('should fail validation for response over limit', () => {
      // Arrange
      const responseText = 'x'.repeat(350); // 350 chars
      const constraints = createMockConstraints({ maxLength: 300 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.violation).toBe('maxLength');
      expect(result.actual).toBe(350);
      expect(result.limit).toBe(300);
    });

    it('should fail validation for response 1 character over limit', () => {
      // Arrange
      const responseText = 'x'.repeat(301); // 301 chars
      const constraints = createMockConstraints({ maxLength: 300 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.violation).toBe('maxLength');
      expect(result.actual).toBe(301);
      expect(result.limit).toBe(300);
    });

    it('should handle empty response text', () => {
      // Arrange
      const responseText = '';
      const constraints = createMockConstraints({ maxLength: 300 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('should handle very short response text', () => {
      // Arrange
      const responseText = 'Ok';
      const constraints = createMockConstraints({ maxLength: 300 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('should count Unicode characters correctly', () => {
      // Arrange
      const responseText = '🚀 你好 This is a test!'; // Multi-byte characters
      const constraints = createMockConstraints({ maxLength: 25 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      // Should count by character length, not byte length
      expect(result.valid).toBe(true);
      expect(responseText.length).toBeLessThan(25);
    });

    it('should handle emoji in response text', () => {
      // Arrange
      const responseText = '👍 Great idea! 🚀'; // Contains emoji
      const constraints = createMockConstraints({ maxLength: 20 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('should handle very strict constraints', () => {
      // Arrange
      const responseText = 'This is definitely too long for the limit';
      const constraints = createMockConstraints({ maxLength: 10 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.violation).toBe('maxLength');
      expect(result.actual).toBeGreaterThan(10);
      expect(result.limit).toBe(10);
    });

    it('should handle very loose constraints', () => {
      // Arrange
      const responseText = 'Short response';
      const constraints = createMockConstraints({ maxLength: 50000 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('should return detailed violation info when invalid', () => {
      // Arrange
      const responseText = 'x'.repeat(400);
      const constraints = createMockConstraints({ maxLength: 300 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      expect(result).toEqual({
        valid: false,
        violation: 'maxLength',
        actual: 400,
        limit: 300
      });
    });

    it('should handle newlines and whitespace in character count', () => {
      // Arrange
      const responseText = 'Line 1\nLine 2\nLine 3\n\nLine 5'; // Contains newlines
      const constraints = createMockConstraints({ maxLength: 100 });

      // Act
      const result = validateConstraints(responseText, constraints);

      // Assert
      // Newlines should count as characters
      expect(result.valid).toBe(true);
      expect(responseText.length).toBeLessThan(100);
    });
  });
});

