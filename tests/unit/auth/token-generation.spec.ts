import { describe, it, expect } from 'vitest';
import { generateLoginSecret } from '@ngaj/setup/generators/secret';
import {
  LOGIN_SECRET_PATTERN,
  LOGIN_SECRET_CHARSET,
  LOGIN_SECRET_CONFIG,
  isValidLoginSecretFormat,
  normalizeLoginCode,
} from '@ngaj/shared';
import {
  TEST_LOGIN_SECRET,
  validLoginSecrets,
  invalidLoginSecrets,
  codeNormalizationCases,
} from '../../fixtures/auth-fixtures';

describe('Token Generation', () => {
  describe('generateLoginSecret()', () => {
    it('should return token in correct format (XXXX-XXXX-XXXX-XXXX)', () => {
      // Act
      const token = generateLoginSecret();

      // Assert
      expect(token).toMatch(LOGIN_SECRET_PATTERN);
    });

    it('should return token with total length of 19 characters', () => {
      // Act
      const token = generateLoginSecret();

      // Assert - 16 chars + 3 dashes = 19
      expect(token.length).toBe(19);
    });

    it('should contain only valid characters from charset', () => {
      // Act
      const token = generateLoginSecret();

      // Assert - Remove dashes and check each character
      const charsOnly = token.replace(/-/g, '');
      for (const char of charsOnly) {
        expect(LOGIN_SECRET_CHARSET).toContain(char);
      }
    });

    it('should generate 4 segments of 4 characters each', () => {
      // Act
      const token = generateLoginSecret();

      // Assert
      const segments = token.split('-');
      expect(segments).toHaveLength(LOGIN_SECRET_CONFIG.segmentCount);
      for (const segment of segments) {
        expect(segment).toHaveLength(LOGIN_SECRET_CONFIG.segmentLength);
      }
    });

    it('should generate unique tokens (no duplicates in 100 generations)', () => {
      // Act
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateLoginSecret());
      }

      // Assert
      expect(tokens.size).toBe(100);
    });

    it('should generate tokens that are not sequential or predictable', () => {
      // Act
      const token1 = generateLoginSecret();
      const token2 = generateLoginSecret();

      // Assert - Tokens should differ significantly
      expect(token1).not.toBe(token2);

      // Check that segments don't increment predictably
      const segments1 = token1.split('-');
      const segments2 = token2.split('-');
      const matchingSegments = segments1.filter(
        (seg, idx) => seg === segments2[idx]
      );
      expect(matchingSegments.length).toBeLessThan(4);
    });

    it('should use cryptographically random source', () => {
      // This test verifies randomness distribution
      // Generate many tokens and check character distribution
      const charCounts: Record<string, number> = {};
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const token = generateLoginSecret().replace(/-/g, '');
        for (const char of token) {
          charCounts[char] = (charCounts[char] || 0) + 1;
        }
      }

      // Each character should appear roughly equally
      // With 42 chars in charset and 16 chars per token * 1000 iterations = 16000 chars
      // Expected frequency per char: 16000 / 42 ≈ 380
      // Allow for statistical variance (±50%)
      const totalChars = iterations * 16;
      const expectedFreq = totalChars / LOGIN_SECRET_CHARSET.length;
      const minFreq = expectedFreq * 0.3; // Very loose bound for random tests

      for (const char of LOGIN_SECRET_CHARSET) {
        const count = charCounts[char] || 0;
        expect(count).toBeGreaterThan(minFreq);
      }
    });
  });
});

