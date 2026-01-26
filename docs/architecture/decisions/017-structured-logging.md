# ADR-017 Structured Logging Strategy

## Status
Proposed

## Context
The ngaj backend currently uses ad-hoc `console.log/error` statements (~70 instances across 11 files). This approach has proven inadequate for production troubleshooting:

- **Issue #35**: Cron scheduler was never started, but no logs indicated this. The only evidence was `lastRunAt: null` in the database.
- **No request logging**: REST API calls leave no trace unless they error.
- **No service-level logging**: Discovery runs, platform API calls, and scheduled jobs execute silently when successful.
- **Support difficulty**: When users report issues, there's no log output to analyze.

### Current Pain Points
1. Success paths are invisible - only errors are sometimes logged
2. No timestamps, log levels, or component context
3. No correlation between related operations
4. Can't filter by severity or component
5. Credentials could accidentally be logged (no sanitization)

### Requirements
- Support engineers need visibility into production container logs
- Plain text format (human-readable in `docker logs`)
- Configurable log level via environment variable
- Privacy-safe (no credentials, tokens, or sensitive content)
- Low overhead (cron jobs run frequently)

## Options Considered

### Option A: Enhanced Console Logging
Add timestamps, levels, and component names to existing `console.log` calls.

- **Pros**: No dependencies, fast to implement
- **Cons**: No log level filtering, no structured context, manual maintenance

### Option B: Pino
Use [Pino](https://github.com/pinojs/pino), a fast JSON logger with pretty-print support.

- **Pros**: 
  - Extremely fast (low overhead)
  - Built-in log levels and filtering
  - Structured context (child loggers)
  - Pretty-print for development
  - Widely used in Node.js ecosystem
- **Cons**: New dependency (~200KB)

### Option C: Winston
Use [Winston](https://github.com/winstonjs/winston), a mature logging framework.

- **Pros**: Feature-rich, mature ecosystem
- **Cons**: Slower than Pino, larger footprint, more complex API

## Decision
We will use **Pino** for structured logging in the backend.

## Rationale
1. **Performance**: Pino is 5-10x faster than Winston, important for frequent cron jobs
2. **Simplicity**: Clean API with child loggers for contextual logging
3. **Architecture alignment**: Already mentioned in `docs/architecture/overview.md` as future direction
4. **Developer experience**: `pino-pretty` provides readable output during development
5. **Production-ready**: JSON output works well with log aggregation tools if needed later

## Consequences

### Positive
- **Visibility**: All key operations logged with timestamps and context
- **Troubleshooting**: Can diagnose issues like #35 from logs alone
- **Filtering**: `LOG_LEVEL=error` reduces noise in production if needed
- **Correlation**: Child loggers attach `accountId`, `requestId` to all related logs
- **Privacy**: Centralized sanitization prevents credential leaks

### Negative
- New dependency to maintain
- Existing `console.log` calls need migration
- Slight learning curve for child logger pattern

## Related Decisions
- [ADR-003: TypeScript Stack](./003-typescript-stack.md) - Logger uses TypeScript
- [ADR-008: Opportunity Discovery](./008-opportunity-discovery-architecture.md) - Discovery logging
- [ADR-011: Installation and Setup](./011-installation-and-setup.md) - Setup CLI logging

## Technical Details
See [Design Document](../../.agents/artifacts/designer/designs/structured-logging-design.md) for:
- Logger configuration and interface
- Integration points and log statements
- Privacy sanitization rules
- Migration plan

## References
- [GitHub Issue #35](https://github.com/ZioHimself/ngaj/issues/35) - Scheduler not started, no logs
- [Pino Documentation](https://github.com/pinojs/pino)
- [Architecture Overview - Monitoring](./overview.md#monitoring--observability)
