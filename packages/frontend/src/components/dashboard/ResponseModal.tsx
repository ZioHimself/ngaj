/**
 * ResponseModal Component
 *
 * Full-screen modal for editing responses on mobile,
 * centered modal with backdrop on desktop.
 *
 * @see ADR-015: Mobile-First Responsive Web Design
 */

import type { OpportunityWithAuthor, Response } from '@ngaj/shared';

export interface ResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityWithAuthor<string>;
  response: Response<string>;
  onPost: () => void;
  onRegenerate: () => void;
  onTextChange: (text: string) => void;
  isPosting: boolean;
  isRegenerating: boolean;
}

/** Maximum response length (Bluesky limit) */
const MAX_RESPONSE_LENGTH = 300;

/**
 * ResponseModal component for editing AI-generated responses.
 * Full-screen on mobile, centered dialog on desktop.
 */
export function ResponseModal({
  isOpen,
  onClose,
  opportunity,
  response,
  onPost,
  onRegenerate,
  onTextChange,
  isPosting,
  isRegenerating,
}: ResponseModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  const charCount = response.text.length;
  const isDisabled = isPosting || isRegenerating;
  const canPost = charCount > 0 && !isDisabled;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50">
      {/* Backdrop (visible on desktop) */}
      <div
        data-testid="modal-backdrop"
        className="hidden sm:block fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        data-testid="response-modal-content"
        className="
          fixed inset-0 sm:inset-auto
          sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:max-w-lg sm:w-full sm:max-h-[90vh]
          bg-white sm:rounded-xl
          flex flex-col
        "
      >
        {/* Header */}
        <header
          data-testid="modal-header"
          className="
            flex items-center justify-between
            px-4 py-3
            border-b border-slate-200
            shrink-0
          "
        >
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 text-slate-600 h-10 px-2 -ml-2"
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            <span className="sm:hidden">Back</span>
          </button>
          <h2 className="font-semibold text-slate-900">Edit Reply</h2>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Original post preview */}
          <details className="mb-4">
            <summary className="text-sm text-slate-500 cursor-pointer">
              Replying to @{opportunity.author.handle}
            </summary>
            <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              {opportunity.content.text}
            </p>
          </details>

          {/* Response textarea */}
          <textarea
            value={response.text}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={isDisabled}
            className="
              w-full min-h-[200px] p-4
              border-2 border-slate-200 rounded-lg
              focus:border-blue-500 focus:outline-none
              resize-none
              text-base leading-relaxed
              disabled:bg-slate-100
            "
            placeholder="Write your response..."
            maxLength={MAX_RESPONSE_LENGTH}
          />
          <div className="text-right text-sm text-slate-500 mt-1">
            {charCount}/{MAX_RESPONSE_LENGTH}
          </div>
        </div>

        {/* Footer actions */}
        <footer
          data-testid="modal-footer"
          className="
            flex gap-3 p-4
            border-t border-slate-200
            shrink-0
          "
        >
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isDisabled}
            className="btn btn-secondary h-12 flex-1"
          >
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
          <button
            type="button"
            onClick={onPost}
            disabled={!canPost}
            className="btn btn-primary h-12 flex-1"
          >
            {isPosting ? 'Posting...' : 'Post Now'}
          </button>
        </footer>
      </div>
    </div>
  );
}