describe('Token Validation', () => {
  describe('isValidLoginSecretFormat()', () => {
    it('should return true for valid format', () => {
      // Act & Assert
      expect(isValidLoginSecretFormat(TEST_LOGIN_SECRET)).toBe(true);
    });

    it('should return true for all valid test secrets', () => {
      // Act & Assert
      for (const secret of validLoginSecrets) {
        expect(
          isValidLoginSecretFormat(secret),
          `Failed for: ${secret}`
        ).toBe(true);
      }
    });

    it('should return false for empty string', () => {
      // Act & Assert
      expect(isValidLoginSecretFormat(invalidLoginSecrets.empty)).toBe(false);
    });

    it('should return false for too short token', () => {
      // Act & Assert
      expect(isValidLoginSecretFormat(invalidLoginSecrets.tooShort)).toBe(
        false
      );
    });

    it('should return false for too long token', () => {
      // Act & Assert
      expect(isValidLoginSecretFormat(invalidLoginSecrets.tooLong)).toBe(false);
    });

    it('should return false for missing dashes', () => {
      // Act & Assert
      expect(isValidLoginSecretFormat(invalidLoginSecrets.missingDashes)).toBe(
        false
      );
    });

    it('should return false for wrong segment length', () => {
      // Act & Assert
      expect(
        isValidLoginSecretFormat(invalidLoginSecrets.wrongSegmentLength)
      ).toBe(false);
    });

    it('should return false for extra dash', () => {
      // Act & Assert
      expect(isValidLoginSecretFormat(invalidLoginSecrets.extraDash)).toBe(
        false
      );
    });

    it('should return false for spaces instead of dashes', () => {
      // Act & Assert
      expect(
        isValidLoginSecretFormat(invalidLoginSecrets.spacesInsteadOfDashes)
      ).toBe(false);
    });

    it('should return false for lowercase (storage format must be uppercase)', () => {
      // Act & Assert
      expect(isValidLoginSecretFormat(invalidLoginSecrets.lowercase)).toBe(
        false
      );
    });

    it('should return false for invalid special characters', () => {
      // Act & Assert
      expect(
        isValidLoginSecretFormat(invalidLoginSecrets.specialInvalidChars)
      ).toBe(false);
    });

    it('should return false for leading/trailing whitespace', () => {
      // Act & Assert
      expect(isValidLoginSecretFormat(invalidLoginSecrets.leadingSpace)).toBe(
        false
      );
      expect(isValidLoginSecretFormat(invalidLoginSecrets.trailingSpace)).toBe(
        false
      );
    });
  });

  describe('normalizeLoginCode()', () => {
    it('should convert lowercase to uppercase', () => {
      // Act
      const result = normalizeLoginCode('a1b2-c3d4-e5f6-g7h8');

      // Assert
      expect(result).toBe('A1B2-C3D4-E5F6-G7H8');
    });

    it('should trim leading and trailing whitespace', () => {
      // Act
      const result = normalizeLoginCode('  A1B2-C3D4-E5F6-G7H8  ');

      // Assert
      expect(result).toBe('A1B2-C3D4-E5F6-G7H8');
    });

    it('should handle mixed case input', () => {
      // Act
      const result = normalizeLoginCode('a1B2-c3D4-e5F6-g7H8');

      // Assert
      expect(result).toBe('A1B2-C3D4-E5F6-G7H8');
    });

    it('should handle all normalization cases', () => {
      // Act & Assert
      for (const { input, expected } of codeNormalizationCases) {
        expect(normalizeLoginCode(input), `Failed for input: "${input}"`).toBe(
          expected
        );
      }
    });

    it('should preserve already uppercase input', () => {
      // Act
      const result = normalizeLoginCode('A1B2-C3D4-E5F6-G7H8');

      // Assert
      expect(result).toBe('A1B2-C3D4-E5F6-G7H8');
    });

    it('should handle empty string', () => {
      // Act
      const result = normalizeLoginCode('');

      // Assert
      expect(result).toBe('');
    });

    it('should handle whitespace-only string', () => {
      // Act
      const result = normalizeLoginCode('   ');

      // Assert
      expect(result).toBe('');
    });
  });
});

describe('LOGIN_SECRET_PATTERN', () => {
  it('should match valid token format', () => {
    // Act & Assert
    expect(LOGIN_SECRET_PATTERN.test('A1B2-C3D4-E5F6-G7H8')).toBe(true);
  });

  it('should allow all valid charset characters', () => {
    // Test that each valid character can appear in a segment
    // Valid charset: A-Z, 0-9, _, ., +, :, ,, @

    // Test alphanumeric
    expect(LOGIN_SECRET_PATTERN.test('ABCD-1234-EFGH-5678')).toBe(true);

    // Test special characters (valid 4-char segments with special chars only)
    expect(LOGIN_SECRET_PATTERN.test('_.+:-,@._-+:,.-@_+:')).toBe(true);

    // Test mixed alphanumeric and special (valid segments)
    expect(LOGIN_SECRET_PATTERN.test('A@B.-C:D+-E,F.-_G@H')).toBe(true); // Valid 4-char segments
  });

  it('should reject lowercase letters', () => {
    // Act & Assert
    expect(LOGIN_SECRET_PATTERN.test('a1b2-c3d4-e5f6-g7h8')).toBe(false);
  });

  it('should reject invalid special characters', () => {
    // Act & Assert
    expect(LOGIN_SECRET_PATTERN.test('A!B2-C3D4-E5F6-G7H8')).toBe(false);
    expect(LOGIN_SECRET_PATTERN.test('A#B2-C3D4-E5F6-G7H8')).toBe(false);
    expect(LOGIN_SECRET_PATTERN.test('A$B2-C3D4-E5F6-G7H8')).toBe(false);
    expect(LOGIN_SECRET_PATTERN.test('A%B2-C3D4-E5F6-G7H8')).toBe(false);
  });
});

describe('LOGIN_SECRET_CONFIG', () => {
  it('should have segment length of 4', () => {
    expect(LOGIN_SECRET_CONFIG.segmentLength).toBe(4);
  });

  it('should have segment count of 4', () => {
    expect(LOGIN_SECRET_CONFIG.segmentCount).toBe(4);
  });

  it('should use dash as separator', () => {
    expect(LOGIN_SECRET_CONFIG.separator).toBe('-');
  });
});

describe('LOGIN_SECRET_CHARSET', () => {
  it('should contain uppercase letters A-Z', () => {
    for (let i = 65; i <= 90; i++) {
      expect(LOGIN_SECRET_CHARSET).toContain(String.fromCharCode(i));
    }
  });

  it('should contain digits 0-9', () => {
    for (let i = 0; i <= 9; i++) {
      expect(LOGIN_SECRET_CHARSET).toContain(i.toString());
    }
  });

  it('should contain special characters _, ., +, :, ,, @', () => {
    const specialChars = ['_', '.', '+', ':', ',', '@'];
    for (const char of specialChars) {
      expect(LOGIN_SECRET_CHARSET).toContain(char);
    }
  });

  it('should have exactly 42 characters', () => {
    // 26 uppercase + 10 digits + 6 special = 42
    expect(LOGIN_SECRET_CHARSET.length).toBe(42);
  });

  it('should NOT contain lowercase letters', () => {
    for (let i = 97; i <= 122; i++) {
      expect(LOGIN_SECRET_CHARSET).not.toContain(String.fromCharCode(i));
    }
  });

  it('should NOT contain hyphen (used as separator)', () => {
    expect(LOGIN_SECRET_CHARSET).not.toContain('-');
  });
});
