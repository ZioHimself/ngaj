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

// Store handlers so we can remove them later
let sigintHandler: (() => void) | null = null;
let sigtermHandler: (() => void) | null = null;

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
export function installShutdownHandler(options: InstallShutdownHandlerOptions): () => void {
  const { onShutdown } = options;

  // Create handlers
  sigintHandler = () => {
    void onShutdown();
  };
  sigtermHandler = () => {
    void onShutdown();
  };

  // Register handlers
  process.on('SIGINT', sigintHandler);
  process.on('SIGTERM', sigtermHandler);

  // Return cleanup function
  return removeShutdownHandler;
}

/**
 * Remove previously installed shutdown handlers
 *
 * Safe to call multiple times.
 */
export function removeShutdownHandler(): void {
  if (sigintHandler) {
    process.removeListener('SIGINT', sigintHandler);
    sigintHandler = null;
  }
  if (sigtermHandler) {
    process.removeListener('SIGTERM', sigtermHandler);
    sigtermHandler = null;
  }
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
export async function handleShutdown(options: HandleShutdownOptions): Promise<ShutdownResult> {
  const { exec, installDir, log, timeoutMs = 30000 } = options;

  // Display stopping message
  log('Stopping ngaj...');

  // Create a promise that resolves on timeout with failure
  const timeoutPromise = new Promise<ShutdownResult>((resolve) => {
    setTimeout(() => {
      log('Error: Shutdown timed out');
      resolve({
        success: false,
        error: 'Shutdown timed out',
      });
    }, timeoutMs);
  });

  // Create the actual shutdown promise
  const shutdownPromise = (async (): Promise<ShutdownResult> => {
    try {
      const result = await exec(`cd "${installDir}" && docker compose down`);

      if (result.exitCode !== 0) {
        log(`Error: ${result.output}`);
        return {
          success: false,
          error: result.output,
        };
      }

      log('✓ ngaj stopped');
      return {
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  })();

  // Race between shutdown and timeout
  return Promise.race([shutdownPromise, timeoutPromise]);
}
