# Structured Logging - Test Plan

**Handoff Number**: 016
**Based on**: [Designer Handoff](../designer/handoffs/014-structured-logging-handoff.md)
**Design Rationale**: [ADR-017](../../../docs/architecture/decisions/017-structured-logging.md)

---

## Test Coverage Summary

This test plan covers the Pino-based structured logging implementation for the ngaj backend.

### Test Categories

| Category | Test Count | Priority |
|----------|------------|----------|
| Unit Tests: Logger Utility | 12 | Critical |
| Integration Tests: Request Logger | 4 | Critical |
| Integration Tests: Scheduler Logging | 5 | Important |
| Integration Tests: Discovery Logging | 3 | Important |
| **Total** | **24** | |

---

## Test Organization

```
tests/
├── unit/
│   └── utils/
│       └── logger.spec.ts          # Logger factory, sanitization, child loggers
├── integration/
│   ├── middleware/
│   │   └── request-logger.spec.ts  # HTTP request logging middleware
│   ├── scheduler/
│   │   └── cron-scheduler-logging.spec.ts  # Scheduler lifecycle logging
│   └── services/
│       └── discovery-logging.spec.ts       # Discovery operation logging
└── fixtures/
    └── logger-fixtures.ts          # Log capture utilities
```

---

## Mock Strategy

### Logger Testing Approach

For testing Pino loggers, we use a **stream capture** approach:
- Create logger with a writable stream that captures JSON output
- Parse captured output to verify log structure
- Avoid testing pretty-print (dev-only, non-functional requirement)

### Test Isolation

| Dependency | Mock Strategy |
|------------|---------------|
| Environment variables | Use `vi.stubEnv()` |
| Pino logger | Use custom destination stream |
| Express request/response | Use mock objects |
| Database | Use existing mock patterns |
| Platform adapter | Use existing mock patterns |

---

## Test Priorities

### Critical Path (Must Pass)

1. `createLogger()` respects `LOG_LEVEL` environment variable
2. `createLogger()` defaults to `info` when env var not set
3. `createComponentLogger()` includes component name in output
4. `sanitizeUri()` masks MongoDB credentials
5. `sanitizeError()` excludes stack trace in production
6. Request logger logs method, path, status, duration
7. Request logger uses correct level based on status code

### Important (Should Pass)

8. Child loggers inherit and extend parent context
9. Scheduler logs account count and job count on initialization
10. Scheduler logs start/stop events
11. Scheduler logs job execution (start, completion, failure)
12. Discovery logs key metrics (posts fetched, opportunities created)

### Nice to Have (May Defer)

13. Invalid `LOG_LEVEL` falls back to `info`
14. Non-Error values are stringified by `sanitizeError()`

---

## Test Data

### Log Capture Utility

```typescript
// tests/fixtures/logger-fixtures.ts
import { Writable } from 'stream';

export interface CapturedLog {
  level: number;
  time: number;
  msg: string;
  component?: string;
  [key: string]: unknown;
}

export function createLogCapture(): {
  stream: Writable;
  logs: CapturedLog[];
  clear: () => void;
} {
  const logs: CapturedLog[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      const line = chunk.toString().trim();
      if (line) {
        logs.push(JSON.parse(line));
      }
      callback();
    }
  });
  return {
    stream,
    logs,
    clear: () => logs.length = 0
  };
}
```

### Pino Log Levels

| Level Name | Numeric Value |
|------------|---------------|
| fatal | 60 |
| error | 50 |
| warn | 40 |
| info | 30 |
| debug | 20 |
| trace | 10 |

---

## Known Limitations

1. **Pretty-print not tested**: Development-only formatting is not functional; tested implicitly via manual inspection
2. **Integration tests require stub methods**: Some scheduler/discovery tests verify logging behavior alongside existing functionality
3. **Stream capture vs. real console**: Tests use stream capture, which may differ slightly from production stdout

---

## Dependencies to Add

```json
{
  "dependencies": {
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "pino-pretty": "^11.0.0"
  }
}
```

---

## Success Criteria

A test suite is complete when:
- [ ] Logger factory tests pass (level, component, child)
- [ ] Sanitization tests pass (URI, Error)
- [ ] Request middleware tests pass (2xx, 4xx, 5xx)
- [ ] Scheduler logging tests pass (init, start/stop, job execution)
- [ ] Discovery logging tests pass (metrics)
- [ ] All tests fail before implementation (Red phase verified)
- [ ] No linter errors in test code

---

## References

- **Design Document**: [structured-logging-design.md](../../designer/designs/structured-logging-design.md)
- **ADR**: [017-structured-logging.md](../../../docs/architecture/decisions/017-structured-logging.md)
- **Designer Handoff**: [014-structured-logging-handoff.md](../../designer/handoffs/014-structured-logging-handoff.md)
