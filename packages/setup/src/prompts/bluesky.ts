/**
 * Bluesky credential prompts and validation
 */

import inquirer from 'inquirer';
import type { BlueskyCredentials } from '@ngaj/shared';
import { CREDENTIAL_PATTERNS } from '@ngaj/shared';
import { validateBlueskyConnection } from '../validators/bluesky.js';
import { showPasteInstructions } from '../utils/paste-instructions.js';

/**
 * Prompt for Bluesky credentials with validation
 *
 * Note: Handle and app password are prompted separately so that
 * paste instructions can be shown before the password prompt only.
 * Handle is a text input (no paste instructions needed).
 */
export async function promptBlueskyCredentials(): Promise<BlueskyCredentials> {
  while (true) {
    // First prompt: handle (text input, no paste instructions needed)
    const handleAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'handle',
        message: 'Your Bluesky handle (e.g., @yourname.bsky.social):',
        validate: (input: string) => {
          if (!CREDENTIAL_PATTERNS.blueskyHandle.test(input)) {
            return `Invalid format. Expected: @username.bsky.social`;
          }
          return true;
        },
      },
    ]);

    // Show paste instructions before password prompt
    showPasteInstructions();

    // Second prompt: app password (hidden input)
    const passwordAnswer = await inquirer.prompt([
      {
        type: 'password',
        name: 'appPassword',
        message: 'Bluesky app password:',
        mask: '*',
        validate: (input: string) => {
          if (!CREDENTIAL_PATTERNS.blueskyAppPassword.test(input)) {
            return `Invalid format. Expected: xxxx-xxxx-xxxx-xxxx`;
          }
          return true;
        },
      },
    ]);

    console.log('\nValidating Bluesky connection...');

    const result = await validateBlueskyConnection(
      handleAnswer.handle,
      passwordAnswer.appPassword
    );

    if (result.valid) {
      console.log('✓ Connection successful');
      return {
        platform: 'bluesky',
        handle: handleAnswer.handle,
        appPassword: passwordAnswer.appPassword,
      };
    }

    console.log(`\n❌ ${result.error}`);
    if (result.helpUrl) {
      console.log(`ℹ️  Need help? Visit: ${result.helpUrl}`);
    }
    console.log('\nPlease try again.\n');
  }
}
