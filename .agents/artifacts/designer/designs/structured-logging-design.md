# Structured Logging - Design Document

📋 **Decision Context**: [ADR-017](../../../docs/architecture/decisions/017-structured-logging.md)

## Overview

Implement structured logging using Pino to provide visibility into backend operations for production troubleshooting. Focus on key lifecycle events, service operations, and API requests.

**Key Components**: Logger utility, child loggers per component, request logging middleware
**External Dependencies**: `pino`, `pino-pretty` (dev only)

---

## 1. Logger Configuration

### 1.1 Logger Factory

```typescript
// packages/backend/src/utils/logger.ts
import pino from 'pino';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerOptions {
  level?: LogLevel;
  component?: string;
}

const DEFAULT_LEVEL: LogLevel = 'info';

/**
 * Create root logger instance
 * Configured via LOG_LEVEL environment variable
 */
export function createLogger(options?: LoggerOptions): pino.Logger {
  const level = options?.level || (process.env.LOG_LEVEL as LogLevel) || DEFAULT_LEVEL;
  
  return pino({
    level,
    // Plain text format for container logs
    transport: process.env.NODE_ENV === 'development' 
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
    // Base context
    base: options?.component ? { component: options.component } : undefined,
    // Timestamp format
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

/**
 * Root logger instance - import this for general use
 */
export const logger = createLogger();

/**
 * Create child logger with component context
 * Use for service-specific logging
 */
export function createComponentLogger(component: string): pino.Logger {
  return logger.child({ component });
}
```

### 1.2 Environment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Minimum level to log: `debug`, `info`, `warn`, `error`, `fatal` |
| `NODE_ENV` | - | When `development`, enables pretty-printed output |

### 1.3 Log Levels Usage

| Level | Use Case | Examples |
|-------|----------|----------|
| `debug` | Detailed diagnostic info | Query parameters, intermediate values |
| `info` | Key operational events | Server started, job completed, request handled |
| `warn` | Recoverable issues | Rate limit approached, retry attempted |
| `error` | Operation failures | API call failed, database error |
| `fatal` | Unrecoverable errors | Cannot connect to database, missing config |

---

## 2. Component Loggers

### 2.1 Logger Instances

```typescript
// Create once per component, reuse throughout
const schedulerLogger = createComponentLogger('scheduler');
const discoveryLogger = createComponentLogger('discovery');
const blueskyLogger = createComponentLogger('bluesky');
const apiLogger = createComponentLogger('api');
const dbLogger = createComponentLogger('database');
```

### 2.2 Child Loggers for Context

```typescript
// Within a request or operation, create child with context
const requestLogger = apiLogger.child({ requestId: req.id, method: req.method, path: req.path });
const jobLogger = schedulerLogger.child({ accountId, discoveryType });
```

---

## 3. Integration Points

### 3.1 Server Lifecycle (`index.ts`)

```typescript
// Startup
logger.info({ port: PORT }, 'Server starting');
dbLogger.info('Connecting to MongoDB');
dbLogger.info({ uri: sanitizeUri(MONGODB_URI) }, 'MongoDB connected');
schedulerLogger.info('Initializing cron scheduler');
schedulerLogger.info({ jobCount: jobs.size }, 'Scheduler initialized');
schedulerLogger.info('Scheduler started');
logger.info({ port: PORT }, 'Server ready');

// Shutdown
logger.info('SIGTERM received, shutting down');
schedulerLogger.info('Stopping scheduler');
dbLogger.info('Closing database connection');
logger.info('Shutdown complete');
```

### 3.2 Cron Scheduler (`cron-scheduler.ts`)

```typescript
// Initialize
schedulerLogger.info('Loading accounts from database');
schedulerLogger.info({ accountCount: accounts.length }, 'Accounts loaded');

// Per account/schedule
for (const schedule of account.discovery.schedules) {
  if (!schedule.enabled) {
    schedulerLogger.debug({ accountId, type: schedule.type }, 'Schedule disabled, skipping');
    continue;
  }
  schedulerLogger.info({ accountId, type: schedule.type, cron: schedule.cronExpression }, 'Job registered');
}

// Job execution
const jobLogger = schedulerLogger.child({ accountId, discoveryType });
jobLogger.info('Discovery job starting');
// ... after completion
jobLogger.info({ opportunityCount, durationMs }, 'Discovery job completed');
// ... on error
jobLogger.error({ err }, 'Discovery job failed');
```

### 3.3 Discovery Service (`discovery-service.ts`)

```typescript
const log = discoveryLogger.child({ accountId, discoveryType });

log.info('Discovery starting');
log.debug({ since: since.toISOString() }, 'Fetching posts since');
log.info({ postCount: posts.length }, 'Posts fetched from platform');
log.debug({ aboveThreshold, belowThreshold }, 'Scoring complete');
log.info({ created: opportunities.length, skippedDuplicates, skippedLowScore }, 'Discovery complete');

// Errors
log.error({ err, postId }, 'Failed to process post');
```

### 3.4 Bluesky Adapter (`bluesky-adapter.ts`)

