/**
 * Pagination Component
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

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
}: PaginationProps): JSX.Element {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <div className="pagination">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isLoading || isFirstPage}
        aria-label="Previous page"
      >
        Previous
      </button>

      <span className="page-info">
        Page {currentPage} of {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLoading || isLastPage}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
}
