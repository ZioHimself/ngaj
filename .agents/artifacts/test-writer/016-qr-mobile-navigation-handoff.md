# 016 – QR Mobile Navigation – Test-Writer Handoff

**Design handoff**: [016-qr-mobile-navigation-handoff.md](../designer/handoffs/016-qr-mobile-navigation-handoff.md)  
**Test plan**: [qr-mobile-navigation-test-plan.md](test-plans/qr-mobile-navigation-test-plan.md)  
**ADR**: [019-qr-mobile-navigation.md](../../docs/architecture/decisions/019-qr-mobile-navigation.md)

---

## Test statistics

| Category   | Count | Red phase |
|-----------|-------|-----------|
| Unit (QRCode) | 3 | Failing |
| Unit (OverflowMenu) | 4 | Failing |
| Unit (Login QR visibility) | 2 | Failing |
| Unit (QRCodePage) | 3 | Failing |
| App routing (/qr) | 1 | Passing (route + guard added) |
| E2E | 1 | Failing |
| **Total** | **14** | **13 fail, 1 pass** |

---

## Files created/updated

| File | Purpose |
|------|---------|
| `packages/frontend/src/components/QRCode.tsx` | Stub (div only; no SVG) |
| `packages/frontend/src/components/OverflowMenu.tsx` | Stub (button only; no dropdown) |
| `packages/frontend/src/pages/QRCodePage.tsx` | Stub (placeholder text) |
| `packages/frontend/src/App.tsx` | Added `/qr` route + auth guard |
| `packages/frontend/src/pages/index.ts` | Export `QRCodePage` |
| `tests/unit/components/qr/qr-code.spec.tsx` | QRCode unit tests |
| `tests/unit/components/qr/overflow-menu.spec.tsx` | OverflowMenu unit tests |
| `tests/unit/components/auth/login-page-qr.spec.tsx` | Login QR responsive visibility |
| `tests/unit/components/qr/qr-code-page.spec.tsx` | QRCodePage display + back nav |
| `tests/unit/components/app/app-routing.spec.tsx` | +1 test: `/qr` redirect when unauthenticated |
| `tests/e2e/features/qr-mobile-navigation.spec.ts` | E2E overflow → QR page |
| `.agents/artifacts/test-writer/test-plans/qr-mobile-navigation-test-plan.md` | Test plan |

---

## Test coverage

- **QRCode**: default URL (SVG + URL text), custom URL, `size` prop.
- **OverflowMenu**: open on click, close on outside click, close on Escape, item click calls handler and closes.
- **Login page**: desktop (≥640px) QR section visible with `hidden sm:block`; mobile (<640px) QR hidden.
- **QRCodePage**: SVG + helper text + back button; back with history → `navigate(-1)`; back without history → `navigate('/opportunities')`.
- **Route protection**: unauthenticated `/qr` → redirect to `/login`.
- **E2E**: opportunities → overflow menu → “Mobile Access” → `/qr` with QR visible.

---

## Implementation order (Implementer)

1. **QRCode**: Implement with `qrcode.react` (QRCodeSVG), optional URL text below, respect `url`/`size`/`showUrl`.
2. **OverflowMenu**: Toggle dropdown on button click; close on outside click, Escape, and item click; call item `onClick`.
3. **QRCodePage**: Use QRCode (256/200px), helper text “Scan to open ngaj on your device”, back button: `history.length > 1` → `navigate(-1)`, else `navigate('/opportunities')`.
4. **LoginPage**: Add QR block below form with `hidden sm:block`, `<QRCode size={160} />`, “Or scan to open on mobile”.
5. **Opportunities header**: Add OverflowMenu with item “Mobile Access” (or “📱 Mobile Access”) → `navigate('/qr')`.
6. Keep App `/qr` route and auth guard as implemented.

---

## Running tests

```bash
# Unit + integration (Vitest)
npm test

# E2E (Playwright; starts frontend)
npm run test:e2e
```

---

## Expected Red phase

- **QRCode**: Fails on “SVG in document” and “URL text” (stub has no SVG/URL).
- **OverflowMenu**: Fails on “dropdown visible” and “Mobile Access” visible/clickable (stub has no dropdown).
- **Login QR**: Fails on “QR section” and “scan to open” text (LoginPage has no QR yet).
- **QRCodePage**: Fails on “SVG”, “helper text”, “back button” (stub has placeholder only).
- **App /qr**: Passes (route and redirect in place).
- **E2E**: Fails (no overflow menu on opportunities page, or no “Mobile Access” / no QR on `/qr`).

---

## Success criteria

- [ ] QRCode unit tests pass (SVG + URL + size).
- [ ] OverflowMenu unit tests pass (open, close outside/Escape, item click).
- [ ] Login page QR visibility tests pass (desktop visible, mobile hidden).
- [ ] QRCodePage tests pass (display, back with/without history).
- [ ] `/qr` redirect when unauthenticated remains passing.
- [ ] E2E overflow → QR page flow passes.
- [ ] `npm run lint` and `npm run build` pass.
