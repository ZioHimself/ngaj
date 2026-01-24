/**
 * Authentication Routes
 *
 * Handles login, logout, and auth status endpoints.
 * @see ADR-014: Simple Token Authentication
 */

import { Router } from 'express';

const router = Router();

/**
 * POST /api/auth/login
 *
 * Validates login code and creates session.
 *
 * Request body:
 * - code: string - The login secret code
 *
 * Response:
 * - 200: { success: true } - Login successful
 * - 401: { error: string, message: string } - Invalid code
 * - 500: { error: string, message: string } - Configuration error
 */
router.post('/login', (_req, _res) => {
  throw new Error('Not implemented');
});

/**
 * POST /api/auth/logout
 *
 * Destroys session and clears cookie.
 *
 * Response:
 * - 200: { success: true } - Logout successful
 * - 500: { error: string } - Logout failed
 */
router.post('/logout', (_req, _res) => {
  throw new Error('Not implemented');
});

/**
 * GET /api/auth/status
 *
 * Returns current authentication status.
 *
 * Response:
 * - 200: { authenticated: boolean }
 */
router.get('/status', (_req, _res) => {
  throw new Error('Not implemented');
});

export default router;
