/**
 * ResponseModal Component - Stub
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

/**
 * ResponseModal component stub - implementation required
 */
export function ResponseModal(_props: ResponseModalProps): JSX.Element | null {
  throw new Error('Not implemented');
}
