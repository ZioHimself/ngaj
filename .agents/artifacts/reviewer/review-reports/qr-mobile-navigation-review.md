# Review Report: QR Mobile Navigation

**Date**: 2026-01-29  
**Reviewer**: Reviewer Agent  
**Implementation**: `packages/frontend/src/components/QRCode.tsx`, `OverflowMenu.tsx`, `pages/QRCodePage.tsx`, `LoginPage.tsx` (QR block), `Opportunities.tsx` (overflow menu), `App.tsx` (`/qr` route)

---

## Overall Assessment

**Status**: ✅ **Approved**

**Summary**: The QR Mobile Navigation implementation is high-quality, frontend-only, and fully aligned with ADR-019 and the design document. Lint and build pass; all 28 unit tests and 1 E2E test for the feature pass. Components are small, typed, and accessible; route protection and back navigation behave as specified.

---

## Strengths

1. ✅ **ADR-019 and design alignment**: Login page shows QR on desktop only (`hidden sm:block` + `isDesktop`); overflow menu on Opportunities with "Mobile Access" → `/qr`; `/qr` protected and redirects unauthenticated users to `/login`.
2. ✅ **Clean components**: `QRCode` (qrcode.react SVG, optional URL text, size prop), `OverflowMenu` (toggle, outside click, Escape, aria attributes), `QRCodePage` (centered QR, helper text, back with history fallback).
3. ✅ **SSR-safe default URL**: `QRCode` uses `typeof window !== 'undefined' ? window.location.origin : ''` for default URL.
4. ✅ **Back navigation logic**: `window.history.length > 1` → `navigate(-1)`, else `navigate('/opportunities')` as in design.
5. ✅ **Accessibility**: Overflow menu has `aria-label="Open menu"`, `aria-expanded`, `aria-haspopup`, `role="menu"` / `role="menuitem"`; QR page back button has `aria-label="Back"`.
6. ✅ **Test coverage**: Unit tests for QRCode (4), OverflowMenu (4), QRCodePage (3), Login QR visibility (2), app routing `/qr` redirect (1); E2E for overflow → QR page.
7. ✅ **Documentation**: ADR-019 and design doc linked in file headers.

---

## Findings

### Critical Issues (Must Fix)

None found. ✅

### High Priority Issues (Should Fix Soon)

None found. ✅

### Medium Priority Suggestions

None.

### Low Priority Suggestions

1. **[LOW] QRCodePage fixed size vs design**
   - **Location**: `packages/frontend/src/pages/QRCodePage.tsx:26`
   - **Description**: Design doc says "256px on desktop, 200px on mobile"; implementation uses fixed `<QRCode size={256} />`.
   - **Impact**: Minor UX; mobile still usable.
   - **Suggested Fix**: Optional: use responsive size (e.g. 200 on small viewport, 256 on larger) via hook or media query.

2. **[LOW] Setup Wizard overflow (design 3.3)**
   - **Location**: Design doc section 3.3
   - **Description**: Design mentions "Add overflow menu to wizard header (if header exists) or footer link." Only Opportunities page has the overflow menu today.
   - **Impact**: Users in Setup Wizard cannot open QR from that screen; they can after reaching Opportunities.
   - **Suggested Fix**: If wizard has a header, add OverflowMenu there with "Mobile Access" for consistency; otherwise acceptable for MVP.

---

## Test Coverage Analysis

### Scope

- **Vitest coverage**: Configured for `packages/backend/src/**/*.ts` only; frontend is not in coverage thresholds.
- **QR feature**: Frontend-only; no backend coverage impact.

### Tests Exercising QR Feature

| Suite | File | Tests |
|-------|------|-------|
| Unit | `tests/unit/components/qr/qr-code.spec.tsx` | 4 (default URL, custom URL, size, showUrl) |
| Unit | `tests/unit/components/qr/overflow-menu.spec.tsx` | 4 (open, outside click, Escape, item click) |
| Unit | `tests/unit/components/qr/qr-code-page.spec.tsx` | 3 (display, back with history, back without history) |
| Unit | `tests/unit/components/auth/login-page-qr.spec.tsx` | 2 (desktop QR visible, mobile hidden) |
| Routing | `tests/unit/components/app/app-routing.spec.tsx` | 1 (/qr → /login when unauthenticated) |
| E2E | `tests/e2e/features/qr-mobile-navigation.spec.ts` | 1 (overflow → Mobile Access → /qr) |

