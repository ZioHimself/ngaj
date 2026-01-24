# ADR-015: Mobile-First Responsive Web Design

## Status

Proposed

## Context

ngaj's frontend is currently designed for desktop viewing with inconsistent styling patterns. User research indicates the primary access pattern will be **mobile devices** (phones/tablets) accessing the locally-hosted web UI over the home network.

Current issues:
- Dashboard components use undefined CSS classes (implementation gap)
- Login page design (ADR-014) uses custom CSS classes, not Tailwind
- No responsive breakpoint handling across any screens
- Touch targets are too small for mobile interaction
- Pagination pattern unsuitable for mobile scrolling

**All screens need responsive design:**
- `/login` - First screen users see when accessing from mobile
- `/setup` - First-time setup may happen on mobile
- `/opportunities` - Primary daily-use interface

## Decision

Implement a **unified mobile-first responsive design system** using Tailwind CSS utilities directly across all screens.

### Key Design Choices

1. **Mobile-first breakpoint strategy**: Base styles target mobile, scale up for larger screens
2. **Tailwind utilities over custom CSS classes**: Consistent approach across all components
3. **Unified design tokens**: Consistent spacing, colors, typography via Tailwind config
4. **48px touch targets**: All interactive elements meet minimum touch size on mobile
5. **Full-screen modals on mobile**: Better focus for complex interactions (response editor)
6. **"Load more" pagination**: Replaces numbered pages for better mobile scrolling UX
7. **Prominent error states**: Clear feedback when server/network is unreachable

### Screens Covered

| Screen | Current State | Action |
|--------|---------------|--------|
| Login (`/login`) | Not implemented | Implement with Tailwind utilities |
| Setup Wizard (`/setup`) | Partial Tailwind | Add mobile optimizations |
| Dashboard (`/opportunities`) | Undefined CSS classes | Full refactor to Tailwind |

### Breakpoint Usage

| Breakpoint | Width | Target |
|------------|-------|--------|
| Base | < 640px | Mobile phones |
| `sm:` | ≥ 640px | Large phones, small tablets |
| `md:` | ≥ 768px | Tablets |
| `lg:` | ≥ 1024px | Desktop |

### Touch Target Requirements

- Minimum button height: 48px (`h-12`) on mobile
- Minimum tap area: 44x44px for all interactive elements
- Adequate spacing between interactive elements (min 8px)
- Full-width buttons on mobile, inline on desktop

### Design Token Consistency

All screens use the same:
- Color palette (via CSS variables + Tailwind)
- Spacing scale (Tailwind default: 4px base)
- Border radius (`.rounded-lg` = 8px, `.rounded-xl` = 12px)
- Typography scale (`.text-sm`, `.text-base`, `.text-lg`, etc.)

## Alternatives Considered

### 1. Desktop-first with mobile adjustments
- **Rejected**: Primary use case is mobile; would require more override classes

### 2. CSS Modules or Styled Components
- **Rejected**: Tailwind already in place; adding another system increases complexity

### 3. Screen-by-screen approach (dashboard only)
- **Rejected**: Creates inconsistent UX; unified system is more maintainable

### 4. Swipe gestures for card actions
- **Deferred to v0.2**: Adds complexity, requires gesture library; button-based actions sufficient for MVP

### 5. Infinite scroll pagination
- **Rejected**: "Load more" button gives user explicit control, simpler to implement

## Consequences

### Positive
- Consistent UX across all screens
- Better mobile experience for primary use case
- Single styling approach (Tailwind utilities everywhere)
- Leverages existing Tailwind setup
- Smaller CSS bundle (no unused custom classes)
- Easier onboarding for new contributors

### Negative
- Refactoring required for dashboard components
- Login page design doc (ADR-014) needs update to use Tailwind
- Longer class strings in JSX (Tailwind trade-off)

### Risks
- Virtual keyboard handling on mobile may need iteration
- Response editor modal needs careful UX testing

## Related

- [ADR-013: Opportunity Dashboard UI](./013-opportunity-dashboard-ui.md)
- [ADR-014: Simple Token Authentication](./014-simple-token-auth.md)
- [ADR-012: First-Launch Wizard](./012-first-launch-wizard.md)
- [Design Document: Responsive Web Design](../../.agents/artifacts/designer/designs/responsive-web-design.md)
