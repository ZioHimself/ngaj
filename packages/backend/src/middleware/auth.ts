/**
 * Authentication Middleware
 *
 * Protects routes requiring authentication and allows public routes.
 * @see ADR-014: Simple Token Authentication
 */

import type { Request, Response, NextFunction } from 'express';
import { isPublicRoute } from '@ngaj/shared';

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
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Allow public routes (no authentication required)
  if (isPublicRoute(req.path)) {
    return next();
  }

  // Check session authentication
  if (req.session?.authenticated) {
    return next();
  }

  // API requests return 401 Unauthorized (JSON response)
  if (req.path.startsWith('/api/')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Page requests redirect to login
  res.redirect('/login');
}
