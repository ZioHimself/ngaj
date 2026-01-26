# Structured Logging - Test-Writer Handoff

**Handoff Number**: 016
**Feature**: Structured Logging with Pino
**Based on Designer Handoff**: [014-structured-logging-handoff.md](../designer/handoffs/014-structured-logging-handoff.md)

---

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 24 |
| Unit Tests | 12 |
| Integration Tests | 12 |
| Red Phase Status | ✅ All tests fail |

---

## Files Created

### Test Files

| File | Description |
|------|-------------|
| `tests/unit/utils/logger.spec.ts` | Unit tests for logger factory, child loggers, sanitization |
| `tests/integration/middleware/request-logger.spec.ts` | Integration tests for HTTP request logging |
| `tests/integration/scheduler/cron-scheduler-logging.spec.ts` | Integration tests for scheduler lifecycle logging |
| `tests/integration/services/discovery-logging.spec.ts` | Integration tests for discovery operation logging |

### Fixtures

| File | Description |
|------|-------------|
| `tests/fixtures/logger-fixtures.ts` | Log capture utilities, mock request/response objects |

### Implementation Stubs

| File | Description |
|------|-------------|
| `packages/backend/src/utils/logger.ts` | Logger factory and sanitization utilities |
| `packages/backend/src/middleware/request-logger.ts` | HTTP request logging middleware |

---

## Test Coverage Breakdown

### Unit Tests: Logger Utility (`tests/unit/utils/logger.spec.ts`)

| Test | Priority |
|------|----------|
| `createLogger()` respects LOG_LEVEL env var | Critical |
| `createLogger()` defaults to info when env var not set | Critical |
| `createLogger()` allows explicit level override | Important |
| `createLogger()` falls back to info for invalid LOG_LEVEL | Nice to Have |
| `createLogger()` includes ISO timestamp in logs | Important |
| `createLogger()` includes log level in output | Important |
| `createComponentLogger()` includes component name | Critical |
| `createComponentLogger()` creates independent loggers | Important |
| Child loggers inherit parent context | Critical |
| Child loggers extend parent with child-specific fields | Important |
| Child loggers don't modify parent context | Important |
| `sanitizeUri()` masks MongoDB credentials | Critical |
| `sanitizeUri()` handles mongodb+srv:// URIs | Critical |
| `sanitizeUri()` returns unchanged URI when no credentials | Important |
| `sanitizeUri()` preserves host, port, database | Important |
| `sanitizeError()` preserves error name | Critical |
| `sanitizeError()` preserves error message | Critical |
| `sanitizeError()` excludes stack in production | Critical |
| `sanitizeError()` includes stack in development | Important |
| `sanitizeError()` handles TypeError | Important |
| `sanitizeError()` stringifies non-Error values | Nice to Have |
| `sanitizeError()` handles null/undefined | Nice to Have |

### Integration Tests: Request Logger (`tests/integration/middleware/request-logger.spec.ts`)

| Test | Priority |
|------|----------|
| Logs at info level for 200 responses | Critical |
| Logs at info level for 201 responses | Important |
| Includes duration in milliseconds | Critical |
| Logs at warn level for 400 responses | Critical |
| Logs at warn level for 404 responses | Important |
| Logs at warn level for 401 responses | Important |
| Logs at error level for 500 responses | Critical |
| Logs at error level for 503 responses | Important |
| Does not leak sensitive error details | Critical |
| Includes HTTP method in log | Critical |
| Includes request path in log | Critical |
| Includes status code in log | Critical |
| Includes human-readable message | Important |
| Calls next() immediately | Important |
| Does not block request processing | Important |

### Integration Tests: Scheduler Logging (`tests/integration/scheduler/cron-scheduler-logging.spec.ts`)

| Test | Priority |
|------|----------|
| Logs account count on initialization | Critical |
| Logs job count on initialization | Critical |
| Logs each registered job with accountId, type, cron | Important |
| Logs when no accounts are found | Important |
| Logs when scheduler starts | Critical |
| Logs when scheduler stops | Critical |
| Logs when job starts | Critical |
| Logs opportunity count on job completion | Critical |
| Logs duration on job completion | Important |
| Logs errors when job fails | Critical |
| Continues running after job failure | Important |

### Integration Tests: Discovery Logging (`tests/integration/services/discovery-logging.spec.ts`)

| Test | Priority |
|------|----------|
| Logs discovery start with accountId and discoveryType | Critical |
| Logs posts fetched count | Important |
| Logs opportunities created count | Important |
| Logs skipped counts at debug level | Nice to Have |
| Logs completion with duration | Important |
| Logs error on discovery failure | Critical |
| Includes component context in all logs | Important |
| Logs keywords used for search | Important |

---

## Test Fixtures

### Log Capture Utility

```typescript
import { createLogCapture, LOG_LEVELS } from '@tests/fixtures/logger-fixtures';

// Create capture for testing
const capture = createLogCapture();

// Pass stream to logger
const logger = pino({ level: 'debug' }, capture.stream);

// Assert on captured logs
expect(capture.logs).toHaveLength(1);
expect(capture.logs[0].msg).toBe('expected message');

// Filter by level
const errors = capture.getByLevel('error');
const warnings = capture.getByLevel('warn');

// Filter by message
const startLogs = capture.getByMessage('starting');
```

