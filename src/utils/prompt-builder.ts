import type { Profile } from '@/shared/types/profile';
import type { PlatformConstraints } from '@/shared/types/response';

/**
 * KB chunk structure from ChromaDB search results
 */
export interface KBChunk {
  id: string;
  text: string;
  distance: number;
  metadata: {
    documentId: string;
    chunkIndex: number;
    filename: string;
  };
}

/**
 * Build Stage 1 analysis prompt with boundary marker protection.
 * 
 * CRITICAL: Implements prompt injection prevention using boundary markers.
 * Only the FIRST occurrence of the boundary marker is processed by the system.
 * Any subsequent occurrences in user text are treated as literal text.
 * 
 * @param opportunityText - The social media post text to analyze
 * @returns Prompt string for Claude API (Stage 1)
 * 
 * @see ADR-009: Response Suggestion Architecture
 */
export function buildAnalysisPrompt(opportunityText: string): string {
  throw new Error('Not implemented');
}

/**
 * Build Stage 2 generation prompt with all context and boundary marker protection.
 * 
 * CRITICAL: Implements prompt injection prevention.
 * - System instructions (principles, voice, KB) are placed BEFORE boundary marker
 * - User input (opportunity text) is placed AFTER boundary marker
 * - Only the FIRST boundary marker is processed; any in user text are literal
 * 
 * @param profile - User profile with principles and voice
 * @param kbChunks - Relevant knowledge base chunks (0-3)
 * @param constraints - Platform-specific constraints (e.g., maxLength)
 * @param opportunityText - The social media post text to respond to
 * @returns Prompt string for Claude API (Stage 2)
 * 
 * @see ADR-009: Response Suggestion Architecture
 */
export function buildGenerationPrompt(
  profile: Profile,
  kbChunks: KBChunk[],
  constraints: PlatformConstraints,
  opportunityText: string
): string {
  throw new Error('Not implemented');
}

