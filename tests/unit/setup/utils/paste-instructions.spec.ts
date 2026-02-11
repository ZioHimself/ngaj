/**
 * Paste Instructions Utility Tests
 *
 * Tests for the paste instructions helper that guides Windows users
 * on how to paste credentials in terminal environments.
 *
 * @see ADR-021: Installation Clipboard Experience
 * @see 018-installation-clipboard-experience-handoff.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showPasteInstructions } from '@ngaj/setup/utils/paste-instructions.js';

describe('showPasteInstructions', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('output content', () => {
    it('should display tip emoji and header', () => {
      showPasteInstructions();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📋 Tip: To paste in this terminal:')
      );
    });

    it('should include Windows Terminal instructions', () => {
      showPasteInstructions();

      const calls = consoleSpy.mock.calls.flat().join('\n');
      expect(calls).toContain('Windows Terminal');
      expect(calls).toContain('Right-click');
      expect(calls).toContain('Ctrl+Shift+V');
    });

    it('should include PowerShell instructions', () => {
      showPasteInstructions();

      const calls = consoleSpy.mock.calls.flat().join('\n');
      expect(calls).toContain('PowerShell');
      expect(calls).toContain('Right-click');
    });

    it('should show bullet points for each instruction', () => {
      showPasteInstructions();

      const calls = consoleSpy.mock.calls.flat().join('\n');
      // Should have at least two bullet points
      const bulletCount = (calls.match(/•/g) || []).length;
      expect(bulletCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('output formatting', () => {
    it('should include blank line before instructions for visual separation', () => {
      showPasteInstructions();

      // First call should be empty string for spacing
      expect(consoleSpy.mock.calls[0][0]).toBe('');
    });

    it('should include blank line after instructions for visual separation', () => {
      showPasteInstructions();

      // Last call should be empty string for spacing
      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0];
      expect(lastCall).toBe('');
    });

    it('should make multiple console.log calls for proper formatting', () => {
      showPasteInstructions();

      // Should have: blank line, header, instruction 1, instruction 2, blank line
      expect(consoleSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('repeated calls', () => {
    it('should produce identical output on repeated calls', () => {
      showPasteInstructions();
      const firstOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n');

      consoleSpy.mockClear();

      showPasteInstructions();
      const secondOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n');

      expect(firstOutput).toBe(secondOutput);
    });

    it('should not accumulate state between calls', () => {
      showPasteInstructions();
      const firstCallCount = consoleSpy.mock.calls.length;

      consoleSpy.mockClear();

      showPasteInstructions();
      const secondCallCount = consoleSpy.mock.calls.length;

      expect(firstCallCount).toBe(secondCallCount);
    });
  });
});
