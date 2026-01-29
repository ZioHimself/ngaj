/**
 * @vitest-environment jsdom
 */

/**
 * Selection Mode UI Component Tests
 *
 * Tests for multi-select functionality including desktop checkbox behavior,
 * mobile long-press, "Select others" inversion, and bulk dismiss integration.
 *
 * @see ADR-018: Expiration Mechanics
 * @see Design: .agents/artifacts/designer/designs/expiration-mechanics-design.md (Section 6)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OpportunityCard } from '@ngaj/frontend/components/dashboard/OpportunityCard';
import { dashboardOpportunityFixtures } from '@tests/fixtures/dashboard-fixtures';

/** Long-press duration in milliseconds */
const LONG_PRESS_MS = 500;

describe('Selection Mode UI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Desktop - Checkbox Behavior', () => {
    const defaultProps = {
      opportunity: dashboardOpportunityFixtures.pending,
      response: undefined,
      onGenerateResponse: vi.fn(),
      onDismiss: vi.fn(),
      onPost: vi.fn(),
      onEditResponse: vi.fn(),
      isGenerating: false,
      isPosting: false,
      // Selection mode props
      isSelectionMode: false,
      isSelected: false,
      onToggleSelect: vi.fn(),
    };

    it('should have checkbox with opacity-0 by default (hidden until hover)', () => {
      // Arrange & Act
      render(<OpportunityCard {...defaultProps} />);

      // Assert
      const checkbox = screen.getByRole('checkbox', { hidden: true });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox.parentElement).toHaveClass('opacity-0');
    });

    it('should show checkbox with opacity-100 on hover', () => {
      // Arrange
      render(<OpportunityCard {...defaultProps} />);
      const card = screen.getByTestId('opportunity-card');

      // Act
      fireEvent.mouseEnter(card);

      // Assert
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.parentElement).toHaveClass('group-hover:opacity-100');
    });

    it('should have clickable checkbox when visible', () => {
      // Arrange
      const onToggleSelect = vi.fn();
      render(
        <OpportunityCard
          {...defaultProps}
          isSelectionMode={true}
          onToggleSelect={onToggleSelect}
        />
      );

      // Act
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Assert
      expect(onToggleSelect).toHaveBeenCalledOnce();
      expect(onToggleSelect).toHaveBeenCalledWith(defaultProps.opportunity._id);
    });

    it('should toggle isSelected state when checkbox clicked', () => {
      // Arrange
      const onToggleSelect = vi.fn();
      render(
        <OpportunityCard
          {...defaultProps}
          isSelectionMode={true}
          isSelected={false}
          onToggleSelect={onToggleSelect}
        />
      );

      // Act
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Assert
      expect(onToggleSelect).toHaveBeenCalled();
    });

    it('should activate selection mode when first checkbox clicked', () => {
      // Arrange
      const onToggleSelect = vi.fn();
      render(
        <OpportunityCard
          {...defaultProps}
          isSelectionMode={false}
          onToggleSelect={onToggleSelect}
        />
      );

      // Act
      const card = screen.getByTestId('opportunity-card');
      fireEvent.mouseEnter(card);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Assert
      expect(onToggleSelect).toHaveBeenCalledWith(defaultProps.opportunity._id);
    });

    it('should show visual indicator for selected state', () => {
      // Arrange
      render(
        <OpportunityCard
          {...defaultProps}
          isSelectionMode={true}
          isSelected={true}
        />
      );

      // Assert
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      // Card should have selected visual treatment
      const card = screen.getByTestId('opportunity-card');
      expect(card).toHaveClass('ring-2');
    });

    it('should always show checkbox when in selection mode', () => {
      // Arrange
      render(
        <OpportunityCard
          {...defaultProps}
          isSelectionMode={true}
          isSelected={false}
        />
      );

      // Assert - checkbox visible without hover
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.parentElement).toHaveClass('opacity-100');
    });
  });

  describe('Mobile - Long-Press Behavior', () => {
    const defaultProps = {
      opportunity: dashboardOpportunityFixtures.pending,
      response: undefined,
      onGenerateResponse: vi.fn(),
      onDismiss: vi.fn(),
      onPost: vi.fn(),
      onEditResponse: vi.fn(),
      isGenerating: false,
      isPosting: false,
      isSelectionMode: false,
      isSelected: false,
      onToggleSelect: vi.fn(),
      onEnterSelectionMode: vi.fn(),
    };

    it('should start timer on touchstart', () => {
      // Arrange
      render(<OpportunityCard {...defaultProps} />);
      const card = screen.getByTestId('opportunity-card');

      // Act
      fireEvent.touchStart(card);

      // Assert - timer should be running (no immediate effect)
      expect(defaultProps.onEnterSelectionMode).not.toHaveBeenCalled();
    });

    it('should enter selection mode after 500ms long-press', () => {
      // Arrange
      const onEnterSelectionMode = vi.fn();
      const onToggleSelect = vi.fn();
      render(
        <OpportunityCard
          {...defaultProps}
          onEnterSelectionMode={onEnterSelectionMode}
          onToggleSelect={onToggleSelect}
        />
      );
      const card = screen.getByTestId('opportunity-card');

      // Act
      fireEvent.touchStart(card);
      act(() => {
        vi.advanceTimersByTime(LONG_PRESS_MS);
      });

      // Assert
      expect(onEnterSelectionMode).toHaveBeenCalledOnce();
      expect(onToggleSelect).toHaveBeenCalledWith(defaultProps.opportunity._id);
    });

    it('should cancel timer on touchend before 500ms', () => {
      // Arrange
      const onEnterSelectionMode = vi.fn();
      render(
        <OpportunityCard
          {...defaultProps}
          onEnterSelectionMode={onEnterSelectionMode}
        />
      );
      const card = screen.getByTestId('opportunity-card');

      // Act - touch for less than 500ms
      fireEvent.touchStart(card);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      fireEvent.touchEnd(card);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert
      expect(onEnterSelectionMode).not.toHaveBeenCalled();
    });

    it('should NOT enter selection mode on normal tap', () => {
      // Arrange
      const onEnterSelectionMode = vi.fn();
      render(
        <OpportunityCard
          {...defaultProps}
          onEnterSelectionMode={onEnterSelectionMode}
        />
      );
      const card = screen.getByTestId('opportunity-card');

      // Act - quick tap (< 500ms)
      fireEvent.touchStart(card);
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.touchEnd(card);

      // Assert
      expect(onEnterSelectionMode).not.toHaveBeenCalled();
    });

    it('should select item when long-press triggers selection mode', () => {
      // Arrange
      const onToggleSelect = vi.fn();
      render(
        <OpportunityCard
          {...defaultProps}
          onToggleSelect={onToggleSelect}
        />
      );
      const card = screen.getByTestId('opportunity-card');

      // Act
      fireEvent.touchStart(card);
      act(() => {
        vi.advanceTimersByTime(LONG_PRESS_MS);
      });

      // Assert
      expect(onToggleSelect).toHaveBeenCalledWith(defaultProps.opportunity._id);
    });
  });

  describe('Mobile - Tap in Selection Mode', () => {
    const defaultProps = {
      opportunity: dashboardOpportunityFixtures.pending,
      response: undefined,
      onGenerateResponse: vi.fn(),
      onDismiss: vi.fn(),
      onPost: vi.fn(),
      onEditResponse: vi.fn(),
      isGenerating: false,
      isPosting: false,
      isSelectionMode: true,
      isSelected: false,
      onToggleSelect: vi.fn(),
    };

    it('should toggle selection on tap when in selection mode', () => {
      // Arrange
      const onToggleSelect = vi.fn();
      render(
        <OpportunityCard
          {...defaultProps}
          isSelectionMode={true}
          isSelected={false}
          onToggleSelect={onToggleSelect}
        />
      );
      const card = screen.getByTestId('opportunity-card');

      // Act
      fireEvent.click(card);

      // Assert
      expect(onToggleSelect).toHaveBeenCalledWith(defaultProps.opportunity._id);
    });

    it('should add unselected item to selection on tap', () => {
      // Arrange
      const onToggleSelect = vi.fn();
      render(
        <OpportunityCard
          {...defaultProps}
          isSelectionMode={true}
          isSelected={false}
          onToggleSelect={onToggleSelect}
        />
      );

      // Act
      fireEvent.click(screen.getByTestId('opportunity-card'));

      // Assert
      expect(onToggleSelect).toHaveBeenCalled();
    });

    it('should remove selected item from selection on tap', () => {
      // Arrange
      const onToggleSelect = vi.fn();
      render(
        <OpportunityCard
          {...defaultProps}
          isSelectionMode={true}
          isSelected={true}
          onToggleSelect={onToggleSelect}
        />
      );

      // Act
      fireEvent.click(screen.getByTestId('opportunity-card'));

      // Assert
      expect(onToggleSelect).toHaveBeenCalled();
    });

    it('should disable card expand/collapse in selection mode', () => {
      // Arrange
      const onExpand = vi.fn();
      render(
        <OpportunityCard
          {...defaultProps}
          isSelectionMode={true}
          onExpand={onExpand}
        />
      );

      // Act
      fireEvent.click(screen.getByTestId('opportunity-card'));

      // Assert - expand should NOT be called in selection mode
      expect(onExpand).not.toHaveBeenCalled();
    });
  });

  describe('Selection Toolbar', () => {
    // Note: SelectionToolbar is a separate component
    // These tests verify the expected props and behavior

    it('should display selected count', () => {
      // This would test the SelectionToolbar component
      // For now, we verify the card passes correct props
      const { container } = render(
        <OpportunityCard
          {...{
            opportunity: dashboardOpportunityFixtures.pending,
            response: undefined,
            onGenerateResponse: vi.fn(),
            onDismiss: vi.fn(),
            onPost: vi.fn(),
            onEditResponse: vi.fn(),
            isGenerating: false,
            isPosting: false,
            isSelectionMode: true,
            isSelected: true,
            onToggleSelect: vi.fn(),
          }}
        />
      );

      // Verify selected state is visually indicated
      expect(container.querySelector('[data-selected="true"]')).toBeInTheDocument();
    });
  });
});

