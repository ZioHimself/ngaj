# Opportunity Dashboard UI - Implementer Handoff

**Handoff Number**: 008  
**Feature**: Opportunity Dashboard UI  
**Test Plan**: [Test Plan](./test-plans/opportunity-dashboard-ui-test-plan.md)  
**Design Reference**: [Designer Handoff](../designer/handoffs/008-opportunity-dashboard-ui-handoff.md)

---

## Test Statistics

| Category | Tests | Status |
|----------|-------|--------|
| Unit (Components) | 20 | Red |
| Integration (API) | 14 | Red |
| **Total** | **34** | **All Fail** |

Red Phase Verified: All tests fail with `Error: Not implemented` or import errors.

---

## Files Created

### Test Files

```
tests/
├── unit/components/dashboard/
│   ├── opportunity-card.spec.ts    (20 tests)
│   ├── response-editor.spec.ts     (14 tests)
│   ├── filter-bar.spec.ts          (12 tests)
│   └── pagination.spec.ts          (10 tests)
├── integration/dashboard/
│   └── dashboard-api.spec.ts       (14 tests)
└── fixtures/
    └── dashboard-fixtures.ts       (new)
```

### Component Stubs

```
packages/frontend/src/
├── components/dashboard/
│   ├── OpportunityCard.tsx         (stub)
│   ├── ResponseEditor.tsx          (stub)
│   ├── FilterBar.tsx               (stub)
│   ├── Pagination.tsx              (stub)
│   └── index.ts                    (exports)
└── pages/
    └── OpportunitiesDashboard.tsx  (stub)
```

---

## Test Coverage Breakdown

### OpportunityCard (`opportunity-card.spec.ts`)

| Test | Description |
|------|-------------|
| 1 | Display author handle |
| 2 | Display follower count formatted |
| 3 | Display score |
| 4 | Display relative time |
| 5 | Truncate long post text |
| 6 | Show Generate Response button (pending) |
| 7 | Show Dismiss button |
| 8 | Display full text when expanded |
| 9 | Display response textarea with draft |
| 10 | Show character count |
| 11 | Show Regenerate, Dismiss, Post buttons (draft) |
| 12 | Dimmed visual style (posted) |
| 13 | Show Posted badge |
| 14 | Show platform post link |
| 15 | Hide edit actions (posted) |
| 16 | Call onGenerateResponse callback |
| 17 | Call onDismiss callback |
| 18 | Disable Generate while generating |
| 19 | Show loading indicator while generating |

### ResponseEditor (`response-editor.spec.ts`)

| Test | Description |
|------|-------------|
| 1 | Display spinner when generating |
| 2 | Display "Generating response..." text |
| 3 | Disable buttons while generating |
| 4 | Render editable textarea |
| 5 | Display initial text value |
| 6 | Call onChange when user types |
| 7 | Update character count |
| 8 | Display "{length}/300" format |
| 9 | Show "300/300" at limit |
| 10 | Handle empty text "0/300" |
| 11 | Allow submission at limit |
| 12 | Warning style near limit |
| 13 | Error style over limit |
| 14 | Call onPost callback |
| 15 | Call onRegenerate callback |
| 16 | Disable Post while posting |
| 17 | Show posting indicator |

### FilterBar (`filter-bar.spec.ts`)

| Test | Description |
|------|-------------|
| 1 | Render all filter options |
| 2-6 | Display each option (All, Pending, Draft Ready, Posted, Dismissed) |
| 7 | Indicate current selection |
| 8 | Indicate "All" when selected |
| 9 | Non-selected options not active |
| 10-13 | Call onFilterChange with correct values |
| 14 | Disable buttons while loading |

### Pagination (`pagination.spec.ts`)

| Test | Description |
|------|-------------|
| 1 | Display "Page X of Y" |
| 2-4 | Correct info for various pages |
| 5 | Disable Previous on page 1 |
| 6 | Enable Previous on page 2 |
| 7 | Call onPageChange with decremented page |
| 8 | Disable Next on last page |
| 9 | Enable Next when not last |
| 10 | Call onPageChange with incremented page |
| 11 | Disable buttons during loading |
| 12 | Handle edge cases (zero, single page) |

### Dashboard API Integration (`dashboard-api.spec.ts`)

| Test | Description |
|------|-------------|
| 1 | Fetch opportunities on mount |
| 2 | Render opportunities after fetch |
| 3 | Handle network error |
| 4 | Show retry button on error |
| 5 | Fetch responses after opportunities |
| 6 | Map responses to opportunities |
| 7 | POST generate when clicked |
| 8 | Show loading during generation |
| 9 | Display draft after generation |
| 10 | Handle 503 generate error |
| 11 | PATCH + POST for posting |
| 12 | Update status after post |
| 13 | Show platform link after post |
| 14 | Preserve draft on post failure |
| 15 | PATCH dismiss endpoint |
| 16 | Remove opportunity after dismiss |
| 17 | Show empty state |
| 18 | Show refresh in empty state |
| 19 | Update offset on page change |
| 20 | Refetch on filter change |

---

## Test Fixtures

### New Fixtures (`dashboard-fixtures.ts`)

