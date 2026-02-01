/**
 * Caretaker CLI Types
 *
 * Types for the interactive CLI tool that manages activation keys.
 * Includes configuration, admin API types, and display formatting.
 *
 * @see ADR-020 for decision rationale
 * @see .agents/artifacts/designer/designs/activation-system-design.md for full spec
 */

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

/** Caretaker CLI configuration */
export interface CaretakerConfig {
  /** Admin bearer token for API authentication */
  adminSecret: string;
  /** Activation API base URL */
  apiUrl: string;
}

/** Environment variable names for configuration */
export const CONFIG_ENV_VARS = {
  /** Admin secret environment variable */
  ADMIN_SECRET: 'NGAJ_ADMIN_SECRET',
  /** API URL environment variable (optional) */
  API_URL: 'NGAJ_ACTIVATION_API',
} as const;

/** Default activation API URL */
export const DEFAULT_API_URL = 'https://ngaj-activation.ziohimself.workers.dev';

// -----------------------------------------------------------------------------
// Menu Types
// -----------------------------------------------------------------------------

/** Main menu action choices */
export type MenuAction = 'create' | 'list' | 'get' | 'revoke' | 'exit';

/** Menu choice for inquirer */
export interface MenuChoice {
  name: string;
  value: MenuAction;
}

// -----------------------------------------------------------------------------
// Admin API Request Types
// -----------------------------------------------------------------------------

/** POST /api/v1/admin/keys request */
export interface CreateKeyRequest {
  label?: string;
}

// -----------------------------------------------------------------------------
// Admin API Response Types
// -----------------------------------------------------------------------------

/** Active session data */
export interface ActiveSession {
  /** Device fingerprint hash */
  device_fingerprint: string;
  /** Last heartbeat timestamp (ISO 8601) */
  last_heartbeat_at: string;
  /** Session start timestamp (ISO 8601) */
  started_at: string;
}

/** Session with computed staleness flag */
export interface SessionWithStaleness extends ActiveSession {
  /** Whether session is stale (no heartbeat for > 10 min) */
  is_stale: boolean;
}

/** Key summary in list response */
export interface KeySummary {
  key: string;
  status: 'active' | 'revoked';
  label?: string;
  created_at: string;
  current_session: SessionWithStaleness | null;
}

/** POST /api/v1/admin/keys response */
export interface CreateKeyResponse {
  key: string;
  created_at: string;
}

/** GET /api/v1/admin/keys response */
export interface ListKeysResponse {
  keys: KeySummary[];
}

/** GET /api/v1/admin/keys/:key response */
export interface GetKeyResponse {
  key: string;
  created_at: string;
  status: 'active' | 'revoked';
  label?: string;
  current_session: ActiveSession | null;
}

/** DELETE /api/v1/admin/keys/:key response */
export interface RevokeKeyResponse {
  success: true;
  key: string;
  status: 'revoked';
}

// -----------------------------------------------------------------------------
// API Error Types
// -----------------------------------------------------------------------------

/** API error response */
export interface ApiErrorResponse {
  error: string;
  message: string;
}

/** Custom error for API failures */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// -----------------------------------------------------------------------------
// Display Formatting
// -----------------------------------------------------------------------------

/** Formatted key for table display */
export interface FormattedKey {
  /** Truncated key (last 8 chars) */
  shortKey: string;
  /** Full key */
  fullKey: string;
  /** Status string */
  status: string;
  /** Label or '-' */
  label: string;
  /** Human-readable last seen time */
  lastSeen: string;
}

/** Table column widths for list display */
export const TABLE_COLUMNS = {
  KEY: 14,      // "...44000000" = last 8 chars + "..."
  STATUS: 9,    // "active" or "revoked"
  LABEL: 21,    // truncated to 20 chars
  LAST_SEEN: 20,
} as const;
