/**
 * FilterBar Component
 *
 * Filter buttons for opportunity status.
 * Mobile-first with horizontal scroll and pill-shaped buttons.
 *
 * @see ADR-013: Opportunity Dashboard UI
 * @see ADR-015: Mobile-First Responsive Web Design
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
    <nav
      role="navigation"
      aria-label="Filter opportunities"
      className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mb-2"
    >
      {filterOptions.map((option) => {
        const isActive = currentFilter === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onFilterChange(option.value)}
            disabled={isLoading}
            aria-pressed={isActive}
            className={`
              shrink-0 px-4 py-2 rounded-full text-sm font-medium
              transition-colors
              ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </nav>
  );
}
