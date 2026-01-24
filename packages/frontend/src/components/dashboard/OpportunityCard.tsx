/**
 * OpportunityCard Component
 *
 * Displays a single opportunity with actions.
 *
 * @see ADR-013: Opportunity Dashboard UI
 */

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
  const isExpanded = hasDraft || hasPostedResponse || isGenerating;

  // Determine text to display
  const displayText = isExpanded
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
    <div
      data-testid="opportunity-card"
      className={`opportunity-card ${isPosted ? 'dimmed' : ''}`}
    >
      {/* Header: Author info and score */}
      <div className="card-header">
        <div className="author-info">
          <span className="author-handle">{author.handle}</span>
          <span className="follower-count">
            {formatFollowerCount(author.followerCount)} followers
          </span>
        </div>
        <div className="meta-info">
          <span className="score">{scoring.total}</span>
          <span className="time">
            {formatRelativeTime(new Date(content.createdAt))}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="card-content">
        <p data-testid="opportunity-text">{displayText}</p>
      </div>

      {/* Posted badge and link */}
      {hasPostedResponse && (
        <div className="posted-status">
          <span className="posted-badge">Posted</span>
          {response.platformPostUrl && (
            <a
              href={response.platformPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="platform-link"
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
        <div className="card-actions">
          <button
            type="button"
            onClick={() => onGenerateResponse(opportunity._id)}
            disabled={isGenerating}
            className="generate-btn"
          >
            {isGenerating ? 'Generating...' : 'Generate Response'}
          </button>
          <button
            type="button"
            onClick={() => onDismiss(opportunity._id)}
            className="dismiss-btn"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Actions for draft (Dismiss only - other actions in ResponseEditor) */}
      {hasDraft && !hasPostedResponse && (
        <div className="card-actions draft-actions">
          <button
            type="button"
            onClick={() => onDismiss(opportunity._id)}
            className="dismiss-btn"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
