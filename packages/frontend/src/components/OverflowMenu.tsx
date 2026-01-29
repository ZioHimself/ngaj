/**
 * OverflowMenu component - stub for TDD.
 * Renders minimal placeholder; tests expect button, dropdown, items.
 *
 * @see ADR-019: QR Mobile Navigation
 * @see .agents/artifacts/designer/designs/qr-mobile-navigation-design.md
 */

import type React from 'react';

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export interface OverflowMenuProps {
  items: MenuItem[];
}

export function OverflowMenu({ items: _items }: OverflowMenuProps): React.ReactElement {
  // Stub: button only; implementer will add dropdown, outside click, Escape
  return (
    <div data-testid="overflow-menu-stub">
      <button type="button" aria-label="Open menu">
        ⋮
      </button>
    </div>
  );
}
