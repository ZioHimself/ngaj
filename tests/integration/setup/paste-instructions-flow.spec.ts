/**
 * Paste Instructions Integration Tests
 *
 * Tests for the integration of paste instructions with the setup wizard prompts.
 * Verifies that paste instructions are displayed before password prompts.
 *
 * @see ADR-021: Installation Clipboard Experience
 * @see 018-installation-clipboard-experience-handoff.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promptAnthropicCredentials } from '@ngaj/setup/prompts/anthropic.js';
import { promptBlueskyCredentials } from '@ngaj/setup/prompts/bluesky.js';
import { showPasteInstructions } from '@ngaj/setup/utils/paste-instructions.js';
import {
  validAnthropicCredentials,
  validBlueskyCredentials,
  successValidationResult,
} from '@tests/fixtures/setup-fixtures';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock validators
vi.mock('@ngaj/setup/validators/anthropic.js', () => ({
  validateAnthropicConnection: vi.fn(),
}));

vi.mock('@ngaj/setup/validators/bluesky.js', () => ({
  validateBlueskyConnection: vi.fn(),
}));

// Mock paste instructions to track calls
vi.mock('@ngaj/setup/utils/paste-instructions.js', () => ({
  showPasteInstructions: vi.fn(),
}));

describe('Paste Instructions Flow Integration', () => {
  let mockInquirer: ReturnType<typeof vi.fn>;
  let mockShowPasteInstructions: ReturnType<typeof vi.fn>;
  let mockValidateAnthropic: ReturnType<typeof vi.fn>;
  let mockValidateBluesky: ReturnType<typeof vi.fn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mock functions
    const inquirerModule = await import('inquirer');
    mockInquirer = inquirerModule.default.prompt as ReturnType<typeof vi.fn>;

    const pasteModule = await import('@ngaj/setup/utils/paste-instructions.js');
    mockShowPasteInstructions = pasteModule.showPasteInstructions as ReturnType<
      typeof vi.fn
    >;

    const anthropicValidator = await import(
      '@ngaj/setup/validators/anthropic.js'
    );
    mockValidateAnthropic =
      anthropicValidator.validateAnthropicConnection as ReturnType<
        typeof vi.fn
      >;

    const blueskyValidator = await import('@ngaj/setup/validators/bluesky.js');
    mockValidateBluesky =
      blueskyValidator.validateBlueskyConnection as ReturnType<typeof vi.fn>;

    // Suppress console output
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Anthropic prompt integration', () => {
    beforeEach(() => {
      // Setup successful flow
      mockInquirer.mockResolvedValue({
        apiKey: validAnthropicCredentials.apiKey,
      });
      mockValidateAnthropic.mockResolvedValue(successValidationResult);
    });

    it('should show paste instructions before API key prompt', async () => {
      await promptAnthropicCredentials();

      expect(mockShowPasteInstructions).toHaveBeenCalled();
    });

    it('should call paste instructions before inquirer prompt', async () => {
      await promptAnthropicCredentials();

      // Verify order: paste instructions called before prompt
      expect(mockShowPasteInstructions.mock.invocationCallOrder[0]).toBeLessThan(
        mockInquirer.mock.invocationCallOrder[0]
      );
    });

    it('should show paste instructions on each retry', async () => {
      // First attempt fails, second succeeds
      mockValidateAnthropic
        .mockResolvedValueOnce({
          valid: false,
          error: 'Invalid API key',
        })
        .mockResolvedValueOnce(successValidationResult);

      mockInquirer
        .mockResolvedValueOnce({ apiKey: 'invalid-key' })
        .mockResolvedValueOnce({ apiKey: validAnthropicCredentials.apiKey });

      await promptAnthropicCredentials();

      // Should be called twice (once per attempt)
      expect(mockShowPasteInstructions).toHaveBeenCalledTimes(2);
    });
  });

  describe('Bluesky prompt integration', () => {
    beforeEach(() => {
      // Setup successful flow - handle is text input, password is hidden
      mockInquirer
        // First call for handle
        .mockResolvedValueOnce({ handle: validBlueskyCredentials.handle })
        // Second call for app password
        .mockResolvedValueOnce({
          appPassword: validBlueskyCredentials.appPassword,
        });
      mockValidateBluesky.mockResolvedValue(successValidationResult);
    });

    it('should NOT show paste instructions before handle prompt (text input)', async () => {
      await promptBlueskyCredentials();

      // First inquirer call is for handle (text input) - no paste instructions needed
      // Check that paste instructions is called AFTER handle prompt, not before
      const firstInquirerCall = mockInquirer.mock.invocationCallOrder[0];
      const pasteInstructionsCall =
        mockShowPasteInstructions.mock.invocationCallOrder[0];

      // Paste instructions should be called between handle and password prompts
      expect(pasteInstructionsCall).toBeGreaterThan(firstInquirerCall);
    });

    it('should show paste instructions before app password prompt', async () => {
      await promptBlueskyCredentials();

      expect(mockShowPasteInstructions).toHaveBeenCalled();
    });

    it('should call paste instructions after handle prompt but before password prompt', async () => {
      await promptBlueskyCredentials();

      const callOrder = {
        firstPrompt: mockInquirer.mock.invocationCallOrder[0],
        pasteInstructions: mockShowPasteInstructions.mock.invocationCallOrder[0],
        secondPrompt: mockInquirer.mock.invocationCallOrder[1],
      };

      // Order should be: handle prompt -> paste instructions -> password prompt
      expect(callOrder.firstPrompt).toBeLessThan(callOrder.pasteInstructions);
      expect(callOrder.pasteInstructions).toBeLessThan(callOrder.secondPrompt);
    });

    it('should show paste instructions on retry after validation failure', async () => {
      // Reset and set up retry scenario
      mockInquirer.mockReset();
      mockValidateBluesky.mockReset();

      // First attempt fails
      mockInquirer
        .mockResolvedValueOnce({ handle: validBlueskyCredentials.handle })
        .mockResolvedValueOnce({ appPassword: 'wrong-password' })
        // Second attempt succeeds
        .mockResolvedValueOnce({ handle: validBlueskyCredentials.handle })
        .mockResolvedValueOnce({
          appPassword: validBlueskyCredentials.appPassword,
        });

      mockValidateBluesky
        .mockResolvedValueOnce({ valid: false, error: 'Invalid credentials' })
        .mockResolvedValueOnce(successValidationResult);

      await promptBlueskyCredentials();

      // Should be called twice (once per password prompt attempt)
      expect(mockShowPasteInstructions).toHaveBeenCalledTimes(2);
    });
  });

  describe('combined flow', () => {
    it('should show paste instructions consistently across different prompts', async () => {
      // Setup Anthropic
      mockInquirer.mockResolvedValueOnce({
        apiKey: validAnthropicCredentials.apiKey,
      });
      mockValidateAnthropic.mockResolvedValue(successValidationResult);

      await promptAnthropicCredentials();
      const anthropicCallCount = mockShowPasteInstructions.mock.calls.length;

      // Reset for Bluesky
      mockInquirer.mockReset();
      mockShowPasteInstructions.mockClear();

      mockInquirer
        .mockResolvedValueOnce({ handle: validBlueskyCredentials.handle })
        .mockResolvedValueOnce({
          appPassword: validBlueskyCredentials.appPassword,
        });
      mockValidateBluesky.mockResolvedValue(successValidationResult);

      await promptBlueskyCredentials();
      const blueskyCallCount = mockShowPasteInstructions.mock.calls.length;

      // Both should call paste instructions at least once
      expect(anthropicCallCount).toBeGreaterThanOrEqual(1);
      expect(blueskyCallCount).toBeGreaterThanOrEqual(1);
    });
  });
});
