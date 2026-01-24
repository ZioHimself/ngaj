/**
 * LoadMore Component - Stub
 *
 * Mobile-friendly "Load More" button that replaces numbered pagination.
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
 * LoadMore component stub - implementation required
 */
export function LoadMore(_props: LoadMoreProps): JSX.Element {
  throw new Error('Not implemented');
}
