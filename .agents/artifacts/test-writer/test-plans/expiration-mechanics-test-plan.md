# Expiration Mechanics - Test Plan

📋 **Handoff Number**: 018
🔗 **Design Rationale**: [ADR-018](../../../docs/architecture/decisions/018-expiration-mechanics.md)
🔗 **Technical Specs**: [Design Document](../designer/designs/expiration-mechanics-design.md)
🔗 **Designer Handoff**: [015-expiration-mechanics-handoff.md](../designer/handoffs/015-expiration-mechanics-handoff.md)

---

## 1. Test Coverage Summary

| Category | Test File | Tests | Priority |
|----------|-----------|-------|----------|
| Unit | `cleanup-service.spec.ts` | 19 | Critical |
| Unit | `scoring-service-weights.spec.ts` | 12 | Important |
| Integration | `bulk-dismiss-api.spec.ts` | 18 | Critical |
| Integration | `query-filtering.spec.ts` | 11 | Critical |
| Component | `selection-mode.spec.tsx` | 28 | Important |
| **Total** | | **88** | |

---

## 2. Test Categories

### 2.1 Unit Tests: CleanupService

**File**: `tests/unit/services/cleanup-service.spec.ts`

**Coverage**:
- Mark pending → expired when TTL exceeded
- Hard delete opportunities with status=expired (immediate)
- Hard delete dismissed opportunities (after 5 min retention)
- Cascade delete associated responses
- Preserve responded opportunities (never delete)
- Complete cleanup cycle orchestration
- Start/stop scheduled job

**Mock Strategy**:
- Use `mongodb-memory-server` for database operations
- Use `vi.useFakeTimers()` for time-based tests

---

### 2.2 Unit Tests: ScoringService (70/30 Weights)

**File**: `tests/unit/services/scoring-service-weights.spec.ts`

**Coverage**:
- Verify 70% recency weight
- Verify 30% impact weight
- Weighted total calculation
- Recency prioritization over impact
- Score rounding behavior

**Expected Change**: `RECENCY_WEIGHT` from 0.6 → 0.7, `IMPACT_WEIGHT` from 0.4 → 0.3

---

### 2.3 Integration Tests: Bulk Dismiss API

**File**: `tests/integration/api/bulk-dismiss-api.spec.ts`

**Coverage**:
- Dismiss multiple pending opportunities
- Skip already-dismissed opportunities
- Skip responded opportunities
- Skip opportunities from other accounts
- Cross-account protection (200 OK with skipped, not 403)
- Error handling (missing/invalid IDs)
- Batch size handling (50+ items)

**Mock Strategy**:
- Use `mongodb-memory-server` for database
- Use `supertest` for HTTP requests
- Real Express app with middleware

---

### 2.4 Integration Tests: Query Filtering

**File**: `tests/integration/database/query-filtering.spec.ts`

**Coverage**:
- Exclude pending with expired `expiresAt`
- Include pending with future `expiresAt`
- Mixed status filtering
- TTL boundary (4 hours)
- Edge cases (exactly-now expiry)

**Query Change**: Add `expiresAt: { $gt: new Date() }` to pending status queries

---

### 2.5 Component Tests: Selection Mode UI

**File**: `tests/unit/components/dashboard/selection-mode.spec.tsx`

**Coverage**:
- Desktop: checkbox hidden by default, visible on hover
- Desktop: checkbox click toggles selection
- Desktop: selection mode activation
- Mobile: long-press (500ms) enters selection mode
- Mobile: tap toggles selection in selection mode
- Mobile: card expand disabled in selection mode
- "Select others" inversion logic
- Cancel clears selection and exits mode

**Mock Strategy**:
- Use `@testing-library/react` for rendering
- Use `vi.useFakeTimers()` for long-press timing

---

## 3. Test Priorities

### Critical Path (Must Pass)
1. ✅ Cleanup marks expired correctly
2. ✅ Cleanup hard deletes expired (immediate)
3. ✅ Cleanup hard deletes dismissed (after 5 min)
4. ✅ Cascade delete responses
5. ✅ Bulk dismiss API works
6. ✅ Query excludes expired from pending

### Important (Should Pass)
7. ⬜ Scoring weights updated to 70/30
8. ⬜ Selection mode desktop checkbox hover
9. ⬜ Selection mode mobile long-press
10. ⬜ "Select others" inverts selection

### Nice to Have (May Defer)
11. ⬜ E2E full cleanup cycle
12. ⬜ Selection mode visual polish
13. ⬜ Edge case: concurrent cleanup runs

---

## 4. Mock Strategy

### Database Mocking
- **Tool**: `mongodb-memory-server`
- **Approach**: Full in-memory MongoDB instance
- **Seed**: Create fixtures before each test
- **Verify**: Query collections after operations

### Time Mocking
- **Tool**: `vi.useFakeTimers()` / `vi.useRealTimers()`
- **Use Cases**:
  - 5-minute dismissed retention boundary
  - 4-hour TTL expiration
  - 500ms long-press duration
- **Reset**: `vi.useRealTimers()` in afterEach

### HTTP Mocking
- **Tool**: `supertest` with Express
- **Approach**: Real middleware, mocked database
- **Session**: Pre-authenticated session cookies

---

## 5. Test Data Fixtures

**File**: `tests/fixtures/cleanup-fixtures.ts`

| Factory | Purpose |
|---------|---------|
| `createExpiredOpportunity` | Pending with past expiresAt |
| `createRecentOpportunity` | Pending with future expiresAt |
| `createExpiredStatusOpportunity` | Status = 'expired' |
| `createDismissedOpportunity(minutesAgo)` | Dismissed with configurable age |
| `createRespondedOpportunity` | Never-delete case |
| `createLinkedResponse` | For cascade delete tests |
| `createBulkOpportunities` | For batch operations |
| `scoringScenarios70_30` | Expected 70/30 weight results |

---

## 6. Test Execution

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- tests/unit/services/cleanup-service.spec.ts
npm test -- tests/integration/api/bulk-dismiss-api.spec.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

---

## 7. Known Limitations

### Out of Scope
- ❌ Undo dismiss functionality
- ❌ Analytics/audit trail
- ❌ Performance benchmarks
- ❌ Concurrent cleanup run handling

### Test Coverage Gaps
- E2E tests deferred (would require full stack)
- Visual regression tests not included
- Load testing not included

---

## 8. Dependencies

### New Packages
- None (uses existing `mongodb-memory-server`)

### Existing Test Infrastructure
- `vitest` - Test runner
- `@testing-library/react` - Component testing
- `supertest` - HTTP testing
- `mongodb-memory-server` - Database mocking

---

## 9. Success Criteria

Test suite is complete when:
- [ ] All 88 tests pass
- [ ] CleanupService has 100% method coverage
- [ ] Bulk dismiss API tested with valid/invalid inputs
- [ ] Selection mode tested on desktop and mobile viewports
- [ ] Time-based logic tested with mocked timers
- [ ] Cascade delete verified
- [ ] No linter errors in test code

---

## References

- **Decision Rationale**: [ADR-018](../../../docs/architecture/decisions/018-expiration-mechanics.md)
- **Technical Specs**: [Design Document](../designer/designs/expiration-mechanics-design.md)
- **Designer Handoff**: [015-expiration-mechanics-handoff.md](../designer/handoffs/015-expiration-mechanics-handoff.md)
