# ADR-002: Credentials in Environment Variables

## Status
Accepted

## Context
Need to store platform credentials securely for local-first app

## Decision
Use environment variables (.env file) instead of database storage

## Rationale
- Simpler than encryption (no master password needed)
- Follows 12-factor app principles
- Easy credential rotation
- Perfect for v0.1 single-account scope
- User controls security via file system permissions

## Consequences
- Less flexible for multi-account (future problem)
- Requires user to manage .env file
- But: acceptable trade-off for MVP simplicity