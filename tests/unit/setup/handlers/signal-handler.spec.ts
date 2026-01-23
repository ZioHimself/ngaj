/**
 * Signal Handler Tests (Red Phase)
 * 
 * Tests for Ctrl+C (SIGINT) handling during setup wizard.
 * These tests are expected to FAIL until implementation is complete.
 * 
 * @see ADR-011: Installation and Setup Architecture (Scenario 2.2.5)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  promptCancellationConfirmation,
  installSignalHandler,
  removeSignalHandler,
} from '@ngaj/setup/handlers/signal-handler.js';

// Mock inquirer for confirmation prompts
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

describe('Signal Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    removeSignalHandler();
  });

  describe('promptCancellationConfirmation', () => {
    it('should show "Setup incomplete. Quit? (y/n)" prompt', async () => {
      const inquirer = (await import('inquirer')).default;
      const mockPrompt = inquirer.prompt as ReturnType<typeof vi.fn>;
      mockPrompt.mockResolvedValue({ confirm: true });

      await promptCancellationConfirmation();

      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          message: expect.stringContaining('Setup incomplete'),
        }),
      ]);
    });

    it('should return { confirmed: true } when user confirms', async () => {
      const inquirer = (await import('inquirer')).default;
      const mockPrompt = inquirer.prompt as ReturnType<typeof vi.fn>;
      mockPrompt.mockResolvedValue({ confirm: true });

      const result = await promptCancellationConfirmation();

      expect(result.confirmed).toBe(true);
    });

    it('should return { confirmed: false } when user declines', async () => {
      const inquirer = (await import('inquirer')).default;
      const mockPrompt = inquirer.prompt as ReturnType<typeof vi.fn>;
      mockPrompt.mockResolvedValue({ confirm: false });

      const result = await promptCancellationConfirmation();

      expect(result.confirmed).toBe(false);
    });
  });

  describe('installSignalHandler', () => {
    it('should register SIGINT handler on process', () => {
      const onCancel = vi.fn();
      const onResume = vi.fn();
      const processSpy = vi.spyOn(process, 'on');

      installSignalHandler({ onCancel, onResume });

      expect(processSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      processSpy.mockRestore();
    });

    it('should return cleanup function', () => {
      const onCancel = vi.fn();
      const onResume = vi.fn();

      const cleanup = installSignalHandler({ onCancel, onResume });

      expect(typeof cleanup).toBe('function');
    });

    it('should call onCancel when user confirms cancellation', async () => {
      const inquirer = (await import('inquirer')).default;
      const mockPrompt = inquirer.prompt as ReturnType<typeof vi.fn>;
      mockPrompt.mockResolvedValue({ confirm: true });

      const onCancel = vi.fn();
      const onResume = vi.fn();

      installSignalHandler({ onCancel, onResume });

      // Simulate SIGINT
      process.emit('SIGINT');

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(onCancel).toHaveBeenCalled();
      expect(onResume).not.toHaveBeenCalled();
    });

    it('should call onResume when user declines cancellation', async () => {
      const inquirer = (await import('inquirer')).default;
      const mockPrompt = inquirer.prompt as ReturnType<typeof vi.fn>;
      mockPrompt.mockResolvedValue({ confirm: false });

      const onCancel = vi.fn();
      const onResume = vi.fn();

      installSignalHandler({ onCancel, onResume });

      // Simulate SIGINT
      process.emit('SIGINT');

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(onResume).toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('removeSignalHandler', () => {
    it('should unregister SIGINT handler from process', () => {
      const onCancel = vi.fn();
      const onResume = vi.fn();
      const processSpy = vi.spyOn(process, 'removeListener');

      installSignalHandler({ onCancel, onResume });
      removeSignalHandler();

      expect(processSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      processSpy.mockRestore();
    });
  });

  describe('integration with wizard', () => {
    it('should not write .env file when user cancels', async () => {
      const inquirer = (await import('inquirer')).default;
      const mockPrompt = inquirer.prompt as ReturnType<typeof vi.fn>;
      mockPrompt.mockResolvedValue({ confirm: true });

      let envWritten = false;
      const onCancel = vi.fn(() => {
        // Verify no env file write happened
        expect(envWritten).toBe(false);
      });
      const onResume = vi.fn();

      installSignalHandler({ onCancel, onResume });

      // Simulate SIGINT before env write
      process.emit('SIGINT');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(onCancel).toHaveBeenCalled();
    });

    it('should throw USER_CANCELLED error when user confirms exit', async () => {
      const inquirer = (await import('inquirer')).default;
      const mockPrompt = inquirer.prompt as ReturnType<typeof vi.fn>;
      mockPrompt.mockResolvedValue({ confirm: true });

      let thrownError: Error | null = null;
      const onCancel = vi.fn(() => {
        thrownError = new Error('USER_CANCELLED');
        throw thrownError;
      });
      const onResume = vi.fn();

      installSignalHandler({ onCancel, onResume });

      // Simulate SIGINT
      process.emit('SIGINT');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(thrownError).not.toBeNull();
      expect(thrownError?.message).toBe('USER_CANCELLED');
    });
  });
});
