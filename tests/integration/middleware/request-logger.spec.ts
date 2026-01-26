import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { requestLogger } from '@ngaj/backend/middleware/request-logger';
import {
  createLogCapture,
  createMockRequest,
  createMockResponse,
  LOG_LEVELS,
} from '@tests/fixtures/logger-fixtures';

describe('Request Logger Middleware', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('successful requests (2xx)', () => {
    it('should log at info level for 200 responses', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'GET', path: '/api/health' });
      const res = createMockResponse();
      res.statusCode = 200;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      expect(next).toHaveBeenCalled();
      expect(capture.getByLevel('info')).toHaveLength(1);
      const log = capture.logs[0];
      expect(log.method).toBe('GET');
      expect(log.path).toBe('/api/health');
      expect(log.status).toBe(200);
    });

    it('should log at info level for 201 responses', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'POST', path: '/api/profiles' });
      const res = createMockResponse();
      res.statusCode = 201;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      const infoLogs = capture.getByLevel('info');
      expect(infoLogs).toHaveLength(1);
      expect(infoLogs[0].status).toBe(201);
    });

    it('should include duration in milliseconds', () => {
      // Arrange
      vi.useFakeTimers();
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'GET', path: '/api/test' });
      const res = createMockResponse();
      res.statusCode = 200;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      vi.advanceTimersByTime(150); // Simulate 150ms delay
      res.emit('finish');

      // Assert
      expect(capture.logs[0].durationMs).toBeGreaterThanOrEqual(150);
    });
  });

  describe('client errors (4xx)', () => {
    it('should log at warn level for 400 responses', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'POST', path: '/api/profiles' });
      const res = createMockResponse();
      res.statusCode = 400;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      const warnLogs = capture.getByLevel('warn');
      expect(warnLogs).toHaveLength(1);
      expect(warnLogs[0].status).toBe(400);
    });

    it('should log at warn level for 404 responses', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'GET', path: '/api/nonexistent' });
      const res = createMockResponse();
      res.statusCode = 404;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      expect(capture.getByLevel('warn')).toHaveLength(1);
    });

    it('should log at warn level for 401 responses', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'GET', path: '/api/protected' });
      const res = createMockResponse();
      res.statusCode = 401;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      expect(capture.getByLevel('warn')).toHaveLength(1);
    });
  });

  describe('server errors (5xx)', () => {
    it('should log at error level for 500 responses', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'GET', path: '/api/error' });
      const res = createMockResponse();
      res.statusCode = 500;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      const errorLogs = capture.getByLevel('error');
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].status).toBe(500);
    });

    it('should log at error level for 503 responses', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'GET', path: '/api/unavailable' });
      const res = createMockResponse();
      res.statusCode = 503;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      expect(capture.getByLevel('error')).toHaveLength(1);
    });

    it('should not leak sensitive error details', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'GET', path: '/api/error' });
      const res = createMockResponse();
      res.statusCode = 500;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      const log = capture.logs[0];
      // Should only contain standard fields, not stack traces or internal details
      expect(log.stack).toBeUndefined();
      expect(JSON.stringify(log)).not.toContain('password');
      expect(JSON.stringify(log)).not.toContain('secret');
    });
  });

  describe('log content', () => {
    it('should include HTTP method in log', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'DELETE', path: '/api/resource' });
      const res = createMockResponse();
      res.statusCode = 204;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      expect(capture.logs[0].method).toBe('DELETE');
    });

    it('should include request path in log', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'GET', path: '/api/opportunities' });
      const res = createMockResponse();
      res.statusCode = 200;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      expect(capture.logs[0].path).toBe('/api/opportunities');
    });

    it('should include status code in log', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'PATCH', path: '/api/accounts/123' });
      const res = createMockResponse();
      res.statusCode = 200;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      expect(capture.logs[0].status).toBe(200);
    });

    it('should include human-readable message', () => {
      // Arrange
      const capture = createLogCapture();
      const req = createMockRequest({ method: 'GET', path: '/api/health' });
      const res = createMockResponse();
      res.statusCode = 200;

      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);
      res.emit('finish');

      // Assert
      expect(capture.logs[0].msg).toContain('GET');
      expect(capture.logs[0].msg).toContain('/api/health');
    });
  });

  describe('middleware behavior', () => {
    it('should call next() immediately', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      // Act
      requestLogger(req as any, res as any, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should not block request processing', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      // Act
      const startTime = Date.now();
      requestLogger(req as any, res as any, next);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(10); // Should be nearly instant
    });
  });
});
