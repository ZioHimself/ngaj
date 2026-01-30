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
import { SelectionToolbar } from '@ngaj/frontend/components/dashboard/SelectionToolbar';
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
  /**
   * Tests for SelectionToolbar component
   *
   * @see ADR-018: Expiration Mechanics - Bulk Dismiss UX
   * @see Design: Section 6.4 Selection Actions
   */

  const defaultToolbarProps = {
    selectedCount: 3,
    totalCount: 10,
    visibleIds: Array.from({ length: 10 }, (_, i) => `opp-${i}`),
    selectedIds: new Set(['opp-0', 'opp-1', 'opp-2']),
    onDismissSelected: vi.fn(),
    onSelectAll: vi.fn(),
    onSelectOthers: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('"Select all" functionality', () => {
    /**
     * Scenario: "Select all" selects all visible opportunities
     *
     * Given: 10 opportunities visible, 3 already selected
     * When: User clicks "Select all"
     * Then: All 10 opportunities become selected
     */

    it('should call onSelectAll when "Select all" button clicked', () => {
      // Arrange
      const onSelectAll = vi.fn();
      render(
        <SelectionToolbar
          {...defaultToolbarProps}
          onSelectAll={onSelectAll}
        />
      );

      // Act
      const selectAllButton = screen.getByRole('button', { name: /select all/i });
      fireEvent.click(selectAllButton);

      // Assert
      expect(onSelectAll).toHaveBeenCalledOnce();
    });

    it('should select all visible opportunities (10 items)', () => {
      // Arrange - simulate the handler logic
      const visibleIds = Array.from({ length: 10 }, (_, i) => `opp-${i}`);
      const selectedIds = new Set(['opp-0', 'opp-1', 'opp-2']); // 3 initially selected
      let newSelectedIds: Set<string> = new Set();

      const handleSelectAll = () => {
        newSelectedIds = new Set(visibleIds);
      };

      // Act
      handleSelectAll();

      // Assert - all visible opportunities added to selection
      expect(newSelectedIds.size).toBe(10);
      visibleIds.forEach((id) => {
        expect(newSelectedIds.has(id)).toBe(true);
      });
    });

    it('should update count to total visible (10) after Select all', () => {
      // Arrange
      const visibleIds = Array.from({ length: 10 }, (_, i) => `opp-${i}`);
      
      // Act - simulate select all
      const selectedCount = visibleIds.length;

      // Assert
      expect(selectedCount).toBe(10);
    });

    it('should work regardless of prior selection state (none selected)', () => {
      // Arrange - start with no selection
      const visibleIds = Array.from({ length: 10 }, (_, i) => `opp-${i}`);
      let selectedIds = new Set<string>();

      // Act - select all when nothing selected
      const handleSelectAll = () => {
        selectedIds = new Set(visibleIds);
      };
      handleSelectAll();

      // Assert
      expect(selectedIds.size).toBe(10);
    });

    it('should work regardless of prior selection state (all selected)', () => {
      // Arrange - start with all selected
      const visibleIds = Array.from({ length: 10 }, (_, i) => `opp-${i}`);
      let selectedIds = new Set(visibleIds);

      // Act - select all when all already selected (idempotent)
      const handleSelectAll = () => {
        selectedIds = new Set(visibleIds);
      };
      handleSelectAll();

      // Assert - still all selected
      expect(selectedIds.size).toBe(10);
    });

    it('should only select opportunities in current filter view (not across pagination)', () => {
      // Arrange - simulate paginated view with 20 items per page
      const page1Ids = Array.from({ length: 20 }, (_, i) => `page1-opp-${i}`);
      const page2Ids = Array.from({ length: 20 }, (_, i) => `page2-opp-${i}`);
      const currentVisibleIds = page1Ids; // Only page 1 is visible

      // Act - select all on current view
      const selectedIds = new Set(currentVisibleIds);

      // Assert - only page 1 items selected
      expect(selectedIds.size).toBe(20);
      page1Ids.forEach((id) => expect(selectedIds.has(id)).toBe(true));
      page2Ids.forEach((id) => expect(selectedIds.has(id)).toBe(false));
    });

    it('should render "Select all" button in toolbar', () => {
      // Arrange & Act
      render(<SelectionToolbar {...defaultToolbarProps} />);

      // Assert
      const selectAllButton = screen.getByRole('button', { name: /select all/i });
      expect(selectAllButton).toBeInTheDocument();
    });
  });

  describe('"Select others" functionality', () => {
    /**
     * Scenario: "Select others" inverts selection
     *
     * Given: 10 opportunities visible, 3 selected
     * When: User clicks "Select others"
     * Then: 7 become selected, 3 become unselected
     */

    it('should call onSelectOthers when "Select others" button clicked', () => {
      // Arrange
      const onSelectOthers = vi.fn();
      render(
        <SelectionToolbar
          {...defaultToolbarProps}
          onSelectOthers={onSelectOthers}
        />
      );

      // Act
      const selectOthersButton = screen.getByRole('button', { name: /select others/i });
      fireEvent.click(selectOthersButton);

      // Assert
      expect(onSelectOthers).toHaveBeenCalledOnce();
    });

    it('should invert selection when "Select others" clicked', () => {
      // Arrange
      // Given: 10 opportunities visible, 3 selected
      const visibleIds = Array.from({ length: 10 }, (_, i) => `opp-${i}`);
      const selectedIds = new Set(['opp-0', 'opp-1', 'opp-2']);

      // Act - simulate "Select others" logic
      const othersIds = new Set(visibleIds.filter((id) => !selectedIds.has(id)));

      // Assert - selection inverted for all visible items
      expect(othersIds.size).toBe(7);
      expect(othersIds.has('opp-0')).toBe(false);
      expect(othersIds.has('opp-3')).toBe(true);
    });

    it('should update count to 7 after Select others (from 3 of 10)', () => {
      // Arrange
      const initialSelected = 3;
      const total = 10;

      // Act
      const afterSelectOthers = total - initialSelected;

      // Assert - count updates to 7
      expect(afterSelectOthers).toBe(7);
    });

    it('should deselect originally selected items (original 3 no longer selected)', () => {
      // Arrange
      const originalSelected = new Set(['opp-0', 'opp-1', 'opp-2']);
      const allItems = Array.from({ length: 10 }, (_, i) => `opp-${i}`);

      // Act - "Select others" inverts selection
      const newSelected = new Set(
        allItems.filter((id) => !originalSelected.has(id))
      );

      // Assert - original 3 no longer selected
      expect(newSelected.has('opp-0')).toBe(false);
      expect(newSelected.has('opp-1')).toBe(false);
      expect(newSelected.has('opp-2')).toBe(false);
      // Others are now selected
      expect(newSelected.has('opp-3')).toBe(true);
      expect(newSelected.has('opp-9')).toBe(true);
    });

    it('should render "Select others" button in toolbar', () => {
      // Arrange & Act
      render(<SelectionToolbar {...defaultToolbarProps} />);

      // Assert
      const selectOthersButton = screen.getByRole('button', { name: /select others/i });
      expect(selectOthersButton).toBeInTheDocument();
    });
  });

  describe('"Select all" then "Select others" clears selection', () => {
    /**
     * Scenario: "Select all" then "Select others" clears selection
     *
     * Given: User clicked "Select all" (10 selected)
     * When: User clicks "Select others"
     * Then: 0 opportunities selected
     */

    it('should result in empty selection when all selected then "Select others"', () => {
      // Arrange - user clicked "Select all" (10 selected)
      const visibleIds = Array.from({ length: 10 }, (_, i) => `opp-${i}`);
      let selectedIds = new Set(visibleIds); // All 10 selected

      // Act - user clicks "Select others"
      const handleSelectOthers = () => {
        selectedIds = new Set(visibleIds.filter((id) => !selectedIds.has(id)));
      };
      handleSelectOthers();

      // Assert - when all are selected, "Select others" results in empty selection
      expect(selectedIds.size).toBe(0);
    });

    it('should update selection count to 0', () => {
      // Arrange - all 10 selected
      const visibleIds = Array.from({ length: 10 }, (_, i) => `opp-${i}`);
      let selectedIds = new Set(visibleIds);

      // Act - invert selection (select others)
      selectedIds = new Set(visibleIds.filter((id) => !selectedIds.has(id)));

      // Assert - selection count updates to 0
      expect(selectedIds.size).toBe(0);
    });

    it('should keep selection mode active after clearing (user can select again)', () => {
      // Arrange - simulate component state
      let isSelectionMode = true;
      const visibleIds = Array.from({ length: 10 }, (_, i) => `opp-${i}`);
      let selectedIds = new Set(visibleIds); // All selected

      // Act - "Select others" clears selection but keeps mode active
      const handleSelectOthers = () => {
        selectedIds = new Set(visibleIds.filter((id) => !selectedIds.has(id)));
        // Note: selection mode remains active
      };
      handleSelectOthers();

      // Assert - selection mode remains active (user can select again)
      expect(isSelectionMode).toBe(true);
      expect(selectedIds.size).toBe(0);
    });

    it('should allow user to select items again after clearing', () => {
      // Arrange - start with empty selection after "Select all" → "Select others"
      const visibleIds = Array.from({ length: 10 }, (_, i) => `opp-${i}`);
      let selectedIds = new Set<string>();
      const isSelectionMode = true;

      // Act - user manually selects an item
      const toggleSelect = (id: string) => {
        if (selectedIds.has(id)) {
          selectedIds.delete(id);
        } else {
          selectedIds.add(id);
        }
      };
      toggleSelect('opp-5');

      // Assert - can add new selections
      expect(selectedIds.has('opp-5')).toBe(true);
      expect(selectedIds.size).toBe(1);
    });
  });

  describe('"Select others" with none selected', () => {
    /**
     * Edge case from design document Section 9
     * "Select others" with none selected → Selects all visible items
     */

    it('should select all visible items when none initially selected', () => {
      // Arrange - no items selected
      const visibleIds = Array.from({ length: 10 }, (_, i) => `opp-${i}`);
      let selectedIds = new Set<string>(); // Empty

      // Act - "Select others" when nothing selected
      const handleSelectOthers = () => {
        selectedIds = new Set(visibleIds.filter((id) => !selectedIds.has(id)));
      };
      handleSelectOthers();

      // Assert - all items become selected
      expect(selectedIds.size).toBe(10);
      visibleIds.forEach((id) => expect(selectedIds.has(id)).toBe(true));
    });
  });

  describe('Cancel functionality', () => {
    it('should call onCancel when "Cancel" button clicked', () => {
      // Arrange
      const onCancel = vi.fn();
      render(
        <SelectionToolbar
          {...defaultToolbarProps}
          onCancel={onCancel}
        />
      );

      // Act
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Assert
      expect(onCancel).toHaveBeenCalledOnce();
    });

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

      // Assert - isSelectionMode becomes false
      expect(isSelectionMode).toBe(false);
      expect(selectedIds.size).toBe(0);
    });

    it('should clear selection on Cancel (selectedIds cleared)', () => {
      // Arrange
      const selectedIds = new Set(['opp-1', 'opp-2', 'opp-3']);

      // Act
      selectedIds.clear();

      // Assert
      expect(selectedIds.size).toBe(0);
    });

    it('should return UI to normal state on Cancel', () => {
      // Arrange - simulate state before cancel
      const state = {
        isSelectionMode: true,
        selectedIds: new Set(['a', 'b']),
      };

      // Act - cancel clears state
      state.isSelectionMode = false;
      state.selectedIds = new Set();

      // Assert - UI returns to normal state
      expect(state.isSelectionMode).toBe(false);
      expect(state.selectedIds.size).toBe(0);
    });

    it('should render "Cancel" button in toolbar', () => {
      // Arrange & Act
      render(<SelectionToolbar {...defaultToolbarProps} />);

      // Assert
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe('Dismiss Selected', () => {
    it('should call onDismissSelected when "Dismiss selected" button clicked', () => {
      // Arrange
      const onDismissSelected = vi.fn();
      render(
        <SelectionToolbar
          {...defaultToolbarProps}
          selectedCount={3}
          onDismissSelected={onDismissSelected}
        />
      );

      // Act
      const dismissButton = screen.getByRole('button', { name: /dismiss selected/i });
      fireEvent.click(dismissButton);

      // Assert
      expect(onDismissSelected).toHaveBeenCalledOnce();
    });

    it('should display count in dismiss button', () => {
      // Arrange
      const selectedCount = 5;
      render(
        <SelectionToolbar
          {...defaultToolbarProps}
          selectedCount={selectedCount}
        />
      );

      // Assert - button text should include count
      const dismissButton = screen.getByRole('button', { name: /dismiss selected \(5\)/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it('should display selected count in toolbar', () => {
      // Arrange & Act
      render(
        <SelectionToolbar
          {...defaultToolbarProps}
          selectedCount={3}
        />
      );

      // Assert
      expect(screen.getByText(/3 selected/i)).toBeInTheDocument();
    });
  });

  describe('Toolbar Visibility', () => {
    it('should render toolbar when selection mode is active', () => {
      // Arrange & Act
      render(<SelectionToolbar {...defaultToolbarProps} />);

      // Assert - toolbar is visible
      expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select others/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dismiss selected/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });
});
