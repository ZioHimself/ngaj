# 011 - Responsive Web Design - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-015](../../../docs/architecture/decisions/015-responsive-web-design.md)
🔗 **Technical Specs**: [Design Document](../designs/responsive-web-design.md)

## Overview

Test responsive behavior across all ngaj screens, focusing on mobile-first design patterns. 

**Screens Covered:**
1. Login Page (`/login`) - Token entry, touch targets
2. Setup Wizard (`/setup`) - Form inputs, navigation buttons
3. Opportunities Dashboard (`/opportunities`) - Cards, modal, pagination, error states

## Test Environment Setup

### Viewport Sizes

```typescript
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },      // iPhone SE
  mobileLarge: { width: 428, height: 926 }, // iPhone 14 Pro Max
  tablet: { width: 768, height: 1024 },     // iPad
  desktop: { width: 1280, height: 800 },    // Desktop
};
```

### Playwright Configuration

```typescript
// playwright.config.ts additions
projects: [
  { name: 'mobile', use: { ...devices['iPhone 13'] } },
  { name: 'tablet', use: { ...devices['iPad'] } },
  { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
]
```

## Test Scenarios

### 1. Login Page Responsive Layout

**File**: `tests/e2e/auth/login-responsive.spec.ts`

| Scenario | Mobile Behavior | Desktop Behavior | Priority |
|----------|-----------------|------------------|----------|
| Container width | Full width with padding | Max-width 448px, centered | High |
| Input height | Touch-friendly (~56px with padding) | Same | High |
| Button height | 48px minimum | Same | High |
| Input font size | 16px+ (prevents iOS zoom) | Same | High |
| Vertical centering | Centered on screen | Same | Medium |

**Acceptance Criteria**:
- [ ] Login button has `min-height: 48px`
- [ ] Input field has `font-size: 16px` or larger (prevents iOS auto-zoom)
- [ ] Container is centered vertically on all viewports
- [ ] Max-width constrains on desktop (`max-w-md`)
- [ ] Error message visible and readable on mobile

**Test Approach**:
```typescript
test('login page is mobile-optimized', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto('/login');
  
  const button = page.getByRole('button', { name: 'Login' });
  const box = await button.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(48);
  
  const input = page.getByPlaceholder('XXXX-XXXX-XXXX-XXXX');
  const inputStyles = await input.evaluate((el) => ({
    fontSize: getComputedStyle(el).fontSize,
  }));
  expect(parseFloat(inputStyles.fontSize)).toBeGreaterThanOrEqual(16);
});
```

---

### 2. Setup Wizard Responsive Layout

**File**: `tests/e2e/setup/wizard-responsive.spec.ts`

| Scenario | Mobile Behavior | Desktop Behavior | Priority |
|----------|-----------------|------------------|----------|
| Form inputs | Full width, larger padding | Same, slightly smaller padding | High |
| Submit buttons | Full width, 48px height | Same | High |
| Input font size | 16px+ (prevents iOS zoom) | Same | High |
| Container | Padding for edge spacing | Max-width centered | Medium |

**Acceptance Criteria**:
- [ ] All form inputs have `font-size: 16px` or larger
- [ ] "Next" button has `min-height: 48px`
- [ ] "Back" button (where present) has `min-height: 48px`
- [ ] Form fields are full-width on mobile
- [ ] Progress indicator visible on all viewports

**Test Approach**:
```typescript
test('wizard inputs prevent iOS zoom', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto('/setup');
  
  const inputs = await page.locator('input, textarea').all();
  for (const input of inputs) {
    const fontSize = await input.evaluate((el) => 
      parseFloat(getComputedStyle(el).fontSize)
    );
    expect(fontSize).toBeGreaterThanOrEqual(16);
  }
});

test('wizard buttons meet touch targets', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto('/setup');
  
  const nextButton = page.getByRole('button', { name: 'Next' });
  const box = await nextButton.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(48);
});
```

---

### 3. OpportunityCard Responsive Layout

