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
// Functions (Stubs)
// ==========================================================================

/**
 * Check if Docker is running
 *
 * @param options - Options including exec function
 * @returns True if Docker is running, false if not running
 * @throws DockerNotInstalledError if Docker is not installed
 */
export async function checkDockerRunning(_options: CheckDockerOptions): Promise<boolean> {
  throw new Error('Not implemented');
}

/**
 * Start Docker Desktop application
 *
 * @param options - Options including platform and exec function
 */
export async function startDockerDesktop(_options: StartDockerDesktopOptions): Promise<void> {
  throw new Error('Not implemented');
}

/**
 * Wait for Docker daemon to become available
 *
 * @param options - Options including exec function and timeout settings
 * @throws DockerDaemonTimeoutError if timeout exceeded
 */
export async function waitForDockerDaemon(_options: WaitForDockerDaemonOptions): Promise<void> {
  throw new Error('Not implemented');
}

/**
 * Start ngaj services using docker compose
 *
 * @param options - Options including exec function and install directory
 * @returns Result indicating success or failure
 * @throws PortConflictError if port 3000 is in use
 */
export async function startServices(_options: StartServicesOptions): Promise<ServiceResult> {
  throw new Error('Not implemented');
}

/**
 * Stop ngaj services using docker compose down
 *
 * @param options - Options including exec function and install directory
 * @returns Result indicating success or failure
 */
export async function stopServices(_options: StopServicesOptions): Promise<ServiceResult> {
  throw new Error('Not implemented');
}

/**
 * Wait for backend health check to pass
 *
 * @param options - Options including fetch function and timeout settings
 * @throws HealthCheckTimeoutError if timeout exceeded
 */
export async function waitForHealthCheck(_options: WaitForHealthCheckOptions): Promise<void> {
  throw new Error('Not implemented');
}
