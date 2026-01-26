/**
 * Setup Wizard Integration Tests
 * 
 * Tests for the complete setup wizard flow that orchestrates
 * credential collection, validation, and .env file writing.
 * 
 * @see ADR-011: Installation and Setup Architecture
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runSetupWizard } from '@ngaj/setup/prompts/wizard.js';
import {
  validBlueskyCredentials,
  validAnthropicCredentials,
} from '@tests/fixtures/setup-fixtures';

// Mock the prompt modules
vi.mock('@ngaj/setup/prompts/bluesky.js', () => ({
  promptBlueskyCredentials: vi.fn(),
}));

vi.mock('@ngaj/setup/prompts/anthropic.js', () => ({
  promptAnthropicCredentials: vi.fn(),
}));

vi.mock('@ngaj/setup/writers/env-writer.js', () => ({
  writeEnvFile: vi.fn(),
}));

describe('runSetupWizard', () => {
  let mockPromptBluesky: ReturnType<typeof vi.fn>;
  let mockPromptAnthropic: ReturnType<typeof vi.fn>;
  let mockWriteEnvFile: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get mock functions
    const blueskyModule = await import('@ngaj/setup/prompts/bluesky.js');
    const anthropicModule = await import('@ngaj/setup/prompts/anthropic.js');
    const writerModule = await import('@ngaj/setup/writers/env-writer.js');
    
    mockPromptBluesky = blueskyModule.promptBlueskyCredentials as ReturnType<typeof vi.fn>;
    mockPromptAnthropic = anthropicModule.promptAnthropicCredentials as ReturnType<typeof vi.fn>;
    mockWriteEnvFile = writerModule.writeEnvFile as ReturnType<typeof vi.fn>;
    
    // Default: successful prompts
    mockPromptBluesky.mockResolvedValue(validBlueskyCredentials);
    mockPromptAnthropic.mockResolvedValue(validAnthropicCredentials);
    mockWriteEnvFile.mockResolvedValue({ loginSecret: 'ABCD-EFGH-IJKL-MNOP' });
    
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('successful wizard flow', () => {
    it('should collect Bluesky credentials first', async () => {
      await runSetupWizard();

      expect(mockPromptBluesky).toHaveBeenCalledTimes(1);
    });

    it('should collect Anthropic credentials after Bluesky', async () => {
      await runSetupWizard();

      expect(mockPromptAnthropic).toHaveBeenCalledTimes(1);
      // Verify order: Bluesky called first
      expect(mockPromptBluesky.mock.invocationCallOrder[0])
        .toBeLessThan(mockPromptAnthropic.mock.invocationCallOrder[0]);
    });

    it('should write env file after collecting all credentials', async () => {
      await runSetupWizard();

      expect(mockWriteEnvFile).toHaveBeenCalledTimes(1);
      // Verify order: write called after prompts
      expect(mockPromptAnthropic.mock.invocationCallOrder[0])
        .toBeLessThan(mockWriteEnvFile.mock.invocationCallOrder[0]);
    });

    it('should return SetupConfiguration with all credentials', async () => {
      const result = await runSetupWizard();

      expect(result.platformCredentials).toHaveLength(1);
      expect(result.platformCredentials[0]).toEqual(validBlueskyCredentials);
      expect(result.aiCredentials).toEqual(validAnthropicCredentials);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should pass configuration to writeEnvFile', async () => {
      await runSetupWizard();

      const writtenConfig = mockWriteEnvFile.mock.calls[0][0];
      
      expect(writtenConfig.platformCredentials).toContain(validBlueskyCredentials);
      expect(writtenConfig.aiCredentials).toEqual(validAnthropicCredentials);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from Bluesky prompt', async () => {
      const error = new Error('USER_CANCELLED');
      mockPromptBluesky.mockRejectedValue(error);

      await expect(runSetupWizard()).rejects.toThrow('USER_CANCELLED');
      expect(mockPromptAnthropic).not.toHaveBeenCalled();
      expect(mockWriteEnvFile).not.toHaveBeenCalled();
    });

    it('should propagate errors from Anthropic prompt', async () => {
      const error = new Error('USER_CANCELLED');
      mockPromptAnthropic.mockRejectedValue(error);

      await expect(runSetupWizard()).rejects.toThrow('USER_CANCELLED');
      expect(mockWriteEnvFile).not.toHaveBeenCalled();
    });

    it('should propagate errors from env file writing', async () => {
      const error = new Error('EACCES: permission denied');
      mockWriteEnvFile.mockRejectedValue(error);

      await expect(runSetupWizard()).rejects.toThrow('EACCES: permission denied');
    });
  });

  describe('completedAt timestamp', () => {
    it('should set completedAt to current time', async () => {
      const before = new Date();
      const result = await runSetupWizard();
      const after = new Date();

      expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
