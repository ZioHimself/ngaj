/**
 * Authentication Types
 *
 * Simple token authentication for local network access protection.
 * See ADR-014 for design rationale.
 */

// =============================================================================
// Login Secret
// =============================================================================

/**
 * Login secret format: XXXX-XXXX-XXXX-XXXX
 * 16 characters from extended charset (A-Z, 0-9, and safe special chars) with dashes
 */
export type LoginSecret = string;

/**
 * Pattern for validating login secret format
 * Allows: A-Z, 0-9, _, ., +, :, ,, @
 */
export const LOGIN_SECRET_PATTERN = /^[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}-[A-Z0-9_.+:,@]{4}$/;

/**
 * Character set for generating login secrets
 * Includes uppercase letters, digits, and shell-safe special characters
 * Total: 42 characters (36 alphanumeric + 6 special)
 */
export const LOGIN_SECRET_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.+:,@';

/**
 * Login secret segment configuration
 */
export const LOGIN_SECRET_CONFIG = {
  segmentLength: 4,
  segmentCount: 4,
  separator: '-',
} as const;

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Login request body
 */
export interface LoginRequest {
  /** The access code entered by the user */
  code: string;
}

/**
 * Login response (success)
 */
export interface LoginSuccessResponse {
  success: true;
}

/**
 * Login response (error)
 */
export interface LoginErrorResponse {
  error: string;
  message: string;
}

/**
 * Combined login response type
 */
export type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

/**
 * Auth status response
 */
export interface AuthStatusResponse {
  /** Whether the current session is authenticated */
  authenticated: boolean;
}

/**
 * Logout response
 */
export interface LogoutResponse {
  success: boolean;
}

// =============================================================================
// Session Types
// =============================================================================

/**
 * Session data stored in memory
 */
export interface SessionData {
  /** Whether the user has authenticated */
  authenticated?: boolean;
}

// =============================================================================
// Route Protection
// =============================================================================

/**
 * Routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  '/health',
  '/login',
  '/api/auth/login',
] as const;

/**
 * Static asset prefixes that don't require authentication
 */
export const PUBLIC_PREFIXES = [
  '/assets/',
  '/favicon',
] as const;

/**
 * Check if a route is public (no auth required)
 */
export function isPublicRoute(path: string): boolean {
  if (PUBLIC_ROUTES.includes(path as (typeof PUBLIC_ROUTES)[number])) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate login secret format
 */
export function isValidLoginSecretFormat(secret: string): boolean {
  return LOGIN_SECRET_PATTERN.test(secret);
}

/**
 * Normalize login code input (uppercase, trim whitespace)
 */
export function normalizeLoginCode(code: string): string {
  return code.toUpperCase().trim();
}

// =============================================================================
// Generation
// =============================================================================

/**
 * Generates a login secret in format XXXX-XXXX-XXXX-XXXX.
 *
 * Uses cryptographically random values from the allowed character set:
 * - Uppercase letters: A-Z (26)
 * - Digits: 0-9 (10)
 * - Safe special chars: _, ., +, :, ,, @ (6)
 *
 * Total entropy: 42^16 ≈ 1.3 × 10^26 combinations
 *
 * @returns A randomly generated login secret string
 *
 * @example
 * const secret = generateLoginSecret();
 * // Returns something like "A1B2-C3D4-E5F6-G7H8"
 */
export function generateLoginSecret(): string {
  const { segmentLength, segmentCount, separator } = LOGIN_SECRET_CONFIG;
  const segments: string[] = [];
  const totalLength = segmentLength * segmentCount;

  // Generate all random bytes at once
  const randomValues = new Uint8Array(totalLength);
  
  // Use globalThis.crypto.getRandomValues - available in:
  // - All modern browsers
  // - Node.js 19+ (global)
  // - Node.js 15+ with webcrypto polyfill
  globalThis.crypto.getRandomValues(randomValues);

  for (let i = 0; i < segmentCount; i++) {
    let segment = '';
    for (let j = 0; j < segmentLength; j++) {
      const byteIndex = i * segmentLength + j;
      const randomIndex = randomValues[byteIndex] % LOGIN_SECRET_CHARSET.length;
      segment += LOGIN_SECRET_CHARSET.charAt(randomIndex);
    }
    segments.push(segment);
  }

  return segments.join(separator);
}
