/**
 * Docker Detection and Service Startup Tests (Red Phase)
 *
 * Tests for Docker detection, Docker Desktop launch, and service startup logic
 * in the application launcher.
 *
 * @see ADR-011: Installation and Setup Architecture (Section 7)
 * @see 012-application-launcher-handoff.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dockerInfoMocks, dockerComposeMocks, errorScenarios } from '@tests/fixtures/launcher-fixtures';
import {
  checkDockerRunning,
  waitForDockerDaemon,
  startDockerDesktop,
  startServices,
  DockerNotInstalledError,
  DockerDaemonTimeoutError,
  PortConflictError,
} from '@ngaj/setup/utils/docker-manager.js';

describe('Docker Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Docker Info Detection Tests (Section 1.1)
  // ==========================================================================

  describe('checkDockerRunning()', () => {
    describe('Docker running', () => {
      it('should return true when docker info succeeds (exit code 0)', async () => {
        const mockExec = vi.fn().mockResolvedValue({
          exitCode: dockerInfoMocks.running.exitCode,
          output: dockerInfoMocks.running.output,
        });

        const result = await checkDockerRunning({ exec: mockExec });

        expect(result).toBe(true);
        expect(mockExec).toHaveBeenCalledWith('docker info');
      });
    });

    describe('Docker not running', () => {
      it('should return false when docker info fails (daemon not running)', async () => {
        const mockExec = vi.fn().mockResolvedValue({
          exitCode: dockerInfoMocks.notRunning.exitCode,
          output: dockerInfoMocks.notRunning.output,
        });

        const result = await checkDockerRunning({ exec: mockExec });

        expect(result).toBe(false);
      });
    });

    describe('Docker not installed', () => {
      it('should throw DockerNotInstalledError when docker command not found', async () => {
        const mockExec = vi.fn().mockResolvedValue({
          exitCode: dockerInfoMocks.notInstalled.exitCode,
          output: dockerInfoMocks.notInstalled.output,
        });

        await expect(checkDockerRunning({ exec: mockExec })).rejects.toThrow(DockerNotInstalledError);
      });

      it('should provide helpful error message', async () => {
        const mockExec = vi.fn().mockResolvedValue({
          exitCode: dockerInfoMocks.notInstalled.exitCode,
          output: dockerInfoMocks.notInstalled.output,
        });

        await expect(checkDockerRunning({ exec: mockExec })).rejects.toThrow(
          errorScenarios.dockerNotInstalled.message
        );
      });
    });
  });

  // ==========================================================================
  // Docker Desktop Launch Tests
  // ==========================================================================

  describe('startDockerDesktop()', () => {
    describe('macOS', () => {
      it('should launch Docker Desktop using "open -a Docker"', async () => {
        const mockExec = vi.fn().mockResolvedValue({ exitCode: 0, output: '' });

        await startDockerDesktop({ platform: 'darwin', exec: mockExec });

        expect(mockExec).toHaveBeenCalledWith('open -a Docker');
      });
    });

    describe('Windows', () => {
      it('should launch Docker Desktop using Start-Process', async () => {
        const mockExec = vi.fn().mockResolvedValue({ exitCode: 0, output: '' });

        await startDockerDesktop({ platform: 'win32', exec: mockExec });

        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining('Docker Desktop.exe')
        );
      });
    });
  });

  // ==========================================================================
  // Wait for Docker Daemon Tests
  // ==========================================================================

  describe('waitForDockerDaemon()', () => {
    it('should resolve when Docker daemon becomes available', async () => {
      let callCount = 0;
      const mockExec = vi.fn().mockImplementation(() => {
        callCount++;
        // First 2 calls fail, then success
        if (callCount < 3) {
          return Promise.resolve({ exitCode: 1, output: 'Cannot connect...' });
        }
        return Promise.resolve({ exitCode: 0, output: 'Server: Docker Desktop' });
      });

      await expect(
        waitForDockerDaemon({ exec: mockExec, maxWaitMs: 10000, pollIntervalMs: 100 })
      ).resolves.not.toThrow();
    });

    it('should throw DockerDaemonTimeoutError after 60s timeout', async () => {
      vi.useFakeTimers();
      const mockExec = vi.fn().mockResolvedValue({ exitCode: 1, output: 'Cannot connect...' });

      const promise = waitForDockerDaemon({
        exec: mockExec,
        maxWaitMs: 60000,
        pollIntervalMs: 1000,
      });

      // Advance time past timeout
      vi.advanceTimersByTime(65000);

      await expect(promise).rejects.toThrow(DockerDaemonTimeoutError);
      vi.useRealTimers();
    });

    it('should skip Docker Desktop launch if already running', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 0,
        output: dockerInfoMocks.running.output,
      });

      const startDockerMock = vi.fn();

      await waitForDockerDaemon({
        exec: mockExec,
        onStartDocker: startDockerMock,
        maxWaitMs: 5000,
        pollIntervalMs: 100,
      });

      expect(startDockerMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Service Startup Tests (Section 1.2)
  // ==========================================================================

  describe('startServices()', () => {
    describe('Services not running (fresh start)', () => {
      it('should start all containers with docker compose up -d', async () => {
        const mockExec = vi.fn().mockResolvedValue({
          exitCode: dockerComposeMocks.upSuccess.exitCode,
          output: dockerComposeMocks.upSuccess.output,
        });

        await startServices({ exec: mockExec, installDir: '/Applications/ngaj' });

        expect(mockExec).toHaveBeenCalledWith(
          expect.stringContaining('docker compose up -d')
        );
      });

      it('should change to install directory before starting', async () => {
        const mockExec = vi.fn().mockResolvedValue({
          exitCode: 0,
          output: '',
        });

        await startServices({ exec: mockExec, installDir: '/Applications/ngaj' });

        expect(mockExec).toHaveBeenCalledWith(
          expect.stringMatching(/cd.*\/Applications\/ngaj|--project-directory/i)
        );
      });
    });

    describe('Services already running', () => {
      it('should be idempotent - no restart when already running', async () => {
        const mockExec = vi.fn().mockResolvedValue({
          exitCode: dockerComposeMocks.alreadyRunning.exitCode,
          output: dockerComposeMocks.alreadyRunning.output,
        });

        const result = await startServices({ exec: mockExec, installDir: '/Applications/ngaj' });

        expect(result.success).toBe(true);
      });

      it('should complete quickly when already running', async () => {
        const startTime = Date.now();
        const mockExec = vi.fn().mockResolvedValue({
          exitCode: 0,
          output: dockerComposeMocks.alreadyRunning.output,
        });

        await startServices({ exec: mockExec, installDir: '/Applications/ngaj' });

        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(3000); // Less than 3 seconds
      });
    });

    describe('Partial services running', () => {
      it('should start only missing containers', async () => {
        const mockExec = vi.fn().mockResolvedValue({
          exitCode: 0,
          output: 'Container ngaj-backend-1  Started\nContainer ngaj-mongodb-1  Running',
        });

        const result = await startServices({ exec: mockExec, installDir: '/Applications/ngaj' });

        expect(result.success).toBe(true);
      });
    });

    describe('Port conflict', () => {
      it('should throw PortConflictError when port 3000 is in use', async () => {
        const mockExec = vi.fn().mockResolvedValue({
          exitCode: dockerComposeMocks.portConflict.exitCode,
          output: dockerComposeMocks.portConflict.output,
        });

        await expect(
          startServices({ exec: mockExec, installDir: '/Applications/ngaj' })
        ).rejects.toThrow(PortConflictError);
      });

      it('should provide helpful error message for port conflict', async () => {
        const mockExec = vi.fn().mockResolvedValue({
          exitCode: dockerComposeMocks.portConflict.exitCode,
          output: dockerComposeMocks.portConflict.output,
        });

        await expect(
          startServices({ exec: mockExec, installDir: '/Applications/ngaj' })
        ).rejects.toThrow(/port.*in use|already allocated/i);
      });
    });
  });

  // ==========================================================================
  // Graceful Shutdown Tests (Section 2)
  // ==========================================================================

  describe('stopServices()', () => {
    it('should run docker compose down', async () => {
      const { stopServices } = await import('@ngaj/setup/utils/docker-manager.js');
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: dockerComposeMocks.downSuccess.exitCode,
        output: dockerComposeMocks.downSuccess.output,
      });

      await stopServices({ exec: mockExec, installDir: '/Applications/ngaj' });

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('docker compose down')
      );
    });

    it('should return success on clean shutdown', async () => {
      const { stopServices } = await import('@ngaj/setup/utils/docker-manager.js');
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 0,
        output: dockerComposeMocks.downSuccess.output,
      });

      const result = await stopServices({ exec: mockExec, installDir: '/Applications/ngaj' });

      expect(result.success).toBe(true);
    });

    it('should handle timeout when containers fail to stop', async () => {
      const { stopServices } = await import('@ngaj/setup/utils/docker-manager.js');
      vi.useFakeTimers();
      const mockExec = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

      const promise = stopServices({
        exec: mockExec,
        installDir: '/Applications/ngaj',
        timeoutMs: 30000,
      });

      vi.advanceTimersByTime(35000);

      await expect(promise).rejects.toThrow(/timeout|failed to stop/i);
      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // Health Check Tests (Section 5.2)
  // ==========================================================================

  describe('waitForHealthCheck()', () => {
    it('should resolve when backend becomes healthy', async () => {
      const { waitForHealthCheck } = await import('@ngaj/setup/utils/docker-manager.js');
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('ECONNREFUSED'));
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      await expect(
        waitForHealthCheck({
          fetch: mockFetch,
          url: 'http://localhost:3000/health',
          maxWaitMs: 10000,
          pollIntervalMs: 100,
        })
      ).resolves.not.toThrow();
    });

    it('should throw after timeout if backend never healthy', async () => {
      const { waitForHealthCheck, HealthCheckTimeoutError } = await import(
        '@ngaj/setup/utils/docker-manager.js'
      );
      vi.useFakeTimers();
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const promise = waitForHealthCheck({
        fetch: mockFetch,
        url: 'http://localhost:3000/health',
        maxWaitMs: 60000,
        pollIntervalMs: 1000,
      });

      vi.advanceTimersByTime(65000);

      await expect(promise).rejects.toThrow(HealthCheckTimeoutError);
      vi.useRealTimers();
    });

    it('should throw with helpful message on timeout', async () => {
      const { waitForHealthCheck } = await import('@ngaj/setup/utils/docker-manager.js');
      vi.useFakeTimers();
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const promise = waitForHealthCheck({
        fetch: mockFetch,
        url: 'http://localhost:3000/health',
        maxWaitMs: 60000,
        pollIntervalMs: 1000,
      });

      vi.advanceTimersByTime(65000);

      await expect(promise).rejects.toThrow(errorScenarios.healthCheckTimeout.message);
      vi.useRealTimers();
    });
  });
});
