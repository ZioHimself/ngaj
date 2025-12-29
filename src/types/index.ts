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
} from './profile';
export { isProfile } from './profile';

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
} from './account';
export { isAccount } from './account';

