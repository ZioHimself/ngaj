/**
 * Setup Wizard - Interactive prompts for credential collection
 */

import type { SetupConfiguration } from '@ngaj/shared';

import { promptBlueskyCredentials } from './bluesky.js';
import { promptAnthropicCredentials } from './anthropic.js';
import { writeEnvFile } from '../writers/env-writer.js';

/**
 * Run the complete setup wizard flow
 */
export async function runSetupWizard(): Promise<SetupConfiguration> {
  // Step 1: Collect Bluesky credentials
  console.log('[1/2] Bluesky Credentials');
  console.log('────────────────────────────');
  console.log('ℹ️  Create an app password at: https://bsky.app/settings/app-passwords\n');
  const blueskyCredentials = await promptBlueskyCredentials();
  
  console.log('');
  
  // Step 2: Collect Claude API key
  console.log('[2/2] Claude API Key');
  console.log('────────────────────────────');
  const anthropicCredentials = await promptAnthropicCredentials();
  
  // Write credentials to .env file
  const config: SetupConfiguration = {
    platformCredentials: [blueskyCredentials],
    aiCredentials: anthropicCredentials,
    completedAt: new Date(),
  };
  
  await writeEnvFile(config);
  
  return config;
}