```typescript
// Factory functions
createDashboardAuthor(overrides?)      // Create Author<string>
createDashboardOpportunity(overrides?) // Create OpportunityWithAuthor<string>
createDashboardResponse(oppId, overrides?) // Create Response<string>
createPaginatedOpportunities(opps, overrides?) // Create paginated response

// Pre-configured fixtures
dashboardOpportunityFixtures.pending   // Pending opportunity
dashboardOpportunityFixtures.withDraft // With draft response
dashboardOpportunityFixtures.responded // Posted/responded
dashboardOpportunityFixtures.dismissed // Dismissed
dashboardOpportunityFixtures.longText  // Very long text (>300 chars)
dashboardOpportunityFixtures.highScore // High score opportunity

dashboardResponseFixtures.draft  // Draft response
dashboardResponseFixtures.posted // Posted with platform metadata
dashboardResponseFixtures.atLimit // At character limit

// Mock API responses
mockApiResponses.opportunitiesList     // Standard list
mockApiResponses.emptyOpportunities    // Empty list
mockApiResponses.opportunitiesPage1/2  // Paginated
mockApiResponses.responsesBatch        // Batch responses
mockApiResponses.generateSuccess       // Generate success
mockApiResponses.postSuccess           // Post success

// Mock errors
mockApiErrors.networkError
mockApiErrors.serviceUnavailable (503)
mockApiErrors.notFound (404)
mockApiErrors.serverError (500)
```

---

## Dependencies Required

Before running tests, install the testing library dependencies:

```bash
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Update `vitest.config.ts` to include jsdom environment for component tests:

```typescript
// Add to vitest.config.ts
test: {
  // ... existing config
  environmentMatchGlobs: [
    ['tests/unit/components/**', 'jsdom'],
  ],
}
```

---

## Implementation Order

### Recommended sequence:

1. **FilterBar** - Simple component, no dependencies
2. **Pagination** - Simple component, no dependencies  
3. **ResponseEditor** - Isolated component
4. **OpportunityCard** - Uses ResponseEditor internally
5. **OpportunitiesDashboard** - Composes all components

### Dependencies:

- All components need `@testing-library/react` for tests
- Consider installing `@testing-library/user-event` if not present
- Tests use `vi.fn()` mocks from Vitest

---

## Critical Tests (Must Pass First)

1. `opportunity-card.spec.ts` - "should display author handle"
2. `opportunity-card.spec.ts` - "should show Generate Response button"
3. `dashboard-api.spec.ts` - "should fetch opportunities on mount"
4. `dashboard-api.spec.ts` - "should POST to generate endpoint"
5. `dashboard-api.spec.ts` - "should PATCH to dismiss endpoint"

---

## Running Tests

```bash
# All dashboard tests
npm test -- --grep "dashboard"

# Individual component tests
npm test -- tests/unit/components/dashboard/opportunity-card.spec.ts
npm test -- tests/unit/components/dashboard/response-editor.spec.ts
npm test -- tests/unit/components/dashboard/filter-bar.spec.ts
npm test -- tests/unit/components/dashboard/pagination.spec.ts

# Integration tests
npm test -- tests/integration/dashboard/dashboard-api.spec.ts
```

---

## Expected Green Phase Output

```
✓ tests/unit/components/dashboard/opportunity-card.spec.ts (20 tests)
✓ tests/unit/components/dashboard/response-editor.spec.ts (17 tests)
✓ tests/unit/components/dashboard/filter-bar.spec.ts (14 tests)
✓ tests/unit/components/dashboard/pagination.spec.ts (12 tests)
✓ tests/integration/dashboard/dashboard-api.spec.ts (20 tests)

Test Suites: 5 passed, 5 total
Tests:       83 passed, 83 total
Time:        ~2s
```

---

## Key Implementation Notes

### Component Props

All props are defined in the stub files. Follow the interfaces exactly:

- `OpportunityCardProps` - includes callbacks and loading states
- `ResponseEditorProps` - includes maxLength (300)
- `FilterBarProps` - uses `OpportunityStatus | 'all'`
- `PaginationProps` - simple page numbers

### Data-testid Requirements

Tests expect these `data-testid` attributes:

- `opportunity-card` - on card container
- `opportunity-text` - on text content element
- `loading-spinner` - on loading indicator
- `character-count` - on count display element

### CSS Classes Expected

- `.dimmed` - on posted opportunity cards
- `.warning` - on character count near limit (>280)
- `.error` - on character count over limit (>300)

### ARIA Attributes

- Filter buttons: `aria-pressed="true|false"`
- All buttons: proper accessible names

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/opportunities?status=&limit=&offset=&sort=` | List opportunities |
| GET | `/api/responses?opportunityIds=` | Batch fetch responses |
| POST | `/api/responses/generate` | Generate response |
| PATCH | `/api/responses/:id` | Update response text |
| POST | `/api/responses/:id/post` | Post to platform |
| PATCH | `/api/opportunities/:id` | Update status (dismiss) |

---

## Known Limitations

- **E2E tests**: Not included (Playwright setup separate)
- **Mobile responsive**: Tests assume desktop layout
- **WebSocket**: Real-time updates not in v0.1

---

## Success Criteria

Implementation is complete when:

- [ ] All 34 tests pass
- [ ] No linter errors
- [ ] Components render correctly
- [ ] API integration works
- [ ] Error states display properly
- [ ] Loading states show correctly
- [ ] Pagination navigates properly
- [ ] Filters work correctly

---

## References

- [ADR-013: Opportunity Dashboard UI](../../../docs/architecture/decisions/013-opportunity-dashboard-ui.md)
- [Designer Handoff](../designer/handoffs/008-opportunity-dashboard-ui-handoff.md)
- [Opportunity Types](../../../packages/shared/src/types/opportunity.ts)
- [Response Types](../../../packages/shared/src/types/response.ts)
