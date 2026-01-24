/**
 * @vitest-environment jsdom
 */

/**
 * FilterBar Component Unit Tests
 *
 * Tests for the FilterBar component for filtering
 * opportunities by status.
 *
 * @see ADR-013: Opportunity Dashboard UI
 * @see ADR-015: Mobile-First Responsive Web Design
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '@ngaj/frontend/components/dashboard/FilterBar';
import { filterStatusOptions } from '@tests/fixtures/dashboard-fixtures';
import type { OpportunityStatus } from '@ngaj/shared';

describe('FilterBar', () => {
  const defaultProps = {
    currentFilter: 'pending' as OpportunityStatus | 'all',
    onFilterChange: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filter Options Rendering', () => {
    it('should render all filter options', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert - check all options are present
      filterStatusOptions.forEach((option) => {
        expect(screen.getByText(option.label)).toBeInTheDocument();
      });
    });

    it('should display "All" option', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('should display "Pending" option', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should display "Draft Ready" option', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      expect(screen.getByText('Draft Ready')).toBeInTheDocument();
    });

    it('should display "Posted" option', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      expect(screen.getByText('Posted')).toBeInTheDocument();
    });

    it('should display "Dismissed" option', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      expect(screen.getByText('Dismissed')).toBeInTheDocument();
    });
  });

  describe('Current Selection', () => {
    it('should visually indicate current selection', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} currentFilter="pending" />);

      // Assert - the Pending button should have active/selected styling
      const pendingButton = screen.getByRole('button', { name: /pending/i });
      expect(pendingButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should indicate "All" when selected', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} currentFilter="all" />);

      // Assert
      const allButton = screen.getByRole('button', { name: /all/i });
      expect(allButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should not indicate non-selected options as active', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} currentFilter="pending" />);

      // Assert - "All" should not be active
      const allButton = screen.getByRole('button', { name: /^all$/i });
      expect(allButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Filter Change Callback', () => {
    it('should call onFilterChange with "all" when All clicked', async () => {
      // Arrange
      const onFilterChange = vi.fn();
      const user = userEvent.setup();

      // Act
      render(
        <FilterBar {...defaultProps} onFilterChange={onFilterChange} />
      );
      await user.click(screen.getByRole('button', { name: /^all$/i }));

      // Assert
      expect(onFilterChange).toHaveBeenCalledOnce();
      expect(onFilterChange).toHaveBeenCalledWith('all');
    });

    it('should call onFilterChange with "pending" when Pending clicked', async () => {
      // Arrange
      const onFilterChange = vi.fn();
      const user = userEvent.setup();

      // Act
      render(
        <FilterBar
          {...defaultProps}
          currentFilter="all"
          onFilterChange={onFilterChange}
        />
      );
      await user.click(screen.getByRole('button', { name: /pending/i }));

      // Assert
      expect(onFilterChange).toHaveBeenCalledWith('pending');
    });

    it('should call onFilterChange with "responded" when Posted clicked', async () => {
      // Arrange
      const onFilterChange = vi.fn();
      const user = userEvent.setup();

      // Act
      render(
        <FilterBar {...defaultProps} onFilterChange={onFilterChange} />
      );
      await user.click(screen.getByRole('button', { name: /posted/i }));

      // Assert
      expect(onFilterChange).toHaveBeenCalledWith('responded');
    });

    it('should call onFilterChange with "dismissed" when Dismissed clicked', async () => {
      // Arrange
      const onFilterChange = vi.fn();
      const user = userEvent.setup();

      // Act
      render(
        <FilterBar {...defaultProps} onFilterChange={onFilterChange} />
      );
      await user.click(screen.getByRole('button', { name: /dismissed/i }));

      // Assert
      expect(onFilterChange).toHaveBeenCalledWith('dismissed');
    });
  });

  describe('Loading State', () => {
    it('should disable buttons while loading', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} isLoading={true} />);

      // Assert - all filter buttons should be disabled
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Mobile Scroll Behavior (ADR-015)', () => {
    it('should have overflow-x-auto for mobile horizontal scroll', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('overflow-x-auto');
    });

    it('should have scrollbar-hide class to hide scrollbar', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('scrollbar-hide');
    });

    it('should have shrink-0 on filter buttons to prevent shrinking', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('shrink-0');
      });
    });

    it('should have gap-2 between filter buttons', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('gap-2');
    });
  });

  describe('Button Styling (ADR-015)', () => {
    it('should use pill-shaped buttons (rounded-full)', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('rounded-full');
      });
    });

    it('should have consistent padding (px-4 py-2)', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('px-4', 'py-2');
      });
    });

    it('should use text-sm for filter button text', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('text-sm');
      });
    });

    it('should have font-medium for button text weight', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('font-medium');
      });
    });

    it('should have transition-colors for smooth state changes', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} />);

      // Assert
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('transition-colors');
      });
    });

    it('should apply active styling (bg-blue-500 text-white) to selected filter', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} currentFilter="pending" />);

      // Assert
      const pendingButton = screen.getByRole('button', { name: /pending/i });
      expect(pendingButton).toHaveClass('bg-blue-500', 'text-white');
    });

    it('should apply inactive styling (bg-slate-100 text-slate-600) to unselected filters', () => {
      // Arrange & Act
      render(<FilterBar {...defaultProps} currentFilter="pending" />);

      // Assert
      const allButton = screen.getByRole('button', { name: /^all$/i });
      expect(allButton).toHaveClass('bg-slate-100', 'text-slate-600');
    });
  });
});
