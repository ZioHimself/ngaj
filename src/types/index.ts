/**
 * Central export point for all ngaj TypeScript types.
 * 
 * @module types
 */

// Profile types
export type {
  Profile,
  VoiceConfig,
  DiscoveryConfig,
  CreateProfileInput,
  UpdateProfileInput,
} from './profile.js';
export { isProfile } from './profile.js';

// Account types
export type {
  Platform,
  AccountStatus,
  Account,
  AccountDiscoveryConfig,
  DiscoverySchedule,
  CreateAccountInput,
  UpdateAccountInput,
  AccountWithProfile,
} from './account.js';
export { isAccount } from './account.js';

