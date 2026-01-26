# Structured Logging - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-017](../../../docs/architecture/decisions/017-structured-logging.md)
🔗 **Technical Specs**: [Design Document](../designs/structured-logging-design.md)

## Overview

Test the Pino-based logging implementation to ensure all key operations are logged with appropriate levels, context, and privacy safeguards.

---

## 1. Test Scope

### In Scope
- ✅ Logger factory creates loggers with correct configuration
- ✅ Log levels filter appropriately (debug, info, warn, error)
- ✅ Component loggers include component name in output
- ✅ Child loggers inherit parent context
- ✅ Sanitization functions mask sensitive data
- ✅ Request logger middleware logs HTTP requests
- ✅ Scheduler logs lifecycle events (init, start, stop, jobs)
- ✅ Discovery service logs key operations

### Out of Scope (for this phase)
- ❌ Log aggregation or shipping
- ❌ Performance benchmarking
- ❌ Pretty-print formatting tests (dev-only feature)

---

## 2. Test Scenarios

### 2.1 Unit Tests: Logger Utility

**File**: `tests/unit/utils/logger.test.ts`

#### Scenario: Default log level from environment
**Given**: `LOG_LEVEL` environment variable is set to `warn`
**When**: `createLogger()` is called
**Then**: Logger level is `warn`

**Acceptance Criteria**:
- [ ] Logger respects `LOG_LEVEL` env var
- [ ] Defaults to `info` when env var not set

---

#### Scenario: Component logger includes component name
**Given**: A component logger is created with name `scheduler`
**When**: `logger.info('test')` is called
**Then**: Log output includes `component: "scheduler"`

**Acceptance Criteria**:
- [ ] Component name appears in log context
- [ ] Multiple component loggers are independent

---

#### Scenario: Child logger inherits and extends context
**Given**: A parent logger with `{ component: 'scheduler' }`
**When**: `parent.child({ accountId: '123' })` creates a child
**Then**: Child logs include both `component` and `accountId`

**Acceptance Criteria**:
- [ ] Child inherits parent context
- [ ] Child can add additional context
- [ ] Parent context is not modified

---

### 2.2 Unit Tests: Sanitization

**File**: `tests/unit/utils/logger.test.ts`

#### Scenario: sanitizeUri masks MongoDB credentials
**Given**: URI `mongodb://user:password@localhost:27017/ngaj`
**When**: `sanitizeUri(uri)` is called
**Then**: Returns `mongodb://***:***@localhost:27017/ngaj`

**Acceptance Criteria**:
- [ ] Username and password are masked
- [ ] Host, port, and database remain visible
- [ ] Works with and without credentials
- [ ] Handles `mongodb+srv://` URIs

---

#### Scenario: sanitizeError extracts safe error info
**Given**: An Error with message and stack trace
**When**: `sanitizeError(err)` is called
**Then**: Returns object with `name` and `message` only (in production)

**Acceptance Criteria**:
- [ ] Error name is preserved
- [ ] Error message is preserved
- [ ] Stack trace excluded in production
- [ ] Stack trace included in development
- [ ] Non-Error values are stringified

---

### 2.3 Integration Tests: Request Logger Middleware

**File**: `tests/integration/middleware/request-logger.test.ts`

#### Scenario: Successful request is logged at info level
**Given**: Request logger middleware is applied
**When**: `GET /api/health` returns 200
**Then**: Log entry includes method, path, status, duration at `info` level

**Acceptance Criteria**:
- [ ] HTTP method is logged
- [ ] Request path is logged
- [ ] Status code is logged
- [ ] Duration in milliseconds is logged
- [ ] Level is `info` for 2xx responses

---

#### Scenario: Client error is logged at warn level
**Given**: Request logger middleware is applied
**When**: `GET /api/invalid` returns 404
**Then**: Log entry is at `warn` level

**Acceptance Criteria**:
- [ ] Level is `warn` for 4xx responses
- [ ] All request details are still captured

---

#### Scenario: Server error is logged at error level
**Given**: Request logger middleware is applied
**When**: An endpoint throws and returns 500
**Then**: Log entry is at `error` level

**Acceptance Criteria**:
- [ ] Level is `error` for 5xx responses
- [ ] Error details do not leak sensitive info

---

### 2.4 Integration Tests: Scheduler Logging

**File**: `tests/integration/scheduler/cron-scheduler-logging.test.ts`

