# QR Mobile Navigation - Test Plan

**Handoff**: Based on [016-qr-mobile-navigation-handoff.md](../designer/handoffs/016-qr-mobile-navigation-handoff.md)  
**Design**: [qr-mobile-navigation-design.md](../../.agents/artifacts/designer/designs/qr-mobile-navigation-design.md)  
**ADR**: [019-qr-mobile-navigation.md](../../../docs/architecture/decisions/019-qr-mobile-navigation.md)

---

## Test Coverage Summary

| Category   | Location | Scenarios |
|-----------|----------|-----------|
| Unit      | `tests/unit/components/qr/` | QRCode (3), OverflowMenu (4) |
| Unit      | `tests/unit/components/auth/login-page-qr.spec.tsx` | Login QR visibility desktop/mobile (2) |
| Unit      | `tests/unit/components/qr/qr-code-page.spec.tsx` | QRCodePage display, back nav, route protection (4) |
| Routing   | `tests/unit/components/app/app-routing.spec.tsx` | /qr redirect unauthenticated (1) |
| E2E       | `tests/e2e/features/qr-mobile-navigation.spec.ts` | Overflow menu → QR page (1) |

**Total**: 15 test cases.

---

## Test Categories

### Unit – QRCode Component
- Renders with default URL (window.location.origin): SVG + URL text.
- Renders with custom URL: encodes provided URL.
- Respects `size` prop: SVG dimensions match.

### Unit – OverflowMenu Component
- Opens dropdown on button click.
- Closes on outside click.
- Closes on Escape key.
- Calls item `onClick` and closes on item click.

### Unit – Login Page QR (responsive)
- Desktop viewport (≥640px): QR section visible, has `hidden sm:block` (or equivalent).
- Mobile viewport (<640px): QR section not visible.

### Unit / Integration – QRCodePage
- Displays QR with helper text and back button when authenticated.
- Back with history: navigates (-1).
- Back without history: navigates to `/opportunities`.
- Unauthenticated access: redirect to `/login` (via App routing test).

### App Routing
- `/qr` when unauthenticated: redirect to `/login`.

### E2E
- Authenticated user: open overflow menu → "Mobile Access" → lands on `/qr` with QR visible.

---

## Mock Strategy

- **window.location.origin**: Override in tests to fixed value (e.g. `http://192.168.1.100:3000`) where URL assertion is needed.
- **react-router-dom**: `useNavigate` mocked in unit tests; `MemoryRouter` / `BrowserRouter` for integration.
- **Auth**: Mock `fetch` for `/api/auth/status` (and profile check) in App/routing tests; E2E uses real app with mocked API routes.

---

## Test Organization

- `tests/unit/components/qr/qr-code.spec.tsx` – QRCode only.
- `tests/unit/components/qr/overflow-menu.spec.tsx` – OverflowMenu only.
- `tests/unit/components/auth/login-page-qr.spec.tsx` – LoginPage viewport QR visibility (no form logic).
- `tests/unit/components/qr/qr-code-page.spec.tsx` – QRCodePage with router and navigate mock.
- `tests/unit/components/app/app-routing.spec.tsx` – Add one test: redirect `/qr` when unauthenticated.
- `tests/e2e/features/qr-mobile-navigation.spec.ts` – Full flow overflow → QR page.

---

## Implementation Stubs

- `packages/frontend/src/components/QRCode.tsx` – Minimal component (e.g. div), no real QR; tests expect SVG/URL.
- `packages/frontend/src/components/OverflowMenu.tsx` – Minimal (e.g. div); tests expect button, dropdown, items.
- `packages/frontend/src/pages/QRCodePage.tsx` – Stub (e.g. throw or placeholder); tests expect QR, back button, helper text.
- App: Add route `/qr` with auth guard and `<QRCodePage />` (stub) so routing test and E2E can hit the route.

---

## Known Limitations

- Actual QR scanning not tested (device-dependent).
- Network address resolution not tested.
- Dark mode and animation smoothness out of scope for this plan.

---

## Handoff Notes for Implementer

1. Implement QRCode using `qrcode.react` (QRCodeSVG); ensure SVG and optional URL text below.
2. Implement OverflowMenu with toggle, outside-click, Escape, and item click closing.
3. Implement QRCodePage with back logic: `history.length > 1` → `navigate(-1)`, else `navigate('/opportunities')`.
4. Add QR block to LoginPage with `hidden sm:block`, size 160.
5. Add OverflowMenu to Opportunities header with "Mobile Access" → navigate to `/qr`.
6. Keep `/qr` route protection: unauthenticated → `<Navigate to="/login" />`.
