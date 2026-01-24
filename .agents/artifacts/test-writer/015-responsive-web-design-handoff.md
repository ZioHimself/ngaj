# Test-Writer Handoff: Responsive Web Design

📋 **Handoff Number**: 015
📅 **Date**: 2026-01-24
🔗 **ADR Reference**: [ADR-015: Mobile-First Responsive Web Design](../../docs/architecture/decisions/015-responsive-web-design.md)
🔗 **Design Reference**: [Responsive Web Design Design Doc](.agents/artifacts/designer/designs/responsive-web-design.md)
🔗 **Test Plan**: [Test Plan](./test-plans/responsive-web-design-test-plan.md)

## Test Statistics

| Category | Count | Status |
|----------|-------|--------|
| LoadMore Component Tests | 16 | Red ❌ |
| ResponseModal Component Tests | 31 | Red ❌ |
| OpportunityCard Responsive Tests | 10 | Red ❌ |
| FilterBar Responsive Tests | 11 | Red ❌ |
| Dashboard Integration Tests (LoadMore) | 6 | Red ❌ |
| **Total New Tests** | **74** | **Red ❌** |
| Existing Tests (unchanged) | 53 | Green ✅ |

## Files Created/Modified

### New Test Files

| File | Tests | Description |
|------|-------|-------------|
| `tests/unit/components/dashboard/load-more.spec.tsx` | 16 | LoadMore component replacing numbered pagination |
| `tests/unit/components/dashboard/response-modal.spec.tsx` | 31 | Full-screen modal for mobile response editing |

### Modified Test Files

| File | New Tests | Description |
|------|-----------|-------------|
| `tests/unit/components/dashboard/opportunity-card.spec.tsx` | +10 | Responsive layout tests (flex-col/row, touch targets) |
| `tests/unit/components/dashboard/filter-bar.spec.tsx` | +11 | Horizontal scroll and pill button styling tests |
| `tests/integration/dashboard/dashboard-api.spec.tsx` | +6 (replaced) | LoadMore pattern tests replacing pagination |

### New Component Stubs

| File | Description |
|------|-------------|
| `packages/frontend/src/components/dashboard/LoadMore.tsx` | Stub - throws "Not implemented" |
| `packages/frontend/src/components/dashboard/ResponseModal.tsx` | Stub - throws "Not implemented" |
| `packages/frontend/src/components/dashboard/index.ts` | Updated exports |

### Modified Fixtures

| File | Description |
|------|-------------|
| `tests/fixtures/dashboard-fixtures.ts` | Added `LoadMoreProps`, `ResponseModalProps`, factories, and pre-configured fixtures |

## Test Coverage Breakdown

### LoadMore Component (16 tests)

Replaces numbered pagination with mobile-friendly "Load More" button:

- **Visibility (3 tests)**: Button shows when `hasMore`, hides when all loaded
- **Count Display (3 tests)**: "{loadedCount} of {totalCount} loaded" format
- **Click Handler (2 tests)**: `onLoadMore` callback, disabled during loading
- **Loading State (3 tests)**: Disabled button, spinner, "Loading..." text
- **Touch Targets (2 tests)**: 48px height (h-12), px-8 padding
- **Layout (3 tests)**: Centered, py-6 spacing, btn-secondary style

### ResponseModal Component (31 tests)

Full-screen modal on mobile, centered with backdrop on desktop:

- **Visibility (2 tests)**: Shows/hides based on `isOpen`
- **Mobile Layout (5 tests)**: Full-screen (inset-0), Back button, flex-1 buttons, h-12 touch targets
- **Desktop Layout (4 tests)**: Centered (sm:max-w-lg), backdrop, rounded-xl
- **Header (2 tests)**: "Edit Reply" title, shrink-0 sticky header
- **Original Post (2 tests)**: Collapsible details, author handle
- **Text Editing (5 tests)**: Textarea, value display, onChange, min-h-[200px], text-base
- **Character Count (2 tests)**: "{length}/300" format
- **Actions (7 tests)**: onPost, onRegenerate, disabled states, loading text
- **Footer (2 tests)**: shrink-0 sticky, border-t

### OpportunityCard Responsive Tests (10 tests)

Mobile-first responsive button layout:

- **Button Layout (2 tests)**: flex-col on mobile, sm:flex-row on desktop
- **Button Sizing (4 tests)**: h-12 mobile, sm:h-10 desktop, w-full mobile, sm:w-auto desktop
- **Header Layout (2 tests)**: flex-col mobile, sm:flex-row desktop
- **Card Styling (2 tests)**: p-4 sm:p-6 padding, rounded-xl border radius

### FilterBar Responsive Tests (11 tests)

Horizontal scrollable filter tabs:

