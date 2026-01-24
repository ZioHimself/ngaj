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
      <div className="response-editor generating">
        <div data-testid="loading-spinner" className="spinner" />
        <p>Generating response...</p>
        <div className="actions">
          <button type="button" disabled>
            Regenerate
          </button>
          <button type="button" disabled>
            Post Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="response-editor">
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPosting}
        placeholder="Edit your response..."
        rows={4}
      />

      <div className="editor-footer">
        <span
          data-testid="character-count"
          className={`character-count ${getCharCountClass()}`}
        >
          {charCount}/{maxLength}
        </span>

        <div className="actions">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isPosting}
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={onPost}
            disabled={isPosting}
            className="primary"
          >
            {isPosting ? 'Posting...' : 'Post Response'}
          </button>
        </div>
      </div>
    </div>
  );
}
