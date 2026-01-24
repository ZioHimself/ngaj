/**
 * OpportunityCard Component (Stub)
 *
 * Displays a single opportunity with actions.
 *
 * @see ADR-013: Opportunity Dashboard UI
 */

import type { OpportunityWithAuthor, Response } from '@ngaj/shared';

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

export function OpportunityCard(_props: OpportunityCardProps): JSX.Element {
  // TODO: Implement component - Test-Writer stub only
  throw new Error('OpportunityCard not implemented');
}