#### Scenario: Scheduler initialization logs account and job counts
**Given**: Database has 2 accounts with 3 enabled schedules total
**When**: `scheduler.initialize()` is called
**Then**: Logs include `accountCount: 2` and `jobCount: 3`

**Acceptance Criteria**:
- [ ] Account count is logged at `info` level
- [ ] Job count is logged at `info` level
- [ ] Each registered job is logged with accountId, type, cron

---

#### Scenario: Scheduler start/stop are logged
**Given**: An initialized scheduler
**When**: `scheduler.start()` then `scheduler.stop()` are called
**Then**: Both events are logged at `info` level

**Acceptance Criteria**:
- [ ] Start event is logged
- [ ] Stop event is logged

---

#### Scenario: Job execution logs start, completion, and failure
**Given**: A running scheduler with registered jobs
**When**: A discovery job executes successfully
**Then**: Logs show job start, opportunity count, and duration

**Given**: A discovery job fails
**Then**: Logs show job start and error (sanitized)

**Acceptance Criteria**:
- [ ] Job start logged with accountId, discoveryType
- [ ] Job completion logged with opportunityCount, durationMs
- [ ] Job failure logged with sanitized error
- [ ] Failed jobs don't crash scheduler

---

### 2.5 Integration Tests: Discovery Logging

**File**: `tests/integration/services/discovery-logging.test.ts`

#### Scenario: Discovery run logs key metrics
**Given**: A configured account with discovery enabled
**When**: `discoveryService.discover(accountId, 'replies')` runs
**Then**: Logs show posts fetched, opportunities created, and completion

**Acceptance Criteria**:
- [ ] Discovery start logged with accountId, discoveryType
- [ ] Posts fetched count logged
- [ ] Opportunities created count logged
- [ ] Skipped counts logged (duplicates, low score) at debug level
- [ ] Completion logged with duration

---

## 3. Edge Cases & Error Paths

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| `LOG_LEVEL` set to invalid value | Falls back to `info` | Medium |
| Error thrown is not an Error object | `sanitizeError` returns `{ message: String(err) }` | Medium |
| MongoDB URI has no credentials | `sanitizeUri` returns unchanged | Low |
| Request timeout (no response finish) | No log entry (acceptable) | Low |

---

## 4. Data Fixtures

### Test Logger Capture

```typescript
// Helper to capture log output for assertions
function createTestLogger() {
  const logs: Array<{ level: string; msg: string; [key: string]: unknown }> = [];
  const logger = pino({
    level: 'debug',
    transport: {
      target: 'pino/file',
      options: { destination: 1 }, // stdout
    },
  });
  // Intercept logs for testing...
  return { logger, logs };
}
```

**Note**: Pino testing patterns use stream capture or custom transports.

---

## 5. Integration Dependencies

### Logger Mocking
- For unit tests: Use Pino's `pino.destination()` to capture output
- For integration tests: Let logs flow to stdout, assert on captured output

### Database
- Use test MongoDB for scheduler/discovery logging tests
- Seed with test accounts and schedules

---

## 6. Test Priorities

### Critical Path (Must Pass)
1. Logger factory respects `LOG_LEVEL`
2. `sanitizeUri` masks credentials
3. `sanitizeError` doesn't leak stack in production
4. Scheduler logs job registration count
5. Request logger logs method, path, status

### Important (Should Pass)
6. Component loggers include component name
7. Child loggers inherit context
8. Log levels (warn for 4xx, error for 5xx) are correct
9. Discovery logs key metrics

### Nice to Have (May Defer)
10. Edge case: invalid `LOG_LEVEL` fallback
11. Edge case: non-Error sanitization

---

## 7. Definition of Done

A test suite is complete when:
- [ ] Logger factory tests pass (level, component, child)
- [ ] Sanitization tests pass (URI, Error)
- [ ] Request middleware tests pass (2xx, 4xx, 5xx)
- [ ] Scheduler logging tests pass (init, start/stop, job execution)
- [ ] Discovery logging tests pass (metrics)
- [ ] No credentials or sensitive data in any test log output
- [ ] Tests fail before implementation (Red phase verified)

---

## References

- **Why Pino**: [ADR-017](../../../docs/architecture/decisions/017-structured-logging.md)
- **Complete technical specs**: [Design Document](../designs/structured-logging-design.md)
- **Logger configuration**: [Design Doc Section 1](../designs/structured-logging-design.md#1-logger-configuration)
- **Integration points**: [Design Doc Section 3](../designs/structured-logging-design.md#3-integration-points)
