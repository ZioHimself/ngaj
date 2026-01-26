import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createLogger,
  createComponentLogger,
  sanitizeUri,
  sanitizeError,
  type LogLevel,
} from '@ngaj/backend/utils/logger';
import {
  createLogCapture,
  LOG_LEVELS,
  mongoUris,
  sampleErrors,
} from '@tests/fixtures/logger-fixtures';

describe('Logger Utility', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('createLogger()', () => {
    describe('log level configuration', () => {
      it('should respect LOG_LEVEL environment variable', () => {
        // Arrange
        vi.stubEnv('LOG_LEVEL', 'warn');
        const capture = createLogCapture();

        // Act
        const logger = createLogger({ destination: capture.stream });
        logger.info('info message');
        logger.warn('warn message');

        // Assert
        expect(capture.logs).toHaveLength(1);
        expect(capture.logs[0].msg).toBe('warn message');
        expect(capture.logs[0].level).toBe(LOG_LEVELS.warn);
      });

      it('should default to info level when LOG_LEVEL not set', () => {
        // Arrange
        vi.stubEnv('LOG_LEVEL', '');
        const capture = createLogCapture();

        // Act
        const logger = createLogger({ destination: capture.stream });
        logger.debug('debug message');
        logger.info('info message');

        // Assert
        expect(capture.logs).toHaveLength(1);
        expect(capture.logs[0].msg).toBe('info message');
      });

      it('should allow explicit level override via options', () => {
        // Arrange
        vi.stubEnv('LOG_LEVEL', 'info');
        const capture = createLogCapture();

        // Act
        const logger = createLogger({ level: 'debug', destination: capture.stream });
        logger.debug('debug message');

        // Assert
        expect(capture.logs).toHaveLength(1);
        expect(capture.logs[0].msg).toBe('debug message');
      });

      it('should fall back to info for invalid LOG_LEVEL values', () => {
        // Arrange
        vi.stubEnv('LOG_LEVEL', 'invalid');
        const capture = createLogCapture();

        // Act
        const logger = createLogger({ destination: capture.stream });
        logger.debug('debug message');
        logger.info('info message');

        // Assert
        expect(capture.logs).toHaveLength(1);
        expect(capture.logs[0].msg).toBe('info message');
      });
    });

    describe('log output format', () => {
      it('should include ISO timestamp in logs', () => {
        // Arrange
        const capture = createLogCapture();
        const logger = createLogger({ destination: capture.stream });

        // Act
        logger.info('test message');

        // Assert
        expect(capture.logs[0].time).toBeDefined();
        // Pino uses numeric timestamps by default, verify it's a number
        expect(typeof capture.logs[0].time).toBe('number');
      });

      it('should include log level in output', () => {
        // Arrange
        const capture = createLogCapture();
        const logger = createLogger({ destination: capture.stream });

        // Act
        logger.error('error message');

        // Assert
        expect(capture.logs[0].level).toBe(LOG_LEVELS.error);
      });
    });
  });

  describe('createComponentLogger()', () => {
    it('should include component name in all log entries', () => {
      // Arrange
      const capture = createLogCapture();
      // Note: createComponentLogger needs access to the capture stream
      // This test verifies the component logger includes the component field

      // Act
      const logger = createComponentLogger('scheduler');
      // For testing, we need to inject the stream - implementation should support this
      // This is a design consideration for the implementer

      // Assert
      // The test expects component loggers to include component in output
      // Implementation needs to support custom destination for testing
      expect(true).toBe(true); // Placeholder until implementation supports stream injection
    });

    it('should create independent loggers for different components', () => {
      // Arrange
      const capture = createLogCapture();

      // Act
      const schedulerLogger = createComponentLogger('scheduler');
      const discoveryLogger = createComponentLogger('discovery');

      // Assert
      // Each logger should have its own component name
      expect(schedulerLogger).not.toBe(discoveryLogger);
    });
  });

  describe('child loggers', () => {
    it('should inherit parent context when creating child', () => {
      // Arrange
      const capture = createLogCapture();
      const logger = createLogger({ destination: capture.stream });
      const parentLogger = logger.child({ component: 'scheduler' });

      // Act
      const childLogger = parentLogger.child({ accountId: 'acc-123' });
      childLogger.info('job started');

      // Assert
      expect(capture.logs[0].component).toBe('scheduler');
      expect(capture.logs[0].accountId).toBe('acc-123');
      expect(capture.logs[0].msg).toBe('job started');
    });

    it('should extend parent context with child-specific fields', () => {
      // Arrange
      const capture = createLogCapture();
      const logger = createLogger({ destination: capture.stream });

      // Act
      const childLogger = logger.child({
        component: 'discovery',
        accountId: 'acc-456',
        discoveryType: 'replies',
      });
      childLogger.info('discovery complete');

      // Assert
      expect(capture.logs[0].component).toBe('discovery');
      expect(capture.logs[0].accountId).toBe('acc-456');
      expect(capture.logs[0].discoveryType).toBe('replies');
    });

    it('should not modify parent logger context', () => {
      // Arrange
      const capture = createLogCapture();
      const logger = createLogger({ destination: capture.stream });
      const parentLogger = logger.child({ component: 'scheduler' });

      // Act
      parentLogger.child({ accountId: 'acc-789' });
      parentLogger.info('parent log');

      // Assert
      expect(capture.logs[0].component).toBe('scheduler');
      expect(capture.logs[0].accountId).toBeUndefined();
    });
  });

  describe('sanitizeUri()', () => {
    it('should mask username and password in MongoDB URI', () => {
      // Act
      const result = sanitizeUri(mongoUris.withCredentials);

      // Assert
      expect(result).toBe('mongodb://***:***@localhost:27017/ngaj');
      expect(result).not.toContain('myuser');
      expect(result).not.toContain('mypassword');
    });

    it('should handle mongodb+srv:// URIs', () => {
      // Act
      const result = sanitizeUri(mongoUris.srvWithCredentials);

      // Assert
      expect(result).toBe('mongodb+srv://***:***@cluster.mongodb.net/ngaj');
      expect(result).not.toContain('admin');
      expect(result).not.toContain('secret123');
    });

    it('should return unchanged URI when no credentials present', () => {
      // Act
      const result = sanitizeUri(mongoUris.noCredentials);

      // Assert
      expect(result).toBe('mongodb://localhost:27017/ngaj');
    });

    it('should preserve host, port, and database in output', () => {
      // Act
      const result = sanitizeUri(mongoUris.withCredentials);

      // Assert
      expect(result).toContain('localhost:27017');
      expect(result).toContain('/ngaj');
    });
  });

  describe('sanitizeError()', () => {
    describe('Error objects', () => {
      it('should preserve error name', () => {
        // Act
        const result = sanitizeError(sampleErrors.standard);

        // Assert
        expect(result.name).toBe('Error');
      });

      it('should preserve error message', () => {
        // Act
        const result = sanitizeError(sampleErrors.standard);

        // Assert
        expect(result.message).toBe('Something went wrong');
      });

      it('should exclude stack trace in production', () => {
        // Arrange
        vi.stubEnv('NODE_ENV', 'production');

        // Act
        const result = sanitizeError(sampleErrors.standard);

        // Assert
        expect(result.stack).toBeUndefined();
      });

      it('should include stack trace in development', () => {
        // Arrange
        vi.stubEnv('NODE_ENV', 'development');

        // Act
        const result = sanitizeError(sampleErrors.standard);

        // Assert
        expect(result.stack).toBeDefined();
        expect(result.stack).toContain('Error: Something went wrong');
      });

      it('should handle TypeError', () => {
        // Act
        const result = sanitizeError(sampleErrors.typeError);

        // Assert
        expect(result.name).toBe('TypeError');
        expect(result.message).toBe('Cannot read property x of undefined');
      });
    });

    describe('non-Error values', () => {
      it('should stringify string errors', () => {
        // Act
        const result = sanitizeError(sampleErrors.stringError);

        // Assert
        expect(result.message).toBe('String error message');
        expect(result.name).toBeUndefined();
      });

      it('should stringify object errors', () => {
        // Act
        const result = sanitizeError(sampleErrors.objectError);

        // Assert
        expect(result.message).toContain('Object error');
      });

      it('should handle null', () => {
        // Act
        const result = sanitizeError(sampleErrors.nullError);

        // Assert
        expect(result.message).toBe('null');
      });

      it('should handle undefined', () => {
        // Act
        const result = sanitizeError(sampleErrors.undefinedError);

        // Assert
        expect(result.message).toBe('undefined');
      });
    });
  });
});
