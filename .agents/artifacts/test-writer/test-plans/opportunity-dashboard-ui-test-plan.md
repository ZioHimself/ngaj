# Opportunity Dashboard UI - Test Plan

**Handoff Number**: 008  
**Feature**: Opportunity Dashboard UI  
**Based on**: [Designer Handoff](../../designer/handoffs/008-opportunity-dashboard-ui-handoff.md)  
**Design Rationale**: [ADR-013](../../../../docs/architecture/decisions/013-opportunity-dashboard-ui.md)

---

## Test Coverage Summary

### Test Categories

| Category | Tests | Focus |
|----------|-------|-------|
| Unit (Components) | 16 | React components rendering and behavior |
| Integration (API) | 10 | API fetch, mutation, and error handling |
| E2E | 3 | Complete user workflows |
| **Total** | **29** | |

### Test Organization

```
tests/
├── unit/
│   └── components/
│       └── dashboard/
│           ├── opportunity-card.spec.ts
│           ├── response-editor.spec.ts
│           ├── filter-bar.spec.ts
│           └── pagination.spec.ts
├── integration/
│   └── dashboard/
│       └── dashboard-api.spec.ts
├── e2e/
│   └── features/
│       └── opportunity-dashboard.spec.ts (placeholder for Playwright)
└── fixtures/
    └── dashboard-fixtures.ts
```

---

## Mock Strategy

### External Dependencies Mocked

| Dependency | Mock Strategy | Rationale |
|------------|---------------|-----------|
| Backend API | MSW handlers or vi.fn fetch | No real backend calls |
| Time/Dates | `vi.useFakeTimers()` | Consistent relative time display |

### Test Data

- **Fixtures**: `tests/fixtures/dashboard-fixtures.ts`
- **Reuses existing**: `opportunity-fixtures.ts`, `response-fixtures.ts`
- **New fixtures**: Dashboard-specific UI fixtures

---

## Test Priorities

### Critical Path (Must Pass)

1. Opportunities load and display correctly
2. Generate response creates draft
3. Post response succeeds
4. Dismiss removes opportunity
5. Error states display appropriately

### Important (Should Pass)

6. Pagination navigates correctly
7. Filters change displayed opportunities
8. Character count updates
9. Empty states render

### Nice to Have (May Defer)

10. Skeleton loading states
11. Keyboard accessibility

---

## Unit Tests: Components

### OpportunityCard (6 tests)

- Renders collapsed pending opportunity with required info
- Renders expanded opportunity with draft
- Renders posted opportunity (dimmed + checkmark)
- Generate Response button triggers callback
- Dismiss button triggers callback  
- Long text is truncated with ellipsis

### ResponseEditor (4 tests)

- Displays generating/loading state
- Enables text editing
- Character count updates on keystroke
- Shows correct count at character limit

### FilterBar (3 tests)

- Renders all filter options
- Shows current selection
- Fires callback with correct value on change

### Pagination (3 tests)

- Disables Previous on page 1
- Disables Next on last page
- Displays correct page info

---

## Integration Tests: API

### Load Opportunities (2 tests)

- Fetches opportunities on mount with correct params
- Handles network error gracefully

### Batch Load Responses (2 tests)

- Fetches responses for opportunity IDs
- Maps responses to opportunities correctly

### Generate Response (2 tests)

- POST succeeds and shows draft
- Handles 503 error with retry option

### Post Response (2 tests)

- PATCH + POST succeeds and updates status
- Handles failure, preserves draft

### Dismiss Opportunity (2 tests)

- PATCH succeeds and removes from list
- Handles failure gracefully

---

## Edge Cases

| Scenario | Test Coverage |
|----------|---------------|
| Empty opportunities list | Empty state with refresh |
| Network error on load | Error banner with retry |
| Generate while generating | Button disabled |
| Very long post text | Truncate with expand |

---

## Known Limitations

- **E2E tests**: Placeholder only (Playwright setup separate task)
- **Mobile responsive**: Not tested in v0.1
- **WebSocket updates**: Not in v0.1

---

## Success Criteria

- [ ] All 29 tests written
- [ ] All tests fail (Red phase)
- [ ] Component stubs created
- [ ] Fixtures support all scenarios
- [ ] No linter errors in test code

---

## References

- [ADR-013](../../../../docs/architecture/decisions/013-opportunity-dashboard-ui.md)
- [Design Document](../../designer/designs/opportunity-dashboard-ui-design.md)
- [Opportunity Types](../../../../packages/shared/src/types/opportunity.ts)
- [Response Types](../../../../packages/shared/src/types/response.ts)
