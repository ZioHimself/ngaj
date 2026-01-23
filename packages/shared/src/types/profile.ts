/**
 * Profile Type Definitions
 * 
 * @module types/profile
 */

import { EntityId, IdValidator, isStringId, isValidDate, isPlainObject } from './core.js';

/**
 * Profile represents a cross-platform persona with consistent voice,
 * discovery preferences, and knowledge base.
 * 
 * Relationship: 1 Profile → Many Accounts
 * 
 * @typeParam TId - ID type (defaults to string for frontend, use ObjectId for backend)
 * @see ADR-006: Profile and Account Separation
 */
export interface Profile<TId = string> {
  /** Document ID */
  _id: EntityId<TId>;
  
  /** Human-readable name (e.g., "Professional Tech Persona") */
  name: string;
  
  /**
   * Core principles and values that shape all AI-generated responses.
   * Freeform text describing user's beliefs, values, communication ethics.
   * 
   * Example: "I value transparency, evidence-based reasoning, and kindness.
   *           I avoid snark and tribal language. I aim to bridge divides."
   * 
   * Always included in response generation prompts (not semantically searched).
   * 
   * @see ADR-009: Response Suggestion Architecture
   */
  principles?: string;
  
  /** Voice configuration for AI-generated responses */
  voice: VoiceConfig;
  
  /** Discovery preferences for finding relevant opportunities */
  discovery: DiscoveryConfig;
  
  /** When this profile was created */
  createdAt: Date;
  
  /** When this profile was last modified */
  updatedAt: Date;
  
  /** Whether this profile is currently active */
  isActive: boolean;
}

/**
 * Voice configuration defines how the AI should respond in this profile's style.
 * 
 * For Response Suggestion (ADR-009):
 * - `style` field is used as the "Voice & Style" section in generation prompts
 * - `tone` provides additional context
 * - `examples` can be referenced in future versions for style learning
 */
export interface VoiceConfig {
  /**
   * Tone descriptor (lowercase, hyphenated)
   * Examples: "professional-friendly", "technical-concise", "casual-humorous"
   */
  tone: string;
  
  /**
   * Free-text style description
   * Example: "I use clear explanations with occasional technical depth. 
   * I avoid jargon unless the audience is technical. Keep responses under 200 chars."
   * 
   * Used in Response Suggestion generation prompts as "Voice & Style" guidance.
   */
  style: string;
  
  /**
   * 3-5 example responses written by the user in their voice.
   * Used as few-shot examples for Claude to learn style.
   * 
   * For v0.1, stored in MongoDB. Future versions may use ChromaDB
   * for semantic retrieval of relevant examples.
   */
  examples: string[];
}

/**
 * Discovery configuration defines what content to surface as opportunities.
 */
export interface DiscoveryConfig {
  /**
   * Broad interest areas (lowercase)
   * Examples: ["ai", "typescript", "distributed systems"]
   */
  interests: string[];
  
  /**
   * Specific keywords to match (lowercase)
   * Examples: ["machine learning", "vector database", "chromadb"]
   */
  keywords: string[];
  
  /**
   * Community identifiers to monitor (platform-specific format)
   * Bluesky: ["@alice.bsky.social", "tech.community.bsky.social"]
   * Reddit: ["r/machinelearning", "r/typescript"]
   * LinkedIn: (future: company pages, groups)
   */
  communities: string[];
}

/**
 * Creates a type guard for Profile with environment-specific ID validation.
 * 
 * @example
 * // Frontend - use default string validation
 * const isProfile = createProfileGuard(isStringId);
 * 
 * // Backend - use ObjectId validation
 * import { ObjectId } from 'mongodb';
 * const isProfileDocument = createProfileGuard(
 *   (v): v is ObjectId => v instanceof ObjectId
 * );
 */
export function createProfileGuard<TId>(
  isValidId: IdValidator<TId>
): (obj: unknown) => obj is Profile<TId> {
  return (obj: unknown): obj is Profile<TId> => {
    if (!isPlainObject(obj)) return false;
    const p = obj as Partial<Profile<TId>>;
    return (
      isValidId(p._id) &&
      typeof p.name === 'string' &&
      (p.principles === undefined || typeof p.principles === 'string') &&
      isPlainObject(p.voice) &&
      typeof (p.voice as VoiceConfig).tone === 'string' &&
      typeof (p.voice as VoiceConfig).style === 'string' &&
      Array.isArray((p.voice as VoiceConfig).examples) &&
      isPlainObject(p.discovery) &&
      Array.isArray((p.discovery as DiscoveryConfig).interests) &&
      Array.isArray((p.discovery as DiscoveryConfig).keywords) &&
      Array.isArray((p.discovery as DiscoveryConfig).communities) &&
      isValidDate(p.createdAt) &&
      isValidDate(p.updatedAt) &&
      typeof p.isActive === 'boolean'
    );
  };
}

/**
 * Default type guard for Profile with string IDs.
 * Use this in frontend and API validation.
 */
export const isProfile = createProfileGuard(isStringId);

/**
 * Partial profile for create operations (omit generated fields)
 */
export type CreateProfileInput = Omit<Profile<string>, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * Partial profile for update operations (omit immutable fields)
 */
export type UpdateProfileInput = Partial<Omit<Profile<string>, '_id' | 'createdAt' | 'updatedAt'>>;
