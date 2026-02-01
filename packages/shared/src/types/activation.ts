/**
 * Activation System Types
 *
 * Types for the heartbeat-based activation system that prevents unauthorized
 * and concurrent ngaj installations.
 *
 * @see ADR-020 for decision rationale
 * @see .agents/artifacts/designer/designs/activation-system-design.md for full spec
 *
 * @module types/activation
 */

// -----------------------------------------------------------------------------
// Device Fingerprint
// -----------------------------------------------------------------------------

/**
 * SHA256 hash of (HOST_MACHINE_ID + ACTIVATION_SALT).
 * 64-character hex string.
 */
export type DeviceFingerprint = string;

/**
 * Activation key format: NGAJ-{UUID}
 * Example: NGAJ-550e8400-e29b-41d4-a716-446655440000
 */
export type ActivationKey = string;

/**
 * Random 32-character string generated during setup.
 * Combined with HOST_MACHINE_ID to create DeviceFingerprint.
 */
export type ActivationSalt = string;

// -----------------------------------------------------------------------------
// Client API Types (used by ngaj backend)
// -----------------------------------------------------------------------------

/** POST /api/v1/activate request */
export interface ActivateRequest {
  key: ActivationKey;
  device_fingerprint: DeviceFingerprint;
}

/** POST /api/v1/validate request */
export interface ValidateRequest {
  key: ActivationKey;
  device_fingerprint: DeviceFingerprint;
}

/** POST /api/v1/heartbeat request */
export interface HeartbeatRequest {
  key: ActivationKey;
  device_fingerprint: DeviceFingerprint;
}

/** POST /api/v1/deactivate request */
export interface DeactivateRequest {
  key: ActivationKey;
  device_fingerprint: DeviceFingerprint;
}

/** Success response for activate/validate/deactivate */
export interface ActivationSuccessResponse {
  success: true;
}

/** Success response for heartbeat */
export interface HeartbeatSuccessResponse {
  success: true;
  /** Seconds until next heartbeat should be sent (default: 300) */
  next_heartbeat_seconds: number;
}

/** Error codes returned by activation API */
export type ActivationErrorCode =
  | 'invalid_key'
  | 'concurrent_session'
  | 'revoked'
  | 'session_expired';

/** Error response from activation API */
export interface ActivationErrorResponse {
  success: false;
  error: ActivationErrorCode;
  message: string;
  /** Seconds to wait before retry (for concurrent_session) */
  retry_after_seconds?: number;
}

/** Union type for activation responses */
export type ActivationResponse = ActivationSuccessResponse | ActivationErrorResponse;
export type HeartbeatResponse = HeartbeatSuccessResponse | ActivationErrorResponse;

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

/** Environment variables for activation */
export interface ActivationEnvVars {
  /** Activation key (NGAJ-{UUID}) */
  ACTIVATION_KEY: ActivationKey;
  /** Random salt generated during setup */
  ACTIVATION_SALT: ActivationSalt;
  /** Host machine ID (injected by startup script) */
  HOST_MACHINE_ID: string;
}

/** Activation server configuration */
export interface ActivationServerConfig {
  /** Activation API base URL */
  apiUrl: string;
  /** Request timeout in milliseconds (default: 5000) */
  timeoutMs: number;
}

// -----------------------------------------------------------------------------
// Timing Constants
// -----------------------------------------------------------------------------

/** Heartbeat interval in milliseconds (5 minutes) */
export const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

/** Stale session timeout in milliseconds (10 minutes) */
export const STALE_TIMEOUT_MS = 10 * 60 * 1000;

/** API request timeout in milliseconds */
export const API_TIMEOUT_MS = 5000;

/** Default activation API URL */
export const DEFAULT_ACTIVATION_API_URL = 'https://ngaj-activation.ziohimself.workers.dev';

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

/** Regex pattern for activation key format */
export const ACTIVATION_KEY_PATTERN = /^NGAJ-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates activation key format */
export function isValidActivationKey(key: string): key is ActivationKey {
  return ACTIVATION_KEY_PATTERN.test(key);
}

/** Validates device fingerprint format (64 hex chars) */
export function isValidDeviceFingerprint(fingerprint: string): fingerprint is DeviceFingerprint {
  return /^[0-9a-f]{64}$/i.test(fingerprint);
}

// -----------------------------------------------------------------------------
// Type Guards
// -----------------------------------------------------------------------------

/** Type guard for ActivationSuccessResponse */
export function isActivationSuccess(
  response: ActivationResponse
): response is ActivationSuccessResponse {
  return response.success === true;
}

/** Type guard for HeartbeatSuccessResponse */
export function isHeartbeatSuccess(
  response: HeartbeatResponse
): response is HeartbeatSuccessResponse {
  return response.success === true && 'next_heartbeat_seconds' in response;
}

/** Type guard for ActivationErrorResponse */
export function isActivationError(
  response: ActivationResponse | HeartbeatResponse
): response is ActivationErrorResponse {
  return response.success === false;
}
