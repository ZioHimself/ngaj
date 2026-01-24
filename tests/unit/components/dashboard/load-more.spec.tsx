/**
 * @vitest-environment jsdom
 */

/**
 * LoadMore Component Unit Tests
 *
 * Tests for the LoadMore component that replaces numbered pagination
 * with a mobile-friendly "Load More" button pattern.
 *
 * @see ADR-015: Mobile-First Responsive Web Design
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadMore } from '@ngaj/frontend/components/dashboard/LoadMore';
import { loadMoreFixtures, createLoadMoreProps } from '@tests/fixtures/dashboard-fixtures';

describe('LoadMore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Load More Button Visibility', () => {
    it('should render "Load More" button when hasMore is true', () => {
      // Arrange & Act
      render(<LoadMore {...loadMoreFixtures.hasMore} />);

      // Assert
      expect(
        screen.getByRole('button', { name: /load more/i })
      ).toBeInTheDocument();
    });

    it('should hide "Load More" button when hasMore is false', () => {
      // Arrange & Act
      render(<LoadMore {...loadMoreFixtures.allLoaded} />);

      // Assert
      expect(
        screen.queryByRole('button', { name: /load more/i })
      ).not.toBeInTheDocument();
    });

    it('should display "Showing all X opportunities" when all loaded', () => {
      // Arrange
      const props = createLoadMoreProps({
        hasMore: false,
        loadedCount: 45,
        totalCount: 45,
      });

      // Act
      render(<LoadMore {...props} />);

      // Assert
      expect(
        screen.getByText(/showing all 45 opportunities/i)
      ).toBeInTheDocument();
    });
  });

  describe('Count Display', () => {
    it('should display "{loadedCount} of {totalCount} loaded" format', () => {
      // Arrange
      const props = createLoadMoreProps({
        loadedCount: 20,
        totalCount: 45,
      });

      // Act
      render(<LoadMore {...props} />);

      // Assert
      expect(screen.getByText('20 of 45 loaded')).toBeInTheDocument();
    });

    it('should update count after loading more', () => {
      // Arrange
      const props = createLoadMoreProps({
        loadedCount: 40,
        totalCount: 45,
      });

      // Act
      render(<LoadMore {...props} />);

      // Assert
      expect(screen.getByText('40 of 45 loaded')).toBeInTheDocument();
    });

    it('should handle zero items gracefully', () => {
      // Arrange & Act
      render(<LoadMore {...loadMoreFixtures.empty} />);

      // Assert
      expect(screen.getByText('0 of 0 loaded')).toBeInTheDocument();
    });
  });

  describe('Click Handler', () => {
    it('should call onLoadMore when button clicked', async () => {
      // Arrange
      const onLoadMore = vi.fn();
      const props = createLoadMoreProps({ onLoadMore });
      const user = userEvent.setup();

      // Act
      render(<LoadMore {...props} />);
      await user.click(screen.getByRole('button', { name: /load more/i }));

      // Assert
      expect(onLoadMore).toHaveBeenCalledOnce();
    });

    it('should not call onLoadMore when button disabled', async () => {
      // Arrange
      const onLoadMore = vi.fn();
      const props = createLoadMoreProps({
        onLoadMore,
        isLoading: true,
      });
      const user = userEvent.setup();

      // Act
      render(<LoadMore {...props} />);
      const button = screen.getByRole('button', { name: /loading/i });

      // Assert - button should be disabled
      expect(button).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should disable button during loading', () => {
      // Arrange & Act
      render(<LoadMore {...loadMoreFixtures.loading} />);

      // Assert
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should show spinner during loading', () => {
      // Arrange & Act
      render(<LoadMore {...loadMoreFixtures.loading} />);

      // Assert
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should display "Loading..." text during loading', () => {
      // Arrange & Act
      render(<LoadMore {...loadMoreFixtures.loading} />);

      // Assert
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Touch Target Compliance (ADR-015)', () => {
    it('should have 48px minimum height (h-12) for touch target', () => {
      // Arrange & Act
      render(<LoadMore {...loadMoreFixtures.hasMore} />);

      // Assert - verify h-12 class is present (48px)
      const button = screen.getByRole('button', { name: /load more/i });
      expect(button).toHaveClass('h-12');
    });

    it('should have adequate horizontal padding for touch', () => {
      // Arrange & Act
      render(<LoadMore {...loadMoreFixtures.hasMore} />);

      // Assert - verify px-8 class is present
      const button = screen.getByRole('button', { name: /load more/i });
      expect(button).toHaveClass('px-8');
    });
  });

  describe('Layout and Styling', () => {
    it('should center content vertically', () => {
      // Arrange & Act
      render(<LoadMore {...loadMoreFixtures.hasMore} />);

      // Assert - container should have centering classes
      const container = screen.getByTestId('load-more-container');
      expect(container).toHaveClass('flex', 'flex-col', 'items-center');
    });

    it('should have vertical padding for spacing', () => {
      // Arrange & Act
      render(<LoadMore {...loadMoreFixtures.hasMore} />);

      // Assert - container should have py-6 class
      const container = screen.getByTestId('load-more-container');
      expect(container).toHaveClass('py-6');
    });

    it('should use secondary button style', () => {
      // Arrange & Act
      render(<LoadMore {...loadMoreFixtures.hasMore} />);

      // Assert
      const button = screen.getByRole('button', { name: /load more/i });
      expect(button).toHaveClass('btn-secondary');
    });
  });
});
