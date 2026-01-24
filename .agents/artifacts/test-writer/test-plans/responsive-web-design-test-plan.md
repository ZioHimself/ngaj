# Responsive Web Design Test Plan

📋 **Handoff Number**: 015
📅 **Created**: 2026-01-24
🔗 **Based on**: [ADR-015: Mobile-First Responsive Web Design](../../../docs/architecture/decisions/015-responsive-web-design.md)
🔗 **Design Reference**: [Responsive Web Design Design Doc](../designer/designs/responsive-web-design.md)

## Overview

This test plan covers adaptations to existing UI tests to align with ADR-015's mobile-first responsive design requirements. The primary changes involve:

1. **Pagination → LoadMore**: Replacing numbered pagination with "Load more" button pattern
2. **ResponseEditor → ResponseModal**: Full-screen modal on mobile with backdrop on desktop
3. **Touch Targets**: Verifying 48px minimum height (h-12) for interactive elements on mobile
4. **Responsive Layouts**: Testing mobile-first breakpoint behavior

## Test Coverage Summary

### Tests to Modify

| Original Test File | Changes Required |
|--------------------|------------------|
| `pagination.spec.tsx` | Rename to `load-more.spec.tsx`, replace numbered page tests with load more pattern |
| `response-editor.spec.tsx` | Rename to `response-modal.spec.tsx`, add modal behavior tests |
| `opportunity-card.spec.tsx` | Add responsive layout tests for button stacking |
| `filter-bar.spec.tsx` | Add horizontal scroll tests for mobile |
| `dashboard-api.spec.tsx` | Update pagination integration tests to use load more |

### New Test Categories

| Category | Tests | Priority |
|----------|-------|----------|
| LoadMore Button | 8 | Critical |
| ResponseModal | 10 | Critical |
| Touch Targets | 6 | High |
| Responsive Layout | 8 | High |
| Horizontal Scroll | 4 | Medium |

## Test Categories

### 1. LoadMore Component Tests (Replaces Pagination)

**File**: `tests/unit/components/dashboard/load-more.spec.tsx`

| Test | Description |
|------|-------------|
| `should render "Load More" button when hasMore is true` | Verify button presence |
| `should hide "Load More" button when hasMore is false` | Verify button hidden |
| `should display "{loadedCount} of {totalCount} loaded"` | Count display format |
| `should call onLoadMore when button clicked` | Click handler |
| `should disable button during loading` | Loading state |
| `should show spinner during loading` | Loading indicator |
| `should display "Showing all X opportunities" when all loaded` | End state message |
| `should have 48px height (h-12) for touch target` | Touch target compliance |

### 2. ResponseModal Tests (Enhanced ResponseEditor)

**File**: `tests/unit/components/dashboard/response-modal.spec.tsx`

| Test | Description |
|------|-------------|
| `should render full-screen on mobile (inset-0)` | Mobile layout |
| `should render centered modal with backdrop on desktop` | Desktop layout |
| `should show "Back" button on mobile` | Mobile navigation |
| `should close when backdrop clicked on desktop` | Desktop interaction |
| `should display character count` | Existing functionality |
| `should call onPost when Post button clicked` | Post action |
| `should call onRegenerate when Regenerate clicked` | Regenerate action |
| `should disable Post when text empty` | Validation |
| `should show original post preview in details element` | Original context |
| `should have 48px height buttons on mobile` | Touch target compliance |

### 3. OpportunityCard Responsive Tests

**File**: `tests/unit/components/dashboard/opportunity-card.spec.tsx` (update existing)

| Test | Description |
|------|-------------|
| `should render buttons full-width on mobile (flex-col)` | Mobile layout |
| `should render buttons inline on desktop (flex-row)` | Desktop layout |
| `should have h-12 button height on mobile` | Touch target |
| `should have h-10 button height on desktop` | Desktop sizing |
| `should display header in single line on mobile` | Mobile header |
| `should display header with score inline on desktop` | Desktop header |

