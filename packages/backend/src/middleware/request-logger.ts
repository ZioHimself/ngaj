/**
 * HTTP Request Logger Middleware
 *
 * Logs all HTTP requests with method, path, status code, and duration.
 * Uses appropriate log level based on response status:
 * - 2xx: info
 * - 4xx: warn
 * - 5xx: error
 *
 * @see ADR-017: Structured Logging Strategy
 * @see Design: .agents/artifacts/designer/designs/structured-logging-design.md
 */

import type { Request, Response, NextFunction } from 'express';
import { createComponentLogger } from '../utils/logger.js';
import type pino from 'pino';

// Lazy-initialized HTTP component logger to support test injection
let _httpLogger: pino.Logger | null = null;

function getHttpLogger(): pino.Logger {
  if (!_httpLogger) {
    _httpLogger = createComponentLogger('http');
  }
  return _httpLogger;
}

/**
 * Reset the HTTP logger (for testing)
 * This allows tests to inject a new destination
 */
export function resetHttpLogger(): void {
  _httpLogger = null;
}

/**
 * Express middleware for logging HTTP requests
 *
 * Logs request details when response finishes:
 * - HTTP method
 * - Request path
 * - Response status code
 * - Duration in milliseconds
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  // Get logger lazily to support test injection
  const log = getHttpLogger();

  // Log on response finish
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const { method, path } = req;
    const status = res.statusCode;

    // Determine log level based on status code
    const logData = {
      method,
      path,
      status,
      durationMs,
    };

    const message = `${method} ${path}`;

    if (status >= 500) {
      log.error(logData, message);
    } else if (status >= 400) {
      log.warn(logData, message);
    } else {
      log.info(logData, message);
    }
  });

  next();
}
