# Expiration Mechanics - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-018](../../../docs/architecture/decisions/018-expiration-mechanics.md)
🔗 **Technical Specs**: [Design Document](../designs/expiration-mechanics-design.md)

## Overview

Test coverage for opportunity expiration, cleanup service, bulk dismiss API, and selection mode UI.

---

## 1. Test Scope

### In Scope
- ✅ CleanupService: expiration marking, hard deletion, cascade
- ✅ Scoring rebalance (70/30 weights)
- ✅ Query filtering (exclude expired from pending)
- ✅ Bulk dismiss API endpoint
- ✅ Selection mode UI (desktop checkbox, mobile long-press)
- ✅ "Select all" functionality
- ✅ "Select others" functionality

### Out of Scope
- ❌ Undo dismiss (not implemented)
- ❌ Analytics/audit trail (future v0.2)
- ❌ Performance benchmarks

---

## 2. Unit Tests: CleanupService

### Scenario: Mark pending opportunities as expired
**Given**: Opportunities with `status: 'pending'` and `expiresAt` in the past
**When**: `cleanup()` is called
**Then**: Status updated to `'expired'`

**Acceptance Criteria**:
- [ ] Only pending opportunities are marked expired
- [ ] Opportunities with future `expiresAt` remain pending
- [ ] `updatedAt` is set to current time

---

### Scenario: Hard delete expired opportunities immediately
**Given**: Opportunities with `status: 'expired'`
**When**: `cleanup()` is called
**Then**: Expired opportunities are deleted from MongoDB

**Acceptance Criteria**:
- [ ] All expired opportunities deleted in single operation
- [ ] Returns count of deleted items in `CleanupStats.deletedExpired`

---

### Scenario: Hard delete dismissed opportunities after 5 minutes
**Given**: Opportunities with `status: 'dismissed'` and `updatedAt` > 5 minutes ago
**When**: `cleanup()` is called
**Then**: Dismissed opportunities are deleted

**Acceptance Criteria**:
- [ ] Dismissed < 5 minutes old are NOT deleted
- [ ] Dismissed >= 5 minutes old ARE deleted
- [ ] Returns count in `CleanupStats.deletedDismissed`

---

### Scenario: Cascade delete associated responses
**Given**: Responses linked to opportunities being deleted
**When**: `cleanup()` deletes opportunities
**Then**: Associated responses are also deleted

**Acceptance Criteria**:
- [ ] Responses with `opportunityId` matching deleted opportunities are removed
- [ ] Returns count in `CleanupStats.deletedResponses`
- [ ] Responses for non-deleted opportunities remain

---

### Scenario: Preserve responded opportunities
**Given**: Opportunities with `status: 'responded'`
**When**: `cleanup()` is called
**Then**: Responded opportunities are NOT affected

**Acceptance Criteria**:
- [ ] Status remains `'responded'`
- [ ] Document not deleted regardless of age

---

## 3. Unit Tests: ScoringService

### Scenario: Apply updated scoring weights (70/30)
**Given**: A post with recency score 80 and impact score 60
**When**: `calculateTotalScore()` is called
**Then**: Returns `0.70 * 80 + 0.30 * 60 = 74`

**Acceptance Criteria**:
- [ ] Recency weight is 0.70
- [ ] Impact weight is 0.30
- [ ] Result is rounded to integer

---

## 4. Integration Tests: Query Filtering

### Scenario: Exclude expired from pending query
**Given**: Database contains:
  - 2 pending opportunities (not expired)
  - 1 pending opportunity with `expiresAt` in past
  - 1 expired opportunity
**When**: `getOpportunities(status: 'pending')` is called
**Then**: Returns only 2 non-expired pending opportunities

**Acceptance Criteria**:
- [ ] Query includes `expiresAt > now` condition
- [ ] Expired status items excluded
- [ ] Pending with future expiry included

---

## 5. Integration Tests: Bulk Dismiss API

### Scenario: Dismiss multiple opportunities
**Given**: 5 pending opportunities belonging to account
**When**: `POST /api/opportunities/bulk-dismiss` with 3 IDs
**Then**: 3 opportunities marked as dismissed

**Acceptance Criteria**:
- [ ] Returns 200 OK
- [ ] Response includes `{ dismissed: 3, skipped: [] }`
- [ ] Dismissed opportunities have `status: 'dismissed'`
- [ ] `updatedAt` set on each

---

### Scenario: Skip non-pending opportunities in bulk dismiss
**Given**: Mix of pending, responded, and dismissed opportunities
**When**: Bulk dismiss includes IDs of all types
**Then**: Only pending ones are dismissed

**Acceptance Criteria**:
- [ ] Responded opportunities unchanged
- [ ] Already-dismissed opportunities unchanged
- [ ] Skipped IDs returned in response

---

### Scenario: Skip opportunities from other accounts
**Given**: Opportunity belonging to different account
**When**: Bulk dismiss includes that ID
**Then**: Opportunity not dismissed

**Acceptance Criteria**:
- [ ] Account ID filter applied
- [ ] Cross-account dismiss prevented
- [ ] Returns 200 (not 403) with ID in skipped list

---

## 6. Component Tests: Selection Mode UI

### Scenario: Desktop - checkbox appears on hover
**Given**: OpportunityCard rendered on desktop
**When**: Mouse hovers over card
**Then**: Checkbox becomes visible

**Acceptance Criteria**:
- [ ] Checkbox has `opacity-0` by default
- [ ] Checkbox has `opacity-100` on hover
- [ ] Checkbox clickable when visible

---

### Scenario: Desktop - clicking checkbox selects item
**Given**: Checkbox visible on hover
**When**: User clicks checkbox
**Then**: Item added to selection, selection mode activated

