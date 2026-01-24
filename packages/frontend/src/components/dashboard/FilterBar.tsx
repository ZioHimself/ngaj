/**
 * FilterBar Component (Stub)
 *
 * Filter buttons for opportunity status.
 *
 * @see ADR-013: Opportunity Dashboard UI
 */

import type { OpportunityStatus } from '@ngaj/shared';

export interface FilterBarProps {
  currentFilter: OpportunityStatus | 'all';
  onFilterChange: (filter: OpportunityStatus | 'all') => void;
  isLoading: boolean;
}

export function FilterBar(_props: FilterBarProps): JSX.Element {
  // TODO: Implement component - Test-Writer stub only
  throw new Error('FilterBar not implemented');
}
