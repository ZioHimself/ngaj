/**
 * @vitest-environment jsdom
 */

/**
 * Pagination Component Unit Tests
 *
 * Tests for the Pagination component for navigating
 * between pages of opportunities.
 *
 * @see ADR-013: Opportunity Dashboard UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from '@ngaj/frontend/components/dashboard/Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 3,
    onPageChange: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Info Display', () => {
    it('should display "Page X of Y" format', () => {
      // Arrange & Act
      render(<Pagination {...defaultProps} currentPage={1} totalPages={3} />);

      // Assert
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    it('should display correct info for middle page', () => {
      // Arrange & Act
      render(<Pagination {...defaultProps} currentPage={2} totalPages={5} />);

      // Assert
      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    });

    it('should display correct info for last page', () => {
      // Arrange & Act
      render(<Pagination {...defaultProps} currentPage={3} totalPages={3} />);

      // Assert
      expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    });

    it('should handle single page', () => {
      // Arrange & Act
      render(<Pagination {...defaultProps} currentPage={1} totalPages={1} />);

      // Assert
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    });
  });

  describe('Previous Button', () => {
    it('should disable Previous on page 1', () => {
      // Arrange & Act
      render(<Pagination {...defaultProps} currentPage={1} />);

      // Assert
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    });

    it('should enable Previous on page 2', () => {
      // Arrange & Act
      render(<Pagination {...defaultProps} currentPage={2} />);

      // Assert
      expect(
        screen.getByRole('button', { name: /previous/i })
      ).not.toBeDisabled();
    });

    it('should call onPageChange with decremented page when clicked', async () => {
      // Arrange
      const onPageChange = vi.fn();
      const user = userEvent.setup();

      // Act
      render(
        <Pagination
          {...defaultProps}
          currentPage={2}
          onPageChange={onPageChange}
        />
      );
      await user.click(screen.getByRole('button', { name: /previous/i }));

      // Assert
      expect(onPageChange).toHaveBeenCalledOnce();
      expect(onPageChange).toHaveBeenCalledWith(1);
    });
  });

  describe('Next Button', () => {
    it('should disable Next on last page', () => {
      // Arrange & Act
      render(<Pagination {...defaultProps} currentPage={3} totalPages={3} />);

      // Assert
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    it('should enable Next when not on last page', () => {
      // Arrange & Act
      render(<Pagination {...defaultProps} currentPage={1} totalPages={3} />);

      // Assert
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
    });

    it('should call onPageChange with incremented page when clicked', async () => {
      // Arrange
      const onPageChange = vi.fn();
      const user = userEvent.setup();

      // Act
      render(
        <Pagination
          {...defaultProps}
          currentPage={1}
          totalPages={3}
          onPageChange={onPageChange}
        />
      );
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Assert
      expect(onPageChange).toHaveBeenCalledOnce();
      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('Loading State', () => {
    it('should disable both buttons during loading', () => {
      // Arrange & Act
      render(
        <Pagination {...defaultProps} currentPage={2} isLoading={true} />
      );

      // Assert
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero total pages gracefully', () => {
      // Arrange & Act
      render(<Pagination {...defaultProps} currentPage={0} totalPages={0} />);

      // Assert - should not crash, might show "Page 0 of 0" or similar
      expect(screen.getByText(/page/i)).toBeInTheDocument();
    });

    it('should disable both buttons when single page', () => {
      // Arrange & Act
      render(<Pagination {...defaultProps} currentPage={1} totalPages={1} />);

      // Assert
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });
  });
});
