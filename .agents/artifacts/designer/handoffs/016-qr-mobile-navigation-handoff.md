# QR Mobile Navigation - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-019](../../../docs/architecture/decisions/019-qr-mobile-navigation.md)
🔗 **Technical Specs**: [Design Document](../designs/qr-mobile-navigation-design.md)

## Overview
Test QR code display for mobile navigation access on login and authenticated screens.

---

## 1. Test Scope

### In Scope
- ✅ QRCode component renders correctly
- ✅ Login page shows QR on desktop, hides on mobile
- ✅ QRCodePage displays QR with correct URL
- ✅ OverflowMenu opens/closes correctly
- ✅ Navigation from overflow menu to QR page
- ✅ Route protection for `/qr`

### Out of Scope
- ❌ Actual QR scanning functionality (device-dependent)
- ❌ Network address resolution accuracy

---

## 2. Test Scenarios

### 2.1 Unit Tests: QRCode Component

#### Scenario: Renders with default URL
**Given**: QRCode component mounted
**When**: No url prop provided
**Then**: QR encodes `window.location.origin`

**Acceptance Criteria**:
- [ ] SVG element rendered
- [ ] URL text displayed below QR

#### Scenario: Renders with custom URL
**Given**: QRCode component with `url="https://example.com"`
**When**: Component mounted
**Then**: QR encodes provided URL

#### Scenario: Respects size prop
**Given**: QRCode component with `size={256}`
**When**: Component mounted
**Then**: SVG has 256px dimensions

---

### 2.2 Unit Tests: OverflowMenu Component

#### Scenario: Opens on click
**Given**: OverflowMenu rendered
**When**: User clicks menu button
**Then**: Dropdown appears with menu items

#### Scenario: Closes on outside click
**Given**: OverflowMenu is open
**When**: User clicks outside menu
**Then**: Dropdown closes

#### Scenario: Closes on Escape key
**Given**: OverflowMenu is open
**When**: User presses Escape
**Then**: Dropdown closes

#### Scenario: Calls onClick handler
**Given**: OverflowMenu with item `{ label: "Test", onClick: mockFn }`
**When**: User clicks item
**Then**: `mockFn` called and menu closes

---

### 2.3 Integration Tests: Login Page

#### Scenario: QR visible on desktop
**Given**: Login page at desktop viewport (≥640px)
**When**: Page renders
**Then**: QR code visible

**Acceptance Criteria**:
- [ ] QR section has class `hidden sm:block` or equivalent
- [ ] QR encodes current origin

#### Scenario: QR hidden on mobile
**Given**: Login page at mobile viewport (<640px)
**When**: Page renders
**Then**: QR code not visible

---

### 2.4 Integration Tests: QRCodePage

#### Scenario: Displays QR code
**Given**: Authenticated user
**When**: Navigates to `/qr`
**Then**: Full-page QR display with helper text

**Acceptance Criteria**:
- [ ] QR code centered on page
- [ ] Helper text visible
- [ ] Back button visible

#### Scenario: Back navigation with history
**Given**: Authenticated user navigated from `/opportunities` to `/qr`
**When**: User clicks back button
**Then**: Returns to `/opportunities`

#### Scenario: Back navigation without history (direct access)
**Given**: Authenticated user navigates directly to `/qr` (no history)
**When**: User clicks back button
**Then**: Navigates to `/opportunities` (fallback)

#### Scenario: Redirects unauthenticated users
**Given**: Unauthenticated user
**When**: Navigates to `/qr`
**Then**: Redirected to `/login`

---

### 2.5 E2E Tests: Navigation Flow

#### Scenario: Overflow menu to QR page
**Given**: Authenticated user on opportunities page
**When**: User clicks overflow menu → "Mobile Access"
**Then**: Navigates to `/qr` page

**Acceptance Criteria**:
- [ ] Menu opens on click
- [ ] "Mobile Access" item visible
- [ ] Navigation occurs on item click
- [ ] QR page displays correctly

---

## 3. Edge Cases

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| URL with special characters | QR encodes correctly | Medium |
| Very narrow viewport | QR hidden, menu still accessible | Medium |
| Direct navigation to `/qr` | Back button goes to `/opportunities` | High |
| Multiple rapid menu toggles | No visual glitches | Low |

---

## 4. Test Fixtures

```typescript
// Mock window.location.origin
const mockOrigin = 'http://192.168.1.100:3000';

// Overflow menu items
const menuItems = [
  { label: 'Mobile Access', onClick: vi.fn() }
];
```

---

## 5. Test Priorities

### Critical Path (Must Pass)
1. QRCode renders SVG with correct URL
2. Login page QR visibility responsive
3. `/qr` route protected
4. Back navigation smart fallback works

### Important (Should Pass)
4. OverflowMenu keyboard accessibility
5. Menu closes on outside click

### Nice to Have
6. Animation smoothness
7. Dark mode compatibility

---

## 6. Definition of Done

- [ ] QRCode component unit tests pass
- [ ] OverflowMenu component unit tests pass
- [ ] Login page responsive QR tests pass
- [ ] QRCodePage integration tests pass
- [ ] Back navigation (history + fallback) verified
- [ ] Route protection verified
- [ ] E2E navigation flow passes