- **Scroll Behavior (4 tests)**: overflow-x-auto, scrollbar-hide, shrink-0, gap-2
- **Button Styling (7 tests)**: rounded-full, px-4 py-2, text-sm, font-medium, transition-colors, active/inactive colors

### Dashboard Integration Tests (6 tests)

LoadMore pattern integration:

- **Show/Hide (2 tests)**: "Load More" button visibility based on hasMore
- **Count Display (1 test)**: "{loadedCount} of {totalCount} loaded"
- **Load More Action (2 tests)**: Append opportunities, update count
- **Loading State (1 test)**: Disabled button during fetch

## Implementation Order

1. **LoadMore Component** (`LoadMore.tsx`)
   - Implement button with hasMore/isLoading states
   - Add count display
   - Apply touch target classes (h-12, px-8)
   - Style as secondary button

2. **ResponseModal Component** (`ResponseModal.tsx`)
   - Implement modal with conditional full-screen/centered layout
   - Add Back button for mobile
   - Include collapsible original post preview
   - Apply touch target classes to action buttons

3. **Update OpportunityCard** (`OpportunityCard.tsx`)
   - Add responsive classes: flex-col sm:flex-row
   - Add touch target classes: h-12 sm:h-10
   - Add responsive padding: p-4 sm:p-6

4. **Update FilterBar** (`FilterBar.tsx`)
   - Add scroll classes: overflow-x-auto, scrollbar-hide
   - Add pill button styling: rounded-full, shrink-0
   - Update active/inactive colors

5. **Update OpportunitiesDashboard** (`OpportunitiesDashboard.tsx`)
   - Replace Pagination with LoadMore component
   - Add ResponseModal for response editing

## Critical Tests (Must Pass First)

1. `load-more.spec.tsx` > `should render "Load More" button when hasMore is true`
2. `load-more.spec.tsx` > `should call onLoadMore when button clicked`
3. `response-modal.spec.tsx` > `should render full-screen on mobile (fixed inset-0)`
4. `response-modal.spec.tsx` > `should call onPost when "Post Now" button clicked`
5. `opportunity-card.spec.tsx` > `should have h-12 button height on mobile (48px touch target)`

## Running Tests

```bash
# All responsive design tests
npm test -- --run tests/unit/components/dashboard/load-more.spec.tsx tests/unit/components/dashboard/response-modal.spec.tsx

# With existing tests
npm test -- --run tests/unit/components/dashboard/

# Integration tests
npm test -- --run tests/integration/dashboard/
```

## Expected Green Phase Output

```
✓ tests/unit/components/dashboard/load-more.spec.tsx (16 tests)
✓ tests/unit/components/dashboard/response-modal.spec.tsx (31 tests)
✓ tests/unit/components/dashboard/opportunity-card.spec.tsx (29 tests)
✓ tests/unit/components/dashboard/filter-bar.spec.tsx (25 tests)
✓ tests/integration/dashboard/dashboard-api.spec.tsx (26 tests)

Test Files  5 passed (5)
Tests       127 passed (127)
```

## Key Implementation Notes

### Touch Target Requirements (ADR-015)

- Minimum button height: 48px (`h-12`) on mobile
- Desktop button height: 40px (`sm:h-10`)
- Horizontal padding: `px-8` for primary actions

### Tailwind Class Patterns

```tsx
// Mobile-first button sizing
className="h-12 sm:h-10 w-full sm:w-auto"

// Mobile-first flexbox direction
className="flex flex-col sm:flex-row gap-3"

// Full-screen modal on mobile, centered on desktop
className="fixed inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg"

// Horizontal scroll filter bar
className="flex gap-2 overflow-x-auto scrollbar-hide"

// Pill button
className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors"
```

### Required CSS Utility

Add to `packages/frontend/src/index.css`:

```css
@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

## Known Limitations

1. **Viewport Testing**: Tests mock `matchMedia`, not actual viewport changes
2. **CSS Class Testing**: Tests verify class presence, not computed CSS values
3. **Pagination Backward Compatibility**: Original Pagination component preserved; LoadMore is new component

## Success Criteria

- [ ] All 74 new tests pass (Green phase)
- [ ] All 53 existing tests continue to pass
- [ ] No TypeScript compilation errors
- [ ] No linter errors
- [ ] Touch targets verified at 48px on mobile
- [ ] LoadMore replaces numbered pagination in dashboard
- [ ] ResponseModal works as full-screen on mobile

## References

- [ADR-015: Mobile-First Responsive Web Design](../../docs/architecture/decisions/015-responsive-web-design.md)
- [Design Document: Responsive Web Design](.agents/artifacts/designer/designs/responsive-web-design.md)
- [ADR-013: Opportunity Dashboard UI](../../docs/architecture/decisions/013-opportunity-dashboard-ui.md)
- [Test Plan](./test-plans/responsive-web-design-test-plan.md)
