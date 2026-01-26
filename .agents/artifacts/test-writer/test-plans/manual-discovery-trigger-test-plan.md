# Test Plan: Manual Discovery Trigger Endpoint

**Handoff Number**: 017
**Feature**: Issue #34 - Add manual discovery trigger endpoint
**Date**: January 26, 2026

## Overview

This test plan covers the `POST /api/discovery/run` endpoint that allows users to manually trigger opportunity discovery. This endpoint enables the dashboard refresh button to initiate on-demand discovery without waiting for scheduled cron jobs.

## References

- **ADR**: [ADR-008: Opportunity Discovery Architecture](../../../docs/architecture/decisions/008-opportunity-discovery-architecture.md)
- **Issue**: GitHub Issue #34

## Test Coverage Summary

| Category | Tests | Priority |
|----------|-------|----------|
| Integration | 8 | High |
| Unit | 0 | N/A |
| E2E | 0 | Deferred |

**Rationale**: This feature is primarily an API endpoint that orchestrates existing discovery logic. Integration tests provide the most value by testing the full request/response cycle with the database and services.

## Test Categories

### Integration Tests (`tests/integration/api/discovery-api.spec.ts`)

#### Happy Path
1. ✅ `POST /api/discovery/run` triggers discovery and returns count
2. ✅ Returns discovered opportunities count in response
3. ✅ Runs both 'replies' and 'search' discovery types

#### Edge Cases
4. ✅ Returns 0 count when no opportunities discovered
5. ✅ Returns empty result when no account configured

#### Error Cases
6. ✅ Returns 401 when not authenticated
7. ✅ Handles discovery errors gracefully (500 status)

#### Boundary Conditions
8. ✅ Works when account has no keywords/interests configured

## Mock Strategy

| Dependency | Mock Approach | Rationale |
|------------|---------------|-----------|
| MongoDB | In-memory (`mongodb-memory-server`) | Fast, isolated tests |
| DiscoveryService | Spy/mock `discover()` method | Control discovery outcomes |
| Platform Adapter | Not directly mocked (controlled via DiscoveryService mock) | Service abstraction layer |
| Session | Supertest cookies | Realistic auth flow |

## Test Data

### Required Fixtures
- `account-fixtures.ts` - Test account with discovery schedules
- `profile-fixtures.ts` - Test profile with keywords/interests
- `auth-fixtures.ts` - Authentication helpers

### Test Scenarios

| Scenario | Account | Profile | Expected Result |
|----------|---------|---------|-----------------|
| Normal discovery | Active with schedules | Has keywords | Count > 0 |
| No account | None | None | Empty result |
| No keywords | Active | Empty keywords | Count = 0 (search skipped) |
| Discovery error | Active | Has keywords | 500 error |

## Test Organization

```
tests/
└── integration/
    └── api/
        └── discovery-api.spec.ts  # All discovery endpoint tests
```

## Known Limitations

1. **No E2E tests**: Dashboard button testing deferred to UI feature testing
2. **No real Bluesky calls**: Platform adapter mocked at service level
3. **No rate limit testing**: Beyond current scope

## Success Criteria

- [ ] All 8 integration tests written
- [ ] All tests fail with clear error messages (Red phase)
- [ ] Tests use existing fixture patterns
- [ ] No linter errors in test code
- [ ] TypeScript compiles without errors
