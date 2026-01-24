/**
 * Pagination Component (Stub)
 *
 * Page navigation for opportunities list.
 *
 * @see ADR-013: Opportunity Dashboard UI
 */

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export function Pagination(_props: PaginationProps): JSX.Element {
  // TODO: Implement component - Test-Writer stub only
  throw new Error('Pagination not implemented');
}
