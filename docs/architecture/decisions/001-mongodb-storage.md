# ADR-001: Use MongoDB for Configuration Storage

## Status
Accepted

## Context
Need to store account configs, opportunity dashboard data, and response history.
Options: SQLite, PostgreSQL, MongoDB, JSON files

## Decision
Use MongoDB for all structured data

## Rationale
- JSON-native (matches our TypeScript objects)
- Schemaless allows fast iteration
- Good Node.js ecosystem
- Local deployment via docker-compose
- Easier than SQL for nested objects (platforms array, etc.)

## Consequences
- Requires MongoDB installation
- More overhead than SQLite for single user
- But: easier to extend to multi-user later