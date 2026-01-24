/**
 * ResponseEditor Component (Stub)
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

export function ResponseEditor(_props: ResponseEditorProps): JSX.Element {
  // TODO: Implement component - Test-Writer stub only
  throw new Error('ResponseEditor not implemented');
}
