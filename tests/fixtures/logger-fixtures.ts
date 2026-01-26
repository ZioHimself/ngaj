/**
 * Logger Test Fixtures
 *
 * Utilities for capturing and asserting on Pino log output in tests.
 */

import { Writable } from 'stream';
import { setTestDestination } from '@ngaj/backend/utils/logger';
import { resetHttpLogger } from '@ngaj/backend/middleware/request-logger';
import { resetSchedulerLogger } from '@ngaj/backend/scheduler/cron-scheduler';
import { resetDiscoveryLogger } from '@ngaj/backend/services/discovery-service';

/**
 * Pino log level numeric values
 */
export const LOG_LEVELS = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
} as const;

/**
 * Captured log entry structure
 */
export interface CapturedLog {
  /** Numeric log level (see LOG_LEVELS) */
  level: number;
  /** Unix timestamp in milliseconds */
  time: number;
  /** Log message */
  msg: string;
  /** Component name (if using component logger) */
  component?: string;
  /** Any additional context fields */
  [key: string]: unknown;
}

/**
 * Log capture utility for testing
 */
export interface LogCapture {
  /** Writable stream to pass to Pino */
  stream: Writable;
  /** Array of captured log entries */
  logs: CapturedLog[];
  /** Clear all captured logs */
  clear: () => void;
  /** Get logs at a specific level */
  getByLevel: (level: keyof typeof LOG_LEVELS) => CapturedLog[];
  /** Get logs containing a specific message substring */
  getByMessage: (substring: string) => CapturedLog[];
}

/**
 * Create a log capture utility for testing Pino loggers
 *
 * This function creates a writable stream that captures log output
 * and automatically sets it as the global test destination.
 * The destination is cleared when clear() is called.
 *
 * @example
 * const capture = createLogCapture();
 * const logger = pino({ level: 'debug' }, capture.stream);
 * logger.info({ foo: 'bar' }, 'test message');
 * expect(capture.logs).toHaveLength(1);
 * expect(capture.logs[0].msg).toBe('test message');
 *
 * @returns Log capture utility
 */
export function createLogCapture(): LogCapture {
  const logs: CapturedLog[] = [];

  const stream = new Writable({
    write(chunk, _encoding, callback) {
      const line = chunk.toString().trim();
      if (line) {
        try {
          logs.push(JSON.parse(line));
        } catch {
          // Ignore non-JSON output (e.g., pretty-print)
        }
      }
      callback();
    },
  });

  // Set as global test destination so component loggers use this stream
  setTestDestination(stream);
  // Reset component loggers to pick up the new destination
  resetHttpLogger();
  resetSchedulerLogger();
  resetDiscoveryLogger();

  return {
    stream,
    logs,
    clear: () => {
      logs.length = 0;
    },
    getByLevel: (level: keyof typeof LOG_LEVELS) => {
      return logs.filter((log) => log.level === LOG_LEVELS[level]);
    },
    getByMessage: (substring: string) => {
      return logs.filter((log) => log.msg.includes(substring));
    },
  };
}

/**
 * Mock Express request object for middleware testing
 */
export function createMockRequest(overrides?: Partial<{
  method: string;
  path: string;
  url: string;
  headers: Record<string, string>;
}>): {
  method: string;
  path: string;
  url: string;
  headers: Record<string, string>;
} {
  return {
    method: 'GET',
    path: '/api/test',
    url: '/api/test',
    headers: {},
    ...overrides,
  };
}

/**
 * Mock Express response object for middleware testing
 */
export function createMockResponse(): {
  statusCode: number;
  finished: boolean;
  listeners: Map<string, Array<() => void>>;
  on: (event: string, callback: () => void) => void;
  emit: (event: string) => void;
  setStatusCode: (code: number) => void;
} {
  const listeners = new Map<string, Array<() => void>>();

  return {
    statusCode: 200,
    finished: false,
    listeners,
    on(event: string, callback: () => void) {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(callback);
    },
    emit(event: string) {
      const callbacks = listeners.get(event) || [];
      callbacks.forEach((cb) => cb());
    },
    setStatusCode(code: number) {
      this.statusCode = code;
    },
  };
}

/**
 * Sample MongoDB URIs for sanitization testing
 */
export const mongoUris = {
  /** URI with username and password */
  withCredentials: 'mongodb://myuser:mypassword@localhost:27017/ngaj',
  /** URI with SRV format and credentials */
  srvWithCredentials: 'mongodb+srv://admin:secret123@cluster.mongodb.net/ngaj',
  /** URI without credentials */
  noCredentials: 'mongodb://localhost:27017/ngaj',
  /** URI with special characters in password */
  specialChars: 'mongodb://user:p%40ss%3Dword@host:27017/db',
};

/**
 * Sample errors for sanitization testing
 */
export const sampleErrors = {
  /** Standard Error with message and stack */
  standard: new Error('Something went wrong'),
  /** Error with custom properties */
  custom: Object.assign(new Error('Custom error'), {
    code: 'ERR_CUSTOM',
    details: { foo: 'bar' },
  }),
  /** TypeError */
  typeError: new TypeError('Cannot read property x of undefined'),
  /** Non-Error value (string) */
  stringError: 'String error message',
  /** Non-Error value (object) */
  objectError: { message: 'Object error', code: 500 },
  /** Non-Error value (null) */
  nullError: null,
  /** Non-Error value (undefined) */
  undefinedError: undefined,
};