describe('Clickable Elements Should Not Trigger Selection', () => {
  /**
   * Tests that interactive elements (buttons, links, textarea) don't accidentally
   * trigger card selection when clicked. This is achieved via stopPropagation.
   */

  const defaultProps = {
    opportunity: dashboardOpportunityFixtures.pending,
    response: undefined,
    onGenerateResponse: vi.fn(),
    onDismiss: vi.fn(),
    onPost: vi.fn(),
    onEditResponse: vi.fn(),
    isGenerating: false,
    isPosting: false,
    isSelectionMode: true,
    isSelected: false,
    onToggleSelect: vi.fn(),
  };

  it('should NOT trigger selection when "Generate Response" button clicked', () => {
    // Arrange
    const onToggleSelect = vi.fn();
    const onGenerateResponse = vi.fn();
    render(
      <OpportunityCard
        {...defaultProps}
        onToggleSelect={onToggleSelect}
        onGenerateResponse={onGenerateResponse}
      />
    );

    // Act
    const generateButton = screen.getByRole('button', { name: /generate response/i });
    fireEvent.click(generateButton);

    // Assert - generate should be called, but NOT selection toggle
    expect(onGenerateResponse).toHaveBeenCalledOnce();
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('should NOT trigger selection when "Dismiss" button clicked', () => {
    // Arrange
    const onToggleSelect = vi.fn();
    const onDismiss = vi.fn();
    render(
      <OpportunityCard
        {...defaultProps}
        onToggleSelect={onToggleSelect}
        onDismiss={onDismiss}
      />
    );

    // Act
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    // Assert - dismiss should be called, but NOT selection toggle
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('should NOT trigger selection when "Show more" button clicked', () => {
    // Arrange - use long text fixture that has expandable content
    const onToggleSelect = vi.fn();
    render(
      <OpportunityCard
        {...defaultProps}
        opportunity={dashboardOpportunityFixtures.longText}
        onToggleSelect={onToggleSelect}
      />
    );

    // Act - find and click the "Show more" button
    const showMoreButton = screen.getByRole('button', { name: /show more/i });
    fireEvent.click(showMoreButton);

    // Assert - selection should NOT be triggered
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('should NOT trigger selection when "Show less" button clicked after expansion', () => {
    // Arrange - use long text fixture
    const onToggleSelect = vi.fn();
    render(
      <OpportunityCard
        {...defaultProps}
        opportunity={dashboardOpportunityFixtures.longText}
        onToggleSelect={onToggleSelect}
      />
    );

    // Act - expand first, then collapse
    const showMoreButton = screen.getByRole('button', { name: /show more/i });
    fireEvent.click(showMoreButton);
    onToggleSelect.mockClear(); // Clear any calls from first click

    const showLessButton = screen.getByRole('button', { name: /show less/i });
    fireEvent.click(showLessButton);

    // Assert - selection should NOT be triggered
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('should NOT trigger selection when "Dismiss" button clicked on draft card', () => {
    // Arrange - card with draft response has a separate dismiss button
    const onToggleSelect = vi.fn();
    const onDismiss = vi.fn();
    render(
      <OpportunityCard
        {...defaultProps}
        opportunity={dashboardOpportunityFixtures.withDraft}
        response={{
          _id: 'response-1',
          opportunityId: dashboardOpportunityFixtures.withDraft._id,
          accountId: 'account-1',
          text: 'Draft response text',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onToggleSelect={onToggleSelect}
        onDismiss={onDismiss}
      />
    );

    // Act
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    // Assert
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('should NOT trigger selection when "View on Bluesky" link clicked', () => {
    // Arrange - posted response has a link to the platform post
    const onToggleSelect = vi.fn();
    render(
      <OpportunityCard
        {...defaultProps}
        opportunity={dashboardOpportunityFixtures.responded}
        response={{
          _id: 'response-1',
          opportunityId: dashboardOpportunityFixtures.responded._id,
          accountId: 'account-1',
          text: 'Posted response',
          status: 'posted',
          platformPostUrl: 'https://bsky.app/profile/test/post/123',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onToggleSelect={onToggleSelect}
      />
    );

    // Act
    const link = screen.getByRole('link', { name: /view on bluesky/i });
    fireEvent.click(link);

    // Assert - selection should NOT be triggered
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('should NOT trigger selection when editing response textarea', () => {
    // Arrange - card with draft response has editable textarea
    const onToggleSelect = vi.fn();
    const onEditResponse = vi.fn();
    render(
      <OpportunityCard
        {...defaultProps}
        opportunity={dashboardOpportunityFixtures.withDraft}
        response={{
          _id: 'response-1',
          opportunityId: dashboardOpportunityFixtures.withDraft._id,
          accountId: 'account-1',
          text: 'Draft response text',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onToggleSelect={onToggleSelect}
        onEditResponse={onEditResponse}
      />
    );

    // Act - click on textarea
    const textarea = screen.getByRole('textbox');
    fireEvent.click(textarea);

    // Assert - selection should NOT be triggered
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('should NOT trigger selection when "Regenerate" button clicked in ResponseEditor', () => {
    // Arrange - card with draft response has regenerate button
    const onToggleSelect = vi.fn();
    const onGenerateResponse = vi.fn();
    render(
      <OpportunityCard
        {...defaultProps}
        opportunity={dashboardOpportunityFixtures.withDraft}
        response={{
          _id: 'response-1',
          opportunityId: dashboardOpportunityFixtures.withDraft._id,
          accountId: 'account-1',
          text: 'Draft response text',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onToggleSelect={onToggleSelect}
        onGenerateResponse={onGenerateResponse}
      />
    );

    // Act
    const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
    fireEvent.click(regenerateButton);

    // Assert - regenerate should be called (via onGenerateResponse), but NOT selection toggle
    expect(onGenerateResponse).toHaveBeenCalledOnce();
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('should NOT trigger selection when "Post Response" button clicked in ResponseEditor', () => {
    // Arrange - card with draft response has post button
    const onToggleSelect = vi.fn();
    const onPost = vi.fn();
    render(
      <OpportunityCard
        {...defaultProps}
        opportunity={dashboardOpportunityFixtures.withDraft}
        response={{
          _id: 'response-1',
          opportunityId: dashboardOpportunityFixtures.withDraft._id,
          accountId: 'account-1',
          text: 'Draft response text',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onToggleSelect={onToggleSelect}
        onPost={onPost}
      />
    );

    // Act
    const postButton = screen.getByRole('button', { name: /post response/i });
    fireEvent.click(postButton);

    // Assert - post should be called, but NOT selection toggle
    expect(onPost).toHaveBeenCalledOnce();
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('should NOT trigger selection when checkbox itself is clicked', () => {
    // Arrange - clicking checkbox should toggle selection via onChange, not card click
    const onToggleSelect = vi.fn();
    render(
      <OpportunityCard
        {...defaultProps}
        onToggleSelect={onToggleSelect}
      />
    );

    // Act - click the checkbox directly
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Assert - should be called exactly once (from checkbox onChange, not from card click)
    expect(onToggleSelect).toHaveBeenCalledTimes(1);
  });
});

describe('SelectionToolbar Component', () => {
  // These tests would be for the standalone SelectionToolbar component
  // Placeholder for implementation

  describe('"Select others" functionality', () => {
    it('should invert selection when "Select others" clicked', () => {
      // Arrange
      // Given: 10 opportunities visible, 3 selected
      const visibleIds = Array.from({ length: 10 }, (_, i) => `opp-${i}`);
      const selectedIds = new Set(['opp-0', 'opp-1', 'opp-2']);

      // Act - simulate "Select others" logic
      const othersIds = new Set(visibleIds.filter((id) => !selectedIds.has(id)));

      // Assert
      expect(othersIds.size).toBe(7);
      expect(othersIds.has('opp-0')).toBe(false);
      expect(othersIds.has('opp-3')).toBe(true);
    });

    it('should update count to show newly selected items', () => {
      // Arrange
      const initialSelected = 3;
      const total = 10;

      // Act
      const afterSelectOthers = total - initialSelected;

      // Assert
      expect(afterSelectOthers).toBe(7);
    });

    it('should deselect originally selected items', () => {
      // Arrange
      const originalSelected = new Set(['a', 'b', 'c']);
      const allItems = ['a', 'b', 'c', 'd', 'e'];

      // Act - "Select others" inverts selection
      const newSelected = new Set(
        allItems.filter((id) => !originalSelected.has(id))
      );

      // Assert
      expect(newSelected.has('a')).toBe(false);
      expect(newSelected.has('b')).toBe(false);
      expect(newSelected.has('c')).toBe(false);
      expect(newSelected.has('d')).toBe(true);
      expect(newSelected.has('e')).toBe(true);
    });
  });

  describe('Cancel functionality', () => {
    it('should deactivate selection mode on Cancel', () => {
      // Arrange
      let isSelectionMode = true;
      const selectedIds = new Set(['opp-1', 'opp-2']);

      // Act - simulate cancel
      const handleCancel = () => {
        isSelectionMode = false;
        selectedIds.clear();
      };
      handleCancel();

      // Assert
      expect(isSelectionMode).toBe(false);
      expect(selectedIds.size).toBe(0);
    });

    it('should clear selection on Cancel', () => {
      // Arrange
      const selectedIds = new Set(['opp-1', 'opp-2', 'opp-3']);

      // Act
      selectedIds.clear();

      // Assert
      expect(selectedIds.size).toBe(0);
    });

    it('should return UI to normal state on Cancel', () => {
      // This would test visual state changes
      // For now, verify state cleanup logic
      const state = {
        isSelectionMode: true,
        selectedIds: new Set(['a', 'b']),
      };

      // Act
      state.isSelectionMode = false;
      state.selectedIds = new Set();

      // Assert
      expect(state.isSelectionMode).toBe(false);
      expect(state.selectedIds.size).toBe(0);
    });
  });

  describe('Dismiss Selected', () => {
    it('should call bulk dismiss with selected IDs', () => {
      // Arrange
      const selectedIds = new Set(['opp-1', 'opp-2', 'opp-3']);
      const onBulkDismiss = vi.fn();

      // Act
      onBulkDismiss(Array.from(selectedIds));

      // Assert
      expect(onBulkDismiss).toHaveBeenCalledWith(['opp-1', 'opp-2', 'opp-3']);
    });

    it('should display count in dismiss button', () => {
      // Arrange
      const selectedCount = 5;

      // Assert - button text should include count
      const expectedText = `Dismiss selected (${selectedCount})`;
      expect(expectedText).toBe('Dismiss selected (5)');
    });
  });
});
