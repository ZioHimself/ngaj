/**
 * Wizard Service
 *
 * Service for first-launch wizard operations: profile creation,
 * connection testing, account creation, and discovery configuration.
 *
 * @see ADR-012: First-Launch Setup Wizard
 */

import type {
  WizardProfileInput,
  WizardAccountInput,
  WizardDiscoveryInput,
  TestConnectionInput,
  TestConnectionResult,
} from '@ngaj/shared';
import type { Profile, Account } from '@ngaj/shared';

export interface WizardServiceDb {
  collection: (name: string) => any;
}

export class WizardService {
  constructor(private readonly db: WizardServiceDb) {}

  /**
   * Check if any profile exists in the database.
   * Used to determine if wizard should be shown.
   */
  async hasProfile(): Promise<boolean> {
    // Will use: this.db.collection('profiles').countDocuments({})
    void this.db;
    throw new Error('Not implemented');
  }

  /**
   * Get existing profile data for form pre-population.
   * Returns null if no profile exists.
   */
  async getExistingWizardData(): Promise<WizardProfileInput | null> {
    throw new Error('Not implemented');
  }

  /**
   * Create a profile from wizard input.
   * Transforms simplified wizard fields to full profile format.
   */
  async createProfileFromWizard(_input: WizardProfileInput): Promise<Profile> {
    throw new Error('Not implemented');
  }

  /**
   * Test connection to platform using credentials from .env.
   * Returns success status and handle or error message.
   */
  async testConnection(_input: TestConnectionInput): Promise<TestConnectionResult> {
    throw new Error('Not implemented');
  }

  /**
   * Create account from wizard input.
   * Reads handle from environment variables.
   */
  async createAccountFromWizard(_input: WizardAccountInput): Promise<Account> {
    throw new Error('Not implemented');
  }

  /**
   * Set discovery schedule for account using preset.
   * Applies same cron expression to both replies and search schedules.
   */
  async setDiscoverySchedule(
    _accountId: string,
    _input: WizardDiscoveryInput
  ): Promise<Account> {
    throw new Error('Not implemented');
  }
}
