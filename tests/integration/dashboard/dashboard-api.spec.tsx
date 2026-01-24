/**
 * @vitest-environment jsdom
 */

/**
 * Dashboard API Integration Tests
 *
 * Tests for API calls from the Opportunity Dashboard.
 * Uses mocked fetch to simulate backend responses.
 *
 * @see ADR-013: Opportunity Dashboard UI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpportunitiesDashboard } from '@ngaj/frontend/pages/OpportunitiesDashboard';
import {
  mockApiResponses,
  mockApiErrors,
  dashboardOpportunityFixtures,
  dashboardResponseFixtures,
} from '@tests/fixtures/dashboard-fixtures';

// Create a fresh mock for each test to avoid parallel test interference
let mockFetch: ReturnType<typeof vi.fn>;

describe('Dashboard API Integration', () => {
  beforeEach(() => {
    // Create fresh mock before each test
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Load Opportunities', () => {
    it('should fetch opportunities on mount with correct parameters', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.opportunitiesList,
      });

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/opportunities'),
          expect.objectContaining({
            method: 'GET',
          })
        );
      });

      // Verify query params
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('status=pending');
      expect(calledUrl).toContain('limit=20');
      expect(calledUrl).toContain('offset=0');
      expect(calledUrl).toContain('sort=-score');
    });

    it('should render opportunities after fetch completes', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.opportunitiesList,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responses: [] }),
        });

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      // Assert - wait for opportunities to render
      await waitFor(() => {
        expect(
          screen.getByText(
            dashboardOpportunityFixtures.highScore.content.text.slice(0, 50)
          )
        ).toBeInTheDocument();
      });
    });

    it('should handle network error gracefully', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(mockApiErrors.networkError);

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      // Assert - error message should be shown
      await waitFor(() => {
        expect(screen.getByText(/error|failed|try again/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(mockApiErrors.networkError);

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /retry|try again/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Batch Load Responses', () => {
    it('should fetch responses after opportunities load', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.opportunitiesList,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.responsesBatch,
        });

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      // Assert - second call should be for responses
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      const responsesUrl = mockFetch.mock.calls[1][0] as string;
      expect(responsesUrl).toContain('/api/responses');
      expect(responsesUrl).toContain('opportunityIds=');
    });

    it('should map responses to opportunities correctly', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.withDraft],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responses: [dashboardResponseFixtures.draft],
          }),
        });

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      // Assert - draft text should be shown
      await waitFor(() => {
        expect(
          screen.getByText(dashboardResponseFixtures.draft.text)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Generate Response', () => {
    it('should POST to generate endpoint when Generate clicked', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.pending],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responses: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.generateSuccess,
        });

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /generate response/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole('button', { name: /generate response/i })
      );

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/responses/generate'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('opportunityId'),
          })
        );
      });
    });

    it('should show loading state during generation', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.pending],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responses: [] }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => mockApiResponses.generateSuccess,
                  }),
                100
              )
            )
        );

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /generate response/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole('button', { name: /generate response/i })
      );

      // Assert - loading indicator should appear
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    it('should display draft after generation succeeds', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.pending],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responses: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.generateSuccess,
        });

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /generate response/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole('button', { name: /generate response/i })
      );

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText(mockApiResponses.generateSuccess.text)
        ).toBeInTheDocument();
      });
    });

    it('should handle 503 error with retry option', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.pending],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responses: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => mockApiErrors.serviceUnavailable,
        });

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /generate response/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole('button', { name: /generate response/i })
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/unavailable|try again/i)).toBeInTheDocument();
      });
    });
  });

  describe('Post Response', () => {
    it('should PATCH then POST when Post Response clicked', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.withDraft],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responses: [dashboardResponseFixtures.draft],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => dashboardResponseFixtures.draft,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.postSuccess,
        });

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /post response/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /post response/i }));

      // Assert - POST to /responses/:id/post should be called
      await waitFor(() => {
        const postCalls = mockFetch.mock.calls.filter((call) =>
          (call[0] as string).includes('/post')
        );
        expect(postCalls.length).toBeGreaterThan(0);
      });
    });

    it('should update opportunity status to responded after post', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.withDraft],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responses: [dashboardResponseFixtures.draft],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.postSuccess,
        });

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /post response/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /post response/i }));

      // Assert - should show posted badge (use class selector to distinguish from filter button)
      await waitFor(() => {
        const postedBadge = document.querySelector('.posted-badge');
        expect(postedBadge).toBeInTheDocument();
        expect(postedBadge).toHaveTextContent('Posted');
      });
    });

    it('should show platform post link after successful post', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.withDraft],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responses: [dashboardResponseFixtures.draft],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.postSuccess,
        });

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /post response/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /post response/i }));

      // Assert
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /view on bluesky/i });
        expect(link).toHaveAttribute(
          'href',
          mockApiResponses.postSuccess.platformPostUrl
        );
      });
    });

    it('should preserve draft on post failure', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.withDraft],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responses: [dashboardResponseFixtures.draft],
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => mockApiErrors.serviceUnavailable,
        });

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /post response/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /post response/i }));

      // Assert - draft text should still be visible
      await waitFor(() => {
        expect(screen.getByText(/unavailable|error/i)).toBeInTheDocument();
      });
      expect(
        screen.getByDisplayValue(dashboardResponseFixtures.draft.text)
      ).toBeInTheDocument();
    });
  });

  describe('Dismiss Opportunity', () => {
    it('should PATCH to dismiss endpoint when Dismiss clicked', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.pending],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responses: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...dashboardOpportunityFixtures.pending,
            status: 'dismissed',
          }),
        });

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      // Wait for opportunity card to render, then find dismiss button by class
      await waitFor(() => {
        expect(screen.getByTestId('opportunity-card')).toBeInTheDocument();
      });

      // Click the dismiss button (has class dismiss-btn, not the filter button "Dismissed")
      const dismissBtn = document.querySelector('.dismiss-btn') as HTMLButtonElement;
      expect(dismissBtn).toBeInTheDocument();
      await user.click(dismissBtn);

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/opportunities/'),
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('dismissed'),
          })
        );
      });
    });

    it('should remove opportunity from list after dismiss', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.pending],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responses: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...dashboardOpportunityFixtures.pending,
            status: 'dismissed',
          }),
        });

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      // Wait for opportunity text to appear (full text since it's < 100 chars)
      await waitFor(() => {
        expect(
          screen.getByText(dashboardOpportunityFixtures.pending.content.text)
        ).toBeInTheDocument();
      });

      // Click the dismiss button using class selector
      const dismissBtn = document.querySelector('.dismiss-btn') as HTMLButtonElement;
      await user.click(dismissBtn);

      // Assert - opportunity should be removed (pending filter)
      await waitFor(() => {
        expect(
          screen.queryByText(dashboardOpportunityFixtures.pending.content.text)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no opportunities', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.emptyOpportunities,
      });

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/no opportunities/i)).toBeInTheDocument();
      });
    });

    it('should show refresh action in empty state', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.emptyOpportunities,
      });

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /refresh/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should update offset when page changes', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.opportunitiesPage1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responses: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.opportunitiesPage2,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responses: [] }),
        });

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      await waitFor(() => {
        expect(screen.getByText(/page 1/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /next/i }));

      // Assert
      await waitFor(() => {
        const pageTwoCalls = mockFetch.mock.calls.filter((call) =>
          (call[0] as string).includes('offset=20')
        );
        expect(pageTwoCalls.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Filter Change', () => {
    it('should refetch with new status when filter changes', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.opportunitiesList,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ responses: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockApiResponses.opportunitiesList,
            opportunities: [dashboardOpportunityFixtures.responded],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responses: [dashboardResponseFixtures.posted],
          }),
        });

      const user = userEvent.setup();

      // Act
      render(<OpportunitiesDashboard accountId="acc-1" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /posted/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /posted/i }));

      // Assert
      await waitFor(() => {
        const postedCalls = mockFetch.mock.calls.filter((call) =>
          (call[0] as string).includes('status=responded')
        );
        expect(postedCalls.length).toBeGreaterThan(0);
      });
    });
  });
});
