/**
 * Anthropic (Claude) credential prompts and validation
 */

import inquirer from 'inquirer';
import type { AnthropicCredentials } from '@ngaj/shared';
import { CREDENTIAL_PATTERNS, CREDENTIAL_HELP_URLS } from '@ngaj/shared';
import { validateAnthropicConnection } from '../validators/anthropic.js';
import { showPasteInstructions } from '../utils/paste-instructions.js';

/**
 * Prompt for Anthropic API key with validation
 */
export async function promptAnthropicCredentials(): Promise<AnthropicCredentials> {
  while (true) {
    // Show paste instructions before password prompt
    showPasteInstructions();

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Anthropic API key:',
        mask: '*',
        validate: (input: string) => {
          if (!CREDENTIAL_PATTERNS.anthropicApiKey.test(input)) {
            return `Invalid format. API key should start with sk-ant-`;
          }
          return true;
        },
      },
    ]);

    console.log('\nValidating Claude API connection...');
    
    const result = await validateAnthropicConnection(answers.apiKey);

    if (result.valid) {
      console.log('✓ Connection successful');
      return {
        provider: 'anthropic',
        apiKey: answers.apiKey,
      };
    }

    console.log(`\n❌ ${result.error}`);
    console.log(`ℹ️  Get your API key: ${CREDENTIAL_HELP_URLS.anthropicApiKey}`);
    console.log('\nPlease try again.\n');
  }
}