### Pino Log Level Reference

| Level | Numeric |
|-------|---------|
| fatal | 60 |
| error | 50 |
| warn | 40 |
| info | 30 |
| debug | 20 |
| trace | 10 |

---

## Dependencies to Install

```bash
# Production dependency
npm install pino

# Development dependency
npm install -D pino-pretty
```

---

## Implementation Order

Recommended sequence for implementing:

1. **Logger utility** (`packages/backend/src/utils/logger.ts`)
   - `createLogger()` function with level configuration
   - `createComponentLogger()` function
   - `sanitizeUri()` function
   - `sanitizeError()` function
   - Export `logger` singleton

2. **Request logger middleware** (`packages/backend/src/middleware/request-logger.ts`)
   - Create component logger
   - Implement middleware function
   - Log on response finish

3. **Integrate with scheduler** (`packages/backend/src/scheduler/cron-scheduler.ts`)
   - Add scheduler component logger
   - Add logging to `initialize()`, `start()`, `stop()`
   - Add job execution logging

4. **Integrate with discovery** (`packages/backend/src/services/discovery-service.ts`)
   - Add discovery component logger
   - Add logging to `discover()` method
   - Add metrics logging

5. **Integrate with server** (`packages/backend/src/index.ts`)
   - Add request-logger middleware
   - Replace console.log with structured logging

---

## Critical Tests (Must Pass First)

1. `createLogger()` respects LOG_LEVEL env var
2. `sanitizeUri()` masks credentials
3. `sanitizeError()` excludes stack in production
4. Request logger logs method, path, status
5. Scheduler logs account/job counts on init
6. Discovery logs start/completion

---

## Running Tests

```bash
# Run all structured logging tests
npm test -- --grep "Logger|Request Logger|Scheduler Logging|Discovery Logging"

# Run unit tests only
npm test -- tests/unit/utils/logger.spec.ts

# Run integration tests
npm test -- tests/integration/middleware/request-logger.spec.ts
npm test -- tests/integration/scheduler/cron-scheduler-logging.spec.ts
npm test -- tests/integration/services/discovery-logging.spec.ts

# Run with coverage
npm test -- --coverage
```

---

## Expected Output (Green Phase)

When implementation is complete:

```
 ✓ tests/unit/utils/logger.spec.ts (24)
   ✓ Logger Utility (24)
     ✓ createLogger() (6)
     ✓ createComponentLogger() (2)
     ✓ child loggers (3)
     ✓ sanitizeUri() (4)
     ✓ sanitizeError() (9)

 ✓ tests/integration/middleware/request-logger.spec.ts (15)
   ✓ Request Logger Middleware (15)

 ✓ tests/integration/scheduler/cron-scheduler-logging.spec.ts (11)
   ✓ CronScheduler Logging (11)

 ✓ tests/integration/services/discovery-logging.spec.ts (8)
   ✓ DiscoveryService Logging (8)

 Test Files  4 passed (4)
      Tests  58 passed (58)
```

---

## Key Implementation Notes

### Logger Configuration

```typescript
// Level from environment
const level = process.env.LOG_LEVEL || 'info';

// Pretty-print in development only
const transport = process.env.NODE_ENV === 'development'
  ? { target: 'pino-pretty', options: { colorize: true } }
  : undefined;

// Base context for component loggers
const base = component ? { component } : undefined;
```

### Sanitization Pattern

```typescript
// Always sanitize URIs before logging
logger.info({ uri: sanitizeUri(mongoUri) }, 'Connected to MongoDB');

// Always sanitize errors
try {
  await riskyOperation();
} catch (err) {
  logger.error({ err: sanitizeError(err) }, 'Operation failed');
  throw err;
}
```

### Request Logger Pattern

```typescript
// Log level based on status code
const level = res.statusCode >= 500 ? 'error'
            : res.statusCode >= 400 ? 'warn'
            : 'info';

// Log on response finish
res.on('finish', () => {
  log[level]({ method, path, status, durationMs }, `${method} ${path}`);
});
```

---

## Known Limitations

- Tests use stream capture; production uses stdout
- Pretty-print formatting not tested (dev-only feature)
- Some integration tests verify logging alongside functional behavior

---

## Success Criteria

Implementation is complete when:

- [ ] All 24+ tests pass
- [ ] No linter errors in implementation
- [ ] Logger respects LOG_LEVEL environment variable
- [ ] All credentials are sanitized in logs
- [ ] Stack traces excluded in production
- [ ] Request middleware logs all HTTP requests
- [ ] Scheduler logs lifecycle events
- [ ] Discovery logs key metrics

---

## References

- **Test Plan**: [structured-logging-test-plan.md](test-plans/structured-logging-test-plan.md)
- **Design Document**: [structured-logging-design.md](../designer/designs/structured-logging-design.md)
- **ADR**: [017-structured-logging.md](../../../docs/architecture/decisions/017-structured-logging.md)
- **Designer Handoff**: [014-structured-logging-handoff.md](../designer/handoffs/014-structured-logging-handoff.md)
- **Pino Documentation**: https://github.com/pinojs/pino
