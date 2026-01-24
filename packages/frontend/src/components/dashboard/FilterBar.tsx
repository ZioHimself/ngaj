/**
 * FilterBar Component
 *
 * Filter buttons for opportunity status.
 *
 * @see ADR-013: Opportunity Dashboard UI
 */

import type { OpportunityStatus } from '@ngaj/shared';

/**
 * Filter values supported by the dashboard UI.
 * Extends OpportunityStatus with:
 * - 'all': Show all opportunities
 * - 'draft': Show opportunities with draft responses (UI-only concept)
 */
export type DashboardFilterValue = OpportunityStatus | 'all' | 'draft';

export interface FilterBarProps {
  currentFilter: DashboardFilterValue;
  onFilterChange: (filter: DashboardFilterValue) => void;
  isLoading: boolean;
}

/** Filter options matching dashboard-fixtures.ts */
const filterOptions: Array<{
  value: DashboardFilterValue;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Draft Ready' },
  { value: 'responded', label: 'Posted' },
  { value: 'dismissed', label: 'Dismissed' },
];

export function FilterBar({
  currentFilter,
  onFilterChange,
  isLoading,
}: FilterBarProps): JSX.Element {
  return (
    <div className="filter-bar" role="group" aria-label="Filter opportunities">
      {filterOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onFilterChange(option.value)}
          disabled={isLoading}
          aria-pressed={currentFilter === option.value}
          className={currentFilter === option.value ? 'active' : ''}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
