#!/usr/bin/env node
/**
 * @ngaj/setup - Installation Setup Wizard CLI
 * 
 * Interactive CLI that runs inside a Docker container during installation.
 * Collects and validates user credentials (Bluesky, Claude API) and writes
 * them to .env file via mounted volume.
 * 
 * @see ADR-011: Installation and Setup Architecture
 */

import { runSetupWizard } from './prompts/wizard.js';

async function main(): Promise<void> {
  console.log('🚀 Welcome to ngaj Setup!\n');
  console.log('This wizard will help you configure your credentials.');
  console.log("Let's get you set up. This will take ~5 minutes.\n");
  
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
  }
}

main();
