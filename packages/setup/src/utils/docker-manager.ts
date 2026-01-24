/**
 * Docker Manager Utilities
 *
 * Cross-platform utilities for Docker detection, service startup, and shutdown.
 * Used by the application launcher for day-2 restart experience.
 *
 * @see ADR-011: Installation and Setup Architecture (Section 7)
 * @see 012-application-launcher-handoff.md
 */

// ==========================================================================
// Custom Error Types
// ==========================================================================

/**
 * Error thrown when Docker is not installed on the system
 */
export class DockerNotInstalledError extends Error {
  constructor() {
    super('Docker not found. Please install Docker Desktop.');
    this.name = 'DockerNotInstalledError';
  }
}

/**
 * Error thrown when Docker daemon fails to start within timeout
 */
export class DockerDaemonTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Docker daemon failed to start within ${timeoutMs / 1000} seconds`);
    this.name = 'DockerDaemonTimeoutError';
  }
}

/**
 * Error thrown when port 3000 is already in use
 */
export class PortConflictError extends Error {
  constructor() {
    super('Port 3000 is already in use');
    this.name = 'PortConflictError';
  }
}

/**
 * Error thrown when health check times out
 */
export class HealthCheckTimeoutError extends Error {
  constructor() {
    super('Services failed to start. Check logs.');
    this.name = 'HealthCheckTimeoutError';
  }
}

// ==========================================================================
// Types
// ==========================================================================

/**
 * Command execution result
 */
export interface ExecResult {
  exitCode: number;
  output: string;
}

/**
 * Options for checkDockerRunning
 */
export interface CheckDockerOptions {
  exec: (cmd: string) => Promise<ExecResult>;
}

/**
 * Options for startDockerDesktop
 */
export interface StartDockerDesktopOptions {
  platform: 'darwin' | 'win32' | 'linux';
  exec: (cmd: string) => Promise<ExecResult>;
}

/**
 * Options for waitForDockerDaemon
 */
export interface WaitForDockerDaemonOptions {
  exec: (cmd: string) => Promise<ExecResult>;
  maxWaitMs?: number;
  pollIntervalMs?: number;
  onStartDocker?: () => Promise<void>;
}

/**
 * Options for startServices
 */
export interface StartServicesOptions {
  exec: (cmd: string) => Promise<ExecResult>;
  installDir: string;
}

/**
 * Result from service operations
 */
export interface ServiceResult {
  success: boolean;
  message?: string;
}

/**
 * Options for stopServices
 */
export interface StopServicesOptions {
  exec: (cmd: string) => Promise<ExecResult>;
  installDir: string;
  timeoutMs?: number;
}

/**
 * Options for waitForHealthCheck
 */
export interface WaitForHealthCheckOptions {
  fetch: (url: string) => Promise<{ ok: boolean; status: number }>;
  url: string;
  maxWaitMs?: number;
  pollIntervalMs?: number;
}

// ==========================================================================
// Constants
// ==========================================================================

const DOCKER_NOT_INSTALLED_EXIT_CODE = 127;

// ==========================================================================
// Functions
// ==========================================================================

/**
 * Check if Docker is running
 *
 * @param options - Options including exec function
 * @returns True if Docker is running, false if not running
 * @throws DockerNotInstalledError if Docker is not installed
 */
export async function checkDockerRunning(options: CheckDockerOptions): Promise<boolean> {
  const { exec } = options;

  const result = await exec('docker info');

  // Exit code 127 typically means command not found
  if (result.exitCode === DOCKER_NOT_INSTALLED_EXIT_CODE || result.output.includes('command not found')) {
    throw new DockerNotInstalledError();
  }

  // Exit code 0 means Docker is running
  return result.exitCode === 0;
}

/**
 * Start Docker Desktop application
 *
 * @param options - Options including platform and exec function
 */
export async function startDockerDesktop(options: StartDockerDesktopOptions): Promise<void> {
  const { platform, exec } = options;

  if (platform === 'darwin') {
    await exec('open -a Docker');
  } else if (platform === 'win32') {
    // Windows: Start Docker Desktop via PowerShell
    await exec('Start-Process "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"');
  }
  // Linux: Docker doesn't have a desktop app, daemon should be started via systemd
}

/**
 * Wait for Docker daemon to become available
 *
 * @param options - Options including exec function and timeout settings
 * @throws DockerDaemonTimeoutError if timeout exceeded
 */
export async function waitForDockerDaemon(options: WaitForDockerDaemonOptions): Promise<void> {
  const { exec, maxWaitMs = 60000, pollIntervalMs = 1000, onStartDocker } = options;

  const startTime = Date.now();

  // Check if already running first
  const initialResult = await exec('docker info');
  if (initialResult.exitCode === 0) {
    return; // Already running
  }

  // Start Docker Desktop if callback provided
  if (onStartDocker) {
    await onStartDocker();
  }

  // Poll until Docker is ready or timeout
  while (Date.now() - startTime < maxWaitMs) {
    const result = await exec('docker info');
    if (result.exitCode === 0) {
      return;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new DockerDaemonTimeoutError(maxWaitMs);
}

/**
 * Start ngaj services using docker compose
 *
 * @param options - Options including exec function and install directory
 * @returns Result indicating success or failure
 * @throws PortConflictError if port 3000 is in use
 */
export async function startServices(options: StartServicesOptions): Promise<ServiceResult> {
  const { exec, installDir } = options;

  const result = await exec(`cd "${installDir}" && docker compose up -d`);

  // Check for port conflict error
  if (result.output.includes('port is already allocated') || result.output.includes('address already in use')) {
    throw new PortConflictError();
  }

  if (result.exitCode !== 0) {
    return {
      success: false,
      message: result.output,
    };
  }

  return {
    success: true,
    message: result.output,
  };
}

/**
 * Stop ngaj services using docker compose down
 *
 * @param options - Options including exec function and install directory
 * @returns Result indicating success or failure
 */
export async function stopServices(options: StopServicesOptions): Promise<ServiceResult> {
  const { exec, installDir, timeoutMs = 30000 } = options;

  // Create a promise that rejects on timeout
  const timeoutPromise = new Promise<ServiceResult>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Services failed to stop: timeout exceeded'));
    }, timeoutMs);
  });

  // Create the actual exec promise
  const execPromise = (async () => {
    const result = await exec(`cd "${installDir}" && docker compose down`);

    if (result.exitCode !== 0) {
      return {
        success: false,
        message: result.output,
      };
    }

    return {
      success: true,
      message: result.output,
    };
  })();

  // Race between exec and timeout
  return Promise.race([execPromise, timeoutPromise]);
}

/**
 * Wait for backend health check to pass
 *
 * @param options - Options including fetch function and timeout settings
 * @throws HealthCheckTimeoutError if timeout exceeded
 */
export async function waitForHealthCheck(options: WaitForHealthCheckOptions): Promise<void> {
  const { fetch, url, maxWaitMs = 60000, pollIntervalMs = 1000 } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(url);
      if (response.ok && response.status === 200) {
        return;
      }
    } catch {
      // Connection refused or other error, continue polling
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new HealthCheckTimeoutError();
}
