#!/usr/bin/env node
/**
 * @ngaj/setup - Installation Setup Wizard CLI
 * 
 * Interactive CLI that runs inside a Docker container during installation.
 * Collects and validates user credentials (Bluesky, Claude API) and writes
 * them to .env file via mounted volume.
 * 
 * Supports two modes:
 * - Full wizard (default): Collects all credentials interactively
 * - Regenerate secret (--regenerate-secret): Only regenerates LOGIN_SECRET in .env
 * 
 * @see ADR-011: Installation and Setup Architecture
 */

import { runSetupWizard } from './prompts/wizard.js';
import { installSignalHandler, removeSignalHandler } from './handlers/signal-handler.js';
import { validateDataVolumeMount } from './utils/file-system-validator.js';
import { regenerateLoginSecret } from './writers/env-writer.js';

/**
 * Parse command line arguments
 */
function parseArgs(): { regenerateSecret: boolean } {
  const args = process.argv.slice(2);
  return {
    regenerateSecret: args.includes('--regenerate-secret'),
  };
}

/**
 * Run the regenerate secret mode
 * Only updates LOGIN_SECRET in existing .env file
 */
async function runRegenerateSecret(): Promise<void> {
  // Validate volume mount
  const volumeCheck = validateDataVolumeMount();
  if (!volumeCheck.mounted || !volumeCheck.writable) {
    console.error('❌ Cannot regenerate secret.\n');
    console.error(volumeCheck.error);
    console.error('\nExpected usage:');
    console.error('  docker run --rm -v ~/.ngaj:/data ziohimself/ngaj-setup:stable --regenerate-secret\n');
    process.exit(1);
  }
  
  try {
    const newSecret = await regenerateLoginSecret();
    // Output ONLY the secret for easy parsing by shell scripts
    console.log(newSecret);
  } catch (error) {
    console.error('❌ Failed to regenerate secret:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Run the full setup wizard
 */
async function runFullSetup(): Promise<void> {
  console.log('🚀 Welcome to ngaj Setup!\n');
  
  // Validate volume mount BEFORE collecting any credentials
  const volumeCheck = validateDataVolumeMount();
  if (!volumeCheck.mounted || !volumeCheck.writable) {
    console.error('❌ Setup cannot continue.\n');
    console.error(volumeCheck.error);
    console.error('\nExpected usage:');
    console.error('  docker run --rm -it -v ~/.ngaj:/data ziohimself/ngaj-setup:stable\n');
    process.exit(1);
  }
  
  console.log('This wizard will help you configure your credentials.');
  console.log("Let's get you set up. This will take ~5 minutes.\n");
  
  // Install signal handler for graceful Ctrl+C handling
  installSignalHandler({
    onCancel: () => {
      console.log('\n⚠️ Setup cancelled. Run the installer again to complete setup.');
      process.exit(1);
    },
    onResume: () => {
      console.log('\nContinuing setup...\n');
    },
  });
  
  try {
    await runSetupWizard();
    console.log('\n✅ Setup complete!');
    console.log('Your credentials have been saved to /data/.env');
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_CANCELLED') {
      console.log('\n⚠️ Setup cancelled. Run the installer again to complete setup.');
      process.exit(1);
    }
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  } finally {
    // Clean up signal handler
    removeSignalHandler();
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  
  if (args.regenerateSecret) {
    await runRegenerateSecret();
  } else {
    await runFullSetup();
  }
}

main();
