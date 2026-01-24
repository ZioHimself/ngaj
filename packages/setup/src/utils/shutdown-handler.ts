/**
 * Shutdown Handler Utilities
 *
 * Utilities for graceful shutdown of ngaj services when user presses Ctrl+C
 * or the process receives SIGINT/SIGTERM signals.
 *
 * @see ADR-011: Installation and Setup Architecture (Section 7)
 * @see 012-application-launcher-handoff.md (Section 2)
 */

/**
 * Result from shutdown operation
 */
export interface ShutdownResult {
  /** Whether the shutdown was successful */
  success: boolean;
  /** Error message if shutdown failed */
  error?: string;
}

/**
 * Options for installShutdownHandler
 */
export interface InstallShutdownHandlerOptions {
  /** Callback to execute when shutdown signal received */
  onShutdown: () => Promise<void>;
}

/**
 * Options for handleShutdown
 */
export interface HandleShutdownOptions {
  /** Function to execute shell commands */
  exec: (cmd: string) => Promise<{ exitCode: number; output: string }>;
  /** Directory where docker-compose.yml is located */
  installDir: string;
  /** Logger function for output */
  log: (message: string) => void;
  /** Timeout for shutdown operation in milliseconds */
  timeoutMs?: number;
}

/**
 * Install signal handlers for graceful shutdown
 *
 * Registers handlers for:
 * - SIGINT (Ctrl+C)
 * - SIGTERM (kill signal)
 *
 * @param options - Options including shutdown callback
 * @returns Cleanup function to remove handlers
 */
export function installShutdownHandler(_options: InstallShutdownHandlerOptions): () => void {
  throw new Error('Not implemented');
}

/**
 * Remove previously installed shutdown handlers
 *
 * Safe to call multiple times.
 */
export function removeShutdownHandler(): void {
  throw new Error('Not implemented');
}

/**
 * Handle the shutdown process
 *
 * Performs:
 * 1. Displays "Stopping ngaj..." message
 * 2. Runs `docker compose down`
 * 3. Displays success or error message
 *
 * @param options - Options including exec function and install directory
 * @returns Result indicating success or failure
 */
export async function handleShutdown(_options: HandleShutdownOptions): Promise<ShutdownResult> {
  throw new Error('Not implemented');
}
