/**
 * Bluesky credential prompts and validation
 */

import inquirer from 'inquirer';
import type { BlueskyCredentials } from '@ngaj/shared';
import { CREDENTIAL_PATTERNS } from '@ngaj/shared';
import { validateBlueskyConnection } from '../validators/bluesky.js';

/**
 * Prompt for Bluesky credentials with validation
 */
export async function promptBlueskyCredentials(): Promise<BlueskyCredentials> {
  while (true) {
    const answers = await inquirer.prompt([
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
      answers.handle,
      answers.appPassword
    );

    if (result.valid) {
      console.log('✓ Connection successful');
      return {
        platform: 'bluesky',
        handle: answers.handle,
        appPassword: answers.appPassword,
      };
    }

    console.log(`\n❌ ${result.error}`);
    if (result.helpUrl) {
      console.log(`ℹ️  Need help? Visit: ${result.helpUrl}`);
    }
    console.log('\nPlease try again.\n');
  }
}
