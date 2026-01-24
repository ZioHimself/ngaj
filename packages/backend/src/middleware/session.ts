/**
 * Session Configuration Middleware
 *
 * Configures express-session for simple token authentication.
 * Uses in-memory session storage (acceptable for single-user local app).
 *
 * @see ADR-014: Simple Token Authentication
 */

import session from 'express-session';
import crypto from 'crypto';

/**
 * Configure session middleware for the Express app.
 *
 * Session configuration:
 * - Uses LOGIN_SECRET from env as session secret (or generates fallback)
 * - HttpOnly cookies (not accessible via JavaScript)
 * - SameSite=Strict for CSRF protection
 * - Session-scoped (no Max-Age, expires on browser close)
 * - Cookie name: ngaj.sid
 *
 * @returns Configured express-session middleware
 */
export function configureSession() {
  return session({
    // Use LOGIN_SECRET as session secret, or generate random fallback
    secret: process.env.LOGIN_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: false, // No HTTPS on local network
      // No maxAge = session cookie (expires on browser close)
    },
    name: 'ngaj.sid',
  });
}
