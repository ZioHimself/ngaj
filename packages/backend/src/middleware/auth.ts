/**
 * Authentication Middleware
 *
 * Protects routes requiring authentication and allows public routes.
 * @see ADR-014: Simple Token Authentication
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware that checks for valid session.
 *
 * - Public routes (health, login, static assets) pass through
 * - Protected API routes return 401 Unauthorized
 * - Protected page routes redirect to /login
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export function authMiddleware(
  _req: Request,
  _res: Response,
  _next: NextFunction
): void {
  throw new Error('Not implemented');
}
