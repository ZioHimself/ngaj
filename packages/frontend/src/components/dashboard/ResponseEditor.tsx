/**
 * ResponseEditor Component
 *
 * Textarea for editing AI-generated responses.
 *
 * @see ADR-013: Opportunity Dashboard UI
 */

export interface ResponseEditorProps {
  text: string;
  onChange: (text: string) => void;
  onPost: () => void;
  onRegenerate: () => void;
  isGenerating: boolean;
  isPosting: boolean;
  maxLength: number;
}

/** Threshold for warning style (characters remaining) */
const WARNING_THRESHOLD = 20;

export function ResponseEditor({
  text,
  onChange,
  onPost,
  onRegenerate,
  isGenerating,
  isPosting,
  maxLength,
}: ResponseEditorProps): JSX.Element {
  const charCount = text.length;
  const isNearLimit = charCount > maxLength - WARNING_THRESHOLD;
  const isOverLimit = charCount > maxLength;

  // Determine character count styling
  const getCharCountClass = (): string => {
    if (isOverLimit) return 'error';
    if (isNearLimit) return 'warning';
    return '';
  };

  // Show generating state
  if (isGenerating) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 py-4">
          <div data-testid="loading-spinner" className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600">Generating response...</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            disabled
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
          >
            Regenerate
          </button>
          <button
            type="button"
            disabled
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-300 text-white cursor-not-allowed"
          >
            Post Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPosting}
        placeholder="Edit your response..."
        rows={4}
        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
      />

      <div className="flex items-center justify-between">
        <span
          data-testid="character-count"
          className={`text-sm ${
            isOverLimit
              ? 'text-red-500 font-medium'
              : isNearLimit
              ? 'text-amber-500'
              : 'text-slate-400'
          }`}
        >
          {charCount}/{maxLength}
        </span>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isPosting}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={onPost}
            disabled={isPosting || isOverLimit}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPosting ? 'Posting...' : 'Post Response'}
          </button>
        </div>
      </div>
    </div>
  );
}