```typescript
const log = blueskyLogger;

// Auth
log.info('Authenticating with Bluesky');
log.info({ handle }, 'Authentication successful');
log.error({ err }, 'Authentication failed');

// API calls
log.debug({ limit }, 'Fetching notifications');
log.info({ count: notifications.length }, 'Notifications fetched');
log.warn({ keyword }, 'Search returned no results');
log.error({ err, uri }, 'Failed to fetch post');

// Posting
log.info({ parentPostId }, 'Posting reply');
log.info({ postId, postUrl }, 'Reply posted successfully');
log.error({ err, parentPostId }, 'Failed to post reply');
```

### 3.5 Request Logging Middleware

```typescript
// packages/backend/src/middleware/request-logger.ts
import { Request, Response, NextFunction } from 'express';
import { createComponentLogger } from '../utils/logger.js';

const log = createComponentLogger('http');

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    log[level]({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
    }, `${req.method} ${req.path}`);
  });
  
  next();
}
```

### 3.6 Database Operations (`database.ts`)

```typescript
const log = createComponentLogger('database');

// Connection
log.info('Connecting to MongoDB');
log.info({ database: dbName }, 'MongoDB connected');
log.error({ err }, 'MongoDB connection failed');

// Disconnection
log.info('Closing MongoDB connection');
log.info('MongoDB disconnected');
```

---

## 4. Privacy & Sanitization

### 4.1 Sensitive Data Rules

**Never log**:
- Credentials (passwords, API keys, tokens)
- Session tokens or cookies
- User-generated content (post text, knowledge base content)
- Full URIs with credentials

**Allowed to log**:
- User handles (public information)
- Account IDs, profile IDs (internal identifiers)
- Post IDs, URIs (platform identifiers)
- Counts and durations
- Error messages (with caution)

### 4.2 Sanitization Utilities

```typescript
// packages/backend/src/utils/logger.ts

/**
 * Sanitize MongoDB URI to hide credentials
 * mongodb://user:pass@host:port/db → mongodb://***@host:port/db
 */
export function sanitizeUri(uri: string): string {
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

/**
 * Sanitize error objects to prevent credential leaks
 */
export function sanitizeError(err: unknown): object {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // Don't include stack in production
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };
  }
  return { message: String(err) };
}
```

### 4.3 Error Logging Pattern

```typescript
// Always use sanitizeError for error objects
try {
  await riskyOperation();
} catch (err) {
  log.error({ err: sanitizeError(err) }, 'Operation failed');
  throw err;
}
```

---

## 5. Log Output Format

### 5.1 Production (JSON)

```json
{"level":30,"time":"2026-01-26T12:00:00.000Z","component":"scheduler","accountId":"507f1f77bcf86cd799439011","discoveryType":"replies","msg":"Discovery job starting"}
{"level":30,"time":"2026-01-26T12:00:05.123Z","component":"scheduler","accountId":"507f1f77bcf86cd799439011","discoveryType":"replies","opportunityCount":3,"durationMs":5123,"msg":"Discovery job completed"}
```

### 5.2 Development (Pretty)

```
[2026-01-26 12:00:00] INFO (scheduler): Discovery job starting
    accountId: "507f1f77bcf86cd799439011"
    discoveryType: "replies"
[2026-01-26 12:00:05] INFO (scheduler): Discovery job completed
    accountId: "507f1f77bcf86cd799439011"
    discoveryType: "replies"
    opportunityCount: 3
    durationMs: 5123
```

---

## 6. Migration Plan

### 6.1 Files to Update

| File | Current | Changes |
|------|---------|---------|
| `index.ts` | ~15 console statements | Replace with logger calls |
| `cron-scheduler.ts` | 1 console.error | Add lifecycle + job logging |
| `discovery-service.ts` | 0 logs | Add discovery flow logging |
| `bluesky-adapter.ts` | 2 console.error | Add auth + API call logging |
| `database.ts` | 3 console statements | Replace with dbLogger |
| `knowledge-base-service.ts` | 7 console statements | Replace with component logger |
| `response-suggestion-service.ts` | 1 console statement | Replace with component logger |

### 6.2 New Files

| File | Purpose |
|------|---------|
| `src/utils/logger.ts` | Logger factory and utilities |
| `src/middleware/request-logger.ts` | HTTP request logging middleware |

### 6.3 Dependencies to Add

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

## 7. Example: Diagnosing Issue #35

With this logging in place, the container logs for #35 scenario would show:

```
[INFO] (database): MongoDB connected { database: "ngaj" }
[INFO] (scheduler): Loading accounts from database
[INFO] (scheduler): Accounts loaded { accountCount: 0 }
[INFO] (scheduler): Scheduler initialized { jobCount: 0 }
[INFO] (scheduler): Scheduler started
[INFO] (server): Server ready { port: 3001 }
```

The key insight: `accountCount: 0` and `jobCount: 0` immediately reveal why no discovery jobs ran - no accounts were configured yet.

---

## 8. Open Questions

- [ ] Should we add request ID generation for correlation across logs?
- [ ] Should setup CLI (`packages/setup`) use the same logger or separate?

---

## References

- **Decision Rationale**: [ADR-017](../../../docs/architecture/decisions/017-structured-logging.md)
- **Test Guidance**: [Handoff Document](../handoffs/014-structured-logging-handoff.md)
- **Pino Documentation**: https://github.com/pinojs/pino
