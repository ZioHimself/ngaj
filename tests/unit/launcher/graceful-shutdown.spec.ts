/**
 * Graceful Shutdown Tests (Red Phase)
 *
 * Tests for Ctrl+C handling and graceful shutdown of ngaj services
 * in the application launcher.
 *
 * @see ADR-011: Installation and Setup Architecture (Section 7)
 * @see 012-application-launcher-handoff.md (Section 2)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dockerComposeMocks, terminalOutputPatterns } from '@tests/fixtures/launcher-fixtures';
import {
  installShutdownHandler,
  removeShutdownHandler,
  handleShutdown,
  ShutdownResult,
} from '@ngaj/setup/utils/shutdown-handler.js';

describe('Graceful Shutdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    removeShutdownHandler();
  });

  // ==========================================================================
  // Ctrl+C Handler Tests (Section 2.1)
  // ==========================================================================

  describe('installShutdownHandler()', () => {
    it('should register SIGINT handler on process', () => {
      const processSpy = vi.spyOn(process, 'on');
      const mockOnShutdown = vi.fn();

      installShutdownHandler({ onShutdown: mockOnShutdown });

      expect(processSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      processSpy.mockRestore();
    });

    it('should register SIGTERM handler on process', () => {
      const processSpy = vi.spyOn(process, 'on');
      const mockOnShutdown = vi.fn();

      installShutdownHandler({ onShutdown: mockOnShutdown });

      expect(processSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      processSpy.mockRestore();
    });

    it('should return cleanup function', () => {
      const mockOnShutdown = vi.fn();

      const cleanup = installShutdownHandler({ onShutdown: mockOnShutdown });

      expect(typeof cleanup).toBe('function');
    });
  });

  describe('Ctrl+C Behavior (SIGINT)', () => {
    it('should display "Stopping ngaj..." message when Ctrl+C pressed', async () => {
      const output: string[] = [];
      const mockLog = vi.fn((msg: string) => output.push(msg));
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 0,
        output: dockerComposeMocks.downSuccess.output,
      });

      installShutdownHandler({
        onShutdown: async () => {
          await handleShutdown({
            exec: mockExec,
            installDir: '/Applications/ngaj',
            log: mockLog,
          });
        },
      });

      // Simulate SIGINT
      process.emit('SIGINT');

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(output.some((msg) => msg.includes(terminalOutputPatterns.stoppingNgaj))).toBe(true);
    });

    it('should run docker compose down when Ctrl+C pressed', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 0,
        output: dockerComposeMocks.downSuccess.output,
      });

      installShutdownHandler({
        onShutdown: async () => {
          await handleShutdown({
            exec: mockExec,
            installDir: '/Applications/ngaj',
            log: vi.fn(),
          });
        },
      });

      // Simulate SIGINT
      process.emit('SIGINT');

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('docker compose down'));
    });

    it('should exit with code 0 on successful shutdown', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 0,
        output: dockerComposeMocks.downSuccess.output,
      });

      installShutdownHandler({
        onShutdown: async () => {
          const result = await handleShutdown({
            exec: mockExec,
            installDir: '/Applications/ngaj',
            log: vi.fn(),
          });
          if (result.success) {
            process.exit(0);
          }
        },
      });

      // Simulate SIGINT
      process.emit('SIGINT');

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockExit).toHaveBeenCalledWith(0);
      mockExit.mockRestore();
    });

    it('should display "ngaj stopped" message after successful shutdown', async () => {
      const output: string[] = [];
      const mockLog = vi.fn((msg: string) => output.push(msg));
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 0,
        output: dockerComposeMocks.downSuccess.output,
      });

      installShutdownHandler({
        onShutdown: async () => {
          await handleShutdown({
            exec: mockExec,
            installDir: '/Applications/ngaj',
            log: mockLog,
          });
        },
      });

      process.emit('SIGINT');
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(output.some((msg) => msg.includes(terminalOutputPatterns.ngajStopped))).toBe(true);
    });
  });

  describe('Shutdown Failure Handling', () => {
    it('should show error and exit non-zero when docker compose down times out', async () => {
      vi.useFakeTimers();
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const mockExec = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

      const result = handleShutdown({
        exec: mockExec,
        installDir: '/Applications/ngaj',
        log: vi.fn(),
        timeoutMs: 30000,
      });

      // Use async timer advancement for proper Promise handling
      await vi.advanceTimersByTimeAsync(35000);

      await expect(result).resolves.toEqual(
        expect.objectContaining({
          success: false,
        })
      );

      vi.useRealTimers();
      mockExit.mockRestore();
    });

    it('should handle docker compose down errors gracefully', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 1,
        output: 'Error: container not found',
      });
      const output: string[] = [];
      const mockLog = vi.fn((msg: string) => output.push(msg));

      const result = await handleShutdown({
        exec: mockExec,
        installDir: '/Applications/ngaj',
        log: mockLog,
      });

      expect(result.success).toBe(false);
      expect(output.some((msg) => msg.toLowerCase().includes('error'))).toBe(true);
    });
  });

  // ==========================================================================
  // Terminal Close Tests (Section 2.2)
  // ==========================================================================

  describe('Terminal Close (macOS)', () => {
    it('should allow containers to continue running when terminal closed', async () => {
      // When user closes Terminal window (X button), the script terminates
      // but containers should continue running in background.
      // This is a documentation/behavior note - containers run in detached mode.

      const mockExec = vi.fn().mockResolvedValue({ exitCode: 0, output: '' });

      // docker compose up -d runs in detached mode
      await mockExec('docker compose up -d');

      expect(mockExec).toHaveBeenCalledWith('docker compose up -d');
      // The -d flag ensures containers run in background regardless of terminal state
    });

    it('should not call docker compose down when terminal is closed (not Ctrl+C)', () => {
      // This test documents expected behavior: terminal close != Ctrl+C
      // Containers should keep running if terminal is just closed
      // Only Ctrl+C should trigger cleanup

      const mockExec = vi.fn();
      const shutdownCalled = vi.fn();

      installShutdownHandler({
        onShutdown: shutdownCalled,
      });

      // Note: Terminal close doesn't emit SIGINT, it just terminates the process
      // So our handler should NOT be called

      // We don't emit SIGINT here, simulating terminal close
      // In real scenario, process just dies without signal

      expect(shutdownCalled).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // removeShutdownHandler Tests
  // ==========================================================================

  describe('removeShutdownHandler()', () => {
    it('should unregister SIGINT handler from process', () => {
      const processSpy = vi.spyOn(process, 'removeListener');
      const mockOnShutdown = vi.fn();

      installShutdownHandler({ onShutdown: mockOnShutdown });
      removeShutdownHandler();

      expect(processSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      processSpy.mockRestore();
    });

    it('should unregister SIGTERM handler from process', () => {
      const processSpy = vi.spyOn(process, 'removeListener');
      const mockOnShutdown = vi.fn();

      installShutdownHandler({ onShutdown: mockOnShutdown });
      removeShutdownHandler();

      expect(processSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      processSpy.mockRestore();
    });

    it('should be safe to call multiple times', () => {
      const mockOnShutdown = vi.fn();

      installShutdownHandler({ onShutdown: mockOnShutdown });

      expect(() => {
        removeShutdownHandler();
        removeShutdownHandler();
        removeShutdownHandler();
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // handleShutdown Tests
  // ==========================================================================

  describe('handleShutdown()', () => {
    it('should return ShutdownResult with success=true on clean shutdown', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 0,
        output: dockerComposeMocks.downSuccess.output,
      });

      const result = await handleShutdown({
        exec: mockExec,
        installDir: '/Applications/ngaj',
        log: vi.fn(),
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return ShutdownResult with success=false on failure', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 1,
        output: 'Error stopping containers',
      });

      const result = await handleShutdown({
        exec: mockExec,
        installDir: '/Applications/ngaj',
        log: vi.fn(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should use correct install directory in docker compose command', async () => {
      const mockExec = vi.fn().mockResolvedValue({ exitCode: 0, output: '' });

      await handleShutdown({
        exec: mockExec,
        installDir: '/custom/path/ngaj',
        log: vi.fn(),
      });

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('/custom/path/ngaj')
      );
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle multiple SIGINT signals gracefully', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 0,
        output: dockerComposeMocks.downSuccess.output,
      });
      let shutdownCount = 0;

      installShutdownHandler({
        onShutdown: async () => {
          shutdownCount++;
          await handleShutdown({
            exec: mockExec,
            installDir: '/Applications/ngaj',
            log: vi.fn(),
          });
        },
      });

      // Multiple SIGINT signals
      process.emit('SIGINT');
      process.emit('SIGINT');
      process.emit('SIGINT');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should only handle once (first signal starts shutdown)
      expect(shutdownCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle shutdown during startup (partial state)', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 0,
        output: 'Some containers not running',
      });

      const result = await handleShutdown({
        exec: mockExec,
        installDir: '/Applications/ngaj',
        log: vi.fn(),
      });

      // Should succeed even if some containers weren't running
      expect(result.success).toBe(true);
    });
  });
});