### 4. FilterBar Responsive Tests

**File**: `tests/unit/components/dashboard/filter-bar.spec.tsx` (update existing)

| Test | Description |
|------|-------------|
| `should have overflow-x-auto for mobile scroll` | Scroll container |
| `should have scrollbar-hide class` | Hidden scrollbar |
| `should render pill-shaped buttons (rounded-full)` | Pill styling |
| `should have shrink-0 on filter buttons` | No shrinking |

### 5. Dashboard Integration Tests (LoadMore)

**File**: `tests/integration/dashboard/dashboard-api.spec.tsx` (update existing)

| Test | Description |
|------|-------------|
| `should append opportunities when Load More clicked` | Append behavior |
| `should show "Load More" when hasMore is true` | Initial state |
| `should hide "Load More" when all loaded` | End state |
| `should maintain scroll position after load` | UX preservation |

## Mock Strategy

### Viewport Mocking

```typescript
// Use matchMedia mock for responsive tests
const createMatchMedia = (width: number) => (query: string) => ({
  matches: query.includes(`min-width: ${width}px`),
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

// Set up mobile viewport
window.matchMedia = createMatchMedia(375);

// Set up desktop viewport
window.matchMedia = createMatchMedia(1024);
```

### CSS Class Testing

For responsive class verification, tests will check:
- Presence of base mobile classes
- Presence of responsive modifier classes (sm:, md:, lg:)
- Touch target height classes (h-12, min-h-[48px])

## Test Data Updates

### New Fixtures Required

```typescript
// dashboard-fixtures.ts additions

// LoadMore props factory
export const createLoadMoreProps = (overrides?: Partial<LoadMoreProps>) => ({
  hasMore: true,
  isLoading: false,
  onLoadMore: vi.fn(),
  loadedCount: 20,
  totalCount: 45,
  ...overrides,
});

// ResponseModal props factory
export const createResponseModalProps = (overrides?: Partial<ResponseModalProps>) => ({
  isOpen: true,
  onClose: vi.fn(),
  opportunity: dashboardOpportunityFixtures.withDraft,
  response: dashboardResponseFixtures.draft,
  onPost: vi.fn(),
  onRegenerate: vi.fn(),
  onTextChange: vi.fn(),
  isPosting: false,
  isRegenerating: false,
  ...overrides,
});
```

## Implementation Order

1. **Update Fixtures** - Add new prop factories
2. **Create LoadMore Tests** - Replace Pagination tests
3. **Create ResponseModal Tests** - Enhance ResponseEditor tests
4. **Update OpportunityCard Tests** - Add responsive assertions
5. **Update FilterBar Tests** - Add scroll behavior tests
6. **Update Integration Tests** - Align with LoadMore pattern

## Known Limitations

1. **Viewport Testing**: JSDOM doesn't natively support viewport testing; we mock matchMedia
2. **CSS Class Testing**: Tests verify class presence, not actual rendered CSS
3. **Touch Events**: Not testing actual touch interaction, only tap target sizes

## Success Criteria

- [ ] All Pagination tests migrated to LoadMore pattern
- [ ] ResponseModal tests cover mobile and desktop modes
- [ ] Touch target tests verify h-12 / min-h-[48px] classes
- [ ] FilterBar tests verify horizontal scroll classes
- [ ] Integration tests use LoadMore instead of numbered pages
- [ ] All tests fail (Red phase verified)
- [ ] No TypeScript compilation errors
- [ ] No linter errors

## References

- [ADR-015: Mobile-First Responsive Web Design](../../../docs/architecture/decisions/015-responsive-web-design.md)
- [Design Document: Responsive Web Design](../designer/designs/responsive-web-design.md)
- [ADR-013: Opportunity Dashboard UI](../../../docs/architecture/decisions/013-opportunity-dashboard-ui.md)
