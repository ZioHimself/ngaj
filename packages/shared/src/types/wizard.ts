/**
 * First-Launch Wizard Types
 * 
 * Types for the web UI setup wizard that creates Profile and Account
 * on first application launch.
 * 
 * @see ADR-012: First-Launch Setup Wizard
 * @see Design Doc: .agents/artifacts/designer/designs/first-launch-wizard-design.md
 */

import type { Platform } from './account.js';

// ============================================================================
// Wizard Step Types
// ============================================================================

/**
 * Wizard step identifier.
 */
export type WizardStep = 1 | 2 | 3;

/**
 * Wizard state for frontend navigation.
 */
export interface WizardState {
  /** Current step (1-3) */
  currentStep: WizardStep;
  
  /** Profile ID after Step 1 completion */
  profileId?: string;
  
  /** Account ID after Step 2 completion */
  accountId?: string;
  
  /** Whether connection test passed in Step 2 */
  connectionTested: boolean;
}

// ============================================================================
// Step 1: Profile Input
// ============================================================================

/**
 * Simplified profile input for wizard Step 1.
 * Maps to CreateProfileInput with field transformations.
 */
export interface WizardProfileInput {
  /** Profile name (3-100 chars) */
  name: string;
  
  /** Voice description (10-500 chars) - maps to voice.style */
  voice: string;
  
  /** Principles (10-500 chars) */
  principles: string;
  
  /** Interest tags (max 20, each max 30 chars) - maps to discovery.interests */
  interests: string[];
}

// ============================================================================
// Step 2: Connection Test
// ============================================================================

/**
 * Input for connection test endpoint.
 */
export interface TestConnectionInput {
  /** Platform to test (v0.1: only 'bluesky') */
  platform: Platform;
}

/**
 * Result of connection test.
 */
export interface TestConnectionResult {
  /** Whether connection succeeded */
  success: boolean;
  
  /** Handle from .env (for display) */
  handle: string;
  
  /** Error message if failed */
  error?: string;
}

/**
 * Simplified account input for wizard Step 2.
 * ProfileId and handle come from wizard state and .env.
 */
export interface WizardAccountInput {
  /** Profile to link account to */
  profileId: string;
  
  /** Platform (v0.1: only 'bluesky') */
  platform: Platform;
}

// ============================================================================
// Step 3: Discovery Schedule
// ============================================================================

/**
 * Preset schedule options for wizard.
 * Simplified from full cron expression.
 */
export type DiscoverySchedulePreset = '15min' | '30min' | '1hr' | '2hr' | '4hr';

/**
 * Mapping of preset to cron expression.
 */
export const SCHEDULE_PRESET_CRON: Record<DiscoverySchedulePreset, string> = {
  '15min': '*/15 * * * *',
  '30min': '*/30 * * * *',
  '1hr': '0 * * * *',
  '2hr': '0 */2 * * *',
  '4hr': '0 */4 * * *',
};

/**
 * Display labels for schedule presets.
 */
export const SCHEDULE_PRESET_LABELS: Record<DiscoverySchedulePreset, string> = {
  '15min': 'Every 15 minutes',
  '30min': 'Every 30 minutes',
  '1hr': 'Every 1 hour (recommended)',
  '2hr': 'Every 2 hours',
  '4hr': 'Every 4 hours',
};

/**
 * Default schedule preset.
 */
export const DEFAULT_SCHEDULE_PRESET: DiscoverySchedulePreset = '1hr';

/**
 * Simplified discovery input for wizard Step 3.
 */
export interface WizardDiscoveryInput {
  /** Selected schedule preset */
  schedulePreset: DiscoverySchedulePreset;
}

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * Validation limits for wizard fields.
 */
export const WIZARD_VALIDATION = {
  name: { min: 3, max: 100 },
  voice: { min: 10, max: 500 },
  principles: { min: 10, max: 500 },
  interests: { maxTags: 20, maxTagLength: 30 },
} as const;
