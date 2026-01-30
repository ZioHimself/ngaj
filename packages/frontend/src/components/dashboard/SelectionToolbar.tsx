/**
 * SelectionToolbar Component
 *
 * Fixed toolbar displayed when selection mode is active.
 * Provides bulk actions: Select all, Select others, Dismiss selected, Cancel.
 *
 * @see ADR-018: Expiration Mechanics - Bulk Dismiss UX
 * @see Design: Section 6.4 Selection Actions
 */

import React from 'react';

export interface SelectionToolbarProps {
  /** Number of currently selected items */
  selectedCount: number;
  /** Total number of visible items */
  totalCount: number;
  /** IDs of all visible opportunities (current filter view) */
  visibleIds: string[];
  /** Set of selected opportunity IDs */
  selectedIds: Set<string>;
  /** Handler for dismissing selected items */
  onDismissSelected: () => void;
  /** Handler for selecting all visible items */
  onSelectAll: () => void;
  /** Handler for selecting all non-selected items (invert selection) */
  onSelectOthers: () => void;
  /** Handler for cancelling selection mode */
  onCancel: () => void;
}

/**
 * SelectionToolbar displays bulk action buttons when selection mode is active.
 *
 * Actions:
 * - "Select all": Selects all visible opportunities in current filter view
 * - "Select others": Inverts selection (selects unselected, deselects selected)
 * - "Dismiss selected (N)": Bulk dismisses all selected opportunities
 * - "Cancel": Exits selection mode and clears selection
 */
export function SelectionToolbar(_props: SelectionToolbarProps): React.ReactElement {
  throw new Error('Not implemented');
}
