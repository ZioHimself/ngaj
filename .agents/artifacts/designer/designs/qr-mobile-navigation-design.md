# QR Mobile Navigation - Design Document

📋 **Decision Context**: [ADR-019](../../../docs/architecture/decisions/019-qr-mobile-navigation.md)

## Overview
Display QR code encoding the ngaj base URL to simplify mobile device access. Frontend-only feature with no backend changes.

**Key Components**: QRCode component, QRCodePage, OverflowMenu
**External Dependencies**: QR code generation library (client-side)

---

## 1. QR Library Selection

### Recommended: `qrcode.react`
- React-native component, no DOM manipulation
- SVG output (crisp at any size)
- ~15KB gzipped, tree-shakeable
- MIT license, actively maintained

```bash
npm install qrcode.react
```

### Alternative: `react-qr-code`
- Similar API, slightly smaller
- SVG-only output

---

## 2. Components

### 2.1 QRCode Component

Reusable QR code display component.

```typescript
// packages/frontend/src/components/QRCode.tsx
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  /** URL to encode. Defaults to window.location.origin */
  url?: string;
  /** Size in pixels. Default: 200 */
  size?: number;
  /** Include URL text below QR. Default: true */
  showUrl?: boolean;
}

export function QRCode({ 
  url = window.location.origin,
  size = 200,
  showUrl = true 
}: QRCodeProps): React.ReactElement;
```

**Styling**:
- Centered in container
- White background with padding for scan reliability
- URL displayed below in monospace font (truncated if long)

### 2.2 QRCodePage

Dedicated full-page QR display.

```typescript
// packages/frontend/src/pages/QRCodePage.tsx
export function QRCodePage(): React.ReactElement;
```

**Layout**:
- Centered QR code (256px on desktop, 200px on mobile)
- "Scan to open ngaj on your device" helper text
- Back button with smart fallback navigation

**Back Navigation**:
```typescript
const handleBack = () => {
  if (window.history.length > 1) {
    navigate(-1); // Browser back
  } else {
    navigate('/opportunities'); // Fallback (protected route)
  }
};
```
Note: `/opportunities` is protected by auth; unauthenticated users redirect to `/login`.

**Route**: `/qr`

### 2.3 OverflowMenu Component

Three-dot menu for secondary actions.

```typescript
// packages/frontend/src/components/OverflowMenu.tsx
interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface OverflowMenuProps {
  items: MenuItem[];
}

export function OverflowMenu({ items }: OverflowMenuProps): React.ReactElement;
```

**Behavior**:
- Toggle dropdown on click
- Close on outside click
- Close on item selection
- Keyboard accessible (Escape to close)

**Menu Items** (initial):
- "📱 Mobile Access" → navigates to `/qr`

---

## 3. Integration Points

### 3.1 Login Page

Add QR code to existing `LoginPage.tsx`.

**Placement**: Below the login form, above the hint text
**Visibility**: Desktop only (hidden on mobile via Tailwind `hidden sm:block`)
**Size**: 160px

```tsx
{/* QR Code - desktop only */}
<div className="hidden sm:block mt-8 pt-8 border-t border-slate-200">
  <p className="text-sm text-slate-500 mb-4">Or scan to open on mobile</p>
  <QRCode size={160} />
</div>
```

### 3.2 Opportunities Page Header

Add overflow menu to dashboard header.

**Location**: Right side of header, after existing actions
**Icon**: Three vertical dots (⋮)

### 3.3 Setup Wizard

Add overflow menu to wizard header (if header exists) or footer link.

---

## 4. Routing

Add new route in `App.tsx`:

```tsx
<Route
  path="/qr"
  element={
    isAuthenticated ? (
      <QRCodePage />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>
```

---

## 5. Edge Cases

| Case | Handling |
|------|----------|
| Very long URL | Truncate display with ellipsis, full URL in QR |
| Localhost access | QR shows localhost (useless for mobile, but correct) |
| HTTPS with self-signed cert | QR works; user handles cert warning on mobile |

---

## 6. Open Questions

- [x] QR library choice → `qrcode.react`
- [x] Mobile visibility on login → Hide (user already on mobile)
- [ ] Dark mode support → Future consideration

---

## References

- **Decision Rationale**: [ADR-019](../../../docs/architecture/decisions/019-qr-mobile-navigation.md)
- **Test Guidance**: [Handoff Document](../handoffs/016-qr-mobile-navigation-handoff.md)
