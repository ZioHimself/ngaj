/**
 * Authentication Routes
 *
 * Handles login, logout, and auth status endpoints.
 * @see ADR-014: Simple Token Authentication
 */

import { Router } from 'express';
import { normalizeLoginCode } from '@ngaj/shared';

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
router.post('/login', (req, res) => {
  const { code } = req.body;
  const secret = process.env.LOGIN_SECRET;

  // Check if LOGIN_SECRET is configured
  if (!secret) {
    return res.status(500).json({
      error: 'Configuration error',
      message: 'LOGIN_SECRET not configured',
    });
  }

  // Normalize input (uppercase, trim whitespace)
  const normalizedCode = code ? normalizeLoginCode(String(code)) : '';

  // Validate code against secret
  if (normalizedCode === secret) {
    req.session.authenticated = true;
    return res.json({ success: true });
  }

  return res.status(401).json({
    error: 'Invalid code',
    message: 'The access code is incorrect',
  });
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
router.post('/logout', (req, res) => {
  req.session.destroy((err: Error | undefined) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('ngaj.sid');
    return res.json({ success: true });
  });
});

/**
 * GET /api/auth/status
 *
 * Returns current authentication status.
 *
 * Response:
 * - 200: { authenticated: boolean }
 */
router.get('/status', (req, res) => {
  return res.json({
    authenticated: !!req.session?.authenticated,
  });
});

export default router;
