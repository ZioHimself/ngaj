# ADR-019 QR Mobile Navigation

## Status
Accepted

## Context
Users running ngaj on home servers/desktops need to access it from mobile devices. Typing IPv4 addresses (e.g., `192.168.1.100:3000`) is tedious and error-prone. A QR code simplifies mobile access.

Related: [ADR-014: Simple Token Auth](./014-simple-token-auth.md), [ADR-015: Responsive Web Design](./015-responsive-web-design.md)

## Options Considered

### Option A: Login Page Only
- **Pros**: Minimal UI changes, single location
- **Cons**: Inaccessible once logged in

### Option B: Login + Dedicated Page via Overflow Menu
- **Pros**: Accessible from all screens without navbar bloat, scales for future secondary features
- **Cons**: Extra click to reach QR from authenticated screens

### Option C: Login + Navbar Icon
- **Pros**: One-click access everywhere
- **Cons**: Adds visual clutter to navbar for infrequently used feature

## Decision
We will display QR code on login page (always visible on desktop) and provide access via overflow menu (⋮) on authenticated screens.

## Rationale
1. Login page is the natural entry point for unauthenticated mobile users
2. Overflow menu keeps navbar clean while remaining accessible
3. Standard pattern users recognize; scales for future secondary actions
4. Client-side only; no backend changes required

## Consequences

### Positive
- Simplified mobile access without typing IP addresses
- Clean navbar design preserved
- Extensible pattern for future secondary features

### Negative
- Extra click required to view QR from authenticated screens
- QR not visible on mobile login (less useful since user is already on mobile)

## Technical Details
See [Design Document](../../.agents/artifacts/designer/designs/qr-mobile-navigation-design.md) for component specifications.
