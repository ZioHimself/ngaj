/**
 * Login Code Reader Tests (Red Phase)
 *
 * Tests for reading LOGIN_SECRET from .env file during application startup.
 * The login code is displayed in the terminal to allow users to authenticate
 * from any device on the same network.
 *
 * @see ADR-011: Installation and Setup Architecture (Section 7.2)
 * @see ADR-014: Simple Token Auth
 * @see 012-application-launcher-handoff.md (Section 1.5)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { envFileMocks, loginSecretMocks } from '@tests/fixtures/launcher-fixtures';
import { readLoginCode, parseEnvFile, LoginCodeResult } from '@ngaj/setup/utils/login-code-reader.js';

describe('Login Code Reader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // readLoginCode() Tests (Section 1.5)
  // ==========================================================================

  describe('readLoginCode()', () => {
    describe('Valid .env with LOGIN_SECRET', () => {
      it('should return LOGIN_SECRET value from valid .env file', async () => {
        const mockReadFile = vi.fn().mockResolvedValue(envFileMocks.validWithLoginSecret);

        const result = await readLoginCode({
          envPath: '~/.ngaj/.env',
          readFile: mockReadFile,
        });

        expect(result.loginCode).toBe(loginSecretMocks.valid);
      });

      it('should display formatted login code (A1B2-C3D4 format)', async () => {
        const mockReadFile = vi.fn().mockResolvedValue(envFileMocks.validWithLoginSecret);

        const result = await readLoginCode({
          envPath: '~/.ngaj/.env',
          readFile: mockReadFile,
        });

        expect(result.loginCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });

      it('should return success flag', async () => {
        const mockReadFile = vi.fn().mockResolvedValue(envFileMocks.validWithLoginSecret);

        const result = await readLoginCode({
          envPath: '~/.ngaj/.env',
          readFile: mockReadFile,
        });

        expect(result.success).toBe(true);
      });
    });

    describe('Missing LOGIN_SECRET', () => {
      it('should return empty string when LOGIN_SECRET not in .env', async () => {
        const mockReadFile = vi.fn().mockResolvedValue(envFileMocks.validWithoutLoginSecret);

        const result = await readLoginCode({
          envPath: '~/.ngaj/.env',
          readFile: mockReadFile,
        });

        expect(result.loginCode).toBe('');
      });

      it('should return success=true with empty loginCode (graceful handling)', async () => {
        const mockReadFile = vi.fn().mockResolvedValue(envFileMocks.validWithoutLoginSecret);

        const result = await readLoginCode({
          envPath: '~/.ngaj/.env',
          readFile: mockReadFile,
        });

        expect(result.success).toBe(true);
        expect(result.loginCode).toBe('');
      });
    });

    describe('Missing .env file', () => {
      it('should return empty string when .env file does not exist', async () => {
        const mockReadFile = vi.fn().mockRejectedValue(new Error('ENOENT: no such file'));

        const result = await readLoginCode({
          envPath: '~/.ngaj/.env',
          readFile: mockReadFile,
        });

        expect(result.loginCode).toBe('');
      });

      it('should not throw error when .env file missing', async () => {
        const mockReadFile = vi.fn().mockRejectedValue(new Error('ENOENT: no such file'));

        await expect(
          readLoginCode({
            envPath: '~/.ngaj/.env',
            readFile: mockReadFile,
          })
        ).resolves.not.toThrow();
      });

      it('should return success=false when file not found', async () => {
        const mockReadFile = vi.fn().mockRejectedValue(new Error('ENOENT: no such file'));

        const result = await readLoginCode({
          envPath: '~/.ngaj/.env',
          readFile: mockReadFile,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });

    describe('Malformed .env file', () => {
      it('should handle gracefully and return empty string', async () => {
        const mockReadFile = vi.fn().mockResolvedValue(envFileMocks.malformed);

        const result = await readLoginCode({
          envPath: '~/.ngaj/.env',
          readFile: mockReadFile,
        });

        expect(result.loginCode).toBe('');
      });

      it('should not throw error on malformed content', async () => {
        const mockReadFile = vi.fn().mockResolvedValue(envFileMocks.malformed);

        await expect(
          readLoginCode({
            envPath: '~/.ngaj/.env',
            readFile: mockReadFile,
          })
        ).resolves.not.toThrow();
      });
    });

    describe('Empty .env file', () => {
      it('should return empty string for empty file', async () => {
        const mockReadFile = vi.fn().mockResolvedValue(envFileMocks.empty);

        const result = await readLoginCode({
          envPath: '~/.ngaj/.env',
          readFile: mockReadFile,
        });

        expect(result.loginCode).toBe('');
      });
    });
  });

  // ==========================================================================
  // parseEnvFile() Tests
  // ==========================================================================

  describe('parseEnvFile()', () => {
    it('should parse LOGIN_SECRET from env content', () => {
      const result = parseEnvFile(envFileMocks.validWithLoginSecret);

      expect(result.LOGIN_SECRET).toBe(loginSecretMocks.valid);
    });

    it('should parse multiple environment variables', () => {
      const result = parseEnvFile(envFileMocks.validWithLoginSecret);

      expect(result.BLUESKY_HANDLE).toBe('@testuser.bsky.social');
      expect(result.ANTHROPIC_API_KEY).toBe('sk-ant-api03-test-key-12345');
      expect(result.PORT).toBe('3000');
    });

    it('should ignore comment lines', () => {
      const result = parseEnvFile(envFileMocks.validWithLoginSecret);

      // Comments should not appear as keys
      expect(result['# ngaj Configuration']).toBeUndefined();
      expect(result['#']).toBeUndefined();
    });

    it('should ignore empty lines', () => {
      const result = parseEnvFile(envFileMocks.validWithLoginSecret);

      expect(result['']).toBeUndefined();
    });

    it('should return empty object for empty content', () => {
      const result = parseEnvFile('');

      expect(result).toEqual({});
    });

    it('should return empty object for malformed content', () => {
      const result = parseEnvFile(envFileMocks.malformed);

      // Should not crash, just return empty or partial
      expect(typeof result).toBe('object');
    });

    it('should handle values with equals signs', () => {
      const content = 'TEST_VAR=value=with=equals';
      const result = parseEnvFile(content);

      expect(result.TEST_VAR).toBe('value=with=equals');
    });

    it('should trim whitespace from values', () => {
      const content = 'TEST_VAR=  value with spaces  ';
      const result = parseEnvFile(content);

      expect(result.TEST_VAR).toBe('value with spaces');
    });

    it('should handle quoted values', () => {
      const content = 'TEST_VAR="quoted value"';
      const result = parseEnvFile(content);

      expect(result.TEST_VAR).toBe('quoted value');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle LOGIN_SECRET with different formats', async () => {
      const customEnv = 'LOGIN_SECRET=X9Y8-Z7W6-V5U4-T3S2';
      const mockReadFile = vi.fn().mockResolvedValue(customEnv);

      const result = await readLoginCode({
        envPath: '~/.ngaj/.env',
        readFile: mockReadFile,
      });

      expect(result.loginCode).toBe(loginSecretMocks.validAlternate);
    });

    it('should handle LOGIN_SECRET at different positions in file', async () => {
      const envAtStart = 'LOGIN_SECRET=A1B2-C3D4-E5F6-G7H8\nOTHER_VAR=value';
      const envAtEnd = 'OTHER_VAR=value\nLOGIN_SECRET=A1B2-C3D4-E5F6-G7H8';

      const mockReadFile = vi.fn().mockResolvedValue(envAtStart);
      const result1 = await readLoginCode({ envPath: '~/.ngaj/.env', readFile: mockReadFile });

      mockReadFile.mockResolvedValue(envAtEnd);
      const result2 = await readLoginCode({ envPath: '~/.ngaj/.env', readFile: mockReadFile });

      expect(result1.loginCode).toBe(result2.loginCode);
      expect(result1.loginCode).toBe(loginSecretMocks.valid);
    });

    it('should handle Windows-style line endings (CRLF)', async () => {
      const windowsEnv = 'LOGIN_SECRET=A1B2-C3D4-E5F6-G7H8\r\nOTHER_VAR=value\r\n';
      const mockReadFile = vi.fn().mockResolvedValue(windowsEnv);

      const result = await readLoginCode({
        envPath: '~/.ngaj/.env',
        readFile: mockReadFile,
      });

      expect(result.loginCode).toBe(loginSecretMocks.valid);
    });

    it('should handle file permission errors', async () => {
      const mockReadFile = vi.fn().mockRejectedValue(new Error('EACCES: permission denied'));

      const result = await readLoginCode({
        envPath: '~/.ngaj/.env',
        readFile: mockReadFile,
      });

      expect(result.success).toBe(false);
      expect(result.loginCode).toBe('');
    });
  });
});
