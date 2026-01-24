/**
 * OpportunitiesDashboard Page
 *
 * Main dashboard page for viewing and managing opportunities.
 * Mobile-first responsive design with LoadMore pagination.
 *
 * @see ADR-013: Opportunity Dashboard UI
 * @see ADR-015: Mobile-First Responsive Web Design
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  OpportunityWithAuthor,
  PaginatedOpportunities,
  Response,
} from '@ngaj/shared';
import {
  FilterBar,
  LoadMore,
  OpportunityCard,
  type DashboardFilterValue,
} from '../components/dashboard';

export interface OpportunitiesDashboardProps {
  accountId: string;
}

/** Page size for opportunities */
const PAGE_SIZE = 20;

interface DashboardState {
  opportunities: OpportunityWithAuthor<string>[];
  responses: Map<string, Response<string>>;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  filter: DashboardFilterValue;
  generatingIds: Set<string>;
  postingIds: Set<string>;
  editedResponses: Map<string, string>;
}

export function OpportunitiesDashboard({
  accountId: _accountId,
}: OpportunitiesDashboardProps): JSX.Element {
  const [state, setState] = useState<DashboardState>({
    opportunities: [],
    responses: new Map(),
    total: 0,
    hasMore: false,
    isLoading: true,
    isLoadingMore: false,
    error: null,
    filter: 'pending',
    generatingIds: new Set(),
    postingIds: new Set(),
    editedResponses: new Map(),
  });

  /**
   * Fetch opportunities from API (initial load or filter change)
   */
  const fetchOpportunities = useCallback(
    async (filter: DashboardFilterValue, append: boolean = false) => {
      // Set appropriate loading state
      if (append) {
        setState((prev) => ({ ...prev, isLoadingMore: true, error: null }));
      } else {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      const offset = append ? state.opportunities.length : 0;
      // 'draft' filter is handled client-side after fetch; for API, treat as 'pending'
      // 'all' means no status filter
      const statusParam = filter === 'all' ? '' : filter === 'draft' ? 'pending' : filter;
      const url = `/api/opportunities?status=${statusParam}&limit=${PAGE_SIZE}&offset=${offset}&sort=-score`;

      try {
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) {
          throw new Error('Failed to fetch opportunities');
        }
        const data: PaginatedOpportunities = await res.json();
        const newOpportunities = data.opportunities || [];

        setState((prev) => ({
          ...prev,
          opportunities: append
            ? [...prev.opportunities, ...newOpportunities]
            : newOpportunities,
          total: data.total || 0,
          hasMore: data.hasMore || false,
          isLoading: false,
          isLoadingMore: false,
        }));

        // Fetch responses for these opportunities
        if (newOpportunities.length > 0) {
          await fetchResponses(newOpportunities.map((o) => o._id));
        }
      } catch {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isLoadingMore: false,
          error: 'Failed to load opportunities. Please try again.',
        }));
      }
    },
    [state.opportunities.length]
  );

  /**
   * Fetch responses for opportunity IDs
   */
  const fetchResponses = async (opportunityIds: string[]) => {
    const url = `/api/responses?opportunityIds=${opportunityIds.join(',')}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) return;

      const data: { responses: Response<string>[] } = await res.json();
      const responsesMap = new Map<string, Response<string>>();
      data.responses.forEach((r) => {
        responsesMap.set(r.opportunityId, r);
      });

      setState((prev) => ({
        ...prev,
        responses: responsesMap,
      }));
    } catch {
      // Silent fail - responses are optional
    }
  };

  /**
   * Generate response for an opportunity
   */
  const handleGenerateResponse = async (opportunityId: string) => {
    setState((prev) => ({
      ...prev,
      generatingIds: new Set([...prev.generatingIds, opportunityId]),
    }));

    try {
      const res = await fetch('/api/responses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId, mode: 'quick' }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Service temporarily unavailable. Please try again.');
      }

      const newResponse: Response<string> = await res.json();
      setState((prev) => {
        const newResponses = new Map(prev.responses);
        newResponses.set(opportunityId, newResponse);
        return {
          ...prev,
          responses: newResponses,
          generatingIds: new Set(
            [...prev.generatingIds].filter((id) => id !== opportunityId)
          ),
        };
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        generatingIds: new Set(
          [...prev.generatingIds].filter((id) => id !== opportunityId)
        ),
        error: error instanceof Error ? error.message : 'Service temporarily unavailable. Please try again.',
      }));
    }
  };

  /**
   * Dismiss an opportunity
   */
  const handleDismiss = async (opportunityId: string) => {
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });

      if (!res.ok) {
        throw new Error('Failed to dismiss opportunity');
      }

      // Remove from list if on pending filter
      if (state.filter === 'pending' || state.filter === 'all') {
        setState((prev) => ({
          ...prev,
          opportunities: prev.opportunities.filter(
            (o) => o._id !== opportunityId
          ),
          total: Math.max(0, prev.total - 1),
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        error: 'Failed to dismiss opportunity',
      }));
    }
  };

  /**
   * Post a response
   */
  const handlePost = async (responseId: string) => {
    const response = [...state.responses.values()].find(
      (r) => r._id === responseId
    );
    if (!response) return;

    setState((prev) => ({
      ...prev,
      postingIds: new Set([...prev.postingIds, responseId]),
    }));

    try {
      // Check if response has been edited
      const editedText = state.editedResponses.get(responseId);
      if (editedText && editedText !== response.text) {
        // PATCH the response text first
        await fetch(`/api/responses/${responseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: editedText }),
        });
      }

      // POST to platform
      const res = await fetch(`/api/responses/${responseId}/post`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Bluesky unavailable. Try again later.');
      }

      const postedResponse: Response<string> = await res.json();

      // Update response and opportunity in state
      setState((prev) => {
        const newResponses = new Map(prev.responses);
        newResponses.set(postedResponse.opportunityId, postedResponse);

        const newOpportunities = prev.opportunities.map((o) =>
          o._id === postedResponse.opportunityId
            ? { ...o, status: 'responded' as const }
            : o
        );

        return {
          ...prev,
          responses: newResponses,
          opportunities: newOpportunities,
          postingIds: new Set(
            [...prev.postingIds].filter((id) => id !== responseId)
          ),
        };
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        postingIds: new Set(
          [...prev.postingIds].filter((id) => id !== responseId)
        ),
        error: error instanceof Error ? error.message : 'Bluesky unavailable. Try again later.',
      }));
    }
  };

  /**
   * Edit response text (locally - not saved until post)
   */
  const handleEditResponse = (responseId: string, text: string) => {
    setState((prev) => {
      const newEdited = new Map(prev.editedResponses);
      newEdited.set(responseId, text);

      // Also update the response in state for display
      const response = [...prev.responses.values()].find(
        (r) => r._id === responseId
      );
      if (response) {
        const newResponses = new Map(prev.responses);
        newResponses.set(response.opportunityId, { ...response, text });
        return { ...prev, responses: newResponses, editedResponses: newEdited };
      }
      return { ...prev, editedResponses: newEdited };
    });
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (filter: DashboardFilterValue) => {
    setState((prev) => ({
      ...prev,
      filter,
      opportunities: [], // Reset opportunities on filter change
    }));
    fetchOpportunities(filter, false);
  };

  /**
   * Handle load more
   */
  const handleLoadMore = () => {
    fetchOpportunities(state.filter, true);
  };

  /**
   * Retry loading
   */
  const handleRetry = () => {
    fetchOpportunities(state.filter, false);
  };

  // Initial load - only run once on mount
  useEffect(() => {
    fetchOpportunities(state.filter, false);
  }, []);

  // Find response for an opportunity
  const getResponseForOpportunity = (
    opportunityId: string
  ): Response<string> | undefined => {
    return state.responses.get(opportunityId);
  };

  // Ensure opportunities is always an array
  const opportunities = state.opportunities || [];

  // Error state
  if (state.error && opportunities.length === 0) {
    return (
      <div className="dashboard dashboard-error">
        <p>{state.error}</p>
        <button type="button" onClick={handleRetry}>
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (!state.isLoading && opportunities.length === 0 && !state.error) {
    return (
      <div className="dashboard dashboard-empty">
        <FilterBar
          currentFilter={state.filter}
          onFilterChange={handleFilterChange}
          isLoading={state.isLoading}
        />
        <p>No opportunities found.</p>
        <button type="button" onClick={handleRetry}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <FilterBar
        currentFilter={state.filter}
        onFilterChange={handleFilterChange}
        isLoading={state.isLoading}
      />

      {state.error && (
        <div className="error-banner">
          <p>{state.error}</p>
          <button type="button" onClick={() => setState((prev) => ({ ...prev, error: null }))}>
            Dismiss
          </button>
        </div>
      )}

      <div className="opportunities-list">
        {opportunities.map((opportunity) => {
          const response = getResponseForOpportunity(opportunity._id);
          return (
            <OpportunityCard
              key={opportunity._id}
              opportunity={opportunity}
              response={response}
              onGenerateResponse={handleGenerateResponse}
              onDismiss={handleDismiss}
              onPost={handlePost}
              onEditResponse={handleEditResponse}
              isGenerating={state.generatingIds.has(opportunity._id)}
              isPosting={
                response ? state.postingIds.has(response._id) : false
              }
            />
          );
        })}
      </div>

      <LoadMore
        hasMore={state.hasMore}
        isLoading={state.isLoadingMore}
        onLoadMore={handleLoadMore}
        loadedCount={opportunities.length}
        totalCount={state.total}
      />
    </div>
  );
}
