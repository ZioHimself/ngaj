/**
 * Activation Worker Types
 *
 * Types for the Cloudflare Worker that handles activation API.
 * Includes all client endpoints, admin endpoints, and KV storage types.
 *
 * @see ADR-020 for decision rationale
 * @see .agents/artifacts/designer/designs/activation-system-design.md for full spec
 */

// -----------------------------------------------------------------------------
// Cloudflare Worker Environment
// -----------------------------------------------------------------------------

/** Cloudflare Worker environment bindings */
export interface Env {
  /** KV namespace for activation records */
  ACTIVATIONS: KVNamespace;
  /** Admin bearer token for admin endpoints */
  ADMIN_SECRET: string;
  /** Stale session timeout in milliseconds (default: 600000 = 10 min) */
  STALE_TIMEOUT_MS: string;
  /** Heartbeat interval in milliseconds (default: 300000 = 5 min) */
  HEARTBEAT_INTERVAL_MS: string;
}

// -----------------------------------------------------------------------------
// KV Storage Types
// -----------------------------------------------------------------------------

/** Active session data stored in ActivationRecord */
export interface ActiveSession {
  /** SHA256 hash of (HOST_MACHINE_ID + ACTIVATION_SALT) */
  device_fingerprint: string;
  /** Last heartbeat timestamp (ISO 8601) */
  last_heartbeat_at: string;
  /** When this session started (ISO 8601) */
  started_at: string;
}

/** Stored in KV at key `activation:{key}` */
export interface ActivationRecord {
  /** The activation key (NGAJ-{uuid}) */
  key: string;
  /** When the key was created (ISO 8601) */
  created_at: string;
  /** Key status */
  status: 'active' | 'revoked';
  /** Optional label for caretaker reference */
  label?: string;
  /** Current active session (null if no active session) */
  current_session: ActiveSession | null;
}

// -----------------------------------------------------------------------------
// Client Request Types
// -----------------------------------------------------------------------------

/** POST /api/v1/activate request */
export interface ActivateRequest {
  key: string;
  device_fingerprint: string;
}

/** POST /api/v1/validate request */
export interface ValidateRequest {
  key: string;
  device_fingerprint: string;
}

/** POST /api/v1/heartbeat request */
export interface HeartbeatRequest {
  key: string;
  device_fingerprint: string;
}

/** POST /api/v1/deactivate request */
export interface DeactivateRequest {
  key: string;
  device_fingerprint: string;
}

// -----------------------------------------------------------------------------
// Client Response Types
// -----------------------------------------------------------------------------

/** Success response for activate/validate/deactivate */
export interface ClientSuccessResponse {
  success: true;
}

/** Success response for heartbeat */
export interface HeartbeatSuccessResponse {
  success: true;
  /** Seconds until next heartbeat (default: 300) */
  next_heartbeat_seconds: number;
}

/** Error codes for client endpoints */
export type ClientErrorCode =
  | 'invalid_key'
  | 'concurrent_session'
  | 'revoked'
  | 'session_expired';

/** Error response for client endpoints */
export interface ClientErrorResponse {
  success: false;
  error: ClientErrorCode;
  message: string;
  /** Seconds to wait before retry (for concurrent_session) */
  retry_after_seconds?: number;
}

// -----------------------------------------------------------------------------
// Admin Request Types
// -----------------------------------------------------------------------------

/** POST /api/v1/admin/keys request */
export interface CreateKeyRequest {
  label?: string;
}

// -----------------------------------------------------------------------------
// Admin Response Types
// -----------------------------------------------------------------------------

/** POST /api/v1/admin/keys response */
export interface CreateKeyResponse {
  key: string;
  created_at: string;
}

/** Session info with computed staleness */
export interface SessionWithStaleness extends ActiveSession {
  /** Whether last_heartbeat_at is older than stale timeout */
  is_stale: boolean;
}

/** Key summary for list response */
export interface KeySummary {
  key: string;
  status: 'active' | 'revoked';
  label?: string;
  created_at: string;
  current_session: SessionWithStaleness | null;
}

/** GET /api/v1/admin/keys response */
export interface ListKeysResponse {
  keys: KeySummary[];
}

/** GET /api/v1/admin/keys/:key response */
export interface GetKeyResponse extends ActivationRecord {}

/** DELETE /api/v1/admin/keys/:key response */
export interface RevokeKeyResponse {
  success: true;
  key: string;
  status: 'revoked';
}

/** Admin error response */
export interface AdminErrorResponse {
  error: 'not_found' | 'unauthorized';
  message: string;
}

// -----------------------------------------------------------------------------
// KV Key Prefix
// -----------------------------------------------------------------------------

/** Prefix for activation record keys in KV */
export const KV_PREFIX = 'activation:';
