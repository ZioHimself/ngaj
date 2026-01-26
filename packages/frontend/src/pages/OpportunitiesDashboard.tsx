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

  // Get empty state content based on filter
  const getEmptyStateContent = () => {
    switch (state.filter) {
      case 'pending':
        return {
          title: 'No pending opportunities',
          description: 'New engagement opportunities from your Bluesky feed will appear here. They are discovered automatically based on your profile interests.',
          icon: (
            <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          ),
        };
      case 'draft':
        return {
          title: 'No drafts ready',
          description: 'Generate responses for pending opportunities and they will appear here for your review before posting.',
          icon: (
            <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          ),
        };
      case 'responded':
        return {
          title: 'No posted responses',
          description: 'Responses you post to Bluesky will be tracked here so you can see your engagement history.',
          icon: (
            <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case 'dismissed':
        return {
          title: 'No dismissed opportunities',
          description: 'Opportunities you dismiss will be listed here. You can revisit them later if needed.',
          icon: (
            <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ),
        };
      default:
        return {
          title: 'No opportunities found',
          description: 'Your feed is empty. Opportunities matching your profile interests will appear here as they are discovered.',
          icon: (
            <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121.75 7.5v6m-17.5 0v4.5a2.25 2.25 0 002.25 2.25h13.5a2.25 2.25 0 002.25-2.25v-4.5" />
            </svg>
          ),
        };
    }
  };

  // Error state
  if (state.error && opportunities.length === 0) {
    return (
      <div className="space-y-6">
        <FilterBar
          currentFilter={state.filter}
          onFilterChange={handleFilterChange}
          isLoading={state.isLoading}
        />
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</h3>
          <p className="text-slate-500 text-center max-w-sm mb-6">{state.error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!state.isLoading && opportunities.length === 0 && !state.error) {
    const emptyContent = getEmptyStateContent();
    return (
      <div className="space-y-6">
        <FilterBar
          currentFilter={state.filter}
          onFilterChange={handleFilterChange}
          isLoading={state.isLoading}
        />
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="mb-6">
            {emptyContent.icon}
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">{emptyContent.title}</h3>
          <p className="text-slate-500 text-center max-w-sm mb-6">{emptyContent.description}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        currentFilter={state.filter}
        onFilterChange={handleFilterChange}
        isLoading={state.isLoading}
      />

      {state.error && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
          <button
            type="button"
            onClick={() => setState((prev) => ({ ...prev, error: null }))}
            className="shrink-0 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="divide-y divide-slate-200">
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