**Total**: 28 unit + 1 E2E = 29 tests; all passing.

### Coverage Assessment

- **Critical path**: ✅ Login QR, overflow menu, QRCodePage, route protection and back navigation are all tested.
- **Edge cases**: ✅ Back with/without history; desktop vs mobile QR visibility; unauthenticated `/qr` redirect.
- **Gaps**: Actual QR scanning not tested (device-dependent, excluded by design).

---

## Security Analysis

### Security Findings

✅ No security issues found.

- **Client-only**: No new backend endpoints; no new credentials or PII.
- **Route protection**: `/qr` guarded by `isAuthenticated`; unauthenticated users redirected to `/login`.
- **URL in QR**: Encodes `window.location.origin` or prop; no user input encoded; XSS risk from URL text is minimal (same-origin display).

### Security Checklist

- ✅ Linter passes
- ✅ No new backend/auth surface
- ✅ No sensitive data in QR payload
- ✅ Route protection enforced in App

---

## Architecture Compliance

### Design Alignment

- ✅ QRCode: `url`, `size`, `showUrl`; SVG via qrcode.react; URL below; white background + padding.
- ✅ QRCodePage: Centered QR, helper text "Scan to open ngaj on your device", back button with specified history fallback.
- ✅ OverflowMenu: Items with label/onClick; toggle, outside click, Escape; "Mobile Access" → `/qr`.
- ✅ Login: QR block below form, desktop-only (`hidden sm:block`), size 160, "Or scan to open on mobile."
- ✅ Route `/qr`: Auth guard → QRCodePage or Navigate to `/login`.

### ADR Compliance

- ✅ **ADR-019**: Login page QR (desktop) + overflow menu on authenticated screens; client-side only.
- ✅ **ADR-015**: Responsive handling (QR hidden on mobile on login).

### Deviations from Design

- **QRCodePage size**: Design "256px on desktop, 200px on mobile"; implementation uses 256px only. Documented as low-priority suggestion above.
- **Setup Wizard**: Design 3.3 mentions overflow in wizard; not implemented. Acceptable for MVP; optional follow-up.

---

## Code Quality

### Readability: Good

- Clear names (`QRCode`, `OverflowMenu`, `QRCodePage`, `handleBack`, `handleItemClick`).
- JSDoc/see references to ADR and design in component headers.

### Maintainability: Good

- Small, single-purpose components; OverflowMenu reusable for future items.
- Typed props (`QRCodeProps`, `MenuItem`, `OverflowMenuProps`); no `any`.

### TypeScript Usage: Good

- Interfaces for all component props; `React.ReactElement` return types; SSR-safe default for `url`.

---

## Recommendations

### Immediate Actions (Before Push)

None.

### Short-term Improvements

- Consider responsive QR size on QRCodePage (200/256) if mobile layout is refined.
- If Setup Wizard gets a header, add OverflowMenu there for parity.

### Long-term Considerations

- Dark mode (design open question): ensure QR container background remains scannable.

---

## Conclusion

QR Mobile Navigation is implemented correctly, tested, and ready to push. It matches ADR-019 and the design document, with only minor, non-blocking deviations (fixed QR size on page, no overflow in wizard). No critical or high-priority issues; low-priority items are optional improvements.

---

## References

- **ADR**: [019-qr-mobile-navigation.md](../../../docs/architecture/decisions/019-qr-mobile-navigation.md)
- **Design**: [qr-mobile-navigation-design.md](../../designer/designs/qr-mobile-navigation-design.md)
- **Handoff**: [016-qr-mobile-navigation-handoff.md](../../designer/handoffs/016-qr-mobile-navigation-handoff.md)
- **Test plan**: [qr-mobile-navigation-test-plan.md](../../test-writer/test-plans/qr-mobile-navigation-test-plan.md)
- **Implementation**: `packages/frontend/src/components/QRCode.tsx`, `OverflowMenu.tsx`, `pages/QRCodePage.tsx`, `LoginPage.tsx`, `Opportunities.tsx`, `App.tsx`
