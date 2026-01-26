/**
 * OpportunityCard Component
 *
 * Displays a single opportunity with actions.
 * Mobile-first responsive design with touch-friendly buttons.
 *
 * @see ADR-013: Opportunity Dashboard UI
 * @see ADR-015: Mobile-First Responsive Web Design
 */

import { useState } from 'react';
import type { OpportunityWithAuthor, Response } from '@ngaj/shared';
import { ResponseEditor } from './ResponseEditor';

export interface OpportunityCardProps {
  opportunity: OpportunityWithAuthor<string>;
  response?: Response<string>;
  onGenerateResponse: (opportunityId: string) => void;
  onDismiss: (opportunityId: string) => void;
  onPost: (responseId: string) => void;
  onEditResponse: (responseId: string, text: string) => void;
  isGenerating: boolean;
  isPosting: boolean;
}

/** Maximum character length for truncated text preview */
const MAX_PREVIEW_LENGTH = 100;
/** Maximum response length (Bluesky limit) */
const MAX_RESPONSE_LENGTH = 300;

/**
 * Format follower count with K/M suffixes
 */
function formatFollowerCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toString();
}

/**
 * Format date as relative time string
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function OpportunityCard({
  opportunity,
  response,
  onGenerateResponse,
  onDismiss,
  onPost,
  onEditResponse,
  isGenerating,
  isPosting,
}: OpportunityCardProps): JSX.Element {
  const { author, content, scoring, status } = opportunity;
  const isPosted = status === 'responded';
  const hasDraft = response && response.status === 'draft';
  const hasPostedResponse = response && response.status === 'posted';
  
  // Text expansion state - auto-expand when has draft/response/generating
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const shouldShowFullText = isTextExpanded || hasDraft || hasPostedResponse || isGenerating;
  const canToggleExpand = content.text.length > MAX_PREVIEW_LENGTH;

  // Determine text to display
  const displayText = shouldShowFullText
    ? content.text
    : truncateText(content.text, MAX_PREVIEW_LENGTH);

  // Handle response text change
  const handleTextChange = (newText: string) => {
    if (response) {
      onEditResponse(response._id, newText);
    }
  };

  // Handle regenerate (triggers new generation)
  const handleRegenerate = () => {
    onGenerateResponse(opportunity._id);
  };

  // Handle post
  const handlePost = () => {
    if (response) {
      onPost(response._id);
    }
  };

  return (
    <article
      data-testid="opportunity-card"
      className={`bg-white border border-slate-200 rounded-xl p-4 sm:p-6 ${isPosted ? 'dimmed opacity-60' : ''}`}
    >
      {/* Header: Author info and score */}
      <header
        data-testid="card-header"
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 mb-3"
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-900 truncate">
            {author.handle}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500">
            {formatFollowerCount(author.followerCount)} followers
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{scoring.total}</span>
          <span className="text-slate-400">•</span>
          <span>{formatRelativeTime(new Date(content.createdAt))}</span>
        </div>
      </header>

      {/* Content */}
      <div className="mb-4">
        {canToggleExpand ? (
          <button
            type="button"
            onClick={() => setIsTextExpanded(!isTextExpanded)}
            className="w-full text-left group"
          >
            <p data-testid="opportunity-text" className="text-slate-700 leading-relaxed">
              {displayText}
            </p>
            <span className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-500 group-hover:text-blue-600">
              {shouldShowFullText ? (
                <>
                  Show less
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  Show more
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </span>
          </button>
        ) : (
          <p data-testid="opportunity-text" className="text-slate-700 leading-relaxed">
            {displayText}
          </p>
        )}
      </div>

      {/* Posted badge and link */}
      {hasPostedResponse && (
        <div className="posted-status flex items-center gap-3 mb-4">
          <span className="posted-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Posted
          </span>
          {response.platformPostUrl && (
            <a
              href={response.platformPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="platform-link text-sm text-blue-500 hover:text-blue-600"
            >
              View on Bluesky
            </a>
          )}
        </div>
      )}

      {/* Response Editor (when generating or has draft) */}
      {(isGenerating || hasDraft) && !hasPostedResponse && (
        <ResponseEditor
          text={response?.text ?? ''}
          onChange={handleTextChange}
          onPost={handlePost}
          onRegenerate={handleRegenerate}
          isGenerating={isGenerating}
          isPosting={isPosting}
          maxLength={MAX_RESPONSE_LENGTH}
        />
      )}

      {/* Actions (when pending with no response) */}
      {!hasPostedResponse && !hasDraft && !isGenerating && (
        <div
          data-testid="card-actions"
          className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 sm:justify-end"
        >
          <button
            type="button"
            onClick={() => onGenerateResponse(opportunity._id)}
            disabled={isGenerating}
            className="generate-btn px-5 py-2.5 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate Response'}
          </button>
          <button
            type="button"
            onClick={() => onDismiss(opportunity._id)}
            className="dismiss-btn px-5 py-2.5 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Actions for draft (Dismiss only - other actions in ResponseEditor) */}
      {hasDraft && !hasPostedResponse && (
        <div
          data-testid="card-actions"
          className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 sm:justify-end"
        >
          <button
            type="button"
            onClick={() => onDismiss(opportunity._id)}
            className="dismiss-btn px-5 py-2.5 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </article>
  );
}