**File**: `tests/e2e/dashboard/opportunity-card-responsive.spec.ts`

| Scenario | Mobile Behavior | Desktop Behavior | Priority |
|----------|-----------------|------------------|----------|
| Header layout | Author + followers on one line, time below | All inline with score | High |
| Action buttons | Full-width, stacked vertically | Inline, right-aligned | High |
| Button height | 48px minimum (touch target) | 40px | High |
| Content text | Normal wrapping | Same | Medium |
| Score display | Badge below content | In header | Medium |

**Acceptance Criteria**:
- [ ] Mobile: Buttons have `min-height: 48px`
- [ ] Mobile: Buttons are full-width (100%)
- [ ] Mobile: Buttons stack vertically with gap
- [ ] Desktop: Buttons are auto-width, inline
- [ ] All viewports: Card has appropriate padding

**Test Approach**:
```typescript
test('buttons are full-width on mobile', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto('/opportunities');
  
  const button = page.getByRole('button', { name: 'Generate Response' }).first();
  const box = await button.boundingBox();
  const card = page.getByTestId('opportunity-card').first();
  const cardBox = await card.boundingBox();
  
  // Button should be nearly full card width (accounting for padding)
  expect(box.width).toBeGreaterThan(cardBox.width * 0.8);
  expect(box.height).toBeGreaterThanOrEqual(48);
});
```

### 4. Response Modal

**File**: `tests/e2e/dashboard/response-modal.spec.ts`

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| Modal opens full-screen on mobile | Covers entire viewport | High |
| Modal is centered dialog on desktop | Max-width constrained, backdrop visible | High |
| Back button closes modal | Returns to dashboard | High |
| Character count visible | Shows current/max (e.g., "247/300") | High |
| Post button disabled when empty | Cannot post empty response | High |
| Textarea has adequate size | Min-height for comfortable editing | Medium |

**Acceptance Criteria**:
- [ ] Mobile: Modal `position: fixed; inset: 0`
- [ ] Desktop: Modal has backdrop, max-width ~512px
- [ ] Header is sticky/fixed at top
- [ ] Footer actions are sticky/fixed at bottom
- [ ] Textarea is scrollable if content exceeds viewport

**Test Approach**:
```typescript
test('modal is full-screen on mobile', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto('/opportunities');
  
  // Generate a response to open modal
  await page.getByRole('button', { name: 'Generate Response' }).first().click();
  await page.waitForSelector('[data-testid="response-modal"]');
  
  const modal = page.getByTestId('response-modal');
  const box = await modal.boundingBox();
  
  expect(box.width).toBe(VIEWPORTS.mobile.width);
  expect(box.height).toBe(VIEWPORTS.mobile.height);
});

test('modal has backdrop on desktop', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto('/opportunities');
  
  await page.getByRole('button', { name: 'Generate Response' }).first().click();
  await page.waitForSelector('[data-testid="response-modal"]');
  
  const backdrop = page.locator('[data-testid="modal-backdrop"]');
  await expect(backdrop).toBeVisible();
});
```

### 5. FilterBar

**File**: `tests/e2e/dashboard/filter-bar-responsive.spec.ts`

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| Horizontal scroll on mobile | Filters scroll horizontally if overflow | High |
| All filters accessible | Can scroll to reach all filter options | High |
| Active filter highlighted | Visual distinction for selected filter | Medium |

**Acceptance Criteria**:
- [ ] FilterBar has `overflow-x: auto` on mobile
- [ ] No scrollbar visible (hidden but functional)
- [ ] Touch scrolling works smoothly
- [ ] Filter buttons don't wrap to new line

### 6. Load More Pagination

**File**: `tests/e2e/dashboard/load-more.spec.ts`

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| Load more button visible | Shows when hasMore=true | High |
| Button click loads more items | Appends to existing list | High |
| Loading state shown | Spinner/text during load | High |
| Progress indicator | Shows "X of Y loaded" | Medium |
| End state | "Showing all X opportunities" when done | Medium |

