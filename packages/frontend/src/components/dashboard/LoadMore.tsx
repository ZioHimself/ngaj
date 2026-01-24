/**
 * LoadMore Component
 *
 * Mobile-friendly "Load More" button that replaces numbered pagination.
 * Provides touch-friendly 48px buttons and clear progress feedback.
 *
 * @see ADR-015: Mobile-First Responsive Web Design
 */

export interface LoadMoreProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loadedCount: number;
  totalCount: number;
}

/**
 * LoadMore component for mobile-friendly pagination
 */
export function LoadMore({
  hasMore,
  isLoading,
  onLoadMore,
  loadedCount,
  totalCount,
}: LoadMoreProps): JSX.Element {
  return (
    <div
      data-testid="load-more-container"
      className="flex flex-col items-center gap-3 py-6"
    >
      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoading}
          className="btn btn-secondary h-12 px-8"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span
                data-testid="loading-spinner"
                className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"
              />
              Loading...
            </span>
          ) : (
            'Load More'
          )}
        </button>
      ) : (
        <p className="text-sm text-slate-500">
          Showing all {totalCount} opportunities
        </p>
      )}
      <p className="text-xs text-slate-400">
        {loadedCount} of {totalCount} loaded
      </p>
    </div>
  );
}
