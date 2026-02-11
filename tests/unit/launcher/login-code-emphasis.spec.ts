/**
 * Login Code Emphasis Display Tests
 *
 * Tests for the visual emphasis formatting of login codes,
 * including the emphasis box and clipboard status display.
 *
 * @see ADR-021: Installation Clipboard Experience
 * @see 018-installation-clipboard-experience-handoff.md
 */

import { describe, it, expect } from 'vitest';
import {
  formatLoginCodeWithEmphasis,
  type FormatLoginCodeEmphasisOptions,
} from '@ngaj/setup/utils/terminal-output.js';
import {
  loginSecretMocks,
  terminalOutputPatterns,
  terminalOutputExamples,
} from '@tests/fixtures/launcher-fixtures';

describe('formatLoginCodeWithEmphasis', () => {
  describe('visual emphasis box', () => {
    it('should display top emphasis line', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: loginSecretMocks.valid,
        clipboardSuccess: true,
      });

      expect(output).toMatch(terminalOutputPatterns.loginCodeEmphasisTop);
    });

    it('should display login code with LOGIN CODE label', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: loginSecretMocks.valid,
        clipboardSuccess: true,
      });

      expect(output).toMatch(terminalOutputPatterns.loginCodeEmphasisLabel);
      expect(output).toContain('LOGIN CODE:');
      expect(output).toContain(loginSecretMocks.valid);
    });

    it('should display bottom emphasis line', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: loginSecretMocks.valid,
        clipboardSuccess: true,
      });

      // Count emphasis lines (should be at least 2)
      const emphasisLines = (output.match(/═{30,}/g) || []).length;
      expect(emphasisLines).toBeGreaterThanOrEqual(2);
    });

    it('should match expected format with clipboard success', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: 'A1B2-C3D4-E5F6-G7H8',
        clipboardSuccess: true,
      });

      expect(output).toBe(terminalOutputExamples.loginCodeWithEmphasis);
    });

    it('should match expected format without clipboard success', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: 'A1B2-C3D4-E5F6-G7H8',
        clipboardSuccess: false,
      });

      expect(output).toBe(terminalOutputExamples.loginCodeEmphasisNoClipboard);
    });
  });

  describe('clipboard status display', () => {
    it('should show "Copied to clipboard" when clipboard succeeds', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: loginSecretMocks.valid,
        clipboardSuccess: true,
      });

      expect(output).toContain(terminalOutputPatterns.clipboardCopied);
    });

    it('should NOT show clipboard message when clipboard fails', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: loginSecretMocks.valid,
        clipboardSuccess: false,
      });

      expect(output).not.toContain('Copied to clipboard');
      expect(output).not.toContain('clipboard');
    });

    it('should show checkmark with clipboard success message', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: loginSecretMocks.valid,
        clipboardSuccess: true,
      });

      expect(output).toContain('✓');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for empty login code', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: '',
        clipboardSuccess: true,
      });

      expect(output).toBe('');
    });

    it('should return empty string for whitespace-only login code', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: '   ',
        clipboardSuccess: true,
      });

      expect(output).toBe('');
    });

    it('should handle alternate login code formats', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: loginSecretMocks.validAlternate,
        clipboardSuccess: true,
      });

      expect(output).toContain(loginSecretMocks.validAlternate);
      expect(output).toContain('LOGIN CODE:');
    });

    it('should handle very long login codes', () => {
      const longCode = 'ABCD-EFGH-IJKL-MNOP-QRST';
      const output = formatLoginCodeWithEmphasis({
        loginCode: longCode,
        clipboardSuccess: true,
      });

      expect(output).toContain(longCode);
    });
  });

  describe('output structure', () => {
    it('should have login code between emphasis lines', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: loginSecretMocks.valid,
        clipboardSuccess: true,
      });

      const lines = output.split('\n');

      // First line should be emphasis
      expect(lines[0]).toMatch(/═{30,}/);

      // Second line should contain login code
      expect(lines[1]).toContain('LOGIN CODE:');

      // Third line should be emphasis
      expect(lines[2]).toMatch(/═{30,}/);
    });

    it('should have clipboard message after emphasis box', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: loginSecretMocks.valid,
        clipboardSuccess: true,
      });

      const lines = output.split('\n');
      const clipboardLineIndex = lines.findIndex((line) =>
        line.includes('Copied to clipboard')
      );
      const lastEmphasisIndex = lines.findLastIndex((line) =>
        /═{30,}/.test(line)
      );

      expect(clipboardLineIndex).toBeGreaterThan(lastEmphasisIndex);
    });
  });

  describe('consistency', () => {
    it('should produce consistent output on repeated calls', () => {
      const options: FormatLoginCodeEmphasisOptions = {
        loginCode: loginSecretMocks.valid,
        clipboardSuccess: true,
      };

      const output1 = formatLoginCodeWithEmphasis(options);
      const output2 = formatLoginCodeWithEmphasis(options);

      expect(output1).toBe(output2);
    });

    it('should use same emphasis line length top and bottom', () => {
      const output = formatLoginCodeWithEmphasis({
        loginCode: loginSecretMocks.valid,
        clipboardSuccess: true,
      });

      const emphasisLines = output.match(/═+/g) || [];
      expect(emphasisLines.length).toBeGreaterThanOrEqual(2);

      // All emphasis lines should have same length
      const lengths = emphasisLines.map((line) => line.length);
      expect(new Set(lengths).size).toBe(1);
    });
  });
});
