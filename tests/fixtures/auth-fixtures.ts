/**
 * Auth Test Fixtures
 *
 * Test data for simple token authentication testing.
 * @see ADR-014: Simple Token Authentication
 */

import type {
  LoginRequest,
  LoginSuccessResponse,
  LoginErrorResponse,
  AuthStatusResponse,
  LogoutResponse,
} from '@ngaj/shared';

// ============================================================================
// Login Secrets
// ============================================================================

/**
 * Valid test login secret in correct format
 */
export const TEST_LOGIN_SECRET = 'TEST-1234-ABCD-5678';

/**
 * Alternative valid login secrets for testing
 */
export const validLoginSecrets = [
  'A1B2-C3D4-E5F6-G7H8',
  'XXXX-YYYY-ZZZZ-0000',
  'AB12-CD34-EF56-GH78',
  '_.+:-,@._-+:,.-@_+:', // Special characters only (valid 4-char segments)
  'A@B.-C:D+-E,F.-_G@H', // Mixed alphanumeric and special (valid 4-char segments)
];

/**
 * Invalid login secret formats for validation testing
 */
export const invalidLoginSecrets = {
  empty: '',
  tooShort: 'A1B2-C3D4',
  tooLong: 'A1B2-C3D4-E5F6-G7H8-I9J0',
  missingDashes: 'A1B2C3D4E5F6G7H8',
  wrongSegmentLength: 'A1B-C3D4-E5F6-G7H8',
  extraDash: 'A1B2-C3D4-E5F6-G7H8-',
  spacesInsteadOfDashes: 'A1B2 C3D4 E5F6 G7H8',
  lowercase: 'a1b2-c3d4-e5f6-g7h8', // Valid for input but not storage format
  specialInvalidChars: 'A1B!-C3D4-E5F6-G7H8', // ! is not in charset
  leadingSpace: ' A1B2-C3D4-E5F6-G7H8',
  trailingSpace: 'A1B2-C3D4-E5F6-G7H8 ',
};

// ============================================================================
// Login Requests
// ============================================================================

/**
 * Valid login request
 */
export const validLoginRequest: LoginRequest = {
  code: TEST_LOGIN_SECRET,
};

/**
 * Factory function to create login request
 */
export const createLoginRequest = (code: string): LoginRequest => ({
  code,
});

/**
 * Invalid login requests for testing
 */
export const invalidLoginRequests = {
  emptyCode: createLoginRequest(''),
  wrongCode: createLoginRequest('WRONG-CODE-HERE-1234'),
  partialCode: createLoginRequest('A1B2-C3D4'),
};

// ============================================================================
// Login Responses
// ============================================================================

/**
 * Successful login response
 */
export const loginSuccessResponse: LoginSuccessResponse = {
  success: true,
};

/**
 * Invalid code error response
 */
export const invalidCodeErrorResponse: LoginErrorResponse = {
  error: 'Invalid code',
  message: 'The access code is incorrect',
};

/**
 * Missing secret configuration error response
 */
export const configErrorResponse: LoginErrorResponse = {
  error: 'Configuration error',
  message: 'LOGIN_SECRET not configured',
};

// ============================================================================
// Auth Status Responses
// ============================================================================

/**
 * Authenticated status response
 */
export const authenticatedStatusResponse: AuthStatusResponse = {
  authenticated: true,
};

/**
 * Unauthenticated status response
 */
export const unauthenticatedStatusResponse: AuthStatusResponse = {
  authenticated: false,
};

// ============================================================================
// Logout Responses
// ============================================================================

/**
 * Successful logout response
 */
export const logoutSuccessResponse: LogoutResponse = {
  success: true,
};

// ============================================================================
// Route Test Data
// ============================================================================

/**
 * Public routes that should not require authentication
 */
export const publicRoutes = ['/health', '/login', '/api/auth/login'];

/**
 * Public static asset prefixes
 */
export const publicPrefixes = ['/assets/', '/favicon'];

/**
 * Example public asset paths
 */
export const publicAssetPaths = [
  '/assets/logo.png',
  '/assets/styles.css',
  '/assets/bundle.js',
  '/favicon.ico',
  '/favicon.png',
];

/**
 * Protected routes that should require authentication
 */
export const protectedRoutes = [
  '/',
  '/dashboard',
  '/settings',
  '/opportunities',
  '/knowledge-base',
];

/**
 * Protected API routes that should require authentication
 */
export const protectedApiRoutes = [
  '/api/opportunities',
  '/api/accounts',
  '/api/profiles',
  '/api/knowledge-base',
  '/api/auth/logout',
  '/api/auth/status',
];

// ============================================================================
// Session Test Data
// ============================================================================

/**
 * Mock session data - authenticated
 */
export const authenticatedSession = {
  authenticated: true,
};

/**
 * Mock session data - unauthenticated
 */
export const unauthenticatedSession = {
  authenticated: false,
};

/**
 * Mock session with destroy method
 */
export const createMockSession = (authenticated: boolean = false) => ({
  authenticated,
  destroy: (callback: (err?: Error) => void) => callback(),
});

// ============================================================================
// Code Normalization Test Cases
// ============================================================================

/**
 * Test cases for code normalization (input -> expected normalized)
 */
export const codeNormalizationCases = [
  { input: 'a1b2-c3d4-e5f6-g7h8', expected: 'A1B2-C3D4-E5F6-G7H8' },
  { input: 'A1B2-C3D4-E5F6-G7H8', expected: 'A1B2-C3D4-E5F6-G7H8' },
  { input: '  A1B2-C3D4-E5F6-G7H8  ', expected: 'A1B2-C3D4-E5F6-G7H8' },
  { input: '\tA1B2-C3D4-E5F6-G7H8\n', expected: 'A1B2-C3D4-E5F6-G7H8' },
  { input: 'a1B2-c3D4-e5F6-g7H8', expected: 'A1B2-C3D4-E5F6-G7H8' },
];

// ============================================================================
// Cookie Configuration
// ============================================================================

/**
 * Expected session cookie configuration
 */
export const expectedCookieConfig = {
  name: 'ngaj.sid',
  httpOnly: true,
  sameSite: 'strict',
  secure: false, // No HTTPS on local network
  maxAge: undefined, // Session cookie
};

// ============================================================================
// Terminal Display Test Data
// ============================================================================

/**
 * Expected terminal output format with login code
 */
export const expectedTerminalOutput = (loginSecret: string, lanIp?: string) => {
  const lines = [
    '✓ Backend running',
    '',
    '  Local access:   http://localhost:3000',
  ];

  if (lanIp) {
    lines.push(`  Network access: http://${lanIp}:3000`);
    lines.push('  (Use this URL from your mobile device on the same WiFi)');
  }

  lines.push('');
  lines.push(`  Login code: ${loginSecret}`);
  lines.push('  (Enter this code when prompted in your browser)');

  return lines.join('\n');
};