**Acceptance Criteria**:
- [ ] "Load More" button has min-height 48px
- [ ] Button is disabled during loading
- [ ] New items append below existing (no jump to top)
- [ ] Count updates after loading

**Test Approach**:
```typescript
test('load more appends items', async ({ page }) => {
  await page.goto('/opportunities');
  
  const initialCount = await page.getByTestId('opportunity-card').count();
  
  await page.getByRole('button', { name: 'Load More' }).click();
  await page.waitForLoadState('networkidle');
  
  const newCount = await page.getByTestId('opportunity-card').count();
  expect(newCount).toBeGreaterThan(initialCount);
});
```

### 7. Error State

**File**: `tests/e2e/dashboard/error-state.spec.ts`

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| Server unreachable | Full-screen error message | High |
| Retry button | Attempts to reload data | High |
| Error message clarity | Explains what to check | Medium |

**Acceptance Criteria**:
- [ ] Error state is centered vertically
- [ ] Error icon is visible
- [ ] "Try Again" button has min-height 48px
- [ ] Message mentions checking server/network

**Test Approach**:
```typescript
test('shows error when API unavailable', async ({ page }) => {
  // Block API requests
  await page.route('/api/**', (route) => route.abort());
  
  await page.goto('/opportunities');
  
  await expect(page.getByText('Connection Lost')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
});
```

### 8. Touch Target Compliance

**File**: `tests/e2e/dashboard/touch-targets.spec.ts`

All interactive elements must meet minimum touch target size on mobile.

| Element | Minimum Size | Priority |
|---------|--------------|----------|
| Primary buttons | 48x48px | High |
| Secondary buttons | 48x48px | High |
| Filter tabs | 44x44px | High |
| Modal close button | 44x44px | High |
| Dismiss button | 48x48px | High |

**Test Approach**:
```typescript
test('all buttons meet touch target requirements', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto('/opportunities');
  
  const buttons = await page.getByRole('button').all();
  
  for (const button of buttons) {
    const box = await button.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
});
```

## Unit Tests

### Component Tests

**File**: `tests/unit/components/`

| Component | Test Cases |
|-----------|------------|
| `LoginPage.test.tsx` | Form submission, error display, loading state, input auto-uppercase |
| `OpportunityCard.test.tsx` | Renders all data, truncation, actions visible |
| `ResponseModal.test.tsx` | Open/close, text editing, character count, button states |
| `LoadMore.test.tsx` | hasMore states, loading state, count display |
| `FilterBar.test.tsx` | Filter selection, active state |
| `ErrorState.test.tsx` | Message display, retry callback |

See [Design Document - Screen/Component Specifications](../designs/responsive-web-design.md#screen-specifications) for component props and expected behavior.

## Visual Regression Tests (Optional)

If using visual regression:

```typescript
test('opportunity card mobile snapshot', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto('/opportunities');
  
  await expect(page.getByTestId('opportunity-card').first()).toHaveScreenshot('card-mobile.png');
});
```

## Mock Data Requirements

```typescript
// tests/fixtures/opportunity-fixtures.ts additions
export const mockOpportunityWithLongContent = {
  ...mockOpportunity,
  content: {
    text: 'A very long post that should wrap correctly on mobile screens and not cause any horizontal overflow or layout issues...',
  },
};

export const mockManyOpportunities = Array.from({ length: 30 }, (_, i) => ({
  ...mockOpportunity,
  _id: `opp-${i}`,
}));
```

## Test Priority

1. **P0 (Critical)**: Touch targets on all screens, login page works, modal full-screen, load more works
2. **P1 (High)**: Button layout changes, error state, input font sizes (iOS zoom prevention)
3. **P2 (Medium)**: Visual polish, filter bar scroll, progress indicators, wizard navigation

## Dependencies to Mock

- `/api/opportunities` - Return paginated data with hasMore flag
- `/api/responses/generate` - Return mock response for modal testing
- Network failures - Simulate offline/server down for error state testing
