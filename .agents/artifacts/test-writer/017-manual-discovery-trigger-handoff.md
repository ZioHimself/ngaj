# Test-Writer Handoff: Manual Discovery Trigger Endpoint

**Handoff Number**: 017
**Feature**: Issue #34 - Add manual discovery trigger endpoint
**Date**: January 26, 2026
**Status**: Red Phase Complete

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 8 |
| Integration Tests | 8 |
| Unit Tests | 0 |
| E2E Tests | 0 |
| **Red Phase** | ✅ 7 tests failing, 1 passing (auth test) |

## Files Created

### Test Files
- `tests/integration/api/discovery-api.spec.ts` - Integration tests for discovery endpoint

### Documentation
- `.agents/artifacts/test-writer/test-plans/manual-discovery-trigger-test-plan.md` - Test plan

## Test Coverage Breakdown

### POST /api/discovery/run

| # | Test Name | Priority | Status |
|---|-----------|----------|--------|
| 1 | should trigger discovery and return count | High | ❌ Failing |
| 2 | should return discovered opportunities count in response | High | ❌ Failing |
| 3 | should run both replies and search discovery types | High | ❌ Failing |
| 4 | should return 0 count when no opportunities discovered | Medium | ❌ Failing |
| 5 | should return empty result when no account configured | Medium | ❌ Failing |
| 6 | should return 401 when not authenticated | High | ✅ Passing |
| 7 | should handle discovery errors gracefully | Medium | ❌ Failing |
| 8 | should work when account has no keywords/interests configured | Low | ❌ Failing |

## Implementation Order (Recommended)

1. **Add endpoint route** in `packages/backend/src/index.ts`
2. **Implement handler logic**:
   - Get first account from database (MVP simplification)
   - Call `DiscoveryService.discover()` for enabled schedule types
   - Return aggregated counts
3. **Handle edge cases**:
   - No account configured → return empty result
   - No keywords/interests → skip search type
   - Discovery errors → return 500 with error message

## Expected Response Format

```typescript
// Success response
interface DiscoveryRunResponse {
  discoveredCount: number;  // Total opportunities discovered
  repliesCount: number;     // Opportunities from replies discovery
  searchCount: number;      // Opportunities from search discovery
}

// No account configured
interface EmptyResponse {
  discoveredCount: 0;
  repliesCount: 0;
  searchCount: 0;
  message: 'No account configured';
}

// Error response (500)
interface ErrorResponse {
  error: string;
}
```

## Running Tests

```bash
# Run all discovery API tests
npm test -- tests/integration/api/discovery-api.spec.ts

# Run specific test
npm test -- tests/integration/api/discovery-api.spec.ts -t "should trigger discovery"

# Run with verbose output
npm test -- tests/integration/api/discovery-api.spec.ts --reporter=verbose
```

## Expected Green Phase Output

```
 ✓ tests/integration/api/discovery-api.spec.ts (8 tests) 
   ✓ POST /api/discovery/run
     ✓ should trigger discovery and return count
     ✓ should return discovered opportunities count in response
     ✓ should run both replies and search discovery types
     ✓ should return 0 count when no opportunities discovered
     ✓ should return empty result when no account configured
     ✓ should return 401 when not authenticated
     ✓ should handle discovery errors gracefully
     ✓ should work when account has no keywords or interests configured

 Test Files  1 passed (1)
 Tests       8 passed (8)
```

## Key Implementation Notes

### 1. Endpoint Location
Add the endpoint in `packages/backend/src/index.ts` near the other opportunities endpoints (around line 280).

### 2. Service Integration
The `DiscoveryService` already exists with the `discover()` method:

```typescript
// Existing service method signature
async discover(accountId: ObjectId, discoveryType: DiscoveryType): Promise<OpportunityDocument[]>
```

### 3. MVP Simplification
For v0.1, get the first account (single-account MVP):
```typescript
const account = await db.collection('accounts').findOne({});
```

### 4. Discovery Types
Run both discovery types if enabled:
```typescript
// Check which schedules are enabled
const enabledSchedules = account.discovery.schedules.filter(s => s.enabled);
```

### 5. Error Handling Pattern
Follow existing patterns in the codebase:
```typescript
try {
  // Discovery logic
} catch (error) {
  console.error('Error running discovery:', error);
  res.status(500).json({ error: 'Failed to run discovery' });
}
```

## Dependencies

The tests use these existing fixtures (no new fixtures needed):
- `tests/fixtures/auth-fixtures.ts` - Login helpers
- `tests/fixtures/profile-fixtures.ts` - Profile factory
- `tests/fixtures/account-fixtures.ts` - Account factory

## Known Limitations

1. **No real Bluesky API calls**: Tests use mock in test setup, implementation will need actual `DiscoveryService` integration
2. **Single account only**: MVP assumes one account per instance
3. **No dashboard button testing**: Frontend integration is out of scope for this handoff

## Success Criteria

- [ ] All 8 tests pass
- [ ] Endpoint returns correct response format
- [ ] Error cases handled gracefully
- [ ] No linter errors
- [ ] TypeScript compiles without errors

## References

- [ADR-008: Opportunity Discovery Architecture](../../../docs/architecture/decisions/008-opportunity-discovery-architecture.md)
- [Test Plan](./test-plans/manual-discovery-trigger-test-plan.md)
- [Existing Discovery Service](../../../packages/backend/src/services/discovery-service.ts)
- [GitHub Issue #34](https://github.com/ZioHimself/ngaj/issues/34)
