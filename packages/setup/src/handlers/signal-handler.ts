/**
 * Signal Handler for Setup Wizard
 * 
 * Handles Ctrl+C (SIGINT) during setup to provide graceful cancellation
 * with confirmation dialog.
 * 
 * @see ADR-011: Installation and Setup Architecture (Scenario 2.2.5)
 */

import inquirer from 'inquirer';

/**
 * Result of cancellation confirmation prompt
 */
export interface CancellationResult {
  /** Whether user confirmed cancellation */
  confirmed: boolean;
}

/**
 * Options for signal handler setup
 */
export interface SignalHandlerOptions {
  /** Callback when user confirms cancellation */
  onCancel: () => void;
  /** Callback when user declines cancellation (returns to prompt) */
  onResume: () => void;
}

// Store the current signal handler for removal
let currentHandler: ((...args: unknown[]) => void) | null = null;

/**
 * Prompt user for cancellation confirmation
 * Shows "Setup incomplete. Quit? (y/n)" dialog
 * 
 * @returns Whether user confirmed cancellation
 */
export async function promptCancellationConfirmation(): Promise<CancellationResult> {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Setup incomplete. Quit?',
      default: false,
    },
  ]);

  return { confirmed: confirm };
}

/**
 * Install SIGINT handler that prompts for confirmation before exiting
 * 
 * @param options - Callbacks for cancel and resume actions
 * @returns Cleanup function to remove the handler
 */
export function installSignalHandler(options: SignalHandlerOptions): () => void {
  const { onCancel, onResume } = options;

  // Create async handler for SIGINT
  const handler = async () => {
    const result = await promptCancellationConfirmation();
    
    if (result.confirmed) {
      onCancel();
    } else {
      onResume();
    }
  };

  // Store reference for removal
  currentHandler = handler;

  // Register the handler
  process.on('SIGINT', handler);

  // Return cleanup function
  return () => {
    removeSignalHandler();
  };
}

/**
 * Remove installed signal handler
 */
export function removeSignalHandler(): void {
  if (currentHandler) {
    process.removeListener('SIGINT', currentHandler);
    currentHandler = null;
  }
}