**Acceptance Criteria**:
- [ ] `isSelected` state toggles
- [ ] `isSelectionMode` becomes true
- [ ] Visual indicator shows selected state

---

### Scenario: Mobile - long-press enters selection mode
**Given**: OpportunityCard rendered on mobile
**When**: User presses and holds for 500ms
**Then**: Selection mode activated, item selected

**Acceptance Criteria**:
- [ ] Timer starts on touchstart
- [ ] Selection triggers after 500ms
- [ ] Timer cancelled on touchend before 500ms
- [ ] Normal tap does NOT enter selection mode

---

### Scenario: Mobile - tap toggles selection in selection mode
**Given**: Selection mode is active
**When**: User taps a card
**Then**: Selection toggles (no expand/collapse)

**Acceptance Criteria**:
- [ ] Tap adds unselected item to selection
- [ ] Tap removes selected item from selection
- [ ] Card expand/collapse disabled in selection mode

---

### Scenario: "Select all" selects all visible opportunities
**Given**: 10 opportunities visible, 3 already selected
**When**: User clicks "Select all"
**Then**: All 10 opportunities become selected

**Acceptance Criteria**:
- [ ] All visible opportunities added to selection
- [ ] Count updates to total visible (10)
- [ ] Works regardless of prior selection state
- [ ] Only selects opportunities in current filter view (not across pagination)

---

### Scenario: "Select others" inverts selection
**Given**: 10 opportunities visible, 3 selected
**When**: User clicks "Select others"
**Then**: 7 become selected, 3 become unselected

**Acceptance Criteria**:
- [ ] Selection inverted for all visible items
- [ ] Count updates to 7
- [ ] Original 3 no longer selected

---

### Scenario: "Select all" then "Select others" clears selection
**Given**: User clicked "Select all" (10 selected)
**When**: User clicks "Select others"
**Then**: 0 opportunities selected

**Acceptance Criteria**:
- [ ] When all are selected, "Select others" results in empty selection
- [ ] Selection count updates to 0
- [ ] Selection mode remains active (user can select again)

---

### Scenario: Cancel exits selection mode
**Given**: Selection mode active with items selected
**When**: User clicks "Cancel"
**Then**: Selection mode deactivated, selection cleared

**Acceptance Criteria**:
- [ ] `isSelectionMode` becomes false
- [ ] `selectedIds` cleared
- [ ] UI returns to normal state

---

## 7. E2E Tests

### Scenario: Full cleanup cycle
**Given**: Discovery has created 100 opportunities over 6 hours
**When**: Cleanup job runs
**Then**: Old opportunities expired and deleted

**Test Setup**:
- Insert opportunities with various `discoveredAt` times
- Some pending (recent), some pending (old), some dismissed
- Run cleanup
- Verify counts match expectations

---

### Scenario: Bulk dismiss and cleanup
**Given**: User views dashboard with 20 opportunities
**When**: User selects 10 and dismisses, then waits 5+ minutes
**Then**: Dismissed opportunities deleted on next cleanup

**Test Steps**:
1. Load dashboard
2. Enter selection mode
3. Select 10 items
4. Click "Dismiss selected"
5. Verify dismissed status
6. Advance time 5 minutes
7. Trigger cleanup
8. Verify items deleted

---

## 8. Test Fixtures

```typescript
// tests/fixtures/cleanup-fixtures.ts

export const createExpiredOpportunity = (overrides = {}) => ({
  _id: new ObjectId(),
  status: 'pending',
  discoveredAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
  expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000),    // 1 hour ago
  ...overrides
});

export const createRecentOpportunity = (overrides = {}) => ({
  _id: new ObjectId(),
  status: 'pending',
  discoveredAt: new Date(),
  expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
  ...overrides
});

export const createDismissedOpportunity = (minutesAgo: number, overrides = {}) => ({
  _id: new ObjectId(),
  status: 'dismissed',
  updatedAt: new Date(Date.now() - minutesAgo * 60 * 1000),
  ...overrides
});
```

---

## 9. Mock Guidance

### Database Mocking
- Use in-memory MongoDB (`mongodb-memory-server`) for integration tests
- Seed with fixture data before each test
- Verify deletions by querying collection after cleanup

### Time Mocking
- Use `jest.useFakeTimers()` for testing time-based logic
- Advance time with `jest.advanceTimersByTime(ms)`
- Reset between tests

---

## 10. Test Priorities

### Critical Path (Must Pass)
1. Cleanup marks expired correctly
2. Cleanup hard deletes expired (immediate)
3. Cleanup hard deletes dismissed (after 5 min)
4. Cascade delete responses
5. Bulk dismiss API works
6. Query excludes expired from pending

### Important (Should Pass)
7. Scoring weights updated to 70/30
8. Selection mode desktop checkbox hover
9. Selection mode mobile long-press
10. "Select all" selects all visible
11. "Select others" inverts selection

### Nice to Have (May Defer)
12. E2E full cleanup cycle
13. Selection mode visual polish
14. Edge case: concurrent cleanup runs

---

## 11. Definition of Done

Test suite is complete when:
- [ ] All critical path scenarios pass
- [ ] CleanupService methods have 100% coverage
- [ ] Bulk dismiss API tested with valid/invalid inputs
- [ ] Selection mode tested on both desktop and mobile viewports
- [ ] Time-based logic tested with mocked timers
- [ ] Cascade delete verified (responses removed)
- [ ] Tests fail before implementation (Red phase)

---

## References

- **Decision Rationale**: [ADR-018](../../../docs/architecture/decisions/018-expiration-mechanics.md)
- **Technical Specs**: [Design Document](../designs/expiration-mechanics-design.md)
- **Original Discovery Tests**: `tests/unit/services/discovery-service.spec.ts`
- **Dashboard Tests**: `tests/unit/components/dashboard/`
