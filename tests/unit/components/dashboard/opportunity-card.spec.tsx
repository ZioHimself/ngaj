/**
 * @vitest-environment jsdom
 */

/**
 * OpportunityCard Component Unit Tests
 *
 * Tests for the OpportunityCard component displaying opportunities
 * in the dashboard.
 *
 * @see ADR-013: Opportunity Dashboard UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OpportunityCard } from '@ngaj/frontend/components/dashboard/OpportunityCard';
import {
  dashboardOpportunityFixtures,
  dashboardResponseFixtures,
  formatFollowerCount,
} from '@tests/fixtures/dashboard-fixtures';
import type { OpportunityWithAuthor, Response } from '@ngaj/shared';

describe('OpportunityCard', () => {
  const defaultProps = {
    opportunity: dashboardOpportunityFixtures.pending,
    response: undefined as Response<string> | undefined,
    onGenerateResponse: vi.fn(),
    onDismiss: vi.fn(),
    onPost: vi.fn(),
    onEditResponse: vi.fn(),
    isGenerating: false,
    isPosting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Collapsed Pending Opportunity', () => {
    it('should display author handle', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.pending;

      // Act
      render(<OpportunityCard {...defaultProps} opportunity={opportunity} />);

      // Assert
      expect(screen.getByText(opportunity.author.handle)).toBeInTheDocument();
    });

    it('should display follower count formatted', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.pending;
      const expectedFollowers = formatFollowerCount(
        opportunity.author.followerCount
      );

      // Act
      render(<OpportunityCard {...defaultProps} opportunity={opportunity} />);

      // Assert
      expect(screen.getByText(new RegExp(expectedFollowers))).toBeInTheDocument();
    });

    it('should display score', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.pending;

      // Act
      render(<OpportunityCard {...defaultProps} opportunity={opportunity} />);

      // Assert
      expect(
        screen.getByText(opportunity.scoring.total.toString())
      ).toBeInTheDocument();
    });

    it('should display relative time', () => {
      // Arrange - use fixture with known creation time
      const opportunity = dashboardOpportunityFixtures.pending;

      // Act
      render(<OpportunityCard {...defaultProps} opportunity={opportunity} />);

      // Assert - should show some relative time format
      expect(screen.getByText(/ago|just now/i)).toBeInTheDocument();
    });

    it('should truncate long post text with ellipsis', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.longText;

      // Act
      render(<OpportunityCard {...defaultProps} opportunity={opportunity} />);

      // Assert - text should be truncated (component implementation dependent)
      const textElement = screen.getByTestId('opportunity-text');
      expect(textElement.textContent?.length).toBeLessThan(
        opportunity.content.text.length
      );
    });

    it('should show Generate Response button when no response exists', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.pending;

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          response={undefined}
        />
      );

      // Assert
      expect(
        screen.getByRole('button', { name: /generate response/i })
      ).toBeInTheDocument();
    });

    it('should show Dismiss button', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.pending;

      // Act
      render(<OpportunityCard {...defaultProps} opportunity={opportunity} />);

      // Assert
      expect(
        screen.getByRole('button', { name: /dismiss/i })
      ).toBeInTheDocument();
    });
  });

  describe('Expanded Opportunity with Draft', () => {
    it('should display full post text when expanded', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.withDraft;
      const response = dashboardResponseFixtures.draft;

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          response={response}
        />
      );

      // Assert - with draft, card should be expanded
      expect(screen.getByText(opportunity.content.text)).toBeInTheDocument();
    });

    it('should display response textarea with draft text', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.withDraft;
      const response = dashboardResponseFixtures.draft;

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          response={response}
        />
      );

      // Assert
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(response.text);
    });

    it('should show character count', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.withDraft;
      const response = dashboardResponseFixtures.draft;

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          response={response}
        />
      );

      // Assert - format: "{length}/300"
      expect(
        screen.getByText(new RegExp(`${response.text.length}/300`))
      ).toBeInTheDocument();
    });

    it('should show Regenerate, Dismiss, and Post Response buttons', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.withDraft;
      const response = dashboardResponseFixtures.draft;

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          response={response}
        />
      );

      // Assert
      expect(
        screen.getByRole('button', { name: /regenerate/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /dismiss/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /post response/i })
      ).toBeInTheDocument();
    });
  });

  describe('Posted Opportunity', () => {
    it('should display dimmed/muted visual style', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.responded;
      const response = dashboardResponseFixtures.posted;

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          response={response}
        />
      );

      // Assert - card should have dimmed class or style
      const card = screen.getByTestId('opportunity-card');
      expect(card).toHaveClass('dimmed');
    });

    it('should show Posted badge or checkmark', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.responded;
      const response = dashboardResponseFixtures.posted;

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          response={response}
        />
      );

      // Assert
      expect(screen.getByText(/posted/i)).toBeInTheDocument();
    });

    it('should show link to platform post', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.responded;
      const response = dashboardResponseFixtures.posted;

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          response={response}
        />
      );

      // Assert
      const link = screen.getByRole('link', { name: /view on bluesky/i });
      expect(link).toHaveAttribute('href', response.platformPostUrl);
    });

    it('should not show edit actions', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.responded;
      const response = dashboardResponseFixtures.posted;

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          response={response}
        />
      );

      // Assert - no Generate, Regenerate, or Post buttons
      expect(
        screen.queryByRole('button', { name: /generate response/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /post response/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onGenerateResponse when Generate button clicked', async () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.pending;
      const onGenerateResponse = vi.fn();

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          onGenerateResponse={onGenerateResponse}
        />
      );

      fireEvent.click(
        screen.getByRole('button', { name: /generate response/i })
      );

      // Assert
      expect(onGenerateResponse).toHaveBeenCalledOnce();
      expect(onGenerateResponse).toHaveBeenCalledWith(opportunity._id);
    });

    it('should call onDismiss when Dismiss button clicked', async () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.pending;
      const onDismiss = vi.fn();

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          onDismiss={onDismiss}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

      // Assert
      expect(onDismiss).toHaveBeenCalledOnce();
      expect(onDismiss).toHaveBeenCalledWith(opportunity._id);
    });

    it('should disable Generate button while generating', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.pending;

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          isGenerating={true}
        />
      );

      // Assert
      expect(
        screen.getByRole('button', { name: /generate|generating/i })
      ).toBeDisabled();
    });

    it('should show loading indicator while generating', () => {
      // Arrange
      const opportunity = dashboardOpportunityFixtures.pending;

      // Act
      render(
        <OpportunityCard
          {...defaultProps}
          opportunity={opportunity}
          isGenerating={true}
        />
      );

      // Assert
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });
  });
});
