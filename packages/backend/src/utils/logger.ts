/**
 * Structured Logging Utility
 *
 * Provides Pino-based logging with component context, child loggers,
 * and privacy-safe sanitization utilities.
 *
 * @see ADR-017: Structured Logging Strategy
 * @see Design: .agents/artifacts/designer/designs/structured-logging-design.md
 */

import pino from 'pino';

/**
 * Supported log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Options for creating a logger
 */
export interface LoggerOptions {
  level?: LogLevel;
  component?: string;
  /** Custom destination stream (for testing) */
  destination?: pino.DestinationStream;
}

const DEFAULT_LEVEL: LogLevel = 'info';
const VALID_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];

/**
 * Global test destination for capturing logs in tests
 * Set via setTestDestination() in test fixtures
 */
let _testDestination: pino.DestinationStream | null = null;

/**
 * Set a global test destination for capturing logs
 * This is used by test fixtures to capture all log output
 *
 * @param destination - Writable stream to capture logs, or null to clear
 */
export function setTestDestination(destination: pino.DestinationStream | null): void {
  _testDestination = destination;
  // Reset root logger so it picks up the new destination
  _rootLogger = null;
}

/**
 * Validate and normalize log level
 */
export function normalizeLogLevel(level: string | undefined): LogLevel {
  if (level && VALID_LEVELS.includes(level as LogLevel)) {
    return level as LogLevel;
  }
  return DEFAULT_LEVEL;
}

/**
 * Create root logger instance
 *
 * Configured via LOG_LEVEL environment variable.
 * Uses pretty-print in development, JSON in production.
 *
 * @param options - Logger configuration options
 * @returns Configured Pino logger
 */
export function createLogger(options?: LoggerOptions): pino.Logger {
  // Determine log level: explicit option > env var > default
  const level = options?.level || normalizeLogLevel(process.env.LOG_LEVEL);

  // Create logger options
  const pinoOptions: pino.LoggerOptions = {
    level,
  };

  // Add component to base context if provided
  if (options?.component) {
    pinoOptions.base = { component: options.component };
  }

  // Use custom destination, test destination, or stdout
  const destination = options?.destination || _testDestination;
  if (destination) {
    return pino(pinoOptions, destination);
  }

  return pino(pinoOptions);
}

/**
 * Root logger instance - lazy initialized to avoid issues during testing
 */
let _rootLogger: pino.Logger | null = null;

/**
 * Get or create the root logger instance
 */
function getRootLogger(): pino.Logger {
  if (!_rootLogger) {
    _rootLogger = createLogger();
  }
  return _rootLogger;
}

/**
 * Create child logger with component context
 *
 * Use for service-specific logging. The component name is included
 * in all log entries from this logger and its children.
 *
 * @param component - Component name (e.g., 'scheduler', 'discovery')
 * @returns Logger with component context
 */
export function createComponentLogger(component: string): pino.Logger {
  return getRootLogger().child({ component });
}

/**
 * Sanitize MongoDB URI to hide credentials
 *
 * Masks username and password in connection strings to prevent
 * credential leaks in logs.
 *
 * @example
 * sanitizeUri('mongodb://user:pass@host:27017/db')
 * // Returns: 'mongodb://***:***@host:27017/db'
 *
 * @param uri - MongoDB connection string
 * @returns URI with credentials masked
 */
export function sanitizeUri(uri: string): string {
  // Match mongodb:// or mongodb+srv:// URIs with credentials
  // Pattern: mongodb[+srv]://user:password@host...
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

/**
 * Sanitize error objects to prevent credential leaks
 *
 * Extracts safe error information for logging. In production,
 * stack traces are excluded to avoid exposing file paths.
 *
 * @param err - Error object or any value
 * @returns Safe error object for logging
 */
export function sanitizeError(err: unknown): { name?: string; message: string; stack?: string } {
  if (err instanceof Error) {
    const result: { name: string; message: string; stack?: string } = {
      name: err.name,
      message: err.message,
    };

    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development') {
      result.stack = err.stack;
    }

    return result;
  }

  // Handle non-Error values
  // For objects, stringify to get meaningful output
  if (typeof err === 'object' && err !== null) {
    try {
      return { message: JSON.stringify(err) };
    } catch {
      return { message: String(err) };
    }
  }

  return {
    message: String(err),
  };
}

/**
 * Root logger instance
 *
 * Use this for general logging. For service-specific logging,
 * use createComponentLogger() instead.
 */
export const logger = getRootLogger();
